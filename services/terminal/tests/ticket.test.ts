import { createHmac } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

// cheia secretă se creează în directorul de date: folosim unul temporar
process.env.LEXAI_DATA_DIR = mkdtempSync(path.join(tmpdir(), "lexai-terminal-ticket-"));
const { signTicket, verifyTicket, TicketError, TICKET_TTL_MS, TERMINAL_MODES } = await import("../src/ticket");
const { secretKey } = await import("@lexai/db/paths");

function forge(payload: unknown): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", secretKey()).update(body).digest("base64url")}`;
}

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    if (e instanceof TicketError) return e.code;
    throw e;
  }
  return undefined;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("tichetele terminalului", () => {
  it("semnează și verifică fiecare mod permis", () => {
    for (const mode of TERMINAL_MODES) {
      expect(verifyTicket(signTicket({ mode }))).toEqual({ mode });
    }
  });

  it("respinge tichetul expirat", () => {
    vi.useFakeTimers();
    const token = signTicket({ mode: "auth-status" });
    vi.advanceTimersByTime(TICKET_TTL_MS + 1);
    expect(codeOf(() => verifyTicket(token))).toBe("expirat");
  });

  it("acceptă tichetul chiar înainte de expirare", () => {
    vi.useFakeTimers();
    const token = signTicket({ mode: "auth-status" });
    vi.advanceTimersByTime(TICKET_TTL_MS - 1_000);
    expect(verifyTicket(token)).toEqual({ mode: "auth-status" });
  });

  it("respinge tichetul modificat", () => {
    const token = signTicket({ mode: "auth-status" });
    const [body, sig] = token.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    const changedBody = Buffer.from(JSON.stringify({ ...payload, mode: "claude" })).toString("base64url");
    expect(codeOf(() => verifyTicket(`${changedBody}.${sig}`))).toBe("semnatura");

    const flipped = sig[0] === "A" ? `B${sig.slice(1)}` : `A${sig.slice(1)}`;
    expect(codeOf(() => verifyTicket(`${body}.${flipped}`))).toBe("semnatura");
    expect(codeOf(() => verifyTicket(`${body}.${sig.slice(0, -4)}`))).toBe("semnatura");
  });

  it("respinge tichetul semnat cu altă cheie", () => {
    const body = Buffer.from(JSON.stringify({ mode: "claude", nonce: "x", exp: Date.now() + 10_000 })).toString("base64url");
    const sig = createHmac("sha256", Buffer.alloc(32, 7)).update(body).digest("base64url");
    expect(codeOf(() => verifyTicket(`${body}.${sig}`))).toBe("semnatura");
  });

  it("respinge reutilizarea unui tichet", () => {
    const token = signTicket({ mode: "claude" });
    expect(verifyTicket(token)).toEqual({ mode: "claude" });
    expect(codeOf(() => verifyTicket(token))).toBe("folosit");
  });

  it("respinge modurile necunoscute, la semnare și la verificare", () => {
    expect(codeOf(() => signTicket({ mode: "bash" as never }))).toBe("mod");
    expect(codeOf(() => verifyTicket(forge({ mode: "bash", nonce: "n1", exp: Date.now() + 10_000 })))).toBe("mod");
    expect(codeOf(() => verifyTicket(forge({ mode: "__proto__", nonce: "n2", exp: Date.now() + 10_000 })))).toBe("mod");
  });

  it("respinge tichetele malformate", () => {
    for (const bad of ["", "abc", "a.b.c", "a b.c", `${"a".repeat(2000)}.b`]) {
      expect(codeOf(() => verifyTicket(bad))).toMatch(/format|semnatura/);
    }
    expect(codeOf(() => verifyTicket(forge({ mode: "claude", exp: Date.now() + 10_000 })))).toBe("format");
    expect(codeOf(() => verifyTicket(forge("text")))).toBe("format");
  });

  it("respinge expirarea mai lungă decât TTL-ul", () => {
    expect(codeOf(() => verifyTicket(forge({ mode: "claude", nonce: "n3", exp: Date.now() + 3_600_000 })))).toBe("expirat");
  });
});
