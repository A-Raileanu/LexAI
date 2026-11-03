"use client";

import { fmtDate } from "@lexai/core/labels";
import { IconAlertTriangle, IconPlayerPause, IconPlayerStop, IconSparkles, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import type { EditorBridge } from "@/features/editor/bridge";
import { cn } from "@/lib/utils";
import { useAnalysis, useAnalysisOptional } from "./context";
import { ProgressBody, RunningHeader } from "./progress-view";
import { FindingsList, ResultsView } from "./results-view";
import { StartForm } from "./start-form";

const timeFmt = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });

function EmptyView() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <Empty size="sm" className="justify-start pt-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconSparkles className="text-ai" />
          </EmptyMedia>
          <EmptyTitle>Documentul nu a fost încă analizat.</EmptyTitle>
          <EmptyDescription>Analiza verifică fiecare trimitere la lege în textul oficial, în forma în vigoare la data aleasă.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="w-full max-w-sm">
          <StartForm />
        </EmptyContent>
      </Empty>
    </div>
  );
}

/** Analiză oprită, întreruptă sau eșuată (docs/ux/07, „Stări”), cu „Reia”. */
function StoppedAlert() {
  const a = useAnalysis();
  const [hidden, setHidden] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const latest = a.latest;
  if (!latest || latest.status === "in_curs" || latest.status === "finalizata" || hidden === latest.id) return null;
  const busy = a.busy !== null;
  const at = latest.finishedAt ?? latest.job?.finishedAt ?? null;
  const reia = (
    <Button size="xs" onClick={() => void a.resume()} disabled={busy} aria-busy={a.busy === "start"}>
      {a.busy === "start" && <Spinner className="size-3" label="Se pornește" />}
      {latest.hasResult ? "Reia de unde a rămas" : "Reia analiza"}
    </Button>
  );
  const close = (
    <Button variant="ghost" size="icon-xs" className="ms-auto" aria-label="Ascunde mesajul" onClick={() => setHidden(latest.id)}>
      <IconX />
    </Button>
  );

  if (latest.status === "anulata") {
    return (
      <Alert appearance="soft" className="rounded-none" role="status">
        <IconPlayerStop aria-hidden />
        <AlertTitle className="flex items-center gap-2">Analiză oprită{close}</AlertTitle>
        <AlertDescription className="flex flex-col gap-2">
          <span>Ai oprit analiza{at ? ` la ${timeFmt.format(at)}` : ""}. {latest.hasResult ? "Constatările de până atunci rămân în listă." : ""}</span>
          <span className="flex flex-wrap gap-2">
            {reia}
            {latest.hasResult && (
              <Button variant="outline" size="xs" onClick={() => void a.restart()} disabled={busy}>
                Pornește din nou
              </Button>
            )}
          </span>
        </AlertDescription>
      </Alert>
    );
  }
  const failed = latest.status === "esuata";
  const error = latest.job?.error;
  return (
    <Alert variant={failed ? "destructive" : "warning"} appearance="soft" className="rounded-none" role="alert">
      {failed ? <IconAlertTriangle aria-hidden /> : <IconPlayerPause aria-hidden />}
      <AlertTitle className="flex items-center gap-2">
        {failed ? "Analiza nu a putut continua." : "Analiză întreruptă"}
        {close}
      </AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        {!failed && <span>Analiza s-a întrerupt{at ? ` la ${timeFmt.format(at)}` : ""} (proces oprit sau conexiune pierdută).</span>}
        {error && (
          <span>
            <button type="button" className="rounded-sm text-sm underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-focus-strong" aria-expanded={details} onClick={() => setDetails((d) => !d)}>
              {details ? "Ascunde detaliile tehnice" : "Detalii tehnice"}
            </button>
            {details && <span className="mt-1 block font-mono text-sm break-words">{error}</span>}
          </span>
        )}
        <span className="flex flex-wrap gap-2">{reia}</span>
      </AlertDescription>
    </Alert>
  );
}

function RunningView() {
  const a = useAnalysis();
  const tab = a.runningTab;
  const recheck = Boolean(a.latest?.recheckSegIds);
  const tabClass = "inline-flex h-8 items-center gap-1 rounded-md px-2.5 text-sm text-fg-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-focus-strong aria-selected:bg-muted aria-selected:font-medium aria-selected:text-foreground";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <RunningHeader title={recheck ? "Reverificare în curs" : "Analiză în curs"} />
      <div role="tablist" aria-label="Vizualizare" className="flex shrink-0 gap-1 border-b border-divider px-3 py-1.5">
        <button type="button" role="tab" id="analiza-tab-progres" aria-selected={tab === "progres"} aria-controls="analiza-panou-progres" className={tabClass} onClick={() => a.setRunningTab("progres")}>
          Progres
        </button>
        <button type="button" role="tab" id="analiza-tab-constatari" aria-selected={tab === "constatari"} aria-controls="analiza-panou-constatari" className={tabClass} onClick={() => a.setRunningTab("constatari")}>
          Constatări <span className="tabular-nums">({a.findings.length})</span>
        </button>
      </div>
      {tab === "progres" ? (
        <div id="analiza-panou-progres" role="tabpanel" aria-labelledby="analiza-tab-progres" className="min-h-0 flex-1 overflow-y-auto">
          <ProgressBody
            onShowFinding={(id) => {
              a.setRunningTab("constatari");
              a.select(id);
            }}
          />
        </div>
      ) : (
        <div id="analiza-panou-constatari" role="tabpanel" aria-labelledby="analiza-tab-constatari" className="flex min-h-0 flex-1 flex-col">
          <FindingsList live />
        </div>
      )}
      <p className="shrink-0 border-t border-divider px-4 py-2 text-sm/5 text-fg-3">Poți închide pagina — analiza continuă în fundal și o regăsești aici.</p>
    </div>
  );
}

/**
 * Fila „Constatări” din panoul editorului: pornirea analizei, progresul live (07) și rezultatele (08).
 * Starea stă în `AnalysisProvider` (spațiul de lucru); `editor` rămâne în semnătură pentru compatibilitate.
 */
export function FindingsPanel(props: { documentId: string; versionId: string | null; editor: EditorBridge }) {
  void props;
  const a = useAnalysisOptional();
  if (!a) return null;
  if (!a.latest) return <EmptyView />;
  if (a.running && !a.runningOverShown) return <RunningView />;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <StoppedAlert />
      {a.shown ? (
        <div className={cn("flex min-h-0 flex-1 flex-col")}>
          <ResultsView />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <p className="text-md text-fg-2">
            Ultima analiză ({fmtDate(a.latest.dataReferinta)}) nu are rezultate salvate. Poți porni una nouă:
          </p>
          <StartForm />
        </div>
      )}
    </div>
  );
}
