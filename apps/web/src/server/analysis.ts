import "server-only";
import { analyses, createAnalysisJob, desc, eq, getDb } from "@lexai/db";

export type AnalysisRow = typeof analyses.$inferSelect;

/** Pornește analiza unei versiuni (rândul din `analyses` și jobul pentru worker). */
export function startAnalysis(opts: {
  documentId: string;
  dataReferinta: string;
  versionId?: string | null;
  recheckSegIds?: string[];
  baseAnalysisId?: string | null;
}): { analysisId: string; jobId: string } {
  return createAnalysisJob(getDb(), opts);
}

export function latestAnalysis(documentId: string): AnalysisRow | undefined {
  return getDb().select().from(analyses).where(eq(analyses.documentId, documentId)).orderBy(desc(analyses.createdAt)).limit(1).get();
}

export function getAnalysis(id: string): AnalysisRow | undefined {
  return getDb().select().from(analyses).where(eq(analyses.id, id)).get();
}
