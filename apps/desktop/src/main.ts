import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { app, BrowserWindow, dialog, Menu, nativeImage, nativeTheme, session, shell, type WebContents } from "electron";
import { resolveShellEnv } from "./env";
import { activeJobs, describeJobs } from "./jobs";
import { buildMenu, contextMenu } from "./menu";
import { errorPage, splashPage } from "./pages";
import { freePort, httpReady, Service, waitForHttp, type ServiceSpec } from "./services";
import { Updater } from "./updater";
import { loadWindowState, trackWindowState } from "./window-state";

/**
 * Procesul principal al aplicației desktop. Pornește serviciile LexAI (web, worker, terminal)
 * și afișează interfața web într-o fereastră nativă.
 *
 * - În dezvoltare (`pnpm desktop`) refolosește `pnpm dev` dacă rulează deja pe :3000, altfel îl
 *   pornește.
 * - Împachetat, rulează serviciile din resursele aplicației cu Node-ul din Electron
 *   (ELECTRON_RUN_AS_NODE).
 *
 * Datele (baza de date, fișierele încărcate, copiile de siguranță) și jurnalele serviciilor stau în
 * Documente/LexAI, pe macOS și pe Windows, ca la `pnpm dev`; `LEXAI_DATA_DIR` le poate muta.
 * În dosarul aplicației (Application Support, %APPDATA%) rămân doar profilul Chromium și poziția ferestrei.
 */

const dev = !app.isPackaged;
const isMac = process.platform === "darwin";
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const runtimeDir = app.isPackaged ? path.join(process.resourcesPath, "runtime") : path.join(__dirname, "..", "stage", `${isMac ? "mac" : "win"}-${process.arch}`, "runtime");
const DEV_URL = "http://localhost:3000";

app.setName("LexAI");
app.setPath("userData", path.join(app.getPath("appData"), dev ? "LexAI (dezvoltare)" : "LexAI"));
app.commandLine.appendSwitch("lang", "ro");

// getPath("documents") urmează și dosarul Documente mutat (de ex. în OneDrive pe Windows)
const dataDir = process.env.LEXAI_DATA_DIR || path.join(app.getPath("documents"), "LexAI");
const logDir = path.join(dataDir, "jurnale");

let services: Service[] = [];
/** serviciile au fost pornite de noi (nu un `pnpm dev` deja deschis) */
let managed = false;
let appUrl: string | null = null;
let win: BrowserWindow | null = null;
let quitting = false;
let starting: Promise<void> | null = null;
const updater = new Updater({ logDir, beforeInstall: () => prepareQuit() });

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return createWindow();
    if (win.isMinimized()) win.restore();
    win.focus();
  });
  void app.whenReady().then(ready);
}

async function ready() {
  app.setAboutPanelOptions({
    applicationName: "LexAI",
    applicationVersion: app.getVersion(),
    copyright: "Rulează local, pe acest calculator.",
    credits: "Documente juridice românești: redactare, editare și verificare pe textul oficial al legii.",
  });
  const icon = path.join(__dirname, "..", "resources", "icon.png");
  if (dev && existsSync(icon)) app.dock?.setIcon(nativeImage.createFromPath(icon));
  if (!isMac) app.setAppUserModelId("ro.lexai.desktop");

  const ses = session.defaultSession;
  ses.setUserAgent(`${ses.getUserAgent()} LexAIDesktop/${app.getVersion()}`);
  ses.setPermissionRequestHandler((wc, permission, done) => done(isAppUrl(wc.getURL()) && ["clipboard-read", "clipboard-sanitized-write", "fullscreen"].includes(permission)));
  ses.on("will-download", (_e, item) => {
    item.once("done", (_d, state) => {
      if (state === "completed") app.dock?.downloadFinished(item.getSavePath());
    });
  });

  Menu.setApplicationMenu(buildMenu({ dev, navigate, openLogs: () => void shell.openPath(logDir), openData: () => void shell.openPath(dataDir), checkUpdates: () => void updater.check(true) }));
  createWindow();
  await start();
  await updater.start();
}

function isAppUrl(url: string): boolean {
  return appUrl !== null && (url === appUrl || url.startsWith(`${appUrl}/`));
}

