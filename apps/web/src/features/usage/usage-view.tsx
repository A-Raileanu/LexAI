"use client";

import { IconChartBar, IconDownload, IconRefresh } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { PageTitle } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fullDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { JOB_KIND_LABELS, JOB_STATUS_LABELS, RANGES, bucketize, byJob, byStage, fmtPct, fmtTokens, fmtUsd, inRange, totals, type JobUsage, type Range } from "./aggregate";
import { toCsv } from "./csv";
import type { UsageSnapshot } from "./data";
import { HistoryChart, type Metric } from "./history-chart";
import { JobsTable, jobTitle } from "./jobs-table";
import { LimitCards, LimitReachedAlert } from "./limit-cards";

const STALE_MS = 15 * 60_000;

function csvDate(ms: number) {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function jobsCsv(jobs: JobUsage[]): string {
  return toCsv(
    ["Data", "Tip", "Job", "Proiect", "Stare", "Durată (s)", "Tokeni input", "Tokeni output", "Tokeni cache", "Tokeni total", "Cost echivalent API (USD)"],
    jobs.map((j) => [
      csvDate(j.t),
      JOB_KIND_LABELS[j.job.kind] ?? j.job.kind,
      jobTitle(j),
      j.job.projectName,
      JOB_STATUS_LABELS[j.job.status] ?? j.job.status,
      j.durationMs === null ? null : Math.round(j.durationMs / 1000),
      j.input,
      j.output,
      j.cache,
      j.tokens,
      Math.round(j.cost * 10_000) / 10_000,
    ]),
  );
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function UsageView({ data }: { data: UsageSnapshot }) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [range, setRange] = useState<Range>("7z");
  const [metric, setMetric] = useState<Metric>("tokens");
  const [stage, setStage] = useState<{ etapa: string; label: string } | null>(null);
  const { now, limits, rows, jobs, everUsed } = data;

  const view = useMemo(() => {
    const r = inRange(rows, range, now);
    return { buckets: bucketize(rows, range, now), totals: totals(r), stages: byStage(r), jobs: byJob(r, jobs) };
  }, [rows, jobs, range, now]);

  const readAt = limits ? Date.parse(limits.actualizatLa) : null;
  const stale = readAt !== null && now - readAt > STALE_MS;

  const exportCsv = () => {
    const name = `lexai-utilizare-${csvDate(now).slice(0, 10)}-${range}.csv`;
    download(name, jobsCsv(view.jobs));
    toast.success("Export CSV pregătit", { description: name });
  };

  return (
    <div className="flex flex-col gap-8">
      <PageTitle
        title="Utilizare"
        description="Limitele abonamentului Claude și consumul joburilor LexAI"
        actions={
          <>
            {readAt !== null && (
              <Tooltip>
                <TooltipTrigger render={<Badge appearance="outline" shape="pill" className={cn("tabular-nums", stale && "text-v-discutabil inset-ring-v-discutabil/40")} />}>
                  Actualizat {relativeTime(readAt, now)}
                </TooltipTrigger>
                <TooltipContent className="max-w-64">Limitele sunt raportate de Claude CLI după fiecare job AI. Ultima citire: {fullDate(readAt)}.</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" size="icon-sm" aria-label="Citește din nou limitele" loading={refreshing} onClick={() => startRefresh(() => router.refresh())} />}>
                <IconRefresh />
              </TooltipTrigger>
              <TooltipContent>Citește din nou limitele</TooltipContent>
            </Tooltip>
          </>
        }
      />

      <LimitReachedAlert limits={limits} now={now} />

      <LimitCards limits={limits} now={now} />

      {!everUsed ? (
        <Card className="justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconChartBar />
              </EmptyMedia>
              <EmptyTitle>Încă nu există joburi LexAI</EmptyTitle>
              <EmptyDescription>Consumul apare aici după prima analiză sau generare.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      ) : (
        <>
          <section aria-labelledby="istoric" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="istoric" className="text-base font-semibold">
                Istoric
              </h2>
              <ToggleGroup value={[range]} onValueChange={(v) => v[0] && setRange(v[0] as Range)} variant="outline" size="sm" aria-label="Perioada">
                {(Object.keys(RANGES) as Range[]).map((r) => (
                  <ToggleGroupItem key={r} value={r}>
                    {RANGES[r]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <Card size="sm" className="px-4">
              <HistoryChart metric={metric} onMetric={setMetric} buckets={view.buckets} totals={view.totals} range={range} />
              {view.totals.tokens === 0 && <p className="text-sm text-muted-foreground">Niciun consum în această perioadă.</p>}
            </Card>
          </section>

          <section aria-labelledby="etape" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="etape" className="text-base font-semibold">
                Pe etape
              </h2>
              <span className="text-xs text-muted-foreground">{RANGES[range]} · procent din costul echivalent</span>
            </div>
            {view.stages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niciun consum în această perioadă.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {view.stages.map((s) => {
                  const active = stage?.etapa === s.etapa;
                  return (
                    <li key={s.etapa}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setStage(active ? null : { etapa: s.etapa, label: s.label })}
                        title={`${fmtTokens(s.tokens)} tokeni · ≈ ${fmtUsd(s.cost)}`}
                        className={cn(
                          "grid w-full grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3 rounded-md px-2 py-1.5 text-start text-sm hover:bg-muted sm:grid-cols-[minmax(0,12rem)_1fr_3rem_5rem_5.5rem]",
                          active && "bg-muted",
                        )}
                      >
                        <span className="truncate">{s.label}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-hidden>
                          <span className="block h-full rounded-full bg-foreground/60" style={{ width: `${Math.max(2, s.share)}%` }} />
                        </span>
                        <span className="text-right tabular-nums">{fmtPct(s.share)}</span>
                        <span className="hidden text-right text-muted-foreground tabular-nums sm:block">{fmtTokens(s.tokens)} tok</span>
                        <span className="hidden text-right text-muted-foreground tabular-nums sm:block">≈ {fmtUsd(s.cost)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section id="joburi" aria-labelledby="joburi-titlu" className="flex scroll-mt-[calc(var(--app-bar-h)+1.5rem)] flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="joburi-titlu" className="text-base font-semibold">
                Joburi
              </h2>
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={view.jobs.length === 0}>
                <IconDownload />
                Exportă CSV
              </Button>
            </div>
            <JobsTable jobs={view.jobs} now={now} stage={stage} onClearStage={() => setStage(null)} />
          </section>
        </>
      )}

      <p className="border-t pt-4 text-xs text-muted-foreground">
        Costul echivalent API este o estimare (USD) pe baza prețurilor publice per token. Abonamentul nu se facturează per token.
      </p>
    </div>
  );
}
