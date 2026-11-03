import { createHash } from "node:crypto";
import type { AiClient } from "../ai";
import { segmentsFromDoc } from "../document/segments";
import { DEFAULT_DOCUMENT_META, type DocNode, type DocumentMeta, type TiptapDoc } from "../document/types";
import type { PdfPageText, PdfTextItem } from "../report/annotated";
import type { DocSegment } from "../types";
import { UsageTracker, type UsageReport } from "../usage";
import { transcribePdfPages } from "./ocr";
import { layoutPdf, type PdfBlock, type PdfFontInfo, type PdfPageLayout } from "./pdf-layout";
import { segmentPdfPage } from "./pdf-segment";

/**
 * Extragerea textului din PDF pe server (pdf.js, aceeași segmentare ca în vizualizator), cu
 * recunoaștere optică (OCR, prin Claude) pentru paginile scanate sau cu strat de text deteriorat.
 * Documentul Tiptap păstrează formatarea dedusă din stratul de text (pdf-layout.ts).
 */

export interface PdfExtraction {
  segments: DocSegment[];
  /** stratul de text al fiecărei pagini (pentru documentul adnotat) */
  pages: PdfPageText[];
  pageCount: number;
  /** pagini cu prea puțin text (probabil scanate) */
  lowTextPages: number[];
  /** pagini al căror strat de text pare deteriorat (fonturi fără tabelă Unicode) */
  garbledPages: number[];
  /** stratul de text cu fonturile și dimensiunile paginilor (pentru reconstruirea formatării) */
  layout: PdfPageLayout[];
}

/** Numele și stilul fonturilor folosite pe pagină (disponibile după lista de operații a paginii). */
async function pageFonts(page: { getOperatorList(): Promise<unknown>; commonObjs: { has(id: string): boolean; get(id: string): unknown } }, items: unknown[], styles: Record<string, { fontFamily?: string }>): Promise<Record<string, PdfFontInfo>> {
  const names = new Set<string>();
  for (const it of items) if (it && typeof it === "object" && "fontName" in it && typeof it.fontName === "string") names.add(it.fontName);
  const fonts: Record<string, PdfFontInfo> = {};
  for (const n of names) fonts[n] = { generic: styles[n]?.fontFamily };
  try {
    await page.getOperatorList();
  } catch {
    return fonts; // fără nume de fonturi: rămâne doar familia generică
  }
  for (const n of names) {
    if (!page.commonObjs.has(n)) continue;
    const f = page.commonObjs.get(n) as { name?: unknown; bold?: unknown; italic?: unknown; black?: unknown } | null;
    if (!f) continue;
    fonts[n] = {
      ...fonts[n],
      name: typeof f.name === "string" ? f.name : undefined,
      bold: f.bold === true || f.black === true,
      italic: f.italic === true,
    };
  }
  return fonts;
}

export async function extractPdf(data: Uint8Array): Promise<PdfExtraction> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // pdf.js preia (și golește) bufferul: lucrăm pe o copie
  const task = pdfjs.getDocument({ data: new Uint8Array(data), verbosity: 0 });
  const doc = await task.promise;
  const segments: DocSegment[] = [];
  const pages: PdfPageText[] = [];
  const lowTextPages: number[] = [];
  const garbledPages: number[] = [];
  const layout: PdfPageLayout[] = [];
  try {
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const r = segmentPdfPage(tc.items, p);
      segments.push(...r.segments);
      pages.push({
        items: tc.items.map((it): PdfTextItem | null => ("str" in it ? { str: it.str, transform: it.transform, width: it.width, height: it.height } : null)),
        segments: r.segments.map((s) => ({ text: s.text, pdfItems: s.pdfItems })),
      });
      if (r.lowText) lowTextPages.push(p);
      else if (r.garbled) garbledPages.push(p);
      // fonturile cer lista de operații a paginii; paginile scanate o sar (imaginile ar fi decodate degeaba)
      const fonts = r.lowText ? {} : await pageFonts(page, tc.items, tc.styles);
      layout.push({ page: p, view: [...page.view], rotate: page.rotate, items: tc.items, fonts });
      page.cleanup();
    }
    return { segments, pages, pageCount: doc.numPages, lowTextPages, garbledPages, layout };
  } finally {
    await task.destroy();
  }
}

export interface ParsedPdf {
  kind: "pdf";
  fileName: string;
  fileSize: number;
  sha256: string;
  pageCount: number;
  /** segmentele analizei (cu pagina, calitatea textului și indicii din stratul de text) */
  segments: DocSegment[];
  /** documentul Tiptap, cu formatarea dedusă din stratul de text; segId = id-ul segmentului */
  doc: TiptapDoc;
  /** setările de pagină, valorile implicite (font, mărime, interlinie, spațiere), anteturile și subsolurile repetate */
  meta: DocumentMeta;
  /** stratul de text al paginilor (pentru documentul adnotat); segmentele sunt paragrafele documentului */
  pages: PdfPageText[];
  unreadablePages: number[];
  ocrPages: number[];
  warnings: string[];
  /** consumul recunoașterii optice */
  consumOcr?: UsageReport;
}

export interface ParsePdfOptions {
  /** recunoaștere optică pentru paginile fără text fiabil (implicit da) */
  ocr?: boolean;
  /** câte pagini se trimit cel mult la OCR */
  maxOcrPages?: number;
  ai?: AiClient;
  signal?: AbortSignal;
}

const MAX_OCR_PAGES = 60;

type OcrParagraph = { page: number; text: string; quality: DocSegment["quality"] };

