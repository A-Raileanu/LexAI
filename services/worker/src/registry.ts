import { eq, getDb, sourceCache, sources, type Db } from "@lexai/db";
import { SourceRegistry, type CacheEntry, type LegalSource, type SourceCache } from "@lexai/sources";
import { createJurisprudentaSource, JURISPRUDENTA_SOURCE_ID } from "@lexai/source-jurisprudenta";
import { createPortalLegislativSource, PORTAL_SOURCE_ID } from "@lexai/source-portal-legislativ";
import { createWebOficialSource, WEB_OFICIAL_SOURCE_ID } from "@lexai/source-web-oficial";

/**
 * Cache-ul surselor în SQLite (tabela source_cache): paginile portalului și deciziile
 * descărcate se păstrează între joburi și între reporniri ale worker-ului.
 */
export class DbSourceCache implements SourceCache {
  constructor(private readonly db: Db) {}

  get(key: string): CacheEntry | null {
    const row = this.db.select().from(sourceCache).where(eq(sourceCache.key, key)).get();
    if (!row) return null;
    if (row.expiresAt <= Date.now()) {
      this.db.delete(sourceCache).where(eq(sourceCache.key, key)).run();
      return null;
    }
    return { sourceId: row.sourceId, value: JSON.parse(row.value), fetchedAt: new Date(row.fetchedAt).toISOString(), expiresAt: row.expiresAt };
  }

  set(key: string, entry: CacheEntry) {
    const values = { key, sourceId: entry.sourceId, value: JSON.stringify(entry.value), fetchedAt: Date.parse(entry.fetchedAt) || Date.now(), expiresAt: entry.expiresAt };
    this.db.insert(sourceCache).values(values).onConflictDoUpdate({ target: sourceCache.key, set: values }).run();
  }
}

type Factory = (cache: SourceCache) => LegalSource;

/** Sursele cunoscute de aplicație; o sursă nouă se adaugă aici și apare în Setări. */
export const SOURCE_FACTORIES: Record<string, { factory: Factory; label: string; priority: number }> = {
  [PORTAL_SOURCE_ID]: { factory: (cache) => createPortalLegislativSource({ cache }), label: "Portalul Legislativ", priority: 10 },
  [JURISPRUDENTA_SOURCE_ID]: { factory: (cache) => createJurisprudentaSource({ cache }), label: "Jurisprudență obligatorie (CCR, ÎCCJ)", priority: 20 },
  [WEB_OFICIAL_SOURCE_ID]: { factory: (cache) => createWebOficialSource({ cache }), label: "Site-uri oficiale", priority: 30 },
};

/** Registrul surselor active, după setările din tabela `sources` (implicit: toate). */
export function buildRegistry(db: Db = getDb()): SourceRegistry {
  const cache = new DbSourceCache(db);
  const rows = new Map(db.select().from(sources).all().map((r) => [r.id, r]));
  return new SourceRegistry(
    Object.entries(SOURCE_FACTORIES).map(([id, def]) => {
      const row = rows.get(id);
      return { source: def.factory(cache), priority: row?.priority ?? def.priority, enabled: row?.enabled ?? true };
    }),
  );
}
