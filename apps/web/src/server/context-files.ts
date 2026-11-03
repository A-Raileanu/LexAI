import "server-only";
import path from "node:path";
import { rmSync } from "node:fs";
import { segmentsFromDoc, type TiptapDoc } from "@lexai/core/document";
import { and, asc, contextFiles, dataDir, enqueueJob, eq, files, getDb, inArray, jobs, like, newId, requestJobCancel } from "@lexai/db";
import { storeFile } from "./files";
import { ACCEPTED, ImportError, importFile } from "./import";

/**
 * Fișierele de context ale unui proiect: se salvează, li se extrage textul și atât (fără analiză,
 * fără editare). Pe lângă DOCX, DOC și PDF se acceptă imagini (fotografii, scanări), al căror text
 * îl recunoaște un job de OCR, ca și paginile scanate dintr-un PDF.
 */

export const CONTEXT_IMAGES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" } as const;
export const CONTEXT_ACCEPTED = { ...ACCEPTED, ...CONTEXT_IMAGES };
export const CONTEXT_FORMATS = "PDF, DOCX, DOC, PNG sau JPG";

export type ContextFile = typeof contextFiles.$inferSelect;

export function contextKind(name: string): keyof typeof CONTEXT_ACCEPTED | null {
  const ext = path.extname(name).toLowerCase();
  return ext in CONTEXT_ACCEPTED ? (ext as keyof typeof CONTEXT_ACCEPTED) : null;
}

export interface ContextFileRow {
  id: string;
  name: string;
  status: ContextFile["status"];
  error: string | null;
  chars: number;
  size: number;
  createdAt: number;
}

export function listContextFiles(projectId: string): ContextFileRow[] {
  return getDb()
    .select({ id: contextFiles.id, name: contextFiles.name, status: contextFiles.status, error: contextFiles.error, text: contextFiles.text, size: files.size, createdAt: contextFiles.createdAt })
    .from(contextFiles)
    .innerJoin(files, eq(files.id, contextFiles.fileId))
    .where(eq(contextFiles.projectId, projectId))
    .orderBy(asc(contextFiles.createdAt))
    .all()
    .map(({ text, ...r }) => ({ ...r, chars: text.length }));
}

/** Salvează fișierul și textul lui; paginile scanate și imaginile primesc un job de OCR. */
export async function addContextFile(projectId: string, bytes: Uint8Array, name: string, mime: string): Promise<{ id: string; ocrJobId: string | null }> {
  const kind = contextKind(name);
  if (!kind) throw new ImportError(`Format neacceptat. Încarcă un fișier ${CONTEXT_FORMATS}.`);
  let text = "";
  let ocrPages: number[] | null = null;
  if (kind in CONTEXT_IMAGES) {
    ocrPages = [];
  } else {
    const imported = await importFile(bytes, name, { images: false });
    text = segmentsFromDoc(imported.content as TiptapDoc).map((s) => s.text).join("\n").trim();
    if (imported.pagesNeedingOcr.length) ocrPages = imported.pagesNeedingOcr;
  }
  const stored = storeFile(bytes, name, mime || CONTEXT_ACCEPTED[kind]);
  const id = newId("ctx");
  const db = getDb();
  db.insert(contextFiles).values({ id, projectId, fileId: stored.id, name, text, status: ocrPages ? "ocr" : "gata", createdAt: Date.now() }).run();
  const ocrJobId = ocrPages
    ? enqueueJob(db, { kind: "ocr", projectId, input: { contextFileId: id, fileId: stored.id, pages: ocrPages, image: kind in CONTEXT_IMAGES ? (kind === ".png" ? "png" : "jpg") : null } }).id
    : null;
  return { id, ocrJobId };
}

/** Șterge fișierul de context, cu fișierul fizic dacă nu-l mai folosește niciun alt rând. */
export function deleteContextFile(projectId: string, id: string): boolean {
  const db = getDb();
  const row = db.select({ fileId: contextFiles.fileId, path: files.path }).from(contextFiles).innerJoin(files, eq(files.id, contextFiles.fileId)).where(and(eq(contextFiles.id, id), eq(contextFiles.projectId, projectId))).get();
  if (!row) return false;
  // OCR-ul lui, dacă n-a terminat, nu mai are rost
  const ocr = db
    .select({ id: jobs.id })
    .from(jobs)
    .where(and(eq(jobs.projectId, projectId), eq(jobs.kind, "ocr"), inArray(jobs.status, ["in_asteptare", "in_curs"]), like(jobs.input, `%"contextFileId":"${id}"%`)))
    .all();
  for (const j of ocr) requestJobCancel(db, j.id);
  db.transaction((tx) => {
    tx.delete(contextFiles).where(eq(contextFiles.id, id)).run();
    tx.delete(files).where(eq(files.id, row.fileId)).run();
  });
  // conținutul e deduplicat după sha256: fișierul fizic rămâne cât îl mai referă alt rând
  if (!db.select({ id: files.id }).from(files).where(eq(files.path, row.path)).get()) {
    try {
      rmSync(dataDir(row.path), { force: true });
    } catch {
      // un fișier rămas pe disc nu împiedică ștergerea
    }
  }
  return true;
}
