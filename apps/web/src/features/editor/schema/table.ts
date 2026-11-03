import { TableCell, TableHeader } from "@tiptap/extension-table";

/** Fundalul celulei (`backgroundColor`, #rrggbb), pe lângă colspan/rowspan/colwidth din TableKit. */
const backgroundColor = {
  default: null,
  parseHTML: (el: HTMLElement) => el.getAttribute("data-background-color") || el.style.backgroundColor || null,
  renderHTML: (attrs: Record<string, unknown>) =>
    attrs.backgroundColor ? { "data-background-color": attrs.backgroundColor, style: `background-color: ${attrs.backgroundColor}` } : {},
};

/** Celulele conțin doar paragrafe, ca în contract (`tableCell` → `paragraph[]`). */
export const LexTableCell = TableCell.extend({
  content: "paragraph+",
  addAttributes() {
    return { ...this.parent?.(), backgroundColor };
  },
});

export const LexTableHeader = TableHeader.extend({
  content: "paragraph+",
  addAttributes() {
    return { ...this.parent?.(), backgroundColor };
  },
});
