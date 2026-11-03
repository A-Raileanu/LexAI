import { MODEL } from "@lexai/ai";
import { RunScope, type SourceRegistry } from "@lexai/sources";
import type { AiClient } from "../ai";
import type { AnalysisResult, DocSegment, Finding, LegalReference, ProgressEvent, ReferenceSet } from "../types";
import { UsageTracker, mergeUsage, type UsageReport } from "../usage";
import { EvidenceStore } from "./evidence";
import { computeCoverage, copyForDuplicate, normalizeFinding, pendingReferences, sourcesUsed, unverifiedFinding } from "./findings";
import { dedupeReferences, groupReferences, identifyReferences, type ReferenceGroup } from "./identify";
import { DEFAULT_BUDGETS, verifyGroup, type Budgets, type VerifyContext } from "./verify";

const CONCURRENCY = 3;
const RECOVERY_GROUP_SIZE = 4;

export function todayIso(): string {
  // data calendaristică în fusul orar al României
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());
}

/**
 * Rulează sarcinile cu cel mult `n` în paralel. Celelalte așteaptă `warm` (primul răspuns
 * API), ca promptul de sistem și instrumentele să fie citite din cache, nu scrise de fiecare dată.
 */
async function pool<T>(items: T[], n: number, warm: Promise<void>, fn: (t: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: Math.min(n, queue.length) }, async (_, worker) => {
      if (worker > 0) await warm;
      while (queue.length) await fn(queue.shift()!);
    }),
  );
}

/** Analiza anterioară: reluată (verificările neterminate) sau baza unei reverificări de paragrafe. */
export interface ResumeInput {
  id: string;
  createdAt: string;
  trimiteri: ReferenceSet;
  findings: Finding[];
  dataDocument?: string | null;
  consum?: UsageReport;
  avertismente: string[];
}

/** Datele de reluare dintr-un rezultat salvat (null dacă rezultatul nu păstrează trimiterile). */
export function resumeFrom(r: AnalysisResult): ResumeInput | null {
  if (!r.trimiteri) return null;
  return {
    id: r.id,
    createdAt: r.createdAt,
    trimiteri: r.trimiteri,
    // rezultatele salvate înainte de variantele de sugestii au doar `sugestie`
    findings: r.findings.map(normalizeFinding),
    dataDocument: r.dataDocumentDetectata ?? null,
    consum: r.consum,
    avertismente: r.avertismente,
  };
}

export interface AnalysisInput {
  /** segmentele documentului (ex. `segmentsFromDoc(json)`) */
  segments: DocSegment[];
  /** data la care se evaluează trimiterile (ISO) */
  dataReferinta: string;
  /** sursele active */
  sources: SourceRegistry;
  signal?: AbortSignal;
  emit: (e: ProgressEvent) => void;
  /**
   * Analiza anterioară. Fără `recheckSegmentIds`: reluare — se verifică doar trimiterile fără
   * rezultat sau oprite de o limită. Cu `recheckSegmentIds`: baza reverificării — se păstrează
   * rezultatele din celelalte paragrafe.
   */
  reluare?: ResumeInput;
  /**
   * Doar aceste segmente sunt analizate (identificare + verificare), ex. paragrafele modificate.
   * Restul documentului rămâne disponibil agentului (cauta_in_document, context).
   */
  recheckSegmentIds?: string[];
  /** pagini PDF necitite (pentru indicatorii de acoperire) */
  unreadablePages?: number[];
  /** avertismentele extragerii textului */
  warnings?: string[];
  /** accesul la Claude (implicit CLI-ul `claude`) */
  ai?: AiClient;
  budgets?: Partial<Budgets>;
  /** „azi” (ISO); implicit data curentă în fusul orar al României */
  dataAzi?: string;
  /** registrul de dovezi (implicit unul nou); util pentru a păstra dovezile după analiză */
  store?: EvidenceStore;
}

const maxRefNumber = (refs: LegalReference[]) => refs.reduce((m, r) => Math.max(m, Number(r.id.replace(/^\D+/, "")) || 0), 0);

