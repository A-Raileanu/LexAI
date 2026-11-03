import type { DocSegment, SegmentKind } from "../types";
import type { DocNode, DocumentMeta, TiptapDoc } from "./types";

/**
 * Segmentele analizei derivate din documentul Tiptap: fiecare `paragraph`/`heading` (inclusiv
 * cele din liste) și fiecare paragraf din celulele de tabel devine un segment cu `id = segId`,
 * `text` = textul simplu, `kind` = `titlu` (heading), `tabel` (în tabel) sau `paragraf`.
 *
 * Textul unui bloc este cel exportat: sugestiile neacceptate (`suggestInsert`) nu fac parte din
 * el, iar textul propus spre ștergere (`suggestDelete`) rămâne; `hardBreak` devine „\n”.
 * Pozițiile ancorelor (start/end) sunt indici în acest text.
 */

const TEXT_BLOCKS = new Set(["paragraph", "heading"]);
const CELLS = new Set(["tableCell", "tableHeader"]);

/** Textul simplu al unui bloc (fără sugestiile de inserare neacceptate). */
export function blockText(node: DocNode): string {
  let out = "";
  for (const c of node.content ?? []) {
    if (c.type === "text") {
      if (c.marks?.some((m) => m.type === "suggestInsert")) continue;
      out += c.text ?? "";
    } else if (c.type === "hardBreak") out += "\n";
    else if (c.content) out += blockText(c);
  }
  return out;
}

export interface SegmentsOptions {
  /** setările documentului: anteturile, subsolurile și notele de subsol devin și ele segmente */
  meta?: Pick<DocumentMeta, "headers" | "footers" | "footnotes">;
}

export function segmentsFromDoc(doc: TiptapDoc | DocNode, opts: SegmentsOptions = {}): DocSegment[] {
  const segments: DocSegment[] = [];
  const used = new Set<string>();
  let fallback = 0;

  const add = (node: DocNode, kind: SegmentKind) => {
    const text = blockText(node);
    if (!text.trim()) return;
    let id = typeof node.attrs?.segId === "string" && node.attrs.segId ? node.attrs.segId : `seg_${++fallback}`;
    // contractul cere segId unic; un duplicat (ex. bloc copiat) primește un sufix, ca ancorele să rămână neambigue
    if (used.has(id)) {
      let n = 2;
      while (used.has(`${id}~${n}`)) n++;
      id = `${id}~${n}`;
    }
    used.add(id);
    segments.push({ id, text, kind, quality: "ok" });
  };

  const walk = (nodes: DocNode[] | undefined, inTable: boolean, zone?: SegmentKind) => {
    for (const n of nodes ?? []) {
      if (TEXT_BLOCKS.has(n.type)) add(n, zone ?? (inTable ? "tabel" : n.type === "heading" ? "titlu" : "paragraf"));
      else walk(n.content, inTable || CELLS.has(n.type) || n.type === "table", zone);
    }
  };

  walk(doc.type === "doc" ? doc.content : [doc], false);
  if (opts.meta) {
    for (const h of opts.meta.headers) walk(h, false, "antet");
    for (const f of opts.meta.footers) walk(f, false, "subsol");
    for (const fn of opts.meta.footnotes) walk(fn.content, false, "nota");
  }
  return segments;
}

/** Un segment cu locul lui în structura documentului (pentru modificările structurale din chat). */
export interface LayoutSegment {
  id: string;
  text: string;
  kind: SegmentKind;
  /** indicele blocului de nivel superior (copil direct al documentului) care conține segmentul */
  top: number;
  /** segmentul e într-o listă sau într-un tabel (blocul de nivel superior e lista / tabelul) */
  container: "lista" | "tabel" | null;
}

export interface DocumentLayout {
  segments: LayoutSegment[];
  /** indicii blocurilor de nivel superior care sunt salturi de pagină */
  pageBreaks: number[];
  /** numărul blocurilor de nivel superior */
  blocks: number;
}

/**
 * Segmentele corpului documentului (aceleași id-uri și aceeași ordine ca `segmentsFromDoc` fără
 * `meta`), cu blocul de nivel superior al fiecăruia și pozițiile salturilor de pagină.
 */
