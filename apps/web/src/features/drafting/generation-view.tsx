"use client";

import { fmtDate } from "@lexai/core/labels";
import { IconAlertTriangle, IconBook2, IconCircleCheck, IconCircleX, IconClock, IconPlayerStopFilled, IconRefresh, IconSearch, IconWifiOff } from "@tabler/icons-react";
import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { fmtElapsed, stepsOf, type DraftingProgress } from "./progress";
import type { DraftInfo, JobStatus } from "./types";
import { STEP_STATE_LABEL, StepIcon, useNow } from "./ui";
import type { JobConnection } from "./use-job-events";

const VISIBLE_ACTIVITY = 30;

/** Etapele, planul (secțiunile) și fluxul de activitate / actele cercetate. */
export function GenerationDetails({ progress, status, done }: { progress: DraftingProgress; status: JobStatus | null; done: boolean }) {
  const steps = stepsOf(progress, status);
  const [all, setAll] = useState(false);
  const lines = [...progress.activitate].reverse();
  const shown = all ? lines : lines.slice(0, VISIBLE_ACTIVITY);

  return (
    <div className="flex flex-col gap-5">
      <ol aria-label="Etapele generării" className="flex flex-col gap-2.5">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-3 text-md/5">
            <span className="mt-0.5">
              <StepIcon state={s.state} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("font-medium", s.state === "urmeaza" && "text-fg-3")}>{s.label}</span>
              <span className="sr-only"> — {STEP_STATE_LABEL[s.state]}</span>
              {s.meta && <span className="block text-sm/5 font-normal text-fg-2">{s.meta}</span>}
            </span>
          </li>
        ))}
      </ol>

      {progress.plan.length > 0 && (
        <section aria-labelledby="gen-plan">
          <h3 id="gen-plan" className="mb-2 text-sm/5 font-semibold text-fg-2">
            Secțiuni
          </h3>
          <ol className="flex flex-col gap-1">
            {progress.plan.map((s, i) => (
              <li key={`${i}-${s}`} className="flex items-start gap-3 text-md/5">
                {done ? (
                  <IconCircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-v-corect-fg" />
                ) : (
                  <span aria-hidden className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[0.625rem] tabular-nums text-fg-3 inset-ring-(length:--hairline) inset-ring-divider">
                    {i + 1}
                  </span>
                )}
                <span className={cn("min-w-0", !done && "text-fg-2")}>{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Tabs defaultValue="activitate" className="gap-2">
        <TabsList className="w-full" aria-label="Activitatea agentului">
          <TabsTrigger value="activitate">Activitate</TabsTrigger>
          <TabsTrigger value="acte">
            Acte cercetate <span className="tabular-nums text-fg-3">{progress.acte.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="activitate">
          {shown.length ? (
            <ul className="flex flex-col gap-1.5" aria-label="Activitate, cele mai noi primele">
              {shown.map((l) => {
                const reads = /^Cite(sc|ște)\b/u.test(l.mesaj);
                const Icon = reads ? IconBook2 : IconSearch;
                return (
                  <li key={l.seq} className="flex items-start gap-2 text-sm/5 text-fg-2">
                    <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-3" />
                    <span className="min-w-0 break-words">{l.mesaj}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm/5 text-fg-2">{done ? "Nu există activitate înregistrată." : "Agentul pornește cercetarea…"}</p>
          )}
          {lines.length > VISIBLE_ACTIVITY && (
            <Button variant="link" size="sm" className="mt-2 px-0" onClick={() => setAll((v) => !v)}>
              {all ? "Doar ultimii pași" : `Toți pașii (${lines.length})`}
            </Button>
          )}
        </TabsContent>
        <TabsContent value="acte">
          {progress.acte.length ? (
            <ul className="flex flex-col gap-2">
              {progress.acte.map((a) => (
                <li key={a.key} className="flex items-start gap-3 text-md/5">
                  <IconCircleCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-v-corect-fg" />
                  <span className="min-w-0">
                    <span className="block">{a.titlu.replace(/\*+/g, "")}</span>
                    <span className="block text-sm/5 text-fg-2">
                      {a.unitati.join(", ")}
                      {a.forma && ` · ${a.forma}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm/5 text-fg-2">Niciun act citit încă.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function elapsedOf(draft: DraftInfo | null, now: number): number | null {
  const job = draft?.job;
  if (!job) return null;
  const start = job.startedAt ?? job.createdAt;
  if (job.finishedAt) return job.finishedAt - start;
  return now ? now - start : null;
}

interface ViewProps {
  phase: "generating" | "finishing" | "failed";
  draft: DraftInfo | null;
  status: JobStatus | null;
  progress: DraftingProgress;
  connection: JobConnection;
  onRerun: () => void;
  rerunning: boolean;
}

/** Faza A (docs/ux/10-generare-temeiuri.md): generarea în curs, apoi oprită sau eșuată. */
export function GenerationView({ phase, draft, status, progress, connection, onRerun, rerunning }: ViewProps) {
  const running = phase === "generating";
  const now = useNow(running && Boolean(draft?.job?.startedAt));
  const elapsed = elapsedOf(draft, now);
  const waiting = status === "in_asteptare";
  const [confirmStop, setConfirmStop] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<string | null>(null);

  const stop = async () => {
    if (!draft?.job) return;
    setStopping(true);
    setStopError(null);
    try {
      const res = await fetch(`/api/jobs/${encodeURIComponent(draft.job.id)}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error();
      setConfirmStop(false);
    } catch {
      setStopError("Nu am putut opri generarea. Încearcă din nou.");
    } finally {
      setStopping(false);
    }
  };

  const title =
    phase === "finishing"
      ? "Se încarcă proiectul"
      : phase === "failed"
        ? status === "anulat"
          ? "Generare oprită"
          : status === "intrerupt"
            ? "Generare întreruptă"
            : "Generarea nu a reușit"
        : waiting
          ? "Generare în așteptare"
          : "Generare în curs";
  const eroare = progress.eroare ?? draft?.job?.error ?? null;
  const stoppingRequested = running && stopping;

  return (
    <div className="flex flex-col">
      <header className="flex min-h-16 flex-col justify-center gap-1 border-b border-divider px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="flex min-w-0 flex-1 items-center gap-2 text-base/[22px] font-semibold">
            {phase === "finishing" && <Spinner size="sm" className="text-ai" aria-hidden />}
            {title}
          </h2>
          {running && (
            <Button variant="ghost-destructive" size="sm" className="shrink-0" onClick={() => setConfirmStop(true)} disabled={stoppingRequested}>
              <IconPlayerStopFilled data-icon="inline-start" aria-hidden />
              Oprește
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm/[18px] text-fg-2">
          {running && connection === "reconnecting" ? (
            <span className="inline-flex items-center gap-1" role="status">
              <IconWifiOff aria-hidden className="size-4" />
              Se reconectează…
            </span>
          ) : (
            elapsed !== null &&
            !waiting && (
              <span className="inline-flex items-center gap-1 tabular-nums" title="Timp scurs">
                <IconClock aria-hidden className="size-4" />
                <span className="sr-only">Timp scurs: </span>
                {fmtElapsed(elapsed)}
              </span>
            )
          )}
          <span className="min-w-0 flex-1">
            {draft?.dataLegii ? `Legislația în vigoare la ${fmtDate(draft.dataLegii)}` : "Legislația în vigoare la data documentului"}
            {waiting && " · pornește imediat ce se termină jobul anterior"}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-4">
        {phase === "failed" && (
          <Alert variant={status === "anulat" ? "default" : status === "intrerupt" ? "warning" : "destructive"} appearance="soft">
            {status === "anulat" ? <IconPlayerStopFilled aria-hidden /> : status === "intrerupt" ? <IconAlertTriangle aria-hidden /> : <IconCircleX aria-hidden />}
            <AlertTitle>
              {status === "anulat" ? "Ai oprit generarea." : status === "intrerupt" ? "Generarea s-a întrerupt." : "Generarea nu a putut continua."}
            </AlertTitle>
            <AlertDescription>
              <p>Documentul a rămas necompletat. Poți porni o generare nouă cu aceiași parametri; ea creează un document nou în același proiect.</p>
              {eroare && status !== "anulat" && <p className="mt-1 text-sm break-words">Detalii: {eroare}</p>}
              <Button size="sm" className="mt-3" onClick={onRerun} disabled={rerunning}>
                {rerunning ? <Spinner size="sm" aria-hidden data-icon="inline-start" /> : <IconRefresh data-icon="inline-start" aria-hidden />}
                {rerunning ? "Se pornește…" : "Generează din nou"}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {stopError && (
          <p role="alert" className="text-sm text-v-eroare-fg">
            {stopError}
          </p>
        )}

        <GenerationDetails progress={progress} status={status} done={false} />
      </div>

      {running && (
        <footer className="mt-auto flex flex-col gap-1 border-t border-divider px-4 py-3 text-sm/5 text-fg-3">
          <p>Poți închide pagina — generarea continuă în fundal și o regăsești aici.</p>
          <p>Draftul e redactat automat pe baza textelor oficiale. Verifică fiecare clauză înainte de semnare.</p>
        </footer>
      )}

      <AlertDialog open={confirmStop} onOpenChange={(o) => !stopping && setConfirmStop(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oprești generarea?</AlertDialogTitle>
            <AlertDialogDescription>Proiectul nu se păstrează: documentul rămâne necompletat. Poți porni din nou generarea, cu aceiași parametri.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={stopping}>Continuă</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={(e) => (e.preventDefault(), void stop())} disabled={stopping}>
              {stopping ? "Se oprește…" : "Oprește"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
