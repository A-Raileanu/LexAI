import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import {
  BlendMode,
  PDFDocument,
  PDFName,
  PDFRawStream,
  StandardFonts,
  clip,
  concatTransformationMatrix,
  decodePDFRawStream,
  drawObject,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFEmbeddedPage,
  type PDFFont,
  type PDFPage,
  type PDFRef,
} from "pdf-lib";
import type { AnalysisResult, DocSegment, Finding, ParsedDocument, VerdictStatus } from "../types";
import { STATUS_META, STATUS_ORDER, fmtDate } from "../labels";
import { keepTextBetween, textShows } from "./content-filter";
import { suggestionSituation, suggestionsOf } from "../analysis/findings";

/**
 * Documentul adnotat: documentul verificat, cu pasajele evidențiate și, sub fiecare
 * paragraf, notele numerotate ale constatărilor.
 *
 * PDF: paginile originale se păstrează. Fiecare pagină e tăiată în benzi orizontale, între
 * rânduri, chiar sub paragrafele cu constatări; notele se așază între benzi, iar ce nu mai
 * încape trece pe o pagină de continuare. DOCX/DOC (și PDF-urile care nu pot fi tăiate):
 * textul e redat din segmente, cu aceleași evidențieri și note.
 */

/** culoarea fiecărei stări (insignele și textul notelor) */
export const STATUS_COLOR: Record<string, string> = {
  eroare_citare: "#c2410c",
  interpretare_discutabila: "#b45309",
  necesita_analiza_umana: "#7e22ce",
  neverificat: "#475569",
  corect: "#15803d",
};

/** Fontul Roboto nu are ⟦ ⟧ și caracterul de înlocuire; le redăm lizibil. */
export const t = (s: string | undefined | null) => (s ?? "").replace(/⟦/g, "[?").replace(/⟧/g, "]").replace(/�/g, "?");

/** culori de marker, aplicate prin înmulțire: textul de dedesubt rămâne negru */
const HIGHLIGHT: Record<VerdictStatus, string> = {
  eroare_citare: "#fed7aa",
  interpretare_discutabila: "#fef08a",
  necesita_analiza_umana: "#e9d5ff",
  neverificat: "#e2e8f0",
  corect: "#bbf7d0",
};
const MUTED = "#5b6275";
const NOTE_FILL = "#f6f7fa";
const NOTE_STYLE = { font: "Roboto", fontSize: 8.5, lineHeight: 1.2, color: "#1e2230" };
/** marginea folosită pe paginile de continuare și sub ultima notă de pe o pagină */
const MARGIN = 40;
/** extinderea verticală a unui rând față de linia de bază, în multipli ai înălțimii fontului */
const BELOW = 0.22;
const ABOVE = 0.82;

export type RenderPdf = (def: TDocumentDefinitions) => Promise<Uint8Array>;

// ───────────────────────── Note ─────────────────────────

export interface Note {
  n: number;
  finding: Finding;
  /** segmentul sub care apare nota; lipsește când citatul nu a fost găsit în document */
  segment?: DocSegment;
  /** nota de la care a fost preluat verdictul (aceeași trimitere în alt loc) */
  sameAs?: number;
}

const located = (f: Finding) => f.anchors.filter((a) => a.potrivire !== "negasita");

/** Notele, în ordinea în care apar pasajele în document; cele nelocalizate la final. */
export function orderNotes(doc: Pick<ParsedDocument, "segments">, r: Pick<AnalysisResult, "findings">): Note[] {
  const pos = new Map(doc.segments.map((s, i) => [s.id, i]));
  const key = (f: Finding) => {
    const a = located(f).find((x) => pos.has(x.segmentId));
    return a ? pos.get(a.segmentId)! * 1e6 + a.start : Number.MAX_SAFE_INTEGER;
  };
  const notes: Note[] = [...r.findings]
    .sort((a, b) => key(a) - key(b))
    .map((f, i) => {
      const a = located(f).find((x) => pos.has(x.segmentId));
      return { n: i + 1, finding: f, segment: a ? doc.segments[pos.get(a.segmentId)!] : undefined };
    });
  const byId = new Map(notes.map((n) => [n.finding.id, n.n]));
  for (const n of notes) if (n.finding.preluatDin) n.sameAs = byId.get(n.finding.preluatDin);
  return notes;
}

