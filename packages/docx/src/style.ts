import { defaultMeta, type DocumentMeta } from "./types";

/** Conversiile comune exporturilor DOCX și PDF: culori, mărimi de font, familii, meta completă. */

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function colorHex(v: unknown): string | undefined {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  let m = /^#?([0-9a-f]{6})$/.exec(s);
  if (m) return m[1].toUpperCase();
  m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(s);
  if (m) return (m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toUpperCase();
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(s);
  if (m) return [m[1], m[2], m[3]].map((x) => clamp(Number(x), 0, 255).toString(16).padStart(2, "0")).join("").toUpperCase();
  return undefined;
}

/** „12pt” / „16px” / 12 → jumătăți de punct. */
export function halfPoints(v: unknown): number | undefined {
  if (isNum(v)) return Math.round(v * 2);
  const m = /^([\d.]+)\s*(pt|px)?$/i.exec(String(v ?? "").trim());
  if (!m) return undefined;
  const pt = parseFloat(m[1]) * (m[2]?.toLowerCase() === "px" ? 0.75 : 1);
  return pt > 0 ? Math.round(pt * 2) : undefined;
}

export const firstFont = (v: unknown) =>
  String(v ?? "")
    .split(",")[0]
    .trim()
    .replace(/^["']|["']$/g, "") || undefined;

/** Meta completă: valorile lipsă iau valorile implicite din contract. */
export function mergeMeta(meta: Partial<DocumentMeta> | undefined): DocumentMeta {
  const d = defaultMeta();
  return {
    page: {
      ...d.page,
      ...meta?.page,
      marginsMm: { ...d.page.marginsMm, ...meta?.page?.marginsMm },
    },
    defaults: { ...d.defaults, ...meta?.defaults },
    headers: meta?.headers ?? [],
    footers: meta?.footers ?? [],
    ...(meta?.headerKinds ? { headerKinds: meta.headerKinds } : {}),
    ...(meta?.footerKinds ? { footerKinds: meta.footerKinds } : {}),
    ...(meta?.titlePage ? { titlePage: true } : {}),
    ...(meta?.evenOdd ? { evenOdd: true } : {}),
    footnotes: meta?.footnotes ?? [],
  };
}
