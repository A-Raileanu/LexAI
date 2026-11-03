import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Mediul serviciilor. Pe macOS, o aplicație pornită din Finder primește PATH-ul minimal al
 * sistemului (/usr/bin:/bin:…), fără directoarele în care stau de obicei `claude`, `node` sau
 * `pnpm`: citim PATH-ul din shell-ul de login și adăugăm locurile obișnuite. Pe Windows,
 * aplicațiile primesc PATH-ul utilizatorului; adăugăm doar locul instalatorului Claude.
 */

const MARK = "__LEXAI_PATH__";

function shellPath(): Promise<string | null> {
  const shell = process.env.SHELL || "/bin/zsh";
  return new Promise((resolve) => {
    execFile(shell, ["-ilc", `printf '${MARK}%s${MARK}' "$PATH"`], { timeout: 8000, env: { ...process.env, TERM: "dumb" } }, (err, stdout) => {
      const m = String(stdout ?? "").match(new RegExp(`${MARK}(.*?)${MARK}`));
      resolve(m?.[1] ?? null);
    });
  });
}

function isExecutable(file: string): boolean {
  try {
    accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export interface ShellEnv {
  path: string;
  /** calea absolută a CLI-ului Claude, dacă l-am găsit */
  claude: string | null;
}

const WIN = process.platform === "win32";

export async function resolveShellEnv(): Promise<ShellEnv> {
  const home = os.homedir();
  if (WIN) {
    const dirs = [...(process.env.PATH ?? "").split(path.delimiter), path.join(home, ".local", "bin"), path.join(home, "AppData", "Roaming", "npm")].filter(Boolean);
    const unique = [...new Set(dirs)];
    // claude.exe (instalatorul oficial); un claude.cmd din npm nu poate fi pornit fără shell
    const claude = process.env.LEXAI_CLAUDE_BIN || unique.map((d) => path.join(d, "claude.exe")).find(isExecutable) || null;
    return { path: unique.join(path.delimiter), claude };
  }
  const dirs = [
    ...((await shellPath()) ?? "").split(":"),
    ...(process.env.PATH ?? "").split(":"),
    path.join(home, ".local", "bin"),
    path.join(home, ".claude", "local"),
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ].filter(Boolean);
  const unique = [...new Set(dirs)];
  const explicit = process.env.LEXAI_CLAUDE_BIN;
  const claude = explicit || unique.map((d) => path.join(d, "claude")).find(isExecutable) || null;
  return { path: unique.join(":"), claude };
}
