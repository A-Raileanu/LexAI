import { readFileSync, writeFileSync } from "node:fs";
import { screen, type BrowserWindow, type Rectangle } from "electron";

/** Poziția și mărimea ferestrei, păstrate între porniri (doar dacă încap pe un ecran conectat). */

interface Saved {
  bounds: Rectangle;
  maximized: boolean;
}

export function loadWindowState(file: string): Saved | null {
  try {
    const s = JSON.parse(readFileSync(file, "utf8")) as Saved;
    const visible = screen.getAllDisplays().some((d) => {
      const a = d.workArea;
      return s.bounds.x < a.x + a.width - 100 && s.bounds.x + s.bounds.width > a.x + 100 && s.bounds.y >= a.y - 10 && s.bounds.y < a.y + a.height - 100;
    });
    return visible ? s : null;
  } catch {
    return null;
  }
}

export function trackWindowState(win: BrowserWindow, file: string) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const save = () => {
    if (win.isDestroyed() || win.isFullScreen() || win.isMinimized()) return;
    const state: Saved = { bounds: win.isMaximized() ? win.getNormalBounds() : win.getBounds(), maximized: win.isMaximized() };
    try {
      writeFileSync(file, JSON.stringify(state));
    } catch {
      // fără stare salvată, fereastra se deschide la mărimea implicită
    }
  };
  const later = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 400);
  };
  win.on("resize", later);
  win.on("move", later);
  win.on("close", save);
}
