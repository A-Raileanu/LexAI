"use client";

import type { Finding } from "@lexai/core/types";
import { IconCheck } from "@tabler/icons-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { suggestionMissing, type SuggestionView } from "./model";
import { suggestionDiff, variantKind, type DiffPart } from "./triage";

/**
 * Corectura și variantele ei (docs/ux/08b, 4.6 și 5.8): diff la nivel de cuvânt (șters tăiat,
 * adăugat subliniat), o singură corectură sau variante pe situații ca `RadioGroup` cu carduri,
 * fără variantă preselectată.
 */

export const FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-focus-strong";
const VISIBLE_VARIANTS = 3;

export const DEL = "bg-v-eroare-bg text-v-eroare-fg line-through decoration-1 shadow-[2px_0_0_var(--v-eroare-bg),-2px_0_0_var(--v-eroare-bg)] rounded-[2px] box-decoration-clone";
export const INS = "bg-v-corect-bg text-v-corect-fg underline decoration-1 underline-offset-2 shadow-[2px_0_0_var(--v-corect-bg),-2px_0_0_var(--v-corect-bg)] rounded-[2px] box-decoration-clone";

/**
 * Diff-ul inline (08b, 5.8): șters tăiat, adăugat subliniat, cu prefixe `sr-only`. Spațiile de la
 * capetele unei schimbări se scriu în afara marcajului, iar fundalul se lărgește cu o umbră (nu cu
 * padding), ca să nu apară goluri înaintea punctuației.
 */
export function Diff({ parts, className }: { parts: DiffPart[]; className?: string }) {
  return (
    <p className={cn("font-serif text-base/6 wrap-break-word text-foreground", className)}>
      {parts.map((p, i) => {
        if (p.kind === "same") return <span key={i}>{p.text}</span>;
        const [, lead, core, trail] = p.text.match(/^(\s*)([\s\S]*?)(\s*)$/) ?? ["", "", p.text, ""];
        if (!core) return <span key={i}>{p.kind === "ins" ? p.text : ""}</span>;
        return (
          <span key={i}>
            {lead}
            {p.kind === "del" ? (
              <del className={DEL}>
                <span className="sr-only">șters: </span>
                {core}
              </del>
            ) : (
              <ins className={INS}>
                <span className="sr-only">adăugat: </span>
                {core}
              </ins>
            )}
            {trail}
            {/* șters lipit de adăugat: un spațiu vizual între ele („999 72”, nu „99972”) */}
            {p.kind === "del" && !trail && parts[i + 1]?.kind === "ins" && !/^\s/.test(parts[i + 1].text) && <span aria-hidden> </span>}
          </span>
        );
      })}
    </p>
  );
}

/** Corpul unei variante: diff, „Textul rămâne neschimbat” sau textul de adăugat manual. */
function VariantBody({ v, segText }: { v: SuggestionView; segText?: string }) {
  const kind = variantKind(v.suggestion);
  if (kind === "pastrare") return <p className="text-md text-fg-2">Textul rămâne neschimbat</p>;
  if (kind === "manual") {
    return (
      <>
        <p className="font-serif text-base/6 wrap-break-word">{v.suggestion.textPropus}</p>
        <p className="text-sm/5 text-fg-2">Textul nu înlocuiește un pasaj existent; se adaugă manual.</p>
      </>
    );
  }
  return (
    <>
      <Diff parts={suggestionDiff(v.suggestion, segText)} />
      {kind === "eliminare" && <p className="text-sm/5 text-fg-2">Pasajul se elimină din document.</p>}
    </>
  );
}

function AppliedMark({ verb = "Aplicată" }: { verb?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm/5 font-medium text-v-corect-fg">
      <IconCheck aria-hidden className="size-4" />
      {verb}
    </span>
  );
}