// spații fără întrerupere: numărul nu se desparte de pasajul evidențiat la capăt de rând
const badge = (n: number, status: VerdictStatus) => ({ text: `\u00a0${n}\u00a0`, color: "#ffffff", background: STATUS_COLOR[status], bold: true, fontSize: 7 });

function sources(f: Finding): Content[] {
  const seen = new Set<string>();
  return f.dovezi
    .filter((d) => d.validare === "confirmata" && !seen.has(d.evidence.url) && seen.add(d.evidence.url))
    .flatMap((d, i) => {
      const e = d.evidence;
      const name = e.act ? `${t(e.act.titlu)}${e.unitate ? `, ${t(e.unitate)}` : ""}` : t(e.unitate ?? "sursă oficială");
      return [i ? "; " : "", { text: `${name}${e.versiune?.data ? ` (forma din ${fmtDate(e.versiune.data)})` : ""}`, link: e.url }];
    });
}

function noteBox(stack: Content[], color: string): Content {
  return {
    table: { widths: ["*"], body: [[{ stack, margin: [7, 5, 7, 5], fillColor: NOTE_FILL, fontSize: NOTE_STYLE.fontSize, lineHeight: NOTE_STYLE.lineHeight }]] },
    layout: { hLineWidth: () => 0, vLineWidth: (i: number) => (i === 0 ? 2.5 : 0), vLineColor: () => color },
  };
}

/** Nota unei constatări; citatul se repetă doar când pasajul nu e evidențiat în pagină. */
export function noteContent(note: Note, showQuote: boolean): Content {
  const f = note.finding;
  const color = STATUS_COLOR[f.status];
  const line = (label: string, text: string | Content[], extra: Record<string, unknown> = {}): Content => ({
    text: [{ text: label, bold: true }, ...(typeof text === "string" ? [text] : text)],
    margin: [0, 2, 0, 0],
    ...extra,
  });
  const body: Content[] = [
    {
      text: [badge(note.n, f.status), "  ", { text: STATUS_META[f.status].label.toUpperCase(), color, bold: true, fontSize: 7 }, { text: `   ${t(f.titlu)}`, bold: true }],
      margin: [0, 0, 0, 3],
    },
  ];
  if (showQuote) body.push({ text: `„${t(f.citat)}”`, italics: true, color: MUTED, margin: [0, 0, 0, 2] });
  if (note.sameAs !== undefined) {
    body.push({ text: `Aceeași trimitere ca la nota ${note.sameAs}; verdictul a fost preluat de acolo.`, color: MUTED });
    return noteBox(body, color);
  }
  body.push({ text: t(f.explicatie) });
  if (f.verdictAstazi && f.verdictAstazi.status !== f.verdictLaData.status) {
    body.push(line(`Astăzi (${fmtDate(f.verdictAstazi.data)}): `, `${STATUS_META[f.verdictAstazi.status].label} — ${t(f.verdictAstazi.rezumat)}`));
  }
  const variants = suggestionsOf(f);
  variants.forEach((v, j) => {
    const kind = v.tip === "inlocuire" ? "Corectură" : "Propunere de revizuit";
    const situation = suggestionSituation(v, j, variants.length);
    body.push(
      line(`${kind}${situation ? ` (${t(situation)})` : ""}: `, v.textPropus
        ? ["înlocuiți „", { text: t(v.textOriginal), decoration: "lineThrough", color: "#b91c1c" }, "” cu „", { text: t(v.textPropus), color: "#15803d" }, "”"]
        : ["eliminați „", { text: t(v.textOriginal), decoration: "lineThrough", color: "#b91c1c" }, "”"]),
    );
  });
  if (f.sugestiiLipsa) body.push(line("Sugestie: ", "nicio corectură validă propusă automat; de redactat de un jurist.", { color: MUTED }));
  if (f.informatiiLipsa?.length) body.push(line("De lămurit: ", f.informatiiLipsa.map(t).join("; ")));
  if (f.retrogradat) body.push(line("Verdict retrogradat automat: ", `inițial ${STATUS_META[f.retrogradat.de].label.toLowerCase()}; ${t(f.retrogradat.motiv)}`, { color: "#9a3412" }));
  else if (f.motivNeverificare) body.push(line("Motivul neverificării: ", t(f.motivNeverificare), { color: "#9a3412" }));
  const src = sources(f);
  if (src.length) body.push(line("Sursa: ", src, { fontSize: 7.5, color: MUTED, margin: [0, 3, 0, 0] }));
  return noteBox(body, color);
}

