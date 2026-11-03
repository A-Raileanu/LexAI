"use server";

import { analyses, and, documentVersions, eq, findingActions, getDb, getJob, requestJobCancel } from "@lexai/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { startAnalysis } from "@/server/analysis";
import { getDocument } from "@/server/documents";
import { ignoreFindingRow, restoreSignature, signatureOf } from "@/server/finding-ignores";
import { loadAnalysisSnapshot } from "./data";
import { VERIFIED_INDEX, type AnalysisSnapshot, type FindingActionKind } from "./types";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** Ultima analiză a documentului: rândul, rezultatul, starea jobului, conținutul versiunii analizate. */
export async function loadAnalysisAction(documentId: string): Promise<ActionResult<AnalysisSnapshot>> {
  if (!getDocument(documentId)) return fail("Documentul nu există.");
  return { ok: true, data: loadAnalysisSnapshot(documentId) };
}

const StartInput = z.object({
  documentId: z.string().min(1),
  dataReferinta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de referință este invalidă."),
  versionId: z.string().min(1).nullish(),
  recheckSegIds: z.array(z.string().min(1).max(200)).max(2000).nullish(),
  baseAnalysisId: z.string().min(1).nullish(),
});

/**
 * Pornește o analiză (completă, reverificare a unor paragrafe sau reluare de la o analiză de bază)
 * pe versiunea salvată. Clientul salvează întâi ciorna ca versiune, deci analiza vede ce vede utilizatorul.
 */
export async function startAnalysisAction(input: z.input<typeof StartInput>): Promise<ActionResult<AnalysisSnapshot>> {
  const parsed = StartInput.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Date invalide.");
  const { documentId, dataReferinta, versionId, recheckSegIds, baseAnalysisId } = parsed.data;
  const doc = getDocument(documentId);
  if (!doc || doc.archivedAt) return fail("Documentul nu există.");
  const db = getDb();
  if (versionId && !db.select({ id: documentVersions.id }).from(documentVersions).where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId))).get()) {
    return fail("Versiunea nu există.");
  }
  if (baseAnalysisId && !db.select({ id: analyses.id }).from(analyses).where(and(eq(analyses.id, baseAnalysisId), eq(analyses.documentId, documentId))).get()) {
    return fail("Analiza de bază nu există.");
  }
  if (recheckSegIds?.length && !baseAnalysisId) return fail("Reverificarea are nevoie de analiza anterioară.");
  try {
    startAnalysis({ documentId, dataReferinta, versionId: versionId ?? null, recheckSegIds: recheckSegIds ?? undefined, baseAnalysisId: baseAnalysisId ?? null });
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Analiza nu a putut porni.");
  }
  revalidatePath(`/proiecte/${doc.projectId}`);
  return { ok: true, data: loadAnalysisSnapshot(documentId) };
}

/** Oprește jobul analizei (constatările găsite până atunci rămân). */
export async function cancelAnalysisAction(jobId: string): Promise<ActionResult> {
  const db = getDb();
  if (!getJob(db, jobId)) return fail("Jobul nu există.");
  requestJobCancel(db, jobId);
  return { ok: true, data: undefined };
}

function baseAnalysisOf(jobId: string | null): string | null {
  const job = jobId ? getJob(getDb(), jobId) : undefined;
  try {
    return job ? ((JSON.parse(job.input) as { baseAnalysisId?: string | null }).baseAnalysisId ?? null) : null;
  } catch {
    return null;
  }
}

/**
 * Salvează (sau, cu `null`, anulează) ce a făcut utilizatorul cu o constatare. Pentru „aplicata”,
 * `suggestionIndex` = varianta aplicată din `Finding.sugestii` (implicit 0); „verificata” se
 * salvează ca „aplicata” cu indicele `VERIFIED_INDEX`. „ignorata” trece prin `ignoreFinding`
 * (cu semnătură); `null` șterge rândurile constatării din analiză și din baza ei.
 */
