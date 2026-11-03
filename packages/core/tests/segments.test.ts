import { describe, expect, it } from "vitest";
import { blockText, docFromParagraphs, newSegId, segmentsFromDoc, tablesFromDoc } from "../src/document/segments";
import type { DocNode, TiptapDoc } from "../src/document/types";

const p = (segId: string, ...content: DocNode[]): DocNode => ({ type: "paragraph", attrs: { segId, textAlign: null }, content });
const txt = (text: string, marks?: DocNode["marks"]): DocNode => ({ type: "text", text, ...(marks ? { marks } : {}) });
const cell = (...content: DocNode[]): DocNode => ({ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content });

const doc: TiptapDoc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { segId: "h_1", level: 1 }, content: [txt("CONTRACT DE PRESTĂRI SERVICII")] },
    p("p_1", txt("Capitalul este de "), txt("200 lei", [{ type: "bold" }]), txt(", conform art. 11 din Legea nr. 31/1990.")),
    p("p_gol"),
    p("p_spatii", txt("   ")),
    {
      type: "bulletList",
      content: [{ type: "listItem", content: [p("p_li", txt("Punct din listă")), { type: "orderedList", attrs: { start: 1 }, content: [{ type: "listItem", content: [p("p_li2", txt("Subpunct"))] }] }] }],
    },
    {
      type: "table",
      content: [
        { type: "tableRow", content: [{ ...cell(p("t_1", txt("Asociat"))), type: "tableHeader" }, { ...cell(p("t_2", txt("Temei"))), type: "tableHeader" }] },
        { type: "tableRow", content: [cell(p("t_3", txt("Ion"))), cell(p("t_4", txt("art. 7 din ")), p("t_5", txt("Legea nr. 31/1990")))] },
      ],
    },
    { type: "pageBreak" },
    { type: "horizontalRule" },
    p("p_br", txt("Semnătura"), { type: "hardBreak" }, txt("Data")),
    p(
      "p_sug",
      txt("Termenul este de "),
      txt("30", [{ type: "suggestDelete", attrs: { id: "s1", author: "ai" } }]),
      txt("45", [{ type: "suggestInsert", attrs: { id: "s1", author: "ai" } }]),
      txt(" de zile; "),
      txt("[● data]", [{ type: "placeholder", attrs: { hint: "data" } }]),
    ),
  ],
};

describe("segmentele din documentul Tiptap", () => {
  it("derivă un segment pentru fiecare titlu, paragraf și paragraf din tabel", () => {
    const segs = segmentsFromDoc(doc);
    expect(segs.map((s) => [s.id, s.kind])).toEqual([
      ["h_1", "titlu"],
      ["p_1", "paragraf"],
      ["p_li", "paragraf"],
      ["p_li2", "paragraf"],
      ["t_1", "tabel"],
      ["t_2", "tabel"],
      ["t_3", "tabel"],
      ["t_4", "tabel"],
      ["t_5", "tabel"],
      ["p_br", "paragraf"],
      ["p_sug", "paragraf"],
    ]);
    expect(segs.every((s) => s.quality === "ok")).toBe(true);
  });

  it("păstrează textul exportat: fără sugestiile de inserare, cu întreruperile de rând", () => {
    const byId = new Map(segmentsFromDoc(doc).map((s) => [s.id, s.text]));
    expect(byId.get("p_1")).toBe("Capitalul este de 200 lei, conform art. 11 din Legea nr. 31/1990.");
    expect(byId.get("p_br")).toBe("Semnătura\nData");
    expect(byId.get("p_sug")).toBe("Termenul este de 30 de zile; [● data]");
  });

  it("asigură id-uri unice și include anteturile, subsolurile și notele, dacă sunt cerute", () => {
    const dup: TiptapDoc = { type: "doc", content: [p("p_x", txt("unu")), p("p_x", txt("doi")), { type: "paragraph", content: [txt("fără segId")] }] };
    expect(segmentsFromDoc(dup).map((s) => s.id)).toEqual(["p_x", "p_x~2", "seg_1"]);
    const segs = segmentsFromDoc(
      { type: "doc", content: [p("p_1", txt("Corp"))] },
      { meta: { headers: [[p("a_1", txt("Antet firmă"))]], footers: [[p("f_1", txt("Pagina 1"))]], footnotes: [{ id: "1", content: [p("n_1", txt("Notă de subsol"))] }] } },
    );
    expect(segs.map((s) => `${s.id}:${s.kind}`)).toEqual(["p_1:paragraf", "a_1:antet", "f_1:subsol", "n_1:nota"]);
  });

  it("întoarce tabelele ca rânduri și celule de segmente", () => {
    expect(tablesFromDoc(doc)).toEqual([
      [
        [["t_1"], ["t_2"]],
        [["t_3"], ["t_4", "t_5"]],
      ],
    ]);
    const nested: TiptapDoc = {
      type: "doc",
      content: [{ type: "table", content: [{ type: "tableRow", content: [cell(p("x", txt("a")), { type: "table", content: [{ type: "tableRow", content: [cell(p("y", txt("b")))] }] })] }] }],
    };
    // tabelul exterior conține alt tabel: rămâne doar cel interior
    expect(tablesFromDoc(nested)).toEqual([[[["y"]]]]);
  });

  it("construiește documente din paragrafe simple, cu segId-uri noi", () => {
    const used = new Set<string>();
    const d = docFromParagraphs([{ text: "Titlu", heading: 1 }, { text: "Rând 1\nRând 2" }], used);
    expect(d.content.map((n) => n.type)).toEqual(["heading", "paragraph"]);
    expect(blockText(d.content[1])).toBe("Rând 1\nRând 2");
    expect(used.size).toBe(2);
    for (const n of d.content) expect(String(n.attrs?.segId)).toMatch(/^p_[0-9a-f]{6}$/);
    expect(newSegId(used)).not.toBe([...used][0]);
  });
});
