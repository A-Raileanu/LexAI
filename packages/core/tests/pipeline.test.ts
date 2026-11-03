import type { ClaudeResult, CliTool, InputBlock } from "@lexai/ai";
import { SourceRegistry, urlInDomains, type CitesteArticolResult, type LegalSource } from "@lexai/sources";
import { describe, expect, it } from "vitest";
import type { AiClient, ClaudeOptions } from "../src/ai";
import { resumeFrom, runAnalysis } from "../src/analysis/pipeline";
import { segmentsFromDoc } from "../src/document/segments";
import type { DocNode, TiptapDoc } from "../src/document/types";
import type { DocSegment, LegalReference, ProgressEvent } from "../src/types";

/**
 * Pipeline-ul complet, fără rețea și fără Claude: o sursă simulată și un „model” scriptat care
 * apelează instrumentele primite (exact ca agentul real, prin `tools[].run`).
 */

const DATA = "2026-11-01";

const fakePortal: LegalSource = {
  id: "fake-portal",
  label: "Portal simulat",
  description: "Portalul simulat (fake.ro)",
  capabilities: new Set(["cauta_act", "info_act", "citeste_articol"]),
  trustsUrl: (u) => urlInDomains(u, ["fake.ro"]),
  async cautaAct(p) {
    if (p.numar !== "31") {
      return { total: 0, url: "https://fake.ro/cautare", accesatLa: "", rezultate: [], dovada: { type: "act_negasit", text: "Niciun act.", url: "https://fake.ro/cautare", accesatLa: "" } };
    }
    return {
      total: 1,
      url: "https://fake.ro/cautare",
      accesatLa: "2026-11-01T08:00:00Z",
      rezultate: [{ actId: 798, eticheta: "LEGE 31 16/11/1990", titlu: "LEGE nr. 31 din 16 noiembrie 1990", descriere: "privind societățile", emitent: "PARLAMENTUL", publicat: "MO", intrareInVigoare: "1990-11-17", intrareInVigoareText: "17 noiembrie 1990", republicare: false }],
    };
  },
  async infoAct(p) {
    const act = { baseId: p.actId, titlu: "LEGE nr. 31 din 16 noiembrie 1990" };
    return { act, fisa: { type: "fisa_act", act, text: "Act: LEGE nr. 31/1990\nForma aplicabilă: consolidare", url: "https://fake.ro/act/798", accesatLa: "", dataReferinta: p.data } };
  },
  async citesteArticol(p): Promise<CitesteArticolResult> {
    const text = `Articolul ${p.articol}\n(1) Capitalul social al unei societăți cu răspundere limitată nu poate fi mai mic de 200 lei.`;
    return {
      gasit: true,
      abrogat: false,
      text,
      actiuniPeArticol: [],
      dovada: {
        type: "text_articol",
        act: { baseId: p.actId, titlu: "LEGE nr. 31 din 16 noiembrie 1990" },
        versiune: { id: 304533, data: "2025-12-18", tip: "consolidare", eticheta: "Consolidare 18.12.2025" },
        unitate: `art. ${p.articol}`,
        text,
        url: `https://fake.ro/act/304533#art${p.articol}`,
        accesatLa: "2026-11-01T08:00:00Z",
        dataReferinta: p.data,
      },
    };
  },
};

const fakeWeb: LegalSource = {
  id: "fake-web",
  label: "Web simulat",
  capabilities: new Set(["citeste_pagina"]),
  trustsUrl: (u) => urlInDomains(u, ["oficial.ro"]),
  async citestePagina(p) {
    return { url: p.url, titlu: "Codul civil", dovada: { type: "sursa_web", text: "Art. 2517. Termenul prescripției este de 3 ani.", url: p.url, accesatLa: "", unitate: "Codul civil" } };
  },
};

const ref = (segment: string, citat: string, act: LegalReference["act"], unitate: string | null) => ({ segment_id: segment, citat, tip: "explicita", act, unitate, afirmatie: citat });

