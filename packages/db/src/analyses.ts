import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "./client";
import { newId } from "./ids";
import { enqueueJob } from "./jobs";
import { analyses, documents, jobs } from "./schema";

/**
 * Pornește analiza unei versiuni: rândul din `analyses` și jobul pentru worker. Fără
 * `versionId` se analizează versiunea curentă; `recheckSegIds` limitează verificarea la
 * paragrafele modificate (reverificare, pe baza analizei `baseAnalysisId`).
 */
export function createAnalysisJob(
  db: Db,
  opts: { documentId: string; dataReferinta: string; versionId?: string | null; recheckSegIds?: string[] | null; baseAnalysisId?: string | null },
): { analysisId: string; jobId: string } {
  const doc = db.select().from(documents).where(eq(documents.id, opts.documentId)).get();
  if (!doc) throw new Error("Documentul nu există.");
  const versionId = opts.versionId ?? doc.currentVersionId;
  if (!versionId) throw new Error("Documentul nu are încă o versiune salvată.");
  const analysisId = newId("ana");
  const recheck = opts.recheckSegIds?.length ? opts.recheckSegIds : null;
  const job = enqueueJob(db, {
    kind: recheck ? "reverificare" : "analiza",
    projectId: doc.projectId,
    documentId: doc.id,
    input: { analysisId, documentId: doc.id, versionId, dataReferinta: opts.dataReferinta, recheckSegIds: recheck, baseAnalysisId: opts.baseAnalysisId ?? null },
  });
  db.insert(analyses).values({ id: analysisId, documentId: doc.id, versionId, jobId: job.id, dataReferinta: opts.dataReferinta, status: "in_curs", createdAt: Date.now() }).run();
  return { analysisId, jobId: job.id };
}

/** Analizele rămase „în curs” ale căror joburi s-au oprit devin „întrerupte”. */
export function markInterruptedAnalyses(db: Db): number {
  const stale = db
    .select({ id: analyses.id })
    .from(analyses)
    .innerJoin(jobs, eq(jobs.id, analyses.jobId))
    .where(and(eq(analyses.status, "in_curs"), inArray(jobs.status, ["intrerupt", "esuat", "anulat"])))
    .all();
  if (!stale.length) return 0;
  return db.update(analyses).set({ status: "intrerupta", finishedAt: Date.now() }).where(inArray(analyses.id, stale.map((s) => s.id))).run().changes;
}

export function latestAnalysisFor(db: Db, documentId: string) {
  return db.select().from(analyses).where(eq(analyses.documentId, documentId)).orderBy(desc(analyses.createdAt)).limit(1).get();
}
