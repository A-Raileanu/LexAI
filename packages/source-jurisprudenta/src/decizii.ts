import * as cheerio from "cheerio";
import { MemorySourceCache, SourceError, cached, fetchText, urlInDomains, type DecizieGasita, type FetchFn, type FelDecizie, type Instanta, type SourceCache } from "@lexai/sources";
import { looseKey, normalizeArticleNumber } from "@lexai/sources/text";
import { PORTAL_ORIGIN, parseDocTypeOptions, parseRoDate, parseSearchCount, parseSearchResults, portalUrl, type PortalSearchResult } from "./portal-search";

/**
 * Jurisprudența cu efect asupra textului legii: deciziile Curții Constituționale și
 * deciziile ÎCCJ pentru dezlegarea unor chestiuni de drept (HP) sau în interesul legii (RIL).
 * Sursele: Portalul Legislativ (deciziile publicate în Monitorul Oficial) și scj.ro
 * (căutarea în jurisprudența ÎCCJ, inclusiv minutele încă nepublicate).
 */

export type { DecizieGasita, FelDecizie, Instanta };

export const JURISPRUDENTA_SOURCE_ID = "jurisprudenta";
export const JURISPRUDENTA_HOSTS = ["legislatie.just.ro", "scj.ro"];

/** Data intrării în vigoare a codurilor actuale: deciziile mai vechi privesc codurile anterioare. */
const CODE_START: Record<string, string> = {
  "codul civil": "2011-10-01",
  "codul de procedura civila": "2013-02-15",
  "codul penal": "2014-02-01",
  "codul de procedura penala": "2014-02-01",
  "codul fiscal": "2016-01-01",
  "codul de procedura fiscala": "2016-01-01",
};

/** Legile de aprobare ale codurilor: deciziile citează „Codul civil”, nu „Legea nr. 287/2009”. */
export const CODE_LAWS: Record<string, string> = {
  "287/2009": "codul civil",
  "53/2003": "codul muncii",
  "134/2010": "codul de procedura civila",
  "135/2010": "codul de procedura penala",
  "286/2009": "codul penal",
  "227/2015": "codul fiscal",
  "207/2015": "codul de procedura fiscala",
};

export interface DecizieText extends DecizieGasita {
  text: string;
  /** partea finală („DECIDE: …”), cu soluția */
  dispozitiv: string | null;
  solutie: string | null;
  accesatLa: string;
}

// ───────────────────────── Clasificare ─────────────────────────

export function classifyDecision(emitent: string, text: string): { instanta: Instanta | null; fel: FelDecizie } {
  const e = looseKey(emitent);
  const t = looseKey(text);
  if (/constitutional/.test(e) || /(exceptia|obiectia) de neconstitutionalitate/.test(t)) {
    if (/obiectia de neconstitutionalitate/.test(t)) return { instanta: "ccr", fel: "ccr_obiectie" };
    if (/exceptia de neconstitutionalitate/.test(t)) return { instanta: "ccr", fel: "ccr_exceptie" };
    return { instanta: "ccr", fel: "ccr_alta" };
  }
  // pe portal, emitentul deciziilor ÎCCJ lipsește uneori; descrierea le trădează
  if (/casatie|iccj/.test(e) || /hotar[aâ]ri(i)? prealabile|chestiun(i|ii|ea) de drept|interesul legii|referitoare la interpretarea|privind interpretarea/.test(t)) {
    if (/hotar[aâ]ri(i)? prealabile|chestiun(i|ii|ea) de drept/.test(t)) return { instanta: "iccj", fel: "iccj_hp" };
    if (/interesul legii|interpretarea si aplicarea unitara/.test(t)) return { instanta: "iccj", fel: "iccj_ril" };
    if (/(referitoare la|privind) interpretarea/.test(t)) return { instanta: "iccj", fel: "iccj_hp" };
    return { instanta: "iccj", fel: "iccj_alta" };
  }
  return { instanta: null, fel: "alta" };
}

