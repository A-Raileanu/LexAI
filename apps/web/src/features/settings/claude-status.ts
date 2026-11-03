import "server-only";
import { execFile } from "node:child_process";
import { claudeBin, childEnv } from "@lexai/ai";
import { cache } from "react";
import { parseAuthStatus, type ClaudeAccount } from "./claude-account";

/** Rulează `claude auth status` (doar citire, fără PIN). */
export function readClaudeAccount(): Promise<ClaudeAccount> {
  return new Promise((resolve) => {
    execFile(claudeBin(), ["auth", "status"], { env: childEnv(), timeout: 15_000 }, (err, stdout) => {
      const checkedAt = Date.now();
      if (err && (err as NodeJS.ErrnoException).code === "ENOENT") return resolve({ state: "lipsa", checkedAt });
      // neautentificat: CLI-ul poate ieși cu cod nenul, dar tot scrie JSON-ul
      const parsed = parseAuthStatus(String(stdout ?? ""), checkedAt);
      if (parsed) return resolve(parsed);
      resolve({
        state: "eroare",
        message: err?.killed ? "CLI-ul Claude nu a răspuns la timp." : "Răspuns necunoscut de la `claude auth status`.",
        checkedAt,
      });
    });
  });
}

/** O singură verificare per cerere (pagina o folosește în mai multe locuri). */
export const getClaudeAccount = cache(readClaudeAccount);
