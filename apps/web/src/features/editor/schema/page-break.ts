import { Node, mergeAttributes, type Editor } from "@tiptap/react";

/** Saltul de pagină: un marcaj punctat pe foaia continuă („Salt de pagină”). */
export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [{ tag: "div[data-page-break]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-page-break": "",
        class: "lex-page-break",
        role: "separator",
        "aria-label": "Salt de pagină",
        contenteditable: "false",
      }),
    ];
  },

  addKeyboardShortcuts() {
    return { "Mod-Enter": () => insertPageBreak(this.editor) };
  },
});

export function insertPageBreak(editor: Editor): boolean {
  if (!editor.isEditable) return false;
  return editor.chain().focus().insertContent({ type: "pageBreak" }).run();
}