function summaryContent(r: AnalysisResult): Content {
  const counts = STATUS_ORDER.map((s) => [s, r.findings.filter((f) => f.status === s).length] as const).filter(([, n]) => n);
  return noteBox(
    [
      { text: "Document adnotat de Legalis", bold: true, fontSize: 10.5 },
      {
        text: `Legea verificată în forma de la ${fmtDate(r.dataReferinta)} · verificare efectuată la ${fmtDate(r.dataVerificarii)} · ${r.findings.length} ${r.findings.length === 1 ? "trimitere" : "trimiteri"}`,
        color: MUTED,
        fontSize: 8,
      },
      { text: counts.flatMap(([s, n]) => [{ text: ` ${STATUS_META[s].scurt}: ${n} `, background: HIGHLIGHT[s] }, "   "]), margin: [0, 5, 0, 4] },
      {
        text: "Fiecare pasaj evidențiat are sub paragraf o notă cu același număr. Dovezile complete sunt în raportul Legalis. Rezultatele nu constituie consultanță juridică.",
        color: MUTED,
        fontSize: 7.5,
      },
    ],
    "#3740c0",
  );
}

const unlocatedHeading = (margin: [number, number, number, number]): Content => ({
  text: "Constatări al căror pasaj nu a fost găsit în document",
  bold: true,
  fontSize: 9.5,
  margin,
});

// ───────────────────────── PDF: paginile originale ─────────────────────────

export interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/** Stratul de text al unei pagini, citit din nou din PDF-ul original la generarea adnotărilor. */
export interface PdfPageText {
  /** bucățile pdf.js, în ordinea originală (null pentru elementele fără text), ca indicii din pdfItems să rămână valabili */
  items: (PdfTextItem | null)[];
  /** segmentele paginii, cu indicii bucăților (segmentPdfPage) */
  segments: { text: string; pdfItems?: DocSegment["pdfItems"] }[];
}

interface Rect {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  status: VerdictStatus;
  /** prima porțiune a unei ancore: aici se pune numărul notei */
  n?: number;
}

/** Poziția unei bucăți de text pe pagină, relativ la colțul paginii vizibile; null pentru textul rotit. */
function itemGeometry(it: PdfTextItem | null | undefined, origin: { x: number; y: number }) {
  if (!it || !it.str.trim()) return null;
  const [a, b, c, d, e, f] = it.transform;
  if (Math.abs(b) > 0.01 || Math.abs(c) > 0.01 || a <= 0) return null;
  const h = Math.abs(it.height || d) || 10;
  return { x: e - origin.x, base: f - origin.y, w: it.width, h };
}

/** Intervalele verticale ocupate de rânduri, unite și sortate crescător. */
export function lineIntervals(spans: [number, number][]): [number, number][] {
  const sorted = [...spans].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const [lo, hi] of sorted) {
    const last = out[out.length - 1];
    if (last && lo <= last[1]) last[1] = Math.max(last[1], hi);
    else out.push([lo, hi]);
  }
  return out;
}

