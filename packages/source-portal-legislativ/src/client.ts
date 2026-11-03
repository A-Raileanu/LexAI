import { MemorySourceCache, SourceError, cached, fetchText, urlInDomains, type FetchFn, type SourceCache } from "@lexai/sources";
import { looseKey } from "@lexai/sources/text";
import {
  parseActPage,
  parseActionsTable,
  parseDocTypeOptions,
  parseSearchCount,
  parseSearchResults,
  type PortalActPage,
  type PortalActionRow,
  type PortalSearchResult,
  type PortalVersion,
} from "./parse";

/**
 * Client pentru Portalul Legislativ (legislatie.just.ro).
 * Toate cererile trec prin aceeași funcție, cu timeout, reîncercare și cache (injectabil).
 * Fiecare rezultat păstrează momentul accesării, pentru trasabilitate.
 */

export const PORTAL_ORIGIN = "https://legislatie.just.ro";
export const PORTAL_HOSTS = ["legislatie.just.ro"];
export const PORTAL_SOURCE_ID = "portal-legislativ";

const TTL_MS = 6 * 60 * 60 * 1000;

/** Eroare a portalului (păstrată pentru compatibilitate: e o `SourceError`). */
export class PortalError extends SourceError {
  constructor(message: string, url: string) {
    super(message, { url, sourceId: PORTAL_SOURCE_ID });
    this.name = "PortalError";
  }
}

export function actUrl(versionId: number, anchorId?: string, formaDeBaza = false): string {
  return `${PORTAL_ORIGIN}/Public/DetaliiDocument/${versionId}${formaDeBaza ? "?isFormaDeBaza=True" : ""}${anchorId ? `#${anchorId}` : ""}`;
}

export function isPortalUrl(url: string): boolean {
  return urlInDomains(url, PORTAL_HOSTS);
}

// ───────────────────────── Tipuri de documente ─────────────────────────

const TYPE_ALIASES: Record<string, string> = {
  lege: "LEGE",
  legea: "LEGE",
  l: "LEGE",
  oug: "ORDONANȚĂ DE URGENȚĂ",
  "ordonanta de urgenta": "ORDONANȚĂ DE URGENȚĂ",
  "ordonanta de urgenta a guvernului": "ORDONANȚĂ DE URGENȚĂ",
  og: "ORDONANȚĂ",
  ordonanta: "ORDONANȚĂ",
  "ordonanta guvernului": "ORDONANȚĂ",
  hg: "HOTĂRÂRE",
  hotarare: "HOTĂRÂRE",
  "hotararea guvernului": "HOTĂRÂRE",
  cod: "COD",
  codul: "COD",
  decizie: "DECIZIE",
  decizia: "DECIZIE",
  decret: "DECRET",
  "decret-lege": "DECRET-LEGE",
  ordin: "ORDIN",
  ordinul: "ORDIN",
  constitutie: "CONSTITUȚIE",
  constitutia: "CONSTITUȚIE",
  regulament: "REGULAMENT",
  norma: "NORMĂ",
  norme: "NORME",
  // codurile au pe portal documente separate de legea de aprobare, cu tip propriu
  "c civ": "CODUL CIVIL",
  "c civil": "CODUL CIVIL",
  "c pen": "CODUL PENAL",
  "c proc civ": "CODUL DE PROCEDURĂ CIVILĂ",
  cpc: "CODUL DE PROCEDURĂ CIVILĂ",
  "c proc pen": "CODUL DE PROCEDURĂ PENALĂ",
  cpp: "CODUL DE PROCEDURĂ PENALĂ",
  "c fisc": "CODUL FISCAL",
  "c muncii": "CODUL MUNCII",
};

// ───────────────────────── Căutare ─────────────────────────

export interface SearchParams {
  tip?: string | null;
  numar?: string | null;
  an?: string | null;
  titlu?: string | null;
  text?: string | null;
  /** doar acte în vigoare la această dată (ISO) */
  inVigoareLa?: string | null;
}

export interface SearchOutcome {
  url: string;
  accesatLa: string;
  total: number | null;
  rezultate: PortalSearchResult[];
  tipRezolvat: string | null;
}

export interface ActPageOutcome {
  page: PortalActPage;
  url: string;
  accesatLa: string;
}

export interface PortalClientOptions {
  cache?: SourceCache;
  fetch?: FetchFn;
  /** id-ul sursei (cheile din cache) */
  sourceId?: string;
}

export class PortalClient {
  readonly cache: SourceCache;
  private readonly sourceId: string;

  constructor(private readonly opts: PortalClientOptions = {}) {
    this.cache = opts.cache ?? new MemorySourceCache();
    this.sourceId = opts.sourceId ?? PORTAL_SOURCE_ID;
  }

  // fără semnalul apelantului: o descărcare în curs poate fi comună mai multor analize
  private fetchText(url: string, init?: RequestInit): Promise<string> {
    return fetchText(url, { init, fetch: this.opts.fetch, label: "Portalul Legislativ", sourceId: this.sourceId });
  }

  private cached<T>(key: string, load: () => Promise<T>) {
    return cached(this.cache, { sourceId: this.sourceId, key, ttlMs: TTL_MS }, load);
  }

