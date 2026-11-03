import { accessSync, chmodSync, constants, existsSync } from "node:fs";
import { createServer, STATUS_CODES, type IncomingMessage, type OutgoingHttpHeaders } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import path from "node:path";
import type { Duplex } from "node:stream";
import { claudeBin, childEnv } from "@lexai/ai";
import { dataDir } from "@lexai/db/paths";
import { spawn, type IPty } from "node-pty";
import { WebSocket, WebSocketServer, type RawData } from "ws";
import { TicketError, verifyTicket, type TerminalMode } from "./ticket";

/**
 * Serviciul terminalului: un singur PTY în care rulează exclusiv CLI-ul Claude, cu una
 * dintre comenzile fixe de mai jos (niciodată un shell). Browserul se conectează prin
 * WebSocket la /pty cu un tichet semnat de aplicația web; serverul ascultă doar pe 127.0.0.1.
 *
 * Protocol (vezi și README-ul din răspunsul de predare):
 * - client → server: cadru binar = intrare brută; cadru text = JSON
 *   `{"type":"input","data":"…"}` sau `{"type":"resize","cols":N,"rows":N}`;
 * - server → client: cadru binar = ieșirea terminalului; cadru text = JSON de control,
 *   ultimul fiind `{"type":"exit","code":N|null,…}`.
 */

export const HOST = "127.0.0.1";
export const DEFAULT_PORT = 3101;
export const DEFAULT_APP_ORIGIN = "http://localhost:3000";
/** PTY-ul se închide după atâta timp fără intrare sau ieșire. */
export const IDLE_MS = 15 * 60_000;

/** Singurele comenzi permise; argumentele nu vin niciodată de la client. */
const MODE_ARGS: Record<TerminalMode, readonly string[]> = {
  claude: [],
  "auth-login": ["auth", "login"],
  "auth-logout": ["auth", "logout"],
  "auth-status": ["auth", "status"],
};

const KILL_GRACE_MS = 3_000;
const MAX_MESSAGE_BYTES = 1024 * 1024;

/** De ce a închis serverul sesiunea (lipsește când procesul s-a încheiat singur). */
export type EndReason = "inactivitate" | "inlocuit" | "oprire" | "deconectat";

export type ControlMessage =
  | { type: "exit"; code: number | null; signal?: number; reason?: EndReason }
  | { type: "error"; message: string };

export interface TerminalServerOptions {
  port?: number;
  appOrigin?: string;
  idleMs?: number;
}

export interface TerminalServer {
  port: number;
  busy(): boolean;
  close(): Promise<void>;
}

interface Session {
  end(reason: EndReason): Promise<void>;
}

/** Originea configurată plus perechea ei localhost ↔ 127.0.0.1. */
function allowedOrigins(appOrigin: string): Set<string> {
  const origin = new URL(appOrigin).origin;
  const set = new Set([origin]);
  const url = new URL(origin);
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    url.hostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
    set.add(url.origin);
  }
  return set;
}

/** Apărare împotriva DNS rebinding: acceptăm doar numele locale în antetul Host. */
function hostAllowed(req: IncomingMessage): boolean {
  const host = req.headers.host;
  if (!host) return false;
  const name = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return name === "127.0.0.1" || name === "localhost" || name === "[::1]";
}

function intParam(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

function validSize(cols: unknown, rows: unknown): cols is number {
  return Number.isInteger(cols) && Number.isInteger(rows) && (cols as number) >= 2 && (cols as number) <= 500 && (rows as number) >= 2 && (rows as number) <= 200;
}

function toBuffer(data: RawData): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  return Buffer.from(data);
}

/** Respinge cererea de upgrade cu un răspuns HTTP simplu. */
function rejectUpgrade(socket: Duplex, status: number, message: string): void {
  if (socket.destroyed) return;
  const body = JSON.stringify({ error: message });
  socket.once("finish", () => socket.destroy());
  socket.end(
    `HTTP/1.1 ${status} ${STATUS_CODES[status] ?? ""}\r\n` +
      "Connection: close\r\n" +
      "Content-Type: application/json; charset=utf-8\r\n" +
      `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`,
  );
}

/**
 * Prebuild-urile node-pty 1.1.0 pentru macOS vin uneori fără bitul de execuție pe
 * spawn-helper, iar atunci orice spawn eșuează cu „posix_spawnp failed”.
 */
function ensureSpawnHelper(): void {
  if (process.platform === "win32") return;
  let root: string;
  try {
    root = path.dirname(createRequire(import.meta.url).resolve("node-pty/package.json"));
  } catch {
    return;
  }
  for (const dir of ["build/Release", "build/Debug", `prebuilds/${process.platform}-${process.arch}`]) {
    const helper = path.join(root, dir, "spawn-helper");
    if (!existsSync(helper)) continue;
    try {
      accessSync(helper, constants.X_OK);
    } catch {
      try {
        chmodSync(helper, 0o755);
      } catch {
        /* fără drepturi: spawn-ul va raporta eroarea */
      }
    }
  }
}

function send(ws: WebSocket, data: Buffer | ControlMessage): void {
  if (ws.readyState !== WebSocket.OPEN) return;
  if (Buffer.isBuffer(data)) ws.send(data, { binary: true });
  else ws.send(JSON.stringify(data), { binary: false });
}