/** Soluția, din dispozitiv (prima frază după „DECIDE:”). */
export function solutieDin(dispozitiv: string | null): string | null {
  if (!dispozitiv) return null;
  const d = looseKey(dispozitiv.replace(/^[\s\S]*?D\s?E\s?C\s?I\s?D\s?E\s*:?/, "")).slice(0, 600);
  if (/^\s*admite (exceptia|obiectia)/.test(d)) {
    return /in masura in care|numai in (masura|interpretarea)/.test(d)
      ? "admisă – decizie interpretativă (textul e constituțional doar în interpretarea dată de Curte)"
      : "admisă – dispozițiile au fost constatate neconstituționale";
  }
  if (/^\s*admite (sesizarea|recursul)/.test(d)) return "admisă – dezlegarea dată este obligatorie";
  if (/^\s*respinge,? ca inadmisibil/.test(d)) return "respinsă ca inadmisibilă";
  if (/^\s*respinge,? ca neintemeiat/.test(d)) return "respinsă ca neîntemeiată";
  if (/^\s*respinge/.test(d)) return "respinsă";
  return null;
}

// ───────────────────────── Text ─────────────────────────

/** Textul unui bloc HTML, cu paragrafe pe rânduri separate (fără variantele „pe scurt”). */
function blockText($: cheerio.CheerioAPI, root: ReturnType<cheerio.CheerioAPI>): string {
  root.find('script, style, [class$="_SHORT"]').remove();
  root.find("br").replaceWith("\n");
  root.find(".S_DEN, .S_HDR, .S_EMT, .S_PUB, .S_PAR, .S_PCT, .S_ALN, .S_LIT, .S_SMN_PAR, .S_ART, p, div, tr, li, h1, h2, h3").each((_, e) => {
    $(e).prepend("\n");
  });
  return root
    .text()
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** Textul unei pagini HTML oarecare de pe o sursă oficială. */
export function htmlToText(html: string): { titlu: string; text: string } {
  const $ = cheerio.load(html);
  const titlu = $("title").first().text().replace(/\s+/g, " ").trim();
  const main = $("main, article, #content, .content, #document1, #text").first();
  return { titlu, text: blockText($, main.length ? main : $("body")) };
}

function dispozitivDin(text: string): string | null {
  const all = [...text.matchAll(/D\s?E\s?C\s?I\s?D\s?E\s*:/g)];
  const last = all.at(-1);
  if (last?.index === undefined) return null;
  const rest = text.slice(last.index);
  const end = rest.search(/Pronunțat[ăa] |Pronunţat[ăa] /);
  return (end > 0 ? rest.slice(0, rest.indexOf("\n", end) > 0 ? rest.indexOf("\n", end) : undefined) : rest).slice(0, 6000).trim();
}

export function parsePortalDecision(html: string, id: number, fetchedAt: string): DecizieText {
  const url = portalUrl(id);
  const $ = cheerio.load(html);
  const titlu = $(".S_DEN").first().text().replace(/\s+/g, " ").trim();
  if (!titlu) throw new SourceError("Pagina deciziei nu a putut fi interpretată", { url, sourceId: JURISPRUDENTA_SOURCE_ID });
  const emitent = $(".S_EMT_BDY").first().text().replace(/\s+/g, " ").trim();
  const publicat = $(".S_PUB_BDY").first().text().replace(/\s+/g, " ").trim();
  const root = $("#div_Formaconsolidata").length ? $("#div_Formaconsolidata") : $("body");
  const text = blockText($, root);
  const descriere = text.split("\n").find((l) => /^referitoare|^privind|^pentru/i.test(l)) ?? "";
  const dispozitiv = dispozitivDin(text);
  return {
    id: String(id),
    titlu,
    descriere,
    ...classifyDecision(emitent, `${titlu} ${descriere} ${text.slice(0, 3000)}`),
    data: parseRoDate(titlu),
    publicat,
    url,
    text,
    dispozitiv,
    solutie: solutieDin(dispozitiv),
    accesatLa: fetchedAt,
  };
}

export function parseScjDecision(html: string, id: string, fetchedAt: string): DecizieText {
  const url = scjDecisionUrl(id);
  const $ = cheerio.load(html);
  const root = $(".jurisprudence_details");
  if (!root.length) throw new SourceError("Decizia nu a fost găsită pe scj.ro", { url, sourceId: JURISPRUDENTA_SOURCE_ID });
  const text = blockText($, root);
  const lines = text.split("\n");
  const i = lines.findIndex((l) => /^(Decizia|Decizie|Minuta)/i.test(l));
  const nr = i < 0 ? "" : /nr\.?$/i.test(lines[i]) ? `${lines[i]} ${lines[i + 1] ?? ""}` : lines[i];
  const complet = lines.slice(0, Math.max(i, 0)).find((l) => /complet|sec[țţ]i/i.test(l));
  const titlu = `${nr || lines[0] || "Decizie"}${complet ? ` – ${complet}` : ""} (ÎCCJ)`;
  const publicat = lines.find((l) => /^Publicat/i.test(l)) ?? "";
  const dispozitiv = dispozitivDin(text);
  return {
    id: `iccj:${id}`,
    titlu,
    descriere: lines.slice(0, 6).join(" ").slice(0, 400),
    ...classifyDecision("ÎCCJ", text.slice(0, 3000)),
    data: parseRoDate(lines.find((l) => /^Pronun/i.test(l)) ?? titlu),
    publicat,
    url,
    text,
    dispozitiv,
    solutie: solutieDin(dispozitiv),
    accesatLa: fetchedAt,
  };
}

/** Pasajele textului care conțin expresia (cu câteva rânduri de context). */
export function passages(text: string, expr: string, max = 5): string[] {
  // fără comprimarea spațiilor, ca pozițiile din textul pliat să corespundă originalului
  const fold = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const key = fold(expr.normalize("NFC")).replace(/\s+/g, " ").trim();
  if (!key) return [];
  const src = text.normalize("NFC");
  const folded = fold(src);
  const out: string[] = [];
  let from = 0;
  while (out.length < max) {
    const i = folded.indexOf(key, from);
    if (i < 0) break;
    // pozițiile coincid: eliminarea diacriticelor păstrează un caracter pentru fiecare literă
    const start = src.lastIndexOf("\n", Math.max(0, i - 400)) + 1;
    const endNl = src.indexOf("\n", i + key.length + 400);
    out.push(src.slice(start, endNl < 0 ? undefined : endNl).trim());
    from = endNl < 0 ? folded.length : endNl;
  }
  return out;
}

// ───────────────────────── Căutare ─────────────────────────

export interface DecisionQuery {
  /** actul: număr și an (ex. 31, 1990) sau numele codului (ex. „codul civil”) */
  numar?: string | null;
  an?: string | null;
  cod?: string | null;
  articol?: string | null;
  instanta?: Instanta | null;
  maxPagini?: number;
}

export interface DecisionSearchResult {
  rezultate: DecizieGasita[];
  /** decizii găsite de portal pentru expresia căutată, înainte de filtrare */
  totalPortal: number | null;
  paginiCitite: number;
  complet: boolean;
  urlCautare: string;
  accesatLa: string;
}

function articleTokens(segment: string): string[] {
  const s = segment.replace(/\([^)]*\)/g, " ").replace(/\b(lit|pct|teza|tezele|alin|sintagma|partea)\b\.?\s*[\w^]+\)?/g, " ");
  return (s.match(/\d+(?:\.\d{3})*(?:\s*\^\s*\d+|\s*ind\.?\s*\d+)?/g) ?? []).map((t) => normalizeArticleNumber(t));
}

