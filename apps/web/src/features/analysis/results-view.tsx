"use client";

import { fmtDate, plural } from "@lexai/core/labels";
import type { Finding } from "@lexai/core/types";
import { IconChartBar, IconChevronDown, IconCircleCheck, IconDots, IconRefresh } from "@tabler/icons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAnalysis } from "./context";
import { CoverageDialog } from "./coverage-dialog";
import { FindingDetail } from "./finding-detail";
import { stepSelection, suggestionViews } from "./model";
import { Elapsed, StopButton } from "./progress-view";
import { StartForm } from "./start-form";
import { STATUS_UI, StatusIcon } from "./status";
import { FOCUS_RING } from "./suggestion-view";
import {
  buildTriage,
  choiceFromKey,
  initialChoice,
  isTypingTarget,
  keyIntent,
  locatorOf,
  nextAfterRemoval,
  primaryAction,
  shortReference,
  evidenceOf,
  type GroupKey,
  type ResolvedKind,
  type SortMode,
  type Triage,
} from "./triage";

/**
 * Rezultatele analizei ca listă de triaj (docs/ux/08b-rezultate-analiza-revizie.md): rânduri de
 * o linie grupate pe stare, o singură constatare deschisă în loc, grupurile „Corecte”,
 * „Rezolvate” și „Ignorate”, tastele j / k / a / 1–9 / i / v / d / o / Esc.
 */

type GroupId = GroupKey | "corect" | "rezolvate" | "ignorate";

const rowId = (id: string) => `constatare-${id}`;
const detailId = (id: string) => `constatare-detalii-${id}`;
const restoreId = (id: string) => `restaureaza-${id}`;
const groupButtonId = (g: GroupId) => `grup-buton-${g}`;
const groupListId = (g: GroupId) => `grup-lista-${g}`;

const GROUP_LABEL: Record<GroupId, string> = {
  eroare_citare: STATUS_UI.eroare_citare.group,
  interpretare_discutabila: STATUS_UI.interpretare_discutabila.group,
  necesita_analiza_umana: STATUS_UI.necesita_analiza_umana.group,
  neverificat: STATUS_UI.neverificat.group,
  toate: "De rezolvat",
  corect: STATUS_UI.corect.group,
  rezolvate: "Rezolvate",
  ignorate: "Ignorate",
};

/** Conturul de focus al elementelor pe toată lățimea: în interior, ca să nu fie tăiat de listă. */
const ROW_FOCUS = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-strong";

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Focus pe rândul unei constatări după randare (rândul poate apărea abia după actualizarea listei). */
function focusRow(id: string) {
  requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(rowId(id))?.focus()));
}

function GroupHeader({ id, count, open, onToggle }: { id: GroupId; count: number; open: boolean; onToggle: () => void }) {
  return (
    <h3 className="sticky top-0 z-10 bg-background">
      <button
        type="button"
        id={groupButtonId(id)}
        aria-expanded={open}
        aria-controls={open ? groupListId(id) : undefined}
        aria-label={`${GROUP_LABEL[id]}, ${plural(count, "constatare", "constatări")}`}
        onClick={onToggle}
        className={cn("flex h-9 w-full items-center gap-2 px-4 text-start text-sm/5 font-semibold hover:bg-muted/60", ROW_FOCUS)}
      >
        <span>{GROUP_LABEL[id]}</span>
        <span className="font-normal text-fg-3 tabular-nums">{count}</span>
        <IconChevronDown aria-hidden className={cn("ms-auto size-4 text-fg-3 transition-transform duration-150 motion-reduce:transition-none", !open && "-rotate-90")} />
      </button>
    </h3>
  );
}

interface RowProps {
  f: Finding;
  active: boolean;
  /** „aplicată” / „verificată” în loc de locator (grupul „Rezolvate”) */
  resolved?: ResolvedKind;
  pending: boolean;
  leaving: boolean;
  locator: string | null;
  onToggle: () => void;
  children?: React.ReactNode;
}

