"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { startAnalysis } from "@/server/analysis";
import { getDocument, updateDocument } from "@/server/documents";

type Result<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function renameDocument(id: string, title: string): Promise<Result> {
  const t = z.string().trim().min(1, "Titlul nu poate fi gol.").max(200).safeParse(title);
  if (!t.success) return { ok: false, error: t.error.issues[0].message };
  const doc = getDocument(id);
  if (!doc) return { ok: false, error: "Documentul nu există." };
  updateDocument(id, { title: t.data });
  revalidatePath(`/proiecte/${doc.projectId}`, "layout");
  return { ok: true, data: undefined };
}

/** „Ștergerea” arhivează documentul: versiunile și analizele rămân în baza de date. */
export async function archiveDocument(id: string, archived = true): Promise<Result> {
  const doc = getDocument(id);
  if (!doc) return { ok: false, error: "Documentul nu există." };
  updateDocument(id, { archivedAt: archived ? Date.now() : null });
  revalidatePath(`/proiecte/${doc.projectId}`, "layout");
  return { ok: true, data: undefined };
}

export async function analyzeDocument(id: string, dataReferinta: string): Promise<Result<{ analysisId: string; jobId: string }>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataReferinta)) return { ok: false, error: "Data de referință este invalidă." };
  try {
    const r = startAnalysis({ documentId: id, dataReferinta });
    const doc = getDocument(id);
    if (doc) revalidatePath(`/proiecte/${doc.projectId}`, "layout");
    return { ok: true, data: r };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Analiza nu a putut porni." };
  }
}
