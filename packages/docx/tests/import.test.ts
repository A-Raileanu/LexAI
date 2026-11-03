import { readFileSync } from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  Document,
  ExternalHyperlink,
  Footer,
  FootnoteReferenceRun,
  Header,
  HeadingLevel,
  HighlightColor,
  LevelFormat,
  LineRuleType,
  Packer,
  PageBreak,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Tab,
  Table,
  TableCell,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
} from "docx";
import { beforeAll, describe, expect, it } from "vitest";
import { importDocx, type ImportResult } from "../src";
import { allSegIds, block, markTypes, nodes, text, textNode, textStyle } from "./helpers";

const FIXTURE = path.resolve(__dirname, "fixtures/contract-test.docx");

describe("importDocx — fixture contract-test.docx", () => {
  let r: ImportResult;
  beforeAll(async () => {
    r = await importDocx(readFileSync(FIXTURE));
  });

  it("păstrează titlurile, textul și diacriticele", () => {
    const top = r.content.content!;
    expect(top[0]).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(text(top[0])).toBe("CONTRACT DE SOCIETATE");
    expect(nodes(r.content, "heading").map((h) => h.attrs?.level)).toEqual([1, 2, 2, 2, 2, 2]);
    expect(text(block(r.content, "Încheiat astăzi"))).toBe(
      "Încheiat astăzi, 15 martie 2024, între asociații de mai jos, în temeiul Legii nr. 31/1990 privind societățile, republicată.",
    );
    expect(text(r.content)).toContain("Art. 5. Litigii și prescripție");
  });

  it("citește tabelul cu lățimile coloanelor", () => {
    const [table] = nodes(r.content, "table");
    expect(table.content).toHaveLength(3);
    const cells = table.content![0].content!;
    expect(cells.map(text)).toEqual(["Asociat", "Aport", "Temei"]);
    expect(cells[0].attrs).toMatchObject({ colspan: 1, rowspan: 1, colwidth: [200] });
    expect(text(table.content![2].content![0])).toBe("Maria Ionescu");
  });

  it("pune anteturile, subsolurile și notele în meta", () => {
    expect(text(r.meta.headers[0])).toBe("EXEMPLU SRL — act constitutiv, conform OUG nr. 99/2006 privind instituțiile de credit");
    expect(text(r.meta.footers[0])).toBe("Document confidențial — prelucrare date conform Legii nr. 190/2018");
    expect(r.meta.footnotes).toHaveLength(1);
    expect(r.meta.footnotes[0].id).toBe("1");
    expect(text(r.meta.footnotes[0].content)).toBe("Valoarea minimă a fost stabilită prin Legea nr. 441/2006.");
    expect(r.meta.page).toEqual({ size: "A4", orientation: "portrait", marginsMm: { top: 25, right: 25, bottom: 25, left: 25 } });
    expect(r.meta.defaults).toEqual({ fontFamily: "Times New Roman", fontSizePt: 12, lineHeight: 1.15, spaceAfterPt: 0 });
  });

  it("dă fiecărui paragraf un segId unic", () => {
    const ids = allSegIds(r);
    expect(ids.length).toBeGreaterThan(20);
    expect(ids.every((id) => /^p_[0-9a-z]{6}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

/** Document construit cu biblioteca `docx`, cu formatările pe care importul trebuie să le recunoască. */
async function buildSample(): Promise<Buffer> {
  const cell = (t: string, opts: Partial<ConstructorParameters<typeof TableCell>[0]> = {}) =>
    new TableCell({ children: [new Paragraph(t)], ...opts });
  const table = new Table({
    columnWidths: [1500, 3000, 4500],
    rows: [
      new TableRow({ tableHeader: true, children: [cell("Nr."), cell("Denumire"), cell("Valoare")] }),
      new TableRow({ children: [cell("Fuzionat orizontal", { columnSpan: 2 }), cell("100")] }),
      new TableRow({
        children: [cell("Fuzionat vertical", { rowSpan: 2 }), cell("B2"), cell("C2", { shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFFF00" } })],
      }),
      new TableRow({ children: [cell("B3"), cell("C3")] }),
    ],
    width: { size: 9000, type: WidthType.DXA },
  });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 22 }, paragraph: { spacing: { line: 276, lineRule: LineRuleType.AUTO } } },
      },
    },
    numbering: {
      config: [
        {
          reference: "num",
          levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: "%1.", start: 1 },
            { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2)", start: 1 },
          ],
        },
        {
          reference: "bul",
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: "•" },
            { level: 1, format: LevelFormat.BULLET, text: "◦" },
          ],
        },
      ],
    },
    footnotes: { 1: { children: [new Paragraph("Nota de subsol cu diacritice: ș, ț.")] } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 },
          },
        },
        headers: { default: new Header({ children: [new Paragraph("Antet — Societatea Exemplu SRL")] }) },
        footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ children: ["Pagina ", PageNumber.CURRENT] })] })] }) },
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, text: "CONTRACT DE PRESTĂRI SERVICII" }),
          new Paragraph({ heading: HeadingLevel.HEADING_1, text: "Capitolul I" }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun("Normal "),
              new TextRun({ text: "îngroșat", bold: true }),
              new TextRun({ text: "cursiv", italics: true }),
              new TextRun({ text: "subliniat", underline: { type: UnderlineType.SINGLE } }),
              new TextRun({ text: "tăiat", strike: true }),
              new TextRun(" "),
              new TextRun({ text: "dublu", doubleStrike: true }),
              new TextRun({ text: "sus", superScript: true }),
              new TextRun({ text: "jos", subScript: true }),
              new TextRun({ text: "Courier 14", font: "Courier New", size: 28 }),
              new TextRun({ text: "roșu", color: "C00000" }),
              new TextRun({ text: "galben", highlight: HighlightColor.YELLOW }),
              new TextRun({ text: "gri", shading: { type: ShadingType.CLEAR, color: "auto", fill: "D9D9D9" } }),
              new TextRun({ text: "ascuns", vanish: true }),
              new FootnoteReferenceRun(1),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            indent: { left: 720, firstLine: 360 },
            spacing: { before: 240, after: 120, line: 360, lineRule: LineRuleType.AUTO },
            children: [new TextRun("Diacritice: ș ț ă î â Ș Ț Ă Î Â, cu sedilă: ş ţ Ş Ţ.")],
          }),
          new Paragraph({ indent: { left: 1440, hanging: 720 }, alignment: AlignmentType.RIGHT, text: "Agățat la dreapta" }),
          new Paragraph({ numbering: { reference: "num", level: 0 }, text: "Primul" }),
          new Paragraph({ numbering: { reference: "num", level: 1 }, text: "litera a" }),
          new Paragraph({ numbering: { reference: "num", level: 1 }, text: "litera b" }),
          new Paragraph({ numbering: { reference: "num", level: 0 }, text: "Al doilea" }),
          new Paragraph({ numbering: { reference: "bul", level: 0 }, text: "punct" }),
          new Paragraph({ numbering: { reference: "bul", level: 1 }, text: "subpunct" }),
          new Paragraph("Text între liste"),
          new Paragraph({ numbering: { reference: "num", level: 0 }, text: "Al treilea" }),
          new Paragraph({ children: [new TextRun("înainte"), new PageBreak(), new TextRun("după")] }),
          new Paragraph({ pageBreakBefore: true, text: "Pagina nouă" }),
          new Paragraph({
            children: [
              new TextRun("Vezi "),
              new ExternalHyperlink({ link: "https://legislatie.just.ro", children: [new TextRun({ text: "Portalul", style: "Hyperlink" })] }),
              new TextRun({ children: [new Tab(), "după tab"] }),
              new TextRun({ text: "rând nou", break: 1 }),
            ],
          }),
          table,
          new Paragraph("Final"),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

