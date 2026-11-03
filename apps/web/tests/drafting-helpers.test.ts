import { describe, expect, it } from "vitest";
import {
  evidenceActShort,
  evidenceSourceLine,
  groupByState,
  shortClause,
  shortNorm,
  fillProgress,
  groundHighlights,
  groundIndexFromKey,
  groundKey,
  groundState,
  groupGrounds,
  placeholderContext,
  sourceName,
  summaryLine,
  worstState,
  NO_CLAUSE,
} from "../src/features/drafting/grounds";
import { actKey, fmtElapsed, initialProgress, isDraftSkeleton, parseReadActivity, progressReducer, stepsOf, type DraftingProgress, type JobEventMessage } from "../src/features/drafting/progress";
import { generationPending, type DraftInfo, type GroundRecord, type JobStatus } from "../src/features/drafting/types";

const ev = (seq: number | null, type: string, payload: unknown): JobEventMessage => ({ seq, type, payload });
const run = (events: JobEventMessage[], from: DraftingProgress = initialProgress) => events.reduce(progressReducer, from);

// evenimentele unei rulări reale (job_mvy14ocua5KlV7Hk), prescurtate
const REAL: JobEventMessage[] = [
  ev(1, "stare", { status: "in_curs" }),
  ev(2, "etapa", { etapa: "cercetare", mesaj: "Cercetez legislația aplicabilă" }),
  ev(3, "plan", { sectiuni: ["Art. 1. Contractul", "Art. 2. Punerea în întârziere", "Art. 3. Termenul"] }),
  ev(4, "consum", { consum: { linii: [], total: {}, sursaPreturi: "", limite: { cinciOre: { procent: 12, resetLa: null }, sapteZile: null, stare: "allowed", actualizatLa: "2026-11-01T16:00:00Z" } } }),
  ev(5, "activitate", { mesaj: "Caut pe Portalul Legislativ: lege nr. 287 /2009 „Codul civil”" }),
  ev(10, "activitate", { mesaj: "Citesc art. 1522 din LEGE nr. 287 din 17 iulie 2009 privind Codul civil (Consolidare 03.05.2026)" }),
  ev(11, "activitate", { mesaj: "Citesc art. 1523 din LEGE nr. 287 din 17 iulie 2009 privind Codul civil (Consolidare 03.05.2026)" }),
  ev(16, "etapa", { etapa: "scriere", mesaj: "Scriu proiectul" }),
  ev(17, "activitate", { mesaj: "Citește art. 1522 din CODUL CIVIL din 17 iulie 2009 (*republicat*) (LEGE nr. 287/2009) (Consolidare 03.05.2026)" }),
  ev(23, "etapa", { etapa: "validare", mesaj: "Verific temeiurile pe textul oficial" }),
  ev(25, "proiect", { versionId: "ver_x", temeiuri: 6, deCompletat: 8 }),
  ev(26, "stare", { status: "finalizat" }),
  ev(null, "sfarsit", { status: "finalizat", eroare: null }),
];

describe("progressReducer", () => {
  it("reconstruiește etapa, planul, activitatea, actele, limitele și proiectul", () => {
    const p = run(REAL);
    expect(p.status).toBe("finalizat");
    expect(p.etapa).toBe("validare");
    expect(p.plan).toHaveLength(3);
    expect(p.activitate.map((a) => a.seq)).toEqual([5, 10, 11, 17]);
    expect(p.limite?.cinciOre?.procent).toBe(12);
    expect(p.proiect).toEqual({ versionId: "ver_x", deCompletat: 8 });
    expect(p.ended).toBe(true);
    expect(p.lastSeq).toBe(26);
  });

  it("unește denumirile diferite ale aceluiași act și păstrează articolele distincte", () => {
    const p = run(REAL);
    expect(p.acte).toHaveLength(1);
    expect(p.acte[0].key).toBe("287/2009");
    expect(p.acte[0].unitati).toEqual(["art. 1522", "art. 1523"]);
    expect(p.acte[0].forma).toBe("Consolidare 03.05.2026");
  });

  it("ignoră evenimentele retrimise (seq deja văzut) fără să schimbe starea", () => {
    const p = run(REAL.slice(0, 6));
    expect(progressReducer(p, REAL[2])).toBe(p);
    expect(progressReducer(p, REAL[5])).toBe(p);
  });

  it("păstrează eroarea la eșec și o șterge la final reușit", () => {
    const failed = run([ev(1, "stare", { status: "in_curs" }), ev(2, "stare", { status: "esuat", eroare: "Agentul nu a predat proiectul." }), ev(null, "sfarsit", { status: "esuat", eroare: null })]);
    expect(failed.status).toBe("esuat");
    expect(failed.eroare).toBe("Agentul nu a predat proiectul.");
    expect(failed.ended).toBe(true);
  });

  it("tolerează payload-uri invalide și tipuri necunoscute", () => {
    const p = run([ev(1, "etapa", { etapa: "altceva" }), ev(2, "plan", null), ev(3, "necunoscut", {}), ev(4, "stare", { status: "x" })]);
    expect(p.etapa).toBeNull();
    expect(p.plan).toEqual([]);
    expect(p.status).toBeNull();
    expect(p.lastSeq).toBe(4);
  });
});