function navigate(route: string) {
  if (!appUrl) return;
  const w = BrowserWindow.getFocusedWindow() ?? win;
  if (!w) return createWindow();
  void w.loadURL(`${appUrl}${route}`);
}

// ——— fereastra ———

function createWindow() {
  const stateFile = path.join(app.getPath("userData"), "fereastra.json");
  const saved = loadWindowState(stateFile);
  const w = new BrowserWindow({
    ...(saved?.bounds ?? { width: 1360, height: 900 }),
    minWidth: 720,
    minHeight: 520,
    show: false,
    title: "LexAI",
    // pe macOS, bara aplicației ține loc de bara de titlu (butoanele ferestrei stau peste ea)
    ...(isMac ? { titleBarStyle: "hiddenInset" as const, trafficLightPosition: { x: 16, y: 17 } } : {}),
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#ffffff",
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true, plugins: true },
  });
  win = w;
  if (saved?.maximized) w.maximize();
  trackWindowState(w, stateFile);
  w.once("ready-to-show", () => w.show());
  w.on("closed", () => {
    if (win === w) win = null;
  });
  guard(w.webContents);
  w.on("enter-full-screen", () => markFullScreen(w));
  w.on("leave-full-screen", () => markFullScreen(w));
  w.webContents.on("did-finish-load", () => markFullScreen(w));
  void w.loadURL(appUrl ?? splashPage(dev ? "Pornesc serverul de dezvoltare…" : "Pornesc serverul, worker-ul și terminalul…"));
}

/** Pe ecran complet butoanele ferestrei dispar, deci bara aplicației nu mai lasă loc pentru ele. */
function markFullScreen(w: BrowserWindow) {
  if (w.isDestroyed() || !isAppUrl(w.webContents.getURL())) return;
  const js = w.isFullScreen() ? "document.documentElement.dataset.fullscreen='1'" : "delete document.documentElement.dataset.fullscreen";
  void w.webContents.executeJavaScript(js).catch(() => {});
}

