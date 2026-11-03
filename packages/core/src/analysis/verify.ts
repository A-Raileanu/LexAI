import { MODEL, type InputBlock } from "@lexai/ai";
import { toolsFor, type AgentTool, type RunScope, type SourceRegistry } from "@lexai/sources";
import { claudeCli, type AiClient, type AiSession } from "../ai";
import type { DocSegment, Finding } from "../types";
import { costOf, type UsageTracker } from "../usage";
import { trustFrom, type EvidenceStore } from "./evidence";
import { unverifiedFinding } from "./findings";
import { renderSegments, type LegalReference, type ReferenceGroup } from "./identify";
import { VERIFY_TOOL_NAMES_NOTE, VERIFY_WEB_ADDENDUM, verifySystem } from "./prompts";
import { prefetchSources, type ToolCaller } from "./prefetch";
import { documentTools, reportTool, type ReportInput } from "./tools";
import { buildFinding, validateReport } from "./validation";

/** răspunsuri ale modelului (apeluri API) per grup */
const MAX_TURNS = 40;
/** de câte ori îi cerem agentului să raporteze trimiterile rămase */
const MAX_NUDGES = 3;
/** după atâtea apeluri repetate (aceiași parametri), agentul este oprit */
const MAX_REPEATS = 3;

/** Bugete (USD) — configurabile din mediu sau per analiză. */
export const BUDGET_GROUP_USD = Number(process.env.LEXAI_BUGET_GRUP_USD ?? 0.3);
export const BUDGET_DOCUMENT_USD = Number(process.env.LEXAI_BUGET_DOCUMENT_USD ?? 3);
const MAX_REPORT_ATTEMPTS = 3;
/** câte segmente vecine (înainte și după) primește agentul în jurul fiecărei trimiteri */
const CONTEXT_RADIUS = 2;
/** instrumentele cu care serverul pregătește sursele citărilor explicite */
const PREFETCH_TOOLS = ["cauta_act", "info_act", "citeste_articol"];

export interface Budgets {
  /** USD per grup de verificare */
  grupUsd: number;
  /** USD per document */
  documentUsd: number;
}

export const DEFAULT_BUDGETS: Budgets = { grupUsd: BUDGET_GROUP_USD, documentUsd: BUDGET_DOCUMENT_USD };

export interface VerifyContext {
  segments: DocSegment[];
  dataReferinta: string;
  dataAzi: string;
  store: EvidenceStore;
  /** sursele active */
  sources: SourceRegistry;
  /** starea analizei pe surse (comună tuturor grupurilor) */
  scope: RunScope;
  signal?: AbortSignal;
  usage: UsageTracker;
  ai?: AiClient;
  budgets?: Budgets;
  onActivity: (msg: string) => void;
  onFinding: (f: Finding) => void;
  /** apelat după fiecare răspuns al modelului (consumul a fost actualizat) */
  onUsage?: () => void;
  /**
   * Recuperare pentru trimiterile rămase neverificate: „web” (sursă lipsă)
   * sau „reluare” (validare eșuată / limită atinsă), cu motivul anterior al fiecăreia.
   */
  recuperare?: { mod: "web" | "reluare"; motivePrecedente: Map<string, string> };
}

// ───────────────────────── Agentul ─────────────────────────

function describeReference(r: LegalReference): string {
  const act = r.act ? [r.act.tip, r.act.numar && `nr. ${r.act.numar}`, r.act.an && `/${r.act.an}`, r.act.denumire && `(${r.act.denumire})`].filter(Boolean).join(" ") : "neidentificat";
  return [
    `- trimitere_id: ${r.id}`,
    `  segment: ${r.segment_id}`,
    `  tip: ${r.tip}`,
    `  citat: «${r.citat}»`,
    `  act (după document): ${act}`,
    `  unitate (după document): ${r.unitate ?? "—"}`,
    `  afirmația documentului: ${r.afirmatie}`,
  ].join("\n");
}

function describeWithPrevious(r: LegalReference, motiv: string | undefined): string {
  return `${describeReference(r)}\n  motivul pentru care verificarea anterioară nu a reușit: ${motiv ?? "—"}`;
}

/** Cheie stabilă pentru detectarea apelurilor repetate. */
function callKey(name: string, input: unknown): string {
  const norm = (v: unknown): unknown =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, norm((v as Record<string, unknown>)[k])]))
      : typeof v === "string"
        ? v.trim().toLowerCase()
        : v;
  return `${name}:${JSON.stringify(norm(input))}`;
}

/** Promptul de sistem pentru instrumentele și sursele active. */
export function systemFor(tools: AgentTool[], sources: SourceRegistry, web: boolean): string {
  const lines = tools.map((t) => t.promptLine).filter((l): l is string => !!l);
  const names = sources
    .enabled()
    .filter((s) => web || !s.capabilities.has("citeste_pagina") || s.capabilities.size > 1)
    .map((s) => s.description ?? s.label);
  return [verifySystem({ sources: names, toolLines: lines }), VERIFY_TOOL_NAMES_NOTE, ...(web ? [VERIFY_WEB_ADDENDUM] : [])].join("\n\n");
}

