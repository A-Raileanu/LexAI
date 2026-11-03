import type { DocMark, DocNode, DocumentMeta } from "../document/types";
import type { DocSegment } from "../types";
import { BAD_CHARS, LIST_START } from "./pdf-segment";

/**
 * Formatarea unui PDF reconstruită din stratul de text: rândurile devin paragrafe (unite peste
 * rânduri și peste pagini), îngroșatul, cursivul, fontul și mărimea vin din fonturile bucăților
 * de text, alinierea și indentările din pozițiile rândurilor față de marginile textului, iar
 * rândurile scurte, mai mari sau îngroșate devin titluri. Rezultă și setările de pagină și
 * valorile implicite ale documentului (fontul și mărimea dominante, interlinia, spațiul după
 * paragraf), ca majoritatea textului să nu poarte mark-uri.
 *
 * Totul e euristic: unde semnalele nu sunt clare, paragraful rămâne simplu (aliniat la stânga,
 * fără indentare), iar setările de pagină rămân cele implicite.
 */

/** Fontul unei bucăți de text, din `commonObjs` (pdf.js) și din stilurile conținutului text. */
export interface PdfFontInfo {
  /** numele fontului din PDF (ex. „ABCDEF+TimesNewRomanPS-BoldMT”) */
  name?: string;
  bold?: boolean;
  italic?: boolean;
  /** familia generică dată de pdf.js („serif”, „sans-serif”, „monospace”) */
  generic?: string;
}

/** Stratul de text al unei pagini, cu fonturile, pentru reconstruirea formatării. */
export interface PdfPageLayout {
  page: number;
  /** caseta paginii [x0, y0, x1, y1], în pt */
  view: number[];
  rotate: number;
  /** bucățile pdf.js, în ordinea originală (indicii rămân valabili pentru `pdfItems`) */
  items: unknown[];
  /** fontName (pdf.js) → informațiile fontului */
  fonts: Record<string, PdfFontInfo>;
}

/** Un paragraf sau titlu reconstruit, încă fără segId. */
export interface PdfBlock {
  node: DocNode;
  text: string;
  /** pagina pe care începe */
  page: number;
  /** toate paginile pe care se întinde (un paragraf poate continua pe pagina următoare) */
  pages: number[];
  pdfItems: NonNullable<DocSegment["pdfItems"]>;
}

export interface PdfLayout {
  blocks: PdfBlock[];
  /** anteturile și subsolurile repetate pe pagini (numerotarea paginilor se elimină) */
  headers: PdfBlock[];
  footers: PdfBlock[];
  /** setările de pagină; lipsesc când dimensiunea paginii nu e A4/Letter sau nu e text destul */
  page?: DocumentMeta["page"];
  defaults: DocumentMeta["defaults"];
}

const DEFAULTS: DocumentMeta["defaults"] = { fontFamily: "Times New Roman", fontSizePt: 12, lineHeight: 1.15, spaceAfterPt: 6 };
const PT_TO_MM = 25.4 / 72;

type RawItem = { str: string; transform: number[]; width: number; height: number; hasEOL?: boolean; fontName?: string };

interface Style {
  bold: boolean;
  italic: boolean;
  /** familia, dacă poate fi pusă în corespondență cu un font obișnuit */
  family?: string;
}

interface Piece {
  index: number;
  str: string;
  /** separatorul față de bucata anterioară din rând („ ” când între ele e un spațiu vizibil) */
  lead: string;
  x: number;
  right: number;
  y: number;
  size: number;
  style: Style;
  sup: boolean;
  eol: boolean;
}

interface Line {
  page: number;
  pieces: Piece[];
  x: number;
  right: number;
  /** linia de bază și mărimea de referință (prima bucată cu text) */
  y: number;
  size: number;
  rotated: boolean;
  text: string;
  /** fracțiunea de caractere îngroșate */
  bold: number;
}

// ───────────────────────── fonturi ─────────────────────────