/** „Afectează și: Art. 7, Art. 12.” — link-urile derulează documentul la paragraf. */
function Impact({ impact, locators }: { impact: SuggestionView["suggestion"]["impact"]; locators: ReadonlyMap<string, string> }) {
  if (!impact.length) return null;
  // un link pe loc („Art. 2”), chiar dacă sunt mai multe paragrafe afectate în același articol
  const seen = new Set<string>();
  const items = impact.filter((x) => {
    const key = locators.get(x.segmentId) ?? x.segmentId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <p className="text-sm/5 text-fg-2">
      Afectează și:{" "}
      {items.map((x, i) => (
        <span key={x.segmentId}>
          <button
            type="button"
            title={x.descriere}
            className={cn("rounded-sm text-foreground underline underline-offset-2 outline-none", FOCUS_RING)}
            onClick={() => document.querySelector(`.ProseMirror [data-seg-id="${CSS.escape(x.segmentId)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" })}
          >
            {locators.get(x.segmentId) ?? "alt paragraf"}
          </button>
          {i < items.length - 1 ? ", " : "."}
        </span>
      ))}
    </p>
  );
}

interface Props {
  f: Finding;
  views: SuggestionView[];
  /** varianta aleasă (≥ 2 variante); null = încă nealeasă */
  chosen: number | null;
  onChoose: (index: number) => void;
  /** indicele variantei aplicate, dacă a fost aplicată */
  applied: number | null;
  segText?: string;
  locators: ReadonlyMap<string, string>;
}

export function SuggestionBlock({ f, views, chosen, onChoose, applied, segText, locators }: Props) {
  const labelId = useId();
  const [showAll, setShowAll] = useState(false);

  if (!views.length) {
    if (!suggestionMissing(f)) return null;
    return (
      <section className="flex flex-col gap-1.5" aria-labelledby={labelId}>
        <h4 id={labelId} className="text-sm/5 font-semibold text-fg-2">
          Corectură
        </h4>
        <p className="text-md text-fg-2">Nu avem o corectură verificată pentru acest pasaj. Textul de înlocuire trebuie redactat de un jurist.</p>
      </section>
    );
  }

  const label = views[0].suggestion.tip === "propunere_de_revizuit" ? "Reformulare propusă" : "Corectură";

  if (views.length === 1) {
    const v = views[0];
    return (
      <section className="flex flex-col gap-1.5" aria-labelledby={labelId}>
        <h4 id={labelId} className="flex items-center gap-2 text-sm/5 font-semibold text-fg-2">
          {label}
          {applied !== null && <AppliedMark />}
        </h4>
        <VariantBody v={v} segText={segText} />
        <Impact impact={v.suggestion.impact} locators={locators} />
      </section>
    );
  }

  const selected = applied ?? chosen;
  const reveal = showAll || (selected !== null && views.findIndex((v) => v.index === selected) >= VISIBLE_VARIANTS);
  const visible = reveal ? views : views.slice(0, VISIBLE_VARIANTS);
  const hidden = views.length - visible.length;
  const impact = views.find((v) => v.index === selected)?.suggestion.impact ?? [];

  return (
    <section className="flex flex-col gap-1.5" aria-labelledby={labelId}>
      <h4 id={labelId} className="text-sm/5 font-semibold text-fg-2">
        Alege varianta potrivită ({views.length})
      </h4>
      <RadioGroup<number | null>
        variant="card"
        aria-labelledby={labelId}
        value={selected}
        onValueChange={(v) => v !== null && onChoose(v)}
        readOnly={applied !== null}
        className="gap-2"
      >
        {visible.map((v) => {
          const sitId = `${labelId}-s${v.index}`;
          const bodyId = `${labelId}-b${v.index}`;
          return (
            <label
              key={v.index}
              data-slot="radio-group-card"
              className={cn(
                "relative flex min-h-14 min-w-0 cursor-pointer items-start gap-2 rounded-xl bg-background p-3 inset-ring-(length:--hairline) inset-ring-divider transition-[background-color,box-shadow] duration-200 ease-out-quint",
                "has-focus-visible:ring-2 has-focus-visible:ring-focus-strong has-data-checked:inset-ring-[1.5px] has-data-checked:inset-ring-foreground",
                "group-has-[>[data-slot=radio-group-highlight][data-visible]]/radio-group:has-data-checked:inset-ring-(length:--hairline) group-has-[>[data-slot=radio-group-highlight][data-visible]]/radio-group:has-data-checked:inset-ring-divider",
                "dark:bg-card forced-colors:border forced-colors:has-data-checked:outline-2 forced-colors:has-data-checked:outline-solid",
                "has-data-readonly:cursor-default [@media(hover:hover)]:hover:not-has-data-checked:not-has-data-readonly:bg-muted/40",
              )}
            >
              <RadioGroupItem value={v.index} aria-labelledby={sitId} aria-describedby={bodyId} className="mt-0.5" />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-start justify-between gap-2">
                  <span id={sitId} className="text-sm/5 font-medium text-fg-2">
                    {v.situatie}
                  </span>
                  {applied === v.index && <AppliedMark />}
                </span>
                <span id={bodyId} className="flex flex-col gap-1">
                  <VariantBody v={v} segText={segText} />
                </span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
      {hidden > 0 && (
        <Button variant="ghost" size="sm" className={cn("self-start", FOCUS_RING)} onClick={() => setShowAll(true)}>
          Încă {hidden === 1 ? "o variantă" : `${hidden} variante`}
        </Button>
      )}
      <Impact impact={impact} locators={locators} />
    </section>
  );
}
