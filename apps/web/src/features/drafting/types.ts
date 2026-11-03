import type { Conformitate, TemeiValidat } from "@lexai/core/redactare";

/** Stările unui job (ca în `@lexai/db`, fără să importăm pachetul în browser). */
export type JobStatus = "in_asteptare" | "in_curs" | "finalizat" | "esuat" | "anulat" | "intrerupt";

export const ACTIVE_JOB: ReadonlySet<string> = new Set<JobStatus>(["in_asteptare", "in_curs"]);
export const FINAL_JOB: ReadonlySet<string> = new Set<JobStatus>(["finalizat", "esuat", "anulat", "intrerupt"]);

/** Un temei validat, cu blocul din editor în care se află clauza (sau null). */
export type GroundRecord = TemeiValidat & { segId: string | null };

/** `drafts.conformitate`, așa cum îl salvează worker-ul de redactare. */
export interface DraftConformitate extends Omit<Conformitate, "temeiuri"> {
  temeiuri: GroundRecord[];
  generatLa?: string;
}

export interface DraftJob {
  id: string;
  status: JobStatus;
  error: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

/** Ce află panoul despre redactarea unui document. */
export interface DraftInfo {
  draftId: string;
  documentId: string;
  projectId: string;
  tip: string;
  /** data legii din asistent (ISO) */
  dataLegii: string | null;
  job: DraftJob | null;
  conformitate: DraftConformitate | null;
}

/**
 * Documentul nu are încă un proiect generat: jobul rulează sau s-a încheiat fără rezultat
 * (eșuat, oprit, întrerupt). Atunci se arată pagina de generare, nu editorul.
 */
export function generationPending(info: DraftInfo | null): boolean {
  if (!info?.job) return false;
  if (ACTIVE_JOB.has(info.job.status)) return true;
  return info.job.status !== "finalizat" && !info.conformitate;
}
