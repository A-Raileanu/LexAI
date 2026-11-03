"use client";

import { IconChecks, IconCircleDot } from "@tabler/icons-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { documentLocators } from "@/features/analysis/triage";
import type { BridgePlaceholder, BridgeSegment, EditorBridge } from "@/features/editor/bridge";
import { cn } from "@/lib/utils";
import { fillProgress, placeholderContext } from "./grounds";
import { ROW_FOCUS } from "./ui";

interface Props {
  bridge: EditorBridge;
  placeholders: BridgePlaceholder[];
  segments: BridgeSegment[];
  /** câmpurile din proiectul generat (pentru „2 din 8 gata”) */
  initial: string[];
}

/** „[● termenul acordat]” → „termenul acordat”. */
const hintOf = (p: BridgePlaceholder) => p.hint.trim() || p.text.replace(/^\[\s*●\s*|\s*\]$/g, "").trim() || p.text;

/**
 * Fila „De completat” (în limbajul vizual din docs/ux/08b): câmpurile `[● …]` rămase în document,
 * în ordine, ca rânduri de o linie (ce trebuie completat, locul în document); rândul curent arată
 * și contextul. `j` / `k` (sau `n` / `p`, ↓ / ↑) trec la câmpul următor / anterior și îl selectează
 * în document; Enter sau clic duce cursorul acolo. Un câmp dispare când textul lui e înlocuit.
 */
export function FillList({ bridge, placeholders, segments, initial }: Props) {
  const [cursor, setCursor] = useState(0);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const progress = fillProgress(placeholders, initial, segments.map((s) => s.text).join("\n"));
  const locators = useMemo(() => documentLocators(segments), [segments]);
  const current = placeholders.length ? Math.min(cursor, placeholders.length - 1) : -1;

  const show = (i: number, keepFocus: boolean) => {
    if (!placeholders.length) return;
    const n = (i + placeholders.length) % placeholders.length;
    setCursor(n);
    bridge.focusPlaceholder(n);
    if (keepFocus) items.current[n]?.focus({ preventScroll: false });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === "n" || key === "arrowdown" || key === "j") {
      e.preventDefault();
      show(current + 1, true);
    } else if (key === "p" || key === "arrowup" || key === "k") {
      e.preventDefault();
      show(current - 1, true);
    } else if (key === "home") {
      e.preventDefault();
      show(0, true);
    } else if (key === "end") {
      e.preventDefault();
      show(placeholders.length - 1, true);
    }
  };

  return (
    <div className="flex flex-col">
      <header className="flex h-16 shrink-0 flex-col justify-center border-b border-divider px-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base/[22px] font-semibold">De completat</h2>
          <p aria-live="polite" className="ms-auto text-sm/[18px] text-fg-2 tabular-nums">
            {progress.total ? `${progress.done} din ${progress.total} gata` : placeholders.length ? `${placeholders.length} câmpuri` : ""}
          </p>
        </div>
        <p className="text-sm/[18px] text-fg-2">Scrie direct în document peste câmpul selectat.</p>
      </header>

      {!placeholders.length ? (
        <div className="flex flex-col items-center gap-1 px-4 py-8 text-center" role="status">
          <IconChecks aria-hidden className="mb-2 size-6 text-v-corect-fg" />
          <p className="text-base/[22px] font-semibold">Nimic de completat</p>
          <p className="text-md text-fg-2">{progress.total ? `Toate cele ${progress.total} câmpuri din proiect au fost completate.` : "Documentul nu are câmpuri [● …]."}</p>
        </div>
      ) : (
        <ul aria-label={`Câmpuri de completat: ${placeholders.length}`} onKeyDown={onKeyDown}>
          {placeholders.map((p, i) => {
            const active = i === current;
            const ctx = active ? placeholderContext(segments, p.segId, p.text) : null;
            const where = p.segId ? (locators.get(p.segId) ?? null) : null;
            const hint = hintOf(p);
            return (
              <li key={`${p.index}-${p.text}`} className={cn(active && "bg-muted shadow-[inset_2px_0_0_var(--foreground)] forced-colors:outline-2 forced-colors:-outline-offset-2 forced-colors:outline-solid dark:bg-accent")}>
                <button
                  ref={(el) => {
                    items.current[i] = el;
                  }}
                  type="button"
                  tabIndex={active ? 0 : -1}
                  aria-current={active ? "true" : undefined}
                  aria-label={`De completat: ${hint}${where ? `, în ${where}` : ""}`}
                  onClick={() => show(i, false)}
                  onFocus={() => setCursor(i)}
                  className={cn("flex w-full gap-3 px-4 text-start", active ? "min-h-10 items-start" : "h-10 items-center hover:bg-muted/60", ROW_FOCUS)}
                >
                  <IconCircleDot aria-hidden className={cn("size-4 shrink-0 text-v-discutabil-fg", active && "mt-3")} />
                  <span className={cn("min-w-0 flex-1 text-md/5 font-medium", active ? "py-2.5 wrap-break-word" : "truncate")}>{hint}</span>
                  {where && <span className={cn("shrink-0 text-sm/5 text-fg-3 tabular-nums", active && "py-2.5")}>{where}</span>}
                </button>
                {active && ctx && (ctx.before || ctx.after || ctx.section) && (
                  <div className="flex flex-col gap-1 ps-11 pe-4 pb-4">
                    {ctx.section && <p className="text-sm/5 text-fg-2">{ctx.section}</p>}
                    {(ctx.before || ctx.after) && (
                      <p className="font-serif text-base/6 wrap-break-word">
                        {ctx.before}
                        <mark className="rounded-[2px] bg-placeholder-bg px-0.5 text-foreground dark:text-background">{p.text}</mark>
                        {ctx.after}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 mb-4 px-4 text-sm/5 text-fg-3">
        <kbd className="font-sans">j</kbd> / <kbd className="font-sans">k</kbd> trec la câmpul următor / anterior; Enter duce cursorul în document.
      </p>
    </div>
  );
}