const FAMILIES: [RegExp, string][] = [
  [/timesnewroman|^times|tinos|liberationserif|nimbusrom/, "Times New Roman"],
  [/arial|helvetica|arimo|liberationsans|nimbussans/, "Arial"],
  [/calibri|carlito/, "Calibri"],
  [/cambria|caladea/, "Cambria"],
  [/georgia/, "Georgia"],
  [/garamond/, "Garamond"],
  [/verdana/, "Verdana"],
  [/tahoma/, "Tahoma"],
  [/trebuchet/, "Trebuchet MS"],
  [/couriernew|^courier|cousine|liberationmono|nimbusmono/, "Courier New"],
  [/bookantiqua|palatino/, "Palatino Linotype"],
  [/bookman/, "Bookman Old Style"],
  [/centurygothic/, "Century Gothic"],
  [/segoeui/, "Segoe UI"],
];
const GENERIC: Record<string, string> = { serif: "Times New Roman", "sans-serif": "Arial", monospace: "Courier New" };

/** Familia, îngroșarea și cursivul din numele fontului (ex. „TimesNewRomanPS-BoldItalicMT”, „Arial,Bold”). */
export function fontStyle(font: PdfFontInfo | undefined): Style {
  const name = (font?.name ?? "").replace(/^[A-Z]{6}\+/, "");
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  const family = FAMILIES.find(([re]) => re.test(key))?.[1] ?? (font?.generic ? GENERIC[font.generic] : undefined);
  return {
    bold: font?.bold === true || /bold|black|heavy|demi/i.test(name) || /[,-](b|bd|bi)$/i.test(name),
    italic: font?.italic === true || /italic|oblique|kursiv/i.test(name) || /[,-](i|it|bi)$/i.test(name),
    family,
  };
}

// ───────────────────────── utilitare numerice ─────────────────────────

const half = (n: number) => Math.round(n * 2) / 2;

