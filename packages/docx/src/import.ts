import JSZip from "jszip";
import { dataUrlOf, IMAGE_MIME, sniffImage } from "./image";
import { createSegIdGenerator } from "./segid";
import { defaultMeta, type Block, type DocumentMeta, type HeaderKind, type ImageSource, type ImportOptions, type ImportResult, type JSONContent, type JSONMark } from "./types";
import { attr, child, childrenNamed, find, findAll, kids, num, onOff, parseXml, textContent, type XNode } from "./xml";

/**
 * DOCX → JSON Tiptap (contractul din docs/arhitectura/document-json.md). Citește XML-ul direct
 * (JSZip + cheerio): stiluri cu moștenire, numerotare, secțiuni, anteturi/subsoluri (implicit, prima
 * pagină, pagini pare), note de subsol, imagini (inline, în ordinea din text) și casete de text (ca
 * paragrafe după paragraful care le ancorează). Ce nu are corespondent în contract (forme, grafice,
 * ecuații, câmpuri) e ignorat cu avertisment.
 */

const W = {
  shapes: "Formele și desenele din document nu au fost importate.",
  charts: "Graficele și diagramele SmartArt din document nu au fost importate.",
  imageFormat: "Unele imagini (EMF, WMF sau TIFF) nu pot fi afișate în editor și nu au fost importate.",
  linkedImages: "Imaginile legate din afara documentului nu au fost importate.",
  missingImages: "Unele imagini lipsesc din fișier și nu au fost importate.",
  objects: "Obiectele încorporate (OLE) din document nu au fost importate.",
  math: "Ecuațiile din document nu au fost importate.",
  fields: "Câmpurile automate (trimiteri, cuprins, date etc.) au fost importate ca text simplu.",
  pageNumbers: "Numerele de pagină automate nu au fost păstrate.",
  tracked: "Modificările urmărite (Track Changes) au fost importate ca acceptate.",
  comments: "Comentariile din document nu au fost importate.",
  numberedHeadings: "Numerotarea automată a titlurilor nu a fost păstrată.",
  nestedTables: "Tabelele imbricate au fost transformate în paragrafe.",
  listsInCells: "Listele din celulele de tabel au fost transformate în paragrafe.",
  sections: "Documentul are mai multe secțiuni; setările de pagină sunt preluate din ultima secțiune.",
  pageSize: "Dimensiunea paginii nu este A4 sau Letter; s-a folosit formatul cel mai apropiat.",
  exactLine: "Spațierea exactă/minimă între rânduri nu a fost păstrată.",
  endnotes: "Notele de final au fost importate ca note de subsol.",
  altChunk: "Conținutul încorporat din alte fișiere nu a fost importat.",
  footnoteRefs: "Poziția trimiterilor la notele de subsol nu este păstrată în text (notele sunt păstrate separat).",
};

export const HIGHLIGHT_HEX: Record<string, string> = {
  yellow: "#ffff00",
  green: "#00ff00",
  cyan: "#00ffff",
  magenta: "#ff00ff",
  blue: "#0000ff",
  red: "#ff0000",
  darkBlue: "#000080",
  darkCyan: "#008080",
  darkGreen: "#008000",
  darkMagenta: "#800080",
  darkRed: "#800000",
  darkYellow: "#808000",
  darkGray: "#808080",
  lightGray: "#c0c0c0",
  black: "#000000",
  white: "#ffffff",
};

// elemente fără efect asupra conținutului: se sar fără avertisment
const SILENT = new Set([
  "w:pPr",
  "w:rPr",
  "w:tcPr",
  "w:trPr",
  "w:tblPr",
  "w:tblPrEx",
  "w:tblGrid",
  "w:sectPr",
  "w:sdtPr",
  "w:sdtEndPr",
  "w:bookmarkStart",
  "w:bookmarkEnd",
  "w:proofErr",
  "w:permStart",
  "w:permEnd",
  "w:commentRangeStart",
  "w:commentRangeEnd",
  "w:commentReference",
  "w:annotationRef",
  "w:moveFromRangeStart",
  "w:moveFromRangeEnd",
  "w:moveToRangeStart",
  "w:moveToRangeEnd",
  "w:lastRenderedPageBreak",
  "w:footnoteRef",
  "w:endnoteRef",
  "w:separator",
  "w:continuationSeparator",
  "w:delText",
  "w:delInstrText",
  "w:softHyphen",
  "w:customXmlInsRangeStart",
  "w:customXmlInsRangeEnd",
  "w:customXmlDelRangeStart",
  "w:customXmlDelRangeEnd",
]);

// ——— proprietăți de rulaj și de paragraf ———

interface RunProps {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  vert?: string;
  sizePt?: number;
  font?: string;
  color?: string; // "" = automat (anulează culoarea moștenită)
  highlight?: string;
  shading?: string;
  caps?: boolean;
  vanish?: boolean;
  rStyle?: string;
}

interface ParaProps {
  pStyle?: string;
  align?: string;
  indLeft?: number;
  firstLine?: number; // negativ = agățat (hanging)
  before?: number;
  after?: number;
  line?: number;
  lineRule?: string;
  pageBreakBefore?: boolean;
  numId?: string;
  ilvl?: number;
}

interface Theme {
  minor?: string;
  major?: string;
}

function merge<T extends object>(...layers: (T | undefined)[]): T {
  const out: Record<string, unknown> = {};
  for (const l of layers) {
    if (!l) continue;
    for (const [k, v] of Object.entries(l)) if (v !== undefined) out[k] = v;
  }
  return out as T;
}

