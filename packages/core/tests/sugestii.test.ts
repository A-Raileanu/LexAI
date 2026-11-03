import type { ClaudeResult, CliTool } from "@lexai/ai";
import { RunScope, SourceRegistry, urlInDomains, type LegalSource } from "@lexai/sources";
import { describe, expect, it } from "vitest";
import type { AiClient } from "../src/ai";
import { EvidenceStore, trustFrom } from "../src/analysis/evidence";
import {
  countVisibleByStatus,
  canonicalSignature,
  findingSignature,
  normalizeFinding,
  normalizeResult,
  partitionIgnored,
  suggestionSituation,
  suggestionsOf,
  withoutIgnored,
} from "../src/analysis/findings";
import { ReportInputSchema, type ReportInput } from "../src/analysis/tools";
import { buildFinding, validateReport, type ValidationContext } from "../src/analysis/validation";
import { verifyGroup } from "../src/analysis/verify";
import type { AnalysisResult, DocSegment, Finding, LegalReference } from "../src/types";
import { UsageTracker } from "../src/usage";

const DATA = "2026-11-01";
const SENT = "Capitalul social minim este de 500 lei, conform art. 11 alin. (1) din Legea nr. 31/1990.";
const CLAUSE = "Dacă Locatarul nu restituie Locuința la termen, datorează o sumă egală cu chiria proporțională pentru perioada întârzierii.";

const segments: DocSegment[] = [
  { id: "p_1", text: SENT, kind: "paragraf", quality: "ok" },
  { id: "p_2", text: CLAUSE, kind: "paragraf", quality: "ok" },
];

const ref = (id: string, segment_id: string, citat: string): LegalReference => ({ id, segment_id, citat, tip: "explicita", act: null, unitate: null, afirmatie: citat });
const T1 = ref("T1", "p_1", SENT.slice(0, -1));
const T2 = ref("T2", "p_2", CLAUSE);

const portal: LegalSource = { id: "portal", label: "Portal", capabilities: new Set(["citeste_articol"]), trustsUrl: (u) => urlInDomains(u, ["legislatie.just.ro"]) };
const registry = new SourceRegistry([portal]);

function context(): ValidationContext & { evidenceId: string } {
  const store = new EvidenceStore();
  const ev = store.add({
    sourceId: "portal",
    type: "text_articol",
    text: "Articolul 11\n(1) Capitalul social al unei societăți cu răspundere limitată nu poate fi mai mic de 200 lei.",
    url: "https://legislatie.just.ro/Public/DetaliiDocument/104814",
    accesatLa: "2026-11-01T10:00:00Z",
    dataReferinta: DATA,
  });
  return { segments, dataReferinta: DATA, dataAzi: DATA, store, trusts: trustFrom(registry), evidenceId: ev.id };
}

/** Raportul agentului, trecut prin schema zod a instrumentului (ca la apelul real). */
function report(raw: Record<string, unknown>): ReportInput {
  return ReportInputSchema.parse({
    categorie: "valoare_gresita",
    titlu: "Valoare greșită",
    explicatie: "Legea prevede 200 lei.",
    act_id: null,
    unitate: "art. 11 alin. (1)",
    verdict_astazi: null,
    ipoteze: [],
    exceptii: [],
    informatii_lipsa: [],
    motiv_neverificare: null,
    tip_neverificare: null,
    evenimente: [],
    ...raw,
  });
}

const errorReport = (ctx: { evidenceId: string }, extra: Record<string, unknown> = {}) =>
  report({
    trimitere_id: "T1",
    verdict_la_data: { status: "eroare_citare", rezumat: "200 lei, nu 500 lei" },
    dovezi: [{ evidence_id: ctx.evidenceId, fragment: "nu poate fi mai mic de 200 lei" }],
    ...extra,
  });

const fix = { tip: "inlocuire", situatie: null, text_original: "500 lei", text_propus: "200 lei", motiv: "Art. 11 alin. (1) prevede 200 lei.", impact: [] };