export async function verifyGroup(group: ReferenceGroup, ctx: VerifyContext): Promise<Finding[]> {
  const ai = ctx.ai ?? claudeCli;
  const budgets = ctx.budgets ?? DEFAULT_BUDGETS;
  const findings = new Map<string, Finding>();
  const attempts = new Map<string, number>();
  const refsById = new Map(group.references.map((r) => [r.id, r]));
  const vctx = { ...ctx, trusts: trustFrom(ctx.sources) };

  let session: AiSession | null = null;
  let stopReason: string | null = null;
  const halt = (reason: string) => {
    stopReason ??= reason;
    ctx.onActivity(reason);
    session?.stop();
  };

  const report = (input: ReportInput) => {
    const ref = refsById.get(input.trimitere_id);
    if (!ref) return { ok: false, message: `trimitere_id necunoscut: ${input.trimitere_id}. Valori valide: ${[...refsById.keys()].join(", ")}` };
    if (findings.has(ref.id)) return { ok: true, message: `Trimiterea ${ref.id} era deja raportată; rezultatul inițial a fost păstrat.` };
    const n = (attempts.get(ref.id) ?? 0) + 1;
    attempts.set(ref.id, n);
    const { errors, suggestionErrors, dovezi } = validateReport(input, vctx, ref);
    const all = [...errors, ...suggestionErrors];
    if (all.length && n < MAX_REPORT_ATTEMPTS) {
      return {
        ok: false,
        message: `Constatarea pentru ${ref.id} NU a fost înregistrată. Probleme de validare:\n- ${all.join("\n- ")}\nCorectează (citește sursa necesară, copiază fragmentele și text_original exact din document) și apelează din nou raporteaza_constatare.`,
      };
    }
    // după reîncercări: dovezile nevalidate retrogradează verdictul; sugestiile invalide doar se omit (`sugestiiLipsa`)
    const f = buildFinding(input, ref, vctx, dovezi, errors);
    findings.set(ref.id, f);
    ctx.onFinding(f);
    const rest = group.references.filter((r) => !findings.has(r.id)).map((r) => r.id);
    // toate trimiterile sunt raportate: nu mai așteptăm și mesajul de încheiere al agentului
    if (!rest.length) setImmediate(() => session?.stop());
    return {
      ok: true,
      message: `Înregistrat ${ref.id} (${f.status}${f.retrogradat ? ", retrogradat automat" : ""}${f.sugestiiLipsa ? ", fără sugestie validă" : ""}). ${rest.length ? `Rămase: ${rest.join(", ")}.` : "Toate trimiterile au fost raportate; încheie."}`,
    };
  };

  const web = ctx.recuperare?.mod === "web" && ctx.sources.has("citeste_pagina");
  const stage = ctx.recuperare ? "web" : "verificare";

  // instrumentele surselor active (fără citirea paginilor web în afara recuperării pe web), apoi cele ale documentului
  const raport = reportTool(report);
  const sourceTools = toolsFor(ctx.sources, {
    store: ctx.store,
    scope: ctx.scope,
    signal: ctx.signal,
    activity: ctx.onActivity,
    exclude: web ? [] : ["citeste_pagina"],
    extra: [...documentTools(ctx.segments, ctx.onActivity), raport],
  });
  const byName = new Map(sourceTools.map((t) => [t.name, t]));

  // apeluri memoizate: același apel întoarce trimiterea la rezultatul deja primit
  const memo = new Map<string, string>();
  let repeats = 0;
  const call: ToolCaller = async (name, input) => {
    const tool = byName.get(name);
    if (!tool) return { content: `Instrument indisponibil: ${name}`, isError: true };
    const key = callKey(name, input);
    const prev = memo.get(key);
    if (prev !== undefined) {
      if (++repeats >= MAX_REPEATS) setImmediate(() => halt("Agentul repeta aceleași căutări fără informații noi."));
      const ids = [...new Set(prev.match(/E\d+/g) ?? [])].slice(0, 8);
      return {
        content: `APEL REPETAT: ai primit deja rezultatul pentru exact acești parametri${ids.length ? ` (dovezi: ${ids.join(", ")})` : ""}. Folosește-l sau schimbă criteriile; nu repeta apelul.`,
      };
    }
    const out = await tool.run(input);
    if (!out.isError) memo.set(key, out.content);
    return out;
  };

  // agentul primește doar contextul trimiterilor și titlurile documentului; restul îl caută cu cauta_in_document
  const context = new Set<string>();
  for (const r of group.references) {
    const i = ctx.segments.findIndex((s) => s.id === r.segment_id);
    if (i < 0) continue;
    for (let j = Math.max(0, i - CONTEXT_RADIUS); j <= Math.min(ctx.segments.length - 1, i + CONTEXT_RADIUS); j++) context.add(ctx.segments[j].id);
  }
  const docText = renderSegments(ctx.segments.filter((s) => context.has(s.id) || s.kind === "titlu"));

  // surse pregătite de server pentru citările explicite (nu și la căutarea web: acolo sursele structurate n-au ajutat)
  const canPrefetch = PREFETCH_TOOLS.every((n) => byName.has(n));
  const surse = web || !canPrefetch ? "" : await prefetchSources(group.references, ctx.dataReferinta, ctx.dataAzi, call).catch(() => "");

  const content: InputBlock[] = [
    {
      type: "text",
      text: `<fragmente_document>\n${docText}\n</fragmente_document>\n(Sunt incluse doar titlurile și pasajele din jurul trimiterilor; pentru restul documentului folosește cauta_in_document și citeste_segment.)`,
    },
    ...(surse ? [{ type: "text" as const, text: `<surse_pregatite>\n${surse}\n</surse_pregatite>` }] : []),
    {
      type: "text",
      text: [
        `data_referinta: ${ctx.dataReferinta}`,
        `data_azi: ${ctx.dataAzi}`,
        "",
        `Verifică următoarele ${group.references.length} trimiteri (grup: ${group.eticheta}):`,
        ...group.references.map((r) => (ctx.recuperare ? describeWithPrevious(r, ctx.recuperare.motivePrecedente.get(r.id)) : describeReference(r))),
      ].join("\n"),
    },
  ];

  // raportarea nu trece prin memoizare (o constatare respinsă se retrimite cu aceiași parametri corectați)
  const tools = sourceTools.map((t) => ({ ...t, run: (input: Record<string, unknown>) => (t === raport ? t.run(input) : call(t.name, input)) }));

  let groupCost = 0;
  let turns = 0;
  const allReported = () => group.references.every((r) => findings.has(r.id));

  session = await ai.start({
    model: MODEL,
    effort: "medium",
    maxOutputTokens: 32000,
    system: systemFor(sourceTools, ctx.sources, web),
    tools,
    // căutarea web a Claude Code; paginile se citesc doar cu web_fetch (domenii oficiale, înregistrate ca dovezi)
    builtinTools: web ? ["WebSearch"] : [],
    signal: ctx.signal,
    onLimits: (l) => {
      ctx.usage.setLimits(l);
      ctx.onUsage?.();
    },
    onMessage: (m) => {
      turns++;
      ctx.usage.record(stage, m.model, m.usage);
      groupCost += costOf(m.model, {
        input: m.usage.input_tokens,
        cacheWrite: m.usage.cache_creation_input_tokens ?? 0,
        cacheRead: m.usage.cache_read_input_tokens ?? 0,
        output: m.usage.output_tokens,
        apeluri: 1,
        cautariWeb: m.usage.server_tool_use?.web_search_requests ?? 0,
      });
      ctx.onUsage?.();
      if (allReported()) return;
      if (m.stopReason === "refusal") halt("Modelul a refuzat continuarea verificării pentru acest grup.");
      else if (m.stopReason === "max_tokens") halt("Răspunsul modelului a depășit lungimea maximă.");
      else if (groupCost >= budgets.grupUsd) halt(`Bugetul de verificare pentru acest grup (${budgets.grupUsd} USD) a fost atins.`);
      else if (ctx.usage.report().total.costUsd >= budgets.documentUsd) halt(`Bugetul de verificare pentru document (${budgets.documentUsd} USD) a fost atins.`);
      else if (turns >= MAX_TURNS) halt("Agentul a atins numărul maxim de pași.");
    },
  });

  try {
    let result = await session.send(content);
    for (let nudge = 0; nudge < MAX_NUDGES && result.subtype === "success" && !allReported() && !stopReason && !ctx.signal?.aborted; nudge++) {
      const missing = group.references.filter((r) => !findings.has(r.id));
      result = await session.send(
        `Nu ai raportat încă: ${missing.map((r) => r.id).join(", ")}. Raportează-le cu raporteaza_constatare (folosește „neverificat” cu motivul exact dacă verificarea nu este posibilă).`,
      );
    }
    if (result.subtype !== "success" && result.subtype !== "oprit" && !allReported()) {
      stopReason ??= `Verificarea s-a încheiat cu eroare (${result.subtype}${result.text ? `: ${result.text}` : ""}).`;
    }
  } catch (e) {
    // la anulare, trimiterile rămase sunt marcate mai jos; celelalte erori (autentificare, limită) urcă
    if (!ctx.signal?.aborted) throw e;
  } finally {
    await session.close();
  }

  // orice trimitere neraportată rămâne explicit neverificată (motiv: limită atinsă);
  // la recuperare, o trimitere neraportată își păstrează rezultatul anterior
  for (const r of group.references) {
    if (findings.has(r.id) || ctx.recuperare) continue;
    const motiv = ctx.signal?.aborted
      ? "Analiza a fost oprită înainte de verificarea acestei trimiteri."
      : (stopReason ?? "Verificarea nu a fost finalizată: agentul a atins numărul maxim de pași fără un rezultat valid.");
    const f = unverifiedFinding(r, ctx.segments, ctx.dataReferinta, motiv, "limita_atinsa");
    findings.set(r.id, f);
    ctx.onFinding(f);
  }
  return [...findings.values()];
}