function omit(o: Record<string, unknown>, key: string): Record<string, unknown> {
  const out = { ...o };
  delete out[key];
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const twipsToPt = (v: number | undefined) => (v === undefined ? undefined : round2(v / 20));
const twipsToMm = (v: number) => Math.round((v / 1440) * 25.4 * 10) / 10;

function hex(v: string | undefined): string {
  return v && /^[0-9a-f]{6}$/i.test(v) ? `#${v.toLowerCase()}` : "";
}

function shdColor(shd: XNode | undefined): string | undefined {
  if (!shd) return undefined;
  const val = attr(shd, "w:val");
  if (val === "nil") return "";
  const color = attr(shd, "w:color");
  if (val === "solid" && color && color !== "auto") return hex(color);
  const fill = attr(shd, "w:fill");
  return fill && fill !== "auto" ? hex(fill) : "";
}

function themeFont(v: string | undefined, theme: Theme): string | undefined {
  if (!v) return undefined;
  return v.startsWith("major") ? theme.major : v.startsWith("minor") ? theme.minor : undefined;
}

function parseRPr(rPr: XNode | undefined, theme: Theme): RunProps {
  if (!rPr) return {};
  const p: RunProps = {
    bold: onOff(child(rPr, "w:b")),
    italic: onOff(child(rPr, "w:i")),
    caps: onOff(child(rPr, "w:caps")),
    vanish: onOff(child(rPr, "w:vanish")),
  };
  const u = child(rPr, "w:u");
  if (u) p.underline = !["none", "0", "false"].includes(attr(u, "w:val") ?? "single");
  const s = onOff(child(rPr, "w:strike"));
  const d = onOff(child(rPr, "w:dstrike"));
  if (s !== undefined || d !== undefined) p.strike = Boolean(s || d);
  p.vert = attr(child(rPr, "w:vertAlign"), "w:val");
  const sz = num(attr(child(rPr, "w:sz"), "w:val"));
  if (sz !== undefined) p.sizePt = sz / 2;
  const f = child(rPr, "w:rFonts");
  if (f) p.font = attr(f, "w:ascii") ?? attr(f, "w:hAnsi") ?? themeFont(attr(f, "w:asciiTheme") ?? attr(f, "w:hAnsiTheme"), theme);
  const c = attr(child(rPr, "w:color"), "w:val");
  if (c) p.color = c === "auto" ? "" : hex(c);
  const h = attr(child(rPr, "w:highlight"), "w:val");
  if (h) p.highlight = HIGHLIGHT_HEX[h] ?? "";
  p.shading = shdColor(child(rPr, "w:shd"));
  p.rStyle = attr(child(rPr, "w:rStyle"), "w:val");
  return p;
}

function parsePPr(pPr: XNode | undefined): ParaProps {
  if (!pPr) return {};
  const p: ParaProps = { pStyle: attr(child(pPr, "w:pStyle"), "w:val"), align: attr(child(pPr, "w:jc"), "w:val") };
  const ind = child(pPr, "w:ind");
  if (ind) {
    p.indLeft = twipsToPt(num(attr(ind, "w:left") ?? attr(ind, "w:start")));
    const hanging = num(attr(ind, "w:hanging"));
    const first = num(attr(ind, "w:firstLine"));
    if (hanging !== undefined) p.firstLine = -twipsToPt(hanging)!;
    else if (first !== undefined) p.firstLine = twipsToPt(first);
  }
  const sp = child(pPr, "w:spacing");
  if (sp) {
    p.before = twipsToPt(num(attr(sp, "w:before")));
    p.after = twipsToPt(num(attr(sp, "w:after")));
    p.line = num(attr(sp, "w:line"));
    p.lineRule = attr(sp, "w:lineRule");
  }
  p.pageBreakBefore = onOff(child(pPr, "w:pageBreakBefore"));
  const numPr = child(pPr, "w:numPr");
  if (numPr) {
    p.numId = attr(child(numPr, "w:numId"), "w:val");
    p.ilvl = num(attr(child(numPr, "w:ilvl"), "w:val"));
  }
  return p;
}

// ——— stiluri ———

interface StyleDef {
  id: string;
  type: string;
  name: string;
  basedOn?: string;
  pPr: ParaProps;
  rPr: RunProps;
}

interface Styles {
  docR: RunProps;
  docP: ParaProps;
  defaultPara?: string;
  paraP(id: string | undefined): ParaProps;
  paraR(id: string | undefined): RunProps;
  charR(id: string | undefined): RunProps;
  headingLevel(id: string | undefined): number | undefined;
  isHyperlink(id: string | undefined): boolean;
}

function loadStyles(xml: string | undefined, theme: Theme): Styles {
  const root = xml ? parseXml(xml) : undefined;
  const stylesEl = child(root, "w:styles");
  const dd = child(stylesEl, "w:docDefaults");
  const byId = new Map<string, StyleDef>();
  let defaultPara: string | undefined;
  for (const s of childrenNamed(stylesEl, "w:style")) {
    const id = attr(s, "w:styleId");
    if (!id) continue;
    const type = attr(s, "w:type") ?? "paragraph";
    byId.set(id, {
      id,
      type,
      name: attr(child(s, "w:name"), "w:val") ?? id,
      basedOn: attr(child(s, "w:basedOn"), "w:val"),
      pPr: parsePPr(child(s, "w:pPr")),
      rPr: parseRPr(child(s, "w:rPr"), theme),
    });
    if (type === "paragraph" && ["1", "true", "on"].includes(attr(s, "w:default") ?? "")) defaultPara ??= id;
  }
  if (!defaultPara && byId.has("Normal")) defaultPara = "Normal";

  // lanțul basedOn, de la stilul de bază la cel cerut (cu protecție la cicluri)
  const chain = (id: string | undefined): StyleDef[] => {
    const out: StyleDef[] = [];
    const seen = new Set<string>();
    while (id && !seen.has(id)) {
      seen.add(id);
      const s = byId.get(id);
      if (!s) break;
      out.unshift(s);
      id = s.basedOn;
    }
    return out;
  };
  const memo = <T>(fn: (id: string | undefined) => T) => {
    const cache = new Map<string, T>();
    return (id: string | undefined): T => {
      const key = id ?? "";
      if (!cache.has(key)) cache.set(key, fn(id));
      return cache.get(key)!;
    };
  };

  return {
    docR: parseRPr(child(child(dd, "w:rPrDefault"), "w:rPr"), theme),
    docP: parsePPr(child(child(dd, "w:pPrDefault"), "w:pPr")),
    defaultPara,
    paraP: memo((id) => merge<ParaProps>(...chain(id).map((s) => s.pPr))),
    paraR: memo((id) => merge<RunProps>(...chain(id).map((s) => s.rPr))),
    charR: memo((id) => merge<RunProps>(...chain(id).map((s) => s.rPr))),
    headingLevel: memo((id) => {
      for (const s of chain(id).reverse()) {
        if (/^title$/i.test(s.name) || /^title$/i.test(s.id)) return 1;
        const m = /^heading\s?(\d)$/i.exec(s.name) ?? /^heading\s?(\d)$/i.exec(s.id);
        if (m) return Number(m[1]) <= 4 ? Number(m[1]) : undefined;
      }
      return undefined;
    }),
    isHyperlink: (id) => !!id && (/^hyperlink$/i.test(id) || /^hyperlink$/i.test(byId.get(id)?.name ?? "")),
  };
}

// ——— numerotare ———

interface NumLevel {
  fmt: string;
  start: number;
}
type Numbering = Map<string, Map<number, NumLevel>>;

function loadNumbering(xml: string | undefined): Numbering {
  const out: Numbering = new Map();
  if (!xml) return out;
  const root = child(parseXml(xml), "w:numbering");
  const levelsOf = (el: XNode | undefined) => {
    const m = new Map<number, NumLevel>();
    for (const lvl of childrenNamed(el, "w:lvl")) {
      m.set(num(attr(lvl, "w:ilvl")) ?? 0, {
        fmt: attr(child(lvl, "w:numFmt"), "w:val") ?? "decimal",
        start: num(attr(child(lvl, "w:start"), "w:val")) ?? 1,
      });
    }
    return m;
  };
  const abstract = new Map<string, Map<number, NumLevel>>();
  for (const a of childrenNamed(root, "w:abstractNum")) abstract.set(attr(a, "w:abstractNumId") ?? "", levelsOf(a));
  for (const n of childrenNamed(root, "w:num")) {
    const id = attr(n, "w:numId");
    if (!id) continue;
    const levels = new Map(abstract.get(attr(child(n, "w:abstractNumId"), "w:val") ?? "") ?? []);
    for (const o of childrenNamed(n, "w:lvlOverride")) {
      const ilvl = num(attr(o, "w:ilvl")) ?? 0;
      const own = levelsOf(o).get(ilvl);
      const base = own ?? levels.get(ilvl) ?? { fmt: "decimal", start: 1 };
      const so = num(attr(child(o, "w:startOverride"), "w:val"));
      levels.set(ilvl, { ...base, start: so ?? base.start });
    }
    out.set(id, levels);
  }
  return out;
}

// ——— context de parcurgere ———

interface Field {
  instr: string;
  phase: "instr" | "result";
  hide: boolean;
  link?: string;
}

interface Ctx {
  styles: Styles;
  numbering: Numbering;
  theme: Theme;
  rels: Map<string, string>;
  defaults: DocumentMeta["defaults"];
  segId: () => string;
  warn: (msg: string) => void;
  unknown: Set<string>;
  counters: Map<string, number[]>;
  fields: Field[];
  sectPrs: XNode[];
  body: boolean; // corpul documentului (nu antet, notă sau celulă)
  images: Map<string, Pic>; // r:id → imaginea din partea curentă
  pending: Item[]; // casetele de text ale paragrafului curent, puse după el
}

type Item =
  | { kind: "block"; node: JSONContent }
  | { kind: "li"; node: JSONContent; numId: string; ilvl: number; ordered: boolean; letters: boolean; number: number };

const PAGE: JSONContent = { type: "__page" };

function collectItems(container: XNode | undefined, ctx: Ctx, out: Item[]): void {
  for (const el of kids(container)) {
    const name = el.name ?? "";
    switch (name) {
      case "w:p":
        parseParagraph(el, ctx, out);
        break;
      case "w:tbl": {
        const t = parseTable(el, ctx);
        if (t) out.push({ kind: "block", node: t });
        break;
      }
      case "w:sdt":
        collectItems(child(el, "w:sdtContent"), ctx, out);
        break;
      case "w:customXml":
      case "w:ins":
      case "w:moveTo":
        if (name !== "w:customXml") ctx.warn(W.tracked);
        collectItems(el, ctx, out);
        break;
      case "w:del":
      case "w:moveFrom":
        ctx.warn(W.tracked);
        break;
      case "w:altChunk":
        ctx.warn(W.altChunk);
        break;
      case "m:oMathPara":
      case "m:oMath":
        ctx.warn(W.math);
        break;
      default:
        if (!SILENT.has(name)) ctx.unknown.add(name);
    }
  }
}

/** Liste plate (numId/ilvl) → bulletList/orderedList imbricate. */
function assemble(items: Item[]): JSONContent[] {
  const out: JSONContent[] = [];
  const stack: { list: JSONContent; ilvl: number; ordered: boolean; numId: string }[] = [];
  for (const it of items) {
    if (it.kind === "block") {
      stack.length = 0;
      out.push(it.node);
      continue;
    }
    while (stack.length && stack[stack.length - 1].ilvl > it.ilvl) stack.pop();
    let top = stack[stack.length - 1];
    if (top && top.ilvl === it.ilvl && (top.ordered !== it.ordered || (it.ordered && top.numId !== it.numId))) {
      stack.pop();
      top = stack[stack.length - 1];
    }
    if (!top || top.ilvl < it.ilvl) {
      const list: JSONContent = it.ordered
        ? { type: "orderedList", attrs: { start: it.number, ...(it.letters ? { type: "a" } : {}) }, content: [] }
        : { type: "bulletList", content: [] };
      if (top) {
        const parentItems = top.list.content!;
        parentItems[parentItems.length - 1].content!.push(list);
      } else out.push(list);
      top = { list, ilvl: it.ilvl, ordered: it.ordered, numId: it.numId };
      stack.push(top);
    }
    top.list.content!.push({ type: "listItem", content: [it.node] });
  }
  return out;
}

// ——— paragrafe ———

const ALIGN: Record<string, string> = {
  both: "justify",
  distribute: "justify",
  center: "center",
  right: "right",
  end: "right",
};

function lineHeightOf(p: ParaProps, ctx: Pick<Ctx, "warn">): number | undefined {
  if (p.line === undefined) return undefined;
  if ((p.lineRule ?? "auto") !== "auto") {
    ctx.warn(W.exactLine);
    return undefined;
  }
  return round2(p.line / 240);
}

function parseParagraph(p: XNode, ctx: Ctx, out: Item[]): void {
  const pPr = child(p, "w:pPr");
  const direct = parsePPr(pPr);
  const styleId = direct.pStyle ?? ctx.styles.defaultPara;
  const eff = merge<ParaProps>(ctx.styles.docP, ctx.styles.paraP(styleId), direct);
  const baseRun = merge<RunProps>(ctx.styles.docR, ctx.styles.paraR(styleId));
  const level = ctx.styles.headingLevel(styleId);
  const numLevel = eff.numId ? ctx.numbering.get(eff.numId)?.get(Math.min(Math.max(eff.ilvl ?? 0, 0), 8)) : undefined;
  const hasNum = !!eff.numId && eff.numId !== "0" && ctx.numbering.has(eff.numId) && numLevel?.fmt !== "none";
  if (level && hasNum) ctx.warn(W.numberedHeadings);

  const tokens: JSONContent[] = [];
  const pctx: Ctx = { ...ctx, pending: [] };
  parseInlines(kids(p), pctx, { run: baseRun }, tokens);
  // paragraful care conține doar trimiteri la note (așa le scrie exportul) nu rămâne gol în text
  const onlyNoteRefs = !tokens.length && (findAll(p, "w:footnoteReference").length > 0 || findAll(p, "w:endnoteReference").length > 0);
  const chunks: JSONContent[][] = [[]];
  for (const t of tokens) {
    if (t === PAGE) chunks.push([]);
    else chunks[chunks.length - 1].push(t);
  }

  if (eff.pageBreakBefore) out.push({ kind: "block", node: { type: "pageBreak" } });
  // paragraf gol cu bordură jos = linie orizontală (așa o scrie și exportul)
  const isRule = !tokens.length && !hasNum && !!child(child(pPr, "w:pBdr"), "w:bottom");
  if (isRule) out.push({ kind: "block", node: { type: "horizontalRule" } });
  let listDone = false;
  if (!onlyNoteRefs && !isRule) chunks.forEach((chunk, i) => {
    if (i > 0) out.push({ kind: "block", node: { type: "pageBreak" } });
    if (!chunk.length && chunks.length > 1) return;
    const asList = hasNum && !level && !listDone;
    const node = paragraphNode(level, eff, chunk, ctx, asList);
    if (asList) {
      listDone = true;
      const ilvl = Math.min(Math.max(eff.ilvl ?? 0, 0), 8);
      const lvl = numLevel ?? { fmt: "decimal", start: 1 };
      const counts = ctx.counters.get(eff.numId!) ?? [];
      ctx.counters.set(eff.numId!, counts);
      counts[ilvl] = (counts[ilvl] ?? lvl.start - 1) + 1;
      counts.length = ilvl + 1; // nivelurile mai adânci o iau de la capăt
      out.push({
        kind: "li",
        node,
        numId: eff.numId!,
        ilvl,
        ordered: lvl.fmt !== "bullet",
        letters: lvl.fmt === "lowerLetter",
        number: counts[ilvl],
      });
    } else out.push({ kind: "block", node });
  });
  out.push(...pctx.pending);

  // sfârșit de secțiune în interiorul documentului
  const sect = child(pPr, "w:sectPr");
  if (sect && ctx.body) {
    ctx.sectPrs.push(sect);
    if (attr(child(sect, "w:type"), "w:val") !== "continuous") out.push({ kind: "block", node: { type: "pageBreak" } });
  }
}

function paragraphNode(level: number | undefined, eff: ParaProps, inline: JSONContent[], ctx: Ctx, inList: boolean): JSONContent {
  const attrs: Record<string, unknown> = { segId: ctx.segId() };
  if (level) attrs.level = level;
  const align = ALIGN[eff.align ?? ""];
  if (align) attrs.textAlign = align;
  if (!inList) {
    if (eff.indLeft) attrs.indentPt = eff.indLeft;
    if (eff.firstLine) attrs.firstLineIndentPt = eff.firstLine;
  }
  const lh = lineHeightOf(eff, ctx);
  if (lh !== undefined && lh !== ctx.defaults.lineHeight) attrs.lineHeight = lh;
  if (eff.before !== undefined) attrs.spaceBeforePt = eff.before;
  // la paragrafe, spațiul egal cu cel implicit al documentului nu se mai repetă pe fiecare nod
  if (eff.after !== undefined && (level || eff.after !== ctx.defaults.spaceAfterPt)) attrs.spaceAfterPt = eff.after;
  const node: JSONContent = { type: level ? "heading" : "paragraph", attrs };
  const content = finalizeInline(inline);
  if (content.length) node.content = content;
  return node;
}

// ——— conținut inline ———

interface InlineState {
  run: RunProps;
  link?: string;
}

function parseInlines(nodes: XNode[], ctx: Ctx, st: InlineState, out: JSONContent[]): void {
  for (const el of nodes) {
    const name = el.name ?? "";
    switch (name) {
      case "w:r":
        parseRun(el, ctx, st, out);
        break;
      case "w:hyperlink": {
        const id = attr(el, "r:id");
        const anchor = attr(el, "w:anchor");
        const target = id ? ctx.rels.get(id) : undefined;
        const href = target ? target + (anchor ? `#${anchor}` : "") : anchor ? `#${anchor}` : undefined;
        parseInlines(kids(el), ctx, { ...st, link: href ?? st.link }, out);
        break;
      }
      case "w:fldSimple": {
        const f: Field = { instr: attr(el, "w:instr") ?? "", phase: "result", hide: false };
        classifyField(f, ctx);
        ctx.fields.push(f);
        parseInlines(kids(el), ctx, st, out);
        ctx.fields.pop();
        break;
      }
      case "w:ins":
      case "w:moveTo":
        ctx.warn(W.tracked);
        parseInlines(kids(el), ctx, st, out);
        break;
      case "w:del":
      case "w:moveFrom":
        ctx.warn(W.tracked);
        break;
      case "w:sdt":
        parseInlines(kids(child(el, "w:sdtContent")), ctx, st, out);
        break;
      case "w:smartTag":
      case "w:customXml":
      case "w:dir":
      case "w:bdo":
        parseInlines(kids(el), ctx, st, out);
        break;
      case "m:oMath":
      case "m:oMathPara":
        ctx.warn(W.math);
        break;
      case "mc:AlternateContent":
        parseInlines(kids(alternative(el)), ctx, st, out);
        break;
      default:
        if (!SILENT.has(name)) ctx.unknown.add(name);
    }
  }
}

function classifyField(f: Field, ctx: Ctx): void {
  const code = f.instr.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
  if (["PAGE", "NUMPAGES", "SECTIONPAGES", "SECTION"].includes(code)) {
    f.hide = true;
    ctx.warn(W.pageNumbers);
  } else if (code === "HYPERLINK") {
    const anchor = /\\l\s+"([^"]*)"/.exec(f.instr)?.[1];
    const url = /^\s*HYPERLINK\s+"([^"]*)"/i.exec(f.instr)?.[1];
    f.link = url ? url + (anchor ? `#${anchor}` : "") : anchor ? `#${anchor}` : undefined;
  } else if (code) ctx.warn(W.fields);
}

