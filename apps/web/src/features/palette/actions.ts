"use server";

import { and, documentVersions, documents, eq, getDb, inArray, isNull, projects } from "@lexai/db";
import { foldDiacritics } from "@/lib/text";

export interface PaletteData {
  projects: { id: string; name: string; client: string | null; pinnedAt: number | null }[];
  documents: { id: string; title: string; projectId: string; projectName: string; updatedAt: number }[];
}

/** Datele paletei ⌘K: proiectele active și documentele lor (căutarea pe titluri se face în client). */
export async function paletteData(): Promise<PaletteData> {
  const db = getDb();
  const prj = db.select({ id: projects.id, name: projects.name, client: projects.client, pinnedAt: projects.pinnedAt }).from(projects).where(isNull(projects.archivedAt)).all();
  const names = new Map(prj.map((p) => [p.id, p.name]));
  const docs = db
    .select({ id: documents.id, title: documents.title, projectId: documents.projectId, updatedAt: documents.updatedAt })
    .from(documents)
    .where(and(isNull(documents.archivedAt), prj.length ? inArray(documents.projectId, prj.map((p) => p.id)) : undefined))
    .all()
    .filter((d) => names.has(d.projectId))
    .map((d) => ({ ...d, projectName: names.get(d.projectId)! }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return { projects: prj, documents: docs };
}

/** Text simplu dintr-un JSON Tiptap. */
function plainText(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== "object") return out;
  const n = node as { text?: string; content?: unknown[] };
  if (typeof n.text === "string") out.push(n.text);
  for (const c of n.content ?? []) plainText(c, out);
  return out;
}

export interface ContentHit {
  documentId: string;
  title: string;
  projectName: string;
  snippet: string;
}

/** Căutare în textul versiunii curente a documentelor (fără diacritice obligatorii). */
export async function searchDocumentContent(query: string): Promise<ContentHit[]> {
  const q = foldDiacritics(query);
  if (q.length < 3) return [];
  const db = getDb();
  const rows = db
    .select({ id: documents.id, title: documents.title, projectName: projects.name, content: documentVersions.content, draft: documents.draftContent })
    .from(documents)
    .innerJoin(projects, eq(projects.id, documents.projectId))
    .innerJoin(documentVersions, eq(documentVersions.id, documents.currentVersionId))
    .where(and(isNull(documents.archivedAt), isNull(projects.archivedAt)))
    .all();
  const hits: ContentHit[] = [];
  for (const r of rows) {
    const text = plainText(JSON.parse(r.draft ?? r.content)).join(" ");
    const folded = foldDiacritics(text);
    const i = folded.indexOf(q);
    if (i < 0) continue;
    const from = Math.max(0, i - 40);
    hits.push({ documentId: r.id, title: r.title, projectName: r.projectName, snippet: `${from > 0 ? "…" : ""}${text.slice(from, i + q.length + 60)}…` });
    if (hits.length >= 8) break;
  }
  return hits;
}
