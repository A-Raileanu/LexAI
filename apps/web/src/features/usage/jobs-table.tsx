"use client";

import { IconArrowRight, IconSearch } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fullDate, relativeTime } from "@/lib/format";
import { foldDiacritics } from "@/lib/text";
import { JOB_KIND_LABELS, JOB_STATUS_LABELS, fmtDuration, fmtPct, fmtTokens, fmtUsd, type JobUsage } from "./aggregate";

const PAGE = 20;

const STATUS_VARIANT: Record<string, BadgeProps["variant"]> = {
  finalizat: "success",
  esuat: "destructive",
  in_curs: "info",
  in_asteptare: "warning",
  intrerupt: "warning",
};

export function jobTitle(j: JobUsage): string {
  const kind = JOB_KIND_LABELS[j.job.kind] ?? j.job.kind;
  return j.job.documentTitle ? `${kind} · ${j.job.documentTitle}` : kind;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "default"} appearance={STATUS_VARIANT[status] ? "outline" : "muted"} shape="pill">
      {JOB_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

function docHref(j: JobUsage): string | null {
  return j.job.projectId && j.job.documentId ? `/proiecte/${j.job.projectId}/documente/${j.job.documentId}` : null;
}

export function JobsTable({ jobs, now, stage, onClearStage }: { jobs: JobUsage[]; now: number; stage: { etapa: string; label: string } | null; onClearStage: () => void }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<string>("toate");
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState<JobUsage | null>(null);

  const kinds = [...new Set(jobs.map((j) => j.job.kind))];
  const f = foldDiacritics(q);
  const rows = jobs.filter(
    (j) =>
      (kind === "toate" || j.job.kind === kind) &&
      (!stage || j.stages.some((s) => s.etapa === stage.etapa)) &&
      (!f || foldDiacritics(`${jobTitle(j)} ${j.job.projectName ?? ""}`).includes(f)),
  );
  const shown = rows.slice(0, limit);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput placeholder="Caută document sau proiect" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Caută în joburi" />
        </InputGroup>
        <Select value={kind} onValueChange={(v) => setKind((v as string) ?? "toate")}>
          <SelectTrigger size="sm" className="w-40" aria-label="Tipul jobului">
            <SelectValue>{(v: string) => (v === "toate" ? "Toate tipurile" : (JOB_KIND_LABELS[v] ?? v))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="toate">Toate tipurile</SelectItem>
            {kinds.map((k) => (
              <SelectItem key={k} value={k}>
                {JOB_KIND_LABELS[k] ?? k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stage && (
          <Badge shape="pill" appearance="outline" className="h-7 gap-1 ps-2.5">
            Etapa: {stage.label}
            <button type="button" onClick={onClearStage} className="ms-1 rounded-full px-1 text-muted-foreground hover:text-foreground" aria-label="Elimină filtrul de etapă">
              ×
            </button>
          </Badge>
        )}
      </div>

      {rows.length === 0 ? (
        <Empty size="sm" className="rounded-lg border">
          <EmptyHeader>
            <EmptyTitle>Niciun job pentru filtrele alese</EmptyTitle>
            <EmptyDescription>Schimbă perioada, tipul sau căutarea.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead className="hidden xl:table-cell">Proiect</TableHead>
                  <TableHead className="text-right">Durată</TableHead>
                  <TableHead className="text-right">Tokeni</TableHead>
                  <TableHead className="text-right">Cost echiv. API</TableHead>
                  <TableHead>Stare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shown.map((j) => (
                  <TableRow key={j.job.id} className="cursor-pointer" onClick={() => setOpen(j)}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger render={<span />}>{relativeTime(j.t, now)}</TooltipTrigger>
                        <TooltipContent>{fullDate(j.t)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="max-w-72">
                      <button
                        type="button"
                        className="w-full truncate text-start font-medium hover:underline focus-visible:underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(j);
                        }}
                      >
                        {jobTitle(j)}
                      </button>
                    </TableCell>
                    <TableCell className="hidden max-w-48 truncate text-muted-foreground xl:table-cell">{j.job.projectName ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">{j.durationMs === null ? "—" : fmtDuration(j.durationMs)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Tooltip>
                        <TooltipTrigger render={<span />}>{fmtTokens(j.tokens)}</TooltipTrigger>
                        <TooltipContent>
                          in {fmtTokens(j.input)} · out {fmtTokens(j.output)} · cache {fmtTokens(j.cache)}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">≈ {fmtUsd(j.cost)}</TableCell>
                    <TableCell>
                      <StatusBadge status={j.job.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="flex flex-col divide-y rounded-lg border lg:hidden">
            {shown.map((j) => (
              <li key={j.job.id}>
                <button type="button" onClick={() => setOpen(j)} className="flex w-full items-center gap-3 px-3 py-2.5 text-start hover:bg-muted/50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{jobTitle(j)}</span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {[j.job.projectName, relativeTime(j.t, now), `${fmtTokens(j.tokens)} tok`, `≈ ${fmtUsd(j.cost)}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <StatusBadge status={j.job.status} />
                </button>
              </li>
            ))}
          </ul>

          {rows.length > limit && (
            <Button variant="outline" size="sm" className="self-center" onClick={() => setLimit((l) => l + PAGE)}>
              Arată mai multe ({rows.length - limit})
            </Button>
          )}
        </>
      )}

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle>{jobTitle(open)}</SheetTitle>
                <SheetDescription>
                  {[open.job.projectName, fullDate(open.t)].filter(Boolean).join(" · ")}
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={open.job.status} />
                  {open.durationMs !== null && <span className="text-sm text-muted-foreground">durată {fmtDuration(open.durationMs)}</span>}
                </div>
                <p className="text-sm">
                  Total: <span className="font-medium tabular-nums">{fmtTokens(open.tokens)} tokeni</span>{" "}
                  <span className="text-muted-foreground tabular-nums">
                    (in {fmtTokens(open.input)} · out {fmtTokens(open.output)} · cache {fmtTokens(open.cache)})
                  </span>{" "}
                  · <span className="tabular-nums">≈ {fmtUsd(open.cost)}</span> echivalent API
                </p>
                <section>
                  <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Etape</h3>
                  <ul className="flex flex-col gap-3">
                    {open.stages.map((s) => (
                      <li key={s.etapa}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span>{s.label}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {fmtTokens(s.tokens)} tok · ≈ {fmtUsd(s.cost)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/10" aria-label={`${s.label}: ${fmtPct(s.share)}`} role="img">
                          <div className="h-full rounded-full bg-foreground/60" style={{ width: `${Math.max(2, s.share)}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
                {docHref(open) && (
                  <Link href={docHref(open)!} className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}>
                    Deschide documentul
                    <IconArrowRight />
                  </Link>
                )}
              </SheetBody>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
