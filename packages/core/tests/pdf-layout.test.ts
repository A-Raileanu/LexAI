import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { blockText, segmentsFromDoc } from "../src/document/segments";
import type { DocNode } from "../src/document/types";
import { parsePdf } from "../src/parse/pdf";
import { fontStyle } from "../src/parse/pdf-layout";

/**
 * PDF-uri construite în test (pdf-lib, fonturile standard), cu formatare cunoscută: titluri,
 * îngroșat, cursiv, mărimi, aliniere, indentări, numerotarea paginilor și un paragraf care
 * continuă pe pagina următoare. Fonturile standard nu au ă/ș/ț, de aceea textul e fără ele.
 */

type FontKey = "regular" | "bold" | "italic" | "helvetica";
type Span = { text: string; font?: FontKey; size?: number };

interface ParaOpts {
  align?: "left" | "justify" | "center" | "right";
  firstIndent?: number;
  size?: number;
  /** distanța dintre liniile de bază */
  pitch?: number;
  spaceAfter?: number;
  /** după câte rânduri ale paragrafului se trece pe pagina următoare */
  breakAfterLine?: number;
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 72;

class Typesetter {
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  constructor(
    private pdf: PDFDocument,
    private fonts: Record<FontKey, PDFFont>,
    private furniture: { numbered?: "simplu" | "din"; header?: string },
  ) {
    this.newPage();
  }

  newPage() {
    this.page = this.pdf.addPage(A4);
    this.pages.push(this.page);
    this.y = A4[1] - MARGIN - 12;
    const { numbered, header } = this.furniture;
    if (numbered) {
      const n = numbered === "din" ? `Pagina ${this.pages.length} din 2` : String(this.pages.length);
      const w = this.fonts.regular.widthOfTextAtSize(n, 10);
      this.page.drawText(n, { x: (A4[0] - w) / 2, y: 40, size: 10, font: this.fonts.regular });
    }
    if (header) this.page.drawText(header, { x: MARGIN, y: A4[1] - 40, size: 9, font: this.fonts.italic });
  }

