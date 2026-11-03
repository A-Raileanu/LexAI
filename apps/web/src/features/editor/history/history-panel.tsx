"use client";

import { IconArrowsLeftRight, IconDots, IconFilter, IconHistory, IconPencil, IconPlus, IconRestore } from "@tabler/icons-react";
import { Fragment, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getTodayKey } from "@/hooks/use-today";
import { useSyncExternalStore } from "react";
import { subscribeToday } from "@/hooks/use-today";
import { cn } from "@/lib/utils";
import type { VersionSummary } from "../actions";
import { dateTime, dayKey, dayLabel, timeHM } from "../fmt";
import type { Origin } from "../types";
import { ORIGINS, OriginBadge } from "./origin";

export const DRAFT = "ciorna";

interface Props {
  versions: VersionSummary[];
  currentVersionId: string | null;
  /** ciorna diferă de ultima versiune */
  draftDiffers: boolean;
  /** versiunea deschisă în foaie (previzualizare) sau cele comparate */
  activeIds: string[];
  onOpen: (versionId: string) => void;
  onCompare: (left: string, right: string) => void;
  onRestore: (versionId: string) => void;
  onEditNote: (versionId: string, note: string) => Promise<boolean>;
  onSaveVersion: () => void;
}

const ALL: Origin[] = ["manual", "import", "ai_sugestie", "generare", "restaurare"];

function useTodayKey() {
  return useSyncExternalStore(subscribeToday, getTodayKey, () => null);
}