export async function parsePdf(data: Uint8Array, fileName: string, opts: ParsePdfOptions = {}): Promise<ParsedPdf> {
  const ex = await extractPdf(data);
  const warnings: string[] = [];
  let unreadable: number[] = ex.lowTextPages;
  const ocrPages: number[] = [];
  const ocrParagraphs: OcrParagraph[] = [];
  let consumOcr: UsageReport | undefined;

  // pagini scanate + pagini cu strat de text deteriorat → recunoaștere optică
  const toOcr = [...ex.lowTextPages, ...ex.garbledPages].sort((a, b) => a - b);
  let stillGarbled = ex.garbledPages;
  if (toOcr.length && opts.ocr !== false) {
    const max = opts.maxOcrPages ?? MAX_OCR_PAGES;
    const selected = toOcr.slice(0, max);
    const usage = new UsageTracker();
    try {
      const pagini = await transcribePdfPages(data, selected, usage, opts.signal, opts.ai);
      for (const pg of pagini) {
        if (!pg.lizibil || pg.paragrafe.length === 0) continue;
        ocrPages.push(pg.pagina);
        // textul recunoscut înlocuiește stratul de text deteriorat al paginii
        for (const para of pg.paragrafe) {
          ocrParagraphs.push({ page: pg.pagina, text: para.text, quality: para.nesigur || /⟦/.test(para.text) ? "ocr_nesigur" : "ocr" });
        }
      }
      if (toOcr.length > max) warnings.push(`Paginile ${toOcr.slice(max).join(", ")} nu au fost recunoscute (limită OCR).`);
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      warnings.push(`Recunoașterea optică a textului a eșuat: ${e instanceof Error ? e.message : String(e)}`);
    }
    consumOcr = usage.report();
    unreadable = ex.lowTextPages.filter((p) => !ocrPages.includes(p));
    stillGarbled = ex.garbledPages.filter((p) => !ocrPages.includes(p));
  }
  if (stillGarbled.length) {
    warnings.push(
      `Textul paginilor ${stillGarbled.join(", ")} pare deteriorat (fonturi fără codare Unicode corectă). Caracterele ilizibile sunt marcate „�”; verdictele pe aceste pasaje trebuie verificate manual.`,
    );
  }
  ocrPages.sort((a, b) => a - b);

  // paragrafele cu formatare din paginile cu strat de text + paragrafele simple ale paginilor recunoscute optic
  const layout = layoutPdf(ex.layout.filter((l) => !ocrPages.includes(l.page)));
  type Entry = { page: number; node: DocNode; block?: PdfBlock; ocr?: OcrParagraph };
  const entries: Entry[] = [
    ...layout.blocks.map((b) => ({ page: b.page, node: b.node, block: b })),
    ...ocrParagraphs.map((o) => ({ page: o.page, node: { type: "paragraph", content: [{ type: "text", text: o.text }] }, ocr: o })),
  ].sort((a, b) => a.page - b.page);

  // anteturile și subsolurile au prefix propriu: după OCR corpul se renumerotează, iar setările documentului rămân
  const withId = (prefix: string) => (node: DocNode, i: number): DocNode => ({ ...node, attrs: { segId: `${prefix}${i + 1}`, ...node.attrs } });
  const content = entries.map((e, i) => withId("s")(e.node, i));
  const meta: DocumentMeta = {
    ...DEFAULT_DOCUMENT_META,
    page: layout.page ?? DEFAULT_DOCUMENT_META.page,
    defaults: layout.defaults,
    headers: layout.headers.length ? [layout.headers.map((b, i) => withId("antet")(b.node, i))] : [],
    footers: layout.footers.length ? [layout.footers.map((b, i) => withId("subsol")(b.node, i))] : [],
    footnotes: [],
  };
  const doc: TiptapDoc = { type: "doc", content };

  // segmentele derivă din document (același text ca blocurile), cu pagina, calitatea și pozițiile din PDF
  const info = new Map<string, Partial<DocSegment>>();
  entries.forEach((e, i) => {
    const id = content[i].attrs!.segId as string;
    if (e.ocr) info.set(id, { kind: "ocr", quality: e.ocr.quality, page: e.page });
    else if (e.block) {
      const garbled = e.block.pages.some((p) => stillGarbled.includes(p));
      info.set(id, { page: e.page, pdfItems: e.block.pdfItems, ...(garbled ? { quality: "ocr_nesigur" } : {}) });
    }
  });
  const segments = segmentsFromDoc(doc, { meta }).map((s) => ({ ...s, ...info.get(s.id) }));

  if (unreadable.length) warnings.push(`Pagini fără text lizibil: ${unreadable.join(", ")}. Trimiterile de pe aceste pagini nu au putut fi analizate.`);
  // fără OCR (la încărcare), paginile fără text așteaptă recunoașterea în worker: un PDF complet scanat
  // sau o planșă desenată nu are încă niciun paragraf, dar nu e o eroare
  if (segments.length === 0 && (opts.ocr !== false || !unreadable.length)) throw new Error("PDF-ul nu conține text care să poată fi citit.");

  // documentul adnotat potrivește segmentele cu stratul de text după pagină și text
  const pages: PdfPageText[] = ex.pages.map((pg, i) => ({
    items: pg.items,
    segments: layout.blocks.filter((b) => b.page === i + 1).map((b) => ({ text: b.text, pdfItems: b.pdfItems })),
  }));

  return {
    kind: "pdf",
    fileName,
    fileSize: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
    pageCount: ex.pageCount,
    segments,
    doc,
    meta,
    pages,
    unreadablePages: unreadable,
    ocrPages,
    warnings,
    consumOcr,
  };
}
