"use client";

import { CATEGORY_LABELS, EVIDENCE_LABELS, STATUS_META, UNVERIFIED_LABELS, fmtDate } from "@lexai/core/labels";
import type { Finding, FindingEvidence } from "@lexai/core/types";
import { IconAlertTriangle, IconChevronDown, IconCopy, IconDots, IconExternalLink, IconSquareCheck } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAnalysis } from "./context";
import { suggestionViews } from "./model";
import { STATUS_UI, StatusIcon } from "./status";
import { FOCUS_RING, SuggestionBlock } from "./suggestion-view";
import { clipQuote, conclusionOf, evidenceOf, explanationOf, primaryAction, sourceName, todayDiffers, type ResolvedKind } from "./triage";

/**
 * Constatarea deschisă (docs/ux/08b, 4.3): concluzie, explicație, „Ce lipsește”, verdictul de
 * azi când diferă, textul legii cu linia sursei, corectura sau variantele, rândul de acțiuni și
 * „Detalii” (închis implicit). Fără casete: doar bara citatului și cardurile de variantă.
 */

const EXPLANATION_CLAMP = 340;
const PORTAL = "https://legislatie.just.ro/";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Citatul a fost copiat.");
  } catch {
    toast.error("Browserul nu permite copierea.");
  }
}

function linkText(e: FindingEvidence["evidence"]): string {
  return e.type === "decizie" ? "Deschide decizia" : "Deschide textul";
}

/** „Portal Legislativ · Deschide textul ↗”; actul doar dacă e altul decât cel din trimitere, data doar dacă diferă. */
function SourceLine({ d, f, headerDate, sources }: { d: FindingEvidence; f: Finding; headerDate: string; sources?: { id: string; label: string }[] }) {
  const e = d.evidence;
  const parts: string[] = [];
  if (e.act && (!f.act || e.act.baseId !== f.act.baseId)) parts.push(`${e.act.titlu}${e.unitate ? `, ${e.unitate}` : ""}`);
  parts.push(sourceName(e.url, sources?.find((s) => s.id === e.sourceId)?.label));
  if (e.dataReferinta && e.dataReferinta.slice(0, 10) !== headerDate.slice(0, 10)) parts.push(`forma la ${fmtDate(e.dataReferinta)}`);
  return (
    <p className="text-sm/5 text-fg-2">
      {parts.join(" · ")}
      {e.url && (
        <>
          {" · "}
          <a href={e.url} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 rounded-sm text-foreground underline-offset-2 outline-none hover:underline", FOCUS_RING)}>
            {linkText(e)}
            <IconExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(se deschide într-o filă nouă)</span>
          </a>
        </>
      )}
    </p>
  );
}

function Explanation({ text }: { text: string }) {
  const [full, setFull] = useState(false);
  const long = text.length > EXPLANATION_CLAMP;
  return (
    <div className="flex flex-col items-start gap-1">
      <p className={cn("text-md wrap-break-word", long && !full && "line-clamp-6")}>{text}</p>
      {long && (
        <button type="button" className={cn("rounded-sm text-sm/5 text-fg-2 underline underline-offset-2 outline-none hover:text-foreground", FOCUS_RING)} aria-expanded={full} onClick={() => setFull((v) => !v)}>
          {full ? "Mai puțin" : "Mai mult"}
        </button>
      )}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 ps-5 text-md marker:text-fg-3">
      {items.map((x, i) => (
        <li key={i}>{x}</li>
      ))}
    </ul>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h5 className="text-sm/5 font-semibold text-fg-2">{title}</h5>
      {children}
    </section>
  );
}