/** Valoarea cea mai frecventă (ponderată), după rotunjirea la `step`. */
function mode(values: [number, number][], step: number): number | undefined {
  const counts = new Map<number, number>();
  for (const [v, w] of values) {
    const k = Math.round(v / step) * step;
    counts.set(k, (counts.get(k) ?? 0) + w);
  }
  let best: number | undefined;
  let bestW = 0;
  for (const [k, w] of counts) if (w > bestW || (w === bestW && best !== undefined && k < best)) [best, bestW] = [k, w];
  return best;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const isBlank = (s: string) => !s.trim();

// ───────────────────────── rânduri ─────────────────────────

/** Bucățile unei pagini grupate pe rânduri (după linia de bază), cu spațiile dintre bucăți. */
function pageLines(pg: PdfPageLayout): Line[] {
  const [vx = 0, vy = 0] = pg.view;
  const styles = new Map<string, Style>();
  const styleOf = (fontName: string | undefined) => {
    const k = fontName ?? "";
    let s = styles.get(k);
    if (!s) styles.set(k, (s = fontStyle(pg.fonts[k])));
    return s;
  };
  const lines: Line[] = [];
  let cur: Line | null = null;

  pg.items.forEach((raw, index) => {
    if (!raw || typeof raw !== "object" || !("str" in raw)) return;
    const it = raw as RawItem;
    if (!it.str) return;
    const [a, b, c, d, e, f] = it.transform;
    const rotated = Math.abs(b) > 0.01 || Math.abs(c) > 0.01 || a <= 0;
    const size = (rotated ? Math.hypot(c, d) : Math.abs(d)) || Math.abs(it.height) || cur?.size || 10;
    const str = it.str.replace(BAD_CHARS, "�");
    // lățimea fără spațiile de la final (Word lasă spațiul de la capătul rândului în bucată)
    const trimmed = str.trimEnd().length;
    const width = it.width > 0 ? (it.width * trimmed) / Math.max(1, str.length) : 0;
    const piece: Piece = { index, str, lead: "", x: e - vx, right: e - vx + width, y: f - vy, size, style: styleOf(it.fontName), sup: false, eol: !!it.hasEOL };

    if (cur && rotated && cur.rotated) {
      cur.pieces.push(piece);
      return;
    }
    if (cur && !rotated && !cur.rotated) {
      const prev = cur.pieces[cur.pieces.length - 1];
      // același text tipărit de două ori, ușor decalat: îngroșare simulată
      if (str.trim() && str === prev.str && Math.abs(piece.x - prev.x) < 1.5 && Math.abs(piece.y - prev.y) < 1.5) {
        prev.style = { ...prev.style, bold: true };
        return;
      }
      const ref = cur.pieces.some((p) => !isBlank(p.str));
      if (!ref && !isBlank(str)) {
        // rândul are până acum doar spații: prima bucată cu text devine referința
        cur.y = piece.y;
        cur.size = size;
      }
      const dy = piece.y - cur.y;
      if (Math.abs(dy) <= 0.5 * Math.max(size, cur.size)) {
        if (ref && size < cur.size * 0.85 && dy > 0.15 * cur.size) piece.sup = true;
        cur.pieces.push(piece);
        return;
      }
    }
    cur = { page: pg.page, pieces: [piece], x: piece.x, right: piece.right, y: piece.y, size, rotated, text: "", bold: 0 };
    lines.push(cur);
  });

  for (const l of lines) {
    let text = "";
    let boldChars = 0;
    let chars = 0;
    l.pieces.forEach((p, i) => {
      const prev = l.pieces[i - 1];
      if (prev && !/\s$/.test(text) && !/^\s/.test(p.str)) {
        const gap = p.x - prev.right;
        if (l.rotated ? prev.eol : gap > 0.2 * Math.max(p.size, l.size)) p.lead = " ";
      }
      text += p.lead + p.str;
      const n = p.str.replace(/\s/g, "").length;
      chars += n;
      if (p.style.bold) boldChars += n;
    });
    const solid = l.pieces.filter((p) => !isBlank(p.str));
    l.text = text;
    l.bold = chars ? boldChars / chars : 0;
    if (solid.length && !l.rotated) {
      l.x = Math.min(...solid.map((p) => p.x));
      l.right = Math.max(...solid.map((p) => p.right));
    }
  }
  return lines.filter((l) => l.text.trim());
}

// ───────────────────────── anteturi și subsoluri ─────────────────────────

const PAGE_NUMBER = /^\s*(pagina|pag\.?|page|p\.)?\s*[-–—]?\s*\d{1,4}\s*[-–—]?\s*((din|of|\/)\s*\d{1,4})?\s*[-–—]?\s*$/i;

/**
 * Primul și ultimul grup de rânduri al paginii, despărțite de restul textului printr-un spațiu
 * vertical și aflate în întregime în zona de sus (de jos) a paginii: locul anteturilor și subsolurilor.
 */
function edgeBands(pg: { height: number; lines: Line[] }): ["sus" | "jos", Line][] {
  const ls = pg.lines.filter((l) => !l.rotated).sort((a, b) => b.y - a.y);
  const band = (from: Line[], inZone: (l: Line) => boolean): Line[] => {
    const out: Line[] = [];
    for (const l of from) {
      const prev = out[out.length - 1];
      if (prev && Math.abs(prev.y - l.y) > 1.6 * Math.max(prev.size, l.size)) return out.every(inZone) && out.length < from.length ? out : [];
      out.push(l);
    }
    return []; // toată pagina e un singur grup: nu are antet sau subsol separat
  };
  const top = band(ls, (l) => l.y > pg.height * 0.88);
  const bottom = band([...ls].reverse(), (l) => l.y < pg.height * 0.12).filter((l) => !top.includes(l));
  return [...top.map((l) => ["sus", l] as ["sus", Line]), ...bottom.map((l) => ["jos", l] as ["jos", Line])];
}

/**
 * Rândurile din zona de sus / de jos a paginilor care se repetă (același text, cifrele ignorate)
 * sau care sunt doar numărul paginii. Întoarce rândurile eliminate din corp și, pentru textul
 * repetat identic, rândurile primei apariții (devin antet / subsol).
 */
function pageFurniture(pages: { page: number; height: number; lines: Line[] }[]) {
  const removed = new Set<Line>();
  const headers: Line[] = [];
  const footers: Line[] = [];
  const groups = new Map<string, { lines: Line[]; texts: Set<string>; zone: "sus" | "jos" }>();
  for (const pg of pages) {
    for (const [zone, l] of edgeBands(pg)) {
      if (PAGE_NUMBER.test(l.text)) {
        removed.add(l);
        continue;
      }
      const key = `${zone}|${Math.round(l.y / 6)}|${l.text.trim().toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ")}`;
      const g = groups.get(key) ?? { lines: [], texts: new Set<string>(), zone };
      g.lines.push(l);
      g.texts.add(l.text.trim());
      groups.set(key, g);
    }
  }
  const textPages = pages.filter((p) => p.lines.length).length;
  for (const g of groups.values()) {
    const onPages = new Set(g.lines.map((l) => l.page)).size;
    if (onPages < 2 || onPages < Math.min(3, Math.ceil(textPages / 2))) continue;
    for (const l of g.lines) removed.add(l);
    // textul care diferă între pagini (ex. „Dosar 12 – pagina 3”) nu se păstrează
    if (g.texts.size === 1) (g.zone === "sus" ? headers : footers).push(g.lines[0]);
  }
  const order = (a: Line, b: Line) => a.page - b.page || b.y - a.y;
  return { removed, headers: headers.sort(order), footers: footers.sort(order) };
}

// ───────────────────────── coloana de text ─────────────────────────

/** Marginea cea mai din stânga (sau dreapta) la care încep (se termină) cel puțin câteva rânduri. */
function edge(values: number[], side: "left" | "right"): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => (side === "left" ? a - b : b - a));
  const need = Math.max(2, Math.ceil(values.length * 0.05));
  for (const v of sorted) if (values.filter((w) => Math.abs(w - v) <= 1.5).length >= need) return v;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.05))];
}

