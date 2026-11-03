import { readFileSync } from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { exportDocx, importDocx, textFromParagraphs, type DocumentMeta, type ImportResult, type JSONContent } from "../src";
import { allSegIds, block, nodes, normalize, text, textNode } from "./helpers";

const t = (value: string, marks?: JSONContent["marks"]): JSONContent => (marks ? { type: "text", text: value, marks } : { type: "text", text: value });
const p = (content: JSONContent[], attrs: Record<string, unknown> = {}): JSONContent => ({ type: "paragraph", attrs: { segId: "x", ...attrs }, content });
const li = (...content: JSONContent[]): JSONContent => ({ type: "listItem", content });
const cell = (value: string, attrs: Record<string, unknown> = {}, type = "tableCell"): JSONContent => ({
  type,
  attrs: { colspan: 1, rowspan: 1, colwidth: [120], ...attrs },
  content: [p([t(value)])],
});

const formatted = p(
  [
    t("Normal "),
    t("îngroșat", [{ type: "bold" }]),
    t(" "),
    t("cursiv subliniat", [{ type: "italic" }, { type: "underline" }]),
    t(" "),
    t("tăiat", [{ type: "strike" }]),
    t("x", [{ type: "subscript" }]),
    t("2", [{ type: "superscript" }]),
    t(" Arial 14 roșu", [{ type: "textStyle", attrs: { fontFamily: "Arial", fontSize: "14pt", color: "#c00000" } }]),
    t(" evidențiat", [{ type: "textStyle", attrs: { backgroundColor: "#d9d9d9" } }]),
    { type: "hardBreak" },
    t("Portal", [{ type: "link", attrs: { href: "https://legislatie.just.ro/" } }]),
    t("\tcoloană"),
  ],
  { textAlign: "justify", indentPt: 36, firstLineIndentPt: 18, lineHeight: 2, spaceBeforePt: 6, spaceAfterPt: 12 },
);

const SOURCE: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { segId: "x", level: 1, textAlign: "center" }, content: [t("CONTRACT DE ÎMPRUMUT")] },
    { type: "heading", attrs: { segId: "x", level: 3 }, content: [t("Art. 1 — Obiectul")] },
    formatted,
    p([t("Agățat cu diacritice: ș ț ă î â Ș Ț ş ţ")], { firstLineIndentPt: -18, indentPt: 36, textAlign: "right" }),
    {
      type: "orderedList",
      attrs: { start: 3 },
      content: [
        li(p([t("al treilea")]), { type: "bulletList", content: [li(p([t("punct imbricat")])), li(p([t("alt punct")]))] }),
        li(p([t("al patrulea")])),
      ],
    },
    { type: "bulletList", content: [li(p([t("listă cu buline")]))] },
    { type: "pageBreak" },
    p([t("După saltul de pagină")]),
    { type: "horizontalRule" },
    {
      type: "table",
      content: [
        { type: "tableRow", content: [cell("A", {}, "tableHeader"), cell("B", {}, "tableHeader"), cell("C", { colwidth: [200] }, "tableHeader")] },
        { type: "tableRow", content: [cell("AB", { colspan: 2, colwidth: [120, 120] }), cell("C1", { backgroundColor: "#ffff00", colwidth: [200] })] },
        { type: "tableRow", content: [cell("A23", { rowspan: 2 }), cell("B2"), cell("C2", { colwidth: [200] })] },
        { type: "tableRow", content: [cell("B3"), cell("C3", { colwidth: [200] })] },
      ],
    },
    p([
      t("Împrumutatul "),
      t("[● nume împrumutat]", [{ type: "placeholder", attrs: { hint: "nume împrumutat" } }]),
      t(" restituie suma în "),
      t("30", [{ type: "suggestDelete", attrs: { id: "s1", author: "ai", createdAt: "2026-01-01" } }]),
      t("45", [{ type: "suggestInsert", attrs: { id: "s1", author: "ai", createdAt: "2026-01-01" } }]),
      t(" de zile."),
    ]),
  ],
};

const META: Partial<DocumentMeta> = {
  page: { size: "Letter", orientation: "landscape", marginsMm: { top: 20, right: 15, bottom: 20, left: 30 } },
  defaults: { fontFamily: "Georgia", fontSizePt: 11, lineHeight: 1.5, spaceAfterPt: 10 },
  headers: [[p([t("Antet: Societatea Exemplu SRL")])]],
  footers: [[p([t("Subsol confidențial")])]],
  footnotes: [{ id: "1", content: [p([t("Nota 1 — Legea nr. 287/2009.")])] }],
};

