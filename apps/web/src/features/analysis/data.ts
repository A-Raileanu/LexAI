import "server-only";
import { isIgnored, normalizeResult } from "@lexai/core/findings";
import type { AnalysisResult } from "@lexai/core/types";
import { analyses, and, desc, documentVersions, eq, findingActions, getDb, getJob, inArray, isNotNull, type Job } from "@lexai/db";
import type { JSONContent } from "@lexai/docx";
import { getSettings } from "@/server/settings";
import { todayIso } from "@/lib/format";
import { ignoredFor } from "@/server/finding-ignores";
import { VERIFIED_INDEX, type AnalysisBootstrap, type AnalysisSnapshot, type AnalysisStatus, type FindingActionKind, type JobMeta, type LatestAnalysis, type ShownAnalysis } from "./types";

type AnalysisRow = typeof analyses.$inferSelect;

/** Joburile oprite fără ca worker-ul să fi actualizat analiza (proces oprit, anulare înainte de pornire). */
function effectiveStatus(row: AnalysisRow, job: Job | undefined): AnalysisStatus {
  if (row.status !== "in_curs") return row.status;
  if (!job) return "intrerupta";
  if (job.status === "esuat") return "esuata";
  if (job.status === "anulat") return "anulata";
  if (job.status === "intrerupt") return "intrerupta";
  return "in_curs";
}

function jobMeta(job: Job | undefined): JobMeta | null {
  if (!job) return null;
  return { id: job.id, kind: job.kind, status: job.status, error: job.error ?? null, createdAt: job.createdAt, startedAt: job.startedAt ?? null, finishedAt: job.finishedAt ?? null };
}

function jobInput(job: Job | undefined): { recheckSegIds: string[] | null; baseAnalysisId: string | null } {
  if (!job) return { recheckSegIds: null, baseAnalysisId: null };
  try {
    const input = JSON.parse(job.input) as { recheckSegIds?: string[] | null; baseAnalysisId?: string | null };
    return { recheckSegIds: Array.isArray(input.recheckSegIds) ? input.recheckSegIds : null, baseAnalysisId: input.baseAnalysisId ?? null };
  } catch {
    return { recheckSegIds: null, baseAnalysisId: null };
  }
}

function versionInfo(versionId: string): { number: number | null; content: JSONContent | null } {
  const v = getDb().select({ number: documentVersions.number, content: documentVersions.content }).from(documentVersions).where(eq(documentVersions.id, versionId)).get();
  if (!v) return { number: null, content: null };
  try {
    return { number: v.number, content: JSON.parse(v.content) as JSONContent };
  } catch {
    return { number: v.number, content: null };
  }
}

/** Rezultatul salvat, în forma curentă (rezultatele vechi au doar `sugestie`: vezi `normalizeResult`). */
export function parseResult(raw: string | null): AnalysisResult | null {
  if (!raw) return null;
  try {
    const r = normalizeResult(JSON.parse(raw) as AnalysisResult);
    // trimiterile servesc doar reluării pe server; nu le trimitem în browser
    delete r.trimiteri;
    return r;
  } catch {
    return null;
  }
}

export interface FindingState {
  /** „aplicata” din analiză (sau din analiza ei de bază), „ignorata” după semnătură, din orice analiză a documentului */
  actions: Record<string, FindingActionKind>;
  /** constatare → indicele variantei aplicate (`Finding.sugestii`) */
  appliedSuggestion: Record<string, number>;
}

/**
 * Acțiunile utilizatorului pe constatările unei analize. Aplicările vin din rândurile analizei și
 * ale analizei ei de bază (reverificare/reluare: aceleași id-uri); ignorările vin din semnăturile
 * ignorate ale documentului (`ignored`), deci supraviețuiesc și analizelor noi, cu alte id-uri.
 */
