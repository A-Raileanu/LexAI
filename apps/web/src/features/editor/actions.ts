"use server";

import { documentVersions, eq, getDb } from "@lexai/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addVersion, getDocument, getVersion, listVersions, saveDraft, updateDocument, workingContent, type DocumentRow, type VersionOrigin } from "@/server/documents";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string; conflict?: boolean };

export type VersionSummary = ReturnType<typeof listVersions>[number];

/** Ce știe clientul despre starea salvată; diferența înseamnă modificări din altă fereastră. */
export interface SaveToken {
  currentVersionId: string | null;
  draftUpdatedAt: number | null;
}

const tokenOf = (d: Pick<DocumentRow, "currentVersionId" | "draftUpdatedAt">): SaveToken => ({
  currentVersionId: d.currentVersionId ?? null,
  draftUpdatedAt: d.draftUpdatedAt ?? null,
});

const sameToken = (a: SaveToken, b: SaveToken) => a.currentVersionId === b.currentVersionId && a.draftUpdatedAt === b.draftUpdatedAt;

const MAX_CONTENT_BYTES = 20 * 1024 * 1024;

const DocJson = z
  .object({ type: z.literal("doc"), content: z.array(z.unknown()).optional() })
  .passthrough()
  .refine((v) => JSON.stringify(v).length <= MAX_CONTENT_BYTES, "Documentul este prea mare.");

const CONFLICT = "Documentul a fost modificat în altă fereastră.";

/**
 * Conținutul vine de la client ca text JSON: atributele ProseMirror sunt obiecte fără prototip,
 * pe care serializarea acțiunilor de server nu le transmite.
 */
function parseDoc(raw: unknown) {
  let value = raw;
  if (typeof raw === "string") {
    if (raw.length > MAX_CONTENT_BYTES) return { success: false as const, error: "Documentul este prea mare." };
    try {
      value = JSON.parse(raw);
    } catch {
      return { success: false as const, error: "Conținut invalid." };
    }
  }
  const parsed = DocJson.safeParse(value);
  return parsed.success ? { success: true as const, data: parsed.data } : { success: false as const, error: parsed.error.issues[0]?.message ?? "Conținut invalid." };
}

function loadDoc(documentId: string) {
  const doc = getDocument(documentId);
  return doc && !doc.archivedAt ? doc : null;
}

/** Salvarea automată a ciornei. Refuză dacă documentul s-a schimbat între timp în altă parte. */
export async function saveDraftAction(documentId: string, content: string, expected: SaveToken): Promise<ActionResult<SaveToken>> {
  const doc = loadDoc(documentId);
  if (!doc) return { ok: false, error: "Documentul nu există." };
  if (!sameToken(tokenOf(doc), expected)) return { ok: false, error: CONFLICT, conflict: true };
  const parsed = parseDoc(content);
  if (!parsed.success) return { ok: false, error: parsed.error };
  saveDraft(documentId, parsed.data);
  return { ok: true, data: tokenOf(getDocument(documentId)!) };
}

export interface SavedVersion {
  token: SaveToken;
  version: VersionSummary;
  versions: VersionSummary[];
}

const OriginInput = z.enum(["manual", "ai_sugestie"]);

/** „Salvează versiunea” (⌘S): conținutul de lucru devine versiune nouă, ciorna se golește. */
export async function saveVersionAction(
  documentId: string,
  content: string,
  input: { note?: string | null; origin?: "manual" | "ai_sugestie"; expected?: SaveToken; force?: boolean },
): Promise<ActionResult<SavedVersion>> {
  const doc = loadDoc(documentId);
  if (!doc) return { ok: false, error: "Documentul nu există." };
  if (input.expected && !input.force && !sameToken(tokenOf(doc), input.expected)) return { ok: false, error: CONFLICT, conflict: true };
  const parsed = parseDoc(content);
  if (!parsed.success) return { ok: false, error: parsed.error };
  const origin: VersionOrigin = OriginInput.catch("manual").parse(input.origin);
  const note = input.note?.trim().slice(0, 500) || null;
  const v = addVersion(documentId, parsed.data, origin, note);
  revalidatePath(`/proiecte/${doc.projectId}`);
  const versions = listVersions(documentId);
  return { ok: true, data: { token: tokenOf(getDocument(documentId)!), version: versions.find((x) => x.id === v.id)!, versions } };
}

