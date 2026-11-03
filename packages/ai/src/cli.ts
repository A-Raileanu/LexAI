import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { ApiUsage, LimitWindow, SubscriptionLimits } from "./usage";
import { claudeBin, LOGGED_OUT_MESSAGE, MISSING_MESSAGE } from "./bin";
import { mcpToolName, startMcpServer, type CliTool, type McpServerHandle } from "./mcp";

/**
 * Apeluri la Claude prin CLI-ul `claude` (Claude Code, mod neinteractiv), autentificat
 * cu abonamentul Claude al utilizatorului — fără cheie API. Un proces = o conversație:
 * mesajele utilizatorului intră pe stdin (stream-json), iar răspunsurile, consumul și
 * rezultatul final ies pe stdout. Instrumentele aplicației sunt expuse printr-un server
 * MCP local (vezi ./mcp.ts).
 */

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type InputBlock =
  | { type: "text"; text: string }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

export type OutputBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: string; [k: string]: unknown };

/** Un răspuns al modelului (un apel API), cu consumul lui. */
export interface AssistantMessage {
  id: string;
  model: string;
  content: OutputBlock[];
  usage: ApiUsage;
  stopReason: string | null;
}

export interface ClaudeResult {
  /** „success” sau tipul erorii (error_max_turns, error_during_execution etc.) */
  subtype: string;
  isError: boolean;
  text: string;
  /** obiectul validat după jsonSchema, dacă a fost cerut */
  structured: unknown;
  stopReason: string | null;
  apiErrorStatus: number | null;
  /** cost echivalent la prețurile API (cu abonament nu se facturează per token) */
  costUsd: number;
}

export interface ClaudeOptions {
  system: string;
  model: string;
  effort?: Effort;
  /** ieșire structurată, validată de CLI după această schemă JSON */
  jsonSchema?: Record<string, unknown>;
  /** instrumentele aplicației, executate în acest proces */
  tools?: CliTool[];
  /** instrumente încorporate în Claude Code (ex. „WebSearch”) */
  builtinTools?: string[];
  maxOutputTokens?: number;
  signal?: AbortSignal;
  /** apelat după fiecare răspuns complet al modelului */
  onMessage?: (m: AssistantMessage) => void;
  /** nivelul de utilizare al abonamentului (ferestrele de 5 ore și 7 zile) */
  onLimits?: (l: SubscriptionLimits) => void;
}

export type ClaudeErrorKind = "lipsa" | "autentificare" | "limita" | "indisponibil" | "refuz" | "eroare";

export class ClaudeCliError extends Error {
  constructor(
    message: string,
    public readonly kind: ClaudeErrorKind,
    public readonly status: number | null = null,
  ) {
    super(message);
    this.name = "ClaudeCliError";
  }
}

