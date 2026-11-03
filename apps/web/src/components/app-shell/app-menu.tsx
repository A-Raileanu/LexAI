"use client";

import { IconChartBar, IconDeviceDesktop, IconFolder, IconMoon, IconSettings, IconSun } from "@tabler/icons-react";
import { setTheme, useTheme, type ThemeChoice } from "@/components/theme";
import { DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { KbdGroup } from "@/components/ui/kbd";

/** Destinațiile principale (bara globală, foaia de pe ecran îngust, secvențele G P / G U / G S). */
export const NAV = [
  { href: "/", label: "Proiecte", icon: IconFolder, keys: "g p", match: (p: string) => p === "/" || p.startsWith("/proiecte") },
  { href: "/utilizare", label: "Utilizare", icon: IconChartBar, keys: "g u", match: (p: string) => p.startsWith("/utilizare") },
  { href: "/setari", label: "Setări", icon: IconSettings, keys: "g s", match: (p: string) => p === "/setari" || p.startsWith("/setari/") },
] as const;

export const THEMES: { value: ThemeChoice; label: string; short: string; icon: typeof IconSun }[] = [
  { value: "sistem", label: "Ca sistemul", short: "Sistem", icon: IconDeviceDesktop },
  { value: "luminos", label: "Luminoasă", short: "Luminoasă", icon: IconSun },
  { value: "intunecat", label: "Întunecată", short: "Întunecată", icon: IconMoon },
];

/** Secvența de două taste („G apoi P”) pentru Tooltip-uri și meniuri. */
export function SequenceKeys({ keys, className }: { keys: string; className?: string }) {
  return <KbdGroup keys={keys} size="sm" separator="apoi" className={className} />;
}

/** Cele trei teme ca RadioGroup într-un DropdownMenu (meniul sesiunii, „⋯” din editor). */
export function ThemeRadioItems() {
  const theme = useTheme();
  return (
    <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
      {THEMES.map((t) => (
        <DropdownMenuRadioItem key={t.value} value={t.value}>
          {t.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  );
}