function startSession(ws: WebSocket, mode: TerminalMode, size: { cols: number; rows: number }, idleMs: number, onDone: () => void): Session {
  let reason: EndReason | undefined;
  let exited = false;
  let idleTimer: NodeJS.Timeout | undefined;
  let killTimer: NodeJS.Timeout | undefined;
  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => (resolveDone = resolve));

  const finish = (msg: ControlMessage) => {
    if (exited) return;
    exited = true;
    clearTimeout(idleTimer);
    clearTimeout(killTimer);
    send(ws, msg);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(1000);
    onDone();
    resolveDone();
  };

  let term: IPty;
  try {
    term = spawn(claudeBin(), [...MODE_ARGS[mode]], {
      name: "xterm-256color",
      cols: size.cols,
      rows: size.rows,
      cwd: dataDir("claude-workdir"),
      env: { ...childEnv(), TERM: "xterm-256color" },
      // fără decodare: octeții merg nemodificați spre xterm.js
      encoding: null,
    });
  } catch (e) {
    send(ws, { type: "error", message: `Nu am putut porni CLI-ul Claude („${claudeBin()}”): ${e instanceof Error ? e.message : String(e)}` });
    finish({ type: "exit", code: null });
    return { end: () => done };
  }

  const touch = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => void end("inactivitate"), idleMs);
  };

  const end = (why: EndReason): Promise<void> => {
    if (exited) return done;
    reason ??= why;
    if (!killTimer) {
      try {
        term.kill();
      } catch {
        /* procesul s-a încheiat deja */
      }
      killTimer = setTimeout(() => {
        try {
          term.kill("SIGKILL");
        } catch {
          /* procesul s-a încheiat deja */
        }
      }, KILL_GRACE_MS);
    }
    return done;
  };

  term.onData((data) => {
    touch();
    // cu encoding: null, node-pty livrează Buffer (tipurile declară string)
    send(ws, typeof data === "string" ? Buffer.from(data) : (data as Buffer));
  });

  term.onExit(({ exitCode, signal }) => {
    const msg: ControlMessage = { type: "exit", code: signal ? null : exitCode };
    if (signal) msg.signal = signal;
    if (reason) msg.reason = reason;
    finish(msg);
  });

  ws.on("message", (data, isBinary) => {
    if (exited) return;
    if (isBinary) {
      touch();
      term.write(toBuffer(data));
      return;
    }
    let msg: { type?: unknown; data?: unknown; cols?: unknown; rows?: unknown };
    try {
      msg = JSON.parse(toBuffer(data).toString("utf8"));
    } catch {
      send(ws, { type: "error", message: "Mesaj text invalid: se așteaptă JSON." });
      return;
    }
    if (msg?.type === "input" && typeof msg.data === "string") {
      touch();
      term.write(msg.data);
    } else if (msg?.type === "resize" && validSize(msg.cols, msg.rows)) {
      term.resize(msg.cols, msg.rows as number);
    } else {
      send(ws, { type: "error", message: "Mesaj de control necunoscut." });
    }
  });
  ws.on("close", () => void end("deconectat"));
  ws.on("error", () => void end("deconectat"));

  touch();
  return { end };
}

/** Pornește serverul HTTP + WebSocket pe 127.0.0.1. */
export async function startTerminalServer(options: TerminalServerOptions = {}): Promise<TerminalServer> {
  const origins = allowedOrigins(options.appOrigin ?? DEFAULT_APP_ORIGIN);
  const idleMs = options.idleMs ?? IDLE_MS;
  ensureSpawnHelper();

  let current: Session | null = null;
  let latest = 0;
  let closing = false;

  const server = createServer((req, res) => {
    const json = (status: number, body: unknown, extra: OutgoingHttpHeaders = {}) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extra });
      res.end(JSON.stringify(body));
    };
    if (!hostAllowed(req)) return json(403, { error: "Host nepermis." });
    const { pathname } = new URL(req.url ?? "/", `http://${HOST}`);
    if (pathname === "/health" && req.method === "GET") {
      const origin = req.headers.origin;
      const cors: OutgoingHttpHeaders = origin && origins.has(origin) ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" } : { Vary: "Origin" };
      return json(200, { ok: true, busy: current !== null }, cors);
    }
    json(404, { error: "Negăsit." });
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    socket.on("error", () => socket.destroy());
    const url = new URL(req.url ?? "/", `http://${HOST}`);
    if (url.pathname !== "/pty") return rejectUpgrade(socket, 404, "Negăsit.");
    if (!hostAllowed(req)) return rejectUpgrade(socket, 403, "Host nepermis.");
    if (!origins.has(req.headers.origin ?? "")) return rejectUpgrade(socket, 403, "Origine nepermisă.");
    if (closing) return rejectUpgrade(socket, 503, "Serviciul terminalului se oprește.");

    let mode: TerminalMode;
    try {
      mode = verifyTicket(url.searchParams.get("ticket") ?? "").mode;
    } catch (e) {
      return rejectUpgrade(socket, 401, e instanceof TicketError ? e.message : "Tichet invalid.");
    }
    const size = { cols: intParam(url.searchParams.get("cols"), 80, 2, 500), rows: intParam(url.searchParams.get("rows"), 24, 2, 200) };

    // un singur terminal deschis: conexiunea nouă o închide curat pe cea veche
    const seq = ++latest;
    void (async () => {
      if (current) await current.end("inlocuit");
      if (seq !== latest) return rejectUpgrade(socket, 409, "Înlocuit de o conexiune mai nouă.");
      if (closing) return rejectUpgrade(socket, 503, "Serviciul terminalului se oprește.");
      wss.handleUpgrade(req, socket, head, (ws) => {
        const session: Session = startSession(ws, mode, size, idleMs, () => {
          if (current === session) current = null;
        });
        // startSession poate eșua imediat și apela onDone înainte de atribuire
        if (ws.readyState === WebSocket.OPEN) current = session;
      });
    })();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? DEFAULT_PORT, HOST, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    port: (server.address() as AddressInfo).port,
    busy: () => current !== null,
    async close() {
      closing = true;
      await current?.end("oprire");
      for (const client of wss.clients) client.terminate();
      wss.close();
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
    },
  };
}