describe("stepsOf", () => {
  it("în cercetare: cercetarea rulează, restul urmează", () => {
    const p = run(REAL.slice(0, 2));
    expect(stepsOf(p, "in_curs").map((s) => s.state)).toEqual(["in_curs", "urmeaza", "urmeaza"]);
  });

  it("în redactare: cercetarea și planul sunt gata", () => {
    const p = run(REAL.slice(0, 8));
    const steps = stepsOf(p, "in_curs");
    expect(steps.map((s) => s.state)).toEqual(["gata", "gata", "in_curs"]);
    expect(steps[0].meta).toBe("1 act cercetat · 2 articole citite");
    expect(steps[1].meta).toBe("3 secțiuni");
  });

  it("finalizat: totul e gata, fără notă de conformitate, cu câmpurile de completat", () => {
    const steps = stepsOf(run(REAL), "finalizat");
    expect(steps.map((s) => s.label)).toEqual(["Cercetare legislativă", "Plan", "Redactare"]);
    expect(steps.every((s) => s.state === "gata")).toBe(true);
    expect(steps[2].meta).toBe("8 câmpuri de completat");
  });

  it("oprit: etapa curentă e marcată „oprit”", () => {
    const p = run(REAL.slice(0, 8));
    expect(stepsOf(p, "anulat")[2].state).toBe("oprit");
  });

  it("în așteptare: nicio etapă pornită", () => {
    expect(stepsOf(initialProgress, "in_asteptare").every((s) => s.state === "urmeaza")).toBe(true);
  });
});

describe("activitate și cronometru", () => {
  it("parseReadActivity ia ultima paranteză ca formă", () => {
    expect(parseReadActivity("Citește art. 1522 din CODUL CIVIL din 17 iulie 2009 (*republicat*) (LEGE nr. 287/2009) (Consolidare 03.05.2026)")).toEqual({
      unitate: "art. 1522",
      act: "CODUL CIVIL din 17 iulie 2009 (*republicat*) (LEGE nr. 287/2009)",
      forma: "Consolidare 03.05.2026",
    });
    expect(parseReadActivity("Caută pe Portalul Legislativ: nr. 287 /2009")).toBeNull();
  });

  it("actKey normalizează numărul și anul", () => {
    expect(actKey("LEGE nr. 287 din 17 iulie 2009 privind Codul civil")).toBe("287/2009");
    expect(actKey("Ordonanța de urgență nr. 34/2014")).toBe("34/2014");
    expect(actKey("Constituția României")).toBe("constitutia romaniei");
  });

  it("fmtElapsed", () => {
    expect(fmtElapsed(0)).toBe("00:00");
    expect(fmtElapsed(65_000)).toBe("01:05");
    expect(fmtElapsed(3_725_000)).toBe("1:02:05");
    expect(fmtElapsed(-5)).toBe("00:00");
  });

  it("isDraftSkeleton recunoaște scheletul din startDrafting", () => {
    expect(isDraftSkeleton({ content: [{ attrs: { segId: "gen_titlu" } }, { attrs: { segId: "gen_status" } }] })).toBe(true);
    expect(isDraftSkeleton({ content: [{ attrs: { segId: "p_1" } }] })).toBe(false);
    expect(isDraftSkeleton(null)).toBe(false);
  });
});

