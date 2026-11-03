import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { segmentsFromDoc, tablesFromDoc } from "../src/document/segments";
import type { DocNode } from "../src/document/types";
import { extractPdf, parsePdf } from "../src/parse/pdf";
import { numberSegments, segmentPdfPage } from "../src/parse/pdf-segment";
import { annotatePdf, annotatedTextDefinition, cutBelow, lineIntervals, orderNotes, type PdfPageText, type RenderPdf } from "../src/report/annotated";
import { keepTextBetween, textShows } from "../src/report/content-filter";
import type { AnalysisResult, DocSegment, Finding, ParsedDocument, VerdictStatus } from "../src/types";

const bytes = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const str = (b: Uint8Array) => String.fromCharCode(...b);

function finding(id: string, segmentId: string | null, citat: string, text: string, status: VerdictStatus = "eroare_citare", extra: Partial<Finding> = {}): Finding {
  const start = text.indexOf(citat);
  return {
    id,
    referenceId: id,
    citat,
    tipTrimitere: "explicita",
    afirmatie: citat,
    status,
    titlu: `Titlu ${id}`,
    explicatie: `Explicație ${id}`,
    anchors: segmentId ? [{ segmentId, start, end: start + citat.length, potrivire: "exacta" }] : [],
    verdictLaData: { status, data: "2024-03-15", rezumat: "" },
    sugestii: [],
    dovezi: [],
    ...extra,
  };
}

const result = (findings: Finding[]) => ({ findings, dataReferinta: "2024-03-15", dataVerificarii: "2026-11-01" }) as AnalysisResult;

describe("filtrarea textului pe benzi", () => {
  const content = [
    "q 1 0 0 1 0 100 cm",
    "BT /F1 12 Tf 14 TL 72 600 Td (Primul \\) rând) Tj T* [(Al doi) -20 (lea)] TJ ET",
    "Q",
    "BI /W 2 /H 1 /BPC 8 /CS /G ID \x00EI\xff EI",
    "BT 1 0 0 1 72 300 Tm (Jos) Tj 0 -14 Td (Mai jos) ' 1 2 (Ultimul) \" ET",
    "0 0 m 100 100 l S",
  ].join("\n");

  it("găsește operatorii de text cu linia lor de bază", () => {
    const shows = textShows(bytes(content));
    expect(shows.map((s) => s.y)).toEqual([700, 686, 300, 272, 258]);
    expect(str(bytes(content).subarray(shows[1].start, shows[1].end))).toBe("[(Al doi) -20 (lea)] TJ");
  });

  it("păstrează doar textul din bandă, cu grafica și imaginile neschimbate", () => {
    const shows = textShows(bytes(content));
    const top = str(keepTextBetween(bytes(content), shows, 650, 800));
    expect(top).toContain("(Primul \\) rând) Tj");
    expect(top).not.toContain("(Jos) Tj");
    // ' și " eliminate lasă trecerea la rândul următor
    expect(top).toMatch(/ T\* /);
    expect(top).toContain("1 Tw 2 Tc T*");
    expect(top).toContain("ID \x00EI\xff EI");
    expect(top).toContain("0 0 m 100 100 l S");
    const bottom = str(keepTextBetween(bytes(content), shows, 0, 650));
    expect(bottom).not.toContain("Primul");
    expect(bottom).toContain("(Mai jos) '");
  });
});

describe("tăierea paginii între rânduri", () => {
  it("unește rândurile suprapuse și taie la mijlocul spațiului liber", () => {
    const iv = lineIntervals([
      [700, 712],
      [680, 692],
      [690, 695],
      [600, 612],
    ]);
    expect(iv).toEqual([
      [600, 612],
      [680, 695],
      [700, 712],
    ]);
    expect(cutBelow(iv, 700)).toBe(697.5);
    // un punct în interiorul unui rând coboară sub tot rândul
    expect(cutBelow(iv, 685)).toBe(646);
    expect(cutBelow(iv, 600)).toBe(594);
  });
});

describe("note", () => {
  const segments: DocSegment[] = [
    { id: "s1", text: "Capitalul este de 200 lei, conform art. 11 din Legea nr. 31/1990.", kind: "paragraf", quality: "ok" },
    { id: "s2", text: "Asociat", kind: "tabel", quality: "ok" },
    { id: "s3", text: "Temei", kind: "tabel", quality: "ok" },
    { id: "s4", text: "Ion", kind: "tabel", quality: "ok" },
    { id: "s5", text: "art. 7 din Legea nr. 31/1990", kind: "tabel", quality: "ok" },
  ];
  const doc = { kind: "docx", fileName: "c.docx", segments } as ParsedDocument;
  const findings = [
    finding("f-tabel", "s5", "art. 7", segments[4].text, "corect"),
    finding("f-lipsa", null, "nu există", ""),
    finding("f-1", "s1", "art. 11 din Legea nr. 31/1990", segments[0].text),
    finding("f-dup", "s1", "Legea nr. 31/1990", segments[0].text, "corect", { preluatDin: "f-tabel" }),
  ];

  it("numerotează în ordinea din document, cu cele nelocalizate la final", () => {
    const notes = orderNotes(doc, result(findings));
    expect(notes.map((n) => n.finding.id)).toEqual(["f-1", "f-dup", "f-tabel", "f-lipsa"]);
    expect(notes.map((n) => n.n)).toEqual([1, 2, 3, 4]);
    expect(notes[1].sameAs).toBe(3);
    expect(notes[3].segment).toBeUndefined();
  });

  it("redă textul cu evidențieri, tabelele cu forma lor și notele sub paragraf", () => {
    const p = (segId: string, text: string): DocNode => ({ type: "paragraph", attrs: { segId }, content: [{ type: "text", text }] });
    const row = (...cells: DocNode[]): DocNode => ({ type: "tableRow", content: cells.map((c) => ({ type: "tableCell", content: [c] })) });
    const json = { type: "doc" as const, content: [p("s1", segments[0].text), { type: "table", content: [row(p("s2", "Asociat"), p("s3", "Temei")), row(p("s4", "Ion"), p("s5", segments[4].text))] }] };
    expect(segmentsFromDoc(json)).toEqual(segments);
    const tables = tablesFromDoc(json);
    expect(tables).toEqual([
      [
        [["s2"], ["s3"]],
        [["s4"], ["s5"]],
      ],
    ]);
    const def = annotatedTextDefinition(doc, result(findings), tables);
    const out = JSON.stringify(def.content);
    const order = ["art. 11 din Legea nr. 31/1990", "Titlu f-1", "Asociat", "Titlu f-tabel", "Titlu f-lipsa"].map((s) => out.indexOf(s));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(out).toContain("Aceeași trimitere ca la nota 3");
    expect(out).toContain('"widths":["*","*"]');
  });
});