function parseRun(r: XNode, ctx: Ctx, st: InlineState, out: JSONContent[]): void {
  const direct = parseRPr(child(r, "w:rPr"), ctx.theme);
  // în hiperlinkuri, stilul „Hyperlink” e redat de mark-ul link, nu de culoare/subliniere
  const charStyle = direct.rStyle && !(st.link && ctx.styles.isHyperlink(direct.rStyle)) ? ctx.styles.charR(direct.rStyle) : undefined;
  const eff = merge<RunProps>(st.run, charStyle, direct);

  const handle = (el: XNode): void => {
    const name = el.name ?? "";
    if (name === "w:fldChar") {
      const t = attr(el, "w:fldCharType");
      if (t === "begin") ctx.fields.push({ instr: "", phase: "instr", hide: false });
      else if (t === "separate") {
        const f = ctx.fields[ctx.fields.length - 1];
        if (f && f.phase === "instr") {
          f.phase = "result";
          classifyField(f, ctx);
        }
      } else if (t === "end") ctx.fields.pop();
      return;
    }
    if (name === "w:instrText") {
      const f = ctx.fields[ctx.fields.length - 1];
      if (f?.phase === "instr") f.instr += textContent(el);
      return;
    }
    if (eff.vanish || ctx.fields.some((f) => f.phase === "instr" || f.hide)) return;
    const fieldLink = [...ctx.fields].reverse().find((f) => f.link)?.link;
    const link = fieldLink ?? st.link;
    const text = (t: string) => {
      if (t) out.push(textNode(eff.caps ? t.toLocaleUpperCase("ro-RO") : t, eff, link, ctx));
    };
    switch (name) {
      case "w:t":
        text(textContent(el));
        break;
      case "w:tab":
      case "w:ptab":
        text("\t");
        break;
      case "w:br":
        if (attr(el, "w:type") === "page") out.push(PAGE);
        else out.push({ type: "hardBreak" });
        break;
      case "w:cr":
        out.push({ type: "hardBreak" });
        break;
      case "w:noBreakHyphen":
        text("-");
        break;
      case "w:sym": {
        let code = parseInt(attr(el, "w:char") ?? "", 16);
        if (code >= 0xf000) code -= 0xf000;
        if (Number.isFinite(code) && code > 0) text(String.fromCharCode(code));
        break;
      }
      case "w:drawing":
      case "w:pict":
        visual(el, ctx, out, W.shapes);
        break;
      case "mc:AlternateContent":
        kids(alternative(el)).forEach(handle);
        break;
      case "w:object":
        // obiectele OLE (de ex. un tabel Excel) au de obicei o imagine de previzualizare
        visual(el, ctx, out, W.objects);
        break;
      case "w:contentPart":
        ctx.warn(W.objects);
        break;
      case "w:footnoteReference":
      case "w:endnoteReference":
        ctx.warn(W.footnoteRefs);
        break;
      default:
        if (!SILENT.has(name)) ctx.unknown.add(name);
    }
  };
  kids(r).forEach(handle);
}

