import type { CliTool, ToolOutcome } from "@lexai/ai";
import { z } from "zod";
import type { ActId, EvidenceDraft, EvidenceStore } from "./evidence";
import { RunScope, type SourceRegistry } from "./registry";
import {
  SourceError,
  callSource,
  type Capability,
  type CapabilityParams,
  type CapabilityResult,
  type FelDecizie,
  type LegalSource,
  type SourceCallContext,
} from "./types";

/**
 * Instrumentele agentului de verificare, generate din capabilitățile surselor active.
 * Numele și semantica sunt cele ale aplicației anterioare (prompturile le folosesc ca atare):
 * cauta_act, info_act, citeste_articol, cauta_in_act, plus cauta_decizii, citeste_decizie
 * și web_fetch (capabilitatea „citeste_pagina”). Instrumentele documentului și raportarea
 * vin din @lexai/core, prin `extra`.
 */

export interface AgentTool extends CliTool {
  /** capabilitatea sursei care implementează instrumentul (lipsește la instrumentele documentului) */
  capability?: Capability;
  /** rândul din secțiunea „## Instrumente” a promptului de verificare */
  promptLine?: string;
}

export type { ToolOutcome };

// ───────────────────────── Definirea unui instrument ─────────────────────────

/** Instrument cu validarea intrării (zod) și erorile surselor transformate în mesaje pentru agent. */
export function defineTool<S extends z.ZodType>(def: {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  input: S;
  capability?: Capability;
  promptLine?: string;
  run: (input: z.infer<S>) => Promise<ToolOutcome> | ToolOutcome;
}): AgentTool {
  return {
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema,
    capability: def.capability,
    promptLine: def.promptLine,
    run: async (raw) => {
      const parsed = def.input.safeParse(raw);
      if (!parsed.success) {
        return { content: `INVALID_INPUT: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`, isError: true };
      }
      try {
        return await def.run(parsed.data);
      } catch (e) {
        return toolError(e);
      }
    },
  };
}

/** Mesajul pentru agent când o sursă eșuează. */
export function toolError(e: unknown): ToolOutcome {
  if (e instanceof SourceError && e.kind === "refuz") return { content: e.message, isError: true };
  const msg = e instanceof SourceError && e.url ? `${e.message} (${e.url})` : e instanceof Error ? e.message : String(e);
  return { content: `SURSĂ INDISPONIBILĂ: ${msg}. Dacă nu poți verifica altfel, raportează "neverificat" cu acest motiv.`, isError: true };
}

// ───────────────────────── Scheme ─────────────────────────

const nullableString = { type: ["string", "null"] } as const;
const ns = z.string().nullable();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "data trebuie să fie yyyy-mm-dd");
/** id-ul unui act: întreg pe portal; alte surse pot folosi șiruri */
const actId = z.union([z.number().int(), z.string().trim().min(1)]).transform((v): ActId => (typeof v === "string" && /^\d+$/.test(v) ? Number(v) : v));
const actIdSchema = (description: string) => ({ type: ["integer", "string"], description });

export const FEL_DECIZIE_LABELS: Record<FelDecizie, string> = {
  ccr_exceptie: "CCR – excepție de neconstituționalitate",
  ccr_obiectie: "CCR – obiecție de neconstituționalitate",
  ccr_alta: "CCR",
  iccj_hp: "ÎCCJ – hotărâre prealabilă (HP)",
  iccj_ril: "ÎCCJ – recurs în interesul legii (RIL)",
  iccj_alta: "ÎCCJ",
  alta: "Altă instanță",
};

/** Numele instrumentului pentru fiecare capabilitate. */
export const TOOL_NAMES: Record<Capability, string> = {
  cauta_act: "cauta_act",
  info_act: "info_act",
  citeste_articol: "citeste_articol",
  cauta_in_act: "cauta_in_act",
  cauta_decizii: "cauta_decizii",
  citeste_decizie: "citeste_decizie",
  citeste_pagina: "web_fetch",
};

/** cât text dintr-o pagină web primește modelul (dovada păstrează textul complet) */
const WEB_PAGE_CHARS = 100_000;
/** cât din textul unei decizii primește modelul */
const DECISION_CHARS = 20_000;
const MAX_DECISIONS_LISTED = 30;

// ───────────────────────── Execuție pe surse ─────────────────────────

export interface ToolsContext {
  /** registrul de dovezi al analizei */
  store: EvidenceStore;
  /** starea analizei (comună tuturor grupurilor de verificare) */
  scope?: RunScope;
  signal?: AbortSignal;
  activity?: (mesaj: string) => void;
  /** capabilități omise (ex. „citeste_pagina” în afara recuperării pe web) */
  exclude?: Capability[];
  /** instrumentele documentului și raportarea (din @lexai/core), adăugate după cele ale surselor */
  extra?: AgentTool[];
}

