import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import { clean, normalizeArticleNumber, parseRoDate } from "@lexai/sources/text";

export { clean, parseRoDate };

/**
 * Parsere pentru paginile Portalului Legislativ (legislatie.just.ro).
 * Structura HTML: S_DEN (denumire), S_EMT (emitent), S_PUB (publicare),
 * S_ART / S_ALN / S_LIT / S_LIN (articol / alineat / literă / liniuță),
 * S_PAR (paragrafe și note de modificare), S_NTA (note).
 */

export interface PortalVersion {
  id: number;
  /** ISO yyyy-mm-dd */
  data: string | null;
  tip: "consolidare" | "republicare" | "baza";
  eticheta: string;
  curenta: boolean;
  /** textul se obține cu ?isFormaDeBaza=True (forma de bază sau republicare) */
  formaDeBaza: boolean;
}

export interface ArticleUnit {
  tip: "alineat" | "litera" | "liniuta" | "paragraf" | "nota_modificare" | "nota";
  /** "(1)", "a)", "–" */
  eticheta: string;
  text: string;
}

export interface PortalArticle {
  /** id-ul elementului HTML (pentru ancoră în URL): "id_artA59" */
  anchorId: string;
  /** "Articolul 6^1" */
  eticheta: string;
  /** număr normalizat: "6^1" */
  numar: string;
  denumire: string;
  unitati: ArticleUnit[];
  /** textul complet, exact așa cum este prezentat agentului și folosit ca dovadă */
  text: string;
  abrogat: boolean;
}

export interface PortalActPage {
  /** id-ul formei afișate (input#id_act) */
  versionId: number;
  denumire: string;
  titluScurt: string;
  emitent: string;
  publicat: string;
  versiuni: PortalVersion[];
  noteAct: string[];
  articole: PortalArticle[];
}

export interface PortalSearchResult {
  id: number;
  eticheta: string;
  titlu: string;
  descriere: string;
  emitent: string;
  publicat: string;
  /** ISO yyyy-mm-dd, dacă a putut fi interpretată */
  intrareInVigoare: string | null;
  intrareInVigoareText: string;
  republicare: boolean;
}

export interface PortalActionRow {
  sectiune: string;
  operatiune: string;
  actId: number | null;
  actEticheta: string;
}

function idFromHref(href: string | undefined): number | null {
  if (!href) return null;
  const m = href.match(/DetaliiDocument(?:Afis)?\/(\d+)/);
  return m ? Number(m[1]) : null;
}

function hasClass(el: Element, cls: string): boolean {
  return (el.attribs?.class ?? "").split(/\s+/).includes(cls);
}

