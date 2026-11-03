/**
 * Cache-ul surselor. Interfața e injectabilă (baza de date o poate implementa cu tabela
 * `source_cache`); implicit, un cache în memorie, cu expirare. Fiecare valoare păstrează
 * momentul accesării, pentru trasabilitatea dovezilor.
 */

export interface CacheEntry<T = unknown> {
  sourceId: string;
  value: T;
  /** momentul accesării sursei (ISO) */
  fetchedAt: string;
  /** expirarea (ms de la epoch) */
  expiresAt: number;
}

export interface SourceCache {
  get(key: string): Promise<CacheEntry | null> | CacheEntry | null;
  set(key: string, entry: CacheEntry): Promise<void> | void;
}

export class MemorySourceCache implements SourceCache {
  private entries = new Map<string, CacheEntry>();

  constructor(private readonly maxEntries = 2000) {}

  get(key: string): CacheEntry | null {
    const e = this.entries.get(key);
    if (!e) return null;
    if (e.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }
    // ordinea de inserare ține loc de LRU
    this.entries.delete(key);
    this.entries.set(key, e);
    return e;
  }

  set(key: string, entry: CacheEntry): void {
    this.entries.delete(key);
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
  }

  get size(): number {
    return this.entries.size;
  }
}

/** Cererile în curs, per cache: același conținut nu se descarcă de două ori în paralel. */
const inflight = new WeakMap<SourceCache, Map<string, Promise<{ value: unknown; fetchedAt: string }>>>();

/** Valoarea din cache sau, dacă lipsește ori a expirat, încărcată și salvată. */
export async function cached<T>(
  cache: SourceCache,
  opts: { sourceId: string; key: string; ttlMs: number },
  load: () => Promise<T>,
): Promise<{ value: T; fetchedAt: string }> {
  const key = `${opts.sourceId}:${opts.key}`;
  const hit = await cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return { value: hit.value as T, fetchedAt: hit.fetchedAt };
  let running = inflight.get(cache);
  if (!running) inflight.set(cache, (running = new Map()));
  const pending = running.get(key);
  if (pending) return pending as Promise<{ value: T; fetchedAt: string }>;
  const p = (async () => {
    const value = await load();
    const fetchedAt = new Date().toISOString();
    try {
      await cache.set(key, { sourceId: opts.sourceId, value, fetchedAt, expiresAt: Date.now() + opts.ttlMs });
    } catch {
      /* cache-ul este opțional: valoarea se folosește oricum */
    }
    return { value, fetchedAt };
  })();
  running.set(key, p);
  try {
    return await p;
  } finally {
    running.delete(key);
  }
}
