// Generează iconurile aplicației (resources/icon.png 1024 px și icon.icns pentru macOS, icon-win.png
// pentru Windows) din imaginea
// resources/icon-source.png (balanța justiției pe fundal negru), pusă în pătratul rotunjit al
// iconurilor macOS și randată de Chromium. Rulare: npx electron scripts/make-icon.mjs
import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const res = path.join(import.meta.dirname, "..", "resources");
// din fișier, nu ca data: URL (Chromium nu încarcă URL-uri de peste 2 MB)
const source = pathToFileURL(path.join(res, "icon-source.png")).href;
const tmp = mkdtempSync(path.join(tmpdir(), "lexai-icon-"));
// macOS: corpul iconului are 824 px din 1024 (grila Apple), cu colțuri de 185 px. Windows: iconul
// umple tot pătratul (taskbar-ul și meniul Start nu adaugă margini). Imaginea e mărită puțin peste
// corp (fundalul ei e negru), ca balanța să umple iconul.
const page = (svg) => `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`;
const macHtml = page(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <clipPath id="body"><rect x="100" y="100" width="824" height="824" rx="185"/></clipPath>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity=".35"/></filter>
  </defs>
  <rect x="100" y="100" width="824" height="824" rx="185" fill="#000" filter="url(#sh)"/>
  <image href="${source}" x="37" y="37" width="950" height="950" clip-path="url(#body)"/>
  <rect x="100.5" y="100.5" width="823" height="823" rx="184.5" fill="none" stroke="#fff" stroke-opacity=".1"/>
</svg>`);
const winHtml = page(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs><clipPath id="body"><rect width="1024" height="1024" rx="190"/></clipPath></defs>
  <rect width="1024" height="1024" rx="190" fill="#000"/>
  <image href="${source}" x="-38" y="-10" width="1100" height="1100" clip-path="url(#body)"/>
</svg>`);

// o singură fereastră pentru ambele variante (a doua fereastră nu mai încarcă pagina)
async function render(win, name, html) {
  const file = path.join(tmp, `${name}.html`);
  writeFileSync(file, html);
  await win.loadFile(file);
  await new Promise((r) => setTimeout(r, 400));
  const img = (await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 })).resize({ width: 1024, height: 1024 });
  return img.toPNG();
}

app.dock?.hide();
app.whenReady().then(async () => {
  mkdirSync(res, { recursive: true });
  const png = path.join(res, "icon.png");
  const win = new BrowserWindow({ width: 1024, height: 1024, show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
  writeFileSync(png, await render(win, "mac", macHtml));
  writeFileSync(path.join(res, "icon-win.png"), await render(win, "win", winHtml));
  win.destroy();
  const set = path.join(res, "icon.iconset");
  rmSync(set, { recursive: true, force: true });
  mkdirSync(set);
  for (const s of [16, 32, 128, 256, 512]) {
    execFileSync("sips", ["-z", String(s), String(s), png, "--out", path.join(set, `icon_${s}x${s}.png`)], { stdio: "ignore" });
    execFileSync("sips", ["-z", String(s * 2), String(s * 2), png, "--out", path.join(set, `icon_${s}x${s}@2x.png`)], { stdio: "ignore" });
  }
  execFileSync("iconutil", ["-c", "icns", set, "-o", path.join(res, "icon.icns")]);
  rmSync(set, { recursive: true, force: true });
  rmSync(tmp, { recursive: true, force: true });
  console.log("icon.png, icon.icns și icon-win.png sunt în", res);
  app.quit();
});
