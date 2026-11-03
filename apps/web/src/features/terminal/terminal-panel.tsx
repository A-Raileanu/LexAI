"use client";

import "@xterm/xterm/css/xterm.css";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import type { TerminalMode } from "@lexai/terminal/ticket";
import {
  IconAlertTriangle,
  IconCheck,
  IconClockHour4,
  IconCopy,
  IconDots,
  IconEraser,
  IconExternalLink,
  IconPlayerStopFilled,
  IconRefresh,
  IconWifiOff,
} from "@tabler/icons-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge, BadgeDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { findLoginUrl, middleTruncate, stripAnsi } from "./extract-urls";
import { MODES, modeInfo } from "./modes";

export interface Run {
  mode: TerminalMode;
  id: number;
}

export type ProcState =
  | { kind: "connecting"; attempt: number }
  | { kind: "running"; startedAt: number }
  | { kind: "exited"; code: number | null; reason?: string; lastLine?: string }
  | { kind: "lost" }
  | { kind: "failed"; message: string };

export interface TerminalPanelProps {
  run: Run;
  /** pornește (sau repornește) un mod: părintele incrementează `run.id` */
  onRun: (mode: TerminalMode) => void;
  onState?: (state: ProcState) => void;
  onExit: (mode: TerminalMode, code: number | null) => void;
  onServiceDown: () => void;
}

const MAX_ATTEMPTS = 3;
const SLOW_LOGIN_MS = 5 * 60_000;
const TAIL_BYTES = 16_384;

// fundal neutru închis (nu negru pur), în ambele teme
const THEME = {
  background: "#1b1b1f",
  foreground: "#e4e4e7",
  cursor: "#e4e4e7",
  cursorAccent: "#1b1b1f",
  selectionBackground: "#52525b99",
  black: "#27272a",
  red: "#f87171",
  green: "#4ade80",
  yellow: "#facc15",
  blue: "#60a5fa",
  magenta: "#c084fc",
  cyan: "#22d3ee",
  white: "#d4d4d8",
  brightBlack: "#71717a",
  brightRed: "#fca5a5",
  brightGreen: "#86efac",
  brightYellow: "#fde047",
  brightBlue: "#93c5fd",
  brightMagenta: "#d8b4fe",
  brightCyan: "#67e8f9",
  brightWhite: "#fafafa",
};

const REASONS: Record<string, string> = {
  inactivitate: "închis după 15 minute de inactivitate",
  inlocuit: "închis: terminalul a fost deschis în altă fereastră",
  oprire: "serviciul de terminal s-a oprit",
  deconectat: "conexiune închisă",
  utilizator: "oprit",
};

const dim = (text: string) => `\r\n\x1b[90m— ${text} —\x1b[0m\r\n`;

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type TicketResult = { ok: true; ticket: string; url: string } | { ok: false; status: number; message: string };