describe("validarea sugestiilor", () => {
  it("o greșeală fără sugestie nu trece validarea (agentul primește eroarea și reîncearcă)", () => {
    const ctx = context();
    const v = validateReport(errorReport(ctx), ctx, T1);
    expect(v.errors).toEqual([]);
    expect(v.suggestionErrors.join("\n")).toMatch(/„eroare_citare” necesită cel puțin o sugestie validă/);
    expect(validateReport(errorReport(ctx, { sugestii: [fix] }), ctx, T1).suggestionErrors).toEqual([]);
  });

  it("text_original trebuie copiat din document, iar text_propus să fie nevid și diferit", () => {
    const ctx = context();
    const errs = (s: Record<string, unknown>) => validateReport(errorReport(ctx, { sugestii: [{ ...fix, ...s }] }), ctx, T1).suggestionErrors.join("\n");
    expect(errs({ text_original: "700 lei" })).toMatch(/text_original trebuie copiat exact din document/);
    expect(errs({ text_propus: "" })).toMatch(/text_propus este gol/);
    expect(errs({ text_propus: "500 lei." })).toMatch(/identic cu text_original/);
  });

  it("interpretarea discutabilă cere variante, etichetate cu situația când sunt mai multe", () => {
    const ctx = context();
    const base = {
      trimitere_id: "T2",
      categorie: "fara_temei_identificabil",
      verdict_la_data: { status: "interpretare_discutabila", rezumat: "clauză prezentată ca normă" },
      ipoteze: ["Clauza reproduce o regulă legală"],
      dovezi: [{ evidence_id: ctx.evidenceId, fragment: "Capitalul social al unei societăți" }],
    };
    const none = validateReport(report(base), ctx, T2);
    expect(none.suggestionErrors.join("\n")).toMatch(/„interpretare_discutabila” necesită cel puțin o sugestie validă/);

    const variants = [
      { tip: "inlocuire", situatie: "Clauza este convențională", text_original: "Dacă Locatarul nu restituie", text_propus: "Părțile convin că, dacă Locatarul nu restituie", motiv: "stipulație", impact: [] },
      { tip: "propunere_de_revizuit", situatie: "Se trimite la normă", text_original: "datorează o sumă egală cu chiria", text_propus: "datorează, potrivit art. 1.823 din Codul civil, o sumă egală cu chiria", motiv: "temei", impact: [{ segment_id: "p_1", descriere: "x" }, { segment_id: "p_lipsa", descriere: "y" }] },
      { tip: "propunere_de_revizuit", situatie: "Clauza se elimină", text_original: CLAUSE, text_propus: "", motiv: "fără temei", impact: [] },
    ];
    const input = report({ ...base, sugestii: variants });
    const v = validateReport(input, ctx, T2);
    expect(v.errors).toEqual([]);
    expect(v.suggestionErrors).toEqual([]);
    const f = buildFinding(input, T2, ctx, v.dovezi, v.errors);
    expect(f.sugestii.map((s) => [s.situatie, s.tip])).toEqual([
      ["Clauza este convențională", "propunere_de_revizuit"],
      ["Se trimite la normă", "propunere_de_revizuit"],
      ["Clauza se elimină", "propunere_de_revizuit"],
    ]);
    expect(f.sugestii[1].impact).toEqual([{ segmentId: "p_1", descriere: "x" }]);
    expect(f.sugestie).toBe(f.sugestii[0]);
    expect(f.sugestiiLipsa).toBeUndefined();

    // mai multe variante fără situație: eroare pentru agent, dar variantele rămân utilizabile
    const unlabeled = report({ ...base, sugestii: variants.map((x) => ({ ...x, situatie: null })) });
    expect(validateReport(unlabeled, ctx, T2).suggestionErrors.join("\n")).toMatch(/situatie lipsește/);
    const g = buildFinding(unlabeled, T2, ctx, v.dovezi, []);
    expect(g.sugestii.map((s, i) => suggestionSituation(s, i, g.sugestii.length))).toEqual(["Varianta 1", "Varianta 2", "Varianta 3"]);
  });

  it("acceptă și forma veche, cu o singură `sugestie`", () => {
    const ctx = context();
    const input = errorReport(ctx, { sugestie: fix });
    expect(input.sugestii).toEqual([]);
    const v = validateReport(input, ctx, T1);
    expect(v.suggestionErrors).toEqual([]);
    const f = buildFinding(input, T1, ctx, v.dovezi, v.errors);
    expect(f.status).toBe("eroare_citare");
    expect(f.sugestii).toEqual([{ tip: "inlocuire", textOriginal: "500 lei", textPropus: "200 lei", motiv: fix.motiv, impact: [] }]);
    expect(f.sugestie).toEqual(f.sugestii[0]);
  });

  it("„corect” nu are sugestii", () => {
    const ctx = context();
    const input = report({
      trimitere_id: "T1",
      verdict_la_data: { status: "corect", rezumat: "ok" },
      dovezi: [{ evidence_id: ctx.evidenceId, fragment: "nu poate fi mai mic de 200 lei" }],
      sugestii: [fix],
    });
    const v = validateReport(input, ctx, T1);
    expect(v.suggestionErrors).toEqual([]);
    expect(buildFinding(input, T1, ctx, v.dovezi, v.errors).sugestii).toEqual([]);
  });
});