// ——— imagini și casete de text ———

type Pic = { src: string; skip?: undefined } | { skip: string };

/** Imaginile la care trimite o parte (document, antet, note), citite o singură dată pe fișier media. */
async function loadImages(zip: JSZip, part: string, rels: Map<string, Rel>, cache: Map<string, Promise<Pic>>, imageSrc: (img: ImageSource) => string): Promise<Map<string, Pic>> {
  const out = new Map<string, Pic>();
  for (const [id, r] of rels) {
    if (!r.type.endsWith("/image")) continue;
    if (r.external) {
      out.set(id, { skip: W.linkedImages });
      continue;
    }
    const media = resolvePart(part, r.target);
    let pic = cache.get(media);
    if (!pic) {
      pic = (async (): Promise<Pic> => {
        const data = await zip.file(media)?.async("uint8array");
        if (!data) return { skip: W.missingImages };
        const ext = sniffImage(data);
        if (!ext) return { skip: W.imageFormat };
        return { src: imageSrc({ data, contentType: IMAGE_MIME[ext], ext }) };
      })();
      cache.set(media, pic);
    }
    out.set(id, await pic);
  }
  return out;
}

/** Ramura din mc:AlternateContent pe care o înțelegem: varianta DrawingML, altfel cea VML. */
function alternative(el: XNode): XNode | undefined {
  const choice = childrenNamed(el, "mc:Choice").find((c) => find(c, "w:drawing") || find(c, "w:txbxContent"));
  return choice ?? child(el, "mc:Fallback");
}