interface Runner {
  registry: SourceRegistry;
  scope: RunScope;
  ctx: ToolsContext;
}

function callCtx(r: Runner, s: LegalSource): SourceCallContext {
  return r.scope.context(s.id, { signal: r.ctx.signal, activity: r.ctx.activity });
}

function record(r: Runner, s: LegalSource, d: EvidenceDraft) {
  return r.ctx.store.add({ ...d, sourceId: s.id });
}

/** Sursa căreia îi aparține un id (actul a fost găsit acolo), altfel prima sursă care oferă capabilitatea. */
function route(r: Runner, cap: Capability, key: string): LegalSource {
  const providers = r.registry.providers(cap);
  const owner = r.scope.owners.get(key);
  const s = providers.find((p) => p.id === owner) ?? providers[0];
  if (!s) throw new SourceError(`Nicio sursă activă nu oferă „${cap}”.`, { kind: "refuz" });
  return s;
}

/** Prima sursă (în ordinea priorității) care întoarce un rezultat util; erorile trec la următoarea. */
async function firstUseful<C extends Capability>(
  r: Runner,
  cap: C,
  params: CapabilityParams<C>,
  useful: (res: CapabilityResult<C>) => boolean,
): Promise<{ source: LegalSource; result: CapabilityResult<C> }> {
  let fallback: { source: LegalSource; result: CapabilityResult<C> } | null = null;
  let firstError: unknown = null;
  for (const s of r.registry.providers(cap)) {
    try {
      const result = await callSource(s, cap, params, callCtx(r, s));
      if (useful(result)) return { source: s, result };
      fallback ??= { source: s, result };
    } catch (e) {
      if (r.ctx.signal?.aborted) throw e;
      firstError ??= e;
    }
  }
  if (fallback) return fallback;
  throw firstError ?? new SourceError(`Nicio sursă activă nu oferă „${cap}”.`, { kind: "refuz" });
}

const truncate = (s: string, n: number, note: string) => (s.length > n ? `${s.slice(0, n)}\n${note}` : s);

// ───────────────────────── Instrumentele surselor ─────────────────────────

type ToolFactory = (r: Runner) => AgentTool;