/** Linia de tăiere sub un rând: la mijlocul spațiului liber până la rândul următor. */
export function cutBelow(intervals: [number, number][], y: number): number {
  for (const [lo, hi] of intervals) if (lo - 0.01 <= y && y <= hi + 0.01) y = lo;
  const next = intervals.filter(([, hi]) => hi < y).reduce<number | null>((m, [, hi]) => (m === null ? hi : Math.max(m, hi)), null);
  return next === null ? Math.max(0, y - 6) : (y + next) / 2;
}

/** Spațiile libere dintre rânduri (crescător), unde o bandă poate fi împărțită între pagini. */
function gaps(intervals: [number, number][]): number[] {
  return intervals.slice(1).map(([lo], i) => (intervals[i][1] + lo) / 2);
}

/**
 * Lățimea relativă a unui text, cu metricile Helvetica: o aproximare a fontului real, mult mai
 * bună decât numărul de caractere când un rând întreg e o singură bucată de text.
 */
function textWidth(font: PDFFont): (s: string) => number {
  const cache = new Map<string, number>();
  const char = (ch: string) => {
    let w = cache.get(ch);
    if (w === undefined) {
      const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "n";
      try {
        w = font.widthOfTextAtSize(base, 1);
      } catch {
        w = font.widthOfTextAtSize("n", 1); // caracter fără metrică în Helvetica
      }
      cache.set(ch, w);
    }
    return w;
  };
  return (s) => [...s].reduce((sum, ch) => sum + char(ch), 0);
}

const hex = (c: string) => rgb(parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255);

/** Paginile documentului de ieșire, completate de sus în jos. */
class Flow {
  page!: PDFPage;
  y = 0;
  fresh = true;
  W = 0;
  H = 0;
  constructor(private out: PDFDocument) {}
  start(W: number, H: number, top = H) {
    this.page = this.out.addPage([W, H]);
    [this.W, this.H, this.y, this.fresh] = [W, H, top, true];
  }
  continue() {
    this.start(this.W, this.H, this.H - MARGIN);
  }
}