const EMU_PER_PX = 9525;

/** Dimensiunea unei forme VML din `style` („width:120pt;height:40.5pt”), în px. */
function vmlSize(style: string | undefined): { width?: number; height?: number } {
  const PX: Record<string, number> = { pt: 4 / 3, in: 96, cm: 96 / 2.54, mm: 96 / 25.4, px: 1, "": 1 };
  const read = (k: string) => {
    const m = new RegExp(`(?:^|;)\\s*${k}\\s*:\\s*([\\d.]+)\\s*(pt|in|cm|mm|px)?`).exec(style ?? "");
    return m ? Math.round(Number(m[1]) * PX[m[2] ?? ""]) : undefined;
  };
  return { width: read("width"), height: read("height") };
}

/**
 * Desen (DrawingML), imagine VML sau obiect OLE: fiecare imagine devine un nod `image` inline, iar
 * fiecare casetă de text devine paragrafe puse după paragraful curent. Formele fără imagine sau text
 * (și graficele) sunt semnalate cu `fallbackWarning`.
 */
function visual(el: XNode, ctx: Ctx, out: JSONContent[], fallbackWarning: string): void {
  const pics: { el: XNode; style?: string }[] = [];
  const boxes: XNode[] = [];
  const walk = (n: XNode, style: string | undefined) => {
    for (const c of kids(n)) {
      if (c.name === "w:txbxContent") boxes.push(c);
      else if (c.name === "pic:pic" || c.name === "v:imagedata") pics.push({ el: c, style });
      else walk(c, attr(c, "style") ?? style);
    }
  };
  walk(el, attr(el, "style"));

  const extent = find(el, "wp:extent");
  const docPr = find(el, "wp:docPr");
  for (const p of pics) {
    let id: string | undefined;
    let size: { width?: number; height?: number };
    let alt: string | undefined;
    if (p.el.name === "pic:pic") {
      const blip = find(p.el, "a:blip");
      id = attr(blip, "r:embed") ?? attr(blip, "r:link");
      // o singură imagine: dimensiunea afișată e cea a desenului; într-un grup, cea a imaginii
      const ext = pics.length === 1 && extent ? extent : find(find(p.el, "a:xfrm"), "a:ext");
      size = { width: Math.round((num(attr(ext, "cx")) ?? 0) / EMU_PER_PX) || undefined, height: Math.round((num(attr(ext, "cy")) ?? 0) / EMU_PER_PX) || undefined };
      alt = attr(docPr, "descr") || attr(docPr, "title") || attr(find(p.el, "pic:cNvPr"), "descr") || undefined;
    } else {
      id = attr(p.el, "r:id") ?? attr(p.el, "r:pict");
      size = vmlSize(p.style);
      alt = attr(p.el, "o:title") || undefined;
    }
    const pic = id ? ctx.images.get(id) : undefined;
    if (!pic) {
      ctx.warn(W.missingImages);
      continue;
    }
    if (pic.skip !== undefined) {
      ctx.warn(pic.skip);
      continue;
    }
    out.push({ type: "image", attrs: { src: pic.src, alt: alt ?? null, title: null, width: size.width ?? null, height: size.height ?? null } });
  }
  for (const box of boxes) {
    const items: Item[] = [];
    collectItems(box, { ...ctx, body: false, fields: [], pending: [] }, items);
    ctx.pending.push(...items);
  }
  if (!pics.length && !boxes.length) {
    const uri = attr(find(el, "a:graphicData"), "uri") ?? "";
    ctx.warn(/chart|diagram/i.test(uri) ? W.charts : fallbackWarning);
  }
}

