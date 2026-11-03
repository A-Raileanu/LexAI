// Pregătește resursele aplicației împachetate, câte un set pe platformă, în
// apps/desktop/stage/<os>-<arch>/runtime (os: mac sau win, ca macro-ul ${os} din electron-builder):
//   web/                      serverul Next autonom (output: "standalone", build-ul desktop)
//   app/                      rădăcina serviciilor (LEXAI_APP_ROOT):
//     services/               worker-ul și terminalul, compilate cu esbuild, plus lansatorul run.mjs
//     node_modules/           dependențele lor externe (npm, plat)
//     packages/db/drizzle/    migrările bazei de date
// (node_modules nu poate sta direct în runtime/: electron-builder îl omite din resurse)
// Modulele native (better-sqlite3, node-pty, @napi-rs/canvas) folosesc N-API, deci merg neschimbate
// în Node-ul din Electron; contează doar platforma și arhitectura binarului, alese aici.
//
// Opțiuni: --skip-web refolosește build-ul Next existent; --targets mac-arm64,mac-x64,win-x64
// (implicit platforma acestui calculator).
import { execFileSync } from "node:child_process";
import { builtinModules } from "node:module";
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";

const desktop = path.resolve(import.meta.dirname, "..");
const repo = path.resolve(desktop, "..", "..");
const web = path.join(repo, "apps", "web");
const skipWeb = process.argv.includes("--skip-web");
const NODE_OS = { mac: "darwin", win: "win32" };
const hostKey = `${process.platform === "win32" ? "win" : "mac"}-${process.arch}`;
const targetsArg = process.argv.find((a) => a.startsWith("--targets="))?.slice("--targets=".length);
const targets = (targetsArg ?? hostKey).split(",").map((t) => t.trim()).filter(Boolean);
for (const t of targets) if (!/^(mac|win)-(arm64|x64)$/.test(t)) throw new Error(`Țintă necunoscută: ${t} (exemplu: mac-arm64, mac-x64, win-x64)`);

const step = (msg) => console.log(`\n▸ ${msg}`);

// 1. serverul web
if (!skipWeb) {
  step("next build (autonom)");
  execFileSync("npx", ["next", "build"], { cwd: web, stdio: "inherit", env: { ...process.env, LEXAI_DESKTOP_BUILD: "1" } });
}
const standalone = path.join(web, ".next-desktop", "standalone");
if (!existsSync(path.join(standalone, "apps", "web", "server.js"))) throw new Error("Lipsește build-ul autonom al aplicației web; rulează fără --skip-web.");

// 2. worker-ul și terminalul (aceleași pentru toate platformele)
step("compilez worker-ul și terminalul");
const servicesOut = path.join(desktop, "stage", "_servicii");
rmSync(servicesOut, { recursive: true, force: true });
const externals = new Set();
const builtins = new Set(builtinModules);
const externalize = {
  name: "externe",
  setup(b) {
    b.onResolve({ filter: /^[^./]/ }, (args) => {
      if (args.path.startsWith("@lexai/")) return null;
      const name = args.path.startsWith("@") ? args.path.split("/").slice(0, 2).join("/") : args.path.split("/")[0];
      if (!args.path.startsWith("node:") && !builtins.has(name)) externals.add(name);
      return { path: args.path, external: true };
    });
  },
};
for (const [name, entry] of [
  ["worker", path.join(repo, "services", "worker", "src", "index.ts")],
  ["terminal", path.join(repo, "services", "terminal", "src", "index.ts")],
]) {
  await build({
    entryPoints: [entry],
    outfile: path.join(servicesOut, `${name}.mjs`),
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node24",
    plugins: [externalize],
    banner: { js: 'import { createRequire as __lexaiRequire } from "node:module"; const require = __lexaiRequire(import.meta.url);' },
    logLevel: "warning",
  });
}
cpSync(path.join(desktop, "runtime", "run.mjs"), path.join(servicesOut, "run.mjs"));

