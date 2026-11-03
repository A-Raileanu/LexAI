"use client";

import Link from "next/link";
import type { LimitWindow, SubscriptionLimits } from "@lexai/ai/usage";
import { cn } from "@/lib/utils";

/** Pragurile de culoare pentru limitele abonamentului (docs/ux/00-directie.md). */
export function limitTone(p: number, rejected = false): "ok" | "warn" | "err" {
  if (rejected || p >= 90) return "err";
  if (p >= 70) return "warn";
  return "ok";
}

export const time = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });
const day = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
export const shortDay = new Intl.DateTimeFormat("ro-RO", { weekday: "short", hour: "2-digit", minute: "2-digit" });

export function fmtReset(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString() ? `azi, ${time.format(d)}` : day.format(d);
}

export const pct = (p: number) => `${new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(p)}%`;

/** O fereastră de limită ca micro-bară (în foaia „Meniu” de pe ecran îngust). */
export function Bar({ label, w, rejected }: { label: string; w: LimitWindow; rejected: boolean }) {
  const t = limitTone(w.procent, rejected);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-7 shrink-0 text-muted-foreground">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span
          className={cn("block h-full rounded-full", t === "ok" && "bg-foreground/60", t === "warn" && "bg-v-discutabil", t === "err" && "bg-v-eroare")}
          style={{ width: `${Math.min(100, Math.max(3, w.procent))}%` }}
        />
      </span>
      <span className="w-8 shrink-0 text-right tabular-nums text-muted-foreground">{pct(w.procent)}</span>
    </div>
  );
}

export const hasLimits = (l: SubscriptionLimits | null | undefined): l is SubscriptionLimits => Boolean(l && (l.cinciOre || l.sapteZile));

/** Chip compact „5h 12% · 7z 34%”, pentru antete (analiză, generare). */
export function LimitsChip({ limite, className }: { limite: SubscriptionLimits | null | undefined; className?: string }) {
  if (!limite || (!limite.cinciOre && !limite.sapteZile)) return null;
  const worst = Math.max(limite.cinciOre?.procent ?? 0, limite.sapteZile?.procent ?? 0);
  const t = limitTone(worst, limite.stare === "rejected");
  return (
    <Link
      href="/utilizare"
      title="Utilizarea abonamentului Claude"
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs tabular-nums text-muted-foreground inset-ring-(length:--hairline) inset-ring-border hover:bg-muted",
        t === "warn" && "text-v-discutabil inset-ring-v-discutabil/40",
        t === "err" && "text-v-eroare inset-ring-v-eroare/40",
        className,
      )}
    >
      {[limite.cinciOre && `5h ${pct(limite.cinciOre.procent)}`, limite.sapteZile && `7z ${pct(limite.sapteZile.procent)}`].filter(Boolean).join(" · ")}
    </Link>
  );
}
