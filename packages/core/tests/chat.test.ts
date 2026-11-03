import { describe, expect, it } from "vitest";
import { documentLayout, type TiptapDoc } from "../src/document";
import {
  blocksToNodes,
  checkBlock,
  describeBlocks,
  hasInlineFormat,
  locateProposal,
  plainInline,
  occurrences,
  parseInline,
  scopePreview,
  sortProposals,
  validateChanges,
  type BlocksProposal,
  type FormatProposal,
  type ChatBlock,
  type ChatScope,
  type InsertProposal,
  type ProposedChange,
  type TextProposal,
} from "../src/chat";

const segments = [
  { id: "p1", text: "Locatarul plătește chiria de 1.000 lei până la data de 5 a fiecărei luni." },
  { id: "p2", text: "Contractul se reziliază de drept dacă chiria nu e plătită 30 de zile. Chiria se indexează anual." },
  { id: "p3", text: "Preavizul este de 15 zile." },
];
const ch = (segment_id: string, text_original: string, text_nou: string, explicatie = "motiv"): ProposedChange => ({ segment_id, text_original, text_nou, explicatie });

describe("validarea modificărilor propuse în chat", () => {
  it("acceptă textul copiat exact și reține poziția lui în segment", () => {
    const r = validateChanges([ch("p1", "1.000 lei", "1.200 lei"), ch("p3", "15 zile", "30 de zile")], segments);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.proposals).toEqual([
      { kind: "text", id: "m1", segmentId: "p1", start: 29, textOriginal: "1.000 lei", textNou: "1.200 lei", explicatie: "motiv", status: "propusa" },
      { kind: "text", id: "m2", segmentId: "p3", start: 18, textOriginal: "15 zile", textNou: "30 de zile", explicatie: "motiv", status: "propusa" },
    ]);
    expect(segments[0].text.slice(29, 38)).toBe("1.000 lei");
  });

  it("respinge textul care nu e exact (diacritice, majuscule) și spune de ce", () => {
    const r = validateChanges([ch("p1", "locatarul plateste", "Chiriașul plătește"), ch("p1", "nu există", "x"), ch("p9", "a", "b")], segments);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toMatch(/nu se potrivește exact/);
    expect(r.errors[1]).toMatch(/nu apare în segment/);
    expect(r.errors[2]).toMatch(/segmentul nu există/);
  });

  it("cere context când pasajul apare de mai multe ori", () => {
    const r = validateChanges([ch("p2", "hiria", "hiria lunară")], segments);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/apare de 2 ori/);
  });

  it("respinge modificările care se suprapun în același segment", () => {
    const r = validateChanges([ch("p2", "se reziliază de drept", "încetează"), ch("p2", "de drept dacă", "de plin drept dacă"), ch("p2", "anual", "lunar")], segments);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toEqual(["Modificările 1 și 2 se suprapun în segmentul p2; combină-le într-o singură modificare."]);
  });

  it("refuză rândurile noi, textul gol și modificările care nu schimbă nimic", () => {
    const r = validateChanges([ch("p3", "15 zile", "15 zile"), ch("p3", " ", "x"), ch("p3", "15 zile", "15\nzile")], segments);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toMatch(/identic/);
    expect(r.errors[1]).toMatch(/text_original e gol/);
    expect(r.errors[2]).toMatch(/rânduri sau paragrafe noi/);
  });

  it("permite răspunsurile fără modificări", () => {
    expect(validateChanges([], segments)).toEqual({ ok: true, proposals: [] });
  });

  describe("cu text selectat", () => {
    // selectat: „dacă chiria nu e plătită 30 de zile” din p2
    const text = segments[1].text;
    const start = text.indexOf("dacă");
    const scope: ChatScope = { segments: [{ segmentId: "p2", start, end: text.indexOf(". Chiria") }], text: "dacă chiria nu e plătită 30 de zile" };

    it("acceptă modificările din interiorul selecției", () => {
      const r = validateChanges([ch("p2", "30 de zile", "60 de zile")], segments, scope);
      expect(r.ok).toBe(true);
    });

    it("respinge modificările din alte paragrafe sau din afara selecției", () => {
      const r = validateChanges([ch("p3", "15 zile", "30 de zile"), ch("p2", "anual", "lunar"), ch("p2", "de drept dacă", "de plin drept dacă")], segments, scope);
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.errors[0]).toMatch(/nu face parte din textul selectat/);
      expect(r.errors[1]).toMatch(/nu este în întregime în textul selectat/);
      expect(r.errors[2]).toMatch(/nu este în întregime în textul selectat/);
    });

    it("dezambiguizează după selecție: contează doar aparițiile din ea", () => {
      // „hiria” apare de două ori în p2, dar o singură dată în selecție
      const r = validateChanges([ch("p2", "hiria", "hiria lunară")], segments, scope);
      expect(r.ok).toBe(true);
      if (r.ok) expect((r.proposals[0] as TextProposal).start).toBe(text.indexOf("hiria", start));
    });
  });
});