// dependențele externe, la versiunile din workspace
// pdfmake: încărcat dinamic de exportul PDF din serverul web (apps/web/src/server/pdf.ts)
externals.add("pdfmake");
// word-extractor: încărcat cu createRequire în packages/core/src/parse/doc.ts, deci invizibil pentru esbuild
externals.add("word-extractor");
const owners = [path.join(repo, "services", "worker"), path.join(repo, "services", "terminal"), web, ...readdirSync(path.join(repo, "packages")).map((p) => path.join(repo, "packages", p))];
const versionOf = (name) => {
  for (const dir of owners) {
    const pkg = path.join(dir, "node_modules", name, "package.json");
    if (existsSync(pkg)) return JSON.parse(readFileSync(pkg, "utf8")).version;
  }
  throw new Error(`Nu găsesc versiunea instalată pentru ${name}.`);
};
const dependencies = Object.fromEntries([...externals].sort().map((n) => [n, versionOf(n)]));
console.log(dependencies);

/** Păstrează în `dir` doar intrările pentru care `keep(nume)` e adevărat. */
const prune = (dir, keep) => {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir)) if (!keep(e)) rmSync(path.join(dir, e), { recursive: true, force: true });
};

/** Înlocuiește fiecare legătură simbolică din `dir` cu o copie a țintei ei (și pe cele din copii). */
const materializeLinks = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) {
      const real = realpathSync(p);
      rmSync(p, { force: true });
      cpSync(real, p, { recursive: true, verbatimSymlinks: true });
      if (statSync(p).isDirectory()) materializeLinks(p);
    } else if (e.isDirectory()) materializeLinks(p);
  }
};

/** Șterge legăturile simbolice care nu mai duc nicăieri (de ex. spre pachetele scoase mai sus). */
const removeBrokenLinks = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) {
      if (!existsSync(p)) rmSync(p, { force: true });
    } else if (e.isDirectory()) removeBrokenLinks(p);
  }
};

const size = (dir) => {
  let total = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) continue;
    total += e.isDirectory() ? size(p) : statSync(p).size;
  }
  return total;
};

