import { SourceError } from "./types";

/** Funcția `fetch` folosită de surse (injectabilă în teste). */
export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export const USER_AGENT = "Mozilla/5.0 (compatible; LexAI/1.0; verificare trimiteri legislative)";

export interface FetchTextOptions {
  init?: RequestInit;
  fetch?: FetchFn;
  /** numele sursei în mesajele de eroare, ex. „Portalul Legislativ” */
  label: string;
  sourceId?: string;
  attempts?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** O cerere HTTP cu timeout și reîncercare; erorile devin `SourceError` cu mesaj în română. */
export async function fetchText(url: string, o: FetchTextOptions): Promise<string> {
  const doFetch = o.fetch ?? fetch;
  const attempts = o.attempts ?? 3;
  let lastErr: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (o.signal?.aborted) throw o.signal.reason ?? new Error("Cererea a fost anulată.");
    try {
      const timeout = AbortSignal.timeout(o.timeoutMs ?? 45_000);
      const res = await doFetch(url, {
        ...o.init,
        headers: { "User-Agent": USER_AGENT, "Accept-Language": "ro-RO,ro;q=0.9", ...(o.init?.headers ?? {}) },
        signal: o.signal ? AbortSignal.any([timeout, o.signal]) : timeout,
        redirect: "follow",
      });
      if (!res.ok) throw new SourceError(`${o.label} a răspuns cu ${res.status}`, { url, sourceId: o.sourceId });
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (attempt < attempts - 1) await sleep(800 * (attempt + 1));
    }
  }
  if (lastErr instanceof SourceError) throw lastErr;
  const timeout = lastErr instanceof Error && (lastErr.name === "TimeoutError" || lastErr.name === "AbortError");
  throw new SourceError(`${o.label} nu a putut fi accesat (${timeout ? "nu a răspuns la timp" : "eroare de rețea"})`, { url, sourceId: o.sourceId });
}

/** Adresa este https și aparține unuia dintre domenii (subdomeniile incluse). */
export function urlInDomains(url: string, domains: readonly string[]): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return domains.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
