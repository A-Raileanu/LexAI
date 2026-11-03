import "server-only";
import { aiUsage, desc, getDb, gte, isNotNull } from "@lexai/db";
import type { SubscriptionLimits } from "@lexai/ai/usage";

/** Ultima stare cunoscută a limitelor abonamentului (din ultimul job care le-a raportat). */
export function latestLimits(): SubscriptionLimits | null {
  const row = getDb().select().from(aiUsage).where(isNotNull(aiUsage.limit5hPct)).orderBy(desc(aiUsage.createdAt)).limit(1).get();
  if (!row) return null;
  return {
    cinciOre: row.limit5hPct === null ? null : { procent: row.limit5hPct, resetLa: row.limit5hReset ? new Date(row.limit5hReset).toISOString() : null },
    sapteZile: row.limit7dPct === null ? null : { procent: row.limit7dPct, resetLa: row.limit7dReset ? new Date(row.limit7dReset).toISOString() : null },
    stare: "allowed",
    actualizatLa: new Date(row.createdAt).toISOString(),
  };
}

export function usageSince(since: number) {
  return getDb().select().from(aiUsage).where(gte(aiUsage.createdAt, since)).orderBy(aiUsage.createdAt).all();
}