for (const target of targets) {
  const [osName, arch] = target.split("-");
  const nodeOs = NODE_OS[osName];
  const platformKey = `${nodeOs}-${arch}`;
  const out = path.join(desktop, "stage", target, "runtime");
  const appRoot = path.join(out, "app");

  step(`${target}: serverul web`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(standalone, path.join(out, "web"), { recursive: true, verbatimSymlinks: true });
  // Windows: legăturile simbolice ale pnpm devin copii (nu se pot crea fără drepturi de administrator)
  if (osName === "win") materializeLinks(path.join(out, "web"));
  cpSync(path.join(web, ".next-desktop", "static"), path.join(out, "web", "apps", "web", ".next-desktop", "static"), { recursive: true });
  if (existsSync(path.join(web, "public")) && readdirSync(path.join(web, "public")).length) cpSync(path.join(web, "public"), path.join(out, "web", "apps", "web", "public"), { recursive: true });
  // sursele copiate de urmărirea fișierelor nu sunt folosite la rulare
  for (const extra of ["src", "tests", "scripts", "tsconfig.json", "tsconfig.tsbuildinfo", "components.json", "postcss.config.mjs", "next.config.ts"]) {
    rmSync(path.join(out, "web", "apps", "web", extra), { recursive: true, force: true });
  }

  step(`${target}: dependențele serviciilor`);
  mkdirSync(appRoot, { recursive: true });
  cpSync(servicesOut, path.join(appRoot, "services"), { recursive: true });
  writeFileSync(path.join(appRoot, "package.json"), JSON.stringify({ name: "lexai-runtime", private: true, type: "module", dependencies }, null, 2));
  // --os/--cpu: dependențele opționale native (de ex. @napi-rs/canvas) pentru platforma țintă
  execFileSync("npm", ["install", "--omit=dev", "--no-audit", "--no-fund", "--no-package-lock", "--loglevel=error", `--os=${nodeOs}`, `--cpu=${arch}`], { cwd: appRoot, stdio: "inherit" });
  // cu package.json alături, electron-builder ar trata node_modules ca dependențe proprii și l-ar omite
  rmSync(path.join(appRoot, "package.json"));

  // binarele native: doar cele ale platformei țintă
  const sqlitePrebuilds = path.join(appRoot, "node_modules", "better-sqlite3", "prebuilds");
  if (!existsSync(path.join(sqlitePrebuilds, `${platformKey}.node`))) throw new Error(`better-sqlite3 nu are binar pentru ${platformKey}.`);
  prune(path.join(appRoot, "node_modules", "node-pty", "prebuilds"), (d) => d === platformKey);
  const ptyDir = path.join(appRoot, "node_modules", "node-pty", "prebuilds", platformKey);
  if (!existsSync(ptyDir)) throw new Error(`node-pty nu are binar pentru ${platformKey}.`);
  if (existsSync(path.join(ptyDir, "spawn-helper"))) chmodSync(path.join(ptyDir, "spawn-helper"), 0o755);

  // Next copiază din pachetele externe doar fișierele urmărite static; cele încărcate dinamic lipsesc
  // (de ex. pdf.worker.mjs, pornit de pdf.js la citirea PDF-urilor). Completăm pachetele comune cu
  // serviciile cu copia întreagă instalată mai sus, la aceeași versiune.
  const pnpmDir = path.join(out, "web", "node_modules", ".pnpm");
  for (const d of readdirSync(pnpmDir)) {
    const at = d.lastIndexOf("@");
    if (at <= 0) continue;
    const name = d.slice(0, at).replace("+", "/");
    const traced = path.join(pnpmDir, d, "node_modules", name);
    const full = path.join(appRoot, "node_modules", name);
    // copia urmărită poate să nu aibă nici package.json: versiunea vine din numele dosarului (nume@versiune_…)
    if (!existsSync(traced) || !existsSync(path.join(full, "package.json"))) continue;
    if (d.slice(at + 1).split("_")[0] !== JSON.parse(readFileSync(path.join(full, "package.json"), "utf8")).version) continue;
    rmSync(traced, { recursive: true, force: true });
    cpSync(full, traced, { recursive: true, dereference: true });
  }

  // serverul web are propria copie better-sqlite3 (urmărită de Next doar pentru acest calculator)
  for (const d of readdirSync(pnpmDir).filter((d) => d.startsWith("better-sqlite3@"))) {
    const pre = path.join(pnpmDir, d, "node_modules", "better-sqlite3", "prebuilds");
    rmSync(pre, { recursive: true, force: true });
    mkdirSync(pre, { recursive: true });
    cpSync(path.join(sqlitePrebuilds, `${platformKey}.node`), path.join(pre, `${platformKey}.node`));
  }
  prune(sqlitePrebuilds, (f) => f === `${platformKey}.node`);
  // pdf.js din serverul web caută opțional @napi-rs/canvas (pe care Next nu îl copiază): îl luăm din serviciile țintei
  for (const d of readdirSync(path.join(appRoot, "node_modules", "@napi-rs")).filter((d) => d.startsWith("canvas"))) {
    cpSync(path.join(appRoot, "node_modules", "@napi-rs", d), path.join(out, "web", "node_modules", "@napi-rs", d), { recursive: true });
  }
  // sharp (optimizarea imaginilor din Next, nefolosită) e instalat doar pentru acest calculator
  if (target !== hostKey) {
    prune(pnpmDir, (d) => !d.startsWith("sharp@") && !d.startsWith("@img+"));
    prune(path.join(pnpmDir, "node_modules"), (d) => d !== "sharp" && d !== "@img");
    removeBrokenLinks(path.join(out, "web", "node_modules"));
  }

  // migrările și reperul pentru încărcarea dinamică din pdf.ts
  cpSync(path.join(repo, "packages", "db", "drizzle"), path.join(appRoot, "packages", "db", "drizzle"), { recursive: true });
  mkdirSync(path.join(appRoot, "packages", "core"), { recursive: true });
  writeFileSync(path.join(appRoot, "packages", "core", "package.json"), JSON.stringify({ name: "@lexai/core", private: true }, null, 2));

  console.log(`✓ ${target}: ${path.relative(repo, out)} (${Math.round(size(out) / 1e6)} MB)`);
}
rmSync(servicesOut, { recursive: true, force: true });