/** Navigarea rămâne în aplicație; legăturile externe se deschid în browserul implicit. */
function guard(wc: WebContents) {
  wc.on("will-navigate", (e, url) => {
    if (url.startsWith("lexai://")) {
      e.preventDefault();
      if (url.startsWith("lexai://reincearca")) void start();
      else if (url.startsWith("lexai://jurnale")) void shell.openPath(logDir);
      return;
    }
    if (isAppUrl(url)) return;
    e.preventDefault();
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
  });
  wc.setWindowOpenHandler(({ url }) => {
    // PDF-ul de printat (rezerva din „Printează…”) și alte pagini ale aplicației: fereastră proprie
    if (url.startsWith("blob:") || isAppUrl(url)) {
      return { action: "allow", overrideBrowserWindowOptions: { width: 960, height: 1000, titleBarStyle: "default", webPreferences: { sandbox: true, plugins: true } } };
    }
    if (/^https?:\/\//.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  wc.on("did-create-window", (child) => guard(child.webContents));
  wc.on("context-menu", (_e, params) => contextMenu(wc, params, dev)?.popup());
}

// ——— serviciile ———

function start(): Promise<void> {
  starting ??= (async () => {
    try {
      appUrl = dev ? await startDev() : await startPackaged();
      if (win) await win.loadURL(`${appUrl}/`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const log = services.map((s) => s.lastLines()).filter(Boolean).join("\n").split("\n").slice(-25).join("\n");
      await Promise.all(services.map((s) => s.stop({ force: true })));
      services = [];
      appUrl = null;
      if (win) await win.loadURL(errorPage(message, log));
    } finally {
      starting = null;
    }
  })();
  return starting;
}

async function startDev(): Promise<string> {
  if (await httpReady(`${DEV_URL}/login`)) {
    console.log("[desktop] folosesc `pnpm dev` deja pornit pe :3000");
    managed = false;
    return DEV_URL;
  }
  const env = await resolveShellEnv();
  const svc = new Service(
    { name: "dev", command: "pnpm", args: ["dev"], cwd: repoRoot, env: { ...process.env, PATH: env.path, LEXAI_DATA_DIR: dataDir, ...(env.claude && { LEXAI_CLAUDE_BIN: env.claude }) } },
    logDir,
    true,
  );
  services = [svc];
  managed = true;
  svc.start();
  await waitForHttp(`${DEV_URL}/login`, svc, 240_000);
  return DEV_URL;
}

async function startPackaged(): Promise<string> {
  const appRoot = path.join(runtimeDir, "app");
  if (!existsSync(path.join(appRoot, "services", "run.mjs"))) throw new Error(`Lipsesc resursele aplicației (${runtimeDir}). Rulează „pnpm --filter @lexai/desktop build”.`);
  mkdirSync(dataDir, { recursive: true });
  const shellEnv = await resolveShellEnv();
  const webPort = await freePort(3150);
  const terminalPort = await freePort(webPort === 3150 ? 3151 : 0);
  const origin = `http://127.0.0.1:${webPort}`;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: shellEnv.path,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    LEXAI_DESKTOP: "1",
    LEXAI_APP_ROOT: appRoot,
    LEXAI_DATA_DIR: dataDir,
    LEXAI_TERMINAL_PORT: String(terminalPort),
    LEXAI_APP_ORIGIN: origin,
    ...(shellEnv.claude && { LEXAI_CLAUDE_BIN: shellEnv.claude }),
  };
  const run = path.join(appRoot, "services", "run.mjs");
  const specs: ServiceSpec[] = [
    { name: "web", command: process.execPath, args: [run, path.join(runtimeDir, "web", "apps", "web", "server.js")], cwd: path.join(runtimeDir, "web", "apps", "web"), env: { ...env, PORT: String(webPort), HOSTNAME: "127.0.0.1" } },
    { name: "worker", command: process.execPath, args: [run, path.join(appRoot, "services", "worker.mjs")], cwd: appRoot, env },
    { name: "terminal", command: process.execPath, args: [run, path.join(appRoot, "services", "terminal.mjs")], cwd: appRoot, env },
  ];
  services = specs.map((s) => new Service(s, logDir, false));
  managed = true;
  for (const s of services) {
    s.onCrash = () => restartLater(s);
    s.start();
  }
  if (!shellEnv.claude) console.warn("[desktop] CLI-ul Claude nu a fost găsit în PATH; funcțiile AI vor afișa eroarea din aplicație.");
  await waitForHttp(`${origin}/login`, services[0], 60_000);
  return origin;
}

const restarts = new Map<Service, number[]>();

/** Un serviciu căzut repornește după 2 s, de cel mult 5 ori în 5 minute. */
function restartLater(s: Service) {
  if (quitting) return;
  const now = Date.now();
  const recent = (restarts.get(s) ?? []).filter((t) => now - t < 5 * 60_000);
  if (recent.length >= 5) {
    if (s.spec.name === "web" && win) void win.loadURL(errorPage("Serverul aplicației se oprește în mod repetat.", s.lastLines().split("\n").slice(-25).join("\n")));
    return;
  }
  restarts.set(s, [...recent, now]);
  setTimeout(() => {
    if (!quitting && !s.running) s.start();
  }, 2000);
}

// ——— închiderea ———

app.on("before-quit", (e) => {
  if (quitting) return;
  e.preventDefault();
  void prepareQuit().then((ok) => ok && app.quit());
});

/**
 * Oprește serviciile înainte de ieșire (sau de instalarea unei actualizări). Dacă rulează joburi
 * AI, întreabă întâi; `false` = utilizatorul a renunțat.
 */
async function prepareQuit(): Promise<boolean> {
  let interrupt = false;
  if (managed) {
    const jobs = activeJobs(path.join(dataDir, "lexai.db"));
    if (jobs.length) {
      const { response } = await dialog.showMessageBox({
        type: "warning",
        buttons: ["Închide oricum", "Renunță"],
        defaultId: 1,
        cancelId: 1,
        message: jobs.length === 1 ? "Un job AI rulează încă." : `${jobs.length} joburi AI rulează încă.`,
        detail: `${describeJobs(jobs)}\n\nDacă închizi acum, se întrerup și le poți relua după repornire.`,
      });
      if (response === 1) return false;
      interrupt = true;
    }
  }
  quitting = true;
  updater.stop();
  await Promise.all(services.map((s) => s.stop({ force: interrupt && s.spec.name === "worker" })));
  return true;
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (app.isReady() && BrowserWindow.getAllWindows().length === 0) createWindow();
});

for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => app.quit());
process.on("exit", () => services.forEach((s) => s.killNow()));
