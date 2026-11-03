import type { Evidence } from "./evidence";
import type { Capability, LegalSource, SourceCallContext } from "./types";

/**
 * Registrul surselor active. Prioritatea: număr mai mic = sursă consultată mai întâi
 * (aceeași convenție ca tabela `sources`, implicit 100).
 */

export interface SourceEntry {
  source: LegalSource;
  priority: number;
  enabled: boolean;
}

export class SourceRegistry {
  private entries = new Map<string, SourceEntry>();
  private order = 0;
  private seq = new Map<string, number>();

  constructor(sources: (LegalSource | { source: LegalSource; priority?: number; enabled?: boolean })[] = []) {
    for (const s of sources) {
      if ("source" in s) this.register(s.source, s);
      else this.register(s);
    }
  }

  /** Adaugă (sau înlocuiește) o sursă. */
  register(source: LegalSource, opts: { priority?: number; enabled?: boolean } = {}): this {
    if (!this.seq.has(source.id)) this.seq.set(source.id, this.order++);
    this.entries.set(source.id, { source, priority: opts.priority ?? 100, enabled: opts.enabled ?? true });
    return this;
  }

  unregister(id: string): boolean {
    return this.entries.delete(id);
  }

  setEnabled(id: string, enabled: boolean): void {
    const e = this.entries.get(id);
    if (e) e.enabled = enabled;
  }

  setPriority(id: string, priority: number): void {
    const e = this.entries.get(id);
    if (e) e.priority = priority;
  }

  /** O sursă activă după id. */
  get(id: string): LegalSource | undefined {
    const e = this.entries.get(id);
    return e?.enabled ? e.source : undefined;
  }

  /** Toate sursele înregistrate, inclusiv cele dezactivate (pentru setări). */
  list(): SourceEntry[] {
    return this.sorted([...this.entries.values()]);
  }

  /** Sursele active, în ordinea priorității. */
  enabled(): LegalSource[] {
    return this.sorted([...this.entries.values()].filter((e) => e.enabled)).map((e) => e.source);
  }

  /** Sursele active care oferă capabilitatea, în ordinea priorității. */
  providers(cap: Capability): LegalSource[] {
    return this.enabled().filter((s) => s.capabilities.has(cap));
  }

  has(cap: Capability): boolean {
    return this.providers(cap).length > 0;
  }

  /** Capabilitățile oferite de cel puțin o sursă activă. */
  capabilities(): Set<Capability> {
    return new Set(this.enabled().flatMap((s) => [...s.capabilities]));
  }

  /**
   * Validarea dovezilor: sursa care a furnizat dovada este activă și garantează adresa.
   * Dovezile fără sursă (ex. salvate de o versiune veche) sunt acceptate dacă o sursă activă garantează adresa.
   */
  trusts(ev: Pick<Evidence, "url"> & { sourceId?: string }): boolean {
    const ok = (s: LegalSource) => (s.trustsUrl ? s.trustsUrl(ev.url) : /^https:\/\//i.test(ev.url));
    if (ev.sourceId) {
      const s = this.get(ev.sourceId);
      return !!s && ok(s);
    }
    return this.enabled().some(ok);
  }

  private sorted(list: SourceEntry[]): SourceEntry[] {
    return list.sort((a, b) => a.priority - b.priority || this.seq.get(a.source.id)! - this.seq.get(b.source.id)!);
  }
}

/**
 * Starea unei analize: starea fiecărei surse și ce sursă a furnizat fiecare act sau decizie
 * (apelurile ulterioare cu același id merg la aceeași sursă).
 */
export class RunScope {
  private states = new Map<string, Map<string, unknown>>();
  /** „act:798” → id-ul sursei */
  readonly owners = new Map<string, string>();

  state(sourceId: string): Map<string, unknown> {
    let s = this.states.get(sourceId);
    if (!s) this.states.set(sourceId, (s = new Map()));
    return s;
  }

  context(sourceId: string, extra: Omit<SourceCallContext, "state"> = {}): SourceCallContext {
    return { ...extra, state: this.state(sourceId) };
  }
}
