import "server-only";

import { desc, drafts, eq, getDb, getJob } from "@lexai/db";
import { getDocument } from "@/server/documents";
import type { DraftConformitate, DraftInfo, JobStatus } from "./types";

/** Nota de conformitate salvată de worker, sau null dacă lipsește ori e coruptă. */
export function parseConformitate(raw: string | null | undefined): DraftConformitate | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as DraftConformitate;
    if (!c || typeof c !== "object" || !Array.isArray(c.temeiuri)) return null;
    return {
      ...c,
      temeiuri: c.temeiuri.map((t) => ({ ...t, dovezi: t.dovezi ?? [], erori: t.erori ?? [], segId: t.segId ?? null })),
      neacoperite: c.neacoperite ?? [],
      deCompletat: c.deCompletat ?? [],
    };
  } catch {
    return null;
  }
}

export function latestDraftRow(documentId: string) {
  return getDb().select().from(drafts).where(eq(drafts.documentId, documentId)).orderBy(desc(drafts.createdAt)).limit(1).get();
}

/** Redactarea documentului (ultima, dacă au fost mai multe): rândul, jobul și nota parsată. */
export function loadDraftInfo(documentId: string): DraftInfo | null {
  const doc = getDocument(documentId);
  if (!doc || doc.archivedAt) return null;
  const row = latestDraftRow(documentId);
  if (!row) return null;
  const job = row.jobId ? getJob(getDb(), row.jobId) : undefined;
  let dataLegii: string | null = null;
  try {
    dataLegii = (JSON.parse(row.parametri) as { dataLegii?: string }).dataLegii ?? null;
  } catch {
    dataLegii = null;
  }
  return {
    draftId: row.id,
    documentId,
    projectId: doc.projectId,
    tip: row.tip,
    dataLegii,
    job: job
      ? {
          id: job.id,
          status: job.status as JobStatus,
          error: job.error ?? null,
          createdAt: job.createdAt,
          startedAt: job.startedAt ?? null,
          finishedAt: job.finishedAt ?? null,
        }
      : null,
    conformitate: parseConformitate(row.conformitate),
  };
}
