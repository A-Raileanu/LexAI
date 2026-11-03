import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";

/**
 * Procesele aplicației: serverul web (Next), worker-ul de joburi AI și serviciul terminalului.
 * Fiecare pornește în grupul lui de procese, ca la oprire să cadă și copiii (CLI-ul Claude,
 * serverul MCP); pe Windows, arborele de procese se oprește cu `taskkill /T`. Ieșirea fiecăruia
 * merge într-un jurnal în `jurnale/`.
 */

export type ServiceName = "web" | "worker" | "terminal" | "dev";

export interface ServiceSpec {
  name: ServiceName;
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}

const TAIL_LINES = 80;
const STOP_GRACE_MS = 5000;
const WIN = process.platform === "win32";

export class Service {
  private child: ChildProcess | null = null;
  private log: WriteStream;
  private tail: string[] = [];
  private stopping = false;
  /** apelat când procesul iese fără să-l fi oprit noi */
  onCrash: ((code: number | null) => void) | null = null;

  constructor(
    readonly spec: ServiceSpec,
    logDir: string,
    private readonly echo: boolean,
  ) {
    mkdirSync(logDir, { recursive: true });
    this.log = createWriteStream(path.join(logDir, `${spec.name}.log`), { flags: "a" });
  }

  get running(): boolean {
    return this.child !== null && this.child.exitCode === null && this.child.signalCode === null;
  }

  /** ultimele rânduri din jurnal, pentru ecranul de eroare */
  lastLines(): string {
    return this.tail.join("\n");
  }

  start() {
    this.stopping = false;
    const { command, args, cwd, env, name } = this.spec;
    this.write(`\n— pornesc ${name} (${new Date().toISOString()}): ${command} ${args.join(" ")}\n`);
    // stdin rămâne deschis: serviciile împachetate se opresc singure când el se închide (procesul principal a murit)
    // pe Windows, `detached` ar deschide o consolă proprie; arborele se oprește oricum cu taskkill
    const child = spawn(command, args, { cwd, env, detached: !WIN, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    this.child = child;
    child.stdout?.on("data", (b: Buffer) => this.write(b.toString()));
    child.stderr?.on("data", (b: Buffer) => this.write(b.toString()));
    child.stdin?.on("error", () => {});
    child.on("error", (e) => this.write(`[${name}] nu a pornit: ${e.message}\n`));
    child.on("exit", (code, signal) => {
      this.write(`— ${name} s-a oprit (cod ${code ?? "–"}${signal ? `, semnal ${signal}` : ""})\n`);
      if (this.child === child) this.child = null;
      if (!this.stopping) this.onCrash?.(code);
    });
  }

  /** Oprește grupul de procese: SIGTERM, apoi SIGKILL după `graceMs`. `force` sare direct la SIGKILL. */
  stop({ force = false, graceMs = STOP_GRACE_MS } = {}): Promise<void> {
    const child = this.child;
    this.stopping = true;
    if (!child || !this.running) return Promise.resolve();
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.kill(child, "SIGKILL");
        resolve();
      }, force ? 0 : graceMs);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      if (!force) this.kill(child, "SIGTERM");
    });
  }

  /** Oprire sincronă, pentru ieșirea neprevăzută a procesului principal. */
  killNow() {
    if (this.child && this.running) this.kill(this.child, "SIGKILL");
  }

  private kill(child: ChildProcess, signal: NodeJS.Signals) {
    if (!child.pid) return;
    if (WIN) {
      // Windows nu are semnale: oprirea e mereu forțată, cu tot arborele
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
      return;
    }
    try {
      process.kill(-child.pid, signal);
    } catch {
      try {
        child.kill(signal);
      } catch {
        // deja oprit
      }
    }
  }

  private write(text: string) {
    this.log.write(text);
    if (this.echo) process.stdout.write(text.replace(/^(?=.)/gm, `[${this.spec.name}] `));
    this.tail.push(...text.split("\n").filter((l) => l.trim()));
    if (this.tail.length > TAIL_LINES) this.tail = this.tail.slice(-TAIL_LINES);
  }
}

/** Portul preferat dacă e liber pe 127.0.0.1, altfel unul ales de sistem. */
export async function freePort(preferred: number): Promise<number> {
  const tryPort = (port: number) =>
    new Promise<number | null>((resolve) => {
      const srv = net.createServer();
      srv.once("error", () => resolve(null));
      srv.listen(port, "127.0.0.1", () => {
        const got = (srv.address() as net.AddressInfo).port;
        srv.close(() => resolve(got));
      });
    });
  return (await tryPort(preferred)) ?? (await tryPort(0))!;
}

/** Răspunde ceva la adresa dată (orice cod HTTP sub 500)? */
export function httpReady(url: string, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve((res.statusCode ?? 500) < 500);
    });
    req.on("timeout", () => req.destroy());
    req.on("error", () => resolve(false));
  });
}

/** Așteaptă până răspunde adresa; se oprește dacă serviciul moare sau trece `timeoutMs`. */
export async function waitForHttp(url: string, service: Service | null, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await httpReady(url, 30_000)) return;
    if (service && !service.running) throw new Error("Serverul aplicației s-a oprit la pornire.");
    if (Date.now() > deadline) throw new Error("Serverul aplicației nu a răspuns la timp.");
    await new Promise((r) => setTimeout(r, 300));
  }
}
