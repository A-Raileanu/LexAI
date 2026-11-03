import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, createWriteStream, existsSync, mkdtempSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { nativeClaudePath } from "./bin";

/**
 * Instalează Claude Code ca instalatorul oficial (https://claude.ai/install.sh și install.ps1),
 * dar fără shell: citim versiunea curentă și manifestul ei de pe downloads.claude.ai, descărcăm
 * binarul pentru acest calculator, îi verificăm SHA-256 cu cel din manifest și rulăm
 * `<binar> install`, care pune lansatorul în ~/.local/bin, cu actualizări automate. Nu cere
 * drepturi de administrator, nici pe macOS, nici pe Windows.
 */

export const RELEASES_URL = "https://downloads.claude.ai/claude-code-releases";

export type InstallProgress =
  | { stage: "versiune" }
  | { stage: "descarc"; version: string; received: number; total: number }
  | { stage: "instalez"; version: string };

export interface InstallOptions {
  onProgress?: (p: InstallProgress) => void;
  signal?: AbortSignal;
  /** pentru teste: alt dosar personal și altă sursă a versiunilor */
  home?: string;
  baseUrl?: string;
  platform?: string;
}

export interface InstallResult {
  version: string;
  path: string;
}

/** Numele platformei din manifest: darwin-arm64, darwin-x64, win32-x64, linux-x64-musl… */
export function claudePlatform(): string {
  const os = process.platform;
  let arch = process.arch === "arm64" ? "arm64" : "x64";
  if (os === "darwin" && arch === "x64") {
    // aplicația Intel rulată prin Rosetta pe un Mac cu Apple Silicon: binarul nativ e arm64
    try {
      if (execFileSync("sysctl", ["-n", "sysctl.proc_translated"], { encoding: "utf8" }).trim() === "1") arch = "arm64";
    } catch {
      // cheia lipsește pe Mac-urile Intel
    }
  }
  if (os === "darwin" || os === "win32") return `${os}-${arch}`;
  const glibc = (process.report?.getReport() as { header?: { glibcVersionRuntime?: string } } | undefined)?.header?.glibcVersionRuntime;
  return `linux-${arch}${glibc ? "" : "-musl"}`;
}

const VERSION_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

interface ManifestEntry {
  binary?: unknown;
  checksum?: unknown;
  size?: unknown;
}

async function fetchOk(url: string, signal?: AbortSignal): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, { signal, cache: "no-store" });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error("Nu am putut contacta serverul Anthropic. Verifică legătura la internet.");
  }
  if (!res.ok) throw new Error(`Serverul Anthropic a răspuns cu ${res.status} pentru ${url}.`);
  return res;
}

/** Descarcă binarul pe disc, calculând SHA-256 pe parcurs. */
async function download(url: string, file: string, total: number, onChunk: (received: number) => void, signal?: AbortSignal): Promise<string> {
  const res = await fetchOk(url, signal);
  if (!res.body) throw new Error("Descărcarea nu a întors date.");
  const hash = createHash("sha256");
  const out = createWriteStream(file, { mode: 0o755 });
  let received = 0;
  let lastReport = 0;
  try {
    const reader = res.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      received += value.byteLength;
      if (received > total) throw new Error("Fișierul descărcat e mai mare decât cel din manifest.");
      if (!out.write(value)) await new Promise<void>((r) => out.once("drain", r));
      if (received - lastReport > 1 << 20 || received === total) {
        lastReport = received;
        onChunk(received);
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => out.end((e?: Error | null) => (e ? reject(e) : resolve())));
  }
  if (received !== total) throw new Error("Descărcarea s-a întrerupt. Încearcă din nou.");
  return hash.digest("hex");
}

/** Rulează `<binar> install`; întoarce ultimele rânduri ale ieșirii dacă eșuează. */
function runInstall(file: string, home: string | undefined, signal?: AbortSignal): Promise<void> {
  // mediu curat: fără setările unei alte sesiuni Claude (de ex. actualizări oprite, alt server)
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDE|ANTHROPIC_|DISABLE_(AUTO)?UPDATE)/.test(k))) as NodeJS.ProcessEnv;
  if (home) Object.assign(env, { HOME: home, USERPROFILE: home });
  return new Promise((resolve, reject) => {
    const proc = spawn(file, ["install"], { env, cwd: home ?? homedir(), stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let output = "";
    const keep = (d: Buffer) => {
      output = (output + d.toString()).slice(-4000);
    };
    proc.stdout.on("data", keep);
    proc.stderr.on("data", keep);
    const timer = setTimeout(() => proc.kill(), 5 * 60_000);
    const abort = () => proc.kill();
    signal?.addEventListener("abort", abort, { once: true });
    proc.once("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`Nu am putut porni instalarea: ${e.message}`));
    });
    proc.once("close", (code) => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      if (code === 0) return resolve();
      // fără coduri de culoare în mesajul afișat
      const tail = output.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, "").trim().split("\n").slice(-6).join("\n");
      reject(new Error(`Instalarea Claude Code a eșuat (cod ${code ?? "oprit"}).${tail ? `\n${tail}` : ""}`));
    });
  });
}

export async function installClaude(opts: InstallOptions = {}): Promise<InstallResult> {
  const base = opts.baseUrl ?? RELEASES_URL;
  const platform = opts.platform ?? claudePlatform();
  opts.onProgress?.({ stage: "versiune" });

  const version = (await (await fetchOk(`${base}/latest`, opts.signal)).text()).trim();
  if (!VERSION_RE.test(version)) throw new Error("Serverul Anthropic a întors o versiune neașteptată.");
  const manifest = (await (await fetchOk(`${base}/${version}/manifest.json`, opts.signal)).json()) as { platforms?: Record<string, ManifestEntry> };
  const entry = manifest.platforms?.[platform];
  const checksum = typeof entry?.checksum === "string" ? entry.checksum.toLowerCase() : "";
  const size = typeof entry?.size === "number" ? entry.size : 0;
  const binary = entry?.binary === "claude" || entry?.binary === "claude.exe" ? entry.binary : null;
  if (!binary || !/^[0-9a-f]{64}$/.test(checksum) || size <= 0) throw new Error(`Claude Code nu are o versiune pentru această platformă (${platform}).`);

  const dir = mkdtempSync(path.join(tmpdir(), "lexai-claude-"));
  const file = path.join(dir, binary);
  try {
    opts.onProgress?.({ stage: "descarc", version, received: 0, total: size });
    const sha = await download(`${base}/${version}/${platform}/${binary}`, file, size, (received) => opts.onProgress?.({ stage: "descarc", version, received, total: size }), opts.signal);
    if (sha !== checksum) throw new Error("Fișierul descărcat nu corespunde sumei de control publicate de Anthropic. Nu l-am instalat.");
    if (process.platform !== "win32") chmodSync(file, 0o755);
    opts.onProgress?.({ stage: "instalez", version });
    await runInstall(file, opts.home, opts.signal);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  const installed = nativeClaudePath(opts.home);
  if (!existsSync(installed)) throw new Error(`Instalarea s-a terminat, dar ${installed} lipsește.`);
  return { version, path: installed };
}