function textNode(text: string, p: RunProps, link: string | undefined, ctx: Ctx): JSONContent {
  const marks: JSONMark[] = [];
  if (link) marks.push({ type: "link", attrs: { href: link } });
  if (p.bold) marks.push({ type: "bold" });
  if (p.italic) marks.push({ type: "italic" });
  if (p.underline) marks.push({ type: "underline" });
  if (p.strike) marks.push({ type: "strike" });
  if (p.vert === "superscript") marks.push({ type: "superscript" });
  if (p.vert === "subscript") marks.push({ type: "subscript" });
  const ts: Record<string, unknown> = {};
  if (p.font && p.font !== ctx.defaults.fontFamily) ts.fontFamily = p.font;
  if (p.sizePt && p.sizePt !== ctx.defaults.fontSizePt) ts.fontSize = `${p.sizePt}pt`;
  if (p.color) ts.color = p.color;
  const bg = p.highlight || p.shading;
  if (bg) ts.backgroundColor = bg;
  if (Object.keys(ts).length) marks.push({ type: "textStyle", attrs: ts });
  const node: JSONContent = { type: "text", text };
  if (marks.length) node.marks = marks;
  return node;
}

const sameMarks = (a?: JSONMark[], b?: JSONMark[]) => JSON.stringify(a ?? []) === JSON.stringify(b ?? []);

const PLACEHOLDER_RE = /\[●\s?([^\]]*)\]/g;

/** Unește rulajele cu aceleași mark-uri și recunoaște placeholderele exportate (`[● hint]` evidențiat galben). */
function finalizeInline(nodes: JSONContent[]): JSONContent[] {
  const merged: JSONContent[] = [];
  for (const n of nodes) {
    const prev = merged[merged.length - 1];
    if (n.type === "text" && prev?.type === "text" && sameMarks(prev.marks, n.marks)) prev.text = (prev.text ?? "") + (n.text ?? "");
    else merged.push({ ...n });
  }
  return merged.flatMap((n) => {
    const ts = n.marks?.find((m) => m.type === "textStyle");
    if (n.type !== "text" || ts?.attrs?.backgroundColor !== "#ffff00" || !n.text?.includes("[●")) return [n];
    const rest = omit(ts.attrs, "backgroundColor");
    const phMarks = (hint: string): JSONMark[] => [
      ...n.marks!.filter((m) => m !== ts),
      ...(Object.keys(rest).length ? [{ type: "textStyle", attrs: rest }] : []),
      { type: "placeholder", attrs: { hint } },
    ];
    const parts: JSONContent[] = [];
    const text = n.text;
    let last = 0;
    for (const m of text.matchAll(PLACEHOLDER_RE)) {
      if (m.index! > last) parts.push({ ...n, text: text.slice(last, m.index) });
      parts.push({ type: "text", text: m[0], marks: phMarks(m[1].trim()) });
      last = m.index! + m[0].length;
    }
    if (last < text.length) parts.push({ ...n, text: text.slice(last) });
    return parts;
  });
}

// ——— tabele ———

/** Copiii cu numele dat, inclusiv cei împachetați în controale de conținut (w:sdt) sau w:customXml. */
function rowsOrCells(parent: XNode | undefined, name: string): XNode[] {
  const out: XNode[] = [];
  for (const el of kids(parent)) {
    if (el.name === name) out.push(el);
    else if (el.name === "w:sdt") out.push(...rowsOrCells(child(el, "w:sdtContent"), name));
    else if (el.name === "w:customXml") out.push(...rowsOrCells(el, name));
  }
  return out;
}

const twipsToPx = (v: number) => Math.round(v / 15); // 1440 twips = 96 px

function parseTable(tbl: XNode, ctx: Ctx): JSONContent | undefined {
  const grid = childrenNamed(child(tbl, "w:tblGrid"), "w:gridCol").map((g) => num(attr(g, "w:w")) ?? 0);
  const rows: JSONContent[] = [];
  const active = new Map<number, JSONContent>(); // coloană → celula care începe fuziunea verticală

  for (const tr of rowsOrCells(tbl, "w:tr")) {
    const trPr = child(tr, "w:trPr");
    const header = onOff(child(trPr, "w:tblHeader")) === true;
    let col = num(attr(child(trPr, "w:gridBefore"), "w:val")) ?? 0;
    const cells: JSONContent[] = [];
    const grown: JSONContent[] = [];
    for (const tc of rowsOrCells(tr, "w:tc")) {
      const tcPr = child(tc, "w:tcPr");
      const span = Math.max(1, num(attr(child(tcPr, "w:gridSpan"), "w:val")) ?? 1);
      const vm = child(tcPr, "w:vMerge");
      const vMerge = vm ? (attr(vm, "w:val") ?? "continue") : undefined;
      const origin = active.get(col);
      if (vMerge === "continue" && origin) {
        origin.attrs!.rowspan = (origin.attrs!.rowspan as number) + 1;
        grown.push(origin);
        col += span;
        continue;
      }
      const cols = grid.slice(col, col + span);
      let colwidth: number[] | null = null;
      if (cols.length === span && cols.every((w) => w > 0)) colwidth = cols.map(twipsToPx);
      else {
        const tcW = child(tcPr, "w:tcW");
        const w = num(attr(tcW, "w:w"));
        if (w && (attr(tcW, "w:type") ?? "dxa") === "dxa") colwidth = Array(span).fill(twipsToPx(w / span));
      }
      const attrs: Record<string, unknown> = { colspan: span, rowspan: 1, colwidth };
      const bg = shdColor(child(tcPr, "w:shd"));
      if (bg) attrs.backgroundColor = bg;
      const cell: JSONContent = { type: header ? "tableHeader" : "tableCell", attrs, content: cellContent(tc, ctx) };
      for (let c = col; c < col + span; c++) active.delete(c);
      if (vMerge === "restart") active.set(col, cell);
      cells.push(cell);
      col += span;
    }
    if (cells.length) rows.push({ type: "tableRow", content: cells });
    else for (const o of grown) o.attrs!.rowspan = (o.attrs!.rowspan as number) - 1;
  }
  return rows.length ? { type: "table", content: rows } : undefined;
}

