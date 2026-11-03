"use client";

import { fmtDate, plural } from "@lexai/core/labels";
import { IconCheck, IconChevronRight, IconCircle, IconClock, IconPlayerStopFilled } from "@tabler/icons-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAnalysis } from "./context";
import { stagesOf, type GroupProgress, type StageView } from "./events";
import { STATUS_ORDER, fmtElapsed } from "./model";
import { STATUS_UI, StatusIcon } from "./status";
import { useNow } from "./use-now";

const timeFmt = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });
const VISIBLE_LINES = 5;

/** Timpul scurs de la pornirea jobului, cu ora pornirii în tooltip. */
export function Elapsed({ from, className }: { from: number | null; className?: string }) {
  const now = useNow(1000, from !== null);
  if (from === null) return <span className={cn("text-sm/5 text-fg-2", className)}>În așteptare</span>;
  return (
    <Tooltip>
      <TooltipTrigger render={<span className={cn("inline-flex items-center gap-1 text-sm/5 tabular-nums text-fg-2", className)} />}>
        <IconClock aria-hidden className="size-3.5" />
        <span aria-label="Timp scurs">{now === null ? "—" : fmtElapsed(now - from)}</span>
      </TooltipTrigger>
      <TooltipContent>Pornită la {timeFmt.format(from)}</TooltipContent>
    </Tooltip>
  );
}