describe("exportDocx → importDocx", () => {
  let buf: Buffer;
  let r: ImportResult;
  beforeAll(async () => {
    buf = await exportDocx(SOURCE, META);
    r = await importDocx(buf);
  });

  it("produce un DOCX valid", async () => {
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const zip = await JSZip.loadAsync(buf);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain("Normal ");
    // placeholder: text evidențiat galben; sugestia neacceptată nu apare
    expect(xml).toContain('<w:highlight w:val="yellow"/>');
    expect(xml).not.toContain(">45<");
  });

  it("păstrează paragraful formatat identic (text, mark-uri, atribute)", () => {
    expect(normalize(block(r.content, "Normal "))).toEqual(normalize(formatted));
  });

  it("păstrează titlurile și atributele paragrafelor", () => {
    expect(block(r.content, "CONTRACT DE ÎMPRUMUT")).toMatchObject({ type: "heading", attrs: { level: 1, textAlign: "center" } });
    expect(block(r.content, "Art. 1")).toMatchObject({ type: "heading", attrs: { level: 3 } });
    expect(normalize(block(r.content, "Agățat"))).toEqual(normalize(SOURCE.content![3]));
  });

  it("păstrează listele imbricate și numerotarea de start", () => {
    const top = r.content.content!;
    const lists = top.filter((n) => n.type === "orderedList" || n.type === "bulletList");
    expect(lists.map(normalize)).toEqual([normalize(SOURCE.content![4]), normalize(SOURCE.content![5])]);
  });

  it("păstrează saltul de pagină și linia orizontală", () => {
    const types = r.content.content!.map((n) => n.type);
    const i = types.indexOf("pageBreak");
    expect(i).toBeGreaterThan(0);
    expect(text(r.content.content![i + 1])).toBe("După saltul de pagină");
    expect(types[i + 2]).toBe("horizontalRule");
    expect(types.filter((x) => x === "pageBreak")).toHaveLength(1);
  });

  it("păstrează structura tabelului: antet, colspan, rowspan, lățimi, fundal", () => {
    const [table] = nodes(r.content, "table");
    expect(normalize(table)).toEqual(normalize(SOURCE.content![9]));
  });

  it("scrie sugestiile neaplicate și recunoaște placeholderul", () => {
    const para = block(r.content, "Împrumutatul");
    expect(text(para)).toBe("Împrumutatul [● nume împrumutat] restituie suma în 30 de zile.");
    expect(textNode(para, "[● nume împrumutat]").marks).toEqual([{ type: "placeholder", attrs: { hint: "nume împrumutat" } }]);
    expect(nodes(para, "text").flatMap((n) => n.marks ?? []).some((m) => m.type.startsWith("suggest"))).toBe(false);
  });

  it("păstrează setările de pagină, anteturile, subsolurile și notele", () => {
    expect(r.meta.page).toEqual({ ...META.page, headerMm: 12.5, footerMm: 12.5 });
    expect(r.meta.defaults).toEqual(META.defaults);
    expect(text(r.meta.headers[0])).toBe("Antet: Societatea Exemplu SRL");
    expect(text(r.meta.footers[0])).toBe("Subsol confidențial");
    expect(r.meta.footnotes.map((f) => text(f.content))).toEqual(["Nota 1 — Legea nr. 287/2009."]);
    // trimiterile la note (scrise la final) nu lasă un paragraf gol
    expect(text(r.content.content![r.content.content!.length - 1])).toBe("Împrumutatul [● nume împrumutat] restituie suma în 30 de zile.");
  });

  it("generează segId-uri unice la reimport", () => {
    const ids = allSegIds(r);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("x");
  });

  it("păstrează textul fixture-ului după export și reimport", async () => {
    const first = await importDocx(readFileSync(path.resolve(__dirname, "fixtures/contract-test.docx")));
    const second = await importDocx(await exportDocx(first.content, first.meta));
    expect(text(second.content)).toBe(text(first.content));
    expect(nodes(second.content, "heading").map((h) => h.attrs?.level)).toEqual(nodes(first.content, "heading").map((h) => h.attrs?.level));
    expect(normalize(nodes(second.content, "table")[0])).toEqual(normalize(nodes(first.content, "table")[0]));
    expect(second.meta.footnotes.map((f) => text(f.content))).toEqual(first.meta.footnotes.map((f) => text(f.content)));
  });

  it("exportă un document gol fără erori", async () => {
    const out = await importDocx(await exportDocx({ type: "doc", content: [] }));
    expect(out.content.content).toHaveLength(1);
    expect(out.meta.defaults).toEqual({ fontFamily: "Times New Roman", fontSizePt: 12, lineHeight: 1.15, spaceAfterPt: 6 });
  });
});

describe("textFromParagraphs", () => {
  it("creează câte un paragraf cu segId unic, rândurile devin hardBreak", () => {
    const doc = textFromParagraphs(["Primul paragraf, cu ș și ț.", "", "Rândul 1\nRândul 2"]);
    expect(doc.type).toBe("doc");
    expect(doc.content).toHaveLength(3);
    expect(text(doc.content![0])).toBe("Primul paragraf, cu ș și ț.");
    expect(doc.content![1].content).toBeUndefined();
    expect(doc.content![2].content!.map((n) => n.type)).toEqual(["text", "hardBreak", "text"]);
    const ids = doc.content!.map((n) => n.attrs?.segId);
    expect(new Set(ids).size).toBe(3);
  });

  it("întoarce un paragraf gol pentru lista vidă", () => {
    expect(textFromParagraphs([]).content).toHaveLength(1);
  });
});

describe("liste cu litere („a)”)", () => {
  const para = (t: string): JSONContent => ({ type: "paragraph", content: [{ type: "text", text: t }] });
  const lettered: JSONContent = {
    type: "doc",
    content: [
      {
        type: "orderedList",
        attrs: { start: 1, type: "a" },
        content: [
          { type: "listItem", content: [para("plata chiriei")] },
          { type: "listItem", content: [para("folosirea bunului"), { type: "orderedList", attrs: { start: 1 }, content: [{ type: "listItem", content: [para("cu prudență")] }] }] },
        ],
      },
    ],
  };

  it("se exportă ca „a)” și revin din DOCX tot ca listă cu litere", async () => {
    const buf = await exportDocx(lettered);
    const numbering = await (await JSZip.loadAsync(buf)).file("word/numbering.xml")!.async("string");
    expect(numbering).toContain('w:val="lowerLetter"');
    expect(numbering).toContain('w:val="%1)"');
    const back = await importDocx(buf);
    const lists = nodes(back.content, "orderedList");
    expect(lists[0].attrs?.type).toBe("a");
    // sublista rămâne cu cifre
    expect(lists[1].attrs?.type ?? null).toBeNull();
    expect(text(lists[0])).toContain("plata chiriei");
  });
});
