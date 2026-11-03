"use client";

import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAnalysisOptional } from "./context";
import { stageIndex } from "./events";
import { fmtElapsed } from "./model";
import { useNow } from "./use-now";

const STAGE_LABELS = ["Identificare trimiteri", "Grupare pe acte normative", "Verificare la sursă", "Consolidare"];

/**
 * Starea compactă a jobului în antetul editorului (docs/ux/07, `JobStatusPill`):
 * „◌ Analiză · 3/4 · 03:12”; clic deschide panoul. Nu apare când nu rulează nimic.
 */
export function AnalysisStatusPill({ onOpen, compact }: { onOpen: () => void; compact?: boolean }) {
  const a = useAnalysisOptional();
  const startedAt = a?.running ? (a.latest?.job?.startedAt ?? null) : null;
  const now = useNow(1000, startedAt !== null);
  if (!a?.running) return null;
  const idx = stageIndex(a.stream);
  const what = a.latest?.recheckSegIds ? "Reverificare" : "Analiză";
  const elapsed = startedAt !== null && now !== null ? fmtElapsed(now - startedAt) : null;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onOpen}
            aria-label={`${what} în curs, etapa ${idx} din 4${elapsed ? `, ${elapsed}` : ""}. Deschide panoul`}
            className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-sm text-fg-2 outline-none inset-ring-(length:--hairline) inset-ring-divider hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus-strong"
          />
        }
      >
        <Spinner className="size-3" label="În curs" />
        <span className="text-foreground">{what}</span>
        {!compact && (
          <>
            <span aria-hidden>·</span>
            <span className="tabular-nums">{idx}/4</span>
            {elapsed && (
              <>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{elapsed}</span>
              </>
            )}
          </>
        )}
      </TooltipTrigger>
      <TooltipContent>
        {STAGE_LABELS[idx - 1]}
        {a.latest?.job?.status === "in_asteptare" ? " · în așteptare" : ""}
      </TooltipContent>
    </Tooltip>
  );
}
