"use client";

import { IconPageBreak, IconTable } from "@tabler/icons-react";
import type { Editor } from "@tiptap/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { insertPageBreak } from "../schema/page-break";
import { insertPlaceholder } from "../schema/placeholder";
import type { ControlProps } from "./controls";
import { Tip, TipLabel, keepFocus, toEditor } from "./shared";

const GRID = 8;

export function insertTable(editor: Editor, rows: number, cols: number) {
  return editor
    .chain()
    .focus()
    .insertTable({ rows: Math.max(1, Math.min(50, rows)), cols: Math.max(1, Math.min(20, cols)), withHeaderRow: false })
    .run();
}

/** Grila 8×8 de inserare a tabelului + „Inserează…” (dialog cu rânduri/coloane). */
export function TableInsert({ editor, disabled, onCustom }: ControlProps & { onCustom: () => void }) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Inserează tabel" disabled={disabled} />}>
            <IconTable />
          </PopoverTrigger>
        }
        content={<TipLabel label="Inserează tabel" />}
      />
      <PopoverContent className="w-auto" align="start" finalFocus={toEditor(editor)}>
        <div className="grid grid-cols-8 gap-0.5" role="grid" aria-label="Alege dimensiunea tabelului" onMouseLeave={() => setHover({ r: 0, c: 0 })}>
          {Array.from({ length: GRID * GRID }, (_, i) => {
            const r = Math.floor(i / GRID) + 1;
            const c = (i % GRID) + 1;
            const on = r <= hover.r && c <= hover.c;
            return (
              <button
                key={i}
                type="button"
                aria-label={`${r} × ${c}`}
                className={cn("size-4 rounded-[3px] inset-ring-(length:--hairline) inset-ring-foreground/20 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring", on && "bg-primary/70 inset-ring-primary")}
                onMouseEnter={() => setHover({ r, c })}
                onFocus={() => setHover({ r, c })}
                onClick={() => {
                  setOpen(false);
                  insertTable(editor, r, c);
                }}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground tabular-nums">{hover.r ? `${hover.r} × ${hover.c}` : "Rânduri × coloane"}</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              setOpen(false);
              onCustom();
            }}
          >
            Inserează…
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TableDialog({ editor, open, onOpenChange }: { editor: Editor; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        {open && (
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              onOpenChange(false);
              insertTable(editor, Number(f.get("rows")) || 2, Number(f.get("cols")) || 2);
            }}
          >
            <DialogHeader>
              <DialogTitle>Inserează tabel</DialogTitle>
              <DialogDescription>Alege numărul de rânduri și de coloane.</DialogDescription>
            </DialogHeader>
            <DialogBody className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="tbl-rows">Rânduri</FieldLabel>
                <Input id="tbl-rows" name="rows" type="number" min={1} max={50} defaultValue={3} autoFocus />
              </Field>
              <Field>
                <FieldLabel htmlFor="tbl-cols">Coloane</FieldLabel>
                <Input id="tbl-cols" name="cols" type="number" min={1} max={20} defaultValue={3} />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Anulează
              </Button>
              <Button type="submit">Inserează</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function PageBreakButton({ editor, disabled }: ControlProps) {
  return (
    <Tip label="Salt de pagină" keys="mod+enter">
      <Button variant="ghost" size="icon-sm" aria-label="Salt de pagină" disabled={disabled} onMouseDown={keepFocus} onClick={() => insertPageBreak(editor)}>
        <IconPageBreak />
      </Button>
    </Tip>
  );
}

function FieldForm({ onSubmit, autoFocus }: { onSubmit: (hint: string) => void; autoFocus?: boolean }) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(String(new FormData(e.currentTarget).get("hint") ?? ""));
      }}
    >
      <label htmlFor="field-hint" className="text-xs font-medium">
        Eticheta câmpului
      </label>
      <Input id="field-hint" name="hint" placeholder="Ex.: numele chiriașului" autoFocus={autoFocus} maxLength={80} />
      <Button type="submit" size="sm" className="self-end">
        Inserează câmpul
      </Button>
    </form>
  );
}

/** Butonul „●” cu Popover pentru eticheta câmpului `[● …]`; deschis și de ⌥⌘P. */
export function FieldInsert({ editor, disabled, open, onOpenChange }: ControlProps & { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <TooltipTrigger
        render={
          <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Inserează câmp de completat" disabled={disabled} />}>
            <span aria-hidden className="flex h-4 items-center rounded-sm bg-placeholder-bg px-0.5 text-[0.625rem] leading-none font-semibold text-paper-foreground">
              [●]
            </span>
          </PopoverTrigger>
        }
        content={<TipLabel label="Inserează câmp de completat" keys="mod+alt+p" />}
      />
      <PopoverContent className="w-64" align="start" finalFocus={toEditor(editor)}>
        <FieldForm
          autoFocus
          onSubmit={(hint) => {
            onOpenChange(false);
            insertPlaceholder(editor, hint);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** Aceeași inserare de câmp, ca dialog (când butonul e mutat în „⋯”). */
export function FieldDialog({ editor, open, onOpenChange }: { editor: Editor; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Inserează câmp de completat</DialogTitle>
          <DialogDescription>Câmpul apare în text ca [● etichetă] și se completează mai târziu.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {open && (
            <FieldForm
              autoFocus
              onSubmit={(hint) => {
                onOpenChange(false);
                insertPlaceholder(editor, hint);
              }}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

/** Interlinie personalizată. */
export function LineHeightDialog({ open, onOpenChange, onApply }: { open: boolean; onOpenChange: (o: boolean) => void; onApply: (v: number) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        {open && (
          <form
            className="contents"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(String(new FormData(e.currentTarget).get("lh") ?? "").replace(",", "."));
              if (Number.isFinite(v) && v >= 0.5 && v <= 5) {
                onOpenChange(false);
                onApply(Math.round(v * 100) / 100);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Interlinie personalizată</DialogTitle>
              <DialogDescription>Multiplicator între 0,5 și 5 (ex.: 1,15).</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <Field>
                <FieldLabel htmlFor="lh-value">Interlinie</FieldLabel>
                <Input id="lh-value" name="lh" inputMode="decimal" defaultValue="1,15" autoFocus />
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Anulează
              </Button>
              <Button type="submit">Aplică</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