interface Column {
  L: number;
  R: number;
}

// ───────────────────────── paragrafe ─────────────────────────

interface Ctx {
  bodySize: number;
  /** distanța obișnuită dintre liniile de bază ale rândurilor unui paragraf (la mărimea corpului) */
  pitch: number;
  col: (page: number) => Column;
}

const SENTENCE_END = /[.;:!?]["”)»]?$/;
const HYPHEN_END = /\p{L}[-­‐]$/u;

/** Ar fi încăput primul cuvânt al rândului `b` la capătul rândului `a`? Atunci `a` a încheiat paragraful. */
function fitsOnPrevious(a: Line, b: Line, ctx: Ctx): boolean {
  const word = b.text.trimStart().match(/^\S+/)?.[0] ?? "";
  const p = b.pieces.find((q) => !isBlank(q.str));
  const charW = p ? Math.max(0.3 * p.size, (p.right - p.x) / Math.max(1, p.str.trim().length)) : 0.5 * b.size;
  const slack = ctx.col(a.page).R - a.right - (0.25 * a.size + word.length * charW);
  return slack > (SENTENCE_END.test(a.text.trimEnd()) ? 0 : 0.5 * a.size);
}

/** Începe rândul `b` un paragraf nou, după rândul `a` (ultimul din paragraful `para`)? */
function breaksBefore(a: Line, b: Line, para: Line[], ctx: Ctx): boolean {
  if (a.rotated || b.rotated) return true;
  if (b.page !== a.page && b.page !== a.page + 1) return true;
  const size = Math.max(a.size, b.size);
  if (Math.abs(a.size - b.size) > Math.max(1, 0.12 * ctx.bodySize)) return true;
  const end = a.text.trimEnd();
  const hyphen = HYPHEN_END.test(end);
  if (((a.bold >= 0.9 && b.bold <= 0.1) || (a.bold <= 0.1 && b.bold >= 0.9)) && !hyphen && !/,$/.test(end)) return true;
  if (b.page === a.page) {
    const gap = a.y - b.y;
    // rândul următor e mai sus (altă coloană, ordine neobișnuită) sau după un spațiu vertical
    if (gap <= 0) return true;
    if (gap > ctx.pitch * (size / ctx.bodySize) * 1.3 + 1) return true;
  }
  if (!hyphen && fitsOnPrevious(a, b, ctx)) return true;
  if (LIST_START.test(b.text.trimStart()) && SENTENCE_END.test(end)) return true;
  // indentarea: un rând mai la dreapta (sau mai la stânga) decât continuarea paragrafului
  const rel = (l: Line) => l.x - ctx.col(l.page).L;
  const tol = Math.max(3, 0.6 * ctx.bodySize);
  if (para.length >= 2) {
    const cont = rel(para[1]);
    if (Math.abs(rel(b) - cont) > tol) return true;
  } else if (rel(b) > rel(a) + tol) {
    // excepție: continuarea unui element de listă aliniată după marcaj („a) text…”)
    if (!(LIST_START.test(a.text.trimStart()) && rel(b) - rel(a) < 4 * size)) return true;
  }
  return false;
}

interface Run {
  text: string;
  style: Style;
  size: number;
  sup: boolean;
}

interface Group {
  lines: Line[];
  /** spațiul suplimentar (pt) până la paragraful următor, când e pe aceeași pagină */
  extraAfter?: number;
}

/** Textul și bucățile unui paragraf, cu unirea rândurilor (cratimele de la capăt rămân, fără spațiu). */
function assemble(lines: Line[]) {
  const runs: Run[] = [];
  const pdfItems: PdfBlock["pdfItems"] = [];
  let text = "";
  let last: Run | undefined;
  const push = (s: string, style: Style, size: number, sup: boolean) => {
    if (!s) return;
    // spațiile preiau stilul textului dinainte, ca să nu fragmenteze mark-urile
    const run: Run = isBlank(s) && last ? { text: s, style: last.style, size: last.size, sup: last.sup } : { text: s, style, size, sup };
    const prev = runs[runs.length - 1];
    if (prev && prev.style === run.style && prev.size === run.size && prev.sup === run.sup) prev.text += s;
    else runs.push(run);
    if (!isBlank(s)) last = run;
    text += s;
  };
  lines.forEach((l, li) => {
    if (li > 0) {
      if (/­$/.test(text)) {
        // cratima opțională (de despărțire în silabe) dispare
        text = text.slice(0, -1);
        const r = runs[runs.length - 1];
        r.text = r.text.slice(0, -1);
        const it = pdfItems[pdfItems.length - 1];
        if (it) it.length = Math.max(0, Math.min(it.length, text.length - it.offset));
      } else if (!HYPHEN_END.test(text) && !/\s$/.test(text) && !/^\s/.test(l.text)) {
        push(" ", last?.style ?? l.pieces[0].style, last?.size ?? l.size, false);
      }
    }
    for (const p of l.pieces) {
      if (p.lead && !/\s$/.test(text)) push(p.lead, p.style, p.size, p.sup);
      let s = p.str;
      if (!text || /\s$/.test(text)) s = s.replace(/^\s+/, "");
      if (!s) continue;
      pdfItems.push({ page: l.page, item: p.index, offset: text.length, length: s.length });
      push(s, p.style, half(p.size), p.sup);
    }
  });
  // fără spații la final
  const trimmed = text.trimEnd();
  let extra = text.length - trimmed.length;
  while (extra > 0 && runs.length) {
    const r = runs[runs.length - 1];
    const cut = Math.min(extra, r.text.length);
    r.text = r.text.slice(0, r.text.length - cut);
    extra -= cut;
    if (!r.text) runs.pop();
  }
  for (const it of pdfItems) it.length = Math.max(0, Math.min(it.length, trimmed.length - it.offset));
  return { text: trimmed, runs, pdfItems: pdfItems.filter((it) => it.length > 0) };
}

function marksOf(r: Run, defaults: DocumentMeta["defaults"]): DocMark[] {
  const marks: DocMark[] = [];
  if (r.style.bold) marks.push({ type: "bold" });
  if (r.style.italic) marks.push({ type: "italic" });
  if (r.sup) marks.push({ type: "superscript" });
  const ts: Record<string, unknown> = {};
  if (r.style.family && r.style.family !== defaults.fontFamily) ts.fontFamily = r.style.family;
  if (!r.sup && Math.abs(r.size - defaults.fontSizePt) >= 0.5) ts.fontSize = `${r.size}pt`;
  if (Object.keys(ts).length) marks.push({ type: "textStyle", attrs: ts });
  return marks;
}

function inlineContent(runs: Run[], defaults: DocumentMeta["defaults"]): DocNode[] {
  const out: DocNode[] = [];
  let prevKey = "";
  for (const r of runs) {
    const marks = marksOf(r, defaults);
    const key = JSON.stringify(marks);
    const prev = out[out.length - 1];
    if (prev && key === prevKey) prev.text += r.text;
    else out.push(marks.length ? { type: "text", text: r.text, marks } : { type: "text", text: r.text });
    prevKey = key;
  }
  return out;
}

// ───────────────────────── documentul ─────────────────────────

/** Reconstruiește paragrafele, titlurile și setările documentului din straturile de text ale paginilor. */
export function layoutPdf(pages: PdfPageLayout[]): PdfLayout {
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  const perPage = sorted.map((pg) => ({ page: pg.page, height: (pg.view[3] ?? 842) - (pg.view[1] ?? 0), width: (pg.view[2] ?? 595) - (pg.view[0] ?? 0), lines: pageLines(pg) }));
  const furniture = pageFurniture(perPage);
  const body = perPage.flatMap((p) => p.lines.filter((l) => !furniture.removed.has(l)));
  const flat = body.filter((l) => !l.rotated);

  // mărimea și fontul dominante (după numărul de caractere)
  const sizes: [number, number][] = [];
  const families = new Map<string, number>();
  let boldChars = 0;
  let allChars = 0;
  for (const l of flat)
    for (const p of l.pieces) {
      const n = p.str.replace(/\s/g, "").length;
      if (!n || p.sup) continue;
      sizes.push([p.size, n]);
      if (p.style.family) families.set(p.style.family, (families.get(p.style.family) ?? 0) + n);
      allChars += n;
      if (p.style.bold) boldChars += n;
    }
  const bodySize = mode(sizes, 0.5) ?? DEFAULTS.fontSizePt;
  const bodyBold = allChars ? boldChars / allChars : 0;
  const family = [...families].sort((a, b) => b[1] - a[1])[0]?.[0];

  // interlinia: distanța cea mai frecventă dintre rânduri consecutive de mărimea corpului
  const pitches: [number, number][] = [];
  for (let i = 1; i < flat.length; i++) {
    const [a, b] = [flat[i - 1], flat[i]];
    if (a.page !== b.page || Math.abs(a.size - bodySize) > 0.6 || Math.abs(b.size - bodySize) > 0.6) continue;
    const gap = a.y - b.y;
    if (gap > 0.8 * bodySize && gap < 2.5 * bodySize) pitches.push([gap, 1]);
  }
  const pitch = pitches.length >= 2 ? mode(pitches, 0.5)! : bodySize * DEFAULTS.lineHeight;

  // coloana de text: globală, cu decalaj pe pagină când marginile diferă (pagini pare / impare)
  const L = edge(flat.map((l) => l.x), "left") ?? 72;
  const R = Math.max(L + 10, edge(flat.map((l) => l.right), "right") ?? 523);
  const columns = new Map<number, Column>();
  for (const p of perPage) {
    const ls = p.lines.filter((l) => !l.rotated && !furniture.removed.has(l));
    const left = ls.length >= 6 ? edge(ls.map((l) => l.x), "left") : undefined;
    columns.set(p.page, left !== undefined && Math.abs(left - L) > 3 ? { L: left, R: left + (R - L) } : { L, R });
  }
  const ctx: Ctx = { bodySize, pitch, col: (page) => columns.get(page) ?? { L, R } };

  const group = (lines: Line[]): Group[] => {
    const groups: Group[] = [];
    for (const l of lines) {
      const g = groups[groups.length - 1];
      const prev = g?.lines[g.lines.length - 1];
      if (g && prev && !breaksBefore(prev, l, g.lines, ctx)) g.lines.push(l);
      else {
        if (g && prev && prev.page === l.page && !prev.rotated && !l.rotated) {
          // distanța așteptată fără spațiu suplimentar: jumătate din rândul fiecăruia dintre cele două paragrafe
          g.extraAfter = prev.y - l.y - (pitch / bodySize) * ((prev.size + l.size) / 2);
        }
        groups.push({ lines: [l] });
      }
    }
    return groups;
  };
  const groups = group(body);

  const rel = (l: Line) => l.x - ctx.col(l.page).L;
  const rr = (l: Line) => ctx.col(l.page).R - l.right;
  const lineTol = (l: Line) => Math.max(2, 0.3 * l.size);
  const multi = groups.filter((g) => g.lines.length >= 2 && !g.lines[0].rotated);
  // textul e aliniat stânga-dreapta doar dacă majoritatea rândurilor din interiorul paragrafelor ating marginea dreaptă
  const inner = multi.flatMap((g) => g.lines.slice(0, -1));
  const justifiedDoc = inner.length >= 3 && inner.filter((l) => rr(l) <= lineTol(l)).length / inner.length >= 0.6;
  // indentarea obișnuită a primului rând
  const firstIndents = multi.map((g) => rel(g.lines[0]) - rel(g.lines[1])).filter((d) => d > 3);
  const firstIndent = firstIndents.length >= 2 ? mode(firstIndents.map((d) => [d, 1]), 1) : undefined;

  // spațiul după paragraf: cel mai frecvent spațiu suplimentar dintre paragrafele corpului
  const extras = groups.flatMap((g) => (g.extraAfter !== undefined && Math.abs(g.lines[0].size - bodySize) <= 0.6 ? [[Math.max(0, g.extraAfter), 1] as [number, number]] : []));
  const spaceAfter = extras.length >= 2 ? clamp(mode(extras, 1)!, 0, 24) : extras.length ? clamp(Math.round(Math.max(0, extras[0][0])), 0, 24) : DEFAULTS.spaceAfterPt;
  const defaults: DocumentMeta["defaults"] = {
    fontFamily: family ?? DEFAULTS.fontFamily,
    fontSizePt: half(bodySize),
    lineHeight: pitches.length >= 2 ? clamp(Math.round((pitch / bodySize) * 100) / 100, 1, 2.5) : DEFAULTS.lineHeight,
    spaceAfterPt: spaceAfter,
  };

  const colWidth = R - L;
  const isCentered = (lines: Line[]) => !lines[0].rotated && lines.every((l) => rel(l) > 1.5 * l.size && Math.abs(rel(l) - rr(l)) <= Math.max(4, 0.03 * colWidth));

  const build = (g: Group, a: ReturnType<typeof assemble>, level: number | undefined): PdfBlock => {
    const { lines } = g;
    const attrs: Record<string, unknown> = {};
    const size = lines[0].size;
    if (!lines[0].rotated) {
      const centered = isCentered(lines);
      const right = !centered && lines.every((l) => rr(l) <= lineTol(l) && rel(l) > 0.25 * colWidth);
      const justified = !centered && !right && justifiedDoc && lines.length >= 2 && lines.slice(0, -1).every((l) => rr(l) <= lineTol(l));
      if (centered) attrs.textAlign = "center";
      else if (right) attrs.textAlign = "right";
      else if (justified) attrs.textAlign = "justify";
      if (!centered && !right) {
        const first = Math.max(0, rel(lines[0]));
        let indent = first;
        let firstLine = 0;
        if (lines.length >= 2) {
          indent = Math.max(0, rel(lines[1]));
          firstLine = first - indent;
        } else if (firstIndent !== undefined && Math.abs(first - firstIndent) <= 2) {
          // un paragraf de un singur rând, indentat cât primul rând al celorlalte
          [indent, firstLine] = [0, firstIndent];
        }
        if (indent >= 3) attrs.indentPt = Math.round(indent);
        if (Math.abs(firstLine) >= 3) attrs.firstLineIndentPt = Math.round(firstLine);
      }
      // interlinia proprie, când diferă vizibil de cea a documentului
      const inside = lines.slice(1).flatMap((l, i) => (l.page === lines[i].page ? [lines[i].y - l.y] : []));
      const lh = median(inside);
      if (lh !== undefined) {
        const m = Math.round((lh / size) * 20) / 20;
        if (Math.abs(m - defaults.lineHeight) > 0.1) attrs.lineHeight = clamp(m, 1, 3);
      }
      if (g.extraAfter !== undefined) {
        const after = clamp(Math.round(g.extraAfter), 0, 72);
        if (Math.abs(after - defaults.spaceAfterPt) >= 3) attrs.spaceAfterPt = after;
      }
    }
    const content = inlineContent(a.runs, defaults);
    const node: DocNode = level ? { type: "heading", attrs: { level, ...attrs } } : { type: "paragraph", attrs };
    if (content.length) node.content = content;
    return { node, text: a.text, page: lines[0].page, pages: [...new Set(lines.map((l) => l.page))], pdfItems: a.pdfItems };
  };

  // titlurile: mai întâi candidații, apoi nivelurile, după mărime (cel mai mare = nivelul 1)
  const assembled = groups.map((g) => assemble(g.lines));
  const candidates = groups.map((g, i) => headingKind(g, assembled[i], isCentered(g.lines), bodySize, bodyBold));
  const bigSizes = [...new Set(candidates.flatMap((h) => (h?.big ? [h.size] : [])))].sort((a, b) => b - a).slice(0, 3);
  const levelOf = (h: HeadingCandidate | null): number | undefined => {
    if (!h) return undefined;
    if (h.big) return Math.min(3, bigSizes.findIndex((s) => s <= h.size) + 1 || bigSizes.length);
    // titlurile îngroșate de mărimea corpului vin după cele mai mari (majusculele înaintea celorlalte)
    return Math.min(4, bigSizes.length + (h.upper ? 1 : 2));
  };
  const blocks = groups.map((g, i) => build(g, assembled[i], levelOf(candidates[i])));
  const furnitureBlocks = (ls: Line[]) => group(ls).map((g) => build(g, assemble(g.lines), undefined));

  return {
    blocks,
    headers: furnitureBlocks(furniture.headers),
    footers: furnitureBlocks(furniture.footers),
    page: pageMeta(sorted, perPage, flat, ctx, furniture.removed),
    defaults,
  };
}

interface HeadingCandidate {
  big: boolean;
  upper: boolean;
  size: number;
}

const STRUCTURAL = /^(capitolul|titlul|partea|sec[țţt]iunea|anexa)\b|^art(\.|icolul)\s*\d+|^([IVXLC]+|\d+(\.\d+)*)[.)]\s+\p{Lu}/iu;

