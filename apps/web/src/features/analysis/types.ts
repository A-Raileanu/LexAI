import type { AnalysisResult } from "@lexai/core/types";
import type { JSONContent } from "@lexai/docx";
import type { JobStatus } from "./events";

/** Tipurile comune serverului și clientului pentru panoul de analiză. */

export type AnalysisStatus = "in_curs" | "finalizata" | "intrerupta" | "esuata" | "anulata";
/** „verificata” = „Am verificat” (rezolvată fără modificare), salvată ca „aplicata” cu `suggestionIndex` -1 */
export type FindingActionKind = "aplicata" | "verificata" | "ignorata";
/** `finding_actions.suggestion_index` pentru „Am verificat” (rândul are `action` = „aplicata”) */
export const VERIFIED_INDEX = -1;

export interface JobMeta {
  id: string;
  kind: string;
  status: JobStatus;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface AnalysisMeta {
  id: string;
  versionId: string;
  versionNumber: number | null;
  dataReferinta: string;
  /** starea efectivă (o analiză „în curs” al cărei job s-a oprit apare ca întreruptă/eșuată/anulată) */
  status: AnalysisStatus;
  createdAt: number;
  finishedAt: number | null;
}

export interface LatestAnalysis extends AnalysisMeta {
  job: JobMeta | null;
  /** reverificare: doar aceste paragrafe */
  recheckSegIds: string[] | null;
  /** analiza de bază (reverificare sau reluare) */
  baseAnalysisId: string | null;
  /** analiza are un rezultat salvat (parțial, dacă a fost oprită) */
  hasResult: boolean;
}

export interface ShownAnalysis extends AnalysisMeta {
  result: AnalysisResult;
  /** conținutul versiunii analizate (pentru „paragrafe modificate după analiză”) */
  versionContent: JSONContent | null;
  /**
   * Ce a făcut utilizatorul cu fiecare constatare: „aplicata” (sugestie aplicată), „verificata”
   * („Am verificat”, fără modificare) sau „ignorata”
   * (semnătura ei e ignorată în document, vezi `AnalysisSnapshot.ignored`).
   */
  actions: Record<string, FindingActionKind>;
  /** constatare → indicele variantei aplicate din `Finding.sugestii` (lipsă = niciuna) */
  appliedSuggestion: Record<string, number>;
}

export interface AnalysisSnapshot {
  /** ultima analiză pornită (oricare ar fi starea ei) */
  latest: LatestAnalysis | null;
  /** cea mai recentă analiză cu rezultat (ce se afișează în listă) */
  shown: ShownAnalysis | null;
  /**
   * Semnăturile constatărilor ignorate în acest document (`findingSignature`), din toate analizele.
   * Se aplică și constatărilor sosite live, care au alte id-uri.
   */
  ignored: string[];
}

export interface AnalysisBootstrap {
  snapshot: AnalysisSnapshot;
  /** data de referință implicită: a documentului, din setări sau azi */
  defaultDate: string;
  today: string;
}
