import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Mark, getMarkRange, mergeAttributes, type Editor } from "@tiptap/react";
import { SEG_BLOCKS } from "./seg-id";

export const PLACEHOLDER_DEFAULT_HINT = "completează";

/** Textul afișat al unui câmp: „[● hint]”. */
export const placeholderText = (hint: string) => `[● ${hint.trim() || PLACEHOLDER_DEFAULT_HINT}]`;

/**
 * Câmp de completat (`placeholder`, atribut `hint`). Textul nodului e chiar „[● hint]”, ca în
 * import/export. Click pe câmp îl selectează întreg; tastarea îl înlocuiește (marcajul nu se
 * extinde la textul nou, fiind neinclusiv).
 */
export const PlaceholderMark = Mark.create({
  name: "placeholder",
  inclusive: false,
  priority: 1100,

  addAttributes() {
    return {
      hint: {
        default: "",
        parseHTML: (el) => el.getAttribute("data-hint") ?? "",
        renderHTML: (attrs) => ({ "data-hint": attrs.hint ?? "" }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-placeholder]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-placeholder": "", class: "lex-placeholder", title: "Câmp de completat" }), 0];
  },

  addKeyboardShortcuts() {
    return {
      // ⌥⌘P deschide eticheta câmpului în bara de formatare; inserarea directă e fallback-ul
      "Mod-Alt-p": () => requestPlaceholder(this.editor),
    };
  },

  addStorage() {
    return { requestInsert: undefined as (() => void) | undefined };
  },

  addProseMirrorPlugins() {
    const type = this.type;
    return [
      new Plugin({
        key: new PluginKey("lexPlaceholderClick"),
        props: {
          handleClick(view, pos) {
            if (!view.editable) return false;
            const $pos = view.state.doc.resolve(pos);
            const range = getMarkRange($pos, type) ?? (pos > 0 ? getMarkRange(view.state.doc.resolve(pos - 1), type) : undefined);
            if (!range) return false;
            const sel = view.state.selection;
            if (sel.from === range.from && sel.to === range.to) return false;
            view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, range.from, range.to)));
            return true;
          },
        },
      }),
    ];
  },
});

type PlaceholderStorage = { requestInsert?: () => void };
const placeholderStorage = (editor: Editor) => (editor.storage as unknown as Record<string, PlaceholderStorage | undefined>).placeholder;

/** Interfața care deschide eticheta câmpului la ⌥⌘P; întoarce funcția de dezabonare. */
export function onPlaceholderRequest(editor: Editor, open: () => void): () => void {
  const storage = placeholderStorage(editor);
  if (!storage) return () => undefined;
  storage.requestInsert = open;
  return () => {
    if (storage.requestInsert === open) storage.requestInsert = undefined;
  };
}

/** Cere interfeței să deschidă eticheta câmpului (sau inserează unul implicit). */
export function requestPlaceholder(editor: Editor): boolean {
  const open = placeholderStorage(editor)?.requestInsert;
  if (open) {
    open();
    return true;
  }
  return insertPlaceholder(editor, PLACEHOLDER_DEFAULT_HINT);
}

export function insertPlaceholder(editor: Editor, hint: string): boolean {
  if (!editor.isEditable) return false;
  const label = hint.trim() || PLACEHOLDER_DEFAULT_HINT;
  return editor
    .chain()
    .focus()
    .insertContent({ type: "text", text: placeholderText(label), marks: [{ type: "placeholder", attrs: { hint: label } }] })
    .run();
}

export interface PlaceholderInfo {
  index: number;
  hint: string;
  text: string;
  segId: string | null;
  from: number;
  to: number;
}

/** Câmpurile `[● …]` din document, în ordine (intervalele adiacente cu același câmp se unesc). */
export function findPlaceholders(doc: PMNode): PlaceholderInfo[] {
  const out: PlaceholderInfo[] = [];
  let segId: string | null = null;
  doc.descendants((node, pos) => {
    if (SEG_BLOCKS.has(node.type.name)) segId = (node.attrs.segId as string | null) ?? null;
    if (!node.isText) return true;
    const mark = node.marks.find((m) => m.type.name === "placeholder");
    if (!mark) return false;
    const last = out[out.length - 1];
    if (last && last.to === pos && last.hint === mark.attrs.hint) {
      last.to = pos + node.nodeSize;
      last.text += node.text ?? "";
    } else {
      out.push({ index: out.length, hint: String(mark.attrs.hint ?? ""), text: node.text ?? "", segId, from: pos, to: pos + node.nodeSize });
    }
    return false;
  });
  return out;
}
