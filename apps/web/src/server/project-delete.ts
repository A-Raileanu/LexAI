import { and, contextFiles, documents, documentVersions, eq, files, inArray, isNotNull, jobs, like, or, projects, type Db } from "@lexai/db";

/**
 * Ștergerea definitivă a unui proiect arhivat. Documentele (cu versiunile, analizele, acțiunile pe
 * constatări, notele de redactare și conversațiile de chat) se șterg în cascadă odată cu proiectul;
 * joburile nu au cheie străină, deci se șterg explicit (evenimentele lor în cascadă). Consumul AI (`ai_usage`) rămâne:
 * e istoricul abonamentului, nu al proiectului.
 *
 * Fișierele încărcate (ale documentelor și cele de context) se șterg doar dacă niciun alt document nu le mai folosește; pe disc,
 * conținutul e deduplicat după sha256, deci fișierul fizic rămâne cât îl mai referă alt rând.
 * Funcția primește baza de date explicit (testabilă pe o bază temporară) și întoarce căile
 * relative ale fișierelor fizice rămase fără niciun rând, pe care apelantul le șterge de pe disc.
 * La fel imaginile din documente (files/imagini, adresate prin /api/imagini/<nume>): se șterg cele
 * pe care nu le mai folosește nicio versiune, ciornă sau antet al altui document.
 */

const IMAGE_RE = /\/api\/imagini\/([0-9a-f]{64}\.(?:png|jpg|gif|bmp|webp))/g;
const imagesIn = (s: string | null | undefined) => (s ? [...s.matchAll(IMAGE_RE)].map((m) => m[1]) : []);

export type DeleteProjectResult =
  | { ok: true; documente: number; fisiere: string[] }
  | { ok: false; error: string };

const ACTIVE_JOBS = ["in_asteptare", "in_curs"] as const;

export function deleteArchivedProject(db: Db, projectId: string): DeleteProjectResult {
  return db.transaction((tx) => {
    const project = tx.select({ archivedAt: projects.archivedAt }).from(projects).where(eq(projects.id, projectId)).get();
    if (!project) return { ok: false, error: "Proiectul nu există." };
    if (!project.archivedAt) return { ok: false, error: "Doar proiectele arhivate pot fi șterse. Arhivează-l mai întâi." };

    const docs = tx.select({ id: documents.id, fileId: documents.sourceFileId }).from(documents).where(eq(documents.projectId, projectId)).all();
    const docIds = docs.map((d) => d.id);
    const ofProject = docIds.length ? or(eq(jobs.projectId, projectId), inArray(jobs.documentId, docIds)) : eq(jobs.projectId, projectId);
    const running = tx.select({ id: jobs.id }).from(jobs).where(and(ofProject, inArray(jobs.status, [...ACTIVE_JOBS]))).get();
    if (running) return { ok: false, error: "Proiectul are o analiză sau o generare în curs. Oprește-o și încearcă din nou." };

    const images = new Set<string>();
    if (docIds.length) {
      for (const d of tx.select({ draft: documents.draftContent, meta: documents.meta }).from(documents).where(inArray(documents.id, docIds)).all()) [...imagesIn(d.draft), ...imagesIn(d.meta)].forEach((n) => images.add(n));
      for (const v of tx.select({ content: documentVersions.content }).from(documentVersions).where(inArray(documentVersions.documentId, docIds)).all()) imagesIn(v.content).forEach((n) => images.add(n));
    }

    const contextFileIds = tx.select({ id: contextFiles.fileId }).from(contextFiles).where(eq(contextFiles.projectId, projectId)).all().map((r) => r.id);
    tx.delete(jobs).where(ofProject).run();
    // fișierele de context se șterg în cascadă cu proiectul
    tx.delete(projects).where(eq(projects.id, projectId)).run();

    // fișierele proiectului care nu mai sunt sursa niciunui document
    const fileIds = [...new Set([...docs.map((d) => d.fileId).filter((x): x is string => Boolean(x)), ...contextFileIds])];
    const stillUsed = new Set(
      fileIds.length
        ? tx.select({ id: documents.sourceFileId }).from(documents).where(and(isNotNull(documents.sourceFileId), inArray(documents.sourceFileId, fileIds))).all().map((r) => r.id)
        : [],
    );
    const orphans = fileIds.filter((id) => !stillUsed.has(id));
    const paths = orphans.length ? [...new Set(tx.select({ path: files.path }).from(files).where(inArray(files.id, orphans)).all().map((f) => f.path))] : [];
    if (orphans.length) tx.delete(files).where(inArray(files.id, orphans)).run();
    // conținutul deduplicat: fișierul fizic rămâne dacă îl mai referă alt rând
    const shared = new Set(paths.length ? tx.select({ path: files.path }).from(files).where(inArray(files.path, paths)).all().map((f) => f.path) : []);
    const unusedImages = [...images].filter((name) => {
      const pattern = `%/api/imagini/${name}%`;
      const inVersion = tx.select({ id: documentVersions.id }).from(documentVersions).where(like(documentVersions.content, pattern)).get();
      const inDoc = tx.select({ id: documents.id }).from(documents).where(or(like(documents.draftContent, pattern), like(documents.meta, pattern))).get();
      return !inVersion && !inDoc;
    });
    return { ok: true, documente: docs.length, fisiere: [...paths.filter((p) => !shared.has(p)), ...unusedImages.map((n) => `files/imagini/${n}`)] };
  });
}
