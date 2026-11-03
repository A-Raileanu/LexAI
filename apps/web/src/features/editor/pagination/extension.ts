import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";
import { linesFromRects, pageAt, paginate, type LayoutLine, type LayoutUnit, type PageGeometry } from "./layout";

/**
 * Paginarea editorului (ca Print Layout din Word), pe ProseMirror OSS: după fiecare randare
 * măsurăm blocurile, calculăm capetele de pagină (`layout.ts`) și inserăm spații prin decorații
 * (nu ajung în JSON, în text, în segmentele analizei sau în DOCX). Paginile albe sunt desenate de
 * `A4Sheet` în spatele textului, din numărul de pagini publicat în `PaginationStore`.
 *
 * Tipuri de spațiu, fiecare împinge tot ce urmează cu exact înălțimea lui (deci măsurarea
 * „naturală” = poziția măsurată minus spațiile de deasupra, iar calculul converge dintr-un pas):
 * - `pad`: padding-top pe un paragraf / titlu care începe pagina (păstrează indentarea primului rând);
 * - `line`: un inline-block cât lățimea rândului, înaintea primului rând mutat dintr-un paragraf
 *   (rândul dinainte se rupe tot „moale”, deci alinierea stânga-dreapta rămâne);
 * - `row`: un rând gol de tabel, fără borduri, înaintea rândului mutat;
 * - `block`: un div înaintea unui bloc atomic (salt de pagină, linie orizontală; fără margini verticale).
 */

export type SpacerKind = "pad" | "line" | "row" | "block";

export interface PageSpacer {
  kind: SpacerKind;
  pos: number;
  space: number;
  /** coloanele tabelului, pentru rândul gol */
  cols?: number;
}

export interface PaginationSnapshot {
  pages: number;
  /** pagina cursorului (de la 1) */
  page: number;
}

/** Numărul de pagini și pagina cursorului, pentru React (`usePagination`). */
export class PaginationStore {
  private snap: PaginationSnapshot = { pages: 1, page: 1 };
  private listeners = new Set<() => void>();

  get = (): PaginationSnapshot => this.snap;

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  set(next: PaginationSnapshot) {
    if (next.pages === this.snap.pages && next.page === this.snap.page) return;
    this.snap = next;
    for (const l of this.listeners) l();
  }
}

export interface PaginationStorage {
  store: PaginationStore;
}

interface PaginationState {
  spacers: PageSpacer[];
  deco: DecorationSet;
}

export const paginationKey = new PluginKey<PaginationState>("lexPagination");

/** Spațiile mai mici de atât nu se desenează (rotunjiri). */
const MIN_SPACE = 0.5;
/** Recalculări consecutive fără convergență, după care ne oprim până la următoarea modificare. */
const MAX_ROUNDS = 4;

const px = (v: number) => `${v.toFixed(2)}px`;

function spacerDom(tag: "div" | "span", space: number): HTMLElement {
  const el = document.createElement(tag);
  el.className = "lex-page-spacer";
  el.setAttribute("contenteditable", "false");
  el.setAttribute("aria-hidden", "true");
  el.dataset.lexSpacer = "";
  el.style.height = px(space);
  return el;
}

function rowDom(space: number, cols: number): HTMLElement {
  const tr = document.createElement("tr");
  tr.className = "lex-page-spacer";
  tr.setAttribute("contenteditable", "false");
  tr.setAttribute("aria-hidden", "true");
  tr.dataset.lexSpacer = "";
  const td = tr.appendChild(document.createElement("td"));
  td.colSpan = Math.max(1, cols);
  td.style.height = px(space);
  return tr;
}

function buildDeco(doc: PMNode, spacers: PageSpacer[]): DecorationSet {
  const decos: Decoration[] = [];
  for (const s of spacers) {
    if (s.space < MIN_SPACE || s.pos < 0 || s.pos > doc.content.size) continue;
    const key = `lexpg:${s.kind}:${s.cols ?? 0}:${s.space.toFixed(2)}`;
    if (s.kind === "pad") {
      const node = doc.nodeAt(s.pos);
      if (!node?.isTextblock) continue;
      decos.push(Decoration.node(s.pos, s.pos + node.nodeSize, { class: "lex-push", style: `--lex-push: ${px(s.space)}`, "data-lex-push": s.space.toFixed(2) }));
    } else if (s.kind === "row") {
      decos.push(Decoration.widget(s.pos, () => rowDom(s.space, s.cols ?? 1), { side: -1, key, ignoreSelection: true }));
    } else {
      decos.push(Decoration.widget(s.pos, () => spacerDom(s.kind === "line" ? "span" : "div", s.space), { side: -1, key, ignoreSelection: true }));
    }
  }
  return DecorationSet.create(doc, decos);
}

