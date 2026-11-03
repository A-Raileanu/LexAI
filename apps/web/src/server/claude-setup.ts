import "server-only";
import { existsSync } from "node:fs";
import { installClaude, nativeClaudePath, startClaudeLogin, type ClaudeLogin } from "@lexai/ai";
import type { ClaudeSetupState } from "@/features/settings/claude-setup-state";

/**
 * Instalarea Claude Code și conectarea contului, pornite din interfață. Rulează în procesul
 * serverului web (unul singur, local); interfața le urmărește cu GET /api/claude. Starea stă pe
 * globalThis, ca să supraviețuiască reîncărcării modulelor în dezvoltare.
 */

interface Store {
  state: ClaudeSetupState;
  install: AbortController | null;
  login: ClaudeLogin | null;
}

const g = globalThis as typeof globalThis & { __lexaiClaudeSetup?: Store };
const store: Store = (g.__lexaiClaudeSetup ??= { state: { instalare: { phase: "inactiv" }, conectare: { phase: "inactiv" } }, install: null, login: null });

export function claudeSetupState(): ClaudeSetupState {
  return store.state;
}

export class SetupError extends Error {}

export function startInstall(): void {
  if (store.install) return;
  if (existsSync(nativeClaudePath())) throw new SetupError("Claude Code este deja instalat. Apasă Verifică din nou.");
  const ctrl = new AbortController();
  store.install = ctrl;
  store.state.instalare = { phase: "versiune" };
  installClaude({
    signal: ctrl.signal,
    onProgress: (p) => {
      if (store.install === ctrl) store.state.instalare = p.stage === "descarc" ? { phase: "descarc", version: p.version, received: p.received, total: p.total } : p.stage === "instalez" ? { phase: "instalez", version: p.version } : { phase: "versiune" };
    },
  })
    .then((r) => {
      store.state.instalare = { phase: "gata", version: r.version };
    })
    .catch((e: unknown) => {
      store.state.instalare = ctrl.signal.aborted ? { phase: "inactiv" } : { phase: "eroare", message: e instanceof Error ? e.message : String(e) };
    })
    .finally(() => {
      if (store.install === ctrl) store.install = null;
    });
}

export function cancelInstall(): void {
  store.install?.abort();
}

export function startLogin(): void {
  store.login?.cancel();
  store.state.conectare = { phase: "astept", url: null, codInvalid: 0 };
  const login = startClaudeLogin((u) => {
    if (store.login !== login) return;
    const c = store.state.conectare;
    if (u.type === "url" || u.type === "cod-invalid") {
      if (c.phase === "astept") store.state.conectare = u.type === "url" ? { ...c, url: u.url } : { ...c, codInvalid: c.codInvalid + 1 };
      return;
    }
    store.login = null;
    store.state.conectare = u.type === "gata" ? { phase: "gata" } : { phase: "eroare", message: u.message };
  });
  store.login = login;
}

export function sendLoginCode(code: string): void {
  if (!store.login) throw new SetupError("Conectarea nu mai rulează. Pornește-o din nou.");
  store.login.sendCode(code);
}

export function cancelLogin(): void {
  const login = store.login;
  store.login = null;
  login?.cancel();
  store.state.conectare = { phase: "inactiv" };
}