/** Conținutul „Detalii”: ipoteze, excepții, evenimente, afirmația, textul complet, alte surse, verificarea automată, categoria. */
function DetailsBody({ f, headerDate, sources }: { f: Finding; headerDate: string; sources?: { id: string; label: string }[] }) {
  const [fullText, setFullText] = useState(false);
  const { main, others } = evidenceOf(f);
  const articleText = main?.evidence.text?.trim();
  const showFull = Boolean(articleText && articleText !== main?.fragment.trim());
  const notLocated = f.anchors.length > 0 && f.anchors.every((x) => x.potrivire === "negasita");
  return (
    <div className="flex flex-col gap-3">
      {f.ipoteze?.length ? (
        <DetailSection title="Ipoteze">
          <Bullets items={f.ipoteze} />
        </DetailSection>
      ) : null}
      {f.exceptii?.length ? (
        <DetailSection title="Excepții și condiții">
          <Bullets items={f.exceptii} />
        </DetailSection>
      ) : null}
      {f.evenimente?.length ? (
        <DetailSection title="Evenimente legislative">
          <Bullets items={f.evenimente} />
        </DetailSection>
      ) : null}
      {f.afirmatie?.trim() ? (
        <DetailSection title="Afirmația verificată">
          <p className="text-md">{f.afirmatie}</p>
        </DetailSection>
      ) : null}
      {showFull && (
        <section className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            className={cn("inline-flex items-center gap-1 rounded-sm text-sm/5 font-semibold text-fg-2 outline-none hover:text-foreground", FOCUS_RING)}
            aria-expanded={fullText}
            onClick={() => setFullText((v) => !v)}
          >
            Textul complet al articolului
            <IconChevronDown aria-hidden className={cn("size-4 transition-transform duration-150 motion-reduce:transition-none", fullText && "rotate-180")} />
          </button>
          {fullText && <p className="max-h-80 overflow-auto border-s-2 border-divider ps-3 font-serif text-base/6 whitespace-pre-wrap">{articleText}</p>}
        </section>
      )}
      {others.length > 0 && (
        <DetailSection title={`Alte surse (${others.length})`}>
          <ul className="flex flex-col gap-1">
            {others.map((d, i) => (
              <li key={`${d.evidence.id}-${i}`} className="flex flex-col">
                <span className="text-md">
                  {d.evidence.act?.titlu ?? EVIDENCE_LABELS[d.evidence.type]}
                  {d.evidence.unitate ? `, ${d.evidence.unitate}` : ""}
                  {d.validare === "respinsa" ? " — citat negăsit în textul oficial" : ""}
                </span>
                <SourceLine d={d} f={{ ...f, act: undefined }} headerDate={headerDate} sources={sources} />
              </li>
            ))}
          </ul>
        </DetailSection>
      )}
      <DetailSection title="Verificare automată">
        <p className="text-md">
          {main ? "Citatul a fost regăsit în textul oficial." : f.dovezi.length ? "Citatul nu a fost regăsit în textul oficial." : "Nicio dovadă din sursa oficială; verdictul nu poate fi pozitiv."}
        </p>
        {f.retrogradat && (
          <p className="text-md">
            Verdict retrogradat (propus inițial: {STATUS_META[f.retrogradat.de].label}): {f.retrogradat.motiv}
          </p>
        )}
        {notLocated && <p className="text-md">Pasajul nu a putut fi localizat exact în document.</p>}
      </DetailSection>
      {(f.categorie || f.tipNeverificare) && (
        <p className="text-sm/5 text-fg-2">
          {[f.categorie && `Categorie: ${CATEGORY_LABELS[f.categorie]}`, f.tipNeverificare && `Motiv: ${UNVERIFIED_LABELS[f.tipNeverificare]}`].filter(Boolean).join(" · ")}
        </p>
      )}
      {f.preluatDin && <p className="text-sm/5 text-fg-2">Preluat de la o trimitere identică.</p>}
    </div>
  );
}

function KeyTip({ label, k }: { label: string; k: string }) {
  return (
    <TooltipContent className="flex items-center gap-1.5">
      {label} <Kbd keys={k} />
    </TooltipContent>
  );
}

export interface FindingDetailProps {
  f: Finding;
  /** constatarea e rezolvată (aplicată / verificată) */
  resolved: ResolvedKind | null;
  pending: boolean;
  chosen: number | null;
  onChoose: (index: number) => void;
  detailsOpen: boolean;
  onDetailsChange: (open: boolean) => void;
  onApply: (index: number) => void;
  onVerify: () => void;
  onIgnore: () => void;
  onUndo: () => void;
}