const sameSpacers = (a: PageSpacer[], b: PageSpacer[]) =>
  a.length === b.length && a.every((s, i) => s.kind === b[i].kind && s.pos === b[i].pos && (s.cols ?? 0) === (b[i].cols ?? 0) && Math.abs(s.space - b[i].space) < MIN_SPACE);

/** Geometria paginii, din atributele puse de `A4Sheet` (px nescalați). */
interface SheetGeometry extends PageGeometry {
  marginTop: number;
  pageWidth: number;
}

function sheetGeometry(sheet: HTMLElement): SheetGeometry | null {
  const d = sheet.dataset;
  const height = Number(d.pageHeight);
  const width = Number(d.pageWidth);
  const mt = Number(d.marginTop);
  const mb = Number(d.marginBottom);
  const gap = Number(d.pageGap);
  if (!(height > 0 && width > 0) || [mt, mb, gap].some((v) => !Number.isFinite(v))) return null;
  return { contentHeight: Math.max(1, height - mt - mb), pitch: height + gap, marginTop: mt, pageWidth: width };
}

type UnitKind = "text" | "row" | "atom" | "marker";

interface UnitRef {
  kind: UnitKind;
  pos: number;
  node: PMNode;
  el: HTMLElement;
  cols?: number;
}

interface Measured {
  spacers: PageSpacer[];
  pages: number;
}

/** Instrumentele de măsurare: coordonate relative la începutul zonei de text a primei pagini. */
function createMeter(view: EditorView, sheet: HTMLElement, geo: SheetGeometry) {
  const sheetRect = sheet.getBoundingClientRect();
  const scale = sheetRect.width / geo.pageWidth;
  if (!(scale > 0)) return null;
  const origin = sheetRect.top + geo.marginTop * scale;
  const m = (clientY: number) => (clientY - origin) / scale;

  // spațiile deja inserate: [început, înălțime], în coordonatele măsurate
  const regions: { top: number; h: number }[] = [];
  const dom = view.dom as HTMLElement;
  for (const el of dom.querySelectorAll<HTMLElement>("[data-lex-spacer]")) {
    const r = el.getBoundingClientRect();
    regions.push({ top: m(r.top), h: r.height / scale });
  }
  for (const el of dom.querySelectorAll<HTMLElement>("[data-lex-push]")) {
    regions.push({ top: m(el.getBoundingClientRect().top), h: Number(el.dataset.lexPush) || 0 });
  }
  regions.sort((a, b) => a.top - b.top);
  const ends: number[] = [];
  const sums: number[] = [];
  let acc = 0;
  for (const r of regions) {
    acc += r.h;
    ends.push(r.top + r.h);
    sums.push(acc);
  }
  /** coordonata fără spațiile inserate deasupra ei */
  const natural = (y: number) => {
    let lo = 0;
    let hi = ends.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (ends[mid] <= y + 0.5) lo = mid + 1;
      else hi = mid;
    }
    return y - (lo ? sums[lo - 1] : 0);
  };
  return { m, natural };
}

function collectUnits(doc: PMNode, view: EditorView): UnitRef[] {
  const out: UnitRef[] = [];
  const push = (kind: UnitKind, node: PMNode, pos: number, cols?: number) => {
    const el = view.nodeDOM(pos);
    if (el instanceof HTMLElement) out.push({ kind, pos, node, el, cols });
  };
  const visit = (node: PMNode, pos: number) => {
    if (node.isTextblock) push("text", node, pos);
    else if (node.type.name === "table") {
      let cols = 0;
      node.firstChild?.forEach((cell) => (cols += Number(cell.attrs.colspan) || 1));
      node.forEach((row, off) => push("row", row, pos + 1 + off, cols));
    } else if (node.type.name === "pageBreak") push("marker", node, pos);
    else if (node.isLeaf || node.isAtom) push("atom", node, pos);
    else node.forEach((child, off) => visit(child, pos + 1 + off));
  };
  doc.forEach((child, off) => visit(child, off));
  return out;
}

