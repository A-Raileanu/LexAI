import { dataUrlOf, decodeDataUrl, displaySize, type ImageResolver } from "./image";
import { colorHex, firstFont, halfPoints, mergeMeta } from "./style";
import { HEADER_DISTANCE_MM, zoneForPage, type Block, type DocumentMeta, type JSONContent, type JSONMark } from "./types";

/**
 * JSON Tiptap → definiție pdfmake: documentul ca PDF, cât mai aproape de foaia din editor
 * (globals.css, `.lex-sheet`). Funcție pură: fonturile (ce familii există, metrici, glife) vin din
 * `PdfFonts`, implementat pe server cu fișierele de fonturi ale sistemului.
 *
 * Ca la exportul DOCX: sugestiile neacceptate se scriu ca în original (fără textul propus, cu textul
 * propus spre ștergere), iar placeholderele rămân `[● hint]` pe fundal galben deschis, ca să nu
 * treacă neobservate într-un document final. Imaginile (PNG și JPEG; pdfmake nu citește alte formate)
 * se așază pe rând propriu, între bucățile de text ale paragrafului.
 */

/** Nod pdfmake (tipurile pachetului pdfmake nu sunt dependență a acestui pachet). */
export type PdfNode = Record<string, unknown>;

export interface PdfNodeInfo {
  headlineLevel?: number;
  pageNumbers: number[];
}
interface PdfNodeQueries {
  getFollowingNodesOnPage(): unknown[];
  getNodesOnNextPage(): unknown[];
  getPreviousNodesOnPage(): unknown[];
}

export interface PdfDefinition {
  info: { title?: string; creator: string; producer: string };
  pageSize: "A4" | "LETTER";
  pageOrientation: "portrait" | "landscape";
  /** [stânga, sus, dreapta, jos], în pt */
  pageMargins: [number, number, number, number];
  defaultStyle: PdfNode;
  content: PdfNode[];
  header?: (page: number, pages: number) => PdfNode | null;
  footer?: (page: number, pages: number) => PdfNode | null;
  pageBreakBefore: (node: PdfNodeInfo, q: PdfNodeQueries) => boolean;
}

export interface PdfFonts {
  /** familia înregistrată în pdfmake pentru familia cerută (ex. „Calibri” → „Arial”) */
  resolve(family: string): string;
  /** (ascender − descender) / em, ca interlinia să fie, ca în CSS, multiplu al mărimii fontului */
  lineRatio(font: string): number;
  /** fontul are glifa? Dacă nu, caracterul se scrie cu `fallback` */
  hasGlyph(font: string, codePoint: number): boolean;
  /** fontul pentru caracterele care lipsesc din fontul cerut */
  fallback?: string;
}

export interface PdfOptions {
  fonts?: PdfFonts;
  /** „Pagina 2 din 5” în subsol */
  pageNumbers?: boolean;
  title?: string;
  /** octeții imaginilor după `src` (implicit, doar din data URL-uri) */
  image?: ImageResolver;
}

export const PT_PER_MM = 72 / 25.4;
const PX_TO_PT = 0.75;
/** marginea de lângă textul celulei (globals.css: `padding: 1pt 5.4pt`) */
const CELL_PAD = { x: 5.4, y: 1 };
const BORDER_PT = 0.5;
/** padding-inline-start al listelor */
const LIST_INDENT_PT = 36;
const HEADING_PT = [16, 14, 13, 12];
const LINK_COLOR = "#0563c1";
const PLACEHOLDER_BG = "#fff2b3";

// ───────────── fonturi ─────────────

// restul (Cambria, Garamond, Palatino, „serif” etc.) → serif
const SANS = /^(calibri|candara|segoe ui|helvetica( neue)?|liberation sans|open sans|roboto|aptos|carlito|lato|montserrat|source sans( pro| 3)?|noto sans|dejavu sans|inter|sf pro( text| display)?|system-ui|-apple-system)$/i;
const MONO = /^(consolas|menlo|monaco|courier|lucida console|liberation mono|dejavu sans mono|sf mono|monospace)$/i;