// ───────────────────────── temeiuri ─────────────────────────

function ground(id: string, over: { stare?: "respectat" | "de_completat" | "de_verificat"; tip?: "temei" | "cerinta" | "limita"; clauza?: string | null; text?: string | null; segId?: string | null; erori?: string[] } = {}): GroundRecord {
  return {
    temei: {
      id,
      tip: over.tip ?? "temei",
      clauza: over.clauza === undefined ? `Art. ${id}` : over.clauza,
      text_clauza: over.text === undefined ? `Textul clauzei ${id}` : over.text,
      norma: `art. ${id} din Codul civil`,
      stare: over.stare ?? "respectat",
      explicatie: "Explicație.",
      dovezi: [],
    },
    dovezi: [],
    erori: over.erori ?? [],
    segId: over.segId === undefined ? `p_${id}` : over.segId,
  };
}

describe("starea temeiurilor", () => {
  it("o eroare de validare are prioritate față de starea declarată", () => {
    expect(groundState(ground("1"))).toBe("respectat");
    expect(groundState(ground("1", { stare: "de_verificat" }))).toBe("de_verificat");
    expect(groundState(ground("1", { erori: ["Niciun fragment confirmat"] }))).toBe("nevalidat");
  });

  it("worstState: nevalidat < de verificat < de completat < respectat", () => {
    expect(worstState(["respectat", "de_completat"])).toBe("de_completat");
    expect(worstState(["de_completat", "de_verificat", "respectat"])).toBe("de_verificat");
    expect(worstState(["respectat", "nevalidat"])).toBe("nevalidat");
    expect(worstState([])).toBe("respectat");
  });

  it("evidențierile folosesc culorile analizei și omit temeiurile fără bloc", () => {
    const hl = groundHighlights([
      ground("1"),
      ground("2", { stare: "de_completat" }),
      ground("3", { stare: "de_verificat" }),
      ground("4", { erori: ["x"] }),
      ground("5", { segId: null }),
    ]);
    expect(hl.map((h) => [h.id, h.status])).toEqual([
      ["tm-0", "corect"],
      ["tm-1", "interpretare_discutabila"],
      ["tm-2", "necesita_analiza_umana"],
      ["tm-3", "neverificat"],
    ]);
    expect(hl[0]).toMatchObject({ segId: "p_1", quote: "Textul clauzei 1" });
  });

  it("groundKey ↔ groundIndexFromKey", () => {
    expect(groundIndexFromKey(groundKey(7))).toBe(7);
    expect(groundIndexFromKey("f_123")).toBeNull();
  });

  it("summaryLine numără stările, fără cele goale", () => {
    expect(summaryLine([ground("1"), ground("2"), ground("3", { stare: "de_completat" }), ground("4", { stare: "de_verificat" })])).toBe(
      "4 temeiuri · 2 respectate · 1 de completat · 1 de verificat",
    );
    expect(summaryLine([ground("1")])).toBe("1 temei · 1 respectat");
    expect(summaryLine([ground("1", { erori: ["x"] }), ground("2", { erori: ["y"] })])).toBe("2 temeiuri · 2 nevalidate");
  });
});

