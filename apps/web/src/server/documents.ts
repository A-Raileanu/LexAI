import "server-only";
import { and, analyses, desc, documentVersions, documents, eq, getDb, isNull, newId, sql } from "@lexai/db";
import { touchProject } from "./projects";

export type DocumentRow = typeof documents.$inferSelect;
export type VersionRow = typeof documentVersions.$inferSelect;
export type VersionOrigin = VersionRow["origin"];

export interface DocumentListItem extends DocumentRow {
  versiune: number | null;
  ultimaAnaliza: { id: string; status: string; createdAt: number; result: string | null } | null;
}

export function listDocuments(projectId: string): DocumentListItem[] {
  const db = getDb();
  const docs = db
    .select()
    .from(documents)
    .where(and(eq(documents.projectId, projectId), isNull(documents.archivedAt)))
    .orderBy(desc(documents.updatedAt))
    .all();
  return docs.map((d) => {
    const v = d.currentVersionId
      ? db.select({ number: documentVersions.number }).from(documentVersions).where(eq(documentVersions.id, d.currentVersionId)).get()
      : undefined;
    const a = db
      .select({ id: analyses.id, status: analyses.status, createdAt: analyses.createdAt, result: analyses.result })
      .from(analyses)
      .where(eq(analyses.documentId, d.id))
      .orderBy(desc(analyses.createdAt))
      .limit(1)
      .get();
    return { ...d, versiune: v?.number ?? null, ultimaAnaliza: a ?? null };
  });
}

export function recentDocuments(limit = 6) {
  return getDb()
    .select({ id: documents.id, title: documents.title, projectId: documents.projectId, updatedAt: documents.updatedAt, kind: documents.kind })
    .from(documents)
    .where(isNull(documents.archivedAt))
    .orderBy(desc(documents.updatedAt))
    .limit(limit)
    .all();
}

export function getDocument(id: string): DocumentRow | undefined {
  return getDb().select().from(documents).where(eq(documents.id, id)).get();
}

export function getVersion(id: string): VersionRow | undefined {
  return getDb().select().from(documentVersions).where(eq(documentVersions.id, id)).get();
}

export function listVersions(documentId: string) {
  return getDb()
    .select({
      id: documentVersions.id,
      number: documentVersions.number,
      origin: documentVersions.origin,
      note: documentVersions.note,
      createdAt: documentVersions.createdAt,
    })
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.number))
    .all();
}

/** Creează un document cu prima versiune. */
export function insertDocument(values: {
  projectId: string;
  title: string;
  kind: DocumentRow["kind"];
  content: unknown;
  meta: unknown;
  origin: VersionOrigin;
  sourceFileId?: string | null;
  dataReferinta?: string | null;
  note?: string | null;
}): DocumentRow {
  const db = getDb();
  const now = Date.now();
  const docId = newId("doc");
  const versionId = newId("ver");
  db.transaction((tx) => {
    tx.insert(documents)
      .values({
        id: docId,
        projectId: values.projectId,
        title: values.title,
        kind: values.kind,
        sourceFileId: values.sourceFileId ?? null,
        currentVersionId: versionId,
        meta: JSON.stringify(values.meta),
        dataReferinta: values.dataReferinta ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.insert(documentVersions)
      .values({ id: versionId, documentId: docId, number: 1, content: JSON.stringify(values.content), origin: values.origin, note: values.note ?? null, createdAt: now })
      .run();
  });
  touchProject(values.projectId);
  return getDocument(docId)!;
}

/** Salvează conținutul ca versiune nouă și o face curentă; ciorna se golește. */
export function addVersion(documentId: string, content: unknown, origin: VersionOrigin, note?: string | null): VersionRow {
  const db = getDb();
  const now = Date.now();
  const id = newId("ver");
  db.transaction((tx) => {
    const last = tx
      .select({ n: sql<number>`coalesce(max(${documentVersions.number}), 0)` })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .get();
    tx.insert(documentVersions)
      .values({ id, documentId, number: (last?.n ?? 0) + 1, content: JSON.stringify(content), origin, note: note ?? null, createdAt: now })
      .run();
    tx.update(documents).set({ currentVersionId: id, draftContent: null, draftUpdatedAt: null, updatedAt: now }).where(eq(documents.id, documentId)).run();
  });
  const doc = getDocument(documentId);
  if (doc) touchProject(doc.projectId);
  return getVersion(id)!;
}

export function saveDraft(documentId: string, content: unknown) {
  const now = Date.now();
  getDb().update(documents).set({ draftContent: JSON.stringify(content), draftUpdatedAt: now, updatedAt: now }).where(eq(documents.id, documentId)).run();
}

export function discardDraft(documentId: string) {
  getDb().update(documents).set({ draftContent: null, draftUpdatedAt: null }).where(eq(documents.id, documentId)).run();
}

export function updateDocument(id: string, values: Partial<Pick<DocumentRow, "title" | "archivedAt" | "dataReferinta" | "meta">>) {
  getDb().update(documents).set({ ...values, updatedAt: Date.now() }).where(eq(documents.id, id)).run();
}

/** Conținutul de lucru: ciorna, dacă există, altfel versiunea curentă. */
export function workingContent(doc: DocumentRow): { content: unknown; fromDraft: boolean; version: VersionRow | undefined } {
  const version = doc.currentVersionId ? getVersion(doc.currentVersionId) : undefined;
  if (doc.draftContent) return { content: JSON.parse(doc.draftContent), fromDraft: true, version };
  return { content: version ? JSON.parse(version.content) : { type: "doc", content: [] }, fromDraft: false, version };
}
