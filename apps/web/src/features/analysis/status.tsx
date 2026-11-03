"use client";

import type { VerdictStatus } from "@lexai/core/types";
import { IconAlertTriangle, IconCircleCheck, IconCircleDashed, IconCircleX, IconUserSearch, type Icon } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Stările verdictelor în panou (docs/ux/08b-rezultate-analiza-revizie.md, 5.6–5.7): iconiță,
 * numele stării (aria / tooltip), numele grupului și culorile. Textul colorat folosește numai
 * tokenii `-fg` (≥ 4,5:1 pe orice suprafață a panoului); culoarea nu poartă niciodată singură sensul.
 */
export interface StatusUi {
  icon: Icon;
  /** numele stării, la singular („Greșeală”): aria-label, tooltip */
  label: string;
  /** antetul grupului („Greșeli”) */
  group: string;
  /** text și iconițe colorate (token `-fg`) */
  fg: string;
  /** fundal discret (token `-bg`) */
  bg: string;
}

export const STATUS_UI: Record<VerdictStatus, StatusUi> = {
  eroare_citare: { icon: IconCircleX, label: "Greșeală", group: "Greșeli", fg: "text-v-eroare-fg", bg: "bg-v-eroare-bg" },
  interpretare_discutabila: { icon: IconAlertTriangle, label: "Discutabil", group: "Discutabile", fg: "text-v-discutabil-fg", bg: "bg-v-discutabil-bg" },
  necesita_analiza_umana: { icon: IconUserSearch, label: "De verificat", group: "De verificat", fg: "text-v-uman-fg", bg: "bg-v-uman-bg" },
  neverificat: { icon: IconCircleDashed, label: "Neverificat", group: "Neverificate", fg: "text-v-neverificat-fg", bg: "bg-v-neverificat-bg" },
  corect: { icon: IconCircleCheck, label: "Corect", group: "Corecte", fg: "text-v-corect-fg", bg: "bg-v-corect-bg" },
};

/**
 * Iconița stării, 16 px, `aria-hidden` (starea se citește din numele rândului). Culoarea e cea
 * `-fg`: marcajul `--v-discutabil` are doar 2,9:1 pe banda activă (`muted`), sub pragul de 3:1.
 * `muted` = forma rămâne, culoarea dispare (rândurile din „Ignorate” / „Rezolvate”).
 */
export function StatusIcon({ status, muted, className }: { status: VerdictStatus; muted?: boolean; className?: string }) {
  const ui = STATUS_UI[status];
  const I = ui.icon;
  return <I aria-hidden stroke={2} className={cn("size-4 shrink-0", muted ? "text-fg-3" : ui.fg, className)} />;
}