/**
 * Familia de folosit dintre cele disponibile: aceeași (fără diferență de majuscule), altfel una
 * echivalentă: sans → Arial, serif → Times New Roman, monospace → Courier New; necunoscute → serif.
 * Dacă nici aceea nu există, `fallback` (Roboto, inclus în pdfmake).
 */
export function pickFontFamily(requested: string, available: Iterable<string>, fallback = "Roboto"): string {
  const list = [...available];
  const find = (name: string) => list.find((f) => f.toLowerCase() === name.toLowerCase());
  const name = firstFont(requested) ?? "";
  const exact = find(name);
  if (exact) return exact;
  const lower = name.toLowerCase();
  const kind = MONO.test(name) || /mono|courier|code/.test(lower) ? "mono" : SANS.test(name) || /\bsans\b|grotesk|gothic/.test(lower) ? "sans" : "serif";
  const target = kind === "mono" ? "Courier New" : kind === "sans" ? "Arial" : "Times New Roman";
  return find(target) ?? find(fallback) ?? fallback;
}

/** Fonturi „ideale”: toate familiile există, cu metrici tipice. Pentru teste și pentru definiții fără server. */
export const identityFonts: PdfFonts = {
  resolve: (f) => firstFont(f) ?? "Times New Roman",
  lineRatio: () => 1.1,
  hasGlyph: () => true,
};

// ───────────── context ─────────────

interface Ctx {
  meta: DocumentMeta;
  fonts: PdfFonts;
  /** lățimea disponibilă pentru bloc, în pt */
  width: number;
  /** câte `ul` conțin blocul (disc → cerc → pătrat) */
  ulDepth: number;
  pendingBreak: boolean;
  image: ImageResolver;
}

interface BaseStyle {
  font: string;
  size: number;
  /** interlinia CSS (multiplicator al mărimii fontului) */
  lh: number;
  bold?: boolean;
  italics?: boolean;
}

/** Un bloc înainte de așezare: marginile verticale se comasează între frați, ca în CSS. */
interface Item {
  node: PdfNode;
  top: number;
  bottom: number;
  left?: number;
}

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const round = (n: number) => Math.round(n * 100) / 100;

/** interlinia pdfmake (multiplu al înălțimii naturale a fontului) pentru o interlinie CSS */
const pdfLineHeight = (ctx: Ctx, font: string, cssLh: number) => round(cssLh / (ctx.fonts.lineRatio(font) || 1.15));

// ───────────── text ─────────────

function runStyle(marks: JSONMark[], base: BaseStyle, ctx: Ctx): PdfNode {
  const s: PdfNode = {};
  let font = base.font;
  let size = base.size;
  const decoration: string[] = [];
  let link: string | undefined;
  for (const m of marks) {
    const a = m.attrs ?? {};
    switch (m.type) {
      case "bold":
        s.bold = true;
        break;
      case "italic":
        s.italics = true;
        break;
      case "underline":
        decoration.push("underline");
        break;
      case "strike":
        decoration.push("lineThrough");
        break;
      case "subscript":
        s.sub = true;
        break;
      case "superscript":
        s.sup = true;
        break;
      case "link":
        if (typeof a.href === "string" && a.href) link = a.href;
        break;
      case "textStyle": {
        const family = firstFont(a.fontFamily);
        if (family) font = ctx.fonts.resolve(family);
        const hp = halfPoints(a.fontSize);
        if (hp) size = hp / 2;
        const color = colorHex(a.color);
        if (color) s.color = `#${color}`;
        const bg = colorHex(a.backgroundColor);
        if (bg) s.background = `#${bg}`;
        break;
      }
      case "highlight":
        s.background = `#${colorHex(a.color) ?? "FFFF00"}`;
        break;
    }
  }
  if (link) {
    // legăturile interne (#…) n-au țintă în PDF: rămân doar stilizate
    if (!link.startsWith("#")) s.link = link;
    if (!decoration.includes("underline")) decoration.push("underline");
    if (!s.color) s.color = LINK_COLOR;
  }
  if (decoration.length) s.decoration = decoration.length === 1 ? decoration[0] : decoration;
  s.font = font;
  s.fontSize = size;
  s.lineHeight = pdfLineHeight(ctx, font, base.lh);
  return s;
}

