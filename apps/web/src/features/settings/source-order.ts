/** Reordonarea surselor legale și vechimea cache-ului. Fără dependențe de server. */

/** Mută `id` cu o poziție în sus sau în jos; întoarce ordinea nouă (sau aceeași, la capete). */
export function moveInOrder(ids: readonly string[], id: string, dir: "sus" | "jos"): string[] {
  const out = [...ids];
  const i = out.indexOf(id);
  const j = dir === "sus" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= out.length) return out;
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** Prioritățile pentru o ordine dată: 10, 20, 30… (lasă loc pentru inserări). */
export function priorities(ids: readonly string[]): { id: string; priority: number }[] {
  return ids.map((id, i) => ({ id, priority: (i + 1) * 10 }));
}

/** Pragul de la care cache-ul unei surse e „vechi”. */
export const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type CacheFreshness = "gol" | "actualizat" | "vechi";

export function cacheFreshness(lastFetchedAt: number | null, now: number): CacheFreshness {
  if (lastFetchedAt === null) return "gol";
  return now - lastFetchedAt > STALE_AFTER_MS ? "vechi" : "actualizat";
}

const sizeFmt = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 });

/** „312 MB”, „48 KB”, „0 B”. */
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB"];
  let v = n / 1024;
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u++;
  }
  return `${sizeFmt.format(v)} ${units[u]}`;
}