export async function annotatePdf(
  original: Uint8Array,
  pages: PdfPageText[],
  doc: Pick<ParsedDocument, "fileName" | "segments">,
  r: AnalysisResult,
  render: RenderPdf,
): Promise<Uint8Array> {
  const src = await PDFDocument.load(original);
  const out = await PDFDocument.create();
  out.setTitle(`${doc.fileName} — adnotat Legalis`);
  out.setCreator("Legalis");
  const font = await out.embedFont(StandardFonts.HelveticaBold);
  const measure = textWidth(await out.embedFont(StandardFonts.Helvetica));
  const srcPages = src.getPages();
  if (srcPages.length !== pages.length) throw new Error("Stratul de text nu corespunde paginilor documentului.");

  const crop = srcPages.map((p) => p.getCropBox());
  const rotated = srcPages.map((p) => p.getRotation().angle % 360 !== 0);
  const geom = (page: number, item: number) => (rotated[page - 1] ? null : itemGeometry(pages[page - 1]?.items[item], crop[page - 1]));

  // segmentele analizei ↔ bucățile stratului de text, după pagină și text
  const queues = new Map<string, NonNullable<DocSegment["pdfItems"]>[]>();
  pages.forEach((pg, i) =>
    pg.segments.forEach((s) => {
      if (!s.pdfItems?.length) return;
      const k = `${i + 1}|${s.text}`;
      queues.set(k, [...(queues.get(k) ?? []), s.pdfItems]);
    }),
  );
  const segItems = new Map<string, NonNullable<DocSegment["pdfItems"]>>();
  for (const s of doc.segments) {
    if (s.kind === "ocr" || !s.page) continue;
    const items = queues.get(`${s.page}|${s.text}`)?.shift();
    if (items) segItems.set(s.id, items);
  }

  const intervals = pages.map((pg, i) =>
    lineIntervals(
      pg.items.flatMap((_, j) => {
        const g = geom(i + 1, j);
        return g ? [[g.base - BELOW * g.h, g.base + ABOVE * g.h] as [number, number]] : [];
      }),
    ),
  );
  // marginea stângă și lățimea textului, pentru așezarea notelor; paginile fără text o preiau de la cea anterioară
  const column: { left: number; width: number }[] = [];
  pages.forEach((pg, i) => {
    const xs = pg.items.flatMap((_, j) => {
      const g = geom(i + 1, j);
      return g ? [[g.x, g.x + g.w]] : [];
    });
    const W = crop[i].width;
    const prev = column[i - 1];
    if (!xs.length && prev && prev.left + prev.width <= W - 12) return column.push(prev);
    const left = xs.length ? Math.max(12, Math.min(...xs.map((x) => x[0]))) : 56;
    const right = xs.length ? Math.min(W - 12, Math.max(...xs.map((x) => x[1]))) : W - 56;
    const width = Math.max(Math.min(260, W - 24), right - left);
    column.push({ left: Math.min(left, W - 12 - width), width });
  });

  const notes = orderNotes(doc, r);
  const rects: Rect[][] = pages.map(() => []);
  /** pagina → linia de tăiere → notele de sub ea; -1: după ultima bandă a paginii */
  const after = pages.map(() => new Map<number, { note: Note; quote: boolean }[]>());
  const end: Note[] = [];
  const put = (page: number, cut: number, note: Note, quote: boolean) => {
    const m = after[page - 1];
    m.set(cut, [...(m.get(cut) ?? []), { note, quote }]);
  };

  for (const note of notes) {
    const f = note.finding;
    let first = true;
    for (const a of located(f)) {
      const items = segItems.get(a.segmentId);
      if (!items) continue;
      const parts: Rect[] = [];
      for (const it of items) {
        const s = Math.max(a.start, it.offset);
        const e = Math.min(a.end, it.offset + it.length);
        const g = geom(it.page, it.item);
        if (e <= s || !g || !it.length) continue;
        // poziția în rând după lățimea literelor, nu după numărul lor
        const str = pages[it.page - 1].items[it.item]!.str;
        const total = measure(str) || 1;
        const x0 = g.x + (g.w * measure(str.slice(0, s - it.offset))) / total;
        const x1 = g.x + (g.w * measure(str.slice(0, e - it.offset))) / total;
        const rect: Rect = { page: it.page, x: x0, y: g.base - BELOW * g.h, w: x1 - x0, h: (BELOW + ABOVE) * g.h, status: f.status };
        // bucățile alăturate de pe același rând devin un singur dreptunghi (fără suprapuneri mai închise la culoare)
        const prev = parts[parts.length - 1];
        if (prev && prev.page === rect.page && Math.abs(prev.y - rect.y) < 1 && rect.x <= prev.x + prev.w + 2) {
          prev.w = Math.max(prev.x + prev.w, rect.x + rect.w) - prev.x;
          prev.h = Math.max(prev.h, rect.h);
        } else parts.push(rect);
      }
      if (!parts.length) continue;
      if (first) parts[0].n = note.n;
      first = false;
      for (const p of parts) rects[p.page - 1].push(p);
    }

    const seg = note.segment;
    const items = seg && segItems.get(seg.id);
    if (!seg?.page) {
      end.push(note);
    } else if (!items || first) {
      // pasaj fără poziție pe pagină (text OCR, pagină rotită): nota apare la sfârșitul paginii, cu citatul
      put(seg.page, -1, note, true);
    } else {
      // sub ultimul rând al paragrafului
      const lastPage = Math.max(...items.map((it) => it.page));
      const bottoms = items.filter((it) => it.page === lastPage).flatMap((it) => {
        const g = geom(it.page, it.item);
        return g ? [g.base - BELOW * g.h] : [];
      });
      if (!bottoms.length) put(lastPage, -1, note, false);
      else put(lastPage, cutBelow(intervals[lastPage - 1], Math.min(...bottoms)), note, false);
    }
  }

  const renderNote = async (content: Content, width: number) => {
    const bytes = await render({ pageSize: { width, height: "auto" }, pageMargins: [0, 0, 0, 0], defaultStyle: NOTE_STYLE, content });
    const [emb] = await out.embedPdf(bytes);
    return emb;
  };

  const flow = new Flow(out);
  const placeNote = (emb: PDFEmbeddedPage, x: number) => {
    const h = emb.height;
    if (flow.y - h - 8 < MARGIN && !flow.fresh) flow.continue();
    // o notă mai înaltă decât pagina se micșorează
    const scale = Math.min(1, (flow.y - MARGIN) / (h + 8));
    flow.page.drawPage(emb, { x, y: flow.y - 4 - h * scale, width: emb.width * scale, height: h * scale });
    flow.y -= h * scale + 8;
    flow.fresh = false;
  };

  const drawBadge = (page: PDFPage, font: PDFFont, n: number, x: number, y: number, status: VerdictStatus) => {
    const label = String(n);
    const size = 6.5;
    page.drawCircle({ x, y, size: label.length > 1 ? 6.2 : 5.5, color: hex(STATUS_COLOR[status]) });
    page.drawText(label, { x: x - font.widthOfTextAtSize(label, size) / 2, y: y - size * 0.36, size, font, color: rgb(1, 1, 1) });
  };

  for (let i = 0; i < srcPages.length; i++) {
    const { x: cx, y: cy, width: W, height: H } = crop[i];
    const col = column[i];
    const notesAfter = after[i];

    if (rotated[i]) {
      // paginile rotite se copiază neschimbate; notele lor urmează pe pagina următoare
      const [copy] = await out.copyPages(src, [i]);
      out.addPage(copy);
      Object.assign(flow, { page: copy, W, H, y: 0, fresh: false });
      for (const { note } of [...notesAfter.values()].flat()) placeNote(await renderNote(noteContent(note, true), col.width), col.left);
      continue;
    }

    const bandForm = await bandForms(out, srcPages[i], { left: cx, bottom: cy, right: cx + W, top: cy + H });
    flow.start(W, H);
    if (i === 0) {
      flow.y = H - MARGIN * 0.6;
      placeNote(await renderNote(summaryContent(r), col.width), col.left);
    }

    const pageGaps = gaps(intervals[i]);
    const drawBand = (lo: number, hi: number) => {
      const h = hi - lo;
      const yb = flow.y - h;
      const page = flow.page;
      const name = page.node.newXObject("Banda", bandForm(lo + cy, hi + cy));
      page.pushOperators(pushGraphicsState(), rectangle(0, yb, W, h), clip(), endPath(), concatTransformationMatrix(1, 0, 0, 1, 0, yb - lo), drawObject(name), popGraphicsState());
      for (const rc of rects[i]) {
        const mid = rc.y + rc.h / 2;
        if (mid < lo || mid >= hi) continue;
        const y = yb + rc.y - lo;
        page.drawRectangle({ x: rc.x, y, width: rc.w, height: rc.h, color: hex(HIGHLIGHT[rc.status]), blendMode: BlendMode.Multiply });
        if (rc.n !== undefined) {
          const bx = col.left >= 20 ? col.left - 10 : Math.min(W - 8, rc.x + rc.w + 8);
          drawBadge(page, font, rc.n, bx, y + rc.h / 2, rc.status);
        }
      }
      flow.y = yb;
      flow.fresh = false;
    };
    const placeBand = (lo: number, hi: number) => {
      while (hi - lo > 0.5) {
        if (flow.fresh) flow.y = Math.max(flow.y, Math.min(hi, H));
        const floor = lo <= 0.5 ? 0 : MARGIN;
        if (hi - lo <= flow.y - floor) return drawBand(lo, hi);
        // cea mai mare porțiune de sus care încape, tăiată între rânduri
        const g = pageGaps.find((x) => x > lo && x < hi && hi - x <= flow.y - MARGIN);
        if (g !== undefined && hi - g >= 12) {
          drawBand(g, hi);
          hi = g;
          flow.continue();
        } else if (!flow.fresh) flow.continue();
        else return drawBand(lo, hi);
      }
    };

    const cuts = [...notesAfter.keys()].filter((c) => c > 0).sort((a, b) => b - a);
    let top = H;
    for (const c of [...cuts, 0]) {
      placeBand(c, top);
      top = c;
      const group = c > 0 ? notesAfter.get(c)! : [...(notesAfter.get(0) ?? []), ...(notesAfter.get(-1) ?? [])];
      for (const { note, quote } of group) placeNote(await renderNote(noteContent(note, quote), col.width), col.left);
    }
  }

  if (end.length) {
    const col = column[column.length - 1];
    placeNote(await renderNote(unlocatedHeading([0, 2, 0, 0]), col.width), col.left);
    for (const note of end) placeNote(await renderNote(noteContent(note, true), col.width), col.left);
  }
  return out.save();
}