/** Textul împărțit pe fonturi: caracterele fără glifă în fontul cerut trec pe fontul de rezervă. */
function withGlyphFallback(text: string, style: PdfNode, cssLh: number, ctx: Ctx): PdfNode[] {
  const font = style.font as string;
  const fallback = ctx.fonts.fallback;
  if (!fallback || fallback === font) return [{ ...style, text }];
  const alt = { ...style, font: fallback, lineHeight: pdfLineHeight(ctx, fallback, cssLh) };
  const out: PdfNode[] = [];
  let cur = "";
  let curMissing = false;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    // spațiile și caracterele de control rămân în fontul cerut
    const missing = cp > 0x20 && !ctx.fonts.hasGlyph(font, cp) && ctx.fonts.hasGlyph(fallback, cp);
    if (cur && missing !== curMissing) {
      out.push({ ...(curMissing ? alt : style), text: cur });
      cur = "";
    }
    curMissing = missing;
    cur += ch;
  }
  if (cur) out.push({ ...(curMissing ? alt : style), text: cur });
  return out;
}

function inlines(nodes: JSONContent[] | undefined, base: BaseStyle, ctx: Ctx): PdfNode[] {
  const out: PdfNode[] = [];
  for (const n of nodes ?? []) {
    const marks = n.marks ?? [];
    if (marks.some((m) => m.type === "suggestInsert")) continue;
    if (n.type === "hardBreak") {
      out.push({ ...runStyle([], base, ctx), text: "\n" });
      continue;
    }
    if (n.type !== "text" || !n.text) continue;
    const style = runStyle(marks, base, ctx);
    let text = n.text;
    const ph = marks.find((m) => m.type === "placeholder");
    if (ph) {
      const hint = typeof ph.attrs?.hint === "string" ? ph.attrs.hint : text.replace(/^\[●\s?|\]$/g, "");
      text = `[● ${hint}]`;
      style.background = PLACEHOLDER_BG;
    }
    // tab-urile: ca în editor (white-space: pre-wrap), aproximate cu spații nedespărțitoare
    text = text.replace(/\t/g, "    ");
    out.push(...withGlyphFallback(text, style, base.lh, ctx));
  }
  return out;
}

// ───────────── blocuri ─────────────

function takeBreak(ctx: Ctx, node: PdfNode): PdfNode {
  if (ctx.pendingBreak) {
    ctx.pendingBreak = false;
    node.pageBreak = "before";
  }
  return node;
}

interface ParaPlace {
  /** paragraf dintr-un element de listă sau ultimul dintr-o celulă: fără margine implicită */
  inList?: boolean;
  lastInCell?: boolean;
}