/** Director de lucru gol, ca CLI-ul să nu încarce CLAUDE.md sau setările proiectului. */
function workDir(): string {
  const dir = path.join(tmpdir(), "lexai-claude");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Mediul procesului copil: fără chei API, ca autentificarea să fie cea a abonamentului. */
export function childEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const k of ["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "CLAUDECODE", "CLAUDE_CODE_ENTRYPOINT"]) delete env[k];
  return { ...env, DISABLE_AUTOUPDATER: "1", ...extra };
}

function classify(text: string, status: number | null): ClaudeCliError {
  const t = text.trim();
  if (status === 401 || /not logged in|\/login|invalid api key|oauth token|authenticat/i.test(t)) {
    return new ClaudeCliError(LOGGED_OUT_MESSAGE, "autentificare", status);
  }
  if (status === 429 || /usage limit|hit your limit|rate limit|limit reached/i.test(t)) {
    return new ClaudeCliError(`Limita de utilizare a abonamentului Claude a fost atinsă. ${t}`.trim(), "limita", status);
  }
  if (status === 529 || (status !== null && status >= 500) || /overloaded/i.test(t)) {
    return new ClaudeCliError("Claude este temporar indisponibil. Încercați din nou.", "indisponibil", status);
  }
  return new ClaudeCliError(`Eroare Claude${status ? ` (${status})` : ""}: ${t || "necunoscută"}`, "eroare", status);
}

interface RateLimitWindow {
  utilization?: number;
  resetsAt?: number;
}

function limitWindow(w: RateLimitWindow | undefined): LimitWindow | null {
  if (typeof w?.utilization !== "number") return null;
  return {
    procent: Math.round(w.utilization * 1000) / 10,
    resetLa: w.resetsAt ? new Date(w.resetsAt * 1000).toISOString() : null,
  };
}

/** Limitele abonamentului din evenimentul rate_limit_event al CLI-ului. */
function parseLimits(info: { status?: string; unifiedWindows?: Record<string, RateLimitWindow> }): SubscriptionLimits {
  return {
    cinciOre: limitWindow(info.unifiedWindows?.five_hour),
    sapteZile: limitWindow(info.unifiedWindows?.seven_day),
    stare: info.status ?? "necunoscută",
    actualizatLa: new Date().toISOString(),
  };
}

function abortError(): Error {
  const e = new Error("Analiza a fost anulată.");
  e.name = "AbortError";
  return e;
}

interface Pending {
  resolve: (r: ClaudeResult) => void;
  reject: (e: unknown) => void;
}

export class ClaudeSession {
  private proc!: ChildProcessWithoutNullStreams;
  private mcp: McpServerHandle | null = null;
  private pending: Pending | null = null;
  private stderr = "";
  private exited: Promise<void> = Promise.resolve();
  private failure: unknown = null;
  /** oprire cerută de aplicație (nu o eroare) */
  private stopping = false;
  /** răspunsul în curs (CLI-ul poate trimite blocurile unui răspuns în evenimente separate) */
  private current: AssistantMessage | null = null;
  /** consumul final al răspunsurilor, din evenimentele de streaming */
  private streamingId: string | null = null;
  private finalUsage = new Map<string, ApiUsage>();
  private flushed = new Set<string>();

  private constructor(private readonly opts: ClaudeOptions) {}

  static async start(opts: ClaudeOptions): Promise<ClaudeSession> {
    if (opts.signal?.aborted) throw abortError();
    const s = new ClaudeSession(opts);
    await s.spawn();
    return s;
  }

  private async spawn() {
    const o = this.opts;
    const tools = o.tools ?? [];
    const builtin = o.builtinTools ?? [];
    if (tools.length) this.mcp = await startMcpServer(tools);

    const args = [
      "-p",
      "--input-format", "stream-json",
      "--output-format", "stream-json",
      "--verbose",
      // evenimentele de streaming aduc consumul final al fiecărui răspuns (message_delta)
      "--include-partial-messages",
      "--model", o.model,
      "--system-prompt", o.system,
      "--tools", builtin.join(","),
      "--setting-sources", "",
      "--strict-mcp-config",
      "--no-session-persistence",
      "--disable-slash-commands",
      "--permission-mode", "dontAsk",
    ];
    if (o.effort) args.push("--effort", o.effort);
    const allowed = [...builtin, ...tools.map((t) => mcpToolName(t.name))];
    if (allowed.length) args.push("--allowedTools", allowed.join(","));
    if (this.mcp) args.push("--mcp-config", JSON.stringify(this.mcp.config));
    // fără „$schema”: validatorul CLI-ului nu cunoaște draft 2020-12 (cel emis de zod)
    if (o.jsonSchema) args.push("--json-schema", JSON.stringify({ ...o.jsonSchema, $schema: undefined }));

    const proc = spawn(claudeBin(), args, {
      cwd: workDir(),
      env: childEnv({
        // rezultatele instrumentelor (articole, coduri) pot fi lungi
        MAX_MCP_OUTPUT_TOKENS: "120000",
        ...(o.maxOutputTokens ? { CLAUDE_CODE_MAX_OUTPUT_TOKENS: String(o.maxOutputTokens) } : {}),
      }),
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.proc = proc;

    this.exited = new Promise((resolve) => {
      proc.once("error", (e: NodeJS.ErrnoException) => {
        this.fail(
          e.code === "ENOENT"
            ? new ClaudeCliError(MISSING_MESSAGE, "lipsa")
            : e,
        );
        resolve();
      });
      proc.once("close", (code) => {
        this.flush();
        if (o.signal?.aborted) this.fail(abortError());
        else if (this.stopping) this.settleStopped();
        else if (this.pending) this.fail(classify(this.stderr.slice(-2000) || `procesul s-a oprit (cod ${code})`, null));
        void this.mcp?.close();
        resolve();
      });
    });

    proc.stderr.on("data", (d: Buffer) => {
      this.stderr = (this.stderr + d.toString()).slice(-8000);
    });
    proc.stdin.on("error", () => {
      /* procesul s-a închis; eroarea este raportată la „close” */
    });
    createInterface({ input: proc.stdout }).on("line", (line) => this.onLine(line));

    o.signal?.addEventListener("abort", () => proc.kill("SIGTERM"), { once: true });
  }

  private onLine(line: string) {
    let ev: Record<string, unknown>;
    try {
      ev = JSON.parse(line);
    } catch {
      return;
    }
    if (ev.type === "rate_limit_event" && ev.rate_limit_info) {
      this.opts.onLimits?.(parseLimits(ev.rate_limit_info as Parameters<typeof parseLimits>[0]));
      return;
    }
    if (ev.type === "stream_event") {
      const se = ev.event as { type: string; message?: { id: string }; usage?: ApiUsage };
      if (se.type === "message_start") this.streamingId = se.message?.id ?? null;
      else if (se.type === "message_delta" && se.usage && this.streamingId) this.finalUsage.set(this.streamingId, se.usage);
      // răspunsul e complet abia aici (rezultatul unui instrument poate sosi înaintea consumului final)
      else if (se.type === "message_stop" && this.current?.id === this.streamingId) this.flush();
      return;
    }
    if (ev.type === "assistant") {
      const m = ev.message as { id: string; model: string; content: OutputBlock[]; usage: ApiUsage; stop_reason: string | null };
      if (this.flushed.has(m.id)) return;
      if (this.current && this.current.id !== m.id) this.flush();
      if (this.current) {
        this.current.content.push(...m.content);
        this.current.usage = m.usage;
        this.current.stopReason = m.stop_reason ?? this.current.stopReason;
      } else {
        this.current = { id: m.id, model: m.model, content: [...m.content], usage: m.usage, stopReason: m.stop_reason };
      }
      return;
    }
    if (ev.type === "result") {
      this.flush();
      const result: ClaudeResult = {
        subtype: String(ev.subtype),
        isError: Boolean(ev.is_error),
        text: typeof ev.result === "string" ? ev.result : "",
        structured: ev.structured_output ?? null,
        stopReason: (ev.stop_reason as string | null) ?? null,
        apiErrorStatus: (ev.api_error_status as number | null) ?? null,
        costUsd: Number(ev.total_cost_usd ?? 0),
      };
      const p = this.pending;
      this.pending = null;
      if (!p) return;
      if (result.isError && result.subtype === "success") p.reject(classify(result.text, result.apiErrorStatus));
      else p.resolve(result);
    }
  }

  private flush() {
    const m = this.current;
    this.current = null;
    if (!m) return;
    this.flushed.add(m.id);
    // usage din evenimentul „assistant” are output-ul de la începutul răspunsului
    const final = this.finalUsage.get(m.id);
    this.finalUsage.delete(m.id);
    this.opts.onMessage?.(final ? { ...m, usage: { ...m.usage, ...final } } : m);
  }

  private settleStopped() {
    const p = this.pending;
    this.pending = null;
    p?.resolve({ subtype: "oprit", isError: false, text: "", structured: null, stopReason: null, apiErrorStatus: null, costUsd: 0 });
  }

  private fail(e: unknown) {
    this.failure ??= e;
    const p = this.pending;
    this.pending = null;
    p?.reject(this.failure);
  }

  /** Trimite un mesaj și așteaptă sfârșitul turei (rezultatul final al CLI-ului). */
  send(content: string | InputBlock[]): Promise<ClaudeResult> {
    if (this.failure) return Promise.reject(this.failure);
    if (this.stopping) return Promise.reject(new Error("Sesiunea Claude a fost oprită."));
    if (this.pending) return Promise.reject(new Error("O cerere către Claude este deja în curs în această sesiune."));
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      const msg = { type: "user", message: { role: "user", content } };
      this.proc.stdin.write(JSON.stringify(msg) + "\n");
    });
  }

  /** Oprește imediat procesul; cererea în curs se încheie cu subtype „oprit”. */
  stop() {
    this.stopping = true;
    if (this.proc.exitCode === null && !this.proc.killed) this.proc.kill("SIGTERM");
  }

  /** Încheie conversația și eliberează procesul și serverul MCP. */
  async close() {
    this.proc.stdin.end();
    const timer = setTimeout(() => this.proc.kill("SIGTERM"), 10_000);
    await this.exited;
    clearTimeout(timer);
  }
}

/** O singură cerere: pornește CLI-ul, trimite mesajul, întoarce rezultatul. */
export async function runClaude(opts: ClaudeOptions, content: string | InputBlock[]): Promise<ClaudeResult> {
  const session = await ClaudeSession.start(opts);
  try {
    return await session.send(content);
  } finally {
    await session.close();
  }
}