async function requestTicket(mode: TerminalMode): Promise<TicketResult> {
  try {
    const res = await fetch("/api/terminal/ticket", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
    const body = (await res.json().catch(() => ({}))) as { ticket?: string; url?: string; eroare?: string };
    if (res.ok && body.ticket && body.url) return { ok: true, ticket: body.ticket, url: body.url };
    return { ok: false, status: res.status, message: body.eroare ?? "Nu am putut porni terminalul." };
  } catch {
    return { ok: false, status: 0, message: "Serverul local nu răspunde." };
  }
}

function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function bufferText(term: Terminal): string {
  const b = term.buffer.active;
  const lines: string[] = [];
  for (let i = 0; i < b.length; i++) lines.push(b.getLine(i)?.translateToString(true) ?? "");
  return lines.join("\n").replace(/\s+$/, "");
}

export default function TerminalPanel({ run, onRun, onState, onExit, onServiceDown }: TerminalPanelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** „Oprește” a închis conexiunea (nu e o întrerupere) */
  const stopping = useRef(false);
  // starea și linkul sunt legate de rularea curentă; altfel se consideră „se conectează”
  const [proc, setProc] = useState<{ runId: number; state: ProcState }>({ runId: 0, state: { kind: "connecting", attempt: 1 } });
  const [login, setLogin] = useState<{ runId: number; url: string } | null>(null);
  const [now, setNow] = useState(0);
  const [pendingMode, setPendingMode] = useState<TerminalMode | null>(null);
  const [copied, setCopied] = useState(false);

  const state: ProcState = proc.runId === run.id ? proc.state : { kind: "connecting", attempt: 1 };
  const loginUrl = login?.runId === run.id ? login.url : null;
  const running = state.kind === "running" || state.kind === "connecting";
  const info = modeInfo(run.mode);

  const report = useEffectEvent((runId: number, s: ProcState) => {
    setProc({ runId, state: s });
    onState?.(s);
  });
  const exited = useEffectEvent((mode: TerminalMode, code: number | null) => onExit(mode, code));
  const serviceDown = useEffectEvent(() => onServiceDown());
  const foundUrl = useEffectEvent((runId: number, url: string) => setLogin((l) => (l?.runId === runId && l.url === url ? l : { runId, url })));

  // xterm: creat o singură dată, redimensionat odată cu panoul
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const narrow = window.matchMedia("(max-width: 640px)").matches;
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim();
    const term = new Terminal({
      theme: THEME,
      fontFamily: `${mono ? `${mono}, ` : ""}ui-monospace, SFMono-Regular, Menlo, monospace`,
      fontSize: narrow ? 12 : 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 5000,
      allowProposedApi: false,
      screenReaderMode: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(host);
    termRef.current = term;
    fitRef.current = fit;
    try {
      fit.fit();
    } catch {
      /* panou ascuns: se potrivește la primul resize */
    }
    const enc = new TextEncoder();
    const input = term.onData((data) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(enc.encode(data));
    });
    const resize = term.onResize(({ cols, rows }) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "resize", cols, rows }));
    });
    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* ignorat */
      }
    });
    ro.observe(host);
    return () => {
      ro.disconnect();
      input.dispose();
      resize.dispose();
      term.dispose();
      termRef.current = null;
      fitRef.current = null;
    };
  }, []);

  // o conexiune per rulare (run.id); închiderea conexiunii oprește procesul pe server
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    const runId = run.id;
    const mode = run.mode;
    let cancelled = false;
    let ws: WebSocket | null = null;
    let tail = "";
    const decoder = new TextDecoder();

    term.reset();
    term.write(`\x1b[90m$ ${modeInfo(mode).command}\x1b[0m\r\n`);

    const lastLine = () =>
      stripAnsi(tail)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .at(-1);

    const attempt = (n: number): Promise<"open" | "failed"> =>
      new Promise((resolve) => {
        void (async () => {
          report(runId, { kind: "connecting", attempt: n });
          const t = await requestTicket(mode);
          if (cancelled) return resolve("failed");
          if (!t.ok) {
            if (t.status === 503) serviceDown();
            report(runId, { kind: "failed", message: t.message });
            cancelled = true; // fără reîncercări: cauza nu e trecătoare
            return resolve("failed");
          }
          const fit = fitRef.current;
          try {
            fit?.fit();
          } catch {
            /* ignorat */
          }
          const q = new URLSearchParams({ ticket: t.ticket, cols: String(term.cols), rows: String(term.rows) });
          const sock = new WebSocket(`${t.url}?${q}`);
          sock.binaryType = "arraybuffer";
          ws = sock;
          let opened = false;
          let exitMsg: { code: number | null; reason?: string } | null = null;
          sock.onopen = () => {
            if (cancelled) return sock.close();
            opened = true;
            wsRef.current = sock;
            report(runId, { kind: "running", startedAt: Date.now() });
            term.focus();
            resolve("open");
          };
          sock.onmessage = (ev) => {
            if (typeof ev.data === "string") {
              let msg: { type?: string; message?: string; code?: number | null; reason?: string };
              try {
                msg = JSON.parse(ev.data);
              } catch {
                return;
              }
              if (msg.type === "error" && msg.message) {
                term.write(`\r\n\x1b[31m${msg.message}\x1b[0m\r\n`);
                tail += `\n${msg.message}\n`;
              } else if (msg.type === "exit") exitMsg = { code: msg.code ?? null, reason: msg.reason };
              return;
            }
            const bytes = new Uint8Array(ev.data as ArrayBuffer);
            term.write(bytes);
            tail = (tail + decoder.decode(bytes, { stream: true })).slice(-TAIL_BYTES);
            if (mode === "auth-login") {
              const url = findLoginUrl(tail);
              if (url) foundUrl(runId, url);
            }
          };
          sock.onclose = () => {
            if (wsRef.current === sock) wsRef.current = null;
            if (stopTimer.current) clearTimeout(stopTimer.current);
            if (!opened) return resolve("failed");
            if (cancelled) return;
            if (exitMsg) {
              const reason = exitMsg.reason;
              term.write(dim(reason && reason !== "deconectat" ? REASONS[reason] ?? reason : `proces încheiat (cod ${exitMsg.code ?? "—"})`));
              report(runId, { kind: "exited", code: exitMsg.code, reason, lastLine: lastLine() });
              exited(mode, exitMsg.code);
            } else if (stopping.current) {
              term.write(dim(REASONS.utilizator));
              report(runId, { kind: "exited", code: null, reason: "utilizator" });
              exited(mode, null);
            } else {
              term.write(dim("conexiunea s-a întrerupt"));
              report(runId, { kind: "lost" });
            }
            stopping.current = false;
          };
        })();
      });

    void (async () => {
      for (let n = 1; n <= MAX_ATTEMPTS && !cancelled; n++) {
        if ((await attempt(n)) === "open" || cancelled) return;
        if (n < MAX_ATTEMPTS) await wait(600 * n);
      }
      if (!cancelled) report(runId, { kind: "failed", message: "Nu m-am putut conecta la serviciul de terminal." });
    })();

    return () => {
      cancelled = true;
      if (wsRef.current === ws) wsRef.current = null;
      ws?.close();
    };
  }, [run.id, run.mode]);

  // cronometrul benzii de autentificare
  const ticking = run.mode === "auth-login" && state.kind === "running";
  useEffect(() => {
    if (!ticking) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ticking]);

  const stop = () => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(new TextEncoder().encode("\x03"));
    // dacă procesul nu se oprește la Ctrl+C, închidem conexiunea (serverul îl oprește)
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      if (wsRef.current === ws && ws.readyState === WebSocket.OPEN) {
        stopping.current = true;
        ws.close();
      }
    }, 1500);
  };

  const clear = () => {
    termRef.current?.clear();
    termRef.current?.focus();
  };

  const copyOutput = async () => {
    const term = termRef.current;
    if (!term) return;
    try {
      await navigator.clipboard.writeText(bufferText(term));
      toast.success("Ieșire copiată");
    } catch {
      toast.error("Nu am putut copia ieșirea.");
    }
  };

  const choose = (mode: TerminalMode) => {
    if (mode === run.mode && running) return;
    if (running) setPendingMode(mode);
    else onRun(mode);
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Nu am putut copia linkul.");
    }
  };

  const elapsed = state.kind === "running" && now ? now - state.startedAt : 0;
  const showLogin = run.mode === "auth-login" && state.kind === "running";
  const finished = state.kind === "exited" || state.kind === "lost" || state.kind === "failed";

  return (
    <div className={cn("flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-xl bg-[#1b1b1f] text-zinc-200 ring-1 ring-black/10 dark:ring-white/10")}>
      {/* bara panoului */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-2 py-1.5">
        <ToggleGroup
          value={[run.mode]}
          onValueChange={(v) => v[0] && choose(v[0] as TerminalMode)}
          size="sm"
          className="max-sm:hidden [&_[data-slot=toggle-group-indicator]]:bg-white/15 [&_[data-slot=toggle-group-item]]:text-zinc-400 [&_[data-slot=toggle-group-item]]:hover:bg-white/8 [&_[data-slot=toggle-group-item]]:hover:text-zinc-100 [&_[data-slot=toggle-group-item][data-pressed]]:bg-transparent [&_[data-slot=toggle-group-item][data-pressed]]:text-white"
          aria-label="Modul terminalului"
        >
          {MODES.map((m) => (
            <Tooltip key={m.id}>
              <TooltipTrigger render={<ToggleGroupItem value={m.id} />}>{m.label}</TooltipTrigger>
              <TooltipContent>{m.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </ToggleGroup>
        <NativeSelect
          size="sm"
          className="w-40 sm:hidden"
          value={run.mode}
          onChange={(e) => choose(e.target.value as TerminalMode)}
          aria-label="Modul terminalului"
        >
          {MODES.map((m) => (
            <NativeSelectOption key={m.id} value={m.id}>
              {m.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>

        <StatusPill state={state} />
        <code className="hidden truncate font-mono text-xs text-zinc-500 md:inline">$ {info.command}</code>

        <div className="ms-auto flex items-center gap-0.5">
          <div className="flex items-center gap-0.5 max-sm:hidden">
            <IconAction label="Repornește" onClick={() => onRun(run.mode)} primary={finished}>
              <IconRefresh />
            </IconAction>
            <IconAction label="Curăță ecranul" onClick={clear}>
              <IconEraser />
            </IconAction>
            <IconAction label="Copiază ieșirea" onClick={() => void copyOutput()}>
              <IconCopy />
            </IconAction>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className="text-zinc-300 hover:bg-white/10 hover:text-white sm:hidden" aria-label="Alte acțiuni" />}>
              <IconDots />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onRun(run.mode)}>
                <IconRefresh />
                Repornește
              </DropdownMenuItem>
              <DropdownMenuItem onClick={clear}>
                <IconEraser />
                Curăță ecranul
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void copyOutput()}>
                <IconCopy />
                Copiază ieșirea
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-zinc-300 hover:bg-white/10 hover:text-white"
                  disabled={state.kind !== "running"}
                  onClick={stop}
                  aria-label="Oprește (Ctrl C)"
                />
              }
            >
              <IconPlayerStopFilled />
            </TooltipTrigger>
            <TooltipContent>
              Oprește <Kbd>Ctrl C</Kbd>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* banda-ajutor pentru `claude auth login` */}
      {showLogin && (
        <div className="border-b border-white/10 bg-white/[0.03] px-3 py-3 text-sm" aria-live="polite">
          <p className="flex items-center gap-2 text-zinc-300">
            <IconClockHour4 className="size-4 text-zinc-400" aria-hidden />
            {elapsed > SLOW_LOGIN_MS ? (
              <>
                Durează mai mult decât de obicei. Poți reporni autentificarea.
                <Button size="xs" variant="outline" className="ms-1" onClick={() => onRun("auth-login")}>
                  Repornește
                </Button>
              </>
            ) : (
              <>
                Aștept autentificarea în browser…
                <span className="font-mono text-zinc-400 tabular-nums">{fmtClock(elapsed)}</span>
              </>
            )}
          </p>
          <ol className="mt-2 flex flex-col gap-1.5 text-zinc-400">
            <li className="flex flex-col gap-1.5">
              <span>1. Deschide linkul de mai jos în browser.</span>
              {loginUrl ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <code title={loginUrl} className="min-w-0 flex-1 truncate rounded-md bg-black/30 px-2 py-1 font-mono text-xs text-zinc-200 ring-1 ring-white/10">
                    <span className="sm:hidden">{middleTruncate(loginUrl, 44)}</span>
                    <span className="max-sm:hidden">{loginUrl}</span>
                  </code>
                  <Button size="xs" variant="secondary" onClick={() => void copyUrl(loginUrl)}>
                    {copied ? <IconCheck /> : <IconCopy />}
                    {copied ? "Copiat" : "Copiază linkul"}
                  </Button>
                  <a
                    href={loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs text-zinc-200 ring-1 ring-white/15 hover:bg-white/10"
                  >
                    Deschide
                    <IconExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
              ) : (
                <span className="text-xs text-zinc-500">Linkul apare aici imediat ce îl afișează Claude CLI.</span>
              )}
            </li>
            <li>2. Autorizează accesul pentru Claude Code.</li>
            <li>3. Dacă ți se cere, lipește codul în terminal și apasă Enter.</li>
          </ol>
        </div>
      )}

      {state.kind === "exited" && state.code !== null && state.code !== 0 && (
        <Alert variant="destructive" appearance="soft" className="rounded-none border-b border-white/10 bg-red-500/10 text-zinc-200 [&>[data-slot=alert-description]]:text-zinc-300">
          <IconAlertTriangle />
          <AlertTitle>Procesul s-a încheiat cu eroare (cod {state.code})</AlertTitle>
          {state.lastLine && <AlertDescription className="font-mono text-xs">{state.lastLine}</AlertDescription>}
          <AlertAction>
            <Button size="sm" variant="secondary" onClick={() => onRun(run.mode)}>
              Repornește
            </Button>
          </AlertAction>
        </Alert>
      )}

      {(state.kind === "lost" || (state.kind === "connecting" && state.attempt > 1) || state.kind === "failed") && (
        <div role="status" className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {state.kind === "connecting" ? <Spinner size="sm" label="Se reconectează" /> : <IconWifiOff className="size-4" aria-hidden />}
          <span className="flex-1">
            {state.kind === "connecting"
              ? `Conexiunea cu terminalul s-a întrerupt. Se reconectează… (încercarea ${state.attempt} din ${MAX_ATTEMPTS})`
              : state.kind === "lost"
                ? "Conexiunea cu terminalul s-a întrerupt."
                : state.message}
          </span>
          {state.kind === "lost" && (
            <Button size="xs" variant="secondary" onClick={() => onRun(run.mode)}>
              Reconectează
            </Button>
          )}
          {state.kind === "failed" && (
            <>
              <Button size="xs" variant="secondary" onClick={() => onRun(run.mode)}>
                Reîncearcă
              </Button>
              <Button size="xs" variant="ghost" className="text-amber-200 hover:bg-white/10" onClick={() => window.location.reload()}>
                Reîncarcă pagina
              </Button>
            </>
          )}
        </div>
      )}

      <div ref={hostRef} className="min-h-0 flex-1 overflow-x-auto px-2 py-2 [&_.xterm]:h-full [&_.xterm-viewport]:bg-transparent!" aria-label="Terminal Claude" />

      <AlertDialog open={pendingMode !== null} onOpenChange={(o) => !o && setPendingMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oprești procesul curent?</AlertDialogTitle>
            <AlertDialogDescription>Un proces rulează încă. Îl oprești și pornești modul {pendingMode ? modeInfo(pendingMode).label : ""}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const m = pendingMode;
                setPendingMode(null);
                if (m) onRun(m);
              }}
            >
              Oprește și continuă
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function IconAction({ label, onClick, children, primary }: { label: string; onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn("text-zinc-300 hover:bg-white/10 hover:text-white", primary && "bg-white/90 text-zinc-900 hover:bg-white hover:text-zinc-900")}
            onClick={onClick}
            aria-label={label}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function StatusPill({ state }: { state: ProcState }) {
  const base = "border-0 bg-white/8 text-zinc-300 inset-ring-white/10";
  switch (state.kind) {
    case "connecting":
      return (
        <Badge shape="pill" className={base}>
          <Spinner size="sm" className="size-3" label="Pornește" />
          Pornește…
        </Badge>
      );
    case "running":
      return (
        <Badge shape="pill" variant="success" className={cn(base, "text-emerald-300")}>
          <BadgeDot pulse />
          Rulează
        </Badge>
      );
    case "exited":
      if (state.code !== null && state.code !== 0)
        return (
          <Badge shape="pill" variant="destructive" className={cn(base, "text-red-300")}>
            <BadgeDot />
            Eroare (cod {state.code})
          </Badge>
        );
      return (
        <Badge shape="pill" className={base}>
          <BadgeDot className="bg-zinc-400" />
          {state.reason && state.reason !== "deconectat" ? "Oprit" : "Încheiat"}
        </Badge>
      );
    case "lost":
      return (
        <Badge shape="pill" variant="warning" className={cn(base, "text-amber-300")}>
          <BadgeDot />
          Deconectat
        </Badge>
      );
    case "failed":
      return (
        <Badge shape="pill" variant="warning" className={cn(base, "text-amber-300")}>
          <BadgeDot />
          Nepornit
        </Badge>
      );
  }
}