// ───────────────────────── reîncercarea, prin agent ─────────────────────────

const ok: ClaudeResult = { subtype: "success", isError: false, text: "", structured: null, stopReason: "end_turn", apiErrorStatus: null, costUsd: 0 };

/** „Modelul”: trimite rapoartele date, în ordine, și păstrează răspunsurile instrumentului. */
function scriptedAi(reports: Record<string, unknown>[], replies: { isError?: boolean; content: string }[]): AiClient {
  return {
    run: async () => ok,
    async start(opts) {
      const tool = (opts.tools ?? []).find((t: CliTool) => t.name === "raporteaza_constatare")!;
      return {
        async send() {
          for (const r of reports.splice(0)) replies.push(await tool.run(r));
          return ok;
        },
        stop() {},
        async close() {},
      };
    },
  };
}

async function runGroup(reports: Record<string, unknown>[]) {
  const ctx = context();
  const replies: { isError?: boolean; content: string }[] = [];
  const findings = await verifyGroup(
    { cheie: "lege|31|1990", eticheta: "Legea nr. 31/1990", references: [T1] },
    {
      segments,
      dataReferinta: DATA,
      dataAzi: DATA,
      store: ctx.store,
      sources: registry,
      scope: new RunScope(),
      usage: new UsageTracker(),
      ai: scriptedAi(reports.map((r) => ({ ...r, dovezi: [{ evidence_id: ctx.evidenceId, fragment: "nu poate fi mai mic de 200 lei" }] })), replies),
      onActivity: () => {},
      onFinding: () => {},
    },
  );
  return { findings, replies };
}

const raw = (extra: Record<string, unknown> = {}) => ({
  trimitere_id: "T1",
  categorie: "valoare_gresita",
  titlu: "Valoare greșită",
  explicatie: "Legea prevede 200 lei.",
  act_id: null,
  unitate: null,
  verdict_la_data: { status: "eroare_citare", rezumat: "200 lei" },
  verdict_astazi: null,
  ipoteze: [],
  exceptii: [],
  informatii_lipsa: [],
  motiv_neverificare: null,
  tip_neverificare: null,
  evenimente: [],
  sugestii: [],
  ...extra,
});

describe("reîncercarea pentru sugestii lipsă", () => {
  it("respinge raportul fără sugestie, apoi îl acceptă corectat", async () => {
    const { findings, replies } = await runGroup([raw(), raw({ sugestii: [fix] })]);
    expect(replies[0].isError).toBe(true);
    expect(replies[0].content).toMatch(/NU a fost înregistrată/);
    expect(replies[0].content).toMatch(/necesită cel puțin o sugestie validă/);
    expect(replies[1].isError).toBeFalsy();
    expect(findings[0].sugestii).toHaveLength(1);
    expect(findings[0].sugestiiLipsa).toBeUndefined();
  });

  it("după reîncercări păstrează constatarea (fără retrogradare) și marchează sugestia lipsă", async () => {
    const { findings, replies } = await runGroup([raw(), raw(), raw({ sugestii: [{ ...fix, text_original: "inventat" }] })]);
    expect(replies.map((r) => Boolean(r.isError))).toEqual([true, true, false]);
    expect(replies[2].content).toMatch(/fără sugestie validă/);
    const f = findings[0];
    expect(f.status).toBe("eroare_citare");
    expect(f.retrogradat).toBeUndefined();
    expect(f.sugestii).toEqual([]);
    expect(f.sugestiiLipsa).toBe(true);
  });
});

