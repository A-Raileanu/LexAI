"use client";

import { IconChevronDown, IconCircle, IconCircleCheck, IconCircleDashed, IconCircleDot, IconPlayerPause, IconUserSearch } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { STATE_LABELS, type GroundState } from "./grounds";
import type { StepState } from "./progress";

// ───────────────────────── ceas comun (un singur interval pentru toate cronometrele) ─────────────────────────

let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribeNow(cb: () => void) {
  listeners.add(cb);
  now = Date.now();
  if (!timer) {
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Ora curentă, actualizată la fiecare secundă cât timp `active` e adevărat (0 altfel). */
export function useNow(active: boolean): number {
  return useSyncExternalStore(
    active ? subscribeNow : noopSubscribe,
    () => (active ? now : 0),
    () => 0,
  );
}

const noopSubscribe = () => () => undefined;

// ───────────────────────── stări (docs/ux/08b: un singur semnal, culori `-fg`) ─────────────────────────

export const STATE_TONE: Record<GroundState, string> = {
  respectat: "text-v-corect-fg",
  de_completat: "text-v-discutabil-fg",
  de_verificat: "text-v-uman-fg",
  nevalidat: "text-v-neverificat-fg",
};

const STATE_ICON = {
  respectat: IconCircleCheck,
  de_completat: IconCircleDot,
  de_verificat: IconUserSearch,
  nevalidat: IconCircleDashed,
} as const;

export function StateIcon({ state, className }: { state: GroundState; className?: string }) {
  const Icon = STATE_ICON[state];
  return <Icon aria-hidden className={cn("size-4 shrink-0", STATE_TONE[state], className)} />;
}

/** Numele stării la singular, pentru numele accesibil al rândului. */
export const stateName = (state: GroundState) => STATE_LABELS[state].label;

/** Conturul de focus al elementelor pe toată lățimea (în interior, ca în panoul de analiză). */
export const ROW_FOCUS = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus-strong";
export const FOCUS_RING = "focus-visible:ring-2 focus-visible:ring-focus-strong";

/** Antetul unui grup (36 px, lipicios), ca în panoul de analiză. */
export function ListGroupHeader({ id, label, count, open, onToggle, controls, className }: { id: string; label: string; count: number; open: boolean; onToggle: () => void; controls: string; className?: string }) {
  return (
    <h3 className={cn("sticky top-0 z-[5] bg-background", className)}>
      <button
        type="button"
        id={id}
        aria-expanded={open}
        aria-controls={open ? controls : undefined}
        aria-label={`${label}, ${count}`}
        onClick={onToggle}
        className={cn("flex h-9 w-full items-center gap-2 px-4 text-start text-sm/5 font-semibold hover:bg-muted/60", ROW_FOCUS)}
      >
        <span>{label}</span>
        <span className="font-normal text-fg-3 tabular-nums">{count}</span>
        <IconChevronDown aria-hidden className={cn("ms-auto size-4 text-fg-3 transition-transform duration-150 motion-reduce:transition-none", !open && "-rotate-90")} />
      </button>
    </h3>
  );
}

export function StepIcon({ state }: { state: StepState }) {
  if (state === "gata") return <IconCircleCheck aria-hidden className="size-4 shrink-0 text-v-corect-fg" />;
  if (state === "in_curs") return <Spinner size="sm" className="shrink-0 text-ai" aria-hidden />;
  if (state === "oprit") return <IconPlayerPause aria-hidden className="size-4 shrink-0 text-v-discutabil-fg" />;
  return <IconCircle aria-hidden className="size-4 shrink-0 text-fg-3" />;
}

export const STEP_STATE_LABEL: Record<StepState, string> = { gata: "gata", in_curs: "în curs", urmeaza: "urmează", oprit: "oprită" };