  /** O pagină de pe portal, cu cache și momentul accesării. */
  async getPage(url: string): Promise<{ value: string; fetchedAt: string }> {
    if (!isPortalUrl(url)) throw new PortalError("Adresa nu aparține Portalului Legislativ", url);
    return this.cached(`page:${url}`, () => this.fetchText(url));
  }

  private async docTypes(): Promise<{ value: string; label: string }[]> {
    const { value } = await this.cached("doctypes", async () => parseDocTypeOptions(await this.fetchText(`${PORTAL_ORIGIN}/Public/Acasa`)));
    return value;
  }

  async resolveDocType(tip: string | null | undefined): Promise<{ value: string; label: string } | null> {
    if (!tip) return null;
    const key = looseKey(tip).replace(/[.]/g, " ").replace(/\s+/g, " ").trim();
    const types = await this.docTypes();
    let target = TYPE_ALIASES[key] ? looseKey(TYPE_ALIASES[key]) : key;
    // „cod civil”, „codul civil” → tipul „CODUL CIVIL”
    const code = target.match(/^cod(?:ul)? (.+)$/);
    if (code) target = `codul ${code[1]}`;
    return (
      types.find((t) => looseKey(t.label) === target) ??
      types.find((t) => looseKey(t.label).startsWith(target)) ??
      (code ? types.find((t) => looseKey(t.label) === "cod") : undefined) ??
      null
    );
  }

  async searchActs(p: SearchParams): Promise<SearchOutcome> {
    const qs = new URLSearchParams();
    const t = await this.resolveDocType(p.tip);
    if (t) qs.set("tipdoc", t.value);
    if (p.numar) qs.set("numardoc", p.an ? `${p.numar}-${p.an}` : p.numar);
    if (p.titlu) qs.set("titlu", p.titlu);
    if (p.text) qs.set("text1", p.text);
    if (p.inVigoareLa) qs.set("datainvigoaretext", p.inVigoareLa.replace(/-/g, "/"));
    if ([...qs.keys()].length === 0) throw new PortalError("Criterii de căutare lipsă", PORTAL_ORIGIN);
    const url = `${PORTAL_ORIGIN}/Public/RezultateCautare?${qs.toString()}`;
    const { value: html, fetchedAt } = await this.cached(`search:${url}`, () => this.fetchText(url));
    return { url, accesatLa: fetchedAt, total: parseSearchCount(html), rezultate: parseSearchResults(html), tipRezolvat: t?.label ?? null };
  }

  /**
   * Pagina unui act. Fără `formaDeBaza`, portalul afișează cea mai recentă formă consolidată;
   * cu `formaDeBaza`, textul original (sau textul republicat, pentru republicări).
   */
  async getActPage(id: number, formaDeBaza = false): Promise<ActPageOutcome> {
    const url = actUrl(id, undefined, formaDeBaza);
    const { value, fetchedAt } = await this.cached(`act:${id}:${formaDeBaza}`, async () => {
      const page = parseActPage(await this.fetchText(url));
      if (!page.versionId) throw new PortalError("Pagina actului nu a putut fi interpretată", url);
      return page;
    });
    return { page: value, url, accesatLa: fetchedAt };
  }

  async getActions(baseId: number): Promise<{ rows: PortalActionRow[]; accesatLa: string; url: string }> {
    const url = `${PORTAL_ORIGIN}/Public/actiuniSuferite`;
    const { value, fetchedAt } = await this.cached(`actions:${baseId}`, async () => {
      const raw = await this.fetchText(
        url,
        {
          method: "POST",
          body: new URLSearchParams({ contor: String(baseId) }),
          headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" },
        },
      );
      let fragment = raw;
      try {
        fragment = (JSON.parse(raw) as { acte?: string }).acte ?? "";
      } catch {
        /* răspuns HTML direct */
      }
      return parseActionsTable(fragment);
    });
    return { rows: value, accesatLa: fetchedAt, url: actUrl(baseId) };
  }
}

// ───────────────────────── Forma aplicabilă ─────────────────────────

export interface ResolvedVersion {
  version: PortalVersion;
  /** data de referință este anterioară primei forme cunoscute */
  inainteDePrimaForma: boolean;
  toate: PortalVersion[];
}

/**
 * Alege forma aplicabilă la data de referință: ultima formă (consolidare,
 * republicare sau forma de bază) cu data ≤ data de referință.
 */
export function resolveVersionAt(versions: PortalVersion[], baseId: number, baseDate: string | null, date: string): ResolvedVersion {
  const all: PortalVersion[] = [...versions];
  if (!all.some((v) => v.id === baseId)) {
    all.push({ id: baseId, data: baseDate, tip: "baza", eticheta: "Forma de bază", curenta: all.length === 0, formaDeBaza: all.length > 0 });
  }
  const dated = all.filter((v) => v.data).sort((a, b) => (a.data! < b.data! ? 1 : -1));
  if (dated.length === 0) return { version: all[0], inainteDePrimaForma: false, toate: all };
  const pick = dated.find((v) => v.data! <= date);
  if (pick) return { version: pick, inainteDePrimaForma: false, toate: all };
  const earliest = dated[dated.length - 1] ?? all[0];
  return { version: earliest, inainteDePrimaForma: true, toate: all };
}