/** „Oprește”, cu confirmare (docs/ux/07, „Confirmare oprire”). */
export function StopButton({ compact }: { compact?: boolean }) {
  const a = useAnalysis();
  const [open, setOpen] = useState(false);
  const stopping = a.busy === "cancel";
  return (
    <>
      <Button variant="ghost-destructive" size={compact ? "xs" : "sm"} onClick={() => setOpen(true)} disabled={stopping} aria-busy={stopping}>
        {stopping ? <Spinner className="size-3.5" label="Se oprește" /> : <IconPlayerStopFilled />}
        {stopping ? "Se oprește…" : "Oprește"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oprești analiza?</AlertDialogTitle>
            <AlertDialogDescription>Constatările găsite până acum rămân în document. Poți relua mai târziu de la etapa curentă.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuă</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setOpen(false);
                void a.cancel();
              }}
            >
              Oprește analiza
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StageRow({ s }: { s: StageView }) {
  return (
    <li className={cn("flex items-start gap-3 rounded-md px-2 py-1.5", s.state === "curent" && "bg-muted")} aria-current={s.state === "curent" ? "step" : undefined}>
      <span className="mt-0.5 grid size-4 shrink-0 place-items-center">
        {s.state === "gata" ? (
          <IconCheck aria-label="Gata" className="size-4 text-v-corect-fg" />
        ) : s.state === "curent" ? (
          <Spinner className="size-4" label="În curs" />
        ) : (
          <IconCircle aria-label="Urmează" className="size-3.5 text-fg-3" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-md/5", s.state === "urmeaza" ? "text-fg-3" : "text-foreground", s.state === "curent" && "font-medium")}>{s.label}</span>
        {s.detail && <span className="block truncate text-sm/5 text-fg-2">{s.detail}</span>}
      </span>
    </li>
  );
}

/** Contoarele pe stări („Constatări până acum”), cu iconiță + cifră + etichetă. */
export function StatusCounters({ className }: { className?: string }) {
  const { counts } = useAnalysis();
  return (
    <ul className={cn("flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]", className)} aria-label="Constatări pe stări">
      {STATUS_ORDER.map((s) => (
        <li key={s} className={cn("inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm/5 inset-ring-(length:--hairline) inset-ring-divider", counts[s] > 0 && STATUS_UI[s].bg)}>
          <StatusIcon status={s} />
          <span className="font-medium tabular-nums">{counts[s]}</span>
          <span className="text-fg-2">{STATUS_UI[s].group}</span>
        </li>
      ))}
    </ul>
  );
}

function GroupRow({ g, open, onToggle, onFinding }: { g: GroupProgress; open: boolean; onToggle: () => void; onFinding: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const { actions } = useAnalysis();
  // constatările ignorate (după semnătură, din analize anterioare) nu sunt probleme
  const problems = g.linii.filter((l) => l.kind === "constatare" && l.status && l.status !== "corect" && !(l.findingId && actions[l.findingId] === "ignorata")).length;
  const lines = all ? g.linii : g.linii.slice(-VISIBLE_LINES);
  const hidden = g.totalLinii - lines.length;
  const bodyId = `grup-${g.cheie.replace(/[^a-z0-9]/gi, "-")}`;
  return (
    <li className="border-b border-divider last:border-b-0">
      <button
        type="button"
        className="flex min-h-10 w-full items-center gap-2 px-4 py-2 text-start outline-none hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-strong"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <IconChevronRight aria-hidden className={cn("size-4 shrink-0 text-fg-3 transition-transform duration-150 motion-reduce:transition-none", open && "rotate-90")} />
        <span className="min-w-0 flex-1 truncate text-md/5" title={g.eticheta}>
          {g.eticheta}
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-sm/5 text-fg-2">
          {g.stare === "lucru" && <Spinner className="size-3.5" label="În verificare" />}
          {g.stare === "gata" && <IconCheck aria-hidden className="size-4 text-v-corect-fg" />}
          {g.stare === "asteptare" ? "în așteptare" : g.stare === "gata" ? (problems ? plural(problems, "problemă", "probleme") : "gata") : plural(g.numar, "trimitere", "trimiteri")}
        </span>
      </button>
      {open && (
        <div id={bodyId} className="pb-3 ps-10 pe-4">
          {g.linii.length === 0 ? (
            <p className="text-sm/5 text-fg-2">{g.stare === "asteptare" ? "Urmează după grupurile în curs." : "Pornesc verificarea…"}</p>
          ) : (
            <ol className="flex flex-col gap-1" aria-live={g.stare === "lucru" ? "polite" : undefined}>
              {lines.map((l) =>
                l.kind === "constatare" && l.findingId && l.status ? (
                  <li key={l.seq}>
                    <button type="button" className={cn("flex w-full items-start gap-2 rounded-sm text-start text-sm/5 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus-strong", STATUS_UI[l.status].fg)} onClick={() => onFinding(l.findingId!)}>
                      <StatusIcon status={l.status} className="mt-0.5" />
                      <span className="min-w-0 truncate">{l.mesaj}</span>
                    </button>
                  </li>
                ) : (
                  <li key={l.seq} className="truncate text-sm/5 text-fg-2" title={l.mesaj}>
                    {l.mesaj}
                  </li>
                ),
              )}
            </ol>
          )}
          {hidden > 0 && !all && (
            <button type="button" className="mt-1 rounded-sm text-sm/5 text-fg-2 underline-offset-2 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-focus-strong" onClick={() => setAll(true)}>
              + încă {plural(hidden, "pas", "pași")}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/** Progresul unei analize complete (docs/ux/07): etape, contoare, grupuri cu activitate. */
export function ProgressBody({ onShowFinding }: { onShowFinding: (id: string) => void }) {
  const a = useAnalysis();
  const p = a.stream;
  const [pinned, setPinned] = useState<Record<string, boolean>>({});
  const stages = stagesOf(p, {
    refs: (n) => `${plural(n, "trimitere găsită", "trimiteri găsite")}`,
    groups: (n) => plural(n, "grup de verificare", "grupuri de verificare"),
  });
  const waiting = !p.lastSeq && p.connection !== "open";
  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-3">
        <ol className="flex flex-col gap-0.5" aria-label="Etapele analizei">
          {stages.map((s) => (
            <StageRow key={s.id} s={s} />
          ))}
        </ol>
        <div className="flex flex-col gap-1.5">
          <p className="text-sm/5 font-semibold text-fg-2">Constatări până acum</p>
          <StatusCounters />
        </div>
      </div>
      <div className="border-t border-divider">
        {waiting ? (
          <p className="px-4 py-3 text-sm/5 text-fg-2">Se reconectează…</p>
        ) : p.groups.length === 0 ? (
          <p className="px-4 py-3 text-sm/5 text-fg-2">{p.mesaj ?? "Pornesc analiza…"}</p>
        ) : (
          <ul aria-label="Grupuri de verificare">
            {p.groups.map((g) => (
              <GroupRow
                key={g.cheie}
                g={g}
                open={pinned[g.cheie] ?? g.stare === "lucru"}
                onToggle={() => setPinned((x) => ({ ...x, [g.cheie]: !(x[g.cheie] ?? g.stare === "lucru") }))}
                onFinding={onShowFinding}
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** Antetul jobului în curs, aliniat la stânga: titlu, timp scurs, „Oprește”. */
export function RunningHeader({ title }: { title: string }) {
  const a = useAnalysis();
  const latest = a.latest;
  const reconnecting = a.stream.connection === "reconnecting";
  return (
    <div className="flex min-h-16 flex-col justify-center border-b border-divider px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="flex items-center gap-2 text-base/[22px] font-semibold">
          <Spinner className="size-4" label="În curs" />
          {title}
        </h2>
        <span className="flex items-center gap-1.5">
          {reconnecting ? <span className="text-sm/5 text-fg-2">Se reconectează…</span> : <Elapsed from={latest?.job?.startedAt ?? null} />}
          <StopButton compact />
        </span>
      </div>
      {latest && (
        <p className="text-sm/[18px] text-fg-2">
          Legislația în vigoare la {fmtDate(latest.dataReferinta)}
          {latest.versionNumber !== null && ` · versiunea ${latest.versionNumber}`}
          {latest.recheckSegIds && ` · ${plural(latest.recheckSegIds.length, "paragraf", "paragrafe")}`}
        </p>
      )}
    </div>
  );
}