const SCJ_ORIGIN = "https://www.scj.ro";
const SCJ_SEARCH_URL = `${SCJ_ORIGIN}/736/Cautare-jurisprudenta`;
/** Completele ale căror decizii sunt obligatorii: HP și RIL (vechile RIL: Secțiile Unite). */
const SCJ_COMPLETE: Record<"hp" | "ril", string[]> = { hp: ["202"], ril: ["210", "163"] };

const scjQuery = (pairs: [string, string][]) =>
  pairs.map(([k, v], i) => `customQuery%5B${i}%5D.Key=${encodeURIComponent(k)}&customQuery%5B${i}%5D.Value=${encodeURIComponent(v)}`).join("&");

/**
 * Câmpurile formularului de căutare de pe scj.ro (/736), în ordinea din pagină. Site-ul
 * acceptă căutarea doar cu formularul complet: un GET cu o parte din chei dă HTTP 500
 * pentru unele combinații (ex. an + tip de document), deci trimitem mereu toate cele 16,
 * prin POST, ca formularul site-ului (verificat pe 1.11.2026, docs/surse/surse-legislative.md).
 */
export const SCJ_SEARCH_KEYS = [
  "Keywords",
  "Department",
  "DecisionNumber",
  "DecisionDate",
  "DecisionYear",
  "DocketNumber",
  "DocketYear",
  "UniqueDocketNumber",
  "PublishedInMofNr",
  "PublishedInMofDate",
  "Language",
  "SolutionType",
  "DocumentType",
  "MatterType",
  "Keyword",
  "AndOr",
] as const;
export type ScjSearchKey = (typeof SCJ_SEARCH_KEYS)[number];

