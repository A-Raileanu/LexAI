import "server-only";

/**
 * Adresa serviciului de terminal (services/terminal), care ascultă doar pe 127.0.0.1.
 * Configurabilă cu LEXAI_TERMINAL_PORT (implicit 3101); browserul primește URL-ul WS
 * de la server, ca să nu fie fixat în bundle.
 */
const DEFAULT_PORT = 3101;

function port(): number {
  const n = Number(process.env.LEXAI_TERMINAL_PORT);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : DEFAULT_PORT;
}

export function terminalWsUrl(): string {
  return `ws://127.0.0.1:${port()}/pty`;
}

export function terminalHealthUrl(): string {
  return `http://127.0.0.1:${port()}/health`;
}

export type TerminalHealth = { ok: true; busy: boolean } | { ok: false };

/** GET /health cu timeout scurt; orice eroare = serviciul nu rulează. */
export async function checkTerminalHealth(timeoutMs = 1500): Promise<TerminalHealth> {
  try {
    const res = await fetch(terminalHealthUrl(), { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { ok: false };
    const body = (await res.json()) as { ok?: unknown; busy?: unknown };
    return body.ok === true ? { ok: true, busy: body.busy === true } : { ok: false };
  } catch {
    return { ok: false };
  }
}
