import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  FootnoteReferenceRun,
  Header,
  HeadingLevel,
  ImageRun,
  InternalHyperlink,
  LevelFormat,
  LineRuleType,
  Packer,
  PageBreak,
  PageOrientation,
  Paragraph,
  ShadingType,
  Tab,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  UnderlineType,
  WidthType,
  type ILevelsOptions,
  type IRunPropertiesOptions,
  type ParagraphChild,
} from "docx";
import { decodeDataUrl, displaySize, type ImageResolver } from "./image";
import { colorHex, firstFont, halfPoints, mergeMeta } from "./style";
import { zoneForPage, type DocumentMeta, type JSONContent, type JSONMark } from "./types";

/**
 * JSON Tiptap → DOCX (biblioteca `docx`). Sugestiile neacceptate se scriu ca în original
 * (fără textul propus, cu textul propus spre ștergere), placeholderele ca `[● hint]` evidențiat galben.
 * Imaginile se scriu inline, cu octeții primiți de la `image` (implicit, doar din data URL-uri).
 */

export interface ExportOptions {
  image?: ImageResolver;
}

type Mutable<T> = { -readonly [K in keyof T]?: T[K] };
type RunProps = Mutable<IRunPropertiesOptions>;
type Block = Paragraph | Table;

interface Ctx {
  meta: DocumentMeta;
  numbering: { reference: string; levels: ILevelsOptions[] }[];
  pendingBreak: boolean;
  contentWidthPx: number;
  image: ImageResolver;
}

const PAGE_TWIPS = { A4: { width: 11906, height: 16838 }, Letter: { width: 12240, height: 15840 } };
const mmToTwips = (mm: number) => Math.round((mm / 25.4) * 1440);

const ALIGN: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};
const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];
const BULLETS = ["•", "◦", "▪"];

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function runProps(marks: JSONMark[]): RunProps {
  const o: RunProps = {};
  for (const m of marks) {
    const a = m.attrs ?? {};
    switch (m.type) {
      case "bold":
        o.bold = true;
        break;
      case "italic":
        o.italics = true;
        break;
      case "underline":
        o.underline = { type: UnderlineType.SINGLE };
        break;
      case "strike":
        o.strike = true;
        break;
      case "subscript":
        o.subScript = true;
        break;
      case "superscript":
        o.superScript = true;
        break;
      case "link":
        o.style = "Hyperlink";
        break;
      case "textStyle": {
        const font = firstFont(a.fontFamily);
        if (font) o.font = font;
        const size = halfPoints(a.fontSize);
        if (size) o.size = size;
        const color = colorHex(a.color);
        if (color) o.color = color;
        const bg = colorHex(a.backgroundColor);
        if (bg) o.shading = { type: ShadingType.CLEAR, color: "auto", fill: bg };
        break;
      }
      case "highlight": {
        const bg = colorHex(a.color) ?? "FFFF00";
        o.shading = { type: ShadingType.CLEAR, color: "auto", fill: bg };
        break;
      }
    }
  }
  return o;
}

function textRuns(n: JSONContent, marks: JSONMark[]): TextRun[] {
  const ph = marks.find((m) => m.type === "placeholder");
  const props = runProps(marks);
  let text = n.text ?? "";
  if (ph) {
    const hint = typeof ph.attrs?.hint === "string" ? ph.attrs.hint : text.replace(/^\[●\s?|\]$/g, "");
    text = `[● ${hint}]`;
    delete props.shading;
    props.highlight = "yellow";
  }
  const runs: TextRun[] = [];
  text.split("\n").forEach((line, li) => {
    if (li > 0) runs.push(new TextRun({ ...props, break: 1 }));
    line.split("\t").forEach((part, ti) => {
      if (ti > 0) runs.push(new TextRun({ ...props, children: [new Tab()] }));
      // `text`, nu `children`: în children, șiruri ca „CURRENT” ar deveni câmpuri de pagină
      if (part) runs.push(new TextRun({ ...props, text: part }));
    });
  });
  return runs;
}

function imageRun(n: JSONContent, ctx: Ctx): ImageRun | undefined {
  const src = n.attrs?.src;
  const img = typeof src === "string" ? ctx.image(src) : undefined;
  // WebP nu e acceptat de Word
  if (!img || img.ext === "webp") return undefined;
  const alt = typeof n.attrs?.alt === "string" ? n.attrs.alt : "";
  return new ImageRun({
    type: img.ext,
    data: img.data,
    transformation: displaySize(n.attrs, img, ctx.contentWidthPx),
    altText: { name: alt || "Imagine", description: alt, title: alt },
  });
}