/**
 * Pagina originală ca formular (XObject) pentru o bandă [lo, hi), în coordonatele paginii:
 * același conținut grafic, dar numai textul din bandă, ca textul să nu apară de mai multe
 * ori la căutare și copiere. Resursele paginii (fonturi, imagini) se copiază o singură dată.
 */
async function bandForms(out: PDFDocument, page: PDFPage, box: { left: number; bottom: number; right: number; top: number }) {
  const emb = await out.embedPage(page, box);
  await emb.embed();
  const form = out.context.lookup(emb.ref) as PDFRawStream; // creat de pdf-lib cu flateStream
  const content = decodePDFRawStream(form).decode();
  let shows: ReturnType<typeof textShows> | null = null;
  try {
    shows = textShows(content);
  } catch {
    // flux neobișnuit: benzile păstrează tot textul (corect vizual, dar repetat la căutare)
  }
  if (!shows) return () => emb.ref;
  const dict = form.dict;
  const entries = ["BBox", "Matrix", "Resources"].map((k) => [k, dict.get(PDFName.of(k))] as const);
  out.context.delete(emb.ref);
  return (lo: number, hi: number): PDFRef => {
    const band = out.context.flateStream(keepTextBetween(content, shows, lo, hi), { Type: "XObject", Subtype: "Form", FormType: 1 });
    for (const [k, v] of entries) if (v) band.dict.set(PDFName.of(k), v);
    return out.context.register(band);
  };
}