export function documentLayout(doc: TiptapDoc | DocNode): DocumentLayout {
  const segments: LayoutSegment[] = [];
  const pageBreaks: number[] = [];
  const used = new Set<string>();
  let fallback = 0;
  const walk = (nodes: DocNode[] | undefined, top: number, container: LayoutSegment["container"]) => {
    for (const n of nodes ?? []) {
      if (TEXT_BLOCKS.has(n.type)) {
        const text = blockText(n);
        if (!text.trim()) continue;
        let id = typeof n.attrs?.segId === "string" && n.attrs.segId ? n.attrs.segId : `seg_${++fallback}`;
        if (used.has(id)) {
          let k = 2;
          while (used.has(`${id}~${k}`)) k++;
          id = `${id}~${k}`;
        }
        used.add(id);
        segments.push({ id, text, kind: container === "tabel" ? "tabel" : n.type === "heading" ? "titlu" : "paragraf", top, container });
      } else {
        const next = container ?? (n.type === "table" ? "tabel" : n.type === "bulletList" || n.type === "orderedList" ? "lista" : null);
        walk(n.content, top, next);
      }
    }
  };
  const blocks = doc.type === "doc" ? (doc.content ?? []) : [doc];
  blocks.forEach((b, i) => {
    if (b.type === "pageBreak") pageBreaks.push(i);
    else walk([b], i, null);
  });
  return { segments, pageBreaks, blocks: blocks.length };
}

/**
 * Tabelele documentului: rânduri → celule → id-urile segmentelor din celulă (pentru documentul
 * adnotat, ca tabelele să-și păstreze forma). Tabelele care conțin alte tabele sunt omise
 * (celulele lor rămân paragrafe obișnuite). Id-urile coincid cu cele din `segmentsFromDoc`
 * când segId-urile sunt unice.
 */
export function tablesFromDoc(doc: TiptapDoc | DocNode): string[][][][] {
  const tables: string[][][][] = [];
  const hasTable = (n: DocNode): boolean => (n.content ?? []).some((c) => c.type === "table" || hasTable(c));
  const ids = (n: DocNode): string[] =>
    TEXT_BLOCKS.has(n.type)
      ? typeof n.attrs?.segId === "string" && blockText(n).trim()
        ? [n.attrs.segId]
        : []
      : (n.content ?? []).flatMap(ids);
  const walk = (n: DocNode) => {
    if (n.type === "table" && !hasTable(n)) {
      tables.push((n.content ?? []).filter((r) => r.type === "tableRow").map((r) => (r.content ?? []).filter((c) => CELLS.has(c.type)).map(ids)));
      return;
    }
    for (const c of n.content ?? []) walk(c);
  };
  walk(doc);
  return tables;
}

/** Un segId nou, în formatul contractului (ex. „p_8f3k2a”), diferit de cele din `used`. */
export function newSegId(used?: Set<string>): string {
  for (;;) {
    const id = `p_${crypto.randomUUID().replace(/-/g, "").slice(0, 6)}`;
    if (!used?.has(id)) {
      used?.add(id);
      return id;
    }
  }
}

/** Un document Tiptap din paragrafe de text simplu (fiecare cu segId propriu). */
export function docFromParagraphs(paragraphs: { text: string; heading?: 1 | 2 | 3 | 4 }[], used = new Set<string>()): TiptapDoc {
  return {
    type: "doc",
    content: paragraphs.map((p) => paragraphNode(p.text, used, p.heading)),
  };
}

export function paragraphNode(text: string, used = new Set<string>(), heading?: 1 | 2 | 3 | 4): DocNode {
  const parts = text.split("\n");
  const content: DocNode[] = parts.flatMap((t, i) => [...(i ? [{ type: "hardBreak" }] : []), ...(t ? [{ type: "text", text: t }] : [])]);
  return heading
    ? { type: "heading", attrs: { segId: newSegId(used), level: heading }, content }
    : { type: "paragraph", attrs: { segId: newSegId(used) }, content };
}