export async function runAnalysis(input: AnalysisInput): Promise<AnalysisResult> {
  const { segments, dataReferinta, sources, signal, emit, reluare } = input;
  const started = Date.now();
  const dataAzi = input.dataAzi ?? todayIso();
  const usage = new UsageTracker();
  const budgets: Budgets = { ...DEFAULT_BUDGETS, ...input.budgets };
  const avertismente = reluare ? [...reluare.avertismente] : [...(input.warnings ?? [])];
  const segIds = new Set(segments.map((s) => s.id));
  const recheck = input.recheckSegmentIds ? new Set(input.recheckSegmentIds.filter((id) => segIds.has(id))) : null;

  // ── 1. Trimiterile: identificate acum sau preluate din analiza anterioară
  let refSet: ReferenceSet;
  let dataDocument: string | null;
  let toVerify: LegalReference[];
  let findings: Finding[] = [];
  if (recheck) {
    // trimiterile din paragrafele neschimbate rămân, cu rezultatele lor; cele din paragrafele șterse dispar
    const base = reluare?.trimiteri ?? { references: [], duplicates: [] };
    const kept = base.references.filter((r) => segIds.has(r.segment_id) && !recheck.has(r.segment_id));
    const keptIds = new Set(kept.map((r) => r.id));
    findings = (reluare?.findings ?? []).filter((f) => keptIds.has(f.referenceId));
    const keptDuplicates = base.duplicates
      .filter(([c]) => keptIds.has(c))
      .map(([c, ds]) => [c, ds.filter((d) => keptIds.has(d))] as [string, string[]])
      .filter(([, ds]) => ds.length);

    emit({ type: "etapa", etapa: "identificare", mesaj: `Identific trimiterile la legislație din ${recheck.size} ${recheck.size === 1 ? "paragraf" : "paragrafe"}` });
    const target = segments.filter((s) => recheck.has(s.id));
    const identified = target.length
      ? await identifyReferences(target, usage, signal, { ai: input.ai, idOffset: maxRefNumber(base.references) })
      : { dataDocument: null, references: [] };
    emit({ type: "consum", consum: usage.report() });
    dataDocument = reluare?.dataDocument ?? identified.dataDocument;
    const { unique, duplicates } = dedupeReferences(identified.references, segments);
    refSet = {
      references: [...kept, ...identified.references],
      duplicates: [...keptDuplicates, ...[...duplicates].map(([c, ds]) => [c, ds.map((d) => d.id)] as [string, string[]])],
    };
    toVerify = unique;
    emit({ type: "identificare", trimiteri: refSet, dataDocument });
  } else if (reluare) {
    refSet = reluare.trimiteri;
    dataDocument = reluare.dataDocument ?? null;
    toVerify = pendingReferences({ findings: reluare.findings, trimiteri: refSet });
    const pending = new Set(toVerify.map((r) => r.id));
    const canonical = new Map(refSet.duplicates.flatMap(([c, ds]) => ds.map((d) => [d, c] as const)));
    findings = reluare.findings.filter((f) => !pending.has(f.referenceId) && !pending.has(canonical.get(f.referenceId) ?? ""));
    emit({ type: "etapa", etapa: "verificare", mesaj: `Reiau ${toVerify.length} verificări rămase neterminate` });
  } else {
    emit({ type: "etapa", etapa: "identificare", mesaj: "Identific trimiterile la legislație din document" });
    const identified = await identifyReferences(segments, usage, signal, { ai: input.ai });
    emit({ type: "consum", consum: usage.report() });
    dataDocument = identified.dataDocument;
    const { unique, duplicates } = dedupeReferences(identified.references, segments);
    refSet = { references: identified.references, duplicates: [...duplicates].map(([c, ds]) => [c, ds.map((d) => d.id)]) };
    toVerify = unique;
    emit({ type: "identificare", trimiteri: refSet, dataDocument });
  }

  const refById = new Map(refSet.references.map((r) => [r.id, r]));
  const dupsOf = new Map(refSet.duplicates.map(([c, ds]) => [c, ds.map((d) => refById.get(d)).filter((r): r is LegalReference => !!r)]));
  const groups = groupReferences(toVerify);
  emit({
    type: "trimiteri",
    total: refSet.references.length,
    grupuri: groups.map((g) => ({ cheie: g.cheie, eticheta: g.eticheta, numar: g.references.length })),
    dataDocument,
  });
  for (const f of findings) emit({ type: "constatare", finding: f });

  // ── 2. Verificarea în sursele active
  const active = sources.enabled();
  const sourceNames = active.filter((s) => !(s.capabilities.size === 1 && s.capabilities.has("citeste_pagina"))).map((s) => s.label);
  emit({ type: "etapa", etapa: "verificare", mesaj: `Verific ${toVerify.length} trimiteri${sourceNames.length ? ` (${sourceNames.join(", ")})` : ""}` });
  if (!active.length && toVerify.length) avertismente.push("Nicio sursă de legislație nu este activă: trimiterile nu au putut fi verificate.");
  const store = input.store ?? new EvidenceStore();
  const scope = new RunScope();

  /** adaugă sau înlocuiește constatarea, plus copiile pentru duplicatele ei */
  const upsert = (f: Finding) => {
    for (const x of [f, ...(dupsOf.get(f.referenceId) ?? []).map((d) => copyForDuplicate(f, d, segments))]) {
      const i = findings.findIndex((y) => y.id === x.id);
      if (i >= 0) findings[i] = x;
      else findings.push(x);
      emit({ type: "constatare", finding: x });
    }
  };
  const overBudget = () => usage.report().total.costUsd >= budgets.documentUsd;
  const budgetMotiv = `Bugetul de verificare pentru document (${budgets.documentUsd} USD) a fost atins.`;

  const runGroups = async (gs: ReferenceGroup[], extra: Partial<VerifyContext>, warm: Promise<void>, onFirstResponse: () => void) => {
    await pool(gs, CONCURRENCY, warm, async (g) => {
      if (signal?.aborted) return;
      emit({ type: "grup_start", cheie: g.cheie, eticheta: g.eticheta, numar: g.references.length });
      if (overBudget()) {
        // fără apeluri noi: trimiterile rămân de reluat
        if (!extra.recuperare) for (const r of g.references) upsert(unverifiedFinding(r, segments, dataReferinta, budgetMotiv, "limita_atinsa"));
        emit({ type: "grup_final", cheie: g.cheie });
        return;
      }
      try {
        await verifyGroup(g, {
          segments,
          dataReferinta,
          dataAzi,
          store,
          sources,
          scope,
          signal,
          usage,
          ai: input.ai,
          budgets,
          ...extra,
          onUsage: () => {
            onFirstResponse();
            emit({ type: "consum", consum: usage.report() });
          },
          onActivity: (mesaj) => emit({ type: "activitate", cheie: g.cheie, mesaj }),
          onFinding: upsert,
        });
      } catch (e) {
        if (signal?.aborted) throw e;
        const msg = e instanceof Error ? e.message : String(e);
        avertismente.push(`Verificarea „${g.eticheta}” nu a putut fi finalizată: ${msg}`);
        if (!extra.recuperare) {
          for (const r of g.references) {
            if (!findings.some((f) => f.referenceId === r.id)) upsert(unverifiedFinding(r, segments, dataReferinta, `Verificarea a eșuat: ${msg}`, "limita_atinsa"));
          }
        }
      } finally {
        onFirstResponse();
      }
      emit({ type: "grup_final", cheie: g.cheie });
    });
  };

  // primul răspuns API scrie în cache prefixul comun; până atunci rulează un singur agent
  let markWarm: () => void = () => {};
  let warmTimer: ReturnType<typeof setTimeout> | undefined;
  const warm = new Promise<void>((resolve) => {
    markWarm = resolve;
    warmTimer = setTimeout(resolve, 60_000);
  });
  try {
    await runGroups(groups, {}, warm, () => markWarm());
  } finally {
    clearTimeout(warmTimer);
  }

  // ── 3. Recuperare selectivă, după motivul neverificării (o singură dată)
  //   sursă lipsă → citirea paginilor web oficiale (dacă o sursă activă o oferă)
  //   validare eșuată / limită atinsă → încă o încercare în sursele structurate
  //   act ambiguu / text nesigur → fără reluare (necesită informații de la utilizator)
  const verified = new Set(toVerify.map((r) => r.id));
  const candidates = findings.filter((f) => f.status === "neverificat" && !f.preluatDin && verified.has(f.referenceId));
  const recovery = (mod: "web" | "reluare", tipuri: string[]) => {
    const fs = candidates.filter((f) => tipuri.includes(f.tipNeverificare ?? "") && !(mod === "reluare" && f.motivNeverificare === budgetMotiv));
    const refs = fs.map((f) => refById.get(f.referenceId)!).filter(Boolean);
    const gs: ReferenceGroup[] = [];
    for (let i = 0; i < refs.length; i += RECOVERY_GROUP_SIZE) {
      const part = refs.slice(i, i + RECOVERY_GROUP_SIZE);
      const label = mod === "web" ? "Căutare web" : "Reluare verificare";
      gs.push({ cheie: `${mod}#${i / RECOVERY_GROUP_SIZE + 1}`, eticheta: `${label} (${part.length} ${part.length === 1 ? "trimitere" : "trimiteri"})`, references: part });
    }
    return { gs, motivePrecedente: new Map(fs.map((f) => [f.referenceId, f.motivNeverificare ?? f.explicatie])) };
  };
  if (!signal?.aborted && !overBudget() && active.length) {
    const retry = recovery("reluare", ["validare_esuata", "limita_atinsa"]);
    const web = sources.has("citeste_pagina") ? recovery("web", ["sursa_lipsa"]) : { gs: [], motivePrecedente: new Map<string, string>() };
    if (retry.gs.length || web.gs.length) {
      emit({
        type: "etapa",
        etapa: "verificare",
        mesaj: `Recuperez ${retry.gs.reduce((n, g) => n + g.references.length, 0) + web.gs.reduce((n, g) => n + g.references.length, 0)} trimiteri neverificate`,
      });
    }
    if (retry.gs.length) await runGroups(retry.gs, { recuperare: { mod: "reluare", motivePrecedente: retry.motivePrecedente } }, Promise.resolve(), () => {});
    if (web.gs.length && !overBudget()) await runGroups(web.gs, { recuperare: { mod: "web", motivePrecedente: web.motivePrecedente } }, Promise.resolve(), () => {});
  }

  // ── 4. Consolidare
  emit({ type: "etapa", etapa: "consolidare", mesaj: "Consolidez rezultatele și indicatorii de acoperire" });
  const order = new Map(segments.map((s, i) => [s.id, i]));
  findings.sort((a, b) => {
    const sa = order.get(a.anchors[0]?.segmentId) ?? 0;
    const sb = order.get(b.anchors[0]?.segmentId) ?? 0;
    return sa - sb || (a.anchors[0]?.start ?? 0) - (b.anchors[0]?.start ?? 0);
  });

  const result: AnalysisResult = {
    id: reluare?.id ?? crypto.randomUUID(),
    createdAt: reluare?.createdAt ?? new Date().toISOString(),
    dataReferinta,
    dataVerificarii: dataAzi,
    dataDocumentDetectata: dataDocument,
    model: MODEL,
    findings,
    coverage: computeCoverage({ segments, unreadablePages: input.unreadablePages ?? [] }, findings),
    surse: sourcesUsed(findings),
    consum: mergeUsage(reluare?.consum, usage.report()),
    avertismente,
    durataMs: Date.now() - started,
    trimiteri: refSet,
    surseActive: active.map((s) => ({ id: s.id, label: s.label })),
    ...(recheck ? { segmenteVerificate: [...recheck] } : {}),
  };
  return result;
}