/** Un paragraf scurt, de sine stătător, mai mare decât corpul sau îngroșat (majuscule, „Art. 1.”, centrat). */
function headingKind(g: Group, h: { text: string; runs: Run[] }, centered: boolean, bodySize: number, bodyBold: number): HeadingCandidate | null {
  const text = h.text.trim();
  if (g.lines[0].rotated || g.lines.length > 3 || text.length > 160 || /[,;]$/.test(text)) return null;
  let chars = 0;
  let bold = 0;
  let sizeSum = 0;
  for (const r of h.runs) {
    const n = r.text.replace(/\s/g, "").length;
    if (r.sup) continue;
    chars += n;
    sizeSum += r.size * n;
    if (r.style.bold) bold += n;
  }
  if (!chars) return null;
  const size = half(sizeSum / chars);
  const letters = text.replace(/[^\p{L}]/gu, "");
  const upper = letters.length >= 3 && letters === letters.toLocaleUpperCase("ro") && letters !== letters.toLocaleLowerCase("ro");
  const big = size >= bodySize * 1.12 && size - bodySize >= 1 && g.lines.length <= 2 && (!/\.$/.test(text) || text.length <= 80);
  const boldAll = bold / chars >= 0.9 && bodyBold < 0.5;
  if (big) return { big, upper, size };
  if (boldAll && text.length <= 120 && (upper || STRUCTURAL.test(text) || centered)) return { big: false, upper, size };
  if (upper && centered && g.lines.length <= 2 && text.length <= 80 && letters.length >= 4) return { big: false, upper, size };
  return null;
}