/** Corpul POST al căutării: toate cele 16 câmpuri, cele nefolosite goale; „AndOr” implicit „și” (0). */
export function scjSearchBody(values: Partial<Record<ScjSearchKey, string>>): string {
  const body = new URLSearchParams({ formTypeId: "6", websiteId: "0" });
  SCJ_SEARCH_KEYS.forEach((key, i) => {
    body.append(`CustomQuery[${i}].Key`, key);
    body.append(`CustomQuery[${i}].Value`, values[key] ?? (key === "AndOr" ? "0" : ""));
  });
  return body.toString();
}

export function scjDecisionUrl(id: string): string {
  return `${SCJ_ORIGIN}/1093/Detalii-jurisprudenta?${scjQuery([["id", id]])}`;
}

const TTL_MS = 6 * 60 * 60 * 1000;

export interface JurisprudentaClientOptions {
  cache?: SourceCache;
  fetch?: FetchFn;
  sourceId?: string;
}

export class JurisprudentaClient {
  readonly cache: SourceCache;
  private readonly sourceId: string;

  constructor(private readonly opts: JurisprudentaClientOptions = {}) {
    this.cache = opts.cache ?? new MemorySourceCache();
    this.sourceId = opts.sourceId ?? JURISPRUDENTA_SOURCE_ID;
  }

  /** O pagină de pe portal sau de pe scj.ro, cu cache și momentul accesării. */
  async getPage(url: string): Promise<{ value: string; fetchedAt: string }> {
    if (!urlInDomains(url, JURISPRUDENTA_HOSTS)) throw new SourceError("Adresa nu aparține unei surse de jurisprudență acceptate", { url, sourceId: this.sourceId, kind: "refuz" });
    const label = /scj\.ro/.test(url) ? "Site-ul ÎCCJ (scj.ro)" : "Portalul Legislativ";
    return cached(this.cache, { sourceId: this.sourceId, key: `page:${url}`, ttlMs: TTL_MS }, () =>
      fetchText(url, { fetch: this.opts.fetch, label, sourceId: this.sourceId }),
    );
  }

  private async decisionDocType(): Promise<string> {
    const { value } = await cached(this.cache, { sourceId: this.sourceId, key: "doctypes", ttlMs: TTL_MS }, async () =>
      parseDocTypeOptions(await fetchText(`${PORTAL_ORIGIN}/Public/Acasa`, { fetch: this.opts.fetch, label: "Portalul Legislativ", sourceId: this.sourceId })),
    );
    const t = value.find((x) => looseKey(x.label) === "decizie");
    if (!t) throw new SourceError("Tipul „DECIZIE” nu a fost găsit pe portal", { url: PORTAL_ORIGIN, sourceId: this.sourceId });
    return t.value;
  }