describe("groupGrounds", () => {
  const temeiuri = [
    ground("T1", { clauza: "Art. 1 alin. 1.1 și Art. 3 alin. 3.2", segId: "p_c" }),
    ground("T2", { stare: "de_completat", clauza: "Art. 3 alin. 3.1", segId: "p_b" }),
    ground("T3", { segId: null, clauza: null, text: null, tip: "cerinta" }),
    ground("T4", { segId: "p_a", clauza: "Art. 1" }),
    ground("T5", { segId: "p_sters", clauza: "Art. 9" }),
    ground("T6", { stare: "de_verificat", clauza: "Art. 3 alin. 3.2", segId: "p_c" }),
  ];
  const order = ["p_titlu", "p_a", "p_b", "p_c"];

  it("grupează pe bloc, în ordinea documentului; blocurile dispărute, apoi cele fără loc, la final", () => {
    const groups = groupGrounds(temeiuri, order, new Map([["p_c", "3.2. Prezenta notificare constituie punere în întârziere."]]));
    expect(groups.map((g) => g.segId)).toEqual(["p_a", "p_b", "p_c", "p_sters", null]);
    expect(groups.at(-1)?.label).toBe(NO_CLAUSE);
  });

  it("în clauză: cea mai slabă stare întâi; eticheta = cea mai scurtă clauză; extrasul din document", () => {
    const c = groupGrounds(temeiuri, order, new Map([["p_c", "3.2. Prezenta notificare constituie punere în întârziere."]]))[2];
    expect(c.items.map((i) => i.ground.temei.id)).toEqual(["T6", "T1"]);
    expect(c.state).toBe("de_verificat");
    expect(c.label).toBe("Art. 3 alin. 3.2");
    expect(c.excerpt).toBe("3.2. Prezenta notificare constituie punere în întârziere.");
    expect(c.counts).toEqual({ respectat: 1, de_completat: 0, de_verificat: 1, nevalidat: 0 });
    expect(c.items.map((i) => i.key)).toEqual(["tm-5", "tm-0"]);
  });

  it("fără text din document, extrasul vine din text_clauza", () => {
    const g = groupGrounds([ground("1", { text: "x".repeat(200) })], ["p_1"]);
    expect(g[0].excerpt?.length).toBe(140);
    expect(g[0].excerpt?.endsWith("…")).toBe(true);
  });
});

describe("câmpuri de completat și surse", () => {
  const segments = [
    { segId: "h0", text: "NOTIFICARE", kind: "titlu" },
    { segId: "p1", text: "Subsemnatul, CNP [● CNP], domiciliat în [● domiciliul].", kind: "paragraf" },
    { segId: "h1", text: "Art. 3. Termenul acordat", kind: "titlu" },
    { segId: "p2", text: "Debitorul va plăti suma în termen de [● termenul acordat] de la comunicare, în contul [● IBAN și banca Creditorului].", kind: "paragraf" },
  ];

  it("placeholderContext: secțiunea (fără titlul documentului) și textul din jur", () => {
    expect(placeholderContext(segments, "p1", "[● CNP]")).toEqual({ section: null, before: "Subsemnatul, CNP ", after: ", domiciliat în [● domiciliul]." });
    const c = placeholderContext(segments, "p2", "[● termenul acordat]", 20);
    expect(c.section).toBe("Art. 3. Termenul acordat");
    expect(c.before).toBe("…suma în termen de ");
    expect(c.after).toBe(" de la comunicare,…");
    expect(placeholderContext(segments, null, "[● x]")).toEqual({ section: null, before: "", after: "" });
  });

  it("fillProgress numără câmpurile inițiale rezolvate", () => {
    const initial = ["[● CNP]", "[● domiciliul]", "[● termenul acordat]"];
    expect(fillProgress([{ text: "[● CNP]" }, { text: "[● CNP]" }, { text: "[● domiciliul]" }], initial)).toEqual({ remaining: 3, distinct: 2, total: 3, done: 1 });
    expect(fillProgress([], initial)).toEqual({ remaining: 0, distinct: 0, total: 3, done: 3 });
    // textul a rămas în document fără marcaj (ex. tabelul semnăturilor): nu e completat
    expect(fillProgress([], initial, "Ionescu SRL, prin [● CNP]").done).toBe(2);
  });

  it("sourceName după domeniu", () => {
    expect(sourceName("https://legislatie.just.ro/Public/DetaliiDocument/309285#id_artA7204")).toBe("Portal Legislativ");
    expect(sourceName("https://www.ccr.ro/decizia-1")).toBe("Curtea Constituțională");
    expect(sourceName("https://exemplu.ro/x")).toBe("exemplu.ro");
    expect(sourceName("nu e url")).toBe("Sursă");
  });
});

