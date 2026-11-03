import { newSegId } from "@lexai/core/document";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState, type Transaction } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";
import { Extension } from "@tiptap/react";

/** Blocurile de text care poartă `segId` (docs/arhitectura/document-json.md). */
export const SEG_BLOCKS = new Set(["paragraph", "heading"]);

export const segIdKey = new PluginKey("lexSegId");

interface BlockRef {
  pos: number;
  id: string | null;
}

function collectBlocks(doc: PMNode): BlockRef[] {
  const out: BlockRef[] = [];
  doc.descendants((node, pos) => {
    if (SEG_BLOCKS.has(node.type.name)) {
      const id = typeof node.attrs.segId === "string" && node.attrs.segId ? (node.attrs.segId as string) : null;
      out.push({ pos, id });
      return false;
    }
    return !node.isTextblock;
  });
  return out;
}

/**
 * Completează `segId`-urile lipsă și le reface pe cele duplicate (blocuri lipite sau despărțite).
 * La duplicate, id-ul rămâne pe blocul care exista deja (poziția veche, mapată prin tranzacții),
 * iar copia primește unul nou; așa ancorele constatărilor rămân stabile.
 * Întoarce tranzacția cu modificările sau `null` dacă documentul e deja corect.
 */
export function fixSegIds(state: EditorState, previous?: { doc: PMNode; mapping: Mapping }): Transaction | null {
  const blocks = collectBlocks(state.doc);
  const byId = new Map<string, number[]>();
  for (const b of blocks) {
    if (!b.id) continue;
    const list = byId.get(b.id);
    if (list) list.push(b.pos);
    else byId.set(b.id, [b.pos]);
  }
  const missing = blocks.filter((b) => !b.id);
  const dupes = [...byId.entries()].filter(([, positions]) => positions.length > 1);
  if (!missing.length && !dupes.length) return null;

  // pozițiile vechi ale id-urilor duplicate, ca să știm care bloc e originalul
  let oldPositions: Map<string, number> | null = null;
  if (dupes.length && previous) {
    oldPositions = new Map();
    for (const b of collectBlocks(previous.doc)) if (b.id && !oldPositions.has(b.id)) oldPositions.set(b.id, b.pos);
  }

  const used = new Set(byId.keys());
  const reassign: number[] = missing.map((b) => b.pos);
  for (const [id, positions] of dupes) {
    const old = oldPositions?.get(id);
    const mapped = old !== undefined && previous ? previous.mapping.map(old, 1) : undefined;
    const keeper = mapped !== undefined && positions.includes(mapped) ? mapped : positions[0];
    for (const p of positions) if (p !== keeper) reassign.push(p);
  }

  const tr = state.tr;
  for (const pos of reassign) tr.setNodeAttribute(pos, "segId", newSegId(used));
  tr.setMeta(segIdKey, true).setMeta("addToHistory", false);
  return tr;
}

/**
 * `segId` pe paragrafe și titluri: mereu prezent, unic, stabil la editare.
 * La despărțirea unui bloc (Enter), prima parte își păstrează id-ul, iar a doua primește unul nou.
 */
export const SegId = Extension.create({
  name: "segId",

  addGlobalAttributes() {
    return [
      {
        types: [...SEG_BLOCKS],
        attributes: {
          segId: {
            default: null,
            keepOnSplit: false,
            parseHTML: (el) => el.getAttribute("data-seg-id") || null,
            renderHTML: (attrs) => (attrs.segId ? { "data-seg-id": attrs.segId } : {}),
          },
        },
      },
    ];
  },

  onCreate() {
    const tr = fixSegIds(this.editor.state);
    if (tr) this.editor.view.dispatch(tr);
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: segIdKey,
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some((t) => t.docChanged)) return null;
          const mapping = new Mapping();
          for (const t of transactions) mapping.appendMapping(t.mapping);
          return fixSegIds(newState, { doc: oldState.doc, mapping });
        },
      }),
    ];
  },
});
