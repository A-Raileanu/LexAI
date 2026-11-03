import { Extension, type Editor } from "@tiptap/react";

/** Comenzi de formatare folosite de bară, de meniuri și de scurtături. */

export const FONT_SIZES = [8, 9, 10, 10.5, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];
export const DEFAULT_HIGHLIGHT = "#fff59d";

/** „12pt” / „16px” → puncte. */
export function parseFontSizePt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const m = /^([\d.]+)\s*(pt|px)?$/i.exec(String(v ?? "").trim());
  if (!m) return null;
  const n = Number.parseFloat(m[1]) * (m[2]?.toLowerCase() === "px" ? 0.75 : 1);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : null;
}

export function setFontSizePt(editor: Editor, pt: number): boolean {
  const v = Math.min(400, Math.max(1, Math.round(pt * 2) / 2));
  return editor.chain().focus().setFontSize(`${v}pt`).run();
}

/** Mărimea curentă din selecție (sau cea implicită a documentului). */
export function currentFontSizePt(editor: Editor, fallback: number): number {
  return parseFontSizePt(editor.getAttributes("textStyle").fontSize) ?? fallback;
}

export function stepFontSize(editor: Editor, dir: 1 | -1, fallback: number): boolean {
  const cur = currentFontSizePt(editor, fallback);
  const next = dir > 0 ? FONT_SIZES.find((s) => s > cur) : [...FONT_SIZES].reverse().find((s) => s < cur);
  return setFontSizePt(editor, next ?? cur + dir);
}

/** ⌘\: șterge formatarea caracterelor, dar păstrează câmpurile, sugestiile și linkurile. */
const KEEP_MARKS = new Set(["placeholder", "suggestInsert", "suggestDelete", "link"]);
export function clearFormatting(editor: Editor): boolean {
  return editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const { from, to, empty } = state.selection;
      if (empty) {
        tr.setStoredMarks([]);
        return true;
      }
      for (const [, type] of Object.entries(state.schema.marks)) {
        if (!KEEP_MARKS.has(type.name)) tr.removeMark(from, to, type);
      }
      return true;
    })
    .run();
}

export function toggleHighlight(editor: Editor, color = DEFAULT_HIGHLIGHT): boolean {
  const current = editor.getAttributes("textStyle").backgroundColor;
  return current ? editor.chain().focus().unsetBackgroundColor().run() : editor.chain().focus().setBackgroundColor(color).run();
}

/**
 * Scurtăturile barei care nu vin din extensiile Tiptap: ⇧⌘X tăiat, ⇧⌘H evidențiere,
 * ⇧⌘, / ⇧⌘. mărimea fontului, ⌘\ șterge formatarea și inserarea de rânduri/coloane în tabel.
 */
export const FormattingShortcuts = Extension.create<{ defaultFontSizePt: number }>({
  name: "lexFormattingShortcuts",
  addOptions() {
    return { defaultFontSizePt: 12 };
  },
  addKeyboardShortcuts() {
    const e = () => this.editor;
    const inTable = () => e().isActive("table");
    return {
      "Mod-Shift-x": () => e().chain().focus().toggleStrike().run(),
      "Mod-Shift-h": () => toggleHighlight(e()),
      "Mod-Shift-,": () => stepFontSize(e(), -1, this.options.defaultFontSizePt),
      "Mod-Shift-.": () => stepFontSize(e(), 1, this.options.defaultFontSizePt),
      "Mod-\\": () => clearFormatting(e()),
      "Mod-Alt-ArrowUp": () => inTable() && e().chain().focus().addRowBefore().run(),
      "Mod-Alt-ArrowDown": () => inTable() && e().chain().focus().addRowAfter().run(),
      "Mod-Alt-ArrowLeft": () => inTable() && e().chain().focus().addColumnBefore().run(),
      "Mod-Alt-ArrowRight": () => inTable() && e().chain().focus().addColumnAfter().run(),
    };
  },
});

export type ParagraphStyle = "paragraph" | "h1" | "h2" | "h3" | "h4" | "quote";

/** „Citat” nu are nod propriu în contract: e un paragraf indentat cu 36 pt, cursiv. */
export function setParagraphStyle(editor: Editor, style: ParagraphStyle): boolean {
  const chain = editor.chain().focus();
  if (style === "paragraph") return chain.setParagraph().run();
  if (style === "quote") {
    return chain
      .setParagraph()
      .command(({ tr, state }) => {
        const { from, to } = state.selection;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (node.type.name !== "paragraph") return true;
          tr.setNodeMarkup(pos, undefined, { ...node.attrs, indentPt: 36, spaceBeforePt: 6, spaceAfterPt: 6 });
          tr.addMark(pos + 1, pos + node.nodeSize - 1, state.schema.marks.italic.create());
          return false;
        });
        return true;
      })
      .run();
  }
  const level = Number(style.slice(1)) as 1 | 2 | 3 | 4;
  return chain.setHeading({ level }).run();
}
