import { canonicalSignature, findingSignature, type SignatureSource } from "@lexai/core/findings";
import { analyses, and, eq, findingActions, inArray, type Db } from "@lexai/db";

/**
 * Constatările ignorate (docs: „Ignorate (n)” din panou). O ignorare se salvează în
 * `finding_actions` cu semnătura stabilă a constatării (`findingSignature`: citatul normalizat și
 * categoria), deci se aplică tuturor analizelor documentului, nu doar celei în care a fost făcută:
 * analizele noi, reverificările și reluările au alte id-uri de constatare, dar aceeași semnătură.
 *
 * Toate citirile trec prin `ignoredSignatures`: panoul (încărcarea analizei), insignele
 * documentelor și ale proiectelor, alertele „cu probleme” și exportul DOCX adnotat.
 * Funcțiile primesc baza de date explicit, ca să poată fi testate pe o bază temporară.
 */

export interface IgnoreRow {
  analysisId: string;
  findingId: string;
  documentId: string;
  /** semnătura salvată sau, la rândurile vechi fără semnătură, calculată din rezultatul analizei */
  signature: string | null;
}

/** Constatarea `findingId` din rezultatul salvat al analizei (doar câmpurile semnăturii). */
function storedFinding(raw: string | null, findingId: string): SignatureSource | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as { findings?: (SignatureSource & { id: string })[] };
    return r.findings?.find((f) => f.id === findingId) ?? null;
  } catch {
    return null;
  }
}

/** Rândurile „ignorata” ale documentelor, cu semnătura rezolvată. */
export function ignoreRows(db: Db, documentIds: readonly string[]): IgnoreRow[] {
  const ids = [...new Set(documentIds)].filter(Boolean);
  if (!ids.length) return [];
  const rows = db
    .select({ analysisId: findingActions.analysisId, findingId: findingActions.findingId, signature: findingActions.signature, documentId: analyses.documentId })
    .from(findingActions)
    .innerJoin(analyses, eq(analyses.id, findingActions.analysisId))
    .where(and(eq(findingActions.action, "ignorata"), inArray(analyses.documentId, ids)))
    .all();
  // rândurile vechi (fără semnătură): semnătura din constatarea analizei în care au fost făcute
  const legacy = [...new Set(rows.filter((r) => !r.signature).map((r) => r.analysisId))];
  const results = new Map(
    legacy.length ? db.select({ id: analyses.id, result: analyses.result }).from(analyses).where(inArray(analyses.id, legacy)).all().map((a) => [a.id, a.result]) : [],
  );
  return rows.map((r) => {
    if (r.signature) return r;
    const f = storedFinding(results.get(r.analysisId) ?? null, r.findingId);
    return { ...r, signature: f ? findingSignature(f) : null };
  });
}

/** Semnăturile ignorate, pe document. Documentele fără ignorări nu apar în hartă. */
export function ignoredSignatures(db: Db, documentIds: readonly string[]): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const r of ignoreRows(db, documentIds)) {
    if (!r.signature) continue;
    const set = out.get(r.documentId) ?? new Set<string>();
    set.add(canonicalSignature(r.signature));
    out.set(r.documentId, set);
  }
  return out;
}

/**
 * Constatările rezolvate, pe analiză: rândurile „aplicata” (corectura aplicată în text sau
 * „Am verificat”, cu `suggestion_index = -1`). Spre deosebire de ignorări, țin de analiza în care
 * au fost făcute: după o analiză nouă, textul corectat nu mai produce constatarea.
 */
export function resolvedFindings(db: Db, analysisIds: readonly string[]): Map<string, Set<string>> {
  const ids = [...new Set(analysisIds)].filter(Boolean);
  const out = new Map<string, Set<string>>();
  if (!ids.length) return out;
  const rows = db
    .select({ analysisId: findingActions.analysisId, findingId: findingActions.findingId })
    .from(findingActions)
    .where(and(eq(findingActions.action, "aplicata"), inArray(findingActions.analysisId, ids)))
    .all();
  for (const r of rows) {
    const set = out.get(r.analysisId) ?? new Set<string>();
    set.add(r.findingId);
    out.set(r.analysisId, set);
  }
  return out;
}

export const ignoredFor = (db: Db, documentId: string): Set<string> => ignoredSignatures(db, [documentId]).get(documentId) ?? new Set();

/**
 * Semnătura constatării `findingId` din analiza dată; dacă nu e (încă) în rezultatul salvat —
 * o constatare sosită live, cât rulează analiza —, cea calculată din citatul și categoria primite.
 */
export function signatureOf(db: Db, analysisId: string, findingId: string, fallback: SignatureSource | null): string | null {
  const row = db.select({ result: analyses.result }).from(analyses).where(eq(analyses.id, analysisId)).get();
  const f = storedFinding(row?.result ?? null, findingId) ?? fallback;
  return f?.citat?.trim() ? findingSignature(f) : null;
}

/** Ignoră constatarea: un rând „ignorata” cu semnătura ei (înlocuiește o eventuală „aplicata”). */
export function ignoreFindingRow(db: Db, input: { analysisId: string; findingId: string; signature: string }): void {
  const now = Date.now();
  db.insert(findingActions)
    .values({ analysisId: input.analysisId, findingId: input.findingId, action: "ignorata", signature: input.signature, suggestionIndex: null, createdAt: now })
    .onConflictDoUpdate({
      target: [findingActions.analysisId, findingActions.findingId],
      set: { action: "ignorata", signature: input.signature, suggestionIndex: null, createdAt: now },
    })
    .run();
}

/**
 * Restaurează: șterge toate ignorările documentului cu această semnătură (din orice analiză),
 * inclusiv rândurile vechi a căror semnătură se calculează din rezultat. Întoarce câte a șters.
 */
export function restoreSignature(db: Db, documentId: string, signature: string): number {
  let n = 0;
  for (const r of ignoreRows(db, [documentId])) {
    if (!r.signature || canonicalSignature(r.signature) !== canonicalSignature(signature)) continue;
    n += db
      .delete(findingActions)
      .where(and(eq(findingActions.analysisId, r.analysisId), eq(findingActions.findingId, r.findingId), eq(findingActions.action, "ignorata")))
      .run().changes;
  }
  return n;
}