/** Trimiterile pe care „modelul” le găsește în fiecare segment. */
const REFS: Record<string, ReturnType<typeof ref>[]> = {
  p_1: [ref("p_1", "art. 11 alin. (1) din Legea nr. 31/1990", { tip: "lege", numar: "31", an: "1990", denumire: null }, "art. 11 alin. (1)")],
  p_2: [ref("p_2", "art. 11 alin. (1) din Legea nr. 31/1990", { tip: "lege", numar: "31", an: "1990", denumire: null }, "art. 11 alin. (1)")],
  p_3: [ref("p_3", "art. 2517 din Codul civil", { tip: "cod", numar: null, an: null, denumire: "Codul civil" }, "art. 2517")],
};

const usage = { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
const ok = (structured: unknown = null): ClaudeResult => ({ subtype: "success", isError: false, text: "", structured, stopReason: "end_turn", apiErrorStatus: null, costUsd: 0 });
const textOf = (c: string | InputBlock[]) => (typeof c === "string" ? c : c.map((b) => ("text" in b ? b.text : "")).join("\n"));

interface Log {
  identifyInputs: string[];
  systems: string[];
  tools: string[][];
  builtin: string[][];
}

function fakeAi(log: Log): AiClient {
  return {
    async run(opts: ClaudeOptions, content) {
      const text = textOf(content);
      log.identifyInputs.push(text);
      opts.onMessage?.({ id: `m${log.identifyInputs.length}`, model: opts.model, content: [], usage, stopReason: "end_turn" });
      const lines = [...text.matchAll(/^\[([^\]]+)\](?: \([^)]*\))? (.*)$/gm)];
      return ok({ data_document: null, trimiteri: lines.flatMap(([, id, line]) => (REFS[id] ?? []).filter((r) => line.includes(r.citat))) });
    },
    async start(opts: ClaudeOptions) {
      const tools = new Map((opts.tools ?? []).map((t: CliTool) => [t.name, t]));
      log.systems.push(opts.system);
      log.tools.push([...tools.keys()]);
      log.builtin.push(opts.builtinTools ?? []);
      const web = opts.system.includes("A doua verificare: căutare pe web");
      return {
        async send(content) {
          const text = textOf(content);
          opts.onMessage?.({ id: crypto.randomUUID(), model: opts.model, content: [], usage, stopReason: "tool_use" });
          const prepared = text.match(/"evidence_id":"(E\d+)","gasit":true/)?.[1];
          for (const [, id, seg] of text.matchAll(/- trimitere_id: (T\d+)\n {2}segment: (\S+)/g)) {
            const base = {
              trimitere_id: id, categorie: null, act_id: null, unitate: null, verdict_astazi: null,
              ipoteze: [], exceptii: [], informatii_lipsa: [], evenimente: [], sugestie: null,
            };
            let report: Record<string, unknown>;
            if (web) {
              const page = JSON.parse((await tools.get("web_fetch")!.run({ url: "https://www.oficial.ro/cod-civil" })).content);
              // „corect” cere textul normei citit dintr-o sursă structurată; pagina web susține o greșeală constatată
              report = { ...base, titlu: "Termen greșit", explicatie: "Pagina oficială indică alt termen.", verdict_la_data: { status: "eroare_citare", rezumat: "3 ani" }, motiv_neverificare: null, tip_neverificare: null, dovezi: [{ evidence_id: page.url, fragment: "Termenul prescripției este de 3 ani" }], sugestii: [{ tip: "inlocuire", situatie: null, text_original: "art. 2517 din Codul civil", text_propus: "art. 2517 din Codul civil (termenul general de prescripție)", motiv: "m", impact: [] }] };
            } else if (seg !== "p_3" && prepared) {
              await tools.get("cauta_in_document")!.run({ expresie: "capitalul social" });
              report = { ...base, titlu: "Citare corectă", explicatie: "Textul confirmă.", verdict_la_data: { status: "corect", rezumat: "ok" }, motiv_neverificare: null, tip_neverificare: null, dovezi: [{ evidence_id: prepared, fragment: "nu poate fi mai mic de 200 lei" }] };
            } else {
              report = { ...base, titlu: "Sursă negăsită", explicatie: "Codul nu a fost găsit.", verdict_la_data: { status: "neverificat", rezumat: "—" }, motiv_neverificare: "Actul nu a fost găsit în sursă.", tip_neverificare: "sursa_lipsa", dovezi: [] };
            }
            const r = await tools.get("raporteaza_constatare")!.run(report);
            if (r.isError) throw new Error(r.content);
          }
          return ok();
        },
        stop() {},
        async close() {},
      };
    },
  };
}

