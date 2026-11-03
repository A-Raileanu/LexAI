"use client";

import { IconArrowMerge, IconArrowsSplit, IconChevronDown, IconPalette } from "@tabler/icons-react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { clearFormatting } from "./schema/formatting";
import { insertPageBreak } from "./schema/page-break";
import { HIGHLIGHT_COLORS, toEditor } from "./toolbar/shared";

const CELL_COLORS = [{ value: "#ffffff", label: "Alb" }, ...HIGHLIGHT_COLORS, { value: "#d9d9d9", label: "Gri deschis" }, { value: "#dbe5f1", label: "Albastru pal" }];

interface TableInfo {
  pos: number;
  header: boolean;
  canMerge: boolean;
  canSplit: boolean;
  cellBg: string | null;
}

function tableInfo(e: Editor): TableInfo | null {
  if (!e.isActive("table")) return null;
  const { $from } = e.state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type.name === "table") {
      const first = node.firstChild;
      let header = Boolean(first?.childCount);
      first?.forEach((c) => {
        if (c.type.name !== "tableHeader") header = false;
      });
      const cell = e.isActive("tableHeader") ? e.getAttributes("tableHeader") : e.getAttributes("tableCell");
      return { pos: $from.before(d), header, canMerge: e.can().mergeCells(), canSplit: e.can().splitCell(), cellBg: (cell.backgroundColor as string | null) ?? null };
    }
  }
  return null;
}

/** Lățime egală pentru toate coloanele, pe lățimea utilă a paginii. */
function equalizeColumns(editor: Editor, contentWidthPx: number) {
  editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      const { $from } = state.selection;
      for (let d = $from.depth; d > 0; d--) {
        const table = $from.node(d);
        if (table.type.name !== "table") continue;
        const start = $from.before(d);
        let cols = 0;
        table.firstChild?.forEach((c) => (cols += (c.attrs.colspan as number) || 1));
        const w = Math.floor(contentWidthPx / Math.max(1, cols));
        table.descendants((node, pos) => {
          if (node.type.name !== "tableCell" && node.type.name !== "tableHeader") return true;
          const span = (node.attrs.colspan as number) || 1;
          tr.setNodeMarkup(start + 1 + pos, undefined, { ...node.attrs, colwidth: Array.from({ length: span }, () => w) });
          return false;
        });
        return true;
      }
      return false;
    })
    .run();
}

const K = ({ keys }: { keys: string }) => (
  <DropdownMenuShortcut>
    <Kbd keys={keys} size="sm" variant="flat" />
  </DropdownMenuShortcut>
);

function DisabledTip({ reason, children }: { reason: string | null; children: React.ReactElement }) {
  if (!reason) return children;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" tabIndex={0} />}>{children}</TooltipTrigger>
      <TooltipContent>{reason}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Bara contextuală pentru tabel: o bandă mică ancorată deasupra tabelului (Popover non-modal),
 * vizibilă cât cursorul e într-un tabel.
 */
export function TableBar({ editor, contentWidthPx, hidden }: { editor: Editor; contentWidthPx: number; hidden?: boolean }) {
  const info = useEditorState({ editor, selector: ({ editor: e }) => (e.isEditable ? tableInfo(e) : null) });
  const open = Boolean(info) && !hidden;
  const run = (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => fn(editor.chain().focus()).run();

  return (
    <Popover open={open} modal={false}>
      <PopoverContent
        anchor={() => (info ? (editor.view.nodeDOM(info.pos) as Element | null) : null)}
        side="top"
        align="start"
        sideOffset={4}
        initialFocus={false}
        finalFocus={false}
        className="w-auto p-1"
        aria-label="Opțiuni tabel"
      >
        {info && (
          <div className="flex items-center gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="xs" />}>
                Tabel <IconChevronDown className="text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent finalFocus={toEditor(editor)}>
                <DropdownMenuCheckboxItem checked={info.header} onCheckedChange={() => run((c) => c.toggleHeaderRow())}>
                  Rând de antet
                </DropdownMenuCheckboxItem>
                <DropdownMenuItem onClick={() => equalizeColumns(editor, contentWidthPx)}>Lățime egală a coloanelor</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => run((c) => c.deleteTable())}>
                  Șterge tabelul
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="xs" />}>
                Rând <IconChevronDown className="text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent finalFocus={toEditor(editor)}>
                <DropdownMenuItem onClick={() => run((c) => c.addRowBefore())}>
                  Inserează deasupra
                  <K keys="mod+alt+arrowup" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => run((c) => c.addRowAfter())}>
                  Inserează dedesubt
                  <K keys="mod+alt+arrowdown" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => run((c) => c.deleteRow())}>
                  Șterge rândul
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="xs" />}>
                Coloană <IconChevronDown className="text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent finalFocus={toEditor(editor)}>
                <DropdownMenuItem onClick={() => run((c) => c.addColumnBefore())}>
                  Inserează la stânga
                  <K keys="mod+alt+arrowleft" />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => run((c) => c.addColumnAfter())}>
                  Inserează la dreapta
                  <K keys="mod+alt+arrowright" />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => run((c) => c.deleteColumn())}>
                  Șterge coloana
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DisabledTip reason={info.canMerge ? null : "Selectează cel puțin două celule"}>
              <Button variant="ghost" size="xs" disabled={!info.canMerge} onClick={() => run((c) => c.mergeCells())}>
                <IconArrowMerge />
                Îmbină celulele
              </Button>
            </DisabledTip>
            <DisabledTip reason={info.canSplit ? null : "Celula nu este îmbinată"}>
              <Button variant="ghost" size="xs" disabled={!info.canSplit} onClick={() => run((c) => c.splitCell())}>
                <IconArrowsSplit />
                Separă celula
              </Button>
            </DisabledTip>
            <CellColor editor={editor} value={info.cellBg} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CellColor({ editor, value }: { editor: Editor; value: string | null }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Culoare fundal celulă" />}>
              <IconPalette />
            </PopoverTrigger>
          }
        />
        <TooltipContent>Culoare fundal celulă</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto" side="bottom" finalFocus={toEditor(editor)}>
        <div className="grid grid-cols-5 gap-1.5">
          {CELL_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              aria-label={c.label}
              aria-pressed={value === c.value}
              className={cn(
                "size-6 rounded-md inset-ring-(length:--hairline) inset-ring-foreground/15 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
                value === c.value && "ring-2 ring-foreground/60",
              )}
              style={{ backgroundColor: c.value }}
              onClick={() => editor.chain().focus().setCellAttribute("backgroundColor", c.value).run()}
            />
          ))}
        </div>
        <Button variant="ghost" size="sm" className="justify-start" onClick={() => editor.chain().focus().setCellAttribute("backgroundColor", null).run()}>
          Fără culoare
        </Button>
      </PopoverContent>
    </Popover>
  );
}