// ───────────────────────── Text redat din segmente ─────────────────────────

/** Paragraful cu pasajele evidențiate și numărul notei după fiecare pasaj. */
function segmentRuns(s: DocSegment, notes: Note[]): Content[] {
  const ranges = notes
    .flatMap((n) => located(n.finding).filter((a) => a.segmentId === s.id).map((a) => ({ start: a.start, end: a.end, n })))
    .sort((a, b) => a.start - b.start);
  const runs: Content[] = [];
  let pos = 0;
  const shown = new Set<number>();
  for (const r of ranges) {
    if (r.start < pos) continue;
    if (r.start > pos) runs.push(t(s.text.slice(pos, r.start)));
    runs.push({ text: t(s.text.slice(r.start, r.end)), background: HIGHLIGHT[r.n.finding.status] });
    if (!shown.has(r.n.n)) runs.push("\u00a0", badge(r.n.n, r.n.finding.status));
    shown.add(r.n.n);
    pos = r.end;
  }
  if (pos < s.text.length) runs.push(t(s.text.slice(pos)));
  return runs;
}

const KIND_STYLE: Partial<Record<DocSegment["kind"], Record<string, unknown>>> = {
  titlu: { bold: true, fontSize: 11.5, margin: [0, 8, 0, 4] },
  antet: { fontSize: 8.5, color: MUTED, margin: [0, 0, 0, 4] },
  subsol: { fontSize: 8.5, color: MUTED, margin: [0, 4, 0, 4] },
  nota: { fontSize: 8.5, margin: [0, 0, 0, 4] },
};