const para = (segId: string, text: string): DocNode => ({ type: "paragraph", attrs: { segId }, content: [{ type: "text", text }] });
const SENT = "Capitalul social minim este de 200 lei, conform art. 11 alin. (1) din Legea nr. 31/1990.";
const docJson = (p3: string): TiptapDoc => ({
  type: "doc",
  content: [{ type: "heading", attrs: { segId: "h_1", level: 1 }, content: [{ type: "text", text: "CONTRACT" }] }, para("p_1", SENT), para("p_2", SENT), para("p_3", p3)],
});

const newLog = (): Log => ({ identifyInputs: [], systems: [], tools: [], builtin: [] });

describe("pipeline-ul analizei", () => {
  it("identifică, verifică prin sursele active și consolidează, cu evenimentele de progres", async () => {
    const log = newLog();
    const events: ProgressEvent[] = [];
    const segments: DocSegment[] = segmentsFromDoc(docJson("Alt text, fără trimiteri."));
    const r = await runAnalysis({ segments, dataReferinta: DATA, dataAzi: DATA, sources: new SourceRegistry([fakePortal]), emit: (e) => events.push(e), ai: fakeAi(log) });

    const types = events.map((e) => (e.type === "etapa" ? `etapa:${e.etapa}` : e.type));
    for (const t of ["etapa:identificare", "identificare", "trimiteri", "etapa:verificare", "grup_start", "activitate", "constatare", "consum", "grup_final", "etapa:consolidare"]) expect(types).toContain(t);
    expect(types.indexOf("etapa:identificare")).toBeLessThan(types.indexOf("grup_start"));

    // trimiterea duplicată (același context) e verificată o singură dată și preia verdictul
    expect(r.trimiteri?.duplicates).toEqual([["T1", ["T2"]]]);
    expect(r.findings.map((f) => [f.referenceId, f.status, f.preluatDin])).toEqual([
      ["T1", "corect", undefined],
      ["T2", "corect", "F-T1"],
    ]);
    const d = r.findings[0].dovezi[0];
    expect(d).toMatchObject({ validare: "confirmata", evidence: { sourceId: "fake-portal", type: "text_articol" } });
    expect(r.findings[0].anchors[0]).toMatchObject({ segmentId: "p_1", potrivire: "exacta" });
    expect(r.surse).toEqual([expect.objectContaining({ sourceId: "fake-portal", url: "https://fake.ro/act/304533" })]);
    expect(r.surseActive).toEqual([{ id: "fake-portal", label: "Portal simulat" }]);
    expect(r.coverage).toMatchObject({ trimiteriGasite: 2, verificateCuSursa: 2, corecte: 2, segmenteTotal: 4 });
    expect(r.consum?.total.apeluri).toBeGreaterThanOrEqual(2);

    // instrumentele și promptul vin din capabilitățile sursei active
    expect(log.tools[0]).toEqual(["cauta_act", "info_act", "citeste_articol", "cauta_in_document", "citeste_segment", "raporteaza_constatare"]);
    expect(log.systems[0]).toContain("folosind EXCLUSIV textul oficial de pe Portalul simulat (fake.ro)");
    expect(log.systems[0]).toContain("- citeste_articol:");
    expect(log.systems[0]).not.toContain("- cauta_in_act:");
    expect(log.builtin[0]).toEqual([]);
  });

  it("recuperează pe web trimiterile cu sursă lipsă, dacă o sursă activă citește pagini", async () => {
    const log = newLog();
    const events: ProgressEvent[] = [];
    const segments = segmentsFromDoc(docJson("Prescripția este de 3 ani, conform art. 2517 din Codul civil."));
    const r = await runAnalysis({ segments, dataReferinta: DATA, dataAzi: DATA, sources: new SourceRegistry([fakePortal, fakeWeb]), emit: (e) => events.push(e), ai: fakeAi(log) });

    const t3 = r.findings.find((f) => f.referenceId === "T3")!;
    expect(t3.status).toBe("eroare_citare");
    expect(t3.dovezi[0]).toMatchObject({ validare: "confirmata", evidence: { type: "sursa_web", sourceId: "fake-web" } });
    expect(r.coverage.verificateCuWeb).toBe(1);
    expect(events.some((e) => e.type === "etapa" && e.mesaj === "Recuperez 1 trimiteri neverificate")).toBe(true);
    // prima trecere fără web_fetch; recuperarea cu web_fetch și WebSearch
    expect(log.tools[0]).not.toContain("web_fetch");
    expect(log.tools.at(-1)).toContain("web_fetch");
    expect(log.builtin.at(-1)).toEqual(["WebSearch"]);
  });

  it("reverifică doar paragrafele cerute, păstrând rezultatele celorlalte", async () => {
    const sources = new SourceRegistry([fakePortal]);
    const first = await runAnalysis({ segments: segmentsFromDoc(docJson("Alt text.")), dataReferinta: DATA, dataAzi: DATA, sources, emit: () => {}, ai: fakeAi(newLog()) });

    const log = newLog();
    const segments = segmentsFromDoc(docJson("Prescripția este de 3 ani, conform art. 2517 din Codul civil."));
    const r = await runAnalysis({
      segments,
      dataReferinta: DATA,
      dataAzi: DATA,
      sources,
      emit: () => {},
      ai: fakeAi(log),
      reluare: resumeFrom(first)!,
      recheckSegmentIds: ["p_3", "inexistent"],
    });
    // identificarea vede doar paragraful modificat
    expect(log.identifyInputs).toHaveLength(1);
    expect(log.identifyInputs[0]).toContain("[p_3]");
    expect(log.identifyInputs[0]).not.toContain("[p_1]");
    expect(r.segmenteVerificate).toEqual(["p_3"]);
    expect(r.id).toBe(first.id);
    // numerotarea continuă; rezultatele vechi rămân
    expect(r.trimiteri?.references.map((x) => x.id)).toEqual(["T1", "T2", "T3"]);
    expect(r.findings.map((f) => [f.referenceId, f.status])).toEqual([
      ["T1", "corect"],
      ["T2", "corect"],
      ["T3", "neverificat"],
    ]);
    expect(r.findings[2].tipNeverificare).toBe("sursa_lipsa");
  });

  it("reia doar verificările rămase neterminate", async () => {
    const sources = new SourceRegistry([fakePortal]);
    const first = await runAnalysis({ segments: segmentsFromDoc(docJson("Alt text.")), dataReferinta: DATA, dataAzi: DATA, sources, emit: () => {}, ai: fakeAi(newLog()) });
    const stopped = { ...first, findings: first.findings.map((f) => ({ ...f, status: "neverificat" as const, tipNeverificare: "limita_atinsa" as const, dovezi: [] })) };
    const log = newLog();
    const r = await runAnalysis({ segments: segmentsFromDoc(docJson("Alt text.")), dataReferinta: DATA, dataAzi: DATA, sources, emit: () => {}, ai: fakeAi(log), reluare: resumeFrom(stopped)! });
    expect(log.identifyInputs).toHaveLength(0);
    expect(r.findings.map((f) => [f.referenceId, f.status])).toEqual([
      ["T1", "corect"],
      ["T2", "corect"],
    ]);
  });

  it("marchează trimiterile neverificate când nicio sursă nu e activă", async () => {
    const log = newLog();
    const r = await runAnalysis({ segments: segmentsFromDoc(docJson("Alt text.")), dataReferinta: DATA, dataAzi: DATA, sources: new SourceRegistry(), emit: () => {}, ai: fakeAi(log) });
    expect(log.tools[0]).toEqual(["cauta_in_document", "citeste_segment", "raporteaza_constatare"]);
    expect(r.avertismente).toContain("Nicio sursă de legislație nu este activă: trimiterile nu au putut fi verificate.");
    expect(r.findings.every((f) => f.status === "neverificat")).toBe(true);
  });
});