const S = ({ keys }: { keys: string }) => (
  <ContextMenuShortcut>
    <Kbd keys={keys} size="sm" variant="flat" />
  </ContextMenuShortcut>
);

/** Meniul de click dreapta: operațiile pe tabel (Rând · Coloană · Celulă · Tabel) sau formatarea textului. */
export function EditorContextItems({ editor, inTable, onInsertField }: { editor: Editor; inTable: boolean; onInsertField: () => void }) {
  const run = (fn: (c: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => fn(editor.chain().focus()).run();
  if (inTable) {
    const canMerge = editor.can().mergeCells();
    const canSplit = editor.can().splitCell();
    return (
      <>
        <ContextMenuGroup>
          <ContextMenuLabel>Rând</ContextMenuLabel>
          <ContextMenuItem onClick={() => run((c) => c.addRowBefore())}>
            Inserează deasupra
            <S keys="mod+alt+arrowup" />
          </ContextMenuItem>
          <ContextMenuItem onClick={() => run((c) => c.addRowAfter())}>
            Inserează dedesubt
            <S keys="mod+alt+arrowdown" />
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel>Coloană</ContextMenuLabel>
          <ContextMenuItem onClick={() => run((c) => c.addColumnBefore())}>
            Inserează la stânga
            <S keys="mod+alt+arrowleft" />
          </ContextMenuItem>
          <ContextMenuItem onClick={() => run((c) => c.addColumnAfter())}>
            Inserează la dreapta
            <S keys="mod+alt+arrowright" />
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel>Celulă</ContextMenuLabel>
          <ContextMenuItem disabled={!canMerge} onClick={() => run((c) => c.mergeCells())}>
            Îmbină celulele
          </ContextMenuItem>
          <ContextMenuItem disabled={!canSplit} onClick={() => run((c) => c.splitCell())}>
            Separă celula
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuLabel>Tabel</ContextMenuLabel>
          <ContextMenuItem onClick={() => run((c) => c.toggleHeaderRow())}>Rând de antet</ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => run((c) => c.deleteRow())}>
            Șterge rândul
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => run((c) => c.deleteColumn())}>
            Șterge coloana
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => run((c) => c.deleteTable())}>
            Șterge tabelul
          </ContextMenuItem>
        </ContextMenuGroup>
      </>
    );
  }
  return (
    <>
      <ContextMenuItem onClick={() => run((c) => c.toggleBold())}>
        Aldin
        <S keys="mod+b" />
      </ContextMenuItem>
      <ContextMenuItem onClick={() => run((c) => c.toggleItalic())}>
        Cursiv
        <S keys="mod+i" />
      </ContextMenuItem>
      <ContextMenuItem onClick={() => run((c) => c.toggleUnderline())}>
        Subliniat
        <S keys="mod+u" />
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={onInsertField}>
        Inserează câmp de completat
        <S keys="mod+alt+p" />
      </ContextMenuItem>
      <ContextMenuItem onClick={() => insertPageBreak(editor)}>
        Salt de pagină
        <S keys="mod+enter" />
      </ContextMenuItem>
      <ContextMenuItem onClick={() => clearFormatting(editor)}>
        Șterge formatarea
        <S keys="mod+\" />
      </ContextMenuItem>
    </>
  );
}
