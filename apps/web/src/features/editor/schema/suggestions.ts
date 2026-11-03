import type { Mark as PMMark, Node as PMNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Extension, Mark, mergeAttributes, type Editor, type RawCommands } from "@tiptap/react";

/**
 * Sugestiile AI ca modificări urmărite: `suggestInsert` (text propus, subliniat în culoarea AI)
 * și `suggestDelete` (text propus spre ștergere, tăiat). Atribute: id, author, findingId, createdAt.
 */

export const SUGGESTION_META = "lexaiSuggestion";

export interface SuggestionMeta {
  action: "accept" | "reject" | "insert";
  ids: string[];
}

const suggestionAttributes = {
  id: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("data-suggestion-id"),
    renderHTML: (a: Record<string, unknown>) => ({ "data-suggestion-id": a.id }),
  },
  author: {
    default: "ai",
    parseHTML: (el: HTMLElement) => el.getAttribute("data-author") ?? "ai",
    renderHTML: (a: Record<string, unknown>) => ({ "data-author": a.author }),
  },
  findingId: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("data-finding-id"),
    renderHTML: (a: Record<string, unknown>) => (a.findingId ? { "data-finding-id": a.findingId } : {}),
  },
  createdAt: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute("data-created-at"),
    renderHTML: (a: Record<string, unknown>) => (a.createdAt ? { "data-created-at": a.createdAt } : {}),
  },
};

export const SuggestInsert = Mark.create({
  name: "suggestInsert",
  inclusive: false,
  excludes: "suggestInsert suggestDelete",
  addAttributes: () => suggestionAttributes,
  parseHTML: () => [{ tag: "ins[data-suggestion-id]" }],
  renderHTML: ({ HTMLAttributes }) => ["ins", mergeAttributes(HTMLAttributes, { class: "lex-suggest-ins", title: "Sugestie AI: text propus" }), 0],
});

export const SuggestDelete = Mark.create({
  name: "suggestDelete",
  inclusive: false,
  excludes: "suggestInsert suggestDelete",
  addAttributes: () => suggestionAttributes,
  parseHTML: () => [{ tag: "del[data-suggestion-id]" }],
  renderHTML: ({ HTMLAttributes }) => ["del", mergeAttributes(HTMLAttributes, { class: "lex-suggest-del", title: "Sugestie AI: text propus spre ștergere" }), 0],
});

export interface SuggestionRange {
  id: string;
  kind: "insert" | "delete";
  from: number;
  to: number;
  text: string;
  findingId: string | null;
}

function suggestionMark(node: PMNode): PMMark | undefined {
  return node.marks.find((m) => m.type.name === "suggestInsert" || m.type.name === "suggestDelete");
}

/** Toate intervalele de sugestie din document, în ordine (intervalele adiacente se unesc). */
export function findSuggestionRanges(doc: PMNode, id?: string): SuggestionRange[] {
  const out: SuggestionRange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    const mark = suggestionMark(node);
    if (!mark || (id !== undefined && mark.attrs.id !== id)) return false;
    const kind = mark.type.name === "suggestInsert" ? "insert" : "delete";
    const last = out[out.length - 1];
    if (last && last.to === pos && last.id === mark.attrs.id && last.kind === kind) {
      last.to = pos + node.nodeSize;
      last.text += node.text ?? "";
    } else {
      out.push({ id: String(mark.attrs.id), kind, from: pos, to: pos + node.nodeSize, text: node.text ?? "", findingId: (mark.attrs.findingId as string | null) ?? null });
    }
    return false;
  });
  return out;
}

export interface SuggestionSummary {
  id: string;
  findingId: string | null;
  from: number;
  inserted: string;
  deleted: string;
}

/** Sugestiile nerezolvate, câte una per id, în ordinea din document. */
export function listSuggestions(doc: PMNode): SuggestionSummary[] {
  const byId = new Map<string, SuggestionSummary>();
  for (const r of findSuggestionRanges(doc)) {
    let s = byId.get(r.id);
    if (!s) {
      s = { id: r.id, findingId: r.findingId, from: r.from, inserted: "", deleted: "" };
      byId.set(r.id, s);
    }
    if (r.kind === "insert") s.inserted += r.text;
    else s.deleted += r.text;
  }
  return [...byId.values()];
}

/**
 * Acceptă sau respinge o sugestie (sau toate, cu `id` null), în tranzacția dată.
 * Acceptare: textul propus rămâne, cel propus spre ștergere dispare. Respingere: invers.
 */
export function resolveSuggestionsInto(tr: Transaction, id: string | null, accept: boolean): boolean {
  const ranges = findSuggestionRanges(tr.doc, id ?? undefined);
  if (!ranges.length) return false;
  const insertType = tr.doc.type.schema.marks.suggestInsert;
  const deleteType = tr.doc.type.schema.marks.suggestDelete;
  for (const r of [...ranges].sort((a, b) => b.from - a.from)) {
    const drop = accept ? r.kind === "delete" : r.kind === "insert";
    if (drop) tr.delete(r.from, r.to);
    else tr.removeMark(r.from, r.to, r.kind === "insert" ? insertType : deleteType);
  }
  const meta: SuggestionMeta = { action: accept ? "accept" : "reject", ids: [...new Set(ranges.map((r) => r.id))] };
  tr.setMeta(SUGGESTION_META, meta);
  return true;
}

export function resolveSuggestionTr(state: EditorState, id: string | null, accept: boolean): Transaction | null {
  const tr = state.tr;
  return resolveSuggestionsInto(tr, id, accept) ? tr : null;
}

function run(editor: Editor, id: string | null, accept: boolean): boolean {
  const tr = resolveSuggestionTr(editor.state, id, accept);
  if (!tr) return false;
  editor.view.dispatch(tr);
  return true;
}

export const acceptSuggestion = (editor: Editor, id: string) => run(editor, id, true);
export const rejectSuggestion = (editor: Editor, id: string) => run(editor, id, false);
export const acceptAllSuggestions = (editor: Editor) => run(editor, null, true);
export const rejectAllSuggestions = (editor: Editor) => run(editor, null, false);

/**
 * Comenzile Tiptap pentru sugestii: `editor.commands.acceptSuggestion(id)`, `rejectSuggestion(id)`,
 * `acceptAllSuggestions()`, `rejectAllSuggestions()` (merg și în `chain()`). Din TypeScript se
 * folosesc funcțiile de mai sus, fiindcă `@tiptap/core` nu poate fi augmentat din aplicație.
 */
export const Suggestions = Extension.create({
  name: "suggestions",
  addCommands() {
    const make =
      (id: string | null, accept: boolean) =>
      ({ tr, dispatch }: { tr: Transaction; dispatch?: unknown }) => {
        if (!findSuggestionRanges(tr.doc, id ?? undefined).length) return false;
        if (dispatch) resolveSuggestionsInto(tr, id, accept);
        return true;
      };
    return {
      acceptSuggestion: (id: string) => make(id, true),
      rejectSuggestion: (id: string) => make(id, false),
      acceptAllSuggestions: () => make(null, true),
      rejectAllSuggestions: () => make(null, false),
    } as unknown as Partial<RawCommands>;
  },
});