export async function renameDocumentAction(documentId: string, title: string): Promise<ActionResult<{ title: string }>> {
  const doc = loadDoc(documentId);
  if (!doc) return { ok: false, error: "Documentul nu există." };
  const t = title.replace(/\s+/g, " ").trim();
  if (!t) return { ok: false, error: "Titlul nu poate fi gol." };
  if (t.length > 200) return { ok: false, error: "Titlul este prea lung." };
  updateDocument(documentId, { title: t });
  revalidatePath(`/proiecte/${doc.projectId}`);
  return { ok: true, data: { title: t } };
}

export async function getVersionContentAction(documentId: string, versionId: string): Promise<ActionResult<{ content: unknown }>> {
  const v = getVersion(versionId);
  if (!v || v.documentId !== documentId) return { ok: false, error: "Versiunea nu există." };
  return { ok: true, data: { content: JSON.parse(v.content) } };
}

/** Conținutul de lucru salvat (ciorna sau versiunea curentă), pentru „Încarcă versiunea de acolo”. */
export async function loadWorkingAction(documentId: string): Promise<ActionResult<{ content: unknown; token: SaveToken; versions: VersionSummary[] }>> {
  const doc = loadDoc(documentId);
  if (!doc) return { ok: false, error: "Documentul nu există." };
  return { ok: true, data: { content: workingContent(doc).content, token: tokenOf(doc), versions: listVersions(documentId) } };
}

const fmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });

export interface RestoreResult extends SavedVersion {
  content: unknown;
  /** versiunea care era curentă înainte (sau ciorna salvată automat), pentru „Anulează” */
  undoVersionId: string | null;
}

/**
 * Restaurarea unei versiuni: dacă există o ciornă nesalvată, ea devine întâi versiune
 * („Salvată automat înainte de restaurare”); apoi conținutul vechi devine o versiune nouă,
 * cu originea `restaurare`. Nu se șterge nimic din istoric.
 */
export async function restoreVersionAction(documentId: string, versionId: string, draft: string | null): Promise<ActionResult<RestoreResult>> {
  const doc = loadDoc(documentId);
  if (!doc) return { ok: false, error: "Documentul nu există." };
  const v = getVersion(versionId);
  if (!v || v.documentId !== documentId) return { ok: false, error: "Versiunea nu există." };

  let undoVersionId = doc.currentVersionId ?? null;
  if (draft !== null) {
    const parsed = parseDoc(draft);
    if (parsed.success) undoVersionId = addVersion(documentId, parsed.data, "manual", "Salvată automat înainte de restaurare").id;
  } else if (doc.draftContent) {
    undoVersionId = addVersion(documentId, JSON.parse(doc.draftContent), "manual", "Salvată automat înainte de restaurare").id;
  }

  const content = JSON.parse(v.content);
  const created = addVersion(documentId, content, "restaurare", `Restaurat din versiunea din ${fmt.format(v.createdAt)}`);
  revalidatePath(`/proiecte/${doc.projectId}`);
  const versions = listVersions(documentId);
  return {
    ok: true,
    data: { token: tokenOf(getDocument(documentId)!), version: versions.find((x) => x.id === created.id)!, versions, content, undoVersionId },
  };
}

/** „Editează nota” unei versiuni. */
export async function editVersionNoteAction(documentId: string, versionId: string, note: string): Promise<ActionResult<{ versions: VersionSummary[] }>> {
  const v = getVersion(versionId);
  if (!v || v.documentId !== documentId) return { ok: false, error: "Versiunea nu există." };
  getDb()
    .update(documentVersions)
    .set({ note: note.trim().slice(0, 500) || null })
    .where(eq(documentVersions.id, versionId))
    .run();
  return { ok: true, data: { versions: listVersions(documentId) } };
}
