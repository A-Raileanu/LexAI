import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPdfDefinition, defaultMeta, identityFonts, pickFontFamily, type JSONContent, type PdfFonts, type PdfNode } from "../src";

const t = (value: string, marks?: JSONContent["marks"]): JSONContent => (marks ? { type: "text", text: value, marks } : { type: "text", text: value });
const p = (content: JSONContent[], attrs: Record<string, unknown> = {}): JSONContent => ({ type: "paragraph", attrs: { segId: "x", ...attrs }, content });
const h = (level: number, value: string): JSONContent => ({ type: "heading", attrs: { segId: "h", level }, content: [t(value)] });
const li = (...content: JSONContent[]): JSONContent => ({ type: "listItem", content });
const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });
const cell = (value: string, attrs: Record<string, unknown> = {}, type = "tableCell"): JSONContent => ({ type, attrs: { colspan: 1, rowspan: 1, ...attrs }, content: [p([t(value)])] });

/** Fonturi de test: interlinia naturală 1.0, ca valorile pdfmake să fie egale cu cele CSS. */
const fonts: PdfFonts = { ...identityFonts, lineRatio: () => 1 };
const build = (content: JSONContent, meta = defaultMeta(), opts = {}) => buildPdfDefinition(content, meta, { fonts, ...opts });
const runs = (n: PdfNode) => n.text as PdfNode[];

describe("buildPdfDefinition — pagina", () => {
  it("A4 portret, marginile în pt, fontul implicit", () => {
    const def = build(doc(p([t("a")])));
    expect(def.pageSize).toBe("A4");
    expect(def.pageOrientation).toBe("portrait");
    expect(def.pageMargins.map(Math.round)).toEqual([71, 71, 71, 71]); // 25 mm
    expect(def.defaultStyle).toMatchObject({ font: "Times New Roman", fontSize: 12, lineHeight: 1.15 });
  });

  it("Letter vedere, margini proprii", () => {
    const meta = defaultMeta();
    meta.page = { size: "Letter", orientation: "landscape", marginsMm: { top: 10, right: 20, bottom: 30, left: 40 } };
    const def = build(doc(p([t("a")])), meta);
    expect(def.pageSize).toBe("LETTER");
    expect(def.pageOrientation).toBe("landscape");
    expect(def.pageMargins.map(Math.round)).toEqual([113, 28, 57, 85]);
  });

  it("numerotarea paginilor și subsolul din meta", () => {
    const meta = defaultMeta();
    meta.footers = [[p([t("Confidențial")])]];
    const def = build(doc(p([t("a")])), meta, { pageNumbers: true });
    const footer = def.footer!(2, 5) as { stack: PdfNode[] };
    expect(runs(footer.stack[0])[0].text).toBe("Confidențial");
    expect(footer.stack[1].text).toBe("Pagina 2 din 5");
    expect(build(doc(p([t("a")]))).footer).toBeUndefined();
  });
});