function inlines(nodes: JSONContent[] | undefined, ctx: Ctx): ParagraphChild[] {
  const out: ParagraphChild[] = [];
  let group: { href: string; runs: (TextRun | ImageRun)[] } | undefined;
  const flush = () => {
    if (!group) return;
    out.push(
      group.href.startsWith("#")
        ? new InternalHyperlink({ anchor: group.href.slice(1), children: group.runs })
        : new ExternalHyperlink({ link: group.href, children: group.runs }),
    );
    group = undefined;
  };
  for (const n of nodes ?? []) {
    const marks = n.marks ?? [];
    if (marks.some((m) => m.type === "suggestInsert")) continue;
    const image = n.type === "image" ? imageRun(n, ctx) : undefined;
    const runs: (TextRun | ImageRun)[] = n.type === "text" ? textRuns(n, marks) : n.type === "hardBreak" ? [new TextRun({ break: 1 })] : image ? [image] : [];
    if (!runs.length) continue;
    const href = marks.find((m) => m.type === "link")?.attrs?.href;
    if (typeof href === "string" && href) {
      if (group?.href !== href) {
        flush();
        group = { href, runs: [] };
      }
      group.runs.push(...runs);
    } else {
      flush();
      out.push(...runs);
    }
  }
  flush();
  return out;
}

function takeBreak(ctx: Ctx): boolean | undefined {
  if (!ctx.pendingBreak) return undefined;
  ctx.pendingBreak = false;
  return true;
}

function flushBreak(ctx: Ctx, out: Block[]): void {
  if (takeBreak(ctx)) out.push(new Paragraph({ children: [new PageBreak()] }));
}

interface ParaExtra {
  numbering?: { reference: string; level: number };
  indentLeft?: number; // twips, doar dacă paragraful nu are indentare proprie
}

function paragraph(n: JSONContent, ctx: Ctx, extra: ParaExtra = {}): Paragraph {
  const a = n.attrs ?? {};
  const level = n.type === "heading" ? clamp(isNum(a.level) ? a.level : 1, 1, 6) : undefined;
  const spacing: { before?: number; after?: number; line?: number; lineRule?: (typeof LineRuleType)[keyof typeof LineRuleType] } = {};
  if (isNum(a.spaceBeforePt)) spacing.before = Math.round(a.spaceBeforePt * 20);
  if (isNum(a.spaceAfterPt)) spacing.after = Math.round(a.spaceAfterPt * 20);
  if (isNum(a.lineHeight) && a.lineHeight > 0) {
    spacing.line = Math.round(a.lineHeight * 240);
    spacing.lineRule = LineRuleType.AUTO;
  }
  const indent: { left?: number; firstLine?: number; hanging?: number } = {};
  if (isNum(a.indentPt)) indent.left = Math.round(a.indentPt * 20);
  else if (extra.indentLeft !== undefined) indent.left = extra.indentLeft;
  if (isNum(a.firstLineIndentPt) && a.firstLineIndentPt > 0) indent.firstLine = Math.round(a.firstLineIndentPt * 20);
  if (isNum(a.firstLineIndentPt) && a.firstLineIndentPt < 0) indent.hanging = Math.round(-a.firstLineIndentPt * 20);
  return new Paragraph({
    heading: level ? HEADINGS[level - 1] : undefined,
    alignment: typeof a.textAlign === "string" ? ALIGN[a.textAlign] : undefined,
    indent: Object.keys(indent).length ? indent : undefined,
    spacing: Object.keys(spacing).length ? spacing : undefined,
    pageBreakBefore: takeBreak(ctx),
    numbering: extra.numbering,
    children: inlines(n.content, ctx),
  });
}

const listIndent = (level: number) => 720 * (level + 1);

/** Nivelurile numerotării; o listă cu litere („a)”, ca enumerările din acte) le are doar pe nivelul ei. */
function listLevels(ordered: boolean, depth: number, start: number, letters = false): ILevelsOptions[] {
  return Array.from({ length: 9 }, (_, l) => ({
    level: l,
    format: !ordered ? LevelFormat.BULLET : letters && l === depth ? LevelFormat.LOWER_LETTER : LevelFormat.DECIMAL,
    text: !ordered ? BULLETS[l % BULLETS.length] : letters && l === depth ? `%${l + 1})` : `%${l + 1}.`,
    alignment: AlignmentType.LEFT,
    start: l === depth ? start : 1,
    style: { paragraph: { indent: { left: listIndent(l), hanging: 360 } } },
  }));
}

