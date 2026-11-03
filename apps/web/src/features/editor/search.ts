import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension, type Editor } from "@tiptap/react";

/** Pliază un caracter (fără diacritice, litere mici), păstrând lungimea, ca pozițiile să rămână exacte. */
function foldChar(c: string): string {
  const base = c.normalize("NFD")[0] ?? c;
  return base.toLowerCase();
}

export function foldForSearch(s: string): string {
  let out = "";
  for (const c of s) {
    const f = c.length === 1 ? foldChar(c) : c;
    out += f.length === c.length ? f : c;
  }
  return out;
}

export interface SearchMatch {
  from: number;
  to: number;
}

/** Aparițiile textului căutat (fără diacritice și majuscule), în fiecare bloc de text. */
export function findMatches(doc: PMNode, query: string): SearchMatch[] {
  const q = foldForSearch(query);
  if (!q.trim()) return [];
  const out: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    const positions: number[] = [];
    node.forEach((child, offset) => {
      if (!child.isText) {
        text += "\n";
        positions.push(pos + 1 + offset);
        return;
      }
      const t = child.text ?? "";
      for (let i = 0; i < t.length; i++) positions.push(pos + 1 + offset + i);
      text += t;
    });
    const hay = foldForSearch(text);
    let i = hay.indexOf(q);
    while (i >= 0) {
      out.push({ from: positions[i], to: positions[i + q.length - 1] + 1 });
      i = hay.indexOf(q, i + q.length);
    }
    return false;
  });
  return out;
}

interface SearchState {
  query: string;
  matches: SearchMatch[];
  index: number;
  deco: DecorationSet;
}

export const searchKey = new PluginKey<SearchState>("lexSearch");

function decorate(doc: PMNode, matches: SearchMatch[], index: number) {
  return DecorationSet.create(
    doc,
    matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === index ? "lex-find lex-find-active" : "lex-find" })),
  );
}

/** Căutare și înlocuire: evidențieri ca decorații, navigare cu index curent. */
export const Search = Extension.create({
  name: "lexSearch",
  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => ({ query: "", matches: [], index: 0, deco: DecorationSet.empty }),
          apply(tr, prev) {
            const meta = tr.getMeta(searchKey) as { query?: string; index?: number } | undefined;
            if (!meta && (!tr.docChanged || !prev.query)) return prev;
            const query = meta?.query ?? prev.query;
            const matches = findMatches(tr.doc, query);
            let index = meta?.index ?? prev.index;
            if (meta?.query !== undefined && meta.index === undefined) {
              // prima apariție după cursor
              const at = tr.selection.from;
              const next = matches.findIndex((m) => m.from >= at);
              index = next >= 0 ? next : 0;
            }
            index = matches.length ? ((index % matches.length) + matches.length) % matches.length : 0;
            return { query, matches, index, deco: decorate(tr.doc, matches, index) };
          },
        },
        props: { decorations: (state) => searchKey.getState(state)?.deco },
      }),
    ];
  },
});

export const searchState = (state: EditorState) => searchKey.getState(state);

export function setSearchQuery(editor: Editor, query: string) {
  editor.view.dispatch(editor.state.tr.setMeta(searchKey, { query }).setMeta("addToHistory", false));
}

/** Mută la apariția următoare / anterioară și o aduce în vizor (fără a lua focusul din câmpul de căutare). */
export function gotoMatch(editor: Editor, dir: 1 | -1) {
  const st = searchKey.getState(editor.state);
  if (!st?.matches.length) return;
  const index = (st.index + dir + st.matches.length) % st.matches.length;
  const m = st.matches[index];
  const tr = editor.state.tr.setMeta(searchKey, { index }).setSelection(TextSelection.create(editor.state.doc, m.from, m.to));
  editor.view.dispatch(tr.scrollIntoView());
}

export function replaceCurrent(editor: Editor, replacement: string) {
  const st = searchKey.getState(editor.state);
  const m = st?.matches[st.index];
  if (!m || !editor.isEditable) return;
  editor.view.dispatch(editor.state.tr.insertText(replacement, m.from, m.to).scrollIntoView());
}

export function replaceAll(editor: Editor, replacement: string): number {
  const st = searchKey.getState(editor.state);
  if (!st?.matches.length || !editor.isEditable) return 0;
  const tr = editor.state.tr;
  for (const m of [...st.matches].reverse()) tr.insertText(replacement, m.from, m.to);
  editor.view.dispatch(tr);
  return st.matches.length;
}