function FindingRow({ f, active, resolved, pending, leaving, locator, onToggle, children }: RowProps) {
  const ref = shortReference(f);
  const ui = STATUS_UI[f.status];
  const right = pending ? "se reverifică" : resolved === "aplicata" ? "aplicată" : resolved === "verificata" ? "verificată" : locator;
  return (
    <li
      className={cn(
        "grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-150 ease-out motion-reduce:transition-none",
        leaving && "grid-rows-[0fr] opacity-0",
        active && "bg-muted shadow-[inset_2px_0_0_var(--foreground)] forced-colors:outline-2 forced-colors:-outline-offset-2 forced-colors:outline-solid dark:bg-accent",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <button
          type="button"
          id={rowId(f.id)}
          aria-expanded={active}
          aria-controls={active ? detailId(f.id) : undefined}
          aria-current={active ? "true" : undefined}
          aria-label={`${ui.label}: ${ref}${locator ? `, în ${locator}` : ""}${resolved ? `, ${right}` : ""}`}
          onClick={onToggle}
          className={cn("flex w-full scroll-mt-9 gap-3 px-4 text-start", active ? "min-h-10 items-start" : "h-10 items-center hover:bg-muted/60", ROW_FOCUS)}
        >
          <StatusIcon status={f.status} muted={Boolean(resolved)} className={cn(active && "mt-3")} />
          <span className={cn("min-w-0 flex-1 text-md/5 font-medium", resolved && "text-fg-2", active ? "py-2.5 wrap-break-word" : "truncate")}>{ref}</span>
          {right && <span className={cn("shrink-0 text-sm/5 text-fg-3 tabular-nums", active && "py-2.5")}>{right}</span>}
        </button>
        {active && (
          <div id={detailId(f.id)} role="region" aria-labelledby={rowId(f.id)} className="ps-11 pe-4 pt-1 pb-4">
            {children}
          </div>
        )}
      </div>
    </li>
  );
}

/** Starea goală sau „Ai parcurs toate constatările” (08b, 6.4–6.5). */
function DoneState({ triage, total, date }: { triage: Triage; total: number; date: string | null }) {
  const { applied, verified, ignored } = triage.progress;
  const allCorrect = !triage.resolved.length && !triage.ignored.length;
  const stats = [applied && `${applied} ${applied === 1 ? "aplicată" : "aplicate"}`, verified && `${verified} ${verified === 1 ? "verificată" : "verificate"}`, ignored && `${ignored} ${ignored === 1 ? "ignorată" : "ignorate"}`].filter(Boolean).join(" · ");
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-8 text-center" role="status">
      <IconCircleCheck aria-hidden className="mb-2 size-6 text-v-corect-fg" />
      <p className="text-base/[22px] font-semibold">{allCorrect ? "Nicio problemă găsită" : "Ai parcurs toate constatările"}</p>
      {allCorrect ? (
        <p className="text-md text-fg-2">
          {total === 1 ? "Trimiterea este corectă" : `Toate cele ${total} trimiteri sunt corecte`}
          {date ? ` în forma în vigoare la ${date}.` : "."}
        </p>
      ) : (
        <>
          <p className="text-md text-fg-2 tabular-nums">{stats}</p>
          {applied > 0 && <p className="text-md text-fg-2">Corecturile aplicate sunt deja în text; le poți anula din „Rezolvate” sau cu Cmd+Z.</p>}
        </>
      )}
    </div>
  );
}

/**
 * Lista constatărilor. Folosită și în timpul rulării (`live`: constatările sosesc pe rând,
 * aplicarea așteaptă sfârșitul analizei).
 */
export function FindingsList({ live, sort = "gravitate" }: { live?: boolean; sort?: SortMode }) {
  const a = useAnalysis();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Partial<Record<GroupId, boolean>>>({});
  const [chosen, setChosen] = useState<Record<string, number>>({});
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<ReadonlySet<string>>(() => new Set());

  const triage = useMemo(() => buildTriage(a.findings, a.ignoredFindings, a.actions, a.segOrder, sort), [a.findings, a.ignoredFindings, a.actions, a.segOrder, sort]);
  const selected = a.selectedId;
  const problemIds = useMemo(() => triage.problems.flatMap((g) => g.findings.map((f) => f.id)), [triage]);

  const contains = (list: readonly Finding[]) => selected !== null && list.some((f) => f.id === selected);
  const isOpen = (id: GroupId, list: readonly Finding[]) => {
    if (contains(list)) return true;
    if (id === "corect") return a.showCorrect;
    return open[id] ?? (id !== "rezolvate" && id !== "ignorate");
  };
  const toggleGroup = (id: GroupId, list: readonly Finding[]) => {
    const now = isOpen(id, list);
    if (now && contains(list)) a.select(null);
    if (id === "corect") a.setShowCorrect(!now);
    else setOpen((o) => ({ ...o, [id]: !now }));
  };

  const resolvedList = triage.resolved.map((r) => r.f);
  // constatările deschise cu j / k, în ordinea afișată
  const navIds = [
    ...triage.problems.flatMap((g) => (isOpen(g.key, g.findings) ? g.findings : [])),
    ...(isOpen("corect", triage.correct) ? triage.correct : []),
    ...(isOpen("rezolvate", resolvedList) ? resolvedList : []),
  ].map((f) => f.id);

  // selecția venită din document (clic pe evidențiere) aduce rândul în vizor
  useEffect(() => {
    if (selected) document.getElementById(rowId(selected))?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const choose = (id: string) => {
    if (selected === id) a.select(null);
    else a.select(id);
  };
  const move = (dir: 1 | -1) => {
    const next = stepSelection(navIds, selected, dir);
    if (!next) return;
    if (next !== selected) a.select(next);
    focusRow(next);
  };
  const close = () => {
    if (!selected) return;
    const id = selected;
    a.select(null);
    focusRow(id);
  };

  /** După „Aplică” / „Am verificat” / „Ignoră”: se deschide următoarea constatare, cu focus pe ea. */
  const advanceFrom = (id: string) => {
    const next = nextAfterRemoval(problemIds, id);
    if (next && next !== id) {
      a.select(next);
      focusRow(next);
    } else {
      a.select(null);
      requestAnimationFrame(() => listRef.current?.focus());
    }
  };
  const reopen = (id: string) => {
    a.select(id);
    focusRow(id);
  };
  const doApply = (f: Finding, index: number) => {
    if (a.apply(f, index, { onUndo: () => reopen(f.id) })) advanceFrom(f.id);
  };
  const doVerify = (f: Finding) => {
    a.verify(f, { onUndo: () => reopen(f.id) });
    advanceFrom(f.id);
  };
  const doIgnore = (f: Finding) => {
    if (problemIds.includes(f.id)) advanceFrom(f.id);
    const commit = () => a.ignore(f, { onUndo: () => reopen(f.id) });
    if (prefersReducedMotion()) return commit();
    setLeaving((s) => new Set(s).add(f.id));
    window.setTimeout(() => {
      commit();
      setLeaving((s) => {
        const n = new Set(s);
        n.delete(f.id);
        return n;
      });
    }, 150);
  };
  const doUndo = (f: Finding) => {
    a.undo(f);
    focusRow(f.id);
  };
  const doRestore = (f: Finding) => {
    const next = nextAfterRemoval(
      triage.ignored.map((x) => x.id),
      f.id,
    );
    a.restore(f);
    requestAnimationFrame(() => {
      const target = (next && document.getElementById(restoreId(next))) || document.getElementById(groupButtonId("ignorate")) || listRef.current;
      target?.focus();
    });
  };

  const selectedFinding = selected ? a.findings.find((f) => f.id === selected) : undefined;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.defaultPrevented) return;
    const t = e.target as HTMLElement;
    if (isTypingTarget(t)) return;
    const dialog = t.closest("[role=dialog]");
    if (dialog && !dialog.contains(rootRef.current)) return;
    const intent = keyIntent(e);
    if (!intent) return;
    if (intent.kind === "next" || intent.kind === "prev") {
      e.preventDefault();
      move(intent.kind === "next" ? 1 : -1);
      return;
    }
    const f = selectedFinding;
    if (!f) return;
    const action = a.actions[f.id];
    const resolved = action === "aplicata" || action === "verificata" ? action : null;
    const views = suggestionViews(f);
    const pick = chosen[f.id] ?? initialChoice(views);
    const primary = primaryAction(f, views, pick, { resolved: Boolean(resolved), running: a.running, canResolve: Boolean(a.shown) });
    const problem = f.status !== "corect" && !resolved;
    switch (intent.kind) {
      case "close":
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      case "apply":
        if (primary?.enabled && primary.kind !== "verificat" && pick !== null) {
          e.preventDefault();
          doApply(f, pick);
        }
        return;
      case "verify":
        if (problem && a.shown) {
          e.preventDefault();
          doVerify(f);
        }
        return;
      case "ignore":
        if (problem) {
          e.preventDefault();
          doIgnore(f);
        }
        return;
      case "details":
        e.preventDefault();
        setDetailsFor((d) => (d === f.id ? null : f.id));
        return;
      case "source": {
        const url = (evidenceOf(f).main ?? evidenceOf(f).rejected)?.evidence.url;
        if (url) {
          e.preventDefault();
          window.open(url, "_blank", "noopener,noreferrer");
        }
        return;
      }
      case "variant": {
        const index = choiceFromKey(e.key, views.length);
        if (index !== null && views.length > 1 && problem) {
          e.preventDefault();
          setChosen((c) => ({ ...c, [f.id]: views[index].index }));
        }
        return;
      }
    }
  };

  const renderRow = (f: Finding, resolved?: ResolvedKind) => {
    const active = f.id === selected;
    const views = active ? suggestionViews(f) : [];
    return (
      <FindingRow
        key={f.id}
        f={f}
        active={active}
        resolved={resolved}
        pending={a.pending.has(f.id)}
        leaving={leaving.has(f.id)}
        locator={locatorOf(f, a.locators)}
        onToggle={() => choose(f.id)}
      >
        {active && (
          <FindingDetail
            key={f.id}
            f={f}
            resolved={resolved ?? null}
            pending={a.pending.has(f.id)}
            chosen={chosen[f.id] ?? initialChoice(views)}
            onChoose={(i) => setChosen((c) => ({ ...c, [f.id]: i }))}
            detailsOpen={detailsFor === f.id}
            onDetailsChange={(o) => setDetailsFor(o ? f.id : null)}
            onApply={(i) => doApply(f, i)}
            onVerify={() => doVerify(f)}
            onIgnore={() => doIgnore(f)}
            onUndo={() => doUndo(f)}
          />
        )}
      </FindingRow>
    );
  };

  const total = a.findings.length + a.ignoredFindings.length;
  const date = a.shown ? fmtDate(a.shown.dataReferinta) : null;
  const done = !live && a.shown && triage.problems.length === 0 && total > 0;

  return (
    <div ref={rootRef} className="@container flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
      <div ref={listRef} tabIndex={-1} role="region" aria-label="Constatări" className="min-h-0 flex-1 overflow-y-auto outline-none">
        {total === 0 ? (
          <p className="px-4 py-8 text-center text-md text-fg-2">{live ? "Constatările apar aici pe măsură ce sunt verificate." : "Nu am găsit trimiteri la legislație în acest document."}</p>
        ) : (
          <>
            {triage.problems.map((g, i) => {
              const isOpenGroup = isOpen(g.key, g.findings);
              return (
                <section key={g.key} className={cn(i > 0 && "mt-2 border-t border-divider")}>
                  <GroupHeader id={g.key} count={g.findings.length} open={isOpenGroup} onToggle={() => toggleGroup(g.key, g.findings)} />
                  {isOpenGroup && <ul id={groupListId(g.key)}>{g.findings.map((f) => renderRow(f))}</ul>}
                </section>
              );
            })}
            {live && triage.problems.length === 0 && <p className="px-4 py-6 text-center text-md text-fg-2">Constatările apar aici pe măsură ce sunt verificate.</p>}
            {done && <DoneState triage={triage} total={a.findings.length} date={date} />}

            {triage.correct.length > 0 && (
              <section className={cn((triage.problems.length > 0 || done) && "mt-2 border-t border-divider")}>
                <GroupHeader id="corect" count={triage.correct.length} open={isOpen("corect", triage.correct)} onToggle={() => toggleGroup("corect", triage.correct)} />
                {isOpen("corect", triage.correct) && <ul id={groupListId("corect")}>{triage.correct.map((f) => renderRow(f))}</ul>}
              </section>
            )}

            {(triage.resolved.length > 0 || triage.ignored.length > 0) && (
              <div className="mt-2 border-t border-divider">
                {triage.resolved.length > 0 && (
                  <section>
                    <GroupHeader id="rezolvate" count={triage.resolved.length} open={isOpen("rezolvate", resolvedList)} onToggle={() => toggleGroup("rezolvate", resolvedList)} />
                    {isOpen("rezolvate", resolvedList) && <ul id={groupListId("rezolvate")}>{triage.resolved.map((r) => renderRow(r.f, r.kind))}</ul>}
                  </section>
                )}
                {triage.ignored.length > 0 && (
                  <section>
                    <GroupHeader id="ignorate" count={triage.ignored.length} open={isOpen("ignorate", triage.ignored)} onToggle={() => toggleGroup("ignorate", triage.ignored)} />
                    {isOpen("ignorate", triage.ignored) && (
                      <ul id={groupListId("ignorate")}>
                        {triage.ignored.map((f) => {
                          const ref = shortReference(f);
                          return (
                            <li key={f.id} className="flex h-10 items-center gap-3 ps-4 pe-2">
                              <StatusIcon status={f.status} muted />
                              <span className="sr-only">{STATUS_UI[f.status].label}: </span>
                              <span className="min-w-0 flex-1 truncate text-md/5 text-fg-2">{ref}</span>
                              <Button id={restoreId(f.id)} variant="ghost" size="sm" className={FOCUS_RING} aria-label={`Restaurează ${ref}`} onClick={() => doRestore(f)}>
                                Restaurează
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                )}
              </div>
            )}
          </>
        )}
        <p className="mt-6 mb-4 px-4 text-sm/5 text-fg-3">Verificare automată pe textul oficial. Decizia finală îți aparține.</p>
      </div>
    </div>
  );
}

/** Antetul (64 px): „Rezultate”, „2 din 6 rezolvate”, meniul `⋯`, data legislației. */
function ResultsHeader({ sort, onSort, onCoverage }: { sort: SortMode; onSort: (s: SortMode) => void; onCoverage: () => void }) {
  const a = useAnalysis();
  const shown = a.shown!;
  const { progress } = useMemo(() => buildTriage(a.findings, a.ignoredFindings, a.actions), [a.findings, a.ignoredFindings, a.actions]);
  return (
    <header className="flex h-16 shrink-0 flex-col justify-center border-b border-divider px-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base/[22px] font-semibold">Rezultate</h2>
        <p aria-live="polite" className="ms-auto text-sm/[18px] text-fg-2 tabular-nums">
          {progress.total > 0 ? `${progress.done} din ${progress.total} rezolvate` : ""}
        </p>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className={cn("-me-2", FOCUS_RING)} aria-label="Opțiunile rezultatelor" />} />}>
              <IconDots />
            </TooltipTrigger>
            <TooltipContent>Opțiunile rezultatelor</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem disabled={a.running} onClick={() => a.setStartOpen(true)}>
              <IconRefresh />
              Reverifică documentul
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCoverage}>
              <IconChartBar />
              Acoperirea analizei
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Ordine</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => onSort(v as SortMode)}>
              <DropdownMenuRadioItem value="gravitate">Ordonează după gravitate</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="document">Ordonează ca în document</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-sm/[18px] text-fg-2">Legislația în vigoare la {fmtDate(shown.dataReferinta)}</p>
    </header>
  );
}

/** Benzile condiționate de sub antet: reverificarea în curs, formularul de analiză nouă, paragrafele modificate. */
function Banners() {
  const a = useAnalysis();
  const latest = a.latest;
  const n = a.changedSegIds.length;
  return (
    <>
      {a.runningOverShown && latest && (
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-divider bg-muted px-4 text-sm/5" role="status">
          <Spinner className="size-4" label="În curs" />
          <span className="min-w-0 flex-1 truncate font-medium">{latest.recheckSegIds ? `Reverific ${plural(latest.recheckSegIds.length, "paragraf", "paragrafe")}…` : "Reiau analiza…"}</span>
          <Elapsed from={latest.job?.startedAt ?? null} />
          <StopButton compact />
        </div>
      )}
      {a.startOpen && !a.running && (
        <div className="shrink-0 border-b border-divider p-4">
          <StartForm onCancel={() => a.setStartOpen(false)} />
        </div>
      )}
      {!a.running && n > 0 && (
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-divider bg-muted ps-4 pe-2 text-sm/5">
          <span className="min-w-0 flex-1 truncate">{n === 1 ? "Un paragraf modificat după analiză." : `${plural(n, "paragraf modificat", "paragrafe modificate")} după analiză.`}</span>
          <Button variant="ghost" size="sm" className={FOCUS_RING} onClick={() => void a.recheck()} disabled={a.busy !== null} aria-busy={a.busy === "start"}>
            {a.busy === "start" ? <Spinner className="size-4" label="Se pornește" /> : <IconRefresh />}
            Reverifică
          </Button>
        </div>
      )}
    </>
  );
}

export function ResultsView() {
  const [sort, setSort] = useState<SortMode>("gravitate");
  const [coverage, setCoverage] = useState(false);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <ResultsHeader sort={sort} onSort={setSort} onCoverage={() => setCoverage(true)} />
      <Banners />
      <FindingsList sort={sort} />
      <CoverageDialog open={coverage} onOpenChange={setCoverage} />
    </div>
  );
}
