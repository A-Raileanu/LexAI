import { MemorySourceCache, SourceError, cached, fetchText, type CitestePaginaResult, type FetchFn, type LegalSource, type SourceCache } from "@lexai/sources";
import { WEB_SOURCE_DOMAINS, isAllowedSourceUrl } from "./domains";
import { pageText } from "./page";

/**
 * Sursa „Pagini web oficiale”: citește o pagină HTML de pe un domeniu oficial acceptat și o
 * înregistrează ca dovadă (folosită la recuperarea trimiterilor neverificate în celelalte surse).
 */

export const WEB_OFICIAL_SOURCE_ID = "web-oficial";
const TTL_MS = 6 * 60 * 60 * 1000;

export interface WebOficialSourceOptions {
  id?: string;
  label?: string;
  cache?: SourceCache;
  fetch?: FetchFn;
  /** domeniile acceptate (implicit WEB_SOURCE_DOMAINS) */
  domains?: readonly string[];
}

export function createWebOficialSource(opts: WebOficialSourceOptions = {}): LegalSource {
  const id = opts.id ?? WEB_OFICIAL_SOURCE_ID;
  const cache = opts.cache ?? new MemorySourceCache();
  const domains = opts.domains ?? WEB_SOURCE_DOMAINS;

  return {
    id,
    label: opts.label ?? "Pagini web oficiale",
    description: "pagini web oficiale (monitoruloficial.ro, ccr.ro, scj.ro, cdep.ro, *.gov.ro, static.anaf.ro, autorități de reglementare, CELLAR etc.)",
    capabilities: new Set(["citeste_pagina"] as const),
    trustsUrl: (url) => isAllowedSourceUrl(url, domains),

    async citestePagina(p, ctx): Promise<CitestePaginaResult> {
      if (!isAllowedSourceUrl(p.url, domains)) {
        throw new SourceError(`Adresa ${p.url} nu aparține unui site oficial acceptat (domeniile din descrierea instrumentului; unele site-uri sunt excluse pentru că blochează accesul automat).`, { url: p.url, sourceId: id, kind: "refuz" });
      }
      if (/\.pdf($|[?#])/i.test(p.url)) {
        ctx.activity?.(`Ignor pagina PDF (nu poate fi folosită ca dovadă verificabilă): ${p.url}`);
        throw new SourceError("Paginile PDF nu pot fi folosite ca dovadă verificabilă. Caută o versiune HTML a documentului.", { url: p.url, sourceId: id, kind: "refuz" });
      }
      const { value, fetchedAt } = await cached(cache, { sourceId: id, key: `page:${p.url}`, ttlMs: TTL_MS }, () =>
        fetchText(p.url, { fetch: opts.fetch, label: new URL(p.url).hostname, sourceId: id }),
      );
      const { titlu, text } = pageText(value);
      if (!text) throw new SourceError(`Pagina ${p.url} nu conține text lizibil.`, { url: p.url, sourceId: id, kind: "refuz" });
      ctx.activity?.(`Citesc pagina: ${p.url}`);
      return { url: p.url, titlu, dovada: { type: "sursa_web", text, url: p.url, accesatLa: fetchedAt, unitate: titlu || undefined } };
    },
  };
}