  para(spans: Span[], o: ParaOpts = {}) {
    const width = A4[0] - 2 * MARGIN;
    const words = spans.flatMap((s) => s.text.split(/\s+/).filter(Boolean).map((w) => ({ w, font: this.fonts[s.font ?? "regular"], size: s.size ?? o.size ?? 12 })));
    const lines: (typeof words)[] = [];
    let cur: typeof words = [];
    let used = o.firstIndent ?? 0;
    for (const word of words) {
      const ww = word.font.widthOfTextAtSize(word.w, word.size);
      const sp = cur.length ? word.font.widthOfTextAtSize(" ", word.size) : 0;
      if (cur.length && used + sp + ww > width) {
        lines.push(cur);
        cur = [];
        used = 0;
      }
      used += (cur.length ? word.font.widthOfTextAtSize(" ", word.size) : 0) + ww;
      cur.push(word);
    }
    if (cur.length) lines.push(cur);
    lines.forEach((line, i) => {
      const indent = i === 0 ? (o.firstIndent ?? 0) : 0;
      const widths = line.map((w) => w.font.widthOfTextAtSize(w.w, w.size));
      const space = line[0].font.widthOfTextAtSize(" ", line[0].size);
      const natural = widths.reduce((a, b) => a + b, 0) + space * (line.length - 1);
      const last = i === lines.length - 1;
      let x = MARGIN + indent;
      let gap = space;
      if (o.align === "justify" && !last && line.length > 1) gap = (width - indent - natural + space * (line.length - 1)) / (line.length - 1);
      if (o.align === "center") x = MARGIN + (width - natural) / 2;
      if (o.align === "right") x = MARGIN + width - natural;
      line.forEach((w, j) => {
        this.page.drawText(w.w, { x, y: this.y, size: w.size, font: w.font });
        x += widths[j] + gap;
      });
      this.y -= o.pitch ?? 14;
      if (o.breakAfterLine === i + 1) this.newPage();
    });
    this.y -= o.spaceAfter ?? 0;
  }
}

async function makePdf(build: (t: Typesetter) => void, furniture: { numbered?: "simplu" | "din"; header?: string } = {}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts = {
    regular: await pdf.embedFont(StandardFonts.TimesRoman),
    bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
    helvetica: await pdf.embedFont(StandardFonts.Helvetica),
  };
  build(new Typesetter(pdf, fonts, furniture));
  return pdf.save();
}

const LOREM =
  "Prin prezenta formulam intampinare impotriva cererii de chemare in judecata depuse de reclamanta, prin care aceasta solicita obligarea paratei la plata sumei de bani reprezentand pretul serviciilor prestate in baza contractului incheiat intre parti la data mentionata in cerere.";
const LOREM2 =
  "In fapt, intre parti a fost incheiat un contract de prestari servicii, iar reclamanta nu si-a indeplinit obligatiile asumate, astfel incat pretentiile sale sunt neintemeiate si urmeaza a fi respinse ca atare de catre instanta de judecata sesizata.";

const marksOf = (n: DocNode) => (n.content ?? []).flatMap((c) => (c.marks ?? []).map((m) => ({ text: c.text, ...m })));
const byText = (nodes: DocNode[], s: string) => {
  const n = nodes.find((b) => blockText(b).includes(s));
  if (!n) throw new Error(`lipsește blocul cu „${s}”`);
  return n;
};

describe("formatarea PDF-ului importat", () => {
  it("păstrează titlurile, îngroșatul, cursivul, mărimea, alinierea, indentarea și unește paragraful peste pagini", async () => {
    const data = await makePdf((t) => {
      t.para([{ text: "INTAMPINARE", font: "bold", size: 16 }], { align: "center", pitch: 30 });
      t.para([{ text: "CAPITOLUL I", font: "bold" }], { align: "center", pitch: 24 });
      t.para([{ text: "Subscrisa SC ALFA SRL," }, { text: "cu sediul in Bucuresti,", font: "bold" }, { text: LOREM }], { align: "justify", firstIndent: 36 });
      t.para([{ text: "Mentionam ca" }, { text: "termenul de prescriptie", font: "italic" }, { text: "nu a fost intrerupt. " + LOREM2 }], { align: "justify", firstIndent: 36 });
      t.para([{ text: "Nota: suma este exprimata in lei, fara TVA.", size: 10 }], { size: 10, pitch: 12, firstIndent: 36 });
      t.para([{ text: "Mentiune redactata in alt font, pentru verificarea familiei.", font: "helvetica" }], { firstIndent: 36 });
      t.para([{ text: LOREM2 + " " + LOREM }], { align: "justify", firstIndent: 36, breakAfterLine: 2 });
      t.para([{ text: "Bucuresti, 15 martie 2024" }], { align: "right" });
    }, { numbered: "simplu" });

    const parsed = await parsePdf(data, "intampinare.pdf", { ocr: false });
    const blocks = parsed.doc.content;
    const texts = blocks.map(blockText);

    // valorile implicite: fontul și mărimea corpului, interlinia, fără spațiu între paragrafe (despărțite prin indentare)
    expect(parsed.meta.defaults).toEqual({ fontFamily: "Times New Roman", fontSizePt: 12, lineHeight: 1.17, spaceAfterPt: 0 });
    expect(parsed.meta.page.size).toBe("A4");
    expect(parsed.meta.page.orientation).toBe("portrait");
    expect(parsed.meta.page.marginsMm.left).toBe(25);
    expect(parsed.meta.page.marginsMm.right).toBe(25);

    // titlurile
    expect(blocks[0]).toMatchObject({ type: "heading", attrs: { level: 1, textAlign: "center" } });
    expect(texts[0]).toBe("INTAMPINARE");
    expect(marksOf(blocks[0])).toEqual([
      { text: "INTAMPINARE", type: "bold" },
      { text: "INTAMPINARE", type: "textStyle", attrs: { fontSize: "16pt" } },
    ]);
    expect(blocks[1]).toMatchObject({ type: "heading", attrs: { level: 2, textAlign: "center" } });
    expect(texts[1]).toBe("CAPITOLUL I");

    // paragraful cu un pasaj îngroșat: aliniat stânga-dreapta, cu indentarea primului rând
    const p1 = byText(blocks, "Subscrisa SC ALFA SRL");
    expect(p1).toMatchObject({ type: "paragraph", attrs: { textAlign: "justify", firstLineIndentPt: 36 } });
    expect(blockText(p1)).toBe(`Subscrisa SC ALFA SRL, cu sediul in Bucuresti, ${LOREM}`);
    expect(marksOf(p1)).toEqual([{ text: "cu sediul in Bucuresti, ", type: "bold" }]);

    const p2 = byText(blocks, "termenul de prescriptie");
    expect(marksOf(p2)).toEqual([{ text: "termenul de prescriptie ", type: "italic" }]);

    // mărimea și familia diferite de cele ale corpului
    expect(marksOf(byText(blocks, "Nota: suma"))).toEqual([{ text: "Nota: suma este exprimata in lei, fara TVA.", type: "textStyle", attrs: { fontSize: "10pt" } }]);
    expect(marksOf(byText(blocks, "alt font"))).toEqual([
      { text: "Mentiune redactata in alt font, pentru verificarea familiei.", type: "textStyle", attrs: { fontFamily: "Arial" } },
    ]);
    // un paragraf de un rând, indentat cât primul rând al celorlalte
    expect(byText(blocks, "alt font").attrs).toMatchObject({ firstLineIndentPt: 36 });

    // paragraful continuă pe pagina 2: un singur bloc, cu bucăți de pe ambele pagini
    const cross = parsed.segments.find((s) => s.text.startsWith("In fapt") && s.text.endsWith("cerere."));
    expect(cross?.text).toBe(`${LOREM2} ${LOREM}`);
    expect(new Set(cross?.pdfItems?.map((i) => i.page))).toEqual(new Set([1, 2]));
    expect(cross?.page).toBe(1);

    // data aliniată la dreapta
    expect(byText(blocks, "Bucuresti, 15 martie").attrs).toMatchObject({ textAlign: "right" });

    // numerotarea paginilor nu ajunge în text, iar documentul nu are întreruperi de pagină
    expect(texts.some((t) => /^\s*\d+\s*$/.test(t))).toBe(false);
    expect(blocks.some((b) => b.type === "pageBreak")).toBe(false);
    expect(parsed.meta.footers).toEqual([]);

    // segId unic pe fiecare bloc; segmentele au exact textul blocurilor
    const ids = blocks.map((b) => b.attrs?.segId);
    expect(new Set(ids).size).toBe(blocks.length);
    expect(segmentsFromDoc(parsed.doc, { meta: parsed.meta }).map((s) => [s.id, s.text])).toEqual(parsed.segments.map((s) => [s.id, s.text]));
    expect(parsed.segments.find((s) => s.text === "INTAMPINARE")?.kind).toBe("titlu");
    // documentul adnotat găsește segmentele în stratul de text al paginilor
    expect(parsed.pages[0].segments.map((s) => s.text)).toContain(cross?.text);
  }, 30_000);

  it("text aliniat la stânga, cu spațiu între paragrafe: rândurile se unesc, cratima rămâne", async () => {
    const data = await makePdf((t) => {
      t.para([{ text: "Primul paragraf are mai multe randuri si se termina cu un proces-verbal incheiat la sediul societatii, in prezenta tuturor partilor interesate si a martorilor indicati in cuprinsul actului." }], { spaceAfter: 6 });
      t.para([{ text: "Al doilea paragraf este separat doar prin spatiul vertical dintre paragrafe, fara nicio indentare a primului rand, asa cum se intampla des in documentele redactate in Word." }], { spaceAfter: 6 });
      t.para([{ text: "Un rand scurt." }], { spaceAfter: 6 });
    });
    const parsed = await parsePdf(data, "stanga.pdf", { ocr: false });
    const texts = parsed.doc.content.map(blockText);
    expect(texts).toHaveLength(3);
    expect(texts[0]).toMatch(/^Primul paragraf .* martorilor indicati in cuprinsul actului\.$/);
    expect(texts[0]).not.toMatch(/\s{2}/);
    expect(texts[2]).toBe("Un rand scurt.");
    expect(parsed.meta.defaults.spaceAfterPt).toBe(6);
    // aliniat la stânga: fără textAlign, fără indentări, fără mark-uri (totul are fontul și mărimea implicite)
    for (const b of parsed.doc.content) {
      expect(b.type).toBe("paragraph");
      expect(Object.keys(b.attrs ?? {})).toEqual(["segId"]);
      expect(marksOf(b)).toEqual([]);
    }
  }, 30_000);

  it("mută antetul repetat în setările documentului și elimină „Pagina n din m”", async () => {
    const data = await makePdf(
      (t) => {
        t.para([{ text: LOREM }], { align: "justify", firstIndent: 36 });
        t.para([{ text: LOREM2 + " " + LOREM }], { align: "justify", firstIndent: 36, breakAfterLine: 1 });
        t.para([{ text: LOREM2 }], { align: "justify", firstIndent: 36 });
      },
      { numbered: "din", header: "Cabinet de avocat Ion Popescu - dosar nr. 123/3/2024" },
    );
    const parsed = await parsePdf(data, "antet.pdf", { ocr: false });
    const texts = parsed.doc.content.map(blockText);
    expect(texts).toEqual([LOREM, `${LOREM2} ${LOREM}`, LOREM2]);
    expect(parsed.meta.headers.map((h) => h.map(blockText))).toEqual([["Cabinet de avocat Ion Popescu - dosar nr. 123/3/2024"]]);
    expect(parsed.meta.footers).toEqual([]);
    // antetul rămâne în analiză, ca segment separat, cu segId diferit de cele ale corpului
    const antet = parsed.segments.find((s) => s.kind === "antet");
    expect(antet?.text).toBe("Cabinet de avocat Ion Popescu - dosar nr. 123/3/2024");
    expect(parsed.segments.filter((s) => s.id === antet?.id)).toHaveLength(1);
  }, 30_000);

  it("unește o cratimă de la capăt de rând fără spațiu", async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage(A4);
    const font = await pdf.embedFont(StandardFonts.TimesRoman);
    const lines = [
      "Partile au semnat un proces-verbal de receptie a lucrarilor, intocmit la sediul beneficiarului, si un proces-",
      "verbal de predare-primire a documentelor, ambele anexate la prezenta.",
    ];
    // primul rând ocupă toată lățimea coloanei (ca într-un paragraf aliniat stânga-dreapta)
    const size = 12;
    const w0 = font.widthOfTextAtSize(lines[0], size);
    page.drawText(lines[0], { x: 72, y: 700, size, font });
    page.drawText(lines[1], { x: 72, y: 686, size, font });
    page.drawText("Alt paragraf, cu un rand mai lung pentru a fixa marginea dreapta a coloanei de text.", { x: 72, y: 660, size, font });
    page.drawText("x".repeat(3), { x: 72 + w0 - font.widthOfTextAtSize("xxx", size), y: 640, size, font });
    const parsed = await parsePdf(await pdf.save(), "cratima.pdf", { ocr: false });
    expect(blockText(parsed.doc.content[0])).toBe(
      "Partile au semnat un proces-verbal de receptie a lucrarilor, intocmit la sediul beneficiarului, si un proces-verbal de predare-primire a documentelor, ambele anexate la prezenta.",
    );
  }, 30_000);
});