describe("buildPdfDefinition — paragrafe și text", () => {
  it("mark-urile devin stiluri pdfmake", () => {
    const def = build(
      doc(
        p([
          t("aldin", [{ type: "bold" }]),
          t("cursiv subliniat tăiat", [{ type: "italic" }, { type: "underline" }, { type: "strike" }]),
          t("Arial 14 roșu", [{ type: "textStyle", attrs: { fontFamily: "Arial", fontSize: "14pt", color: "#c00000", backgroundColor: "#d9d9d9" } }]),
          t("2", [{ type: "superscript" }]),
          t("Portal", [{ type: "link", attrs: { href: "https://legislatie.just.ro/" } }]),
        ]),
      ),
    );
    const r = runs(def.content[0]);
    expect(r[0]).toMatchObject({ text: "aldin", bold: true });
    expect(r[1]).toMatchObject({ italics: true, decoration: ["underline", "lineThrough"] });
    expect(r[2]).toMatchObject({ font: "Arial", fontSize: 14, color: "#C00000", background: "#D9D9D9" });
    expect(r[3]).toMatchObject({ text: "2", sup: true });
    expect(r[4]).toMatchObject({ link: "https://legislatie.just.ro/", decoration: "underline", color: "#0563c1" });
  });

  it("aliniere, indentare, prim rând, interlinie și spațiere", () => {
    const def = build(doc(p([t("x")], { textAlign: "justify", indentPt: 36, firstLineIndentPt: 18, lineHeight: 1.5, spaceBeforePt: 12, spaceAfterPt: 3 })));
    expect(def.content[0]).toMatchObject({ alignment: "justify", leadingIndent: 18, lineHeight: 1.5, margin: [36, 12, 0, 3] });
  });

  it("marginile verticale se comasează ca în CSS (max, nu sumă)", () => {
    const def = build(doc(p([t("a")]), h(1, "Titlu"), p([t("b")], { spaceBeforePt: 2 })));
    // p (6 după) → h1 (12 înainte): 12 în total; h1 (6 după) → p (2 înainte): 6
    expect(def.content.map((n) => n.margin)).toEqual([
      [0, 0, 0, 6],
      [0, 6, 0, 6],
      [0, 0, 0, 6],
    ]);
  });

  it("titlurile: mărime, aldin, cursiv la nivelul 4, păstrate cu paragraful următor", () => {
    const def = build(doc(h(1, "Unu"), h(4, "Patru")));
    expect(def.content[0]).toMatchObject({ fontSize: 16, bold: true, headlineLevel: 1 });
    expect(def.content[1]).toMatchObject({ fontSize: 12, bold: true, italics: true, headlineLevel: 4 });
    const q = (following: number, previous: number) => ({ getFollowingNodesOnPage: () => Array(following), getNodesOnNextPage: () => [{}], getPreviousNodesOnPage: () => Array(previous) });
    expect(def.pageBreakBefore({ headlineLevel: 1, pageNumbers: [1] }, q(0, 3))).toBe(true);
    expect(def.pageBreakBefore({ headlineLevel: 1, pageNumbers: [1] }, q(2, 3))).toBe(false);
    expect(def.pageBreakBefore({ pageNumbers: [1] }, q(0, 3))).toBe(false);
  });

  it("paragraful gol are un rând; ruptura de rând devine \\n", () => {
    const def = build(doc(p([]), p([t("a"), { type: "hardBreak" }, t("b")])));
    expect(runs(def.content[0])[0].text).toBe(" ");
    expect(runs(def.content[1]).map((r) => r.text)).toEqual(["a", "\n", "b"]);
  });

  it("sugestiile neaplicate și placeholderele, ca la DOCX", () => {
    const sug = { id: "s1", author: "ai", createdAt: 1 };
    const def = build(doc(p([t("vechi", [{ type: "suggestDelete", attrs: sug }]), t("nou", [{ type: "suggestInsert", attrs: sug }]), t("[● nume]", [{ type: "placeholder", attrs: { hint: "nume" } }])])));
    const r = runs(def.content[0]);
    expect(r.map((x) => x.text)).toEqual(["vechi", "[● nume]"]);
    expect(r[1].background).toBe("#fff2b3");
  });

  it("caracterele fără glifă trec pe fontul de rezervă", () => {
    const sparse: PdfFonts = { ...fonts, fallback: "Arial Unicode", hasGlyph: (font, cp) => font === "Arial Unicode" || cp < 0x2000 };
    const def = buildPdfDefinition(doc(p([t("Art. ⟦1⟧ ș")])), defaultMeta(), { fonts: sparse });
    expect(runs(def.content[0]).map((r) => [r.text, r.font])).toEqual([
      ["Art. ", "Times New Roman"],
      ["⟦", "Arial Unicode"],
      ["1", "Times New Roman"],
      ["⟧", "Arial Unicode"],
      [" ș", "Times New Roman"],
    ]);
  });
});

describe("buildPdfDefinition — blocuri", () => {
  it("liste numerotate de la `start`, cu buline desenate pe niveluri", () => {
    const def = build(doc({ type: "orderedList", attrs: { start: 3 }, content: [li(p([t("a")])), li(p([t("b")]), { type: "bulletList", content: [li(p([t("c")]), { type: "bulletList", content: [li(p([t("d")]))] })] })] }));
    const items = def.content[0].stack as { columns: PdfNode[] }[];
    expect(items.map((i) => i.columns[0].text)).toEqual(["3.", "4."]);
    expect(items[0].columns[0]).toMatchObject({ width: 36, alignment: "right" });
    expect(runs((items[0].columns[1].stack as PdfNode[])[0])[0].text).toBe("a");
    // paragraful din listă nu are spațiul implicit după
    expect((items[0].columns[1].stack as PdfNode[])[0].margin).toEqual([0, 0, 0, 0]);
    const nested = ((items[1].columns[1].stack as PdfNode[])[1].stack as { columns: PdfNode[] }[])[0];
    const shape = (c: PdfNode) => ((c.stack as PdfNode[])[0].canvas as PdfNode[])[0];
    expect(shape(nested.columns[0])).toMatchObject({ type: "ellipse", color: "#000000" });
    const deeper = ((nested.columns[1].stack as PdfNode[])[1].stack as { columns: PdfNode[] }[])[0];
    expect(shape(deeper.columns[0])).toMatchObject({ type: "ellipse", lineWidth: 0.6 });
  });

  it("tabele: lățimi, celule fuzionate, fundal, rând de antet", () => {
    const table: JSONContent = {
      type: "table",
      content: [
        { type: "tableRow", content: [cell("A", { colwidth: [200] }, "tableHeader"), cell("B", { colwidth: [100] }, "tableHeader")] },
        { type: "tableRow", content: [cell("C", { colspan: 2, backgroundColor: "#ffff00" })] },
        { type: "tableRow", content: [cell("D", { rowspan: 2 }), cell("E")] },
        { type: "tableRow", content: [cell("F")] },
      ],
    };
    const def = build(doc(table));
    const tb = def.content[0].table as { widths: unknown[]; body: PdfNode[][]; headerRows?: number };
    expect(tb.widths).toEqual([138.7, 63.7]); // px · 0,75 − padding − bordura
    expect(tb.headerRows).toBe(1);
    expect(tb.body[0][0]).toMatchObject({ bold: true });
    expect(tb.body[1][0]).toMatchObject({ colSpan: 2, fillColor: "#FFFF00" });
    expect(tb.body[1][1]).toEqual({});
    expect(tb.body[2][0]).toMatchObject({ rowSpan: 2 });
    expect(tb.body[3][0]).toEqual({});
    expect(runs((tb.body[3][1].stack as PdfNode[])[0])[0].text).toBe("F");
    // ultimul paragraf din celulă fără spațiu după; tabelul are 6 pt deasupra și dedesubt
    expect((tb.body[2][1].stack as PdfNode[])[0].margin).toEqual([0, 0, 0, 0]);
    expect(def.content[0].margin).toEqual([0, 6, 0, 6]);
  });

  it("tabelul mai lat decât foaia se micșorează proporțional", () => {
    const def = build(doc({ type: "table", content: [{ type: "tableRow", content: [cell("A", { colwidth: [600] }), cell("B", { colwidth: [600] })] }] }));
    const widths = (def.content[0].table as { widths: number[] }).widths;
    expect(widths[0]).toBeCloseTo(widths[1]);
    expect(widths[0] * 2).toBeLessThan(595.28 - def.pageMargins[0] - def.pageMargins[2]);
  });

  it("saltul de pagină trece blocul următor pe pagina nouă", () => {
    const def = build(doc(p([t("a")]), { type: "pageBreak" }, p([t("b")]), { type: "horizontalRule" }));
    expect(def.content[0].pageBreak).toBeUndefined();
    expect(def.content[1].pageBreak).toBe("before");
    expect(def.content[2].canvas).toBeDefined();
  });
});