describe("localizarea propunerii la aplicare", () => {
  const p = { start: 29, textOriginal: "1.000 lei" };
  it("folosește poziția din propunere, apoi singura apariție", () => {
    expect(locateProposal(segments[0].text, p)).toBe(29);
    expect(locateProposal(`Notă. ${segments[0].text}`, p)).toBe(35);
  });
  it("refuză când pasajul a dispărut sau a devenit ambiguu", () => {
    expect(locateProposal("Locatarul plătește chiria de 1.200 lei.", p)).toBeNull();
    expect(locateProposal("1.000 lei sau 1.000 lei", { start: 3, textOriginal: "1.000 lei" })).toBeNull();
  });
  it("utilitare", () => {
    expect(occurrences("aaa", "aa")).toEqual([0, 1]);
    expect(scopePreview({ text: "unu\ndoi   trei" })).toBe("unu doi trei");
    expect(scopePreview({ text: "x".repeat(80) }, 10)).toBe("xxxxxxxxx…");
  });
});

// ───────────────────────── modificări structurale ─────────────────────────

const para = (segId: string, text: string) => ({ type: "paragraph", attrs: { segId }, content: [{ type: "text", text }] });
/** Un contract cu un calendar (Art. 9) pe paragrafe, o listă, un tabel și un salt de pagină. */
const contract: TiptapDoc = {
  type: "doc",
  content: [
    para("t", "CONTRACT DE PRESTĂRI SERVICII"), // 0
    para("a3", "Art. 3. Prețul este de 10.000 lei."), // 1
    para("a4", "Art. 4. Prestatorul execută serviciile cu diligență."), // 2
    para("a9", "Art. 9. Calendarul de implementare:"), // 3
    para("c1", "Etapa 1 – analiză: 1–15 martie;"), // 4
    para("c2", "Etapa 2 – dezvoltare: 16 martie – 30 aprilie;"), // 5
    para("c3", "Etapa 3 – recepție: 1–10 mai."), // 6
    { type: "bulletList", content: [{ type: "listItem", content: [para("l1", "obligația A")] }, { type: "listItem", content: [para("l2", "obligația B")] }] }, // 7
    { type: "table", content: [{ type: "tableRow", content: [{ type: "tableCell", content: [para("x1", "Celula 1")] }, { type: "tableCell", content: [para("x2", "Celula 2")] }] }] }, // 8
    { type: "pageBreak" }, // 9
    para("an", "ANEXA 1"), // 10
    para("fin", "Semnături"), // 11
  ],
};
const layout = documentLayout(contract);
const lsegs = layout.segments;
const opts = { pageBreaks: layout.pageBreaks, blocks: layout.blocks };
const v = (changes: ProposedChange[], scope?: ChatScope | null) => validateChanges(changes, lsegs, scope, opts);
const table: ProposedChange["blocuri"] = [{ tip: "tabel", antet: ["Etapa", "Perioada"], randuri: [["Analiză", "1–15 martie"], ["Dezvoltare", "16 martie – 30 aprilie"], ["Recepție", "1–10 mai"]] }];