const SIZES = [
  { size: "A4" as const, w: 595.28, h: 841.89 },
  { size: "Letter" as const, w: 612, h: 792 },
];

/** Dimensiunea, orientarea și marginile paginii, din prima pagină și din limitele textului. */
function pageMeta(pages: PdfPageLayout[], perPage: { page: number; width: number; height: number; lines: Line[] }[], flat: Line[], ctx: Ctx, removed: Set<Line>): DocumentMeta["page"] | undefined {
  const first = pages[0];
  const dims = perPage[0];
  if (!first || !dims || flat.length < 3) return undefined;
  const rotated = first.rotate % 180 !== 0;
  const [w, h] = rotated ? [dims.height, dims.width] : [dims.width, dims.height];
  const [short, long] = [Math.min(w, h), Math.max(w, h)];
  const match = SIZES.find((s) => Math.abs(s.w - short) <= 6 && Math.abs(s.h - long) <= 6);
  if (!match) return undefined;
  const orientation = w > h ? "landscape" : "portrait";
  const def = 25;
  const mm = (pt: number) => clamp(Math.round(pt * PT_TO_MM), 10, 40);
  if (rotated) return { size: match.size, orientation, marginsMm: { top: def, right: def, bottom: def, left: def } };

  const { L, R } = ctx.col(dims.page);
  const tops: number[] = [];
  const bottoms: number[] = [];
  const withText = perPage.map((p) => ({ height: p.height, ls: p.lines.filter((l) => !l.rotated && !removed.has(l)) })).filter((p) => p.ls.length);
  withText.forEach(({ height, ls }, i) => {
    tops.push(height - Math.max(...ls.map((l) => l.y + 0.85 * l.size)));
    // ultima pagină cu text se termină de obicei înainte de marginea de jos
    if (i < withText.length - 1) bottoms.push(Math.max(0, Math.min(...ls.map((l) => l.y - 0.25 * l.size))));
  });
  const top = tops.length ? mm(Math.min(...tops)) : def;
  // o singură pagină cu text: marginea de jos e cel mult cât arată textul, fără să depășească valoarea implicită
  const lastBottom = Math.max(0, Math.min(...withText[withText.length - 1].ls.map((l) => l.y - 0.25 * l.size)));
  const bottom = bottoms.length ? mm(Math.min(...bottoms)) : Math.min(def, mm(lastBottom));
  return { size: match.size, orientation, marginsMm: { top, right: mm(dims.width - R), bottom, left: mm(L) } };
}
