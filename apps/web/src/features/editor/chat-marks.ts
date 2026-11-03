import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/react";

/**
 * Marcajele chatului din document (docs/ux/18-chat-editor.md), ca decorații (nu ajung în JSON):
 * - selecția trimisă în chat rămâne vizibilă cât focusul e în panou (`lex-chat-scope`);
 * - ținta modificării aflate sub mouse sau în focus: pasajul (`lex-chat-target`), paragrafele
 *   înlocuite (`lex-chat-target-block`) sau locul inserării, ca linie sub / deasupra blocului vecin
 *   (`lex-chat-insert-after` / `-before`); cât e afișată, evidențierile analizei se estompează la
 *   50 % (clasa `lex-chat-previewing` pe editor). Toate poartă `data-chat-target` (derularea).
 */

/**
 * Ținta previzualizării: `inline` = pasaj; `blocks` = blocurile de nivel superior din [from, to);
 * `after` / `before` = inserare după / înainte de blocul de nivel superior din [from, to).
 */
export interface ChatTarget {
  mode: "inline" | "blocks" | "after" | "before";
  from: number;
  to: number;
}

export interface ChatMarksState {
  /** selecția curentă e marcată (cipul „Doar textul selectat” e activ) */
  scope: boolean;
  target: ChatTarget | null;
}

export type ChatMarksMeta = { scope: boolean } | { target: ChatTarget | null };

const BLOCK_CLASS: Record<Exclude<ChatTarget["mode"], "inline">, string> = {
  blocks: "lex-chat-target-block",
  after: "lex-chat-insert-after",
  before: "lex-chat-insert-before",
};

export const chatMarksKey = new PluginKey<ChatMarksState>("lexChatMarks");

export const ChatMarks = Extension.create({
  name: "lexChatMarks",

  addProseMirrorPlugins() {
    return [
      new Plugin<ChatMarksState>({
        key: chatMarksKey,
        state: {
          init: () => ({ scope: false, target: null }),
          apply(tr: Transaction, prev: ChatMarksState): ChatMarksState {
            const meta = tr.getMeta(chatMarksKey) as ChatMarksMeta | undefined;
            let { scope, target } = prev;
            if (target && tr.docChanged) {
              const from = tr.mapping.map(target.from, 1);
              const to = tr.mapping.map(target.to, -1);
              target = to > from ? { mode: target.mode, from, to } : null;
            }
            if (meta && "scope" in meta) scope = meta.scope;
            if (meta && "target" in meta) target = meta.target;
            return scope === prev.scope && target === prev.target ? prev : { scope, target };
          },
        },
        props: {
          decorations(state) {
            const st = chatMarksKey.getState(state);
            if (!st) return null;
            const deco: Decoration[] = [];
            const sel = state.selection;
            if (st.scope && !sel.empty) deco.push(Decoration.inline(sel.from, sel.to, { class: "lex-chat-scope" }));
            const t = st.target;
            if (t?.mode === "inline") deco.push(Decoration.inline(t.from, t.to, { class: "lex-chat-target", "data-chat-target": "" }));
            else if (t) {
              state.doc.nodesBetween(t.from, t.to, (node, pos) => {
                if (pos >= t.from && pos + node.nodeSize <= t.to) deco.push(Decoration.node(pos, pos + node.nodeSize, { class: BLOCK_CLASS[t.mode as keyof typeof BLOCK_CLASS], "data-chat-target": "" }));
                return false;
              });
            }
            return deco.length ? DecorationSet.create(state.doc, deco) : null;
          },
          attributes: (state): Record<string, string> => (chatMarksKey.getState(state)?.target ? { class: "lex-chat-previewing" } : {}),
        },
      }),
    ];
  },
});