export async function recordFindingAction(
  analysisId: string,
  findingId: string,
  action: FindingActionKind | null,
  opts: { suggestionIndex?: number } = {},
): Promise<ActionResult> {
  if (action !== null && action !== "aplicata" && action !== "verificata" && action !== "ignorata") return fail("Acțiune necunoscută.");
  if (!findingId || findingId.length > 200) return fail("Constatare necunoscută.");
  const index = action === "verificata" ? VERIFIED_INDEX : (opts.suggestionIndex ?? 0);
  if (action !== "verificata" && (!Number.isInteger(index) || index < 0 || index > 20)) return fail("Varianta de sugestie este invalidă.");
  if (action === "ignorata") {
    const r = await ignoreFinding({ analysisId, findingId });
    return r.ok ? { ok: true, data: undefined } : r;
  }
  const db = getDb();
  const row = db.select({ id: analyses.id, jobId: analyses.jobId }).from(analyses).where(eq(analyses.id, analysisId)).get();
  if (!row) return fail("Analiza nu există.");
  if (action === null) {
    // acțiunea poate fi moștenită de la analiza de bază (reverificare): o ștergem și acolo
    for (const id of [analysisId, baseAnalysisOf(row.jobId)]) {
      if (id) db.delete(findingActions).where(and(eq(findingActions.analysisId, id), eq(findingActions.findingId, findingId))).run();
    }
  } else {
    // „Am verificat” e tot o rezolvare: rând „aplicata”, fără variantă (indicele VERIFIED_INDEX)
    const stored = "aplicata" as const;
    db.insert(findingActions)
      .values({ analysisId, findingId, action: stored, suggestionIndex: index, signature: null, createdAt: Date.now() })
      .onConflictDoUpdate({ target: [findingActions.analysisId, findingActions.findingId], set: { action: stored, suggestionIndex: index, signature: null, createdAt: Date.now() } })
      .run();
  }
  return { ok: true, data: undefined };
}

const IgnoreInput = z.object({
  analysisId: z.string().min(1).max(200),
  findingId: z.string().min(1).max(200),
  /** citatul și categoria constatării: semnătura pentru o constatare încă nesalvată (sosită live) */
  citat: z.string().max(20_000).nullish(),
  categorie: z.string().max(100).nullish(),
});

/** Constatarea și documentul ei; semnătura din rezultatul salvat sau din citatul/categoria primite. */
function resolveIgnore(input: z.input<typeof IgnoreInput>): { ok: true; documentId: string; projectId: string; signature: string } | { ok: false; error: string } {
  const parsed = IgnoreInput.safeParse(input);
  if (!parsed.success) return fail("Constatare necunoscută.");
  const { analysisId, findingId, citat, categorie } = parsed.data;
  const db = getDb();
  const row = db.select({ documentId: analyses.documentId }).from(analyses).where(eq(analyses.id, analysisId)).get();
  if (!row) return fail("Analiza nu există.");
  const doc = getDocument(row.documentId);
  if (!doc) return fail("Documentul nu există.");
  const signature = signatureOf(db, analysisId, findingId, citat ? { citat, categorie } : null);
  if (!signature) return fail("Constatarea nu există în această analiză.");
  return { ok: true, documentId: row.documentId, projectId: doc.projectId, signature };
}

/**
 * Ignoră o constatare: dispare din panou, din evidențieri, din numărători, insigne, alerte și
 * exporturi, și rămâne ignorată la analizele ulterioare ale documentului (după semnătură).
 */
export async function ignoreFinding(input: z.input<typeof IgnoreInput>): Promise<ActionResult<{ signature: string }>> {
  const r = resolveIgnore(input);
  if (!r.ok) return r;
  ignoreFindingRow(getDb(), { analysisId: input.analysisId, findingId: input.findingId, signature: r.signature });
  revalidatePath(`/proiecte/${r.projectId}`);
  return { ok: true, data: { signature: r.signature } };
}

/** „Restaurează”: șterge ignorarea (din toate analizele documentului cu aceeași semnătură). */
export async function restoreFinding(input: z.input<typeof IgnoreInput>): Promise<ActionResult<{ signature: string }>> {
  const r = resolveIgnore(input);
  if (!r.ok) return r;
  restoreSignature(getDb(), r.documentId, r.signature);
  revalidatePath(`/proiecte/${r.projectId}`);
  return { ok: true, data: { signature: r.signature } };
}