describe("importDocx — document construit cu biblioteca docx", () => {
  let r: ImportResult;
  beforeAll(async () => {
    r = await importDocx(await buildSample());
  });

  it("citește setările de pagină și valorile implicite", () => {
    expect(r.meta.page.size).toBe("A4");
    expect(r.meta.page.orientation).toBe("landscape");
    expect(r.meta.page.marginsMm).toEqual({ top: 20, right: 20, bottom: 20, left: 30 });
    expect(r.meta.defaults).toEqual({ fontFamily: "Arial", fontSizePt: 11, lineHeight: 1.15, spaceAfterPt: 0 });
  });

  it("recunoaște titlurile din stiluri", () => {
    expect(block(r.content, "CONTRACT DE PRESTĂRI")).toMatchObject({ type: "heading", attrs: { level: 1 } });
    expect(block(r.content, "Capitolul I")).toMatchObject({ type: "heading", attrs: { level: 1 } });
  });

  it("transformă formatarea rulajelor în mark-uri", () => {
    expect(markTypes(textNode(r.content, "Normal "))).toEqual([]);
    expect(markTypes(textNode(r.content, "îngroșat"))).toEqual(["bold"]);
    expect(markTypes(textNode(r.content, "cursiv"))).toEqual(["italic"]);
    expect(markTypes(textNode(r.content, "subliniat"))).toEqual(["underline"]);
    expect(markTypes(textNode(r.content, "tăiat"))).toEqual(["strike"]);
    expect(markTypes(textNode(r.content, "dublu"))).toEqual(["strike"]);
    expect(markTypes(textNode(r.content, "sus"))).toEqual(["superscript"]);
    expect(markTypes(textNode(r.content, "jos"))).toEqual(["subscript"]);
    expect(textStyle(textNode(r.content, "Courier 14"))).toEqual({ fontFamily: "Courier New", fontSize: "14pt" });
    expect(textStyle(textNode(r.content, "roșu"))).toEqual({ color: "#c00000" });
    expect(textStyle(textNode(r.content, "galben"))).toEqual({ backgroundColor: "#ffff00" });
    expect(textStyle(textNode(r.content, "gri"))).toEqual({ backgroundColor: "#d9d9d9" });
    expect(text(r.content)).not.toContain("ascuns");
  });

  it("transformă proprietățile paragrafelor în atribute", () => {
    expect(block(r.content, "Normal ").attrs?.textAlign).toBe("center");
    const p = block(r.content, "Diacritice");
    expect(p.attrs).toMatchObject({ textAlign: "justify", indentPt: 36, firstLineIndentPt: 18, spaceBeforePt: 12, spaceAfterPt: 6, lineHeight: 1.5 });
    expect(block(r.content, "Agățat").attrs).toMatchObject({ textAlign: "right", indentPt: 72, firstLineIndentPt: -36 });
    // 1.15 e valoarea implicită a documentului, deci nu se repetă pe paragraf
    expect(block(r.content, "Normal ").attrs?.lineHeight).toBeUndefined();
  });

  it("păstrează exact diacriticele, inclusiv variantele cu sedilă", () => {
    expect(text(block(r.content, "Diacritice"))).toBe("Diacritice: ș ț ă î â Ș Ț Ă Î Â, cu sedilă: ş ţ Ş Ţ.");
  });

  it("construiește listele imbricate și continuă numerotarea", () => {
    const top = r.content.content!;
    const lists = top.filter((n) => n.type === "orderedList" || n.type === "bulletList");
    expect(lists.map((l) => l.type)).toEqual(["orderedList", "bulletList", "orderedList"]);
    const [ol, ul, ol2] = lists;
    expect(ol.attrs?.start).toBe(1);
    expect(ol.content).toHaveLength(2);
    expect(text(ol.content![0].content![0])).toBe("Primul");
    const nested = ol.content![0].content![1];
    expect(nested.type).toBe("orderedList");
    expect(nested.content!.map(text)).toEqual(["litera a", "litera b"]);
    expect(text(ol.content![1])).toBe("Al doilea");
    expect(ul.content![0].content![1].type).toBe("bulletList");
    expect(text(ul.content![0].content![1])).toBe("subpunct");
    // aceeași numerotare, întreruptă de un paragraf: continuă de la 3
    expect(ol2.attrs?.start).toBe(3);
    // paragrafele din liste nu duc indentarea stilului ListParagraph
    expect(ol.content![0].content![0].attrs?.indentPt).toBeUndefined();
  });

  it("împarte paragrafele la saltul de pagină", () => {
    const top = r.content.content!;
    const i = top.findIndex((n) => text(n) === "înainte");
    expect(top.slice(i, i + 5).map((n) => n.type)).toEqual(["paragraph", "pageBreak", "paragraph", "pageBreak", "paragraph"]);
    expect(text(top[i + 2])).toBe("după");
    expect(text(top[i + 4])).toBe("Pagina nouă");
    expect(top[i].attrs?.segId).not.toBe(top[i + 2].attrs?.segId);
  });

  it("citește hiperlinkurile, tab-urile și întreruperile de rând", () => {
    const p = block(r.content, "Vezi");
    const link = textNode(p, "Portalul");
    expect(link.marks).toEqual([{ type: "link", attrs: { href: "https://legislatie.just.ro" } }]);
    expect(text(p)).toBe("Vezi Portalul\tdupă tab\nrând nou");
    expect(nodes(p, "hardBreak")).toHaveLength(1);
  });

  it("păstrează structura tabelului cu celule fuzionate", () => {
    const [table] = nodes(r.content, "table");
    const rows = table.content!;
    expect(rows).toHaveLength(4);
    expect(rows[0].content!.map((c) => c.type)).toEqual(["tableHeader", "tableHeader", "tableHeader"]);
    expect(rows[0].content!.map((c) => c.attrs?.colwidth)).toEqual([[100], [200], [300]]);
    expect(rows[1].content).toHaveLength(2);
    expect(rows[1].content![0].attrs).toMatchObject({ colspan: 2, rowspan: 1, colwidth: [100, 200] });
    expect(text(rows[1].content![0])).toBe("Fuzionat orizontal");
    expect(rows[2].content![0].attrs).toMatchObject({ colspan: 1, rowspan: 2 });
    expect(rows[2].content![2].attrs?.backgroundColor).toBe("#ffff00");
    expect(rows[3].content!.map(text)).toEqual(["B3", "C3"]);
    for (const c of nodes(table, "tableCell")) expect(c.content!.every((p) => p.type === "paragraph")).toBe(true);
  });

  it("pune antetul, subsolul și nota de subsol în meta și avertizează în română", () => {
    expect(text(r.meta.headers[0])).toBe("Antet — Societatea Exemplu SRL");
    expect(text(r.meta.footers[0])).toBe("Pagina ");
    expect(text(r.meta.footnotes[0].content)).toBe("Nota de subsol cu diacritice: ș, ț.");
    expect(r.warnings).toContain("Numerele de pagină automate nu au fost păstrate.");
    expect(new Set(r.warnings).size).toBe(r.warnings.length);
  });

  it("dă segId unic tuturor paragrafelor, inclusiv celor din tabele, anteturi și note", () => {
    const ids = allSegIds(r);
    expect(ids.every((id) => typeof id === "string" && id.length > 2)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("respinge fișierele care nu sunt DOCX", async () => {
    await expect(importDocx(Buffer.from("nu e zip"))).rejects.toThrow(/nu este un document Word/);
  });
});
