import { analyses, documentVersions, documents, eq, type Db } from "@lexai/db";
import { resumeFrom, runAnalysis, segmentsFromDoc, type AnalysisResult, type ProgressEvent } from "@lexai/core";
import type { JobHandler } from "../runner";
import { buildRegistry } from "../registry";

export interface AnalysisJobInput {
  analysisId: string;
  documentId: string;
  versionId: string;
  dataReferinta: string;
  recheckSegIds: string[] | null;
  baseAnalysisId: string | null;
}

function baseResult(db: Db, id: string | null): AnalysisResult | null {
  if (!id) return null;
  const row = db.select({ result: analyses.result }).from(analyses).where(eq(analyses.id, id)).get();
  return row?.result ? (JSON.parse(row.result) as AnalysisResult) : null;
}

/**
 * Analiza (sau reverificarea) unei versiuni: segmentele din JSON-ul editorului, sursele
 * active din setări, evenimentele de progres transmise live, rezultatul salvat în `analyses`.
 */
export const analysisHandler: JobHandler = async (ctx) => {
  const input = ctx.input as AnalysisJobInput;
  const { db } = ctx;
  const version = db.select().from(documentVersions).where(eq(documentVersions.id, input.versionId)).get();
  const doc = db.select().from(documents).where(eq(documents.id, input.documentId)).get();
  if (!version || !doc) throw new Error("Versiunea documentului nu mai există.");

  const segments = segmentsFromDoc(JSON.parse(version.content), { meta: JSON.parse(doc.meta) });
  if (!segments.some((s) => s.text.trim())) throw new Error("Documentul nu conține text de analizat.");

  const base = baseResult(db, input.baseAnalysisId);
  const progress = { etapa: "identificare", total: 0, verificate: 0, grupuri: 0, grupuriGata: 0 };
  const emit = (e: ProgressEvent) => {
    if (e.type === "rezultat") return;
    ctx.emit(e.type, e);
    if (e.type === "etapa") progress.etapa = e.etapa;
    else if (e.type === "trimiteri") {
      progress.total = e.total;
      progress.grupuri = e.grupuri.length;
    } else if (e.type === "constatare") progress.verificate++;
    else if (e.type === "grup_final") progress.grupuriGata++;
    else return;
    ctx.progress(progress);
  };

  const finish = (status: "finalizata" | "anulata" | "esuata", result: AnalysisResult | null) =>
    db.update(analyses).set({ status, result: result ? JSON.stringify(result) : null, finishedAt: Date.now() }).where(eq(analyses.id, input.analysisId)).run();

  try {
    const result = await runAnalysis({
      segments,
      dataReferinta: input.dataReferinta,
      sources: buildRegistry(db),
      signal: ctx.signal,
      emit,
      reluare: base ? (resumeFrom(base) ?? undefined) : undefined,
      recheckSegmentIds: input.recheckSegIds ?? undefined,
    });
    if (result.consum) ctx.recordUsage(result.consum);
    finish(ctx.signal.aborted ? "anulata" : "finalizata", result);
    ctx.emit("rezultat", { analysisId: input.analysisId, constatari: result.findings.length });
    return { analysisId: input.analysisId };
  } catch (e) {
    finish(ctx.signal.aborted ? "anulata" : "esuata", null);
    throw e;
  }
};
