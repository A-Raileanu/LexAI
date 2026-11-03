"use client";

import { IconCheck, IconSparkles, IconX } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { acceptAllSuggestions, acceptSuggestion, findSuggestionRanges, rejectAllSuggestions, rejectSuggestion } from "./schema/suggestions";

export interface HoveredSuggestion {
  id: string;
  el: Element;
}

/**
 * Popover-ul mic de pe o sugestie AI (la hover): textul propus, „Acceptă” / „Respinge”
 * și, dacă sunt mai multe, „Acceptă toate (n)” / „Respinge toate”.
 */
export function SuggestionPopover({
  editor,
  hovered,
  total,
  onClose,
  onKeep,
}: {
  editor: Editor;
  hovered: HoveredSuggestion | null;
  total: number;
  onClose: () => void;
  onKeep: () => void;
}) {
  const ranges = hovered ? findSuggestionRanges(editor.state.doc, hovered.id) : [];
  const inserted = ranges.filter((r) => r.kind === "insert").map((r) => r.text).join("");
  const deleted = ranges.filter((r) => r.kind === "delete").map((r) => r.text).join("");
  const open = Boolean(hovered && ranges.length && editor.isEditable);

  const act = (fn: () => void) => {
    fn();
    onClose();
    editor.commands.focus();
  };

  return (
    <Popover open={open} onOpenChange={(o) => !o && onClose()} modal={false}>
      <PopoverContent
        anchor={hovered?.el ?? null}
        side="bottom"
        align="start"
        sideOffset={6}
        initialFocus={false}
        finalFocus={false}
        className="w-72 gap-2"
        onMouseEnter={onKeep}
        onMouseLeave={onClose}
      >
        <div className="flex items-center gap-1.5 text-xs font-medium text-ai">
          <IconSparkles className="size-3.5" aria-hidden />
          Sugestie AI
        </div>
        <p className="text-sm leading-snug">
          {deleted && <del className="text-v-eroare decoration-v-eroare">{deleted}</del>}
          {deleted && inserted && " → "}
          {inserted && <ins className="text-ai decoration-ai no-underline">{inserted}</ins>}
          {!deleted && !inserted && "—"}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button size="xs" onClick={() => hovered && act(() => acceptSuggestion(editor, hovered.id))}>
            <IconCheck />
            Acceptă
            <Kbd keys="mod+alt+y" size="sm" />
          </Button>
          <Button variant="ghost" size="xs" onClick={() => hovered && act(() => rejectSuggestion(editor, hovered.id))}>
            <IconX />
            Respinge
            <Kbd keys="mod+alt+n" size="sm" />
          </Button>
        </div>
        {total > 1 && (
          <div className="flex flex-wrap gap-1 border-t pt-2">
            <Button variant="outline" size="xs" onClick={() => act(() => acceptAllSuggestions(editor))}>
              Acceptă toate ({total})
            </Button>
            <Button variant="ghost" size="xs" onClick={() => act(() => rejectAllSuggestions(editor))}>
              Respinge toate
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