export function findingStateFor(analysisIds: (string | null | undefined)[], result: Pick<AnalysisResult, "findings"> | null, ignored: ReadonlySet<string>): FindingState {
  const ids = analysisIds.filter((x): x is string => Boolean(x));
  const actions: Record<string, FindingActionKind> = {};
  const appliedSuggestion: Record<string, number> = {};
  if (ids.length) {
    const rows = getDb().select().from(findingActions).where(inArray(findingActions.analysisId, ids)).all();
    for (const id of ids) {
      for (const r of rows) {
        if (r.analysisId !== id || r.action !== "aplicata") continue;
        if (r.suggestionIndex === VERIFIED_INDEX) {
          actions[r.findingId] = "verificata";
          delete appliedSuggestion[r.findingId];
          continue;
        }
        actions[r.findingId] = "aplicata";
        appliedSuggestion[r.findingId] = r.suggestionIndex ?? 0;
      }
    }
  }
  for (const f of result?.findings ?? []) if (!actions[f.id] && isIgnored(f, ignored)) actions[f.id] = "ignorata";
  return { actions, appliedSuggestion };
}

/** Acțiunile pentru o analiză (exporturi): aplicările ei și ale bazei, ignorările documentului. */
export function findingStateForAnalysis(row: Pick<AnalysisRow, "id" | "jobId">, result: Pick<AnalysisResult, "findings">, ignored: ReadonlySet<string>): FindingState {
  const job = row.jobId ? getJob(getDb(), row.jobId) : undefined;
  return findingStateFor([jobInput(job).baseAnalysisId, row.id], result, ignored);
}

/** Cea mai recentă analiză a documentului care are un rezultat salvat. */
export function latestWithResult(documentId: string): AnalysisRow | undefined {
  return getDb()
    .select()
    .from(analyses)
    .where(and(eq(analyses.documentId, documentId), isNotNull(analyses.result)))
    .orderBy(desc(analyses.createdAt))
    .limit(1)
    .get();
}

/** Ultima analiză pornită și cea mai recentă cu rezultat (pentru panoul „Constatări”). */
export function loadAnalysisSnapshot(documentId: string): AnalysisSnapshot {
  const db = getDb();
  const row = db.select().from(analyses).where(eq(analyses.documentId, documentId)).orderBy(desc(analyses.createdAt)).limit(1).get();
  if (!row) return { latest: null, shown: null, ignored: [] };
  const ignored = ignoredFor(db, documentId);

  const job = row.jobId ? getJob(db, row.jobId) : undefined;
  const input = jobInput(job);
  const latest: LatestAnalysis = {
    id: row.id,
    versionId: row.versionId,
    versionNumber: versionInfo(row.versionId).number,
    dataReferinta: row.dataReferinta,
    status: effectiveStatus(row, job),
    createdAt: row.createdAt,
    finishedAt: row.finishedAt ?? null,
    job: jobMeta(job),
    recheckSegIds: input.recheckSegIds,
    baseAnalysisId: input.baseAnalysisId,
    hasResult: Boolean(row.result),
  };

  // cât rulează o reverificare/reluare se afișează analiza de bază; altfel ultima cu rezultat
  const shownRow =
    (row.result ? row : undefined) ??
    (latest.status === "in_curs" && input.baseAnalysisId ? db.select().from(analyses).where(eq(analyses.id, input.baseAnalysisId)).get() : undefined) ??
    latestWithResult(documentId);
  const result = shownRow ? parseResult(shownRow.result) : null;
  let shown: ShownAnalysis | null = null;
  if (shownRow && result) {
    const v = versionInfo(shownRow.versionId);
    const shownJob = shownRow.id === row.id ? job : shownRow.jobId ? getJob(db, shownRow.jobId) : undefined;
    shown = {
      id: shownRow.id,
      versionId: shownRow.versionId,
      versionNumber: v.number,
      dataReferinta: shownRow.dataReferinta,
      status: effectiveStatus(shownRow, shownJob),
      createdAt: shownRow.createdAt,
      finishedAt: shownRow.finishedAt ?? null,
      result,
      versionContent: v.content,
      ...findingStateFor([jobInput(shownJob).baseAnalysisId, shownRow.id], result, ignored),
    };
  }
  return { latest, shown, ignored: [...ignored] };
}

/** Datele inițiale ale panoului, încărcate de pagina editorului. */
export function analysisBootstrap(doc: { id: string; dataReferinta: string | null }): AnalysisBootstrap {
  const today = todayIso();
  const settings = getSettings(getDb());
  return { snapshot: loadAnalysisSnapshot(doc.id), defaultDate: doc.dataReferinta ?? settings.defaultReferenceDate ?? today, today };
}
