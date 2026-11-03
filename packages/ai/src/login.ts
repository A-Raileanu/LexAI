import { spawn } from "node:child_process";
import { claudeBin } from "./bin";
import { childEnv } from "./cli";

/**
 * Conectarea contului Claude fără terminal: rulăm `claude auth login --claudeai` cu stdin/stdout
 * prin pipe. CLI-ul deschide singur browserul pe pagina de conectare de la Anthropic și primește
 * răspunsul pe localhost; dacă browserul nu se deschide, afișează o adresă pe care utilizatorul o
 * poate deschide el, după care pagina îi dă un cod de lipit înapoi (îl trimitem pe stdin).
 * LexAI nu vede parola și nici tokenul: le păstrează CLI-ul (în Keychain pe macOS).
 */

export type LoginUpdate =
  | { type: "url"; url: string }
  /** CLI-ul a respins codul lipit (de obicei copiat incomplet) și așteaptă altul */
  | { type: "cod-invalid" }
  | { type: "gata" }
  | { type: "eroare"; message: string };

export interface ClaudeLogin {
  sendCode(code: string): void;
  cancel(): void;
}

const TIMEOUT_MS = 10 * 60_000;
const ANSI = /\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07/g;

export function startClaudeLogin(onUpdate: (u: LoginUpdate) => void): ClaudeLogin {
  const proc = spawn(claudeBin(), ["auth", "login", "--claudeai"], { env: childEnv(), stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
  let output = "";
  let urlSent = false;
  /** ieșirea de după ultimul cod trimis */
  let sinceCode: string | null = null;
  let finished = false;
  let cancelled = false;

  const finish = (u: LoginUpdate) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    onUpdate(u);
  };
  const timer = setTimeout(() => {
    proc.kill();
    finish({ type: "eroare", message: "Conectarea a expirat după 10 minute. Încearcă din nou." });
  }, TIMEOUT_MS);

  const read = (d: Buffer) => {
    output = (output + d.toString()).slice(-8000);
    if (sinceCode !== null && /Invalid code/i.test((sinceCode += d.toString()))) {
      sinceCode = null;
      onUpdate({ type: "cod-invalid" });
    }
    if (urlSent) return;
    // „If the browser didn't open, visit: https://…” — adresa cu cod de lipit, bună oricând
    // (spațiul de la final: adresa poate sosi în mai multe bucăți)
    const m = output.replace(ANSI, "").match(/(https:\/\/\S+\/oauth\/authorize\?\S+)\s/);
    if (m) {
      urlSent = true;
      onUpdate({ type: "url", url: m[1] });
    }
  };
  proc.stdout.on("data", read);
  proc.stderr.on("data", read);
  proc.stdin.on("error", () => {
    /* procesul s-a închis; rezultatul vine la „close” */
  });

  proc.once("error", (e: NodeJS.ErrnoException) =>
    finish({ type: "eroare", message: e.code === "ENOENT" ? "Claude Code nu este instalat." : `Nu am putut porni conectarea: ${e.message}` }),
  );
  proc.once("close", (code) => {
    if (cancelled) return finish({ type: "eroare", message: "Conectarea a fost anulată." });
    if (code === 0) return finish({ type: "gata" });
    const tail = output.replace(ANSI, "").trim().split("\n").filter((l) => !/^https?:\/\//.test(l.trim())).slice(-4).join("\n");
    finish({ type: "eroare", message: `Conectarea nu a reușit${code === null ? "" : ` (cod ${code})`}.${tail ? `\n${tail}` : ""}` });
  });

  return {
    sendCode(code: string) {
      if (finished) return;
      sinceCode = "";
      proc.stdin.write(`${code.trim()}\n`);
    },
    cancel() {
      if (finished) return;
      cancelled = true;
      proc.kill();
    },
  };
}