// ───────────────────────── rezultatele vechi și ignorările ─────────────────────────

function finding(id: string, status: Finding["status"], citat: string, extra: Partial<Finding> = {}): Finding {
  return {
    id,
    referenceId: id,
    citat,
    anchors: [{ segmentId: "p_1", start: 0, end: 3, potrivire: "exacta" }],
    tipTrimitere: "explicita",
    afirmatie: citat,
    status,
    titlu: id,
    explicatie: "",
    verdictLaData: { status, data: DATA, rezumat: "" },
    sugestii: [],
    dovezi: [],
    ...extra,
  };
}

describe("rezultatele salvate înainte de variante", () => {
  it("normalizează `sugestie` în `sugestii` (idempotent)", () => {
    const old = { ...finding("F-T1", "eroare_citare", "art. 7"), sugestie: { tip: "inlocuire", textOriginal: "art. 7", textPropus: "art. 8", motiv: "m" } } as unknown as Finding;
    delete (old as Partial<Finding>).sugestii;
    const n = normalizeFinding(old);
    expect(n.sugestii).toEqual([{ tip: "inlocuire", textOriginal: "art. 7", textPropus: "art. 8", motiv: "m", impact: [] }]);
    expect(n.sugestie).toEqual(n.sugestii[0]);
    expect(normalizeFinding(n)).toEqual(n);
    expect(suggestionsOf(old)).toHaveLength(1);

    const none = finding("F-T2", "corect", "x");
    delete (none as Partial<Finding>).sugestii;
    const r = normalizeResult({ findings: [old, none] });
    expect(r.findings.map((f) => f.sugestii.length)).toEqual([1, 0]);
    expect("sugestie" in r.findings[1]).toBe(false);
  });
});

describe("constatările ignorate, după semnătură", () => {
  // aceeași trimitere în două analize: alte id-uri, citat cu alte spații/diacritice/punctuație finală
  const first = [finding("F-T1", "eroare_citare", "Prin înregistrarea la organul fiscal contractul constituie titlu executoriu.", { categorie: "aplicare_gresita" })];
  const second = [
    finding("F-T7", "eroare_citare", "Prin inregistrarea la  organul fiscal contractul constituie titlu executoriu", { categorie: "aplicare_gresita" }),
    finding("F-T8", "interpretare_discutabila", "Prin înregistrarea la organul fiscal contractul constituie titlu executoriu.", { categorie: "conditii_omise" }),
    finding("F-T9", "corect", "Alt pasaj."),
  ];

  it("rămâne ignorat în analizele noi, cu alte id-uri și chiar dacă modelul schimbă categoria", () => {
    const ignored = new Set([findingSignature(first[0])]);
    const { visible, ignored: hidden } = partitionIgnored(second, ignored);
    expect(hidden.map((f) => f.id)).toEqual(["F-T7", "F-T8"]);
    expect(visible.map((f) => f.id)).toEqual(["F-T9"]);
  });

  it("acceptă semnăturile salvate în formatul vechi (citat␟categorie)", () => {
    expect(canonicalSignature(`${findingSignature(first[0])}\u241faplicare_gresita`)).toBe(findingSignature(first[0]));
  });

  it("numărătorile și raportul exclud constatările ignorate", () => {
    const ignored = new Set([findingSignature(first[0])]);
    expect(countVisibleByStatus(second, ignored)).toMatchObject({ eroare_citare: 0, interpretare_discutabila: 0, corect: 1 });
    expect(countVisibleByStatus(second)).toMatchObject({ eroare_citare: 1 });
    const result = {
      findings: second,
      coverage: { trimiteriGasite: 3, explicite: 3, implicite: 0, eroriConfirmate: 1, interpretariDiscutabile: 1, corecte: 1, segmenteTotal: 9 },
    } as unknown as AnalysisResult;
    const out = withoutIgnored(result, ignored);
    expect(out.ignorate).toBe(2);
    expect(out.result.findings.map((f) => f.id)).toEqual(["F-T9"]);
    expect(out.result.coverage).toMatchObject({ trimiteriGasite: 1, eroriConfirmate: 0, interpretariDiscutabile: 0, corecte: 1, segmenteTotal: 9 });
  });
});