describe("structura documentului pentru chat", () => {
  it("dă blocul de nivel superior al fiecărui segment și salturile de pagină", () => {
    expect(lsegs.map((s) => [s.id, s.top, s.container])).toEqual([
      ["t", 0, null],
      ["a3", 1, null],
      ["a4", 2, null],
      ["a9", 3, null],
      ["c1", 4, null],
      ["c2", 5, null],
      ["c3", 6, null],
      ["l1", 7, "lista"],
      ["l2", 7, "lista"],
      ["x1", 8, "tabel"],
      ["x2", 8, "tabel"],
      ["an", 10, null],
      ["fin", 11, null],
    ]);
    expect(layout.pageBreaks).toEqual([9]);
    expect(layout.blocks).toBe(12);
  });
});

describe("validarea modificărilor structurale", () => {
  it("acceptă calendarul refăcut ca tabel și reține textul paragrafelor înlocuite", () => {
    const r = v([{ tip: "inlocuire_blocuri", segmente: ["c1", "c2", "c3"], text_original: "Etapa 1 – analiză", blocuri: table, explicatie: "Calendar ca tabel." }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const p = r.proposals[0] as BlocksProposal;
    expect(p).toMatchObject({ kind: "inlocuire_blocuri", id: "m1", segmentId: "c1", segmentIds: ["c1", "c2", "c3"], status: "propusa" });
    expect(p.textOriginal).toEqual(["Etapa 1 – analiză: 1–15 martie;", "Etapa 2 – dezvoltare: 16 martie – 30 aprilie;", "Etapa 3 – recepție: 1–10 mai."]);
    expect(p.blocuri[0]).toMatchObject({ tip: "tabel", antet: ["Etapa", "Perioada"] });
  });

  it("acceptă o clauză nouă după Art. 4 și o ștergere de paragrafe", () => {
    const r = v([
      { tip: "inserare", segment_id: "a4", pozitie: "dupa", blocuri: [{ tip: "paragraf", text: "Art. 4^1. **Confidențialitate.** Părțile păstrează confidențialitatea." }], explicatie: "x" },
      { tip: "stergere_blocuri", segmente: ["a3"], text_original: "Art. 3.", explicatie: "y" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.proposals.map((p) => p.kind)).toEqual(["stergere_blocuri", "inserare"]);
    expect((r.proposals[1] as InsertProposal).pozitie).toBe("dupa");
  });

  it("detectează textul vechi sau segmentele greșite (document schimbat)", () => {
    const r = v([
      { tip: "inlocuire_blocuri", segmente: ["c1", "c2"], text_original: "Etapa 1 – analiza", blocuri: table, explicatie: "" },
      { tip: "inlocuire_blocuri", segmente: ["c2", "c3"], text_original: "Etapa 1", blocuri: table, explicatie: "" },
      { tip: "inserare", segment_id: "nu_exista", blocuri: [{ tip: "paragraf", text: "x" }] },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toMatch(/nu se potrivește exact/);
    expect(r.errors[1]).toMatch(/nu e începutul primului segment/);
    expect(r.errors[2]).toMatch(/ancoră nu există/);
  });

  it("refuză segmentele neconsecutive și listele / tabelele acoperite parțial", () => {
    const r = v([
      { tip: "inlocuire_blocuri", segmente: ["c1", "c3"], text_original: "Etapa 1", blocuri: table },
      { tip: "stergere_blocuri", segmente: ["l1"], text_original: "obligația A" },
      { tip: "inlocuire_blocuri", segmente: ["x1", "x2"], text_original: "Celula 1", blocuri: [{ tip: "paragraf", text: "Text în loc de tabel." }] },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toMatch(/nu sunt consecutive \(lipsește c2\)/);
    expect(r.errors[1]).toMatch(/include și l2/);
  });

  it("refuză tabelele cu rânduri inegale, prea late, goale și blocurile goale", () => {
    const bad = (blocuri: ProposedChange["blocuri"]) => v([{ tip: "inserare", segment_id: "a4", blocuri }]);
    const errs = [
      bad([{ tip: "tabel", antet: ["A", "B"], randuri: [["1", "2"], ["3"]] }]),
      bad([{ tip: "tabel", antet: Array.from({ length: 13 }, (_, i) => `C${i}`), randuri: [Array.from({ length: 13 }, () => "x")] }]),
      bad([{ tip: "tabel", antet: [], randuri: Array.from({ length: 201 }, () => ["x"]) }]),
      bad([{ tip: "tabel", antet: ["", ""], randuri: [["", ""]] }]),
      bad([{ tip: "paragraf", text: "  " }]),
      bad([]),
      bad([{ tip: "paragraf", text: "**neînchis" }]),
      bad([{ tip: "imagine" }]),
    ].map((r) => (r.ok ? "" : r.errors[0]));
    expect(errs[0]).toMatch(/rândul 2 are 1 celule, dar tabelul are 2 coloane/);
    expect(errs[1]).toMatch(/prea multe coloane/);
    expect(errs[2]).toMatch(/prea multe rânduri/);
    expect(errs[3]).toMatch(/tabelul e gol/);
    expect(errs[4]).toMatch(/textul e gol/);
    expect(errs[5]).toMatch(/lipsesc blocurile/);
    expect(errs[6]).toMatch(/nu sunt pereche/);
    expect(errs[7]).toMatch(/tip de bloc necunoscut/);
  });

  describe("cu text selectat", () => {
    // selecția: de la mijlocul lui c1 până la mijlocul lui c3
    const scope: ChatScope = {
      segments: [
        { segmentId: "c1", start: 10, end: lsegs[4].text.length },
        { segmentId: "c2", start: 0, end: lsegs[5].text.length },
        { segmentId: "c3", start: 0, end: 8 },
      ],
      text: "…",
    };
    it("permite înlocuirea paragrafelor selectate (și parțial selectate) cu un tabel", () => {
      expect(v([{ tip: "inlocuire_blocuri", segmente: ["c1", "c2", "c3"], text_original: "Etapa 1", blocuri: table }], scope).ok).toBe(true);
      expect(v([{ tip: "inserare", segment_id: "c3", pozitie: "dupa", blocuri: [{ tip: "paragraf", text: "Notă." }] }], scope).ok).toBe(true);
    });
    it("refuză paragrafele și ancorele din afara selecției", () => {
      const r = v(
        [
          { tip: "inlocuire_blocuri", segmente: ["a9", "c1", "c2", "c3"], text_original: "Art. 9", blocuri: table },
          { tip: "inserare", segment_id: "a4", blocuri: [{ tip: "paragraf", text: "x" }] },
        ],
        scope,
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.errors[0]).toMatch(/segmentele a9 nu fac parte din textul selectat/);
      expect(r.errors[1]).toMatch(/ancora nu face parte din textul selectat/);
    });
  });

  it("refuză suprapunerile dintre propunerile structurale și cele de text", () => {
    const r = v([
      { tip: "inlocuire_blocuri", segmente: ["c1", "c2", "c3"], text_original: "Etapa 1", blocuri: table },
      { tip: "stergere_blocuri", segmente: ["c3"], text_original: "Etapa 3" },
      { segment_id: "c2", text_original: "30 aprilie", text_nou: "15 mai" },
      { tip: "inserare", segment_id: "c2", blocuri: [{ tip: "paragraf", text: "x" }] },
      { tip: "inserare", segment_id: "a3", pozitie: "dupa", blocuri: [{ tip: "paragraf", text: "x" }] },
      { tip: "inserare", segment_id: "a4", pozitie: "inainte", blocuri: [{ tip: "paragraf", text: "y" }] },
    ]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toEqual([
      "Modificările 1 și 2 înlocuiesc sau șterg aceleași paragrafe (c3); combină-le într-o singură modificare.",
      "Modificarea 3 schimbă textul segmentului c2, pe care modificarea 1 îl înlocuiește sau îl șterge; include schimbarea în blocurile modificării 1.",
      "Modificarea 4 inserează lângă segmentul c2, pe care modificarea 1 îl înlocuiește sau îl șterge; pune blocurile noi în modificarea 1.",
      "Modificările 5 și 6 inserează în același loc; combină blocurile într-o singură inserare.",
    ]);
  });

  it("ordonează mai multe propuneri de feluri diferite după locul din document", () => {
    const r = v([
      { tip: "inlocuire_blocuri", segmente: ["c1", "c2", "c3"], text_original: "Etapa 1", blocuri: table, explicatie: "tabel" },
      { tip: "inserare", segment_id: "a4", pozitie: "dupa", blocuri: [{ tip: "paragraf", text: "Art. 4^1. Confidențialitate." }] },
      { segment_id: "a3", text_original: "10.000 lei", text_nou: "12.000 lei" },
      { tip: "inserare", segment_id: "a3", pozitie: "inainte", blocuri: [{ tip: "titlu", nivel: 2, text: "Capitolul II" }] },
      { segment_id: "a4", text_original: "diligență", text_nou: "diligența unui profesionist" },
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.proposals.map((p) => [p.id, p.kind, p.segmentId])).toEqual([
      ["m1", "inserare", "a3"],
      ["m2", "text", "a3"],
      ["m3", "text", "a4"],
      ["m4", "inserare", "a4"],
      ["m5", "inlocuire_blocuri", "c1"],
    ]);
    // aceeași ordine și pentru propunerile salvate, după indicele segmentelor
    const order = new Map(lsegs.map((s, i) => [s.id, i]));
    expect(sortProposals([...r.proposals].reverse(), order).map((p) => p.id)).toEqual(["m1", "m2", "m3", "m4", "m5"]);
  });

  describe("salturi de pagină", () => {
    const brk = { tip: "salt_pagina" };
    it("acceptă saltul înainte de anexă și o pagină nouă la final", () => {
      const r = v([
        { tip: "inserare", segment_id: "a9", pozitie: "inainte", blocuri: [brk] },
        { tip: "inserare", segment_id: "fin", pozitie: "dupa", blocuri: [brk, { tip: "titlu", nivel: 1, text: "ANEXA 2" }, { tip: "paragraf", text: "Lista echipamentelor." }] },
      ]);
      expect(r.ok).toBe(true);
    });
    it("refuză salturile consecutive, la capetele documentului și înlocuirea textului doar cu un salt", () => {
      const errs = [
        v([{ tip: "inserare", segment_id: "a4", blocuri: [brk, brk, { tip: "paragraf", text: "x" }] }]),
        v([{ tip: "inserare", segment_id: "an", pozitie: "inainte", blocuri: [brk] }]),
        v([{ tip: "inserare", segment_id: "x1", pozitie: "dupa", blocuri: [{ tip: "paragraf", text: "x" }, brk] }]),
        v([{ tip: "inserare", segment_id: "t", pozitie: "inainte", blocuri: [brk] }]),
        v([{ tip: "inserare", segment_id: "fin", pozitie: "dupa", blocuri: [brk] }]),
        v([{ tip: "inlocuire_blocuri", segmente: ["a3"], text_original: "Art. 3", blocuri: [brk] }]),
      ].map((r) => (r.ok ? "" : r.errors[0]));
      expect(errs[0]).toMatch(/două salturi de pagină consecutive/);
      expect(errs[1]).toMatch(/chiar înainte există deja un salt de pagină/);
      expect(errs[2]).toMatch(/chiar după există deja un salt de pagină/);
      expect(errs[3]).toMatch(/prima pagină goală/);
      expect(errs[4]).toMatch(/sfârșitul documentului/);
      expect(errs[5]).toMatch(/doar un salt de pagină/);
    });
  });
});

describe("blocurile noi în JSON Tiptap", () => {
  const blocks: ChatBlock[] = [
    { tip: "titlu", nivel: 2, text: "Calendar" },
    { tip: "paragraf", text: "Termen **ferm**." },
    { tip: "lista", numerotata: true, elemente: ["unu", "doi"] },
    { tip: "tabel", antet: ["Etapa", "Termen"], randuri: [["1", "martie"], ["2", ""]] },
    { tip: "salt_pagina" },
  ];

  it("dă fiecărui paragraf un segId nou și unic, iar tabelului forma contractului", () => {
    const used = new Set(["p_existent"]);
    const nodes = blocksToNodes(blocks, used, { paragraph: { textAlign: "justify" }, textStyle: { fontFamily: "Arial", fontSize: "11pt" } });
    expect(nodes.map((n) => n.type)).toEqual(["heading", "paragraph", "orderedList", "table", "pageBreak"]);
    const ids: string[] = [];
    const walk = (n: { attrs?: Record<string, unknown>; content?: unknown[] }) => {
      if (typeof n.attrs?.segId === "string") ids.push(n.attrs.segId);
      for (const c of (n.content ?? []) as (typeof n)[]) walk(c);
    };
    nodes.forEach(walk);
    expect(ids).toHaveLength(1 + 1 + 2 + 6);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^p_[0-9a-f]{6}$/.test(id) && used.has(id))).toBe(true);
    expect(nodes[0]).toMatchObject({ attrs: { level: 2 }, content: [{ text: "Calendar", marks: [{ type: "textStyle", attrs: { fontFamily: "Arial" } }] }] });
    expect(nodes[1]).toMatchObject({
      attrs: { textAlign: "justify" },
      content: [
        { type: "text", text: "Termen " },
        { type: "text", text: "ferm", marks: [{ type: "bold" }, { type: "textStyle" }] },
        { type: "text", text: "." },
      ],
    });
    const rows = nodes[3].content!;
    expect(rows).toHaveLength(3);
    expect(rows[0].content!.map((c) => c.type)).toEqual(["tableHeader", "tableHeader"]);
    expect(rows[2].content!.map((c) => c.type)).toEqual(["tableCell", "tableCell"]);
    expect(rows[2].content![1]).toMatchObject({ attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph" }] });
    expect(rows[2].content![1].content![0].content).toBeUndefined();
    expect(nodes[4]).toEqual({ type: "pageBreak" });
  });

  it("formatarea inline: **aldin** și *cursiv*; „*” singur rămâne literal; ** neînchis e refuzat", () => {
    expect(parseInline("a **b** c")).toEqual([
      { text: "a ", bold: false, italic: false },
      { text: "b", bold: true, italic: false },
      { text: " c", bold: false, italic: false },
    ]);
    expect(parseInline("**Art. 2.** *(1)* text")).toEqual([
      { text: "Art. 2.", bold: true, italic: false },
      { text: " ", bold: false, italic: false },
      { text: "(1)", bold: false, italic: true },
      { text: " text", bold: false, italic: false },
    ]);
    expect(parseInline("art. 5* și 2 * 3")).toEqual([{ text: "art. 5* și 2 * 3", bold: false, italic: false }]);
    expect(plainInline("**Art. 2.** *nota*")).toBe("Art. 2. nota");
    expect(hasInlineFormat("art. 5*")).toBe(false);
    expect(parseInline("a **b")).toBeNull();
  });
});

describe("formatarea propusă în chat", () => {
  it("acceptă o formatare pe un pasaj exact și unic, cu stiluri de aplicat sau de scos", () => {
    const r = validateChanges(
      [
        { tip: "formatare", segment_id: "p1", text_original: "1.000 lei", stiluri: { bold: true, italic: false }, explicatie: "Suma îngroșată." },
        { tip: "formatare", segment_id: "p3", text_original: "Preavizul", stiluri: { underline: true } },
      ],
      segments,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.proposals[0]).toEqual({ kind: "formatare", id: "m1", segmentId: "p1", start: 29, textOriginal: "1.000 lei", stiluri: { bold: true, italic: false }, explicatie: "Suma îngroșată.", status: "propusa" } satisfies FormatProposal);
  });

  it("refuză markdown-ul folosit doar pentru formatare, ** neînchis, # pentru titluri și stilurile necunoscute", () => {
    const r = validateChanges(
      [
        { tip: "text", segment_id: "p3", text_original: "Preavizul", text_nou: "**Preavizul**" },
        { tip: "text", segment_id: "p1", text_original: "1.000 lei", text_nou: "**1.200 lei" },
        { tip: "text", segment_id: "p3", text_original: "Preavizul este", text_nou: "# Preavizul este" },
        { tip: "formatare", segment_id: "p1", text_original: "Locatarul", stiluri: { culoare: "roșu" } },
        { tip: "formatare", segment_id: "p1", text_original: "Locatarul", stiluri: {} },
      ],
      segments,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors[0]).toMatch(/schimbă doar formatarea; .*tip „formatare”/);
    expect(r.errors[1]).toMatch(/nu sunt pereche/);
    expect(r.errors[2]).toMatch(/nu folosi „#”/);
    expect(r.errors[3]).toMatch(/stiluri necunoscute \(culoare\)/);
    expect(r.errors[4]).toMatch(/lipsesc stilurile/);
  });

  it("acceptă text nou cu **aldin** și refuză formatarea suprapusă peste o modificare de text", () => {
    expect(validateChanges([{ tip: "text", segment_id: "p1", text_original: "1.000 lei", text_nou: "**1.200 lei**" }], segments).ok).toBe(true);
    const r = validateChanges(
      [
        { tip: "text", segment_id: "p1", text_original: "1.000 lei", text_nou: "1.200 lei" },
        { tip: "formatare", segment_id: "p1", text_original: "1.000", stiluri: { bold: true } },
      ],
      segments,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/se suprapun/);
  });
});

describe("formatarea bogată a blocurilor", () => {
  it("lista cu litere și sublistă ajunge orderedList type „a”, cu sublista în element", () => {
    const r = checkBlock({ tip: "lista", numerotata: true, stil: "litere", elemente: ["a) plata chiriei;", { text: "cheltuielile:", sublista: { numerotata: false, elemente: ["- utilități;", "întreținere."] } }] }, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.block).toEqual({ tip: "lista", numerotata: true, litere: true, elemente: ["plata chiriei;", { text: "cheltuielile:", sublista: { tip: "lista", numerotata: false, elemente: ["utilități;", "întreținere."] } }] });
    const [list] = blocksToNodes([r.block], new Set());
    expect(list).toMatchObject({ type: "orderedList", attrs: { type: "a" } });
    const second = list.content![1] as { content: { type: string }[] };
    expect(second.content.map((n) => n.type)).toEqual(["paragraph", "bulletList"]);
    expect(describeBlocks([r.block])).toBe("listă cu litere cu 4 elemente");
  });

  it("respinge enumerările scrise de mână, stilurile și alinierile necunoscute, sublistele prea adânci", () => {
    expect(checkBlock({ tip: "paragraf", text: "a) plata chiriei la termen;" }, "b1")).toMatchObject({ ok: false, error: expect.stringContaining("„lista”") });
    expect(checkBlock({ tip: "paragraf", text: "- utilități" }, "b1").ok).toBe(false);
    // trimiterile la litere în text rămân permise
    expect(checkBlock({ tip: "paragraf", text: "Potrivit art. 5 lit. a) și b), chiria se plătește lunar." }, "b1").ok).toBe(true);
    expect(checkBlock({ tip: "lista", numerotata: true, stil: "romane", elemente: ["x"] }, "b1").ok).toBe(false);
    expect(checkBlock({ tip: "paragraf", text: "x", aliniere: "mijloc" }, "b1").ok).toBe(false);
    const deep = (n: number): unknown => (n === 0 ? "frunză" : { text: `nivel ${n}`, sublista: { elemente: [deep(n - 1)] } });
    expect(checkBlock({ tip: "lista", elemente: [deep(3)] }, "b1").ok).toBe(false);
    expect(checkBlock({ tip: "lista", elemente: [deep(2)] }, "b1").ok).toBe(true);
  });

  it("alinierea și câmpurile de completat ajung în document", () => {
    const r = checkBlock({ tip: "paragraf", text: "Încheiat la [● data], în [● localitatea].", aliniere: "centru" }, "b1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [p] = blocksToNodes([r.block], new Set(), { paragraph: { textAlign: "justify" } });
    expect(p.attrs?.textAlign).toBe("center");
    const ph = (p.content ?? []).filter((n) => n.marks?.some((m) => m.type === "placeholder"));
    expect(ph.map((n) => [n.text, n.marks?.[0].attrs?.hint])).toEqual([["[● data]", "data"], ["[● localitatea]", "localitatea"]]);
  });
});
