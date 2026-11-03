import { Extension, Mark, mergeAttributes } from "@tiptap/react";
import { SEG_BLOCKS } from "./seg-id";

/** Doar pentru vizualizarea comparării (nu fac parte din contract și nu se salvează). */

const change = {
  default: null,
  parseHTML: (el: HTMLElement) => el.getAttribute("data-change"),
  renderHTML: (a: Record<string, unknown>) => (a.change === null || a.change === undefined ? {} : { "data-change": String(a.change) }),
};

export const DiffInsert = Mark.create({
  name: "diffInsert",
  addAttributes: () => ({ change }),
  renderHTML: ({ HTMLAttributes }) => ["ins", mergeAttributes(HTMLAttributes, { class: "lex-diff-ins" }), 0],
});

export const DiffDelete = Mark.create({
  name: "diffDelete",
  addAttributes: () => ({ change }),
  renderHTML: ({ HTMLAttributes }) => ["del", mergeAttributes(HTMLAttributes, { class: "lex-diff-del" }), 0],
});

const LABELS: Record<string, string> = {
  changed: "Paragraf modificat",
  added: "Paragraf adăugat",
  removed: "Paragraf șters",
  format: "Formatare modificată",
};

export const DiffBlocks = Extension.create({
  name: "diffBlocks",
  addGlobalAttributes() {
    return [
      {
        types: [...SEG_BLOCKS],
        attributes: {
          diff: {
            default: null,
            renderHTML: (a) => (a.diff && a.diff !== "same" ? { "data-diff": a.diff, title: LABELS[a.diff as string] } : {}),
          },
          diffChange: {
            default: null,
            renderHTML: (a) => (a.diffChange === null || a.diffChange === undefined ? {} : { "data-change": String(a.diffChange) }),
          },
        },
      },
    ];
  },
});

export const diffExtensions = () => [DiffInsert, DiffDelete, DiffBlocks];
