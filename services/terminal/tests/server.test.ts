import { chmodSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";

// înlocuim CLI-ul Claude cu un script inofensiv (LEXAI_CLAUDE_BIN are prioritate)
const tmp = realpathSync(mkdtempSync(path.join(tmpdir(), "lexai-terminal-test-")));
const fakeClaude = path.join(tmp, "claude-fals");
writeFileSync(
  fakeClaude,
  [
    "#!/bin/sh",
    'if [ "$#" -gt 0 ]; then',
    '  echo "ARGS:$*"',
    '  echo "TERM:$TERM"',
    '  echo "KEY:${ANTHROPIC_API_KEY:-absent}"',
    '  echo "CWD:$(pwd)"',
    "  exit 7",
    "fi",
    "# mod interactiv: o linie de intrare, apoi dimensiunea terminalului",
    "read line",
    'echo "GOT:$line"',
    'echo "SIZE:$(stty size)"',
    "exit 0",
    "",
  ].join("\n"),
);
chmodSync(fakeClaude, 0o755);
process.env.LEXAI_CLAUDE_BIN = fakeClaude;
process.env.LEXAI_DATA_DIR = path.join(tmp, "data");
process.env.ANTHROPIC_API_KEY = "sk-test-nu-trebuie-transmis";

const { startTerminalServer } = await import("../src/server");
const { signTicket } = await import("../src/ticket");
type TerminalServer = Awaited<ReturnType<typeof startTerminalServer>>;
type Control = { type: string; code?: number | null; reason?: string; message?: string };

const ORIGIN = "http://localhost:3000";

function open(port: number, query: string, origin: string | undefined = ORIGIN) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/pty?${query}`, origin ? { origin } : {});
  let output = "";
  const control: Control[] = [];
  ws.on("message", (data, isBinary) => {
    if (isBinary) output += data.toString();
    else control.push(JSON.parse(data.toString()));
  });
  const opened = new Promise<void>((resolve, reject) => {
    ws.once("open", () => resolve());
    ws.once("error", reject);
  });
  const closed = new Promise<number>((resolve) => ws.once("close", (code) => resolve(code)));
  return { ws, opened, closed, output: () => output, control };
}

/** Starea HTTP cu care serverul refuză upgrade-ul. */
function rejectedStatus(port: number, query: string, origin?: string, urlPath = "/pty"): Promise<number> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${urlPath}?${query}`, origin ? { origin } : {});
    ws.once("unexpected-response", (_req, res) => {
      resolve(res.statusCode ?? 0);
      ws.terminate();
    });
    ws.once("open", () => reject(new Error("conexiunea trebuia respinsă")));
    ws.once("error", () => {});
  });
}

async function health(port: number): Promise<{ ok: boolean; busy: boolean }> {
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  return (await res.json()) as { ok: boolean; busy: boolean };
}

