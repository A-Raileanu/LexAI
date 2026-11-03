import { execFile } from "node:child_process";
import { claudeBin, LOGGED_OUT_MESSAGE, MISSING_MESSAGE } from "./bin";
import { ClaudeCliError, childEnv, type ClaudeResult } from "./cli";

export { MODEL } from "./model";
export { claudeBin, LOGGED_OUT_MESSAGE, MISSING_MESSAGE, nativeClaudePath } from "./bin";
export { childEnv } from "./cli";
export { installClaude, claudePlatform, type InstallProgress } from "./install";
export { startClaudeLogin, type ClaudeLogin, type LoginUpdate } from "./login";
export { ClaudeCliError, ClaudeSession, runClaude, type AssistantMessage, type ClaudeResult, type InputBlock } from "./cli";
export { mcpToolName, type CliTool, type ToolOutcome } from "./mcp";

let checked: Promise<void> | null = null;

/**
 * Verifică (o dată per proces) că CLI-ul `claude` este instalat și autentificat
 * cu un cont Claude, înainte de a porni o analiză lungă.
 */
export function ensureClaudeCli(): Promise<void> {
  checked ??= new Promise<void>((resolve, reject) => {
    execFile(claudeBin(), ["auth", "status"], { env: childEnv(), timeout: 20_000 }, (err, stdout) => {
      if (err && (err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new ClaudeCliError(MISSING_MESSAGE, "lipsa"));
        return;
      }
      let loggedIn = false;
      try {
        loggedIn = Boolean((JSON.parse(stdout) as { loggedIn?: boolean }).loggedIn);
      } catch {
        /* format necunoscut: tratat ca neautentificat */
      }
      if (!loggedIn) {
        reject(new ClaudeCliError(LOGGED_OUT_MESSAGE, "autentificare"));
        return;
      }
      resolve();
    });
  }).catch((e) => {
    checked = null;
    throw e;
  });
  return checked;
}

/** Obiectul structurat al unui rezultat, sau eroare cu motivul în română. */
export function structuredResult(r: ClaudeResult, what: string): unknown {
  if (r.stopReason === "refusal") throw new ClaudeCliError(`Modelul a refuzat ${what}.`, "refuz");
  if (r.stopReason === "max_tokens") throw new ClaudeCliError(`Răspunsul pentru ${what} a depășit lungimea maximă și a fost trunchiat.`, "eroare");
  if (r.structured == null) {
    throw new ClaudeCliError(`Claude nu a întors un rezultat structurat valid pentru ${what} (${r.subtype}).`, "eroare");
  }
  return r.structured;
}

/** Mesaj în română pentru erorile Claude. */
export function describeApiError(e: unknown): string {
  if (e instanceof ClaudeCliError) return e.message;
  if (e instanceof Error && e.name === "AbortError") return "Analiza a fost anulată.";
  return e instanceof Error ? e.message : "Eroare necunoscută.";
}
