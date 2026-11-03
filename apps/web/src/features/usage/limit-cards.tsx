"use client";

import type { LimitWindow, SubscriptionLimits } from "@lexai/ai/usage";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import Link from "next/link";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NumberFlow } from "@/components/ui/number-flow";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { limitTone } from "@/components/app-shell/limits";
import { cn } from "@/lib/utils";
import { fmtUntil } from "./aggregate";

const time = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });
const longDay = new Intl.DateTimeFormat("ro-RO", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function sameDay(a: number, b: number) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** „17:40” azi, altfel „joi, 6 nov., 09:00”. */
export function fmtResetAt(ms: number, now: number): string {
  return sameDay(ms, now) ? time.format(ms) : longDay.format(ms);
}

const TONE_TEXT = { ok: "text-foreground", warn: "text-v-discutabil", err: "text-v-eroare" } as const;
const TONE_BAR = { ok: "bg-foreground/70", warn: "bg-v-discutabil", err: "bg-v-eroare" } as const;

function LimitCard({ title, w, rejected, now, kind }: { title: string; w: LimitWindow | null; rejected: boolean; now: number; kind: "5h" | "7z" }) {
  const reset = w?.resetLa ? Date.parse(w.resetLa) : null;
  const passed = reset !== null && reset <= now;
  const p = w?.procent ?? 0;
  const tone = limitTone(p, rejected && !passed);
  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        <Tooltip>
          <TooltipTrigger render={<button type="button" className="rounded-sm text-muted-foreground hover:text-foreground" aria-label="Despre limite" />}>
            <IconInfoCircle className="size-4" />
          </TooltipTrigger>
          <TooltipContent className="max-w-64">Limitele aparțin abonamentului tău Claude și includ și utilizarea din alte aplicații Claude, nu doar din LexAI.</TooltipContent>
        </Tooltip>
      </div>
      {w ? (
        <>
          <p className={cn("flex items-baseline gap-2", passed && "opacity-50")}>
            <NumberFlow value={Math.round(p)} locales="ro-RO" suffix=" %" className={cn("text-4xl font-semibold tracking-tight tabular-nums", TONE_TEXT[tone])} />
            <span className="text-sm text-muted-foreground">utilizat</span>
          </p>
          <div
            role="meter"
            aria-label={`${title}: utilizat`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(p)}
            className="h-2 overflow-hidden rounded-full bg-foreground/10"
          >
            <div className={cn("h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none", TONE_BAR[tone], passed && "opacity-50")} style={{ width: `${Math.min(100, Math.max(p > 0 ? 2 : 0, p))}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">
            {reset === null
              ? "Ora resetării nu este cunoscută."
              : passed
                ? `S-a resetat la ${fmtResetAt(reset, now)}. Valoarea se actualizează după următorul job AI.`
                : kind === "5h"
                  ? `Se resetează la ${fmtResetAt(reset, now)} · ${fmtUntil(reset - now)}`
                  : `Se resetează ${fmtResetAt(reset, now)}`}
          </p>
          {!passed && tone === "err" && p < 100 && !rejected && (
            <p className="text-sm text-v-eroare">Aproape de limită. Joburile mari pot fi întrerupte.{reset && ` Resetare la ${fmtResetAt(reset, now)}.`}</p>
          )}
        </>
      ) : (
        <>
          <p className="text-4xl font-semibold tracking-tight text-muted-foreground">—</p>
          <div className="h-2 rounded-full bg-foreground/10" aria-hidden />
          <p className="text-sm text-muted-foreground">Apare după primul job AI.</p>
        </>
      )}
    </Card>
  );
}

export function LimitCards({ limits, now }: { limits: SubscriptionLimits | null; now: number }) {
  const rejected = limits?.stare === "rejected";
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <LimitCard title="Fereastra de 5 ore" w={limits?.cinciOre ?? null} rejected={rejected} now={now} kind="5h" />
      <LimitCard title="Fereastra de 7 zile" w={limits?.sapteZile ?? null} rejected={rejected} now={now} kind="7z" />
    </div>
  );
}

/** Alerta din capul paginii: limită atinsă (100 % sau cerere respinsă) într-o fereastră încă activă. */
export function LimitReachedAlert({ limits, now }: { limits: SubscriptionLimits | null; now: number }) {
  if (!limits) return null;
  const windows = [
    { name: "5 ore", w: limits.cinciOre },
    { name: "7 zile", w: limits.sapteZile },
  ];
  const hit = windows.find(({ w }) => {
    if (!w) return false;
    const reset = w.resetLa ? Date.parse(w.resetLa) : null;
    return (reset === null || reset > now) && (w.procent >= 100 || limits.stare === "rejected");
  });
  if (!hit?.w) return null;
  const reset = hit.w.resetLa ? Date.parse(hit.w.resetLa) : null;
  return (
    <Alert variant="destructive" appearance="soft">
      <IconAlertTriangle />
      <AlertTitle>Ai atins limita de {hit.name}.</AlertTitle>
      <AlertDescription>
        {reset ? `Joburile noi așteaptă până la ${fmtResetAt(reset, now)} (${fmtUntil(reset - now)}).` : "Joburile noi așteaptă resetarea limitei."}
      </AlertDescription>
      <AlertAction>
        <Link href="#joburi" className={buttonVariants({ variant: "outline", size: "sm" })}>
          Vezi joburile în așteptare
        </Link>
      </AlertAction>
    </Alert>
  );
}