/** Fiecare listă primește propria definiție de numerotare, deci numerotarea o ia de la `start`. */
function list(n: JSONContent, depth: number, ctx: Ctx, out: Block[]): void {
  const ordered = n.type === "orderedList";
  const start = ordered && isNum(n.attrs?.start) ? Math.max(0, Math.round(n.attrs.start)) : 1;
  const reference = `lexai-list-${ctx.numbering.length + 1}`;
  ctx.numbering.push({ reference, levels: listLevels(ordered, depth, start, ordered && n.attrs?.type === "a") });
  for (const item of n.content ?? []) {
    let first = true;
    for (const b of item.type === "listItem" ? (item.content ?? []) : [item]) {
      if (b.type === "paragraph" || b.type === "heading") {
        out.push(paragraph(b, ctx, first ? { numbering: { reference, level: depth } } : { indentLeft: listIndent(depth) }));
        first = false;
      } else if (b.type === "bulletList" || b.type === "orderedList") list(b, Math.min(depth + 1, 8), ctx, out);
      else blocks([b], ctx, out);
    }
  }
}

function table(n: JSONContent, ctx: Ctx): Table | undefined {
  const rowsJson = (n.content ?? []).filter((r) => r.type === "tableRow" && r.content?.length);
  if (!rowsJson.length) return undefined;

  // așezarea pe grilă: coloana fiecărei celule, ținând cont de celulele fuzionate vertical de deasupra
  const coveredUntil: number[] = [];
  const widths: (number | undefined)[] = [];
  const placed = rowsJson.map((r, ri) => {
    let col = 0;
    return (r.content ?? []).map((c) => {
      while ((coveredUntil[col] ?? -1) >= ri) col++;
      const span = Math.max(1, isNum(c.attrs?.colspan) ? Math.round(c.attrs.colspan) : 1);
      const rowspan = clamp(isNum(c.attrs?.rowspan) ? Math.round(c.attrs.rowspan) : 1, 1, rowsJson.length - ri);
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
  const known = widths.reduce<number>((s, w) => s + (w ?? 0), 0);
  const missing = Array.from({ length: ncols }, (_, i) => widths[i]).filter((w) => w === undefined).length;
  const fill = missing ? Math.max(40, (ctx.contentWidthPx - known) / missing) : 0;
  const colTw = Array.from({ length: ncols }, (_, i) => Math.round((widths[i] ?? fill) * 15));

  const rows = placed.map(
    (cells, ri) =>
      new TableRow({
        tableHeader: rowsJson[ri].content!.every((c) => c.type === "tableHeader") || undefined,
        children: cells.map(({ node, col, span, rowspan }) => {
          const sub: Ctx = { ...ctx, pendingBreak: false };
          const children = blocks(node.content, sub);
          if (!(children[children.length - 1] instanceof Paragraph)) children.push(new Paragraph({}));
          const bg = colorHex(node.attrs?.backgroundColor);
          return new TableCell({
            children,
            columnSpan: span > 1 ? span : undefined,
            rowSpan: rowspan > 1 ? rowspan : undefined,
            width: { size: colTw.slice(col, col + span).reduce((s, w) => s + w, 0), type: WidthType.DXA },
            shading: bg ? { type: ShadingType.CLEAR, color: "auto", fill: bg } : undefined,
          });
        }),
      }),
  );
  return new Table({
    rows,
    columnWidths: colTw,
    width: { size: colTw.reduce((s, w) => s + w, 0), type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
  });
}

function blocks(nodes: JSONContent[] | undefined, ctx: Ctx, out: Block[] = []): Block[] {
  for (const n of nodes ?? []) {
    switch (n.type) {
      case "paragraph":
      case "heading":
        out.push(paragraph(n, ctx));
        break;
      case "bulletList":
      case "orderedList":
        list(n, 0, ctx, out);
        break;
      case "table": {
        flushBreak(ctx, out);
        const t = table(n, ctx);
        if (t) out.push(t);
        break;
      }
      case "pageBreak":
        if (ctx.pendingBreak) flushBreak(ctx, out);
        ctx.pendingBreak = true;
        break;
      case "horizontalRule":
        out.push(
          new Paragraph({
            pageBreakBefore: takeBreak(ctx),
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "auto", space: 1 } },
          }),
        );
        break;
      default:
        // noduri necunoscute: conținut inline → paragraf, altfel blocurile din interior
        if (n.content?.some((c) => c.type === "text" || c.type === "hardBreak")) out.push(paragraph({ ...n, type: "paragraph" }, ctx));
        else blocks(n.content, ctx, out);
    }
  }
  return out;
}

/** Paragrafele dintr-o listă de blocuri, pentru zone care acceptă doar paragrafe (notele de subsol). */
function paragraphsOf(nodes: JSONContent[] | undefined, out: JSONContent[] = []): JSONContent[] {
  for (const n of nodes ?? []) {
    if (n.type === "paragraph" || n.type === "heading") out.push({ ...n, type: "paragraph" });
    else paragraphsOf(n.content, out);
  }
  return out;
}

export async function exportDocx(content: JSONContent, meta?: Partial<DocumentMeta>, opts: ExportOptions = {}): Promise<Buffer> {
  const m = mergeMeta(meta);
  const size = PAGE_TWIPS[m.page.size] ?? PAGE_TWIPS.A4;
  const landscape = m.page.orientation === "landscape";
  const margins = m.page.marginsMm;
  const pageWidthTw = landscape ? size.height : size.width;
  const ctx: Ctx = {
    meta: m,
    numbering: [],
    pendingBreak: false,
    contentWidthPx: Math.max(100, (pageWidthTw - mmToTwips(margins.left) - mmToTwips(margins.right)) / 15),
    image: opts.image ?? decodeDataUrl,
  };

  const children = blocks(content.type === "doc" || !content.type ? content.content : [content], ctx);
  flushBreak(ctx, children);

  // notele de subsol: contractul nu păstrează poziția trimiterii, așa că trimiterile stau la final
  const footnotes: Record<string, { children: Paragraph[] }> = {};
  const refs: FootnoteReferenceRun[] = [];
  m.footnotes.forEach((f, i) => {
    const sub: Ctx = { ...ctx, pendingBreak: false };
    const paras = paragraphsOf(f.content).map((p) => paragraph(p, sub));
    footnotes[String(i + 1)] = { children: paras.length ? paras : [new Paragraph({})] };
    refs.push(new FootnoteReferenceRun(i + 1));
  });
  if (refs.length) children.push(new Paragraph({ children: refs }));
  if (!children.length) children.push(new Paragraph({}));

  const zone = (b: JSONContent[] | undefined) => {
    if (!b?.length) return undefined;
    const out = blocks(b, { ...ctx, pendingBreak: false });
    return out.length ? out : undefined;
  };
  // antetul implicit, al primei pagini (titlePage) și al paginilor pare (evenOdd)
  const zones = (key: "headers" | "footers", Make: typeof Header | typeof Footer) => {
    const make = (page: number) => new Make({ children: zone(zoneForPage(m, key, page)) ?? [new Paragraph({})] });
    const out: { default?: Header; first?: Header; even?: Header } = {};
    if (zoneForPage(m, key, 3)) out.default = make(3);
    if (m.titlePage) out.first = make(1);
    if (m.evenOdd) out.even = make(2);
    return Object.keys(out).length ? out : undefined;
  };

  const font = m.defaults.fontFamily;
  const heading = (sizePt: number, italics = false) => ({
    run: { font, size: sizePt * 2, bold: true, italics: italics || undefined },
    paragraph: { spacing: { before: 240, after: 120 }, keepNext: true },
  });

  const doc = new Document({
    creator: "LexAI",
    evenAndOddHeaderAndFooters: m.evenOdd || undefined,
    styles: {
      default: {
        document: {
          run: { font, size: Math.round(m.defaults.fontSizePt * 2) },
          paragraph: { spacing: { after: Math.round(m.defaults.spaceAfterPt * 20), line: Math.round(m.defaults.lineHeight * 240), lineRule: LineRuleType.AUTO } },
        },
        title: heading(18),
        heading1: heading(16),
        heading2: heading(14),
        heading3: heading(13),
        heading4: heading(12, true),
      },
    },
    numbering: { config: ctx.numbering },
    footnotes,
    sections: [
      {
        properties: {
          page: {
            size: { width: size.width, height: size.height, orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
            margin: {
              top: mmToTwips(margins.top),
              right: mmToTwips(margins.right),
              bottom: mmToTwips(margins.bottom),
              left: mmToTwips(margins.left),
              header: m.page.headerMm !== undefined ? mmToTwips(m.page.headerMm) : undefined,
              footer: m.page.footerMm !== undefined ? mmToTwips(m.page.footerMm) : undefined,
            },
          },
          titlePage: m.titlePage || undefined,
        },
        headers: zones("headers", Header),
        footers: zones("footers", Footer),
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}
