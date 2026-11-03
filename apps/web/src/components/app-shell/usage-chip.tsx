"use client";

import Link from "next/link";
import type { LimitWindow, SubscriptionLimits } from "@lexai/ai/usage";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { fmtReset, hasLimits, limitTone, pct, shortDay, time } from "./limits";

const TONE_TEXT = { ok: "", warn: "text-v-discutabil", err: "text-v-eroare" } as const;
const TONE_DOT = { ok: "bg-v-corect", warn: "bg-v-discutabil", err: "bg-v-eroare" } as const;

/** Ora resetării, scurt: „14:30” azi, altfel „lun. 14:30”. */
function shortReset(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? time.format(d) : shortDay.format(d);
}

/** Detaliile ferestrelor (HoverCard-ul chipului de consum). */
function LimitsDetails({ limite }: { limite: SubscriptionLimits }) {
  const rejected = limite.stare === "rejected";
  return (
    <>
      <p className="font-medium">Limitele abonamentului Claude</p>
      {limite.cinciOre && (
        <p className="mt-2 text-muted-foreground">
          Fereastra de 5 ore: <span className="text-foreground tabular-nums">{pct(limite.cinciOre.procent)}</span>
          {limite.cinciOre.resetLa && <> · se resetează {fmtReset(limite.cinciOre.resetLa)}</>}
        </p>
      )}
      {limite.sapteZile && (
        <p className="mt-1 text-muted-foreground">
          Fereastra de 7 zile: <span className="text-foreground tabular-nums">{pct(limite.sapteZile.procent)}</span>
          {limite.sapteZile.resetLa && <> · se resetează {fmtReset(limite.sapteZile.resetLa)}</>}
        </p>
      )}
      {rejected && <p className="mt-2 text-v-eroare">Limita a fost atinsă: joburile noi așteaptă resetarea.</p>}
      <p className="mt-2 text-xs text-muted-foreground">Actualizat la {time.format(new Date(limite.actualizatLa))}, după ultimul job AI.</p>
    </>
  );
}

/**
 * Chipul de consum din bara globală: „● 5h 11% · 7z 18%” (≥1024 px) sau „● 18%” (768–1023 px),
 * cu punctul în tonul celei mai solicitate ferestre și detaliile la hover. Fără date, nu apare.
 */
export function UsageChip({ limite, className }: { limite: SubscriptionLimits | null; className?: string }) {
  if (!hasLimits(limite)) return null;
  const rejected = limite.stare === "rejected";
  const windows = [limite.cinciOre, limite.sapteZile].filter((w): w is LimitWindow => Boolean(w));
  const worstWin = windows.reduce((a, b) => (b.procent > a.procent ? b : a));
  const tone = limitTone(worstWin.procent, rejected);
  const part = (label: string, w: LimitWindow | null | undefined) =>
    w && (
      <span className={TONE_TEXT[limitTone(w.procent)]}>
        {label} {pct(w.procent)}
      </span>
    );
  const reset = shortReset(worstWin.resetLa);
  const label = rejected
    ? `Limită atinsă${reset ? `, se resetează la ${reset}` : ""}. Deschide Utilizare`
    : `Limite abonament: ${[limite.cinciOre && `5 ore ${pct(limite.cinciOre.procent)}`, limite.sapteZile && `7 zile ${pct(limite.sapteZile.procent)}`].filter(Boolean).join(", ")}. Deschide Utilizare`;
  return (
    <HoverCard>
      <HoverCardTrigger
        render={
          <Link
            href="/utilizare"
            aria-label={label}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums inset-ring-(length:--hairline) inset-ring-border outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-focus-ring",
              rejected && "text-v-eroare",
              className,
            )}
          />
        }
      >
        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TONE_DOT[tone])} />
        {rejected ? (
          <span>Limită atinsă{reset && ` · reset ${reset}`}</span>
        ) : (
          <>
            <span className="hidden lg:inline">
              {part("5h", limite.cinciOre)}
              {limite.cinciOre && limite.sapteZile && " · "}
              {part("7z", limite.sapteZile)}
            </span>
            <span className={cn("lg:hidden", TONE_TEXT[tone])}>{pct(worstWin.procent)}</span>
          </>
        )}
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="end" className="w-64 text-sm">
        <LimitsDetails limite={limite} />
      </HoverCardContent>
    </HoverCard>
  );
}
