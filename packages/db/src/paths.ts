import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Căile aplicației. Datele (baza de date, fișierele, cheia locală, copiile de siguranță) stau în
 * Documente/LexAI din dosarul utilizatorului, pe macOS și pe Windows; LEXAI_DATA_DIR le poate muta
 * (aplicația desktop îl setează mereu, cu dosarul Documente al sistemului).
 * Rădăcina codului (migrările) se găsește urcând până la pnpm-workspace.yaml, fiindcă procesele
 * pornesc din directoare diferite; LEXAI_APP_ROOT o înlocuiește în aplicația desktop împachetată,
 * unde nu există workspace (migrările stau în resursele ei).
 */

let root: string | null = null;

export function repoRoot(): string {
  if (root) return root;
  if (process.env.LEXAI_APP_ROOT) return (root = process.env.LEXAI_APP_ROOT);
  let dir = process.cwd();
  for (;;) {
    if (existsSync(path.join(dir, "pnpm-workspace.yaml")) && existsSync(path.join(dir, "apps"))) {
      root = dir;
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("Nu am găsit rădăcina workspace-ului LexAI (pnpm-workspace.yaml).");
    dir = parent;
  }
}

export function dataDir(...parts: string[]): string {
  const base = process.env.LEXAI_DATA_DIR || path.join(os.homedir(), "Documents", "LexAI");
  const full = path.join(base, ...parts);
  mkdirSync(parts.length && path.extname(full) ? path.dirname(full) : full, { recursive: true });
  return full;
}

let secret: Buffer | null = null;

/** Cheia secretă locală (32 de octeți), creată la prima pornire; semnează tichetele terminalului. */
export function secretKey(): Buffer {
  if (secret) return secret;
  const file = dataDir("secret.key");
  if (!existsSync(file)) {
    writeFileSync(file, randomBytes(32), { mode: 0o600 });
    chmodSync(file, 0o600);
  }
  secret = readFileSync(file);
  return secret;
}