/** Celulele conțin doar paragrafe (contract): listele, titlurile și tabelele imbricate sunt aplatizate. */
function cellContent(tc: XNode, ctx: Ctx): JSONContent[] {
  const items: Item[] = [];
  collectItems(tc, { ...ctx, body: false }, items);
  const out: JSONContent[] = [];
  const flatten = (n: JSONContent) => {
    if (n.type === "paragraph") out.push(n);
    else if (n.type === "heading") out.push({ ...n, type: "paragraph", attrs: omit(n.attrs ?? {}, "level") }); else if (n.type === "table") {
      ctx.warn(W.nestedTables);
      for (const row of n.content ?? []) for (const c of row.content ?? []) (c.content ?? []).forEach(flatten);
    }
  };
  for (const it of items) {
    if (it.kind === "block") flatten(it.node);
    else {
      ctx.warn(W.listsInCells);
      const prefix = it.ordered ? `${it.number}. ` : "• ";
      const attrs = { ...it.node.attrs };
      if (it.ilvl) attrs.indentPt = 18 * it.ilvl;
      out.push({ ...it.node, attrs, content: finalizeInline([{ type: "text", text: prefix }, ...(it.node.content ?? [])]) });
    }
  }
  if (!out.length) out.push({ type: "paragraph", attrs: { segId: ctx.segId() } });
  return out;
}

// ——— pachetul DOCX ———

function resolvePart(base: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = base.split("/").slice(0, -1);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return parts.join("/");
}

interface Rel {
  target: string;
  type: string;
  external: boolean;
}

async function readRels(zip: JSZip, part: string): Promise<Map<string, Rel>> {
  const name = part.replace(/([^/]+)$/, "_rels/$1.rels");
  const xml = await zip.file(name)?.async("string");
  const out = new Map<string, Rel>();
  if (!xml) return out;
  for (const r of childrenNamed(child(parseXml(xml), "Relationships"), "Relationship")) {
    const id = attr(r, "Id");
    if (!id) continue;
    out.set(id, { target: attr(r, "Target") ?? "", type: attr(r, "Type") ?? "", external: attr(r, "TargetMode") === "External" });
  }
  return out;
}

const hyperlinkTargets = (rels: Map<string, Rel>) => new Map([...rels].map(([id, r]) => [id, r.target]));

function hasContent(blocks: JSONContent[]): boolean {
  return blocks.some((b) => b.type === "table" || b.type === "image" || (b.type === "text" && !!b.text?.trim()) || hasContent(b.content ?? []));
}

function trimLeading(blocks: JSONContent[]): void {
  const first = blocks[0]?.content;
  if (!first?.length || first[0].type !== "text") return;
  first[0].text = (first[0].text ?? "").replace(/^\s+/, "");
  if (!first[0].text) first.shift();
  if (!first.length) delete blocks[0].content;
}

function pageFromSectPr(sect: XNode | undefined, meta: DocumentMeta, warn: (m: string) => void): void {
  const pgSz = child(sect, "w:pgSz");
  const w = num(attr(pgSz, "w:w"));
  const h = num(attr(pgSz, "w:h"));
  if (w && h) {
    const short = Math.min(w, h);
    const long = Math.max(w, h);
    const dA4 = Math.abs(short - 11906) + Math.abs(long - 16838);
    const dLetter = Math.abs(short - 12240) + Math.abs(long - 15840);
    meta.page.size = dLetter < dA4 ? "Letter" : "A4";
    if (Math.min(dA4, dLetter) > 200) warn(W.pageSize);
    meta.page.orientation = attr(pgSz, "w:orient") === "landscape" || w > h ? "landscape" : "portrait";
  }
  const mar = child(sect, "w:pgMar");
  if (mar) {
    const m = meta.page.marginsMm;
    for (const k of ["top", "right", "bottom", "left"] as const) {
      const v = num(attr(mar, `w:${k}`));
      if (v !== undefined) m[k] = twipsToMm(Math.abs(v));
    }
    const header = num(attr(mar, "w:header"));
    const footer = num(attr(mar, "w:footer"));
    if (header !== undefined) meta.page.headerMm = twipsToMm(header);
    if (footer !== undefined) meta.page.footerMm = twipsToMm(footer);
  }
}

