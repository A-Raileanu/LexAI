import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";
import { blocksBySegId, locateInBlock, wholeBlock } from "./locate";

/** Stările verdictelor (docs/ux/08-rezultate-analiza.md, „Culori pe stări”). */
export type HighlightStatus = "corect" | "eroare_citare" | "interpretare_discutabila" | "necesita_analiza_umana" | "neverificat";

export interface HighlightItem {
  id: string;
  segId: string;
  quote: string;
  status: HighlightStatus;
}

export interface HighlightRange {
  id: string;
  status: HighlightStatus;
  from: number;
  to: number;
  /** citatul nu a fost găsit: evidențiem tot blocul */
  fallback: boolean;
}

/** Ordinea gravității: la suprapuneri, starea mai gravă se desenează deasupra. */
const SEVERITY: Record<HighlightStatus, number> = {
  eroare_citare: 0,
  interpretare_discutabila: 1,
  necesita_analiza_umana: 2,
  neverificat: 3,
  corect: 4,
};

/** Pozițiile evidențierilor: citatul în blocul cu `segId`, altfel tot blocul. Blocurile lipsă sunt omise. */
export function computeHighlightRanges(doc: PMNode, items: HighlightItem[]): HighlightRange[] {
  const blocks = blocksBySegId(doc);
  const out: HighlightRange[] = [];
  for (const item of items) {
    const block = blocks.get(item.segId);
    if (!block) continue;
    const hit = item.quote ? locateInBlock(block, item.quote) : null;
    const range = hit ?? wholeBlock(block);
    if (range.to <= range.from) continue;
    out.push({ id: item.id, status: item.status, from: range.from, to: range.to, fallback: !hit });
  }
  return out;
}

interface HlState {
  ranges: HighlightRange[];
  active: string | null;
  pulse: number;
  deco: DecorationSet;
}

type HlMeta = { ranges: HighlightRange[] } | { active: string | null; pulse?: boolean };

export const highlightsKey = new PluginKey<HlState>("lexHighlights");

/** Constatarea unei evidențieri: o constatare cu mai multe ancore are id-urile „F-1”, „F-1::1”… */
const findingOf = (id: string) => id.split("::")[0];

function build(doc: PMNode, ranges: HighlightRange[], active: string | null, pulse: number): DecorationSet {
  const sorted = [...ranges].sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status]);
  const activeFinding = active ? findingOf(active) : null;
  return DecorationSet.create(
    doc,
    sorted.map((r) =>
      Decoration.inline(
        r.from,
        r.to,
        {
          class: [
            "lex-hl",
            `lex-hl-${r.status}`,
            r.fallback ? "lex-hl-block" : "",
            r.id === active ? `lex-hl-active lex-hl-pulse-${pulse % 2}` : "",
            // celelalte ancore ale constatării selectate nu se estompează
            r.id !== active && activeFinding && findingOf(r.id) === activeFinding ? "lex-hl-current" : "",
          ]
            .filter(Boolean)
            .join(" "),
          "data-hl-id": r.id,
          "data-hl-status": r.status,
        },
        { id: r.id },
      ),
    ),
  );
}

export interface HighlightsStorage {
  listeners: Set<(id: string) => void>;
}

/** Evidențierile constatărilor: decorații ProseMirror (nu mark-uri), deci nu ajung în JSON. */
export const Highlights = Extension.create<Record<string, never>, HighlightsStorage>({
  name: "lexHighlights",

  addStorage() {
    return { listeners: new Set<(id: string) => void>() };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin<HlState>({
        key: highlightsKey,
        state: {
          init: () => ({ ranges: [], active: null, pulse: 0, deco: DecorationSet.empty }),
          apply(tr: Transaction, prev: HlState): HlState {
            const meta = tr.getMeta(highlightsKey) as HlMeta | undefined;
            let { ranges, active, pulse } = prev;
            if (tr.docChanged && ranges.length) {
              ranges = ranges
                .map((r) => ({ ...r, from: tr.mapping.map(r.from, 1), to: tr.mapping.map(r.to, -1) }))
                .filter((r) => r.to > r.from);
            }
            if (meta && "ranges" in meta) {
              // `active` rămâne și dacă evidențierea lipsește acum: revine activă când reapare
              ranges = meta.ranges;
            } else if (meta && "active" in meta) {
              active = meta.active;
              if (meta.pulse) pulse++;
            } else if (!tr.docChanged) {
              return prev;
            } else {
              return { ranges, active, pulse, deco: prev.deco.map(tr.mapping, tr.doc) };
            }
            return { ranges, active, pulse, deco: build(tr.doc, ranges, active, pulse) };
          },
        },
        props: {
          decorations: (state) => highlightsKey.getState(state)?.deco,
          // cu o constatare selectată, celelalte evidențieri se estompează (globals.css)
          attributes: (state): Record<string, string> => {
            const st = highlightsKey.getState(state);
            return st?.active && st.ranges.some((r) => r.id === st.active) ? { class: "lex-has-active-hl" } : {};
          },
          handleClick(view, pos) {
            const st = highlightsKey.getState(view.state);
            if (!st?.ranges.length || !storage.listeners.size) return false;
            const hits = st.ranges.filter((r) => pos >= r.from && pos <= r.to);
            if (!hits.length) return false;
            // cel mai scurt interval e cel mai specific
            const hit = hits.reduce((a, b) => (b.to - b.from < a.to - a.from ? b : a));
            for (const l of storage.listeners) l(hit.id);
            return false;
          },
        },
      }),
    ];
  },
});