function paragraph(n: JSONContent, ctx: Ctx, place: ParaPlace = {}): Item {
  const a = n.attrs ?? {};
  const d = ctx.meta.defaults;
  const level = n.type === "heading" ? Math.min(Math.max(isNum(a.level) ? Math.round(a.level) : 1, 1), 4) : 0;
  const base: BaseStyle = {
    font: ctx.fonts.resolve(d.fontFamily),
    size: level ? HEADING_PT[level - 1] : d.fontSizePt,
    lh: isNum(a.lineHeight) && a.lineHeight > 0 ? a.lineHeight : level ? 1.15 : d.lineHeight,
    bold: level ? true : undefined,
    italics: level === 4 ? true : undefined,
  };
  const textNode = (runs: PdfNode[]): PdfNode => ({
    // paragraful gol are înălțimea unui rând (în editor: min-height 1em + <br>)
    text: runs.length ? runs : [{ ...runStyle([], base, ctx), text: " " }],
    font: base.font,
    fontSize: base.size,
    lineHeight: pdfLineHeight(ctx, base.font, base.lh),
  });
  let node: PdfNode;
  if (n.content?.some((c) => c.type === "image")) {
    // pdfmake nu are imagini în rândul de text: un rând scurt (ex. sigla și numele societății) se
    // așază pe coloane, cu textul pe linia de jos a imaginii, ca în Word; altfel, pe rânduri separate
    const stack: PdfNode[] = [];
    let chunk: JSONContent[] = [];
    let chars = 0;
    const flush = () => {
      const runs = inlines(chunk, base, ctx);
      if (runs.some((r) => typeof r.text === "string" && r.text.trim())) {
        stack.push(textNode(runs));
        chars += chunk.reduce((n, c) => n + (c.text?.length ?? 0), 0);
      }
      chunk = [];
    };
    for (const c of n.content) {
      if (c.type !== "image") {
        chunk.push(c);
        continue;
      }
      flush();
      const img = typeof c.attrs?.src === "string" ? ctx.image(c.attrs.src) : undefined;
      if (!img || (img.ext !== "png" && img.ext !== "jpg") || c.marks?.some((mk) => mk.type === "suggestInsert")) continue;
      const size = displaySize(c.attrs, img, ctx.width / PX_TO_PT);
      const align = typeof a.textAlign === "string" && ["center", "right"].includes(a.textAlign) ? a.textAlign : undefined;
      stack.push({ image: dataUrlOf(img), width: round(size.width * PX_TO_PT), height: round(size.height * PX_TO_PT), ...(align ? { alignment: align } : {}) });
    }
    flush();
    const imgs = stack.filter((x) => x.image);
    const imgW = imgs.reduce((w, x) => w + (x.width as number), 0);
    const imgH = Math.max(0, ...imgs.map((x) => x.height as number));
    const lineH = base.size * base.lh;
    if (stack.length > 1 && imgs.length && chars * base.size * 0.55 + imgW <= ctx.width) {
      const columns = stack.map((x) => (x.image ? { ...x, alignment: undefined } : { ...x, width: "auto", margin: [0, round(Math.max(0, imgH - lineH)), 0, 0] }));
      node = { columns, columnGap: 0 };
    } else node = stack.length ? { stack } : textNode([]);
  } else node = textNode(inlines(n.content, base, ctx));
  if (base.bold) node.bold = true;
  if (base.italics) node.italics = true;
  if (level) node.headlineLevel = level;
  if (typeof a.textAlign === "string" && ["left", "center", "right", "justify"].includes(a.textAlign)) node.alignment = a.textAlign;
  if (isNum(a.firstLineIndentPt) && a.firstLineIndentPt > 0) node.leadingIndent = a.firstLineIndentPt;
  // globals.css: titlurile 12 pt / 6 pt; `li > p` și ultimul `p` din celulă fără margine
  const defTop = level ? 12 : 0;
  const defBottom = level ? 6 : place.inList || place.lastInCell ? 0 : d.spaceAfterPt;
  return {
    node: takeBreak(ctx, node),
    top: isNum(a.spaceBeforePt) ? a.spaceBeforePt : defTop,
    bottom: isNum(a.spaceAfterPt) ? a.spaceAfterPt : defBottom,
    left: isNum(a.indentPt) && a.indentPt > 0 ? a.indentPt : 0,
  };
}