const NOTE_RE = /^\(la \d{2}-\d{2}-\d{4},/;

/** Text propriu al unui nod, sărind elementele ascunse/structurale indicate. */
function textOf($: cheerio.CheerioAPI, node: AnyNode, skip: (el: Element) => boolean, isRoot = true): string {
  if (node.type === "text") return (node as unknown as { data: string }).data;
  if (node.type !== "tag" && node.type !== "script" && node.type !== "style") return "";
  const el = node as Element;
  if (el.name === "script" || el.name === "style") return "";
  if (!isRoot && skip(el)) return "";
  if (el.name === "br") return " ";
  let out = "";
  for (const c of el.children) out += textOf($, c, skip, false);
  return out;
}

const isHidden = (el: Element) =>
  hasClass(el, "TAG_COLLAPSED") ||
  /(^|\s)S_[A-Z]+_SHORT(\s|$)/.test(el.attribs?.class ?? "") ||
  (el.attribs?.style ?? "").replace(/\s/g, "").includes("display:none");

/**
 * Descompune corpul unui articol în unități (alineate, litere, liniuțe, note),
 * păstrând ordinea din document.
 */
function articleUnits($: cheerio.CheerioAPI, body: Element): ArticleUnit[] {
  const units: ArticleUnit[] = [];
  let pending = "";

  const flush = () => {
    const t = clean(pending);
    if (t) units.push({ tip: "paragraf", eticheta: "", text: t });
    pending = "";
  };

  const structural = (el: Element) =>
    hasClass(el, "S_ALN") || hasClass(el, "S_LIT") || hasClass(el, "S_LIN") ||
    hasClass(el, "S_PAR") || hasClass(el, "S_NTA");

  const visit = (node: AnyNode) => {
    if (node.type === "text") {
      pending += (node as unknown as { data: string }).data;
      return;
    }
    if (node.type !== "tag") return;
    const el = node as Element;
    if (isHidden(el)) return;

    if (hasClass(el, "S_ALN") || hasClass(el, "S_LIT") || hasClass(el, "S_LIN")) {
      flush();
      const tip = hasClass(el, "S_ALN") ? "alineat" : hasClass(el, "S_LIT") ? "litera" : "liniuta";
      const prefix = tip === "alineat" ? "S_ALN" : tip === "litera" ? "S_LIT" : "S_LIN";
      const ttl = $(el).children(`.${prefix}_TTL`).first();
      const bdy = $(el).children(`.${prefix}_BDY`).first();
      const eticheta = clean(ttl.text());
      const own = bdy.length ? textOf($, bdy[0], (e) => isHidden(e) || structural(e)) : "";
      units.push({ tip, eticheta, text: clean(own) });
      // unități imbricate (litere în alineat, note de modificare)
      if (bdy.length) for (const c of bdy[0].children) if (c.type === "tag" && structural(c as Element)) visit(c);
      return;
    }
    if (hasClass(el, "S_PAR")) {
      flush();
      const t = clean(textOf($, el, (e) => isHidden(e) || structural(e)));
      if (t) units.push({ tip: NOTE_RE.test(t) ? "nota_modificare" : "paragraf", eticheta: "", text: t });
      for (const c of el.children) if (c.type === "tag" && structural(c as Element)) visit(c);
      return;
    }
    if (hasClass(el, "S_NTA")) {
      flush();
      const t = clean(textOf($, el, (e) => isHidden(e) || hasClass(e, "S_NTA_TTL")));
      if (t) units.push({ tip: "nota", eticheta: "Notă", text: t });
      return;
    }
    for (const c of el.children) visit(c);
  };

  for (const c of body.children) visit(c);
  flush();
  return units;
}

export function renderArticleText(a: Pick<PortalArticle, "eticheta" | "denumire" | "unitati">): string {
  const lines = [a.denumire ? `${a.eticheta} - ${a.denumire}` : a.eticheta];
  for (const u of a.unitati) {
    if (u.tip === "nota_modificare") lines.push(`[Notă de modificare] ${u.text}`);
    else if (u.tip === "nota") lines.push(`[Notă] ${u.text}`);
    else lines.push(u.eticheta ? `${u.eticheta} ${u.text}` : u.text);
  }
  return lines.join("\n");
}

export function parseActPage(html: string): PortalActPage {
  const $ = cheerio.load(html);
  const versionId = Number($("#id_act").attr("value") ?? 0);

  const denumire = clean($(".S_DEN").first().text());
  const titluScurt = clean($("title").text().replace(/-\s*Portal Legislativ\s*$/i, ""));
  const emitent = clean($(".S_EMT_BDY").first().text());
  const publicat = clean($(".S_PUB_BDY").first().text());

  const versiuni: PortalVersion[] = [];
  $("#istoric_fa a").each((_, a) => {
    const title = $(a).attr("title") ?? "";
    const href = $(a).attr("href");
    const id = idFromHref(href) ?? versionId;
    const tip = /republicarea/i.test(title) ? "republicare" : "consolidare";
    versiuni.push({
      id,
      data: parseRoDate(title),
      tip,
      eticheta: clean($(a).text()) || title,
      curenta: !href,
      formaDeBaza: /isFormaDeBaza=True/i.test(href ?? ""),
    });
  });

  // note la nivel de act (ex. republicare cu renumerotare)
  const noteAct: string[] = [];
  $(".S_NTA").each((_, el) => {
    // notele articolelor rămân la articol; o notă care conține articole e un container, nu o notă
    if ($(el).parents(".S_ART").length || $(el).find(".S_ART").length) return;
    const t = clean(textOf($, el, (e) => isHidden(e) || hasClass(e, "S_NTA_TTL")));
    if (t && !noteAct.includes(t)) noteAct.push(t);
  });

  const articole: PortalArticle[] = [];
  $(".S_ART").each((_, el) => {
    if ($(el).parents(".S_ART").length) return; // doar articolele de nivel superior
    const $el = $(el);
    const eticheta = clean($el.children(".S_ART_TTL").first().text());
    const denumireArt = clean($el.children(".S_ART_DEN").first().text());
    const body = $el.children(".S_ART_BDY").first()[0];
    const unitati = body ? articleUnits($, body) : [];
    const numar = normalizeArticleNumber(eticheta);
    const base = { eticheta, denumire: denumireArt, unitati };
    const text = renderArticleText(base);
    const continut = unitati.filter((u) => u.tip !== "nota_modificare" && u.tip !== "nota");
    const abrogat =
      continut.length > 0 &&
      continut.every((u) => /^\(?abrogat[ăe]?\)?[;.]?$/i.test(u.text.trim()));
    articole.push({ anchorId: $el.attr("id") ?? "", eticheta, numar, denumire: denumireArt, unitati, text, abrogat });
  });

  return { versionId, denumire, titluScurt, emitent, publicat, versiuni, noteAct, articole };
}

export function parseSearchResults(html: string): PortalSearchResult[] {
  const $ = cheerio.load(html);
  const out: PortalSearchResult[] = [];
  $(".search_result_item").each((_, item) => {
    const $item = $(item);
    const link = $item.find("a[href*='DetaliiDocument']").first();
    const id = idFromHref(link.attr("href"));
    if (!id) return;
    const eticheta = clean(link.text().replace(/^\d+\.\s*/, ""));
    const ps = $item.find("p");
    const descLines: string[] = [];
    ps.eq(1).find("span").each((__, s) => {
      const t = clean($(s).text());
      if (t) descLines.push(t);
    });
    const joined = descLines.join(" ");
    const titlu = descLines[0] ?? eticheta;
    const emitentIdx = descLines.findIndex((l) => /^EMITENT:?$/i.test(l));
    const publicatIdx = descLines.findIndex((l) => /^PUBLICAT ÎN:?$/i.test(l));
    const vigoareText = clean(ps.eq(2).text()).replace(/^Data intrarii in vigoare:\s*/i, "");
    out.push({
      id,
      eticheta,
      titlu,
      descriere: clean(
        descLines
          .slice(1, emitentIdx > 0 ? emitentIdx : undefined)
          .join(" "),
      ),
      emitent: emitentIdx >= 0 ? descLines[emitentIdx + 1] ?? "" : "",
      publicat: publicatIdx >= 0 ? descLines[publicatIdx + 1] ?? "" : "",
      intrareInVigoare: parseRoDate(vigoareText),
      intrareInVigoareText: vigoareText,
      republicare: /\(R\)/.test(eticheta) || /republicare/i.test(joined),
    });
  });
  return out;
}

export function parseSearchCount(html: string): number | null {
  const m = html.match(/(\d+)\s*document\(e\)\s*g[ăa]sit\(e\)/);
  return m ? Number(m[1]) : null;
}

export function parseActionsTable(fragment: string): PortalActionRow[] {
  const $ = cheerio.load(fragment);
  const rows: PortalActionRow[] = [];
  $("tr").each((_, tr) => {
    const tds = $(tr).children("td");
    if (tds.length !== 3) return;
    const sectiune = clean(tds.eq(0).text());
    if (/^SECTIUNE ACT$/i.test(sectiune)) return;
    const a = tds.eq(2).find("a").first();
    rows.push({
      sectiune,
      operatiune: clean(tds.eq(1).text()).replace(/\s+/g, " "),
      actId: idFromHref(a.attr("href")),
      actEticheta: clean(a.text() || tds.eq(2).text()),
    });
  });
  return rows;
}

export function parseDocTypeOptions(html: string): { value: string; label: string }[] {
  const $ = cheerio.load(html);
  const out: { value: string; label: string }[] = [];
  $("#DocumentType option").each((_, o) => {
    const value = $(o).attr("value") ?? "";
    const label = clean($(o).text());
    if (value && label) out.push({ value, label });
  });
  return out;
}
