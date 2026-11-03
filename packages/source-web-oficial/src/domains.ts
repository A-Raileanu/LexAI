/**
 * Domeniile oficiale de pe care cititorul web poate prelua pagini ca dovezi (trimiteri care nu
 * au putut fi verificate în sursele structurate). Lista urmează verificarea accesului automat
 * din 1.11.2026 (docs/surse/surse-legislative.md): sunt incluse doar site-urile care răspund
 * fără CAPTCHA sau WAF și ale căror robots.txt și termeni nu interzic accesul automat.
 * Subdomeniile sunt incluse (ex. „gov.ro” acoperă „mfinante.gov.ro”), cu excepțiile din
 * BLOCKED_HOSTS.
 *
 * Excluse intenționat: csm1909.ro și rejust.ro (blochează agenții AI / CAPTCHA),
 * eur-lex.europa.eu (AWS WAF; legislația UE se citește prin CELLAR), curia.europa.eu (doar
 * JavaScript), onrc.ro (portalurile cer cont), consiliulconcurentei.ro (termenii interzic
 * păstrarea computerizată), ancpi.ro (robots.txt interzice agenții AI).
 */
export const WEB_SOURCE_DOMAINS = [
  // legislație și proiecte
  "legislatie.just.ro",
  "just.ro",
  "monitoruloficial.ro",
  "cdep.ro",
  "senat.ro",
  "gov.ro",
  // jurisprudență
  "ccr.ro",
  "scj.ro",
  "cab1864.eu",
  "cnsc.ro",
  // fiscal și autorități
  "anaf.ro",
  "bnr.ro",
  "dataprotection.ro",
  "asfromania.ro",
  "ancom.ro",
  "anre.ro",
  "anpc.ro",
  "inspectiamuncii.ro",
  "avp.ro",
  "unbr.ro",
  "uniuneanotarilor.ro",
  // dreptul Uniunii (CELLAR) și Consiliul Europei
  "publications.europa.eu",
  "echr.coe.int",
  "docs-venice.coe.int",
] as const;

/**
 * Gazde din domeniile de mai sus care blochează accesul automat sau îl interzic prin
 * robots.txt; se refuză chiar dacă domeniul părinte e acceptat.
 */
export const BLOCKED_HOSTS = [
  "portal.just.ro", // Cloudflare; robots.txt interzice ClaudeBot și orice URL cu „?”
  "rnong.just.ro", // Cloudflare
  "e-consultare.gov.ro", // reCAPTCHA, API intern nedocumentat
  "curs.bnr.ro", // robots.txt: Disallow: / (feedul de curs cere acordul BNR)
  "www.anaf.ro", // WAF (WebSEAL / F5): „Acces interzis” pentru clienți automați
  "anaf.ro",
] as const;

/** Site-uri oficiale care funcționează doar prin HTTP (HTTPS expiră sau dă eroare). */
export const HTTP_ONLY_DOMAINS = ["cnsc.ro"] as const;

function hostMatches(host: string, domains: readonly string[]): boolean {
  return domains.some((d) => host === d || host.endsWith(`.${d}`));
}

/**
 * Adresa aparține unui domeniu oficial acceptat: https (sau http pentru HTTP_ONLY_DOMAINS)
 * și nu este o gazdă blocată.
 */
export function isAllowedSourceUrl(url: string, domains: readonly string[] = WEB_SOURCE_DOMAINS): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  const host = u.hostname.toLowerCase();
  if ((BLOCKED_HOSTS as readonly string[]).includes(host)) return false;
  if (!hostMatches(host, domains)) return false;
  if (u.protocol === "https:") return true;
  return u.protocol === "http:" && hostMatches(host, HTTP_ONLY_DOMAINS);
}
