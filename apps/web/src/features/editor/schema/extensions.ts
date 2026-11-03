import { Image } from "@tiptap/extension-image";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { TextAlign } from "@tiptap/extension-text-align";
import { TextStyleKit } from "@tiptap/extension-text-style";
import type { Extensions } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { BlockFormat } from "./block-format";
import { PageBreak } from "./page-break";
import { PlaceholderMark } from "./placeholder";
import { SegId } from "./seg-id";
import { SuggestDelete, SuggestInsert, Suggestions } from "./suggestions";
import { LexTableCell, LexTableHeader } from "./table";

/**
 * Schema documentului, exact pe contractul din docs/arhitectura/document-json.md.
 * Folosită de editor, de vizualizarea versiunilor și de teste (fără React).
 */
export function contractExtensions(): Extensions {
  return [
    StarterKit.configure({
      blockquote: false,
      code: false,
      codeBlock: false,
      heading: { levels: [1, 2, 3, 4] },
      link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      // fără „Mod-Shift-s”: tăiatul e pe ⇧⌘X (FormattingShortcuts)
    }),
    // interlinia e atribut de paragraf în contract, nu de text
    TextStyleKit.configure({ lineHeight: false }),
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
    Subscript,
    Superscript,
    // imaginile din documentele importate: inline, ca în Word; cele lipite ca data URL nu se acceptă
    // (s-ar salva în fiecare versiune). Textul trimis la AI le ignoră.
    Image.configure({
      inline: true,
      allowBase64: false,
      resize: { enabled: true, directions: ["top-left", "top-right", "bottom-left", "bottom-right"], minWidth: 16, minHeight: 16, alwaysPreserveAspectRatio: true },
    }),
    TableKit.configure({ table: { resizable: true, cellMinWidth: 32, lastColumnResizable: false }, tableCell: false, tableHeader: false }),
    LexTableCell,
    LexTableHeader,
    SegId,
    BlockFormat,
    PageBreak,
    PlaceholderMark,
    SuggestInsert,
    SuggestDelete,
    Suggestions,
  ];
}