/** Marcajul listei, ca în browser: în afara textului, aliniat la dreapta în spațiul de 36 pt. */
/** a, b, …, z, aa, ab, … (ca în Word) */
export function letterOf(index: number): string {
  let n = Math.max(1, index);
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

function marker(ordered: boolean, index: number, ctx: Ctx, letters = false): PdfNode {
  const d = ctx.meta.defaults;
  const font = ctx.fonts.resolve(d.fontFamily);
  const size = d.fontSizePt;
  const gap = round(size * 0.3);
  if (ordered) {
    return { width: LIST_INDENT_PT, text: letters ? `${letterOf(index)})` : `${index}.`, alignment: "right", margin: [0, 0, gap, 0], font, fontSize: size, lineHeight: pdfLineHeight(ctx, font, d.lineHeight) };
  }
  // bulinele se desenează (disc, cerc, pătrat), ca să nu depindă de glifele fontului
  const r = round(size * 0.16);
  // pdfmake așază textul cu ascendentul sus (≈ 80 % din înălțimea naturală); buline la mijlocul lui „x”
  const cy = round(size * ((ctx.fonts.lineRatio(font) || 1.15) * 0.8 - 0.24));
  const cx = round(LIST_INDENT_PT - gap - r);
  const style = Math.min(ctx.ulDepth, 3);
  const shape =
    style === 1
      ? { type: "ellipse", x: cx, y: cy, r1: r, r2: r, color: "#000000" }
      : style === 2
        ? { type: "ellipse", x: cx, y: cy, r1: r * 0.9, r2: r * 0.9, lineColor: "#000000", lineWidth: 0.6 }
        : { type: "rect", x: cx - r, y: cy - r, w: r * 2, h: r * 2, color: "#000000" };
  return { width: LIST_INDENT_PT, stack: [{ canvas: [shape] }] };
}

function list(n: JSONContent, ctx: Ctx): Item {
  const ordered = n.type === "orderedList";
  const start = ordered && isNum(n.attrs?.start) ? Math.round(n.attrs.start) : 1;
  const sub: Ctx = { ...ctx, width: Math.max(36, ctx.width - LIST_INDENT_PT), ulDepth: ordered ? ctx.ulDepth : ctx.ulDepth + 1, pendingBreak: false };
  const items = (n.content ?? []).map((item, i) => {
    const inner = item.type === "listItem" ? (item.content ?? []) : [item];
    return {
      columns: [marker(ordered, start + i, sub, ordered && n.attrs?.type === "a"), { width: "*", stack: collapse(blocks(inner, sub, { inList: true })) }],
      columnGap: 0,
    };
  });
  return { node: takeBreak(ctx, { stack: items }), top: 0, bottom: 0 };
}

function table(n: JSONContent, ctx: Ctx): Item | undefined {
  const rowsJson = (n.content ?? []).filter((r) => r.type === "tableRow" && r.content?.length);
  if (!rowsJson.length) return undefined;

  // așezarea pe grilă, ca la DOCX: coloana fiecărei celule, ținând cont de fuziunile verticale
  const coveredUntil: number[] = [];
  const widths: (number | undefined)[] = [];
  const placed = rowsJson.map((r, ri) => {
    let col = 0;
    return (r.content ?? []).map((c) => {
      while ((coveredUntil[col] ?? -1) >= ri) col++;
      const span = Math.max(1, isNum(c.attrs?.colspan) ? Math.round(c.attrs.colspan) : 1);
      const rowspan = Math.min(Math.max(isNum(c.attrs?.rowspan) ? Math.round(c.attrs.rowspan) : 1, 1), rowsJson.length - ri);
      const cw = Array.isArray(c.attrs?.colwidth) ? (c.attrs.colwidth as unknown[]) : [];
      for (let k = 0; k < span; k++) {
        const w = cw[k];
        if (isNum(w) && w > 0 && widths[col + k] === undefined) widths[col + k] = w;
        coveredUntil[col + k] = ri + rowspan - 1;
      }
      const cell = { node: c, col, span, rowspan };
      col += span;
      return cell;
    });
  });
  const ncols = Math.max(coveredUntil.length, widths.length, 1);

  // lățimile: din `colwidth` (px), restul împart spațiul rămas; tabelul nu depășește foaia
  const frame = CELL_PAD.x * 2 + BORDER_PT;
  let colPt: (number | undefined)[] = Array.from({ length: ncols }, (_, i) => (widths[i] !== undefined ? widths[i]! * PX_TO_PT : undefined));
  const known = colPt.reduce<number>((s, w) => s + (w ?? 0), 0);
  const missing = colPt.filter((w) => w === undefined).length;
  if (!missing && known > ctx.width) colPt = colPt.map((w) => (w! * ctx.width) / known);
  else if (missing && known > ctx.width - missing * 24) {
    const scale = Math.max(0.1, (ctx.width - missing * 24) / known);
    colPt = colPt.map((w) => (w === undefined ? undefined : w * scale));
  }
  const fill = missing ? (ctx.width - colPt.reduce<number>((s, w) => s + (w ?? 0), 0)) / missing : 0;
  const outer = colPt.map((w) => w ?? fill);
  const pdfWidths = colPt.map((w) => (w === undefined ? "*" : round(Math.max(4, w - frame))));

  const body: PdfNode[][] = rowsJson.map(() => Array.from({ length: ncols }, () => ({})));
  placed.forEach((cells, ri) =>
    cells.forEach(({ node, col, span, rowspan }) => {
      if (col >= ncols) return;
      const inner = Math.max(12, outer.slice(col, col + span).reduce((s, w) => s + w, 0) - frame);
      const sub: Ctx = { ...ctx, width: inner, pendingBreak: false };
      const cell: PdfNode = { stack: collapse(blocks(node.content, sub, {}, true)) };
      if (span > 1) cell.colSpan = Math.min(span, ncols - col);
      if (rowspan > 1) cell.rowSpan = rowspan;
      const bg = colorHex(node.attrs?.backgroundColor);
      if (bg) cell.fillColor = `#${bg}`;
      if (node.type === "tableHeader") cell.bold = true;
      body[ri][col] = cell;
    }),
  );

  const headerRows = rowsJson[0].content!.every((c) => c.type === "tableHeader") && rowsJson.length > 1 ? 1 : 0;
  const t: PdfNode = {
    table: { widths: pdfWidths, body, ...(headerRows ? { headerRows } : {}) },
    layout: {
      hLineWidth: () => BORDER_PT,
      vLineWidth: () => BORDER_PT,
      hLineColor: () => "#000000",
      vLineColor: () => "#000000",
      paddingLeft: () => CELL_PAD.x,
      paddingRight: () => CELL_PAD.x,
      paddingTop: () => CELL_PAD.y,
      paddingBottom: () => CELL_PAD.y,
    },
  };
  // .tableWrapper { margin: 6pt 0 }
  return { node: takeBreak(ctx, t), top: 6, bottom: 6 };
}

function blocks(nodes: Block[] | undefined, ctx: Ctx, place: ParaPlace = {}, inCell = false): Item[] {
  const out: Item[] = [];
  const list_ = nodes ?? [];
  list_.forEach((n, i) => {
    const last = inCell && i === list_.length - 1;
    switch (n.type) {
      case "paragraph":
      case "heading":
        out.push(paragraph(n, ctx, { ...place, lastInCell: last }));
        break;
      case "bulletList":
      case "orderedList":
        out.push(list(n, ctx));
        break;
      case "table": {
        const t = table(n, ctx);
        if (t) out.push(t);
        break;
      }
      case "pageBreak":
        ctx.pendingBreak = true;
        break;
      case "horizontalRule":
        // hr: o linie de 1 px, apoi 6 pt
        out.push({ node: takeBreak(ctx, { canvas: [{ type: "line", x1: 0, y1: 0.4, x2: round(ctx.width), y2: 0.4, lineWidth: 0.75, lineColor: "#000000" }] }), top: 0, bottom: 6 });
        break;
      default:
        // noduri necunoscute: conținut inline → paragraf, altfel blocurile din interior
        if (n.content?.some((c) => c.type === "text" || c.type === "hardBreak")) out.push(paragraph({ ...n, type: "paragraph" }, ctx, { ...place, lastInCell: last }));
        else out.push(...blocks(n.content, ctx, place, inCell));
    }
  });
  return out;
}

/** Marginile verticale între frați se comasează (max, nu sumă), ca în CSS. */
function collapse(items: Item[]): PdfNode[] {
  let prevBottom = 0;
  return items.map((it, i) => {
    const top = i === 0 ? it.top : Math.max(0, it.top - prevBottom);
    prevBottom = it.bottom;
    return { ...it.node, margin: [round(it.left ?? 0), round(top), 0, round(it.bottom)] };
  });
}

// ───────────── documentul ─────────────

export function buildPdfDefinition(content: JSONContent, meta?: Partial<DocumentMeta>, opts: PdfOptions = {}): PdfDefinition {
  const m = mergeMeta(meta);
  const fonts = opts.fonts ?? identityFonts;
  const landscape = m.page.orientation === "landscape";
  const base = m.page.size === "Letter" ? { w: 612, h: 792 } : { w: 595.28, h: 841.89 };
  const pageW = landscape ? base.h : base.w;
  const mg = m.page.marginsMm;
  const margins: [number, number, number, number] = [mg.left, mg.top, mg.right, mg.bottom].map((v) => round(Math.max(0, v) * PT_PER_MM)) as [number, number, number, number];
  const width = Math.max(72, pageW - margins[0] - margins[2]);
  const ctx: Ctx = { meta: m, fonts, width, ulDepth: 0, pendingBreak: false, image: opts.image ?? decodeDataUrl };

  const items = blocks(content.type === "doc" || !content.type ? content.content : [content], ctx);

  // notele de subsol: contractul nu păstrează locul trimiterii, deci (ca la DOCX) stau la final
  if (m.footnotes.length) {
    items.push({ node: { canvas: [{ type: "line", x1: 0, y1: 0, x2: round(width / 3), y2: 0, lineWidth: 0.5, lineColor: "#000000" }] }, top: 12, bottom: 4 });
    m.footnotes.forEach((f, i) => {
      const sub: Ctx = { ...ctx, meta: { ...m, defaults: { ...m.defaults, fontSizePt: Math.max(8, m.defaults.fontSizePt - 2), spaceAfterPt: 2 } }, pendingBreak: false };
      const paras = blocks(f.content, sub);
      const first = paras[0]?.node;
      if (!first) return;
      if (Array.isArray(first.text)) first.text = [{ text: `${i + 1}. ` }, ...(first.text as PdfNode[])];
      items.push(...paras);
    });
  }

  // antetul și subsolul se construiesc din nou pe fiecare pagină: pdfmake modifică nodurile la așezare
  const zone = (b: Block[] | undefined): PdfNode[] => (b?.length ? collapse(blocks(b, { ...ctx, pendingBreak: false })) : []);
  const pageZone = (key: "headers" | "footers", page: number) => zone(zoneForPage(m, key, page));
  const hasHeader = m.headers.some((h) => h.length);
  const hasFooter = m.footers.some((f) => f.length);
  const font = fonts.resolve(m.defaults.fontFamily);
  const lineH = m.defaults.fontSizePt * m.defaults.lineHeight;
  // înălțimea aproximativă a unei zone: un rând pe bloc de text, plus înălțimea imaginilor
  const zoneHeight = (nodes: PdfNode[]): number =>
    nodes.reduce<number>((h, n) => h + (Array.isArray(n.stack) ? zoneHeight(n.stack as PdfNode[]) : isNum(n.height) ? n.height : lineH), 0);
  const headerDist = (m.page.headerMm ?? HEADER_DISTANCE_MM) * PT_PER_MM;
  const footerDist = (m.page.footerMm ?? HEADER_DISTANCE_MM) * PT_PER_MM;

  const def: PdfDefinition = {
    info: { ...(opts.title ? { title: opts.title } : {}), creator: "LexAI", producer: "LexAI" },
    pageSize: m.page.size === "Letter" ? "LETTER" : "A4",
    pageOrientation: landscape ? "landscape" : "portrait",
    pageMargins: margins,
    defaultStyle: {
      font,
      fontSize: m.defaults.fontSizePt,
      lineHeight: pdfLineHeight(ctx, font, m.defaults.lineHeight),
      color: "#000000",
      // spațiile multiple se păstrează, ca în editor (white-space: pre-wrap)
      preserveLeadingSpaces: true,
    },
    content: collapse(items),
    // titlurile nu rămân singure la capăt de pagină (keepNext, ca în Word)
    pageBreakBefore: (node, q) =>
      Boolean(node.headlineLevel) && node.pageNumbers.length === 1 && q.getFollowingNodesOnPage().length === 0 && q.getNodesOnNextPage().length > 0 && q.getPreviousNodesOnPage().length > 0,
  };
  if (hasHeader) {
    def.header = (page) => {
      const stack = pageZone("headers", page);
      return stack.length ? { stack, margin: [margins[0], round(Math.min(headerDist, margins[1] / 2)), margins[2], 0] } : null;
    };
  }
  if (hasFooter || opts.pageNumbers) {
    def.footer = (page, pages) => {
      const stack = [
        ...pageZone("footers", page),
        ...(opts.pageNumbers ? [{ text: `Pagina ${page} din ${pages}`, alignment: "center", fontSize: Math.max(8, m.defaults.fontSizePt - 2) }] : []),
      ];
      if (!stack.length) return null;
      return { stack, margin: [margins[0], round(Math.max(4, margins[3] - footerDist - zoneHeight(stack))), margins[2], 0] };
    };
  }
  return def;
}