function measure(view: EditorView, sheet: HTMLElement, geo: SheetGeometry): Measured | null {
  const meter = createMeter(view, sheet, geo);
  if (!meter) return null;
  const { m, natural } = meter;
  const refs = collectUnits(view.state.doc, view);
  const lineCache = new Map<number, LayoutLine[]>();
  const range = document.createRange();

  const units: LayoutUnit[] = refs.map((ref, i) => {
    const r = ref.el.getBoundingClientRect();
    const top = natural(m(r.top));
    const bottom = natural(m(r.bottom));
    const unit: LayoutUnit = {
      top,
      bottom,
      marker: ref.kind === "marker",
      breakBefore: i > 0 && refs[i - 1].kind === "marker",
      keepWithNext: ref.node.type.name === "heading",
    };
    if (ref.kind === "text") {
      unit.lines = () => {
        const hit = lineCache.get(i);
        if (hit) return hit;
        const rects: { top: number; bottom: number }[] = [];
        const walker = document.createTreeWalker(ref.el, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (!n.nodeValue) continue;
          range.selectNodeContents(n);
          for (const cr of range.getClientRects()) rects.push({ top: natural(m(cr.top)), bottom: natural(m(cr.bottom)) });
        }
        const lines = linesFromRects(rects, top, bottom);
        lineCache.set(i, lines);
        return lines;
      };
    }
    return unit;
  });

  const { breaks, pages } = paginate(units, geo);
  const spacers: PageSpacer[] = [];
  for (const b of breaks) {
    const ref = refs[b.unit];
    if (b.line === 0) {
      const kind: SpacerKind = ref.kind === "text" ? "pad" : ref.kind === "row" ? "row" : "block";
      spacers.push({ kind, pos: ref.pos, space: b.space, cols: ref.cols });
      continue;
    }
    // primul caracter al rândului `line`: căutare binară după poziția verticală
    const lines = units[b.unit].lines?.() ?? [];
    const boundary = lines[b.line]?.top;
    if (boundary === undefined) continue;
    let lo = ref.pos + 1;
    let hi = ref.pos + ref.node.nodeSize - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const c = view.coordsAtPos(mid, 1);
      if (natural(m((c.top + c.bottom) / 2)) > boundary) hi = mid;
      else lo = mid + 1;
    }
    if (lo > ref.pos + 1) spacers.push({ kind: "line", pos: lo, space: b.space });
  }
  return { spacers, pages };
}

function cursorPage(view: EditorView, sheet: HTMLElement, geo: SheetGeometry, pages: number): number {
  const meter = createMeter(view, sheet, geo);
  if (!meter) return 1;
  const c = view.coordsAtPos(view.state.selection.head, 1);
  return pageAt(meter.m((c.top + c.bottom) / 2), geo, pages) + 1;
}

/** Spațiul dintre pagini (px nescalați). */
export const PAGE_GAP_PX = 24;

export const Pagination = Extension.create<Record<string, never>, PaginationStorage>({
  name: "lexPagination",

  addStorage() {
    return { store: new PaginationStore() };
  },

  addProseMirrorPlugins() {
    const { store } = this.storage;
    return [
      new Plugin<PaginationState>({
        key: paginationKey,
        state: {
          init: () => ({ spacers: [], deco: DecorationSet.empty }),
          apply(tr: Transaction, prev: PaginationState): PaginationState {
            const meta = tr.getMeta(paginationKey) as PageSpacer[] | undefined;
            if (meta) return { spacers: meta, deco: buildDeco(tr.doc, meta) };
            if (!tr.docChanged) return prev;
            // până la măsurarea următoare (în același cadru), spațiile rămân lângă textul lor
            return { spacers: prev.spacers.map((s) => ({ ...s, pos: tr.mapping.map(s.pos, -1) })), deco: prev.deco.map(tr.mapping, tr.doc) };
          },
        },
        props: {
          decorations: (state) => paginationKey.getState(state)?.deco,
        },
        view(view) {
          if (typeof window === "undefined" || typeof ResizeObserver === "undefined") return {};
          let raf = 0;
          let dirty = true;
          let rounds = 0;
          let destroyed = false;

          const run = () => {
            raf = 0;
            if (destroyed) return;
            const sheet = (view.dom as HTMLElement).closest<HTMLElement>(".lex-sheet");
            const geo = sheet && sheetGeometry(sheet);
            if (!sheet || !geo || !view.dom.isConnected) return;
            let pages = store.get().pages;
            try {
              if (dirty) {
                dirty = false;
                const res = measure(view, sheet, geo);
                if (res) {
                  pages = res.pages;
                  const cur = paginationKey.getState(view.state)?.spacers ?? [];
                  if (sameSpacers(cur, res.spacers)) rounds = 0;
                  else if (rounds < MAX_ROUNDS) {
                    rounds++;
                    view.dispatch(view.state.tr.setMeta(paginationKey, res.spacers).setMeta("addToHistory", false));
                  }
                }
              }
              store.set({ pages, page: Math.min(pages, cursorPage(view, sheet, geo, pages)) });
            } catch {
              // vederea s-a desprins între timp; reluăm la următoarea randare
            }
          };
          const schedule = () => {
            if (!raf && !destroyed) raf = requestAnimationFrame(run);
          };
          const invalidate = () => {
            dirty = true;
            schedule();
          };

          const ro = new ResizeObserver(invalidate);
          ro.observe(view.dom);
          document.fonts?.addEventListener("loadingdone", invalidate);
          schedule();

          return {
            update(v, prevState) {
              if (v.state.doc !== prevState.doc) {
                dirty = true;
                rounds = 0;
              }
              schedule();
            },
            destroy() {
              destroyed = true;
              if (raf) cancelAnimationFrame(raf);
              ro.disconnect();
              document.fonts?.removeEventListener("loadingdone", invalidate);
            },
          };
        },
      }),
    ];
  },
});
