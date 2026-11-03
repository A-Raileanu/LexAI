"use client";

import { IconLayoutSidebarRight, IconLayoutSidebarRightCollapse } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { TooltipGroup } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useElementSize } from "../hooks";
import { setBlockAttrs } from "../schema/block-format";
import { onPlaceholderRequest } from "../schema/placeholder";
import {
  AlignMenu,
  FontFamilyCombo,
  FontSizeControl,
  HighlightPicker,
  HistoryButtons,
  IndentButtons,
  LineHeightMenu,
  ListToggles,
  MarkToggles,
  StyleSelect,
  TextColorPicker,
} from "./controls";
import { FieldDialog, FieldInsert, LineHeightDialog, PageBreakButton, TableDialog, TableInsert } from "./insert";
import { OverflowMenu, type ControlKey } from "./overflow";
import { Tip } from "./shared";

/**
 * Prioritatea de mutare în „⋯” (docs/ux/05-editor.md, „Toolbar”): 1 se mută primul;
 * 0 = niciodată. Lățimile sunt aproximative (px), pentru calculul a ce încape.
 */
const CONTROLS: { key: ControlKey | "history" | "marks"; group: string; priority: number; width: number }[] = [
  { key: "history", group: "istoric", priority: 0, width: 68 },
  { key: "style", group: "stil", priority: 6, width: 116 },
  { key: "font", group: "font", priority: 5, width: 266 },
  { key: "marks", group: "formatare", priority: 0, width: 100 },
  { key: "strike", group: "formatare", priority: 4, width: 34 },
  { key: "colors", group: "culoare", priority: 3, width: 70 },
  { key: "align", group: "paragraf", priority: 2, width: 48 },
  { key: "indent", group: "paragraf", priority: 1, width: 66 },
  { key: "lineHeight", group: "paragraf", priority: 1, width: 34 },
  { key: "lists", group: "liste", priority: 4, width: 68 },
  { key: "table", group: "inserare", priority: 2, width: 34 },
  { key: "pageBreak", group: "inserare", priority: 2, width: 34 },
  { key: "field", group: "inserare", priority: 3, width: 34 },
];
const FIXED = 34 * 2 + 32; // ⋯, panou, spațiere
const SEPARATOR = 13;

/** Câte niveluri de prioritate trebuie mutate în „⋯” ca bara să încapă în `width`. */
export function hideLevelFor(width: number): number {
  if (!width) return 0;
  for (let level = 0; level <= 6; level++) {
    const visible = CONTROLS.filter((c) => c.priority === 0 || c.priority > level);
    const groups = new Set(visible.map((c) => c.group)).size;
    const total = visible.reduce((s, c) => s + c.width, 0) + (groups - 1) * SEPARATOR + FIXED;
    if (total <= width) return level;
  }
  return 6;
}

interface Props {
  editor: Editor;
  disabled?: boolean;
  defaultFont: string;
  defaultSize: number;
  defaultLineHeight: number;
  docFonts: string[];
  panelOpen: boolean;
  onTogglePanel: () => void;
  onFind: (replace: boolean) => void;
}

