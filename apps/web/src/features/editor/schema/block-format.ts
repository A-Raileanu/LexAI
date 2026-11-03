import type { Node as PMNode } from "@tiptap/pm/model";
import { Extension, type Editor } from "@tiptap/react";
import { SEG_BLOCKS } from "./seg-id";

/** Pasul de indentare: 36 pt (1,27 cm), ca tab-ul implicit din Word. */
export const INDENT_STEP_PT = 36;
const MAX_INDENT_PT = 432;

const num = (v: string | null | undefined): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
};

type NumAttr = "indentPt" | "firstLineIndentPt" | "lineHeight" | "spaceBeforePt" | "spaceAfterPt";

function numericAttribute(name: NumAttr, dataAttr: string, css: (v: number) => string) {
  return {
    default: null,
    parseHTML: (el: HTMLElement) => num(el.getAttribute(dataAttr)),
    renderHTML: (attrs: Record<string, unknown>) => {
      const v = attrs[name];
      if (typeof v !== "number" || !Number.isFinite(v)) return {};
      return { [dataAttr]: String(v), style: css(v) };
    },
  };
}

/**
 * Atributele de paragraf din contract (indentare, interlinie, spațiere), pe paragrafe și titluri.
 * Valorile sunt în puncte tipografice; interlinia e multiplicator.
 */
export const BlockFormat = Extension.create({
  name: "blockFormat",

  addGlobalAttributes() {
    return [
      {
        types: [...SEG_BLOCKS],
        attributes: {
          indentPt: numericAttribute("indentPt", "data-indent-pt", (v) => `margin-left: ${v}pt`),
          firstLineIndentPt: numericAttribute("firstLineIndentPt", "data-first-line-pt", (v) => `text-indent: ${v}pt`),
          lineHeight: numericAttribute("lineHeight", "data-line-height", (v) => `line-height: ${v}`),
          spaceBeforePt: numericAttribute("spaceBeforePt", "data-space-before-pt", (v) => `margin-top: ${v}pt`),
          spaceAfterPt: numericAttribute("spaceAfterPt", "data-space-after-pt", (v) => `margin-bottom: ${v}pt`),
        },
      },
    ];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-]": () => changeIndent(this.editor, 1),
      "Mod-[": () => changeIndent(this.editor, -1),
    };
  },
});

/** Aplică atribute pe toate paragrafele și titlurile din selecție. */
export function setBlockAttrs(editor: Editor, attrs: Partial<Record<NumAttr, number | null>>, focus = true): boolean {
  const chain = editor.chain();
  if (focus) chain.focus();
  return chain
    .command(({ tr, state }) => {
      const { from, to } = state.selection;
      let changed = false;
      state.doc.nodesBetween(from, to, (node: PMNode, pos: number) => {
        if (!SEG_BLOCKS.has(node.type.name)) return true;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
        changed = true;
        return false;
      });
      return changed;
    })
    .run();
}

/** ⌘] / ⌘[: în liste mută elementul un nivel; altfel schimbă indentarea stângă cu 36 pt. */
export function changeIndent(editor: Editor, dir: 1 | -1): boolean {
  if (!editor.isEditable) return false;
  if (editor.isActive("listItem")) {
    return dir > 0 ? editor.chain().focus().sinkListItem("listItem").run() : editor.chain().focus().liftListItem("listItem").run();
  }
  return editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const { from, to } = state.selection;
      let changed = false;
      state.doc.nodesBetween(from, to, (node: PMNode, pos: number) => {
        if (!SEG_BLOCKS.has(node.type.name)) return true;
        const current = typeof node.attrs.indentPt === "number" ? (node.attrs.indentPt as number) : 0;
        const next = Math.min(MAX_INDENT_PT, Math.max(0, Math.round((current + dir * INDENT_STEP_PT) / INDENT_STEP_PT) * INDENT_STEP_PT));
        if (next !== current) {
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indentPt: next || null });
          changed = true;
        }
        return false;
      });
      return changed;
    })
    .run();
}
