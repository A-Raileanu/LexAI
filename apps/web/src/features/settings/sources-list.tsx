"use client";

import { IconAlertTriangle, IconArrowDown, IconArrowUp, IconDots, IconTrash } from "@tabler/icons-react";
import { useOptimistic, useState, useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge, BadgeDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fullDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { clearSourceCache, moveSource, setSourceEnabled, type ActionResult } from "./actions";
import type { SourceView } from "./data";
import { SettingsSection } from "./section";
import { cacheFreshness, fmtBytes, moveInOrder } from "./source-order";

const DESCRIPTIONS: Record<string, string> = {
  "portal-legislativ": "legislatie.just.ro: textul oficial și formele consolidate ale actelor normative.",
  jurisprudenta: "Deciziile Curții Constituționale și ale ÎCCJ (RIL, HP), de pe Portalul Legislativ și scj.ro.",
  "web-oficial": "Pagini de pe domeniile instituțiilor publice (ministere, autorități), pentru context.",
};

const count = new Intl.NumberFormat("ro-RO");

type Change = { type: "toggle"; id: string; enabled: boolean } | { type: "move"; id: string; dir: "sus" | "jos" } | { type: "clear"; id: string };

function reduce(state: SourceView[], c: Change): SourceView[] {
  if (c.type === "toggle") return state.map((s) => (s.id === c.id ? { ...s, enabled: c.enabled } : s));
  if (c.type === "clear") return state.map((s) => (s.id === c.id ? { ...s, entries: 0, bytes: 0, lastFetchedAt: null } : s));
  const order = moveInOrder(
    state.map((s) => s.id),
    c.id,
    c.dir,
  );
  return order.map((id) => state.find((s) => s.id === id)!);
}

export function SourcesSection({ sources, now }: { sources: SourceView[]; now: number }) {
  const [list, apply] = useOptimistic(sources, reduce);
  const [, start] = useTransition();
  const [confirmOff, setConfirmOff] = useState<SourceView | null>(null);
  const [confirmClear, setConfirmClear] = useState<SourceView | null>(null);
  const activeCount = list.filter((s) => s.enabled).length;

  const run = (change: Change, action: () => Promise<ActionResult<unknown>>, success: string) =>
    new Promise<void>((resolve) => {
      start(async () => {
        apply(change);
        const res = await action().catch(() => ({ ok: false as const, error: "Serverul local nu răspunde." }));
        if (res.ok) toast.success(success);
        else toast.error("Nu am putut salva. Reîncearcă.", { description: res.error, action: { label: "Reîncearcă", onClick: () => void run(change, action, success) } });
        resolve();
      });
    });

  const toggle = (s: SourceView, enabled: boolean) => {
    if (!enabled && s.enabled && activeCount === 1) {
      setConfirmOff(s);
      return;
    }
    void run({ type: "toggle", id: s.id, enabled }, () => setSourceEnabled(s.id, enabled), enabled ? "Sursă activată" : "Sursă dezactivată");
  };

  const move = (s: SourceView, dir: "sus" | "jos") => void run({ type: "move", id: s.id, dir }, () => moveSource(s.id, dir), "Ordinea a fost salvată");

  return (
    <SettingsSection
      id="surse"
      title="Surse legale"
      description="Sursele în care LexAI verifică trimiterile la lege, în ordinea priorității. Prima sursă care răspunde e folosită ca referință."
    >
      {activeCount === 0 && (
        <div className="p-3">
          <Alert variant="warning" appearance="soft">
            <IconAlertTriangle />
            <AlertTitle>Nicio sursă legală activă.</AlertTitle>
            <AlertDescription>Analizele nu pot verifica trimiterile la lege.</AlertDescription>
          </Alert>
        </div>
      )}
      <ol className="divide-y divide-border">
        {list.map((s, i) => {
          const fresh = cacheFreshness(s.lastFetchedAt, now);
          const first = i === 0;
          const last = i === list.length - 1;
          return (
            <li key={s.id} className="flex items-start gap-3 px-4 py-3.5">
              <span
                className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-medium tabular-nums", !s.enabled && "text-muted-foreground")}
                aria-label={`Prioritatea ${i + 1}`}
              >
                {i + 1}
              </span>
              <div className={cn("min-w-0 flex-1", !s.enabled && "opacity-70")}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-sm font-medium">{s.label}</p>
                  {fresh === "actualizat" && s.lastFetchedAt && (
                    <Tooltip>
                      <TooltipTrigger render={<Badge variant="success" shape="pill" />}>
                        <BadgeDot />
                        Actualizat · {relativeTime(s.lastFetchedAt, now)}
                      </TooltipTrigger>
                      <TooltipContent>Ultima descărcare: {fullDate(s.lastFetchedAt)}</TooltipContent>
                    </Tooltip>
                  )}
                  {fresh === "vechi" && s.lastFetchedAt && (
                    <Tooltip>
                      <TooltipTrigger render={<Badge variant="warning" shape="pill" />}>
                        <BadgeDot />
                        Vechi · {relativeTime(s.lastFetchedAt, now)}
                      </TooltipTrigger>
                      <TooltipContent>Nicio descărcare nouă de peste 7 zile. Textele se reîmprospătează automat la următoarea analiză care le folosește.</TooltipContent>
                    </Tooltip>
                  )}
                  {fresh === "gol" && (
                    <Badge appearance="muted" shape="pill">
                      Cache gol
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{DESCRIPTIONS[s.id] ?? s.id}</p>
                {s.entries > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {count.format(s.entries)} {s.entries === 1 ? "intrare" : "intrări"} în cache · {fmtBytes(s.bytes)}
                    {s.lastFetchedAt && <> · ultima sincronizare {fullDate(s.lastFetchedAt)}</>}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <label className="flex items-center gap-2 pe-1 text-xs text-muted-foreground">
                  <span className="max-sm:sr-only">{s.enabled ? "Activă" : "Inactivă"}</span>
                  <Switch checked={s.enabled} onCheckedChange={(v) => toggle(s, v)} aria-label={`${s.label}: ${s.enabled ? "activă" : "inactivă"}`} />
                </label>
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="ghost" size="icon-sm" className="max-sm:hidden" disabled={first} aria-label={`Mută ${s.label} mai sus`} onClick={() => move(s, "sus")} />}
                  >
                    <IconArrowUp />
                  </TooltipTrigger>
                  <TooltipContent>Mută mai sus</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="ghost" size="icon-sm" className="max-sm:hidden" disabled={last} aria-label={`Mută ${s.label} mai jos`} onClick={() => move(s, "jos")} />}
                  >
                    <IconArrowDown />
                  </TooltipTrigger>
                  <TooltipContent>Mută mai jos</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acțiuni pentru ${s.label}`} />}>
                    <IconDots />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem disabled={first} onClick={() => move(s, "sus")}>
                      <IconArrowUp />
                      Mută mai sus
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={last} onClick={() => move(s, "jos")}>
                      <IconArrowDown />
                      Mută mai jos
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" disabled={s.entries === 0} onClick={() => setConfirmClear(s)}>
                      <IconTrash />
                      Golește cache-ul
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ol>

      <AlertDialog open={confirmOff !== null} onOpenChange={(o) => !o && setConfirmOff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dezactivezi ultima sursă activă?</AlertDialogTitle>
            <AlertDialogDescription>Fără nicio sursă legală, analizele nu pot verifica trimiterile la lege.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const s = confirmOff;
                setConfirmOff(null);
                if (s) void run({ type: "toggle", id: s.id, enabled: false }, () => setSourceEnabled(s.id, false), "Sursă dezactivată");
              }}
            >
              Dezactivează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear !== null} onOpenChange={(o) => !o && setConfirmClear(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Golești cache-ul pentru {confirmClear?.label}?</AlertDialogTitle>
            <AlertDialogDescription>Următoarea analiză va descărca din nou textele, deci va dura mai mult.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const s = confirmClear;
                setConfirmClear(null);
                if (s) void run({ type: "clear", id: s.id }, () => clearSourceCache(s.id), "Cache golit");
              }}
            >
              Golește cache-ul
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