describe("PDF adnotat", () => {
  it("păstrează paginile originale, pune nota sub paragraf și nu repetă textul", async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const original = readFileSync(new URL("./fixtures/memoriu-test.pdf", import.meta.url));
    const read = async (data: Uint8Array) => {
      const pdf = await pdfjs.getDocument({ data, verbosity: 0 }).promise;
      const pages: { text: string; tc: Awaited<ReturnType<Awaited<ReturnType<typeof pdf.getPage>>["getTextContent"]>> }[] = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        const tc = await (await pdf.getPage(p)).getTextContent();
        pages.push({ tc, text: tc.items.map((i) => ("str" in i ? i.str : "")).join(" ") });
      }
      return pages;
    };

    const pages = await read(new Uint8Array(original));
    const pageText: PdfPageText[] = pages.map(({ tc }, i) => ({
      items: tc.items.map((it) => ("str" in it ? { str: it.str, transform: it.transform, width: it.width, height: it.height } : null)),
      segments: segmentPdfPage(tc.items, i + 1).segments,
    }));
    const segments = numberSegments(pageText.flatMap((p) => p.segments.map(({ pdfItems: _i, ...s }) => (void _i, s as DocSegment))));
    const target = segments.find((s) => s.text.includes("art. 999"))!;
    const doc = { kind: "pdf", fileName: "memoriu-test.pdf", segments } as ParsedDocument;
    const r = result([finding("f1", target.id, "art. 999 din Legea nr. 31/1990", target.text, "eroare_citare", { titlu: "Articolul 999 nu există" })]);

    const { default: pdfmake } = (await import("pdfmake")) as unknown as { default: { addFonts(f: unknown): void; createPdf(d: unknown): { getBuffer(): Promise<Buffer> } } };
    const fonts = new URL("../node_modules/pdfmake/build/fonts/Roboto/", import.meta.url).pathname;
    pdfmake.addFonts({ Roboto: { normal: `${fonts}Roboto-Regular.ttf`, bold: `${fonts}Roboto-Medium.ttf`, italics: `${fonts}Roboto-Italic.ttf`, bolditalics: `${fonts}Roboto-MediumItalic.ttf` } });
    const render: RenderPdf = async (def) => new Uint8Array(await pdfmake.createPdf(def).getBuffer());

    const out = await read(await annotatePdf(new Uint8Array(original), pageText, doc, r, render));
    const all = out.map((p) => p.text).join("\n");
    expect(all.split("art. 999 din Legea").length - 1).toBe(1);
    expect(all.split("MEMORIU JURIDIC").length - 1).toBe(1);
    // nota apare după paragraful verificat și înaintea titlului următor
    const [para, note, next] = ["art. 999", "Articolul 999 nu există", "Raporturile de muncă"].map((s) => all.indexOf(s));
    expect(para).toBeGreaterThan(0);
    expect(note).toBeGreaterThan(para);
    expect(next).toBeGreaterThan(note);
  }, 30_000);
});

describe("extragerea textului din PDF pe server", () => {
  it("împarte paginile în segmente cu indicii stratului de text, fără OCR", async () => {
    const data = new Uint8Array(readFileSync(new URL("./fixtures/memoriu-test.pdf", import.meta.url)));
    const ex = await extractPdf(data);
    expect(ex.pageCount).toBe(ex.pages.length);
    expect(ex.segments.length).toBeGreaterThan(5);
    expect(ex.segments.every((s) => s.page && s.pdfItems?.length)).toBe(true);
    const parsed = await parsePdf(data, "memoriu-test.pdf", { ocr: false });
    expect(parsed.segments.map((s) => s.id).slice(0, 3)).toEqual(["s1", "s2", "s3"]);
    expect(parsed.segments.some((s) => s.text.includes("art. 999"))).toBe(true);
    expect(parsed.sha256).toMatch(/^[0-9a-f]{64}$/);
    // documentul Tiptap are același text, cu segId = id-ul segmentului
    expect(segmentsFromDoc(parsed.doc).map((s) => [s.id, s.text])).toEqual(parsed.segments.map((s) => [s.id, s.text]));
    // bufferul original rămâne utilizabil după extragere
    expect(data.length).toBeGreaterThan(1000);
  }, 30_000);
});