  async searchDecisions(q: DecisionQuery): Promise<DecisionSearchResult> {
    const tip = await this.decisionDocType();
    const numar = q.numar?.replace(/\D/g, "") || null;
    const cod = q.cod ? looseKey(q.cod).replace(/^cod(ul)?\s+/, "codul ") : null;
    if (!cod && !(numar && q.an)) throw new SourceError("Indicați actul: număr și an, sau codul", { url: PORTAL_ORIGIN, sourceId: this.sourceId, kind: "refuz" });
    const art = q.articol ? normalizeArticleNumber(q.articol) : null;

    // Portalul caută titlul ca expresie exactă: pentru legi, „nr. 31/1990”; pentru coduri,
    // numele codului, pentru că deciziile citează „Codul civil”, nu legea de aprobare.
    // Codurile sunt citate și prin legea de aprobare („Legea nr. 53/2003 – Codul muncii”): ambele expresii.
    const phrases = [cod, numar && q.an ? `nr. ${numar}/${q.an}` : null].filter((x): x is string => !!x);
    const urls = phrases.map((ph) => `${PORTAL_ORIGIN}/Public/RezultateCautare?titlu=${encodeURIComponent(ph)}&tipdoc=${tip}`);

    const all: PortalSearchResult[] = [];
    let total = 0;
    let complet = true;
    let paginiCitite = 0;
    let accesatLa = "";
    for (const base of urls) {
      const first = await this.getPage(base);
      accesatLa ||= first.fetchedAt;
      const count = parseSearchCount(first.value) ?? 0;
      total += count;
      const pages = Math.max(1, Math.ceil(count / 10));
      const maxPages = Math.min(pages, q.maxPagini ?? 50);
      if (maxPages < pages) complet = false;
      paginiCitite += maxPages;
      all.push(...parseSearchResults(first.value));
      for (let p = 2; p <= maxPages; p += 4) {
        const batch = await Promise.all(
          Array.from({ length: Math.min(4, maxPages - p + 1) }, (_, i) => this.getPage(`${base}&page=${p + i}`).then((r) => parseSearchResults(r.value))),
        );
        for (const b of batch) all.push(...b);
      }
    }
    const codeStart = cod ? CODE_START[cod] : undefined;

    const actAfter = (after: string) => {
      const nr = after.match(/nr\.?\s*([\d.]+)\s*\/\s*(\d{4})/);
      if (numar && q.an && nr && (nr.index ?? 99) < 70 && nr[1].replace(/\./g, "") === numar && nr[2] === q.an) return true;
      if (!cod || !after.startsWith(cod)) return false;
      // „Codul civil din 1864” nu este Codul civil în vigoare
      const year = after.slice(cod.length).match(/^\s*(?:din\s+|\()(\d{4})/)?.[1];
      return !year || !q.an || year === q.an;
    };

    const rezultate: DecizieGasita[] = [];
    const seen = new Set<number>();
    for (const r of all) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      const descriere = r.descriere ?? "";
      const { instanta, fel } = classifyDecision(r.emitent, `${r.titlu} ${descriere}`);
      if (q.instanta && instanta !== q.instanta) continue;
      let potrivire: DecizieGasita["potrivire"];
      if (art) {
        const d = looseKey(descriere);
        let mentioned = false;
        for (const m of d.matchAll(/\bart(?:icolului|\.)?\s+(.+?)\s+din\s+(?=(.{0,90}))/g)) {
          if (articleTokens(m[1]).includes(art)) {
            mentioned = true;
            if (actAfter(m[2])) potrivire = "articol";
          }
        }
        // articolul apare, dar legat de alt act sau fără act explicit („din aceeași lege”)
        if (!potrivire && mentioned) potrivire = "posibil";
        if (!potrivire) continue;
      }
      const data = parseRoDate(r.titlu);
      const vechi = codeStart && data && data < codeStart && !(numar && looseKey(descriere).includes(`${numar}/${q.an}`));
      rezultate.push({
        id: String(r.id),
        titlu: r.titlu,
        descriere,
        instanta,
        fel,
        data,
        publicat: r.publicat ?? "",
        url: portalUrl(r.id),
        potrivire,
        ...(vechi ? { nota: `anterioară intrării în vigoare a codului actual (${codeStart}); probabil privește codul anterior` } : {}),
      });
    }
    rezultate.sort((a, b) => (b.data ?? "").localeCompare(a.data ?? "") || Number(b.potrivire === "articol") - Number(a.potrivire === "articol"));
    return { rezultate, totalPortal: total, paginiCitite, complet, urlCautare: urls[0], accesatLa };
  }

