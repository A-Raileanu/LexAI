import "server-only";
import { asc, count, getDb, sourceCache, sources, sql, type Db } from "@lexai/db";

/** Sursele implicite, create la prima citire dacă tabela e goală. */
export const DEFAULT_SOURCES = [
  { id: "portal-legislativ", priority: 10, label: "Portal Legislativ" },
  { id: "jurisprudenta", priority: 20, label: "Jurisprudență CCR și ÎCCJ" },
  { id: "web-oficial", priority: 30, label: "Site-uri oficiale" },
] as const;

export function ensureSources(db: Db = getDb()) {
  const [{ n }] = db.select({ n: count() }).from(sources).all();
  if (n > 0) return;
  db.insert(sources)
    .values(DEFAULT_SOURCES.map((s) => ({ id: s.id, enabled: true, priority: s.priority, config: JSON.stringify({ label: s.label }) })))
    .onConflictDoNothing()
    .run();
}

export interface SourceView {
  id: string;
  label: string;
  enabled: boolean;
  priority: number;
  entries: number;
  bytes: number;
  lastFetchedAt: number | null;
}

function labelOf(id: string, config: string): string {
  try {
    const c = JSON.parse(config) as { label?: unknown };
    if (typeof c.label === "string" && c.label.trim()) return c.label.trim();
  } catch {
    /* config invalid: folosim id-ul */
  }
  return DEFAULT_SOURCES.find((s) => s.id === id)?.label ?? id;
}

export function listSources(db: Db = getDb()): SourceView[] {
  ensureSources(db);
  const rows = db.select().from(sources).orderBy(asc(sources.priority), asc(sources.id)).all();
  const stats = db
    .select({
      sourceId: sourceCache.sourceId,
      n: count(),
      bytes: sql<number>`coalesce(sum(length(cast(${sourceCache.value} as blob))), 0)`,
      last: sql<number | null>`max(${sourceCache.fetchedAt})`,
    })
    .from(sourceCache)
    .groupBy(sourceCache.sourceId)
    .all();
  const by = new Map(stats.map((s) => [s.sourceId, s]));
  return rows.map((r) => {
    const s = by.get(r.id);
    return { id: r.id, label: labelOf(r.id, r.config), enabled: r.enabled, priority: r.priority, entries: s?.n ?? 0, bytes: Number(s?.bytes ?? 0), lastFetchedAt: s?.last ?? null };
  });
}

/** Sursele împreună cu momentul citirii (pentru vechimea cache-ului). */
export function sourcesSnapshot(db: Db = getDb()): { sources: SourceView[]; now: number } {
  return { sources: listSources(db), now: Date.now() };
}
