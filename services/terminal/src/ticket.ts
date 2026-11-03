import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { secretKey } from "@lexai/db/paths";

/**
 * Tichetele terminalului: aplicația web (doar cererile din propria interfață, vezi proxy.ts)
 * semnează un tichet de scurtă durată, iar serviciul terminalului îl verifică la conectare.
 * Tichetul poartă modul (comanda din lista fixă de mai jos); clientul nu poate trimite
 * argumente proprii.
 *
 * Format: `<payload>.<semnătură>`, ambele base64url; payload = JSON `{ mode, nonce, exp }`,
 * semnătura = HMAC-SHA256 cu cheia locală (secretKey) peste textul payload-ului.
 */

export const TERMINAL_MODES = ["claude", "auth-login", "auth-logout", "auth-status"] as const;
export type TerminalMode = (typeof TERMINAL_MODES)[number];

/** Valabilitatea unui tichet. */
export const TICKET_TTL_MS = 60_000;

const MAX_TOKEN_LENGTH = 1024;
const TOKEN_RE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export type TicketErrorCode = "format" | "semnatura" | "expirat" | "folosit" | "mod";

export class TicketError extends Error {
  constructor(
    message: string,
    public readonly code: TicketErrorCode,
  ) {
    super(message);
    this.name = "TicketError";
  }
}

export function isTerminalMode(value: unknown): value is TerminalMode {
  return typeof value === "string" && (TERMINAL_MODES as readonly string[]).includes(value);
}

function sign(body: string): Buffer {
  return createHmac("sha256", secretKey()).update(body).digest();
}

/** Semnează un tichet de unică folosință, valabil TICKET_TTL_MS. */
export function signTicket({ mode }: { mode: TerminalMode }): string {
  if (!isTerminalMode(mode)) throw new TicketError(`Mod de terminal necunoscut: ${String(mode)}.`, "mod");
  const payload = { mode, nonce: randomBytes(16).toString("base64url"), exp: Date.now() + TICKET_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body).toString("base64url")}`;
}

/** Nonce-urile deja folosite, păstrate până la expirarea tichetului lor. */
const usedNonces = new Map<string, number>();

function pruneNonces(now: number): void {
  for (const [nonce, exp] of usedNonces) if (exp <= now) usedNonces.delete(nonce);
}

/**
 * Verifică un tichet și îl consumă (un tichet merge o singură dată).
 * Întoarce modul sau aruncă TicketError cu motivul.
 */
export function verifyTicket(token: string): { mode: TerminalMode } {
  if (typeof token !== "string" || token.length > MAX_TOKEN_LENGTH || !TOKEN_RE.test(token)) {
    throw new TicketError("Tichet invalid.", "format");
  }
  const [body, sig] = token.split(".") as [string, string];

  const expected = sign(body);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new TicketError("Semnătura tichetului nu este validă.", "semnatura");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new TicketError("Tichet invalid.", "format");
  }
  const { mode, nonce, exp } = (payload ?? {}) as { mode?: unknown; nonce?: unknown; exp?: unknown };
  if (typeof nonce !== "string" || !nonce || typeof exp !== "number" || !Number.isFinite(exp)) {
    throw new TicketError("Tichet invalid.", "format");
  }
  if (!isTerminalMode(mode)) throw new TicketError("Mod de terminal necunoscut.", "mod");

  const now = Date.now();
  // un tichet cu expirarea prea departe nu putea fi emis de signTicket
  if (exp <= now || exp > now + TICKET_TTL_MS + 5_000) throw new TicketError("Tichetul a expirat.", "expirat");

  pruneNonces(now);
  if (usedNonces.has(nonce)) throw new TicketError("Tichetul a fost deja folosit.", "folosit");
  usedNonces.set(nonce, exp);

  return { mode };
}
