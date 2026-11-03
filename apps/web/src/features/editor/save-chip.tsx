"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { dateTime, timeHM } from "./fmt";
import type { SaveState } from "./use-autosave";

function label(s: SaveState): string {
  if (s.status === "dirty") return "Modificări nesalvate";
  if (s.status === "saving") return "Se salvează…";
  if (s.status === "error") return "Nesalvat · Reîncearcă";
  if (!s.savedAt) return "Salvat";
  return `${s.savedKind === "draft" ? "Ciornă salvată" : "Versiune salvată"} ${timeHM(s.savedAt)}`;
}

/** Punctul de stare și textul („Ciornă salvată 14:32”), fără interacțiune (bara de stare). */
export function SaveStatusText({ state, className }: { state: SaveState; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums", className)} role="status" aria-live="polite">
      {state.status === "saving" ? (
        <Spinner className="size-3" />
      ) : (
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            state.status === "saved" && "bg-success",
            state.status === "dirty" && "bg-muted-foreground/60",
            state.status === "error" && "bg-destructive",
          )}
        />
      )}
      <span className={cn(state.status === "error" && "text-destructive")}>{label(state)}</span>
    </span>
  );
}

/**
 * Indicatorul de salvare din antet. Click deschide „Salvează versiunea” cu o notă opțională
 * (butonul „Salvează” și ⌘S salvează direct, fără notă); în eroare, click reîncearcă salvarea ciornei.
 */
export function SaveChip({
  state,
  open,
  onOpenChange,
  onSaveVersion,
  onRetry,
  disabled,
}: {
  state: SaveState;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveVersion: (note: string) => Promise<boolean>;
  onRetry: () => void;
  disabled?: boolean;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const ok = await onSaveVersion(note);
    setBusy(false);
    if (ok) {
      setNote("");
      onOpenChange(false);
    }
  };

  if (state.status === "error") {
    return (
      <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0" aria-label="Ciorna nu a fost salvată. Reîncearcă">
        <SaveStatusText state={state} />
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={(o) => onOpenChange(o)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              disabled={disabled}
              render={
                <Button variant="ghost" size="sm" className="shrink-0">
                  <SaveStatusText state={state} />
                </Button>
              }
            />
          }
        />
        <TooltipContent>
          {state.savedAt ? `Salvat la ${dateTime(state.savedAt)} · ` : ""}Salvează versiunea cu o notă
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-80">
        <PopoverHeader>
          <PopoverTitle>Salvează versiunea</PopoverTitle>
          <PopoverDescription>Ciorna se salvează automat. O versiune rămâne în istoric și poate fi restaurată.</PopoverDescription>
        </PopoverHeader>
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <label htmlFor="version-note" className="text-xs font-medium">
            Notă (opțional)
          </label>
          <Textarea
            id="version-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: după discuția cu clientul"
            minRows={3}
            maxLength={500}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <Button type="submit" loading={busy} className="self-end">
            Salvează versiunea
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
