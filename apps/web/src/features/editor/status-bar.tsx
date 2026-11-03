"use client";

import type { Node as PMNode } from "@tiptap/pm/model";
import { IconArrowDown, IconMinus, IconPlus } from "@tabler/icons-react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { findPlaceholders } from "./schema/placeholder";
import { listSuggestions } from "./schema/suggestions";

export interface DocStats {
  words: number;
  placeholders: number;
  suggestions: number;
}

const cache = new WeakMap<PMNode, DocStats>();

/** Statistici calculate o singură dată per document (tranzacțiile doar de selecție le refolosesc). */
export function docStats(doc: PMNode): DocStats {
  const hit = cache.get(doc);
  if (hit) return hit;
  const text = doc.textBetween(0, doc.content.size, " ", " ");
  const stats = { words: (text.match(/[\p{L}\p{N}][\p{L}\p{N}'’.,-]*/gu) ?? []).length, placeholders: findPlaceholders(doc).length, suggestions: listSuggestions(doc).length };
  cache.set(doc, stats);
  return stats;
}

export function useDocStats(editor: Editor): DocStats {
  return useEditorState({ editor, selector: ({ editor: e }) => docStats(e.state.doc) });
}

export type ZoomSetting = number | "fit";
export const ZOOM_PRESETS = [0.75, 1, 1.25];

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("ro-RO")} ${n === 1 ? one : many}`;

/** Bara de stare (28 px): cuvinte, pagina cursorului din total, câmpuri și sugestii (click = următorul), zoom. */
export function StatusBar({
  editor,
  pages,
  page,
  zoom,
  effectiveZoom,
  onZoom,
  onNextPlaceholder,
  onNextSuggestion,
  compact,
}: {
  editor: Editor;
  pages: number;
  /** pagina cursorului, de la 1 */
  page: number;
  zoom: ZoomSetting;
  effectiveZoom: number;
  onZoom: (z: ZoomSetting) => void;
  onNextPlaceholder: () => void;
  onNextSuggestion: () => void;
  compact: boolean;
}) {
  const stats = useDocStats(editor);
  const pct = Math.round(effectiveZoom * 100);
  const step = (dir: 1 | -1) => {
    const z = Math.round((effectiveZoom + dir * 0.1) * 10) / 10;
    onZoom(Math.min(2, Math.max(0.5, z)));
  };

  return (
    <footer
      className="flex h-7 shrink-0 items-center gap-3 border-t bg-background px-3 text-xs text-muted-foreground tabular-nums"
    >
      {!compact && (
        <>
          <span>{plural(stats.words, "cuvânt", "cuvinte")}</span>
          <span aria-hidden>·</span>
          <span>
            Pagina {page.toLocaleString("ro-RO")} din {pages.toLocaleString("ro-RO")}
          </span>
        </>
      )}
      {stats.placeholders > 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button type="button" onClick={onNextPlaceholder} className="inline-flex items-center gap-1 rounded px-1 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none">
                <span aria-hidden className="size-2 rounded-full bg-placeholder-bg ring-1 ring-v-discutabil/40" />
                {plural(stats.placeholders, "câmp de completat", "câmpuri de completat")}
                <IconArrowDown className="size-3" />
              </button>
            }
          />
          <TooltipContent>
            Câmpul următor <Kbd keys="mod+alt+arrowdown" size="sm" />
          </TooltipContent>
        </Tooltip>
      )}
      {stats.suggestions > 0 && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button type="button" onClick={onNextSuggestion} className="inline-flex items-center gap-1 rounded px-1 text-ai hover:bg-ai-soft focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none">
                {plural(stats.suggestions, "sugestie", "sugestii")}
                <IconArrowDown className="size-3" />
              </button>
            }
          />
          <TooltipContent>
            Sugestia următoare <Kbd keys="mod+alt+]" size="sm" />
          </TooltipContent>
        </Tooltip>
      )}
      <div className="ms-auto flex items-center gap-0.5">
        <Button variant="ghost" size="icon-xs" aria-label="Micșorează" onClick={() => step(-1)}>
          <IconMinus />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="xs" className="min-w-12 tabular-nums" aria-label={`Zoom ${pct}%`} />}>{pct}%</DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="min-w-44">
            <DropdownMenuRadioGroup value={zoom === "fit" ? "fit" : String(zoom)} onValueChange={(v) => onZoom(v === "fit" ? "fit" : Number(v))}>
              {ZOOM_PRESETS.map((z) => (
                <DropdownMenuRadioItem key={z} value={String(z)} closeOnClick>
                  {Math.round(z * 100)}%
                </DropdownMenuRadioItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuRadioItem value="fit" closeOnClick>
                Potrivește lățimea
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="ghost" size="icon-xs" aria-label="Mărește" onClick={() => step(1)}>
          <IconPlus />
        </Button>
      </div>
    </footer>
  );
}