describe("serviciul terminalului", () => {
  let server: TerminalServer;

  beforeAll(async () => {
    server = await startTerminalServer({ port: 0 });
  });

  afterAll(async () => {
    await server?.close();
  });

  it("raportează starea la /health", async () => {
    expect(await health(server.port)).toEqual({ ok: true, busy: false });
  });

  it("rulează comanda modului cu argumentele fixe și trimite ieșirea, apoi exit", async () => {
    const c = open(server.port, `ticket=${signTicket({ mode: "auth-status" })}&cols=100&rows=30`);
    await c.opened;
    expect(await c.closed).toBe(1000);
    const out = c.output();
    expect(out).toContain("ARGS:auth status");
    expect(out).toContain("TERM:xterm-256color");
    expect(out).toContain("KEY:absent");
    expect(out).toContain(`CWD:${path.join(tmp, "data", "claude-workdir")}`);
    expect(c.control.at(-1)).toEqual({ type: "exit", code: 7 });
    expect(await health(server.port)).toEqual({ ok: true, busy: false });
  });

  it("transmite intrarea și redimensionarea în modul interactiv", async () => {
    const c = open(server.port, `ticket=${signTicket({ mode: "claude" })}&cols=80&rows=24`, "http://127.0.0.1:3000");
    await c.opened;
    expect((await health(server.port)).busy).toBe(true);
    c.ws.send(JSON.stringify({ type: "resize", cols: 120, rows: 40 }));
    // un mesaj text care arată ca JSON de control, dar e trimis binar, rămâne intrare
    c.ws.send(Buffer.from('{"type":"resize"}'));
    c.ws.send(JSON.stringify({ type: "input", data: "\r" }));
    expect(await c.closed).toBe(1000);
    expect(c.output()).toContain('GOT:{"type":"resize"}');
    expect(c.output()).toContain("SIZE:40 120");
    expect(c.control.at(-1)).toEqual({ type: "exit", code: 0 });
  });

  it("raportează mesajele text care nu sunt JSON de control", async () => {
    const c = open(server.port, `ticket=${signTicket({ mode: "claude" })}`);
    await c.opened;
    c.ws.send("ls -la\r");
    await vi.waitFor(() => expect(c.control.some((m) => m.type === "error")).toBe(true));
    c.ws.send(JSON.stringify({ type: "input", data: "gata\r" }));
    await c.closed;
    expect(c.output()).toContain("GOT:gata");
    expect(c.output()).not.toContain("GOT:ls");
  });

  it("închide curat sesiunea veche când se deschide una nouă", async () => {
    const first = open(server.port, `ticket=${signTicket({ mode: "claude" })}`);
    await first.opened;
    const second = open(server.port, `ticket=${signTicket({ mode: "claude" })}`);
    await second.opened;
    expect(await first.closed).toBe(1000);
    expect(first.control.at(-1)).toMatchObject({ type: "exit", reason: "inlocuit" });
    expect((await health(server.port)).busy).toBe(true);

    second.ws.send(JSON.stringify({ type: "input", data: "doi\r" }));
    await second.closed;
    expect(second.output()).toContain("GOT:doi");
    await vi.waitFor(async () => expect((await health(server.port)).busy).toBe(false));
  });

  it("oprește PTY-ul când clientul se deconectează", async () => {
    const c = open(server.port, `ticket=${signTicket({ mode: "claude" })}`);
    await c.opened;
    expect((await health(server.port)).busy).toBe(true);
    c.ws.close();
    await vi.waitFor(async () => expect((await health(server.port)).busy).toBe(false));
  });

  it("respinge originea greșită", async () => {
    const ticket = signTicket({ mode: "claude" });
    expect(await rejectedStatus(server.port, `ticket=${ticket}`, "http://evil.example")).toBe(403);
    expect(await rejectedStatus(server.port, `ticket=${ticket}`, "http://localhost:3001")).toBe(403);
    expect(await rejectedStatus(server.port, `ticket=${ticket}`)).toBe(403);
  });

  it("respinge lipsa tichetului, tichetul invalid și reutilizarea lui", async () => {
    expect(await rejectedStatus(server.port, "", ORIGIN)).toBe(401);
    expect(await rejectedStatus(server.port, "ticket=abc.def", ORIGIN)).toBe(401);

    const ticket = signTicket({ mode: "auth-logout" });
    const c = open(server.port, `ticket=${ticket}`);
    await c.opened;
    await c.closed;
    expect(c.output()).toContain("ARGS:auth logout");
    expect(await rejectedStatus(server.port, `ticket=${ticket}`, ORIGIN)).toBe(401);
  });

  it("respinge alte căi", async () => {
    expect(await rejectedStatus(server.port, `ticket=${signTicket({ mode: "claude" })}`, ORIGIN, "/shell")).toBe(404);
  });
});

describe("închiderea de către server", () => {
  it("închide PTY-ul după perioada fără intrare sau ieșire", async () => {
    const server = await startTerminalServer({ port: 0, idleMs: 300 });
    try {
      const c = open(server.port, `ticket=${signTicket({ mode: "claude" })}`);
      await c.opened;
      expect(await c.closed).toBe(1000);
      expect(c.control.at(-1)).toMatchObject({ type: "exit", reason: "inactivitate" });
      expect(server.busy()).toBe(false);
    } finally {
      await server.close();
    }
  });

  it("închide sesiunea la oprirea serverului", async () => {
    const server = await startTerminalServer({ port: 0 });
    const c = open(server.port, `ticket=${signTicket({ mode: "claude" })}`);
    await c.opened;
    await server.close();
    expect(await c.closed).toBe(1000);
    expect(c.control.at(-1)).toMatchObject({ type: "exit", reason: "oprire" });
  });
});
