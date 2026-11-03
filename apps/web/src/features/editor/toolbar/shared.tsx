"use client";

import type { Editor } from "@tiptap/react";
import type { ReactElement, ReactNode } from "react";
import { Kbd } from "@/components/ui/kbd";
import { TooltipTrigger } from "@/components/ui/tooltip";

export const TEXT_COLORS: { value: string; label: string }[] = [
  { value: "#000000", label: "Negru" },
  { value: "#404040", label: "Gri închis" },
  { value: "#808080", label: "Gri" },
  { value: "#c00000", label: "Roșu închis" },
  { value: "#ff0000", label: "Roșu" },
  { value: "#e36c09", label: "Portocaliu" },
  { value: "#00b050", label: "Verde" },
  { value: "#0070c0", label: "Albastru" },
  { value: "#002060", label: "Bleumarin" },
  { value: "#7030a0", label: "Violet" },
];

export const HIGHLIGHT_COLORS: { value: string; label: string }[] = [
  { value: "#fff59d", label: "Galben" },
  { value: "#c8e6c9", label: "Verde" },
  { value: "#bbdefb", label: "Albastru" },
  { value: "#f8bbd0", label: "Roz" },
  { value: "#ffe0b2", label: "Portocaliu" },
  { value: "#e0e0e0", label: "Gri" },
];

export const STANDARD_FONTS = ["Times New Roman", "Arial", "Calibri", "Cambria", "Georgia", "Garamond", "Verdana", "Courier New"];

export const LINE_HEIGHTS = [1, 1.15, 1.5, 2];
export const fmtNum = (n: number) => n.toLocaleString("ro-RO", { maximumFractionDigits: 2, minimumFractionDigits: n === Math.round(n) && n < 3 ? 1 : 0 });

/** Conținutul tooltip-ului: numele și scurtătura (Kbd). */
export function TipLabel({ label, keys }: { label: ReactNode; keys?: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {label}
      {keys && <Kbd keys={keys} size="sm" />}
    </span>
  );
}

/** Un buton al barei cu tooltip (în TooltipGroup-ul barei). */
export function Tip({ label, keys, children }: { label: ReactNode; keys?: string; children: ReactElement }) {
  return <TooltipTrigger render={children} content={<TipLabel label={label} keys={keys} />} />;
}

/** Butoanele simple nu iau focusul din editor (selecția rămâne vizibilă). */
export const keepFocus = (e: { preventDefault: () => void }) => e.preventDefault();

/** La închiderea meniurilor, focusul se întoarce în document. */
export const toEditor = (editor: Editor) => () => (editor.isEditable ? (editor.view.dom as HTMLElement) : true);

/** Primul font dintr-o listă CSS („"Times New Roman", serif” → „Times New Roman”). */
export const firstFont = (v: unknown) =>
  String(v ?? "")
    .split(",")[0]
    .trim()
    .replace(/^["']|["']$/g, "");
