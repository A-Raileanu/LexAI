/**
 * Extragerea linkurilor din ieșirea terminalului (pentru banda-ajutor `claude auth login`).
 * Fără dependențe: folosit în browser și în teste.
 */

// OSC 8 (hyperlink): ESC ] 8 ; params ; URL (BEL | ESC \)
const OSC8 = /\x1b\]8;[^;\x07\x1b]*;([^\x07\x1b]*)(?:\x07|\x1b\\)/g;
// alte secvențe OSC, CSI și escape-uri simple
const OSC = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const CSI = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const ESC = /\x1b[@-Z\\-_]/g;
const URL_RE = /https?:\/\/[^\s"'<>`\x00-\x1f\x7f]+/g;
// punctuație care încheie de obicei o propoziție, nu un URL
const TRAILING = /[.,;:!?)\]}»”’]+$/;

/** Textul fără secvențele de control ANSI. */
export function stripAnsi(text: string): string {
  return text.replace(OSC, "").replace(CSI, "").replace(ESC, "").replace(/\r/g, "");
}

function clean(url: string): string | null {
  let u = url.replace(TRAILING, "");
  // o paranteză închisă rămâne dacă face parte din URL (are pereche deschisă)
  if (url.length > u.length && url[u.length] === ")" && u.includes("(")) u += ")";
  try {
    const parsed = new URL(u);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

/** Toate URL-urile http(s) distincte din ieșire, în ordinea apariției. */
export function extractUrls(output: string): string[] {
  const found: string[] = [];
  const add = (u: string | null) => {
    if (u && !found.includes(u)) found.push(u);
  };
  for (const m of output.matchAll(OSC8)) if (m[1]) add(clean(m[1]));
  for (const m of stripAnsi(output).matchAll(URL_RE)) add(clean(m[0]));
  return found;
}

/**
 * Linkul de autorizare din ieșirea `claude auth login`: ultimul URL care pare de
 * autentificare (oauth / authorize / login); altfel ultimul URL găsit.
 */
export function findLoginUrl(output: string): string | null {
  const urls = extractUrls(output);
  if (!urls.length) return null;
  const auth = urls.filter((u) => /oauth|authorize|login|auth/i.test(u));
  return (auth.length ? auth : urls).at(-1) ?? null;
}

/** „https://claude.ai/oauth/authorize?…” scurtat la mijloc, pentru ecrane înguste. */
export function middleTruncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const keep = max - 1;
  const head = Math.ceil(keep * 0.6);
  return `${text.slice(0, head)}…${text.slice(text.length - (keep - head))}`;
}