/** Bara de formatare (40 px), cu grupuri separate și overflow „⋯” după lățime. */
export function Toolbar({ editor, disabled, defaultFont, defaultSize, defaultLineHeight, docFonts, panelOpen, onTogglePanel, onFind }: Props) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const level = hideLevelFor(size.width);
  const hidden = new Set(CONTROLS.filter((c) => c.priority > 0 && c.priority <= level).map((c) => c.key as ControlKey));
  const show = (k: ControlKey) => !hidden.has(k);

  const [tableDialog, setTableDialog] = useState(false);
  const [lineDialog, setLineDialog] = useState(false);
  const [fieldOpen, setFieldOpen] = useState(false);
  const [fieldDialog, setFieldDialog] = useState(false);

  // ⌥⌘P (din extensia câmpului) deschide eticheta: popover-ul din bară sau dialogul, dacă butonul e în „⋯”
  const fieldHidden = hidden.has("field");
  useEffect(() => onPlaceholderRequest(editor, () => (fieldHidden ? setFieldDialog(true) : setFieldOpen(true))), [editor, fieldHidden]);

  type Group = { id: string; node: ReactNode } | null;
  const groups = ([
    { id: "istoric", node: <HistoryButtons editor={editor} disabled={disabled} /> },
    show("style") ? { id: "stil", node: <StyleSelect editor={editor} disabled={disabled} /> } : null,
    show("font")
      ? {
          id: "font",
          node: (
            <>
              <FontFamilyCombo editor={editor} disabled={disabled} defaultFont={defaultFont} docFonts={docFonts} />
              <FontSizeControl editor={editor} disabled={disabled} defaultSize={defaultSize} />
            </>
          ),
        }
      : null,
    { id: "formatare", node: <MarkToggles editor={editor} disabled={disabled} showStrike={show("strike")} /> },
    show("colors")
      ? {
          id: "culoare",
          node: (
            <>
              <TextColorPicker editor={editor} disabled={disabled} />
              <HighlightPicker editor={editor} disabled={disabled} />
            </>
          ),
        }
      : null,
    show("align") || show("indent") || show("lineHeight")
      ? {
          id: "paragraf",
          node: (
            <>
              {show("align") && <AlignMenu editor={editor} disabled={disabled} />}
              {show("indent") && <IndentButtons editor={editor} disabled={disabled} />}
              {show("lineHeight") && <LineHeightMenu editor={editor} disabled={disabled} defaultLineHeight={defaultLineHeight} onCustom={() => setLineDialog(true)} />}
            </>
          ),
        }
      : null,
    show("lists") ? { id: "liste", node: <ListToggles editor={editor} disabled={disabled} /> } : null,
    show("table") || show("pageBreak") || show("field")
      ? {
          id: "inserare",
          node: (
            <>
              {show("table") && <TableInsert editor={editor} disabled={disabled} onCustom={() => setTableDialog(true)} />}
              {show("pageBreak") && <PageBreakButton editor={editor} disabled={disabled} />}
              {show("field") && <FieldInsert editor={editor} disabled={disabled} open={fieldOpen} onOpenChange={setFieldOpen} />}
            </>
          ),
        }
      : null,
  ] as Group[]).filter((g): g is NonNullable<Group> => g !== null);

  return (
    <TooltipGroup side="bottom">
      <div
        ref={ref}
        role="toolbar"
        aria-label="Formatare"
        aria-disabled={disabled || undefined}
        className={cn("flex h-10 shrink-0 items-center gap-0.5 overflow-hidden border-b bg-background px-2", disabled && "[&>*:not([data-keep])]:opacity-40")}
      >
        {groups.map((g, i) => (
          <Fragment key={g.id}>
            {i > 0 && <Separator orientation="vertical" className="mx-1.5" />}
            <div className="flex shrink-0 items-center gap-0.5">{g.node}</div>
          </Fragment>
        ))}
        <Separator orientation="vertical" className="mx-1.5" />
        <OverflowMenu
          editor={editor}
          hidden={hidden}
          disabled={disabled}
          defaultFont={defaultFont}
          defaultSize={defaultSize}
          defaultLineHeight={defaultLineHeight}
          docFonts={docFonts}
          onFind={onFind}
          onTableDialog={() => setTableDialog(true)}
          onFieldDialog={() => setFieldDialog(true)}
          onLineHeightDialog={() => setLineDialog(true)}
        />
        <div className="ms-auto flex shrink-0 items-center gap-0.5" data-keep>
          <Tip label={panelOpen ? "Ascunde panoul" : "Afișează panoul"} keys="mod+.">
            <Toggle size="sm" aria-label={panelOpen ? "Ascunde panoul" : "Afișează panoul"} pressed={panelOpen} onPressedChange={onTogglePanel}>
              {panelOpen ? <IconLayoutSidebarRightCollapse /> : <IconLayoutSidebarRight />}
            </Toggle>
          </Tip>
        </div>
      </div>
      <TableDialog editor={editor} open={tableDialog} onOpenChange={setTableDialog} />
      <FieldDialog editor={editor} open={fieldDialog} onOpenChange={setFieldDialog} />
      <LineHeightDialog open={lineDialog} onOpenChange={setLineDialog} onApply={(v) => setBlockAttrs(editor, { lineHeight: v })} />
    </TooltipGroup>
  );
}
