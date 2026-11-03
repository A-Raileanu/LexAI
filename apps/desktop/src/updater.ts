import { execFile } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { app, dialog, shell } from "electron";
import { autoUpdater, type UpdateInfo } from "electron-updater";

/**
 * Actualizările aplicației (electron-updater), din GitHub Releases. Build-ul de release scrie în
 * resurse `app-update.yml` (de unde se iau versiunile); fără el (build-urile locale) actualizările
 * sunt oprite.
 *
 * - Windows și macOS semnat cu Developer ID: versiunea nouă se descarcă în fundal și se instalează
 *   la închidere; când e gata, întrebăm dacă repornim acum.
 * - macOS semnat ad-hoc: Squirrel.Mac refuză actualizarea (semnătura nu e verificabilă), deci doar
 *   anunțăm versiunea nouă și deschidem pagina de descărcare.
 */

const CHECK_EVERY_MS = 4 * 60 * 60_000;
const FIRST_CHECK_MS = 15_000;

export interface UpdaterOptions {
  logDir: string;
  /** închide serviciile (după confirmare, dacă rulează joburi); `false` = utilizatorul a renunțat */
  beforeInstall: () => Promise<boolean>;
}

interface FeedConfig {
  provider: string;
  /** pagina deschisă când actualizarea nu se poate instala automat */
  page: string;
}

function readFeed(): FeedConfig | null {
  const file = path.join(process.resourcesPath, "app-update.yml");
  if (!existsSync(file)) return null;
  const yml = readFileSync(file, "utf8");
  const get = (k: string) => yml.match(new RegExp(`^${k}:\\s*['"]?([^'"\\n]+)`, "m"))?.[1]?.trim();
  const provider = get("provider") ?? "";
  if (provider === "github") return { provider, page: `https://github.com/${get("owner")}/${get("repo")}/releases/latest` };
  return { provider, page: get("url") ?? "" };
}

/** Semnătura ad-hoc (fără Team ID) nu permite instalarea automată pe macOS. */
function macCanInstall(): Promise<boolean> {
  if (process.platform !== "darwin") return Promise.resolve(true);
  const bundle = path.resolve(process.execPath, "..", "..", "..");
  return new Promise((resolve) => {
    execFile("codesign", ["-dv", "--verbose=2", bundle], (_err, stdout, stderr) => {
      const out = `${stdout}${stderr}`;
      resolve(/TeamIdentifier=(?!not set)\S+/.test(out));
    });
  });
}

export class Updater {
  private feed: FeedConfig | null = null;
  private autoInstall = true;
  private interactive = false;
  private prompted = new Set<string>();
  private downloaded: string | null = null;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly opts: UpdaterOptions) {}

  get enabled(): boolean {
    return this.feed !== null;
  }

  async start(): Promise<void> {
    if (!app.isPackaged) return;
    this.feed = readFeed();
    if (!this.feed) return;
    this.autoInstall = await macCanInstall();
    const log = (level: string) => (m: unknown) => this.log(level, m);
    autoUpdater.logger = { info: log("info"), warn: log("warn"), error: log("error"), debug: () => {} };
    autoUpdater.autoDownload = this.autoInstall;
    autoUpdater.autoInstallOnAppQuit = this.autoInstall;
    autoUpdater.allowPrerelease = false;

    autoUpdater.on("update-available", (info) => void this.onAvailable(info));
    autoUpdater.on("update-not-available", (info) => {
      if (this.interactive) void dialog.showMessageBox({ type: "info", message: "Ai cea mai nouă versiune.", detail: `LexAI ${info.version}` });
      this.interactive = false;
    });
    autoUpdater.on("update-downloaded", (info) => void this.onDownloaded(info));
    autoUpdater.on("error", (e) => {
      this.log("error", e);
      if (this.interactive) void dialog.showMessageBox({ type: "warning", message: "Nu am putut verifica actualizările.", detail: e instanceof Error ? e.message : String(e) });
      this.interactive = false;
    });

    setTimeout(() => void this.check(false), FIRST_CHECK_MS);
    this.timer = setInterval(() => void this.check(false), CHECK_EVERY_MS);
  }

  /** Din meniu: „Caută actualizări…”, cu răspuns și când nu e nimic nou. */
  async check(interactive: boolean): Promise<void> {
    if (!this.feed) {
      if (interactive) {
        await dialog.showMessageBox({
          type: "info",
          message: "Actualizările automate nu sunt active în această versiune.",
          detail: "Sunt active doar în versiunile publicate pe GitHub Releases.",
        });
      }
      return;
    }
    if (this.downloaded) {
      if (interactive) await this.onDownloaded({ version: this.downloaded } as UpdateInfo, true);
      return;
    }
    this.interactive = interactive;
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      // raportat prin evenimentul „error”
    }
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async onAvailable(info: UpdateInfo) {
    const interactive = this.interactive;
    this.interactive = false;
    if (this.autoInstall) {
      if (interactive) await dialog.showMessageBox({ type: "info", message: `Descarc LexAI ${info.version}.`, detail: "Te anunț când e gata de instalare." });
      return;
    }
    if (this.prompted.has(info.version) && !interactive) return;
    this.prompted.add(info.version);
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Descarcă", "Mai târziu"],
      defaultId: 0,
      cancelId: 1,
      message: `Versiunea ${info.version} a LexAI e disponibilă.`,
      detail: `Ai versiunea ${app.getVersion()}. Pe acest Mac, aplicația nu se poate actualiza singură: descarcă versiunea nouă și înlocuiește LexAI din Aplicații. Datele tale din Documente/LexAI rămân neatinse.`,
    });
    if (response === 0 && this.feed?.page) void shell.openExternal(this.feed.page);
  }

  private async onDownloaded(info: Pick<UpdateInfo, "version">, force = false) {
    this.downloaded = info.version;
    if (this.prompted.has(info.version) && !force) return;
    this.prompted.add(info.version);
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Repornește acum", "Mai târziu"],
      defaultId: 0,
      cancelId: 1,
      message: `LexAI ${info.version} e gata de instalare.`,
      detail: "Se instalează automat când închizi aplicația. Datele tale din Documente/LexAI rămân neatinse.",
    });
    if (response !== 0) return;
    if (!(await this.opts.beforeInstall())) return;
    autoUpdater.quitAndInstall();
  }

  private log(level: string, m: unknown) {
    try {
      mkdirSync(this.opts.logDir, { recursive: true });
      const text = m instanceof Error ? (m.stack ?? m.message) : typeof m === "string" ? m : JSON.stringify(m);
      appendFileSync(path.join(this.opts.logDir, "actualizari.log"), `${new Date().toISOString()} [${level}] ${text}\n`);
    } catch {
      // jurnalul nu e esențial
    }
  }
}
