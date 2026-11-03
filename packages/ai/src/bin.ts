import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Unde e CLI-ul Claude. Calea se caută la fiecare pornire a unui proces, nu o dată la import:
 * după ce LexAI instalează Claude Code (vezi ./install.ts), web-ul, worker-ul și terminalul îl
 * găsesc fără să fie repornite.
 */

const WIN = process.platform === "win32";

/** Locul în care instalatorul oficial pune lansatorul: ~/.local/bin/claude (claude.exe pe Windows). */
export function nativeClaudePath(home = homedir()): string {
  return path.join(home, ".local", "bin", WIN ? "claude.exe" : "claude");
}

function isExecutable(file: string): boolean {
  try {
    accessSync(file, WIN ? constants.F_OK : constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** LEXAI_CLAUDE_BIN, altfel instalarea nativă dacă există, altfel `claude` din PATH. */
export function claudeBin(): string {
  const explicit = process.env.LEXAI_CLAUDE_BIN;
  if (explicit) return explicit;
  const native = nativeClaudePath();
  return isExecutable(native) ? native : "claude";
}

export const MISSING_MESSAGE = "Claude Code nu este instalat pe acest calculator. Instalează-l din Setări → Cont Claude.";
export const LOGGED_OUT_MESSAGE = "Contul Claude nu este conectat. Conectează-l din Setări → Cont Claude.";