export async function importDocx(buffer: Uint8Array | ArrayBuffer | Buffer, opts: ImportOptions = {}): Promise<ImportResult> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new Error("Fișierul nu este un document Word (.docx) valid.");
  }

  // partea principală, din _rels/.rels (de obicei word/document.xml)
  const pkgRels = await readRels(zip, ".rels").catch(() => new Map<string, Rel>());
  const mainRel = [...pkgRels.values()].find((r) => r.type.endsWith("/officeDocument"));
  const docPart = mainRel ? resolvePart("", mainRel.target) : "word/document.xml";
  const docXml = await zip.file(docPart)?.async("string");
  if (!docXml) throw new Error("Fișierul nu este un document Word (.docx) valid.");

  const docRels = await readRels(zip, docPart);
  const partOf = (suffix: string, fallback: string) => {
    const r = [...docRels.values()].find((x) => x.type.endsWith(`/${suffix}`));
    return r ? resolvePart(docPart, r.target) : fallback;
  };
  const read = (part: string) => zip.file(part)?.async("string") ?? Promise.resolve(undefined);

  const themeXml = await read(partOf("theme", "word/theme/theme1.xml"));
  const theme: Theme = {};
  if (themeXml) {
    const t = parseXml(themeXml);
    theme.minor = attr(child(findAll(t, "a:minorFont")[0], "a:latin"), "typeface") || undefined;
    theme.major = attr(child(findAll(t, "a:majorFont")[0], "a:latin"), "typeface") || undefined;
  }
  const styles = loadStyles(await read(partOf("styles", "word/styles.xml")), theme);
  const numbering = loadNumbering(await read(partOf("numbering", "word/numbering.xml")));

  const warnings = new Set<string>();
  const meta = defaultMeta();
  const warn = (m: string) => warnings.add(m);

  // valorile implicite ale documentului: docDefaults + stilul de paragraf implicit (Normal)
  const baseRun = merge<RunProps>(styles.docR, styles.paraR(styles.defaultPara));
  if (baseRun.font) meta.defaults.fontFamily = baseRun.font;
  if (baseRun.sizePt) meta.defaults.fontSizePt = baseRun.sizePt;
  const baseP = merge<ParaProps>(styles.docP, styles.paraP(styles.defaultPara));
  const baseLine = lineHeightOf(baseP, { warn });
  if (baseLine) meta.defaults.lineHeight = baseLine;
  // un DOCX fără spațiere declarată nu are spațiu după paragraf (valoarea implicită din Word e 0)
  meta.defaults.spaceAfterPt = baseP.after ?? 0;

  const imageCache = new Map<string, Promise<Pic>>();
  const images = (part: string, rels: Map<string, Rel>) => loadImages(zip, part, rels, imageCache, opts.imageSrc ?? dataUrlOf);

  const ctx: Ctx = {
    styles,
    numbering,
    theme,
    rels: hyperlinkTargets(docRels),
    defaults: meta.defaults,
    segId: createSegIdGenerator(),
    warn,
    unknown: new Set(),
    counters: new Map(),
    fields: [],
    sectPrs: [],
    body: true,
    images: await images(docPart, docRels),
    pending: [],
  };

  const body = child(child(parseXml(docXml), "w:document"), "w:body");
  const items: Item[] = [];
  collectItems(body, ctx, items);
  const content = assemble(items);
  // un sfârșit de secțiune chiar la final nu trebuie să lase un salt de pagină în plus
  while (content.length && content[content.length - 1].type === "pageBreak") content.pop();
  if (!content.length) content.push({ type: "paragraph", attrs: { segId: ctx.segId() } });

  const bodySect = child(body, "w:sectPr");
  if (bodySect) ctx.sectPrs.push(bodySect);
  if (ctx.sectPrs.length > 1) warn(W.sections);
  pageFromSectPr(bodySect ?? ctx.sectPrs[ctx.sectPrs.length - 1], meta, warn);

  // anteturi și subsoluri: întâi cel implicit, apoi prima pagină și paginile pare
  const story = async (part: string, rootName: string): Promise<Block[]> => {
    const xml = await read(part);
    if (!xml) return [];
    const rels = await readRels(zip, part);
    const sub: Ctx = { ...ctx, rels: hyperlinkTargets(rels), fields: [], body: false, images: await images(part, rels), pending: [] };
    const its: Item[] = [];
    collectItems(child(parseXml(xml), rootName), sub, its);
    return assemble(its);
  };
  // o secțiune fără un anumit tip îl moștenește pe cel al secțiunii anterioare; prima pagină ține de
  // prima secțiune, restul de ultima
  const firstSect = ctx.sectPrs[0];
  if (onOff(child(firstSect, "w:titlePg"))) meta.titlePage = true;
  const settingsXml = await read(partOf("settings", "word/settings.xml"));
  if (settingsXml && onOff(find(parseXml(settingsXml), "w:evenAndOddHeaders"))) meta.evenOdd = true;
  for (const [refName, rootName, zone, kindsKey] of [
    ["w:headerReference", "w:hdr", "headers", "headerKinds"],
    ["w:footerReference", "w:ftr", "footers", "footerKinds"],
  ] as const) {
    const kinds: HeaderKind[] = [];
    for (const kind of ["default", "first", "even"] as const) {
      if ((kind === "first" && !meta.titlePage) || (kind === "even" && !meta.evenOdd)) continue;
      const sects = kind === "first" ? ctx.sectPrs : [...ctx.sectPrs].reverse();
      const ref = sects.map((s) => childrenNamed(s, refName).find((r) => (attr(r, "w:type") ?? "default") === kind)).find(Boolean);
      const rel = ref ? docRels.get(attr(ref, "r:id") ?? "") : undefined;
      if (!rel) continue;
      const blocks = await story(resolvePart(docPart, rel.target), rootName);
      if (!hasContent(blocks)) continue;
      meta[zone].push(blocks);
      kinds.push(kind);
    }
    if (kinds.length) meta[kindsKey] = kinds;
  }

  // note de subsol (și de final, tratate tot ca note de subsol)
  for (const [suffix, fallback, noteName, rootName, prefix] of [
    ["footnotes", "word/footnotes.xml", "w:footnote", "w:footnotes", ""],
    ["endnotes", "word/endnotes.xml", "w:endnote", "w:endnotes", "e"],
  ] as const) {
    const part = partOf(suffix, fallback);
    const xml = await read(part);
    if (!xml) continue;
    const rels = await readRels(zip, part);
    const sub: Ctx = { ...ctx, rels: hyperlinkTargets(rels), fields: [], body: false, images: await images(part, rels), pending: [] };
    for (const note of childrenNamed(child(parseXml(xml), rootName), noteName)) {
      const type = attr(note, "w:type");
      if (type && type !== "normal") continue;
      const its: Item[] = [];
      collectItems(note, sub, its);
      const blocks = assemble(its);
      trimLeading(blocks);
      if (!hasContent(blocks)) continue;
      if (prefix) warn(W.endnotes);
      meta.footnotes.push({ id: `${prefix}${attr(note, "w:id") ?? meta.footnotes.length + 1}`, content: blocks });
    }
  }

  const commentsXml = await read(partOf("comments", "word/comments.xml"));
  if (commentsXml && findAll(parseXml(commentsXml), "w:comment").length) warn(W.comments);
  if (ctx.unknown.size) warn(`Elemente nerecunoscute, ignorate la import: ${[...ctx.unknown].join(", ")}.`);

  return { content: { type: "doc", content }, meta, warnings: [...warnings] };
}