  async readPortalDecision(id: number): Promise<DecizieText> {
    const { value, fetchedAt } = await this.getPage(portalUrl(id));
    return parsePortalDecision(value, id, fetchedAt);
  }

  /** O căutare pe scj.ro: POST cu formularul complet, cu cache după conținutul formularului. */
  private searchScjPage(values: Partial<Record<ScjSearchKey, string>>): Promise<{ value: string; fetchedAt: string }> {
    const body = scjSearchBody(values);
    return cached(this.cache, { sourceId: this.sourceId, key: `scj:cautare:${body}`, ttlMs: TTL_MS }, () =>
      fetchText(SCJ_SEARCH_URL, {
        fetch: this.opts.fetch,
        label: "Site-ul ÎCCJ (scj.ro)",
        sourceId: this.sourceId,
        init: { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      }),
    );
  }

  async searchScj(
    expresie: string,
    complet: "hp" | "ril" | "toate" = "toate",
    filtre: { an?: string | null; numar?: string | null } = {},
  ): Promise<{ rezultate: DecizieGasita[]; urlCautare: string; accesatLa: string }> {
    const depts = complet === "toate" ? [null] : SCJ_COMPLETE[complet];
    const pages = await Promise.all(
      depts.map((d) =>
        this.searchScjPage({
          Keywords: expresie,
          ...(d ? { Department: d } : {}),
          ...(filtre.an ? { DecisionYear: filtre.an } : {}),
          ...(filtre.numar ? { DecisionNumber: filtre.numar } : {}),
        }),
      ),
    );
    const rezultate: DecizieGasita[] = [];
    const seen = new Set<string>();
    for (const page of pages) {
      const $ = cheerio.load(page.value);
      $("table tbody tr").each((_, tr) => {
        const td = $(tr).find("td");
        const a = $(td[2]).find("a");
        const id = (a.attr("href") ?? "").match(/Value=(\d+)/)?.[1];
        if (!id || seen.has(id)) return;
        seen.add(id);
        const sectie = $(td[1]).text().replace(/\s+/g, " ").trim();
        const titlu = $(td[4]).text().replace(/\s+/g, " ").trim();
        const { fel } = classifyDecision("ÎCCJ", `${sectie} ${titlu}`);
        rezultate.push({
          id: `iccj:${id}`,
          titlu: `${a.text().trim()} – ${sectie}`,
          descriere: titlu,
          instanta: "iccj",
          fel,
          data: parseRoDate($(td[3]).text()),
          publicat: /minut/i.test(titlu) ? "minută (decizia nu e încă redactată sau publicată)" : "",
          url: scjDecisionUrl(id),
        });
      });
    }
    return { rezultate, urlCautare: SCJ_SEARCH_URL, accesatLa: pages[0].fetchedAt };
  }

  async readScjDecision(id: string): Promise<DecizieText> {
    const { value, fetchedAt } = await this.getPage(scjDecisionUrl(id));
    return parseScjDecision(value, id, fetchedAt);
  }

  /** Decizia după id: număr (Portalul Legislativ) sau „iccj:<număr>” (scj.ro). */
  async readDecision(id: string): Promise<DecizieText> {
    const t = id.trim();
    if (/^iccj:\d+$/i.test(t)) return this.readScjDecision(t.slice(5));
    if (/^\d+$/.test(t)) return this.readPortalDecision(Number(t));
    throw new SourceError("Id de decizie invalid: folosiți un număr (Portalul Legislativ) sau iccj:<număr> (scj.ro).", { sourceId: this.sourceId, kind: "refuz" });
  }
}