describe("stilul fontului din nume", () => {
  it("recunoaște îngroșatul, cursivul și familia", () => {
    expect(fontStyle({ name: "ABCDEF+TimesNewRomanPS-BoldMT" })).toEqual({ bold: true, italic: false, family: "Times New Roman" });
    expect(fontStyle({ name: "Arial-BoldItalicMT" })).toEqual({ bold: true, italic: true, family: "Arial" });
    expect(fontStyle({ name: "Calibri,Italic" })).toEqual({ bold: false, italic: true, family: "Calibri" });
    expect(fontStyle({ name: "Cambria-Bold" })).toMatchObject({ bold: true, family: "Cambria" });
    expect(fontStyle({ name: "CourierNewPSMT" })).toMatchObject({ bold: false, family: "Courier New" });
    expect(fontStyle({ name: "Helvetica" })).toMatchObject({ family: "Arial" });
    expect(fontStyle({ name: "Georgia" })).toMatchObject({ family: "Georgia" });
    expect(fontStyle({ name: "Verdana-Bold" })).toMatchObject({ bold: true, family: "Verdana" });
    // font necunoscut: familia generică din pdf.js
    expect(fontStyle({ name: "F1", generic: "sans-serif" })).toEqual({ bold: false, italic: false, family: "Arial" });
    expect(fontStyle({ name: "Roboto-Medium" })).toEqual({ bold: false, italic: false, family: undefined });
    expect(fontStyle({ name: "Calibri-Light", bold: false })).toMatchObject({ bold: false, family: "Calibri" });
  });
});
