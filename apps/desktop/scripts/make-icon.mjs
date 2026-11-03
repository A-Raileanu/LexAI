// Generează iconul aplicației (resources/icon.png 1024 px și resources/icon.icns) din semnul
// LexAI (rombul cu semnul de secțiune), randat de Chromium. Rulare: npx electron scripts/make-icon.mjs
import { app, BrowserWindow } from "electron";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const res = path.join(import.meta.dirname, "..", "resources");
const html = `<!doctype html><html><body style="margin:0;background:transparent">
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2b2e"/><stop offset="1" stop-color="#0b0b0c"/></linearGradient>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#000" flood-opacity=".35"/></filter>
  </defs>
  <rect x="100" y="100" width="824" height="824" rx="185" fill="url(#bg)" filter="url(#sh)"/>
  <rect x="100.5" y="100.5" width="823" height="823" rx="184.5" fill="none" stroke="#fff" stroke-opacity=".08"/>
  <g transform="translate(512 512) scale(21) translate(-12 -12)">
    <rect x="4" y="4" width="16" height="16" rx="3" transform="rotate(45 12 12)" fill="#fafafa"/>
    <path d="M9.5 9.2c0-1 1-1.7 2.5-1.7s2.4.6 2.5 1.6M14.5 14.8c0 1-1 1.7-2.5 1.7s-2.4-.6-2.5-1.6M9.6 11.1c.6-.6 1.5-.8 2.4-.8 1.5 0 2.5.7 2.5 1.7s-1 1.7-2.5 1.7c-.9 0-1.8-.2-2.4-.8" fill="none" stroke="#111" stroke-width="1.3" stroke-linecap="round"/>
  </g>
</svg></body></html>`;

app.dock?.hide();
app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 1024, height: 1024, show: false, transparent: true, frame: false, useContentSize: true, webPreferences: { offscreen: true } });
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((r) => setTimeout(r, 400));
  const img = (await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 })).resize({ width: 1024, height: 1024 });
  mkdirSync(res, { recursive: true });
  const png = path.join(res, "icon.png");
  writeFileSync(png, img.toPNG());
  const set = path.join(res, "icon.iconset");
  rmSync(set, { recursive: true, force: true });
  mkdirSync(set);
  for (const s of [16, 32, 128, 256, 512]) {
    execFileSync("sips", ["-z", String(s), String(s), png, "--out", path.join(set, `icon_${s}x${s}.png`)], { stdio: "ignore" });
    execFileSync("sips", ["-z", String(s * 2), String(s * 2), png, "--out", path.join(set, `icon_${s}x${s}@2x.png`)], { stdio: "ignore" });
  }
  execFileSync("iconutil", ["-c", "icns", set, "-o", path.join(res, "icon.icns")]);
  rmSync(set, { recursive: true, force: true });
  console.log("icon.png și icon.icns sunt în", res);
  app.quit();
});
