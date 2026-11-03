import * as cheerio from "cheerio";
import { clean, parseRoDate } from "@lexai/sources/text";

/**
 * Lista de rezultate a căutării pe Portalul Legislativ (deciziile CCR și ÎCCJ publicate în
 * Monitorul Oficial). Adaptoarele sunt independente între ele, așa că parserul minim al
 * căutării e păstrat aici (același format ca în @lexai/source-portal-legislativ).
 */

export const PORTAL_ORIGIN = "https://legislatie.just.ro";

export interface PortalSearchResult {
  id: number;
  eticheta: string;
  titlu: string;
  descriere: string;
  emitent: string;
  publicat: string;
}

export function portalUrl(id: number): string {
  return `${PORTAL_ORIGIN}/Public/DetaliiDocument/${id}`;
}

function idFromHref(href: string | undefined): number | null {
  const m = href?.match(/DetaliiDocument(?:Afis)?\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export function parseSearchResults(html: string): PortalSearchResult[] {
  const $ = cheerio.load(html);
  const out: PortalSearchResult[] = [];
  $(".search_result_item").each((_, item) => {
    const $item = $(item);
    const link = $item.find("a[href*='DetaliiDocument']").first();
    const id = idFromHref(link.attr("href"));
    if (!id) return;
    const descLines: string[] = [];
    $item
      .find("p")
      .eq(1)
      .find("span")
      .each((__, s) => {
        const t = clean($(s).text());
        if (t) descLines.push(t);
      });
    const eticheta = clean(link.text().replace(/^\d+\.\s*/, ""));
    const emitentIdx = descLines.findIndex((l) => /^EMITENT:?$/i.test(l));
    const publicatIdx = descLines.findIndex((l) => /^PUBLICAT ÎN:?$/i.test(l));
    out.push({
      id,
      eticheta,
      titlu: descLines[0] ?? eticheta,
      descriere: clean(descLines.slice(1, emitentIdx > 0 ? emitentIdx : undefined).join(" ")),
      emitent: emitentIdx >= 0 ? (descLines[emitentIdx + 1] ?? "") : "",
      publicat: publicatIdx >= 0 ? (descLines[publicatIdx + 1] ?? "") : "",
    });
  });
  return out;
}

export function parseSearchCount(html: string): number | null {
  const m = html.match(/(\d+)\s*document\(e\)\s*g[ăa]sit\(e\)/);
  return m ? Number(m[1]) : null;
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

export { parseRoDate };