describe("pickFontFamily", () => {
  const available = ["Times New Roman", "Arial", "Courier New", "Georgia", "Roboto"];
  it.each([
    ["Georgia", "Georgia"],
    ["georgia", "Georgia"],
    ["Calibri", "Arial"],
    ["Helvetica Neue", "Arial"],
    ["Cambria", "Times New Roman"],
    ["Consolas", "Courier New"],
    ["Open Sans", "Arial"],
    ["Font Necunoscut", "Times New Roman"],
    ['"Arial", sans-serif', "Arial"],
  ])("%s → %s", (requested, expected) => expect(pickFontFamily(requested, available)).toBe(expected));
  it("fără echivalent instalat → Roboto", () => expect(pickFontFamily("Calibri", ["Roboto"])).toBe("Roboto"));
});

describe("randarea cu pdfmake", () => {
  it("produce un PDF A4 cu diacriticele extrase corect", async () => {
    const coreRequire = createRequire(path.resolve(__dirname, "../../core/package.json"));
    const mod = coreRequire("pdfmake") as { default?: unknown };
    const pm = ("createPdf" in mod ? mod : mod.default) as {
      addFonts(f: Record<string, Record<string, string>>): void;
      setUrlAccessPolicy(fn: () => boolean): void;
      setLocalAccessPolicy(fn: () => boolean): void;
      createPdf(def: unknown): { getBuffer(): Promise<Buffer> };
    };
    const dir = path.join(path.dirname(coreRequire.resolve("pdfmake")), "..", "build", "fonts", "Roboto");
    pm.addFonts({ Roboto: { normal: path.join(dir, "Roboto-Regular.ttf"), bold: path.join(dir, "Roboto-Medium.ttf"), italics: path.join(dir, "Roboto-Italic.ttf"), bolditalics: path.join(dir, "Roboto-MediumItalic.ttf") } });
    pm.setUrlAccessPolicy(() => false);
    pm.setLocalAccessPolicy(() => true);
    const roboto: PdfFonts = { resolve: () => "Roboto", lineRatio: () => 1.17, hasGlyph: () => true };
    const content = doc(h(1, "Contract"), p([t("Părțile își asumă obligațiile; ş ţ vechi.")]), { type: "pageBreak" }, p([t("Pagina a doua")]));
    const def = buildPdfDefinition(content, defaultMeta(), { fonts: roboto, pageNumbers: true });
    const buf = await pm.createPdf(def).getBuffer();

    const pdfjs = (await import(coreRequire.resolve("pdfjs-dist/legacy/build/pdf.mjs"))) as {
      getDocument(o: { data: Uint8Array }): { promise: Promise<{ numPages: number; getPage(n: number): Promise<{ view: number[]; getTextContent(): Promise<{ items: { str: string }[] }> }> }> };
    };
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
    expect(pdf.numPages).toBe(2);
    const page = await pdf.getPage(1);
    expect(page.view.map(Math.round)).toEqual([0, 0, 595, 842]);
    const text = (await page.getTextContent()).items.map((i) => i.str).join("");
    expect(text).toContain("Părțile își asumă obligațiile; ş ţ vechi.");
    expect(text).toContain("Pagina 1 din 2");
  });
});

describe("marcajele listelor cu litere", () => {
  it("numără ca Word: a … z, aa, ab", async () => {
    const { letterOf } = await import("../src/pdf");
    expect([1, 2, 26, 27, 28].map(letterOf)).toEqual(["a", "b", "z", "aa", "ab"]);
  });
});
