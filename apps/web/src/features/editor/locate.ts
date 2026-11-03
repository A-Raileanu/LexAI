import { locateQuote } from "@lexai/core/text";
import type { Node as PMNode } from "@tiptap/pm/model";
import { SEG_BLOCKS } from "./schema/seg-id";

/** Un bloc de text (paragraf / titlu) găsit după `segId`, cu poziția lui în document. */
export interface BlockAt {
  node: PMNode;
  pos: number;
}

export function blocksBySegId(doc: PMNode): Map<string, BlockAt> {
  const map = new Map<string, BlockAt>();
  doc.descendants((node, pos) => {
    if (SEG_BLOCKS.has(node.type.name)) {
      const id = node.attrs.segId as string | null;
      if (id && !map.has(id)) map.set(id, { node, pos });
      return false;
    }
    return !node.isTextblock;
  });
  return map;
}

export function findBlock(doc: PMNode, segId: string): BlockAt | null {
  let found: BlockAt | null = null;
  doc.descendants((node, pos) => {
    if (found) return false;
    if (SEG_BLOCKS.has(node.type.name)) {
      if (node.attrs.segId === segId) found = { node, pos };
      return false;
    }
    return !node.isTextblock;
  });
  return found;
}

/**
 * Textul simplu al blocului și poziția din document a fiecărui caracter.
 * `hardBreak` devine „\n”; textul cu `suggestInsert` e omis dacă `skipInserted` (textul „exportat”).
 */
export function blockTextMap(block: BlockAt, skipInserted = true): { text: string; positions: number[] } {
  let text = "";
  const positions: number[] = [];
  block.node.forEach((child, offset) => {
    const start = block.pos + 1 + offset;
    if (child.isText) {
      if (skipInserted && child.marks.some((m) => m.type.name === "suggestInsert")) return;
      const t = child.text ?? "";
      for (let i = 0; i < t.length; i++) positions.push(start + i);
      text += t;
    } else if (child.type.name === "hardBreak") {
      positions.push(start);
      text += "\n";
    }
  });
  return { text, positions };
}

export interface DocRange {
  from: number;
  to: number;
}

/** Intervalul conținutului unui bloc (tot paragraful). */
export const wholeBlock = (b: BlockAt): DocRange => ({ from: b.pos + 1, to: b.pos + b.node.nodeSize - 1 });

/**
 * Găsește un citat într-un bloc, ignorând diacriticele (inclusiv ş/ș, ţ/ț), majusculele,
 * ghilimelele tipografice și diferențele de spații. `exact` refuză potrivirile aproximative.
 */
export function locateInBlock(block: BlockAt, quote: string, opts: { exact?: boolean } = {}): DocRange | null {
  const { text, positions } = blockTextMap(block);
  if (!quote.trim() || !text) return null;
  const hit = locateQuote(text, quote);
  if (hit.potrivire === "negasita" || (opts.exact && hit.potrivire !== "exacta") || hit.end <= hit.start) return null;
  return { from: positions[hit.start], to: positions[hit.end - 1] + 1 };
}