/** Tab-ul „Istoric” (docs/ux/11-istoric-versiuni.md): versiunile pe zile, filtru de origine, comparare. */
export function HistoryPanel({ versions, currentVersionId, draftDiffers, activeIds, onOpen, onCompare, onRestore, onEditNote, onSaveVersion }: Props) {
  const today = useTodayKey();
  const [origins, setOrigins] = useState<Set<Origin>>(() => new Set(ALL));
  const [checked, setChecked] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);

  const filtered = useMemo(() => versions.filter((v) => origins.has(v.origin)), [versions, origins]);
  const groups = useMemo(() => {
    const out: { key: string; label: string; items: VersionSummary[] }[] = [];
    for (const v of filtered) {
      const k = dayKey(v.createdAt);
      const last = out[out.length - 1];
      if (last?.key === k) last.items.push(v);
      else out.push({ key: k, label: dayLabel(v.createdAt, today), items: [v] });
    }
    return out;
  }, [filtered, today]);
  const latest = versions[0];

  const toggleCheck = (id: string) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));

  const compareChecked = () => {
    const [a, b] = [...checked].sort((x, y) => (versions.find((v) => v.id === x)?.number ?? 0) - (versions.find((v) => v.id === y)?.number ?? 0));
    onCompare(a, b);
    setChecked([]);
  };

  if (!versions.length) {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconHistory />
          </EmptyMedia>
          <EmptyTitle>Nicio versiune salvată încă</EmptyTitle>
          <EmptyDescription>Ciorna se salvează automat. Salvează o versiune când vrei un punct la care să te poți întoarce.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={onSaveVersion}>Salvează versiunea</Button>
        </EmptyContent>
      </Empty>
    );
  }

  const allOrigins = origins.size === ALL.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="xs" />}>
            <IconFilter />
            {allOrigins ? "Toate originile" : [...origins].map((o) => ORIGINS[o].label).join(", ") || "Nicio origine"}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={allOrigins} onCheckedChange={() => setOrigins(new Set(allOrigins ? [] : ALL))} closeOnClick={false}>
              Toate originile
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            {ALL.map((o) => (
              <DropdownMenuCheckboxItem
                key={o}
                checked={origins.has(o)}
                closeOnClick={false}
                onCheckedChange={(on) =>
                  setOrigins((s) => {
                    const n = new Set(s);
                    if (on) n.add(o);
                    else n.delete(o);
                    return n;
                  })
                }
              >
                {ORIGINS[o].label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ms-auto flex items-center gap-1">
          {checked.length === 2 && (
            <Button variant="outline" size="xs" onClick={compareChecked}>
              <IconArrowsLeftRight />
              Compară
            </Button>
          )}
          <Button variant="ghost" size="xs" onClick={onSaveVersion}>
            <IconPlus />
            Salvează
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" role="list" aria-label="Versiuni">
        {draftDiffers && (
          <div className={cn("mb-2 rounded-lg border border-dashed p-2.5", activeIds.includes(DRAFT) && "bg-muted/60")} role="listitem">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Ciornă curentă</span>
              <Badge size="sm" variant="warning" className="ms-auto">
                nesalvată
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{latest ? `Modificări de la ${timeHM(latest.createdAt)}` : "Modificări nesalvate ca versiune"}</p>
            <div className="mt-2 flex gap-1">
              {latest && (
                <Button variant="outline" size="xs" onClick={() => onCompare(latest.id, DRAFT)}>
                  Compară
                </Button>
              )}
              <Button variant="outline" size="xs" onClick={onSaveVersion}>
                Salvează
              </Button>
            </div>
          </div>
        )}

        {!filtered.length && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nicio versiune cu originea aleasă.</p>}

        {groups.map((g) => (
          <Fragment key={g.key}>
            <h3 className="sticky top-0 z-1 bg-background px-2 pt-3 pb-1 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">{g.label}</h3>
            {g.items.map((v) => {
              const current = v.id === currentVersionId;
              const active = activeIds.includes(v.id);
              const isChecked = checked.includes(v.id);
              return (
                <div
                  key={v.id}
                  role="listitem"
                  className={cn(
                    "group/version relative flex gap-2 rounded-lg py-2 ps-2 pe-1 hover:bg-muted/60",
                    active && "bg-muted/80 before:absolute before:inset-y-2 before:start-0 before:w-0.5 before:rounded-full before:bg-foreground",
                  )}
                >
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleCheck(v.id)}
                    aria-label={`Selectează versiunea ${v.number} pentru comparare`}
                    className={cn("mt-0.5 opacity-0 group-hover/version:opacity-100 focus-visible:opacity-100", (isChecked || checked.length > 0) && "opacity-100")}
                  />
                  <div className="min-w-0 flex-1">
                    <button type="button" className="flex w-full flex-col items-start gap-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-sm" onClick={() => onOpen(v.id)}>
                      <span className="flex w-full flex-wrap items-center gap-1.5">
                        <Tooltip>
                          <TooltipTrigger render={<span className="text-sm font-semibold tabular-nums" />}>{timeHM(v.createdAt)}</TooltipTrigger>
                          <TooltipContent>{dateTime(v.createdAt)}</TooltipContent>
                        </Tooltip>
                        <OriginBadge origin={v.origin} />
                        <span className="text-xs text-muted-foreground tabular-nums">v{v.number}</span>
                        {current && (
                          <Badge size="sm" variant="success" className="ms-auto">
                            <span aria-hidden className="size-1.5 rounded-full bg-success" />
                            Curentă
                          </Badge>
                        )}
                      </span>
                    </button>
                    {editing === v.id ? (
                      <NoteEditor
                        initial={v.note ?? ""}
                        onCancel={() => setEditing(null)}
                        onSave={async (note) => {
                          if (await onEditNote(v.id, note)) setEditing(null);
                        }}
                      />
                    ) : v.note ? (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{v.note}</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        fără notă ·{" "}
                        <button type="button" className="underline decoration-current/40 underline-offset-2 hover:text-foreground" onClick={() => setEditing(v.id)}>
                          Adaugă notă
                        </button>
                      </p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-xs" aria-label={`Acțiuni pentru versiunea ${v.number}`} className="opacity-0 group-hover/version:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100" />}
                    >
                      <IconDots />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onCompare(v.id, DRAFT)}>
                        <IconArrowsLeftRight />
                        Compară cu actuala
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={current && !draftDiffers} onClick={() => onRestore(v.id)}>
                        <IconRestore />
                        Restaurează
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditing(v.id)}>
                        <IconPencil />
                        Editează nota
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
      <div className="border-t px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{versions.length === 1 ? "1 versiune" : `${versions.length} versiuni`}</div>
    </div>
  );
}

function NoteEditor({ initial, onSave, onCancel }: { initial: string; onSave: (note: string) => Promise<void>; onCancel: () => void }) {
  const [note, setNote] = useState(initial);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="mt-1.5 flex flex-col gap-1.5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSave(note);
        setBusy(false);
      }}
    >
      <Textarea
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        minRows={2}
        maxLength={500}
        aria-label="Nota versiunii"
        placeholder="Ex.: după discuția cu clientul"
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
      />
      <div className="flex justify-end gap-1">
        <Button type="button" variant="ghost" size="xs" onClick={onCancel}>
          Renunță
        </Button>
        <Button type="submit" size="xs" loading={busy}>
          Salvează nota
        </Button>
      </div>
    </form>
  );
}