/**
 * Documentul redat din segmente, cu evidențieri și note sub paragrafe. `tables`: tabelele
 * documentului (`tablesFromDoc`), ca să-și păstreze rândurile și coloanele.
 */
export function annotatedTextDefinition(doc: Pick<ParsedDocument, "fileName" | "segments">, r: AnalysisResult, tables: string[][][][] = []): TDocumentDefinitions {
  const notes = orderNotes(doc, r);
  const bySeg = new Map<string, Note[]>();
  for (const n of notes) if (n.segment) bySeg.set(n.segment.id, [...(bySeg.get(n.segment.id) ?? []), n]);
  const segById = new Map(doc.segments.map((s) => [s.id, s]));
  const tableOf = new Map<string, string[][][]>();
  for (const tb of tables) for (const id of tb.flat(2)) tableOf.set(id, tb);

  const content: Content[] = [summaryContent(r), { text: "", margin: [0, 0, 0, 12] }];
  const done = new Set<string>();
  let page: number | undefined;
  for (const s of doc.segments) {
    if (done.has(s.id)) continue;
    if (s.page && s.page !== page) {
      if (page !== undefined) content.push({ text: `— pagina ${s.page} —`, alignment: "center", color: MUTED, fontSize: 8, margin: [0, 8, 0, 8] });
      page = s.page;
    }
    const tb = tableOf.get(s.id);
    if (tb) {
      const ids = tb.flat(2);
      ids.forEach((id) => done.add(id));
      const cols = Math.max(...tb.map((row) => row.length));
      const cell = (cellIds: string[]): Content => ({ stack: cellIds.filter((id) => segById.has(id)).map((id) => ({ text: segmentRuns(segById.get(id)!, notes) })) });
      content.push({
        table: {
          widths: Array(cols).fill("*"),
          body: tb.map((row) => [...row, ...Array<string[]>(cols - row.length).fill([])].map(cell)),
        },
        layout: { hLineColor: () => "#d5d9e3", vLineColor: () => "#d5d9e3", hLineWidth: () => 0.5, vLineWidth: () => 0.5 },
        fontSize: 9,
        margin: [0, 2, 0, 6],
      });
      for (const id of ids) for (const n of bySeg.get(id) ?? []) content.push({ stack: [noteContent(n, false)], margin: [0, 0, 0, 6] });
      continue;
    }
    content.push({ text: segmentRuns(s, notes), margin: [0, 0, 0, 6], ...(KIND_STYLE[s.kind] ?? {}) });
    for (const n of bySeg.get(s.id) ?? []) content.push({ stack: [noteContent(n, !located(n.finding).some((a) => a.segmentId === s.id))], margin: [0, 0, 0, 8] });
  }

  const end = notes.filter((n) => !n.segment);
  if (end.length) content.push(unlocatedHeading([0, 12, 0, 6]), ...end.map((n): Content => ({ stack: [noteContent(n, true)], margin: [0, 0, 0, 8] })));

  return {
    info: { title: `${doc.fileName} — adnotat Legalis`, creator: "Legalis" },
    pageSize: "A4",
    pageMargins: [56, 50, 56, 50],
    defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.3, color: "#1e2230" },
    footer: (current: number, total: number) => ({
      columns: [
        { text: `${doc.fileName} · adnotat Legalis`, fontSize: 7.5, color: MUTED },
        { text: `${current} / ${total}`, alignment: "right", fontSize: 7.5, color: MUTED },
      ],
      margin: [56, 18, 56, 0],
    }),
    content,
  };
}