export function FindingDetail({ f, resolved, pending, chosen, onChoose, detailsOpen, onDetailsChange, onApply, onVerify, onIgnore, onUndo }: FindingDetailProps) {
  const a = useAnalysis();
  const headerDate = a.shown?.dataReferinta ?? a.latest?.dataReferinta ?? "";
  const sources = a.shown?.result.surseActive;
  const views = suggestionViews(f);
  const appliedIndex = resolved === "aplicata" ? (a.appliedSuggestion[f.id] ?? 0) : null;
  const primary = primaryAction(f, views, chosen, { resolved: Boolean(resolved), running: a.running, canResolve: Boolean(a.shown) });
  const conclusion = conclusionOf(f);
  const explanation = explanationOf(f);
  const today = todayDiffers(f);
  const { main, rejected } = evidenceOf(f);
  const anchorSeg = f.anchors.find((x) => x.potrivire !== "negasita")?.segmentId ?? f.anchors[0]?.segmentId;
  const segText = anchorSeg ? a.segTexts.get(anchorSeg) : undefined;
  const applyError = a.applyErrors[f.id];
  const sourceUrl = (main ?? rejected)?.evidence.url;
  const copyText = main?.fragment || f.citat;
  const problem = f.status !== "corect";

  const primaryLabel = primary?.kind === "aplica" ? "Aplică" : primary?.kind === "aplica-varianta" ? "Aplică varianta" : "Am verificat";
  const runPrimary = () => {
    if (!primary?.enabled) return;
    if (primary.kind === "verificat") onVerify();
    else if (primary.kind === "aplica") onApply(views[0].index);
    else if (chosen !== null) onApply(chosen);
  };

  return (
    <Collapsible open={detailsOpen} onOpenChange={onDetailsChange} className="flex flex-col gap-4">
      {conclusion && <p className="text-base/[22px] font-semibold text-balance">{conclusion}</p>}
      {pending && <p className="text-sm/5 text-fg-2">Paragraful se reverifică; rezultatul se poate schimba.</p>}
      {explanation && <Explanation text={explanation} />}

      {f.status === "necesita_analiza_umana" && f.informatiiLipsa?.length ? (
        <section className="flex flex-col gap-1.5">
          <h4 className="text-sm/5 font-semibold text-fg-2">Ce lipsește</h4>
          <Bullets items={f.informatiiLipsa.slice(0, 3)} />
        </section>
      ) : null}

      {today && (
        <p className="flex items-start gap-2 text-md">
          <StatusIcon status={today} className="mt-[3px]" />
          <span>
            Astăzi: {STATUS_UI[today].label} — textul s-a modificat după {fmtDate(headerDate)}.
          </span>
        </p>
      )}

      {main ? (
        <figure className="flex flex-col gap-1.5">
          <blockquote className="border-s-2 border-divider ps-3 font-serif text-base/6 wrap-break-word">„{clipQuote(main.fragment)}”</blockquote>
          <figcaption>
            <SourceLine d={main} f={f} headerDate={headerDate} sources={sources} />
          </figcaption>
        </figure>
      ) : rejected ? (
        <p className="text-sm/5 text-fg-2">
          Citatul nu a fost regăsit în textul oficial.
          {rejected.evidence.url && (
            <>
              {" "}
              <a href={rejected.evidence.url} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 rounded-sm text-foreground underline-offset-2 outline-none hover:underline", FOCUS_RING)}>
                Deschide sursa
                <IconExternalLink aria-hidden className="size-3.5" />
                <span className="sr-only">(se deschide într-o filă nouă)</span>
              </a>
            </>
          )}
        </p>
      ) : null}

      {problem && <SuggestionBlock f={f} views={views} chosen={chosen} onChoose={onChoose} applied={appliedIndex} segText={segText} locators={a.locators} />}

      {applyError && (
        <p className="flex items-start gap-2 text-md" role="alert">
          <IconAlertTriangle aria-hidden className="mt-[3px] size-4 shrink-0 text-v-discutabil-fg" />
          <span>
            {applyError}
            {a.changedSegIds.length > 0 && !a.running && (
              <>
                {" "}
                <button type="button" className={cn("rounded-sm underline underline-offset-2 outline-none", FOCUS_RING)} onClick={() => void a.recheck()}>
                  Reverifică
                </button>
              </>
            )}
          </span>
        </p>
      )}

      {primary?.kind === "aplica-varianta" && chosen === null && <p className="-mb-2 text-sm/5 text-fg-2">Alege situația care se potrivește documentului.</p>}

      <div className="flex min-w-0 items-center gap-2 @max-sm:gap-1">
        {primary && (
          <Tooltip>
            <TooltipTrigger render={<Button size="sm" className={FOCUS_RING} disabled={!primary.enabled} onClick={runPrimary} />}>{primaryLabel}</TooltipTrigger>
            <KeyTip label={primary.kind === "verificat" ? "Marchează ca verificată" : "Aplică în document"} k={primary.kind === "verificat" ? "v" : "a"} />
          </Tooltip>
        )}
        {problem && !resolved && (
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="sm" className={FOCUS_RING} onClick={onIgnore} />}>Ignoră</TooltipTrigger>
            <KeyTip label="Ignoră constatarea" k="i" />
          </Tooltip>
        )}
        {resolved && (
          <Button variant="outline" size="sm" className={FOCUS_RING} onClick={onUndo}>
            Anulează
          </Button>
        )}
        <span className="ms-auto flex shrink-0 items-center gap-2 @max-sm:gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <CollapsibleTrigger
                  render={<Button variant="ghost" size="sm" className={cn("@max-sm:px-2", FOCUS_RING)} aria-label="Detalii" />}
                />
              }
            >
              <span className="@max-sm:sr-only">Detalii</span>
              <IconChevronDown aria-hidden className={cn("transition-transform duration-150 motion-reduce:transition-none", detailsOpen && "rotate-180")} />
            </TooltipTrigger>
            <KeyTip label="Detalii" k="d" />
          </Tooltip>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className={FOCUS_RING} aria-label="Mai multe acțiuni" />} />}>
                <IconDots />
              </TooltipTrigger>
              <TooltipContent>Mai multe acțiuni</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => void copy(copyText)}>
                <IconCopy />
                Copiază citatul
              </DropdownMenuItem>
              {sourceUrl ? (
                <DropdownMenuItem render={<a href={sourceUrl} target="_blank" rel="noreferrer" />}>
                  <IconExternalLink />
                  Deschide sursa
                </DropdownMenuItem>
              ) : f.status === "neverificat" ? (
                <DropdownMenuItem render={<a href={PORTAL} target="_blank" rel="noreferrer" />}>
                  <IconExternalLink />
                  Deschide Portal Legislativ
                </DropdownMenuItem>
              ) : null}
              {problem && !resolved && primary && primary.kind !== "verificat" && (
                <DropdownMenuItem onClick={onVerify}>
                  <IconSquareCheck />
                  Marchează verificat
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </span>
      </div>

      <CollapsibleContent>
        <DetailsBody f={f} headerDate={headerDate} sources={sources} />
      </CollapsibleContent>
    </Collapsible>
  );
}