const SOURCE_TOOLS: Record<Capability, ToolFactory> = {
  cauta_act: (r) =>
    defineTool({
      name: TOOL_NAMES.cauta_act,
      capability: "cauta_act",
      description:
        "Caută acte normative pe Portalul Legislativ. Completează câmpurile cunoscute, restul null. Întoarce act_id (forma de bază), titlul, data intrării în vigoare. Pentru coduri caută după legea de aprobare (ex. Codul civil = lege 287/2009) sau după titlu.",
      promptLine:
        "- cauta_act: caută acte (tip, număr, an, cuvinte din titlu sau din text). Întoarce act_id-ul formei de bază și data intrării în vigoare.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["tip", "numar", "an", "titlu", "text", "in_vigoare_la"],
        properties: {
          tip: { ...nullableString, description: "ex. lege, OUG, OG, HG, cod, decizie, ordin, constitutie" },
          numar: { ...nullableString, description: "numărul actului" },
          an: { ...nullableString, description: "anul actului (4 cifre)" },
          titlu: { ...nullableString, description: "cuvinte din titlu; * înlocuiește un grup de litere" },
          text: { ...nullableString, description: "expresie din conținutul actului" },
          in_vigoare_la: { ...nullableString, description: "doar acte în vigoare la data (yyyy-mm-dd)" },
        },
      },
      input: z.object({ tip: ns, numar: ns, an: ns, titlu: ns, text: ns, in_vigoare_la: ns }),
      run: async (p) => {
        const { source, result } = await firstUseful(
          r,
          "cauta_act",
          { tip: p.tip, numar: p.numar, an: p.an, titlu: p.titlu, text: p.text, inVigoareLa: p.in_vigoare_la },
          (x) => x.rezultate.length > 0,
        );
        if (result.rezultate.length === 0) {
          const ev = result.dovada ? record(r, source, result.dovada) : null;
          const text = ev?.text ?? "Căutarea nu a întors niciun act.";
          return {
            content: JSON.stringify({
              evidence_id: ev?.id,
              rezultate: [],
              nota: `${text} ${result.nota ?? "Încearcă și alte criterii (fără tip, după titlu) înainte de a concluziona că actul nu există."}`,
            }),
          };
        }
        for (const x of result.rezultate) r.scope.owners.set(`act:${x.actId}`, source.id);
        const rezultate = result.rezultate.map((x) => ({
          act_id: x.actId,
          eticheta: x.eticheta,
          titlu: x.titlu,
          descriere: x.descriere,
          emitent: x.emitent,
          publicat: x.publicat,
          intrare_in_vigoare: x.intrareInVigoareText || null,
          republicare: x.republicare,
        }));
        return { content: JSON.stringify({ total: result.total, rezultate, url: result.url, nota: result.nota }) };
      },
    }),

  info_act: (r) =>
    defineTool({
      name: TOOL_NAMES.info_act,
      capability: "info_act",
      description:
        "Fișa unui act: denumire, emitent, publicare, forme (consolidări/republicări cu date), forma aplicabilă la data cerută, note la nivel de act, acțiuni asupra actului (abrogare, suspendare, decizii CCR, modificări pe articole).",
      promptLine:
        "- info_act: fișa actului: forme (consolidări/republicări cu date), forma aplicabilă la data cerută, note la nivel de act (ex. republicare cu renumerotare), acțiuni asupra actului (abrogat, suspendat, decizii CCR). Folosește întotdeauna act_id-ul formei de bază primit de la cauta_act.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["act_id", "data"],
        properties: {
          act_id: actIdSchema("act_id-ul formei de bază (din cauta_act)"),
          data: { type: "string", description: "data pentru care se determină forma aplicabilă (yyyy-mm-dd)" },
        },
      },
      input: z.object({ act_id: actId, data: isoDate }),
      run: async (p) => {
        const s = route(r, "info_act", `act:${p.act_id}`);
        const res = await callSource(s, "info_act", { actId: p.act_id, data: p.data }, callCtx(r, s));
        const fisa = record(r, s, res.fisa);
        const actiuni = res.actiuni ? record(r, s, res.actiuni) : null;
        return {
          content: JSON.stringify({
            evidence_fisa: fisa.id,
            fisa: fisa.text,
            evidence_actiuni: actiuni?.id,
            actiuni: actiuni?.text,
            nota: res.nota,
          }),
        };
      },
    }),

  citeste_articol: (r) =>
    defineTool({
      name: TOOL_NAMES.citeste_articol,
      capability: "citeste_articol",
      description:
        "Textul exact al unui articol din forma actului aplicabilă la data indicată (cu alineate, litere, note de modificare și note cu dispoziții tranzitorii). Dacă îți trebuie un singur alineat, indică-l în „alineat” (primești doar acel alineat, cu literele și notele lui). Dacă articolul nu există în acea formă, întoarce o dovadă de inexistență și articolele apropiate.",
      promptLine:
        "- citeste_articol: textul exact al unui articol din forma aplicabilă la data de referință, cu note de modificare și dispoziții tranzitorii; dacă articolul nu există în acea formă, primești o dovadă de inexistență și articolele apropiate.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["act_id", "articol", "alineat", "data"],
        properties: {
          act_id: actIdSchema("act_id-ul formei de bază"),
          articol: { type: "string", description: "numărul articolului: '7', '6^1', 'I'" },
          alineat: { ...nullableString, description: "doar acest alineat, ex. '1'; null pentru tot articolul" },
          data: { type: "string", description: "data de referință (yyyy-mm-dd)" },
        },
      },
      input: z.object({ act_id: actId, articol: z.string().min(1), alineat: ns, data: isoDate }),
      run: async (p) => {
        const s = route(r, "citeste_articol", `act:${p.act_id}`);
        const res = await callSource(s, "citeste_articol", { actId: p.act_id, articol: p.articol, alineat: p.alineat, data: p.data }, callCtx(r, s));
        if ("redirect" in res) {
          for (const c of res.redirect.coduri) r.scope.owners.set(`act:${c.actId}`, s.id);
          return {
            content: JSON.stringify({
              gasit: false,
              nota: res.redirect.nota,
              coduri: res.redirect.coduri.map((c) => ({ act_id: c.actId, eticheta: c.eticheta, intrare_in_vigoare: c.intrareInVigoare })),
            }),
          };
        }
        const ev = record(r, s, res.dovada);
        if (!res.gasit) return { content: JSON.stringify({ evidence_id: ev.id, gasit: false, text: res.text, actiuni_pe_articol: res.actiuniPeArticol }) };
        return {
          content: JSON.stringify({
            evidence_id: ev.id,
            gasit: true,
            potrivire_aproximativa_numar: res.potrivireAproximativa,
            abrogat: res.abrogat,
            alineat_negasit: res.alineatNegasit,
            text: res.text,
            actiuni_pe_articol: res.actiuniPeArticol,
          }),
        };
      },
    }),

  cauta_in_act: (r) =>
    defineTool({
      name: TOOL_NAMES.cauta_in_act,
      capability: "cauta_in_act",
      description:
        "Caută o expresie în toate articolele formei aplicabile la dată. Întoarce cel mult 4 articole care o conțin (text posibil prescurtat), fiecare cu evidence_id; pentru textul complet al unui articol folosește citeste_articol.",
      promptLine:
        "- cauta_in_act: caută o expresie în textul unui act (pentru trimiteri implicite sau pentru a găsi articolul corect / norma specială).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["act_id", "expresie", "data"],
        properties: {
          act_id: actIdSchema("act_id-ul formei de bază"),
          expresie: { type: "string", description: "cuvinte cheie, ex. 'preaviz', 'capitalul social'" },
          data: { type: "string", description: "yyyy-mm-dd" },
        },
      },
      input: z.object({ act_id: actId, expresie: z.string().min(2), data: isoDate }),
      run: async (p) => {
        const s = route(r, "cauta_in_act", `act:${p.act_id}`);
        const res = await callSource(s, "cauta_in_act", { actId: p.act_id, expresie: p.expresie, data: p.data }, callCtx(r, s));
        if (res.rezultate.length === 0) {
          const ev = res.dovada ? record(r, s, res.dovada) : null;
          return { content: JSON.stringify({ evidence_id: ev?.id, rezultate: [], nota: ev?.text ?? `Expresia „${p.expresie}” nu a fost găsită.` }) };
        }
        const rezultate = res.rezultate.map((x) => ({
          evidence_id: record(r, s, x.dovada).id,
          articol: x.articol,
          ...(x.pasaj ? { pasaj: x.pasaj } : {}),
          text: x.text,
        }));
        return { content: JSON.stringify({ forma: res.forma, rezultate }) };
      },
    }),

  cauta_decizii: (r) =>
    defineTool({
      name: TOOL_NAMES.cauta_decizii,
      capability: "cauta_decizii",
      description:
        "Caută deciziile Curții Constituționale și ale ÎCCJ (hotărâri prealabile – HP, recursuri în interesul legii – RIL) care privesc un act: număr și an (ex. 31, 1990) sau numele codului (ex. „codul civil”), opțional un articol. Cu „expresie” caută și în jurisprudența ÎCCJ de pe scj.ro (inclusiv minute nepublicate). Întoarce decizie_id-uri pentru citeste_decizie.",
      promptLine:
        "- cauta_decizii: deciziile CCR și ÎCCJ (HP, RIL) care privesc un act sau un articol; folosește-l când o decizie obligatorie poate schimba sensul sau aplicarea normei (categoria decizie_obligatorie_ignorata).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["numar", "an", "cod", "articol", "instanta", "expresie"],
        properties: {
          numar: { ...nullableString, description: "numărul actului" },
          an: { ...nullableString, description: "anul actului (4 cifre)" },
          cod: { ...nullableString, description: "numele codului, ex. „codul muncii” (în locul numărului și anului)" },
          articol: { ...nullableString, description: "doar deciziile care privesc acest articol, ex. '268'" },
          instanta: { anyOf: [{ type: "string", enum: ["ccr", "iccj"] }, { type: "null" }] },
          expresie: { ...nullableString, description: "cuvinte cheie pentru căutarea pe scj.ro, ex. „art. 268 Codul muncii”" },
        },
      },
      input: z.object({ numar: ns, an: ns, cod: ns, articol: ns, instanta: z.enum(["ccr", "iccj"]).nullable(), expresie: ns }),
      run: async (p) => {
        const providers = r.registry.providers("cauta_decizii");
        const settled = await Promise.allSettled(providers.map((s) => callSource(s, "cauta_decizii", p, callCtx(r, s)).then((res) => ({ s, res }))));
        const ok = settled.flatMap((x) => (x.status === "fulfilled" ? [x.value] : []));
        if (!ok.length) throw (settled.find((x) => x.status === "rejected") as PromiseRejectedResult | undefined)?.reason ?? new SourceError("Nicio sursă de jurisprudență activă.", { kind: "refuz" });
        const rezultate = ok.flatMap(({ s, res }) =>
          res.rezultate.map((d) => {
            r.scope.owners.set(`decizie:${d.id}`, s.id);
            return {
              decizie_id: d.id,
              instanta: FEL_DECIZIE_LABELS[d.fel],
              titlu: d.titlu,
              descriere: d.descriere,
              data: d.data,
              publicat: d.publicat || undefined,
              potrivire: d.potrivire === "posibil" ? "incertă (articolul apare, dar legătura cu actul nu e clară)" : undefined,
              nota: d.nota,
            };
          }),
        );
        return {
          content: JSON.stringify({
            total: rezultate.length,
            rezultate: rezultate.slice(0, MAX_DECISIONS_LISTED),
            omise: rezultate.length > MAX_DECISIONS_LISTED ? rezultate.length - MAX_DECISIONS_LISTED : undefined,
            complet: ok.every(({ res }) => res.complet),
            note: ok.map(({ res }) => res.nota).filter(Boolean),
          }),
        };
      },
    }),

  citeste_decizie: (r) =>
    defineTool({
      name: TOOL_NAMES.citeste_decizie,
      capability: "citeste_decizie",
      description:
        "Textul unei decizii CCR sau ÎCCJ (decizie_id din cauta_decizii), cu soluția și dispozitivul; textul complet e înregistrat ca dovadă (evidence_id). Cu „expresie” primești și pasajele care o conțin.",
      promptLine: "- citeste_decizie: textul unei decizii (soluția, dispozitivul și, la cerere, pasajele care conțin o expresie), înregistrat ca dovadă.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["decizie_id", "expresie"],
        properties: {
          decizie_id: { type: "string", description: "id-ul din cauta_decizii (ex. „174157” sau „iccj:239658”)" },
          expresie: { ...nullableString, description: "opțional: pasajele care conțin această expresie" },
        },
      },
      input: z.object({ decizie_id: z.union([z.string().min(1), z.number().int()]).transform(String), expresie: ns }),
      run: async (p) => {
        const s = route(r, "citeste_decizie", `decizie:${p.decizie_id}`);
        const res = await callSource(s, "citeste_decizie", { id: p.decizie_id, expresie: p.expresie }, callCtx(r, s));
        const ev = record(r, s, res.dovada);
        const d = res.decizie;
        return {
          content: JSON.stringify({
            evidence_id: ev.id,
            decizia: d.titlu,
            instanta: FEL_DECIZIE_LABELS[d.fel],
            obiect: d.descriere || undefined,
            publicata: d.publicat || undefined,
            solutie: d.solutie ?? "nedeterminată automat — citește dispozitivul",
            dispozitiv: d.dispozitiv,
            pasaje: p.expresie ? res.pasaje : undefined,
            text: truncate(ev.text, DECISION_CHARS, "[… text trunchiat; folosește „expresie” pentru alte pasaje]"),
          }),
        };
      },
    }),

  citeste_pagina: (r) =>
    defineTool({
      name: TOOL_NAMES.citeste_pagina,
      capability: "citeste_pagina",
      description:
        "Citește o pagină de pe un site oficial românesc sau european acceptat (legislatie.just.ro, monitoruloficial.ro, ccr.ro, scj.ro, cdep.ro, senat.ro, *.gov.ro, static.anaf.ro, autorități de reglementare; legislația UE prin publications.europa.eu). Textul paginii este înregistrat ca dovadă: în raporteaza_constatare folosește ca evidence_id URL-ul exact al paginii. Paginile PDF nu sunt acceptate.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["url"],
        properties: { url: { type: "string", description: "adresa completă (https://…)" } },
      },
      input: z.object({ url: z.string().url() }),
      run: async (p) => {
        const s = r.registry.providers("citeste_pagina").find((x) => !x.trustsUrl || x.trustsUrl(p.url));
        if (!s) {
          return { content: `Adresa ${p.url} nu aparține unui site oficial acceptat (doar https, domeniile din descrierea instrumentului).`, isError: true };
        }
        const res = await callSource(s, "citeste_pagina", { url: p.url }, callCtx(r, s));
        const ev = record(r, s, res.dovada);
        return { content: JSON.stringify({ evidence_id: ev.id, url: res.url, titlu: res.titlu, text: truncate(ev.text, WEB_PAGE_CHARS, "[… text trunchiat]") }) };
      },
    }),
};

/**
 * Instrumentele agentului pentru sursele active: câte unul pentru fiecare capabilitate oferită
 * de cel puțin o sursă (minus `exclude`), urmate de `extra`.
 */
export function toolsFor(registry: SourceRegistry, ctx: ToolsContext): AgentTool[] {
  const r: Runner = { registry, scope: ctx.scope ?? new RunScope(), ctx };
  const caps = registry.capabilities();
  const excluded = new Set(ctx.exclude ?? []);
  const tools = (Object.keys(SOURCE_TOOLS) as Capability[]).filter((c) => caps.has(c) && !excluded.has(c)).map((c) => SOURCE_TOOLS[c](r));
  return [...tools, ...(ctx.extra ?? [])];
}