describe("lista de triaj a temeiurilor (08b)", () => {
  it("groupByState: grupuri pe stare, fără grupuri goale, în ordinea documentului", () => {
    const list = [
      ground("A", { segId: "p_c" }),
      ground("B", { stare: "de_completat", segId: "p_b" }),
      ground("C", { stare: "de_completat", segId: "p_a" }),
      ground("D", { erori: ["x"], segId: null }),
      ground("E", { stare: "de_completat", segId: null }),
    ];
    const g = groupByState(list, ["p_a", "p_b", "p_c"]);
    expect(g.map((x) => [x.state, x.items.map((i) => i.ground.temei.id)])).toEqual([
      ["nevalidat", ["D"]],
      ["de_completat", ["C", "B", "E"]],
      ["respectat", ["A"]],
    ]);
    expect(g[1].items[0].key).toBe("tm-2");
  });

  it("shortClause: „Art. 7 alin. 7.2” → „Art. 7.2”", () => {
    expect(shortClause("Art. 7 alin. 7.2")).toBe("Art. 7.2");
    expect(shortClause("Art. 4 alin. (2)")).toBe("Art. 4(2)");
    expect(shortClause("Articolul 3")).toBe("Art. 3");
    expect(shortClause("Preambul")).toBe("Preambul");
    expect(shortClause(null, "§ 4")).toBe("§ 4");
  });

  it("shortNorm abreviază actele", () => {
    expect(shortNorm("art. 453 alin. (1) și art. 451 alin. (1) Cod procedură civilă")).toBe("art. 453 alin. (1) și art. 451 alin. (1) C. proc. civ.");
    expect(shortNorm("art. 1.522 din Codul civil")).toBe("art. 1.522 C. civ.");
    expect(shortNorm("art. 7 din Legea nr. 31/1990, republicată")).toBe("art. 7 L. 31/1990, republicată");
    expect(shortNorm("art. 3 din Ordonanța de urgență a Guvernului nr. 195/2002")).toBe("art. 3 OUG 195/2002");
  });

  it("linia sursei: actul doar dacă diferă de normă, plus forma", () => {
    const ev = (titlu: string) => ({
      evidence: { id: "E1", sourceId: "legislatie", type: "text_articol" as const, act: { baseId: 1, titlu }, unitate: "art. 453", text: "", url: "https://legislatie.just.ro/x", accesatLa: "", versiune: { id: 2, data: "2025-12-14", tip: "consolidare" as const, eticheta: "Consolidare" } },
    });
    const cpc = ev("CODUL DE PROCEDURĂ CIVILĂ din 1 iulie 2010 (republicat) (Legea nr. 134/2010 republicată)");
    expect(evidenceActShort(cpc)).toBe("C. proc. civ.");
    expect(evidenceSourceLine(cpc, "art. 453 alin. (1) Cod procedură civilă", (d) => d.split("-").reverse().join("."))).toBe("Portal Legislativ · forma din 14.12.2025");
    const civ = ev("CODUL CIVIL din 17 iulie 2009 (republicat)");
    expect(evidenceSourceLine(civ, "art. 453 alin. (1) Cod procedură civilă", (d) => d)).toBe("CODUL CIVIL din 17 iulie 2009 (republicat), art. 453 · Portal Legislativ · forma din 2025-12-14");
    expect(evidenceActShort(ev("LEGE nr. 31 din 16 noiembrie 1990"))).toBe("L. 31/1990");
  });
});

describe("pagina de generare: când nu se deschide încă editorul", () => {
  const info = (status: JobStatus | null, conformitate: DraftInfo["conformitate"] = null): DraftInfo => ({
    draftId: "d",
    documentId: "doc",
    projectId: "p",
    tip: "altul",
    dataLegii: null,
    job: status ? { id: "j", status, error: null, createdAt: 1, startedAt: 1, finishedAt: null } : null,
    conformitate,
  });
  const nota = { temeiuri: [], neacoperite: [], deCompletat: [] } as unknown as DraftInfo["conformitate"];

  it("jobul rulează sau s-a oprit fără rezultat → pagina de generare", () => {
    expect(generationPending(info("in_asteptare"))).toBe(true);
    expect(generationPending(info("in_curs"))).toBe(true);
    expect(generationPending(info("esuat"))).toBe(true);
    expect(generationPending(info("anulat"))).toBe(true);
  });

  it("proiectul e gata, sau documentul nu e generat → editorul", () => {
    expect(generationPending(info("finalizat"))).toBe(false);
    expect(generationPending(info("intrerupt", nota))).toBe(false);
    expect(generationPending(info(null))).toBe(false);
    expect(generationPending(null)).toBe(false);
  });
});
