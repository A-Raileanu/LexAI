import type { LayoutStorage } from "react-resizable-panels";

/**
 * Lățimea panoului lateral (docs/ux/18-chat-editor.md): implicit 440 px, între 360 și 720.
 * Lățimea aleasă se reține local (react-resizable-panels, procente din fereastră) sub o cheie nouă;
 * la prima deschidere, lățimea veche (implicit 360 px) se mărește la 440, iar un panou mai lat sau
 * închis rămâne cum era.
 */

export const PANEL_LAYOUT_ID = "lexai-editor-layout-v2";
export const SIDE_DEFAULT_PX = 440;
export const SIDE_MIN_PX = 360;
export const SIDE_MAX_PX = 720;

const OLD_LAYOUT_KEY = "react-resizable-panels:lexai-editor-layout:main:side";

/** Aspectul vechi (`{ main, side }` în procente), adus la lățimea nouă pentru fereastra dată. */
export function migrateLayout(raw: string | null, windowWidth: number): string | null {
  if (!raw || !(windowWidth > 0)) return null;
  let side: unknown;
  try {
    side = (JSON.parse(raw) as { side?: unknown }).side;
  } catch {
    return null;
  }
  if (typeof side !== "number" || !Number.isFinite(side)) return null;
  // închis rămâne închis; mai lat decât noul implicit rămâne cum l-a lăsat utilizatorul
  if (side <= 0 || (side / 100) * windowWidth >= SIDE_DEFAULT_PX) return raw;
  const pct = Math.min(60, (SIDE_DEFAULT_PX / windowWidth) * 100);
  return JSON.stringify({ main: 100 - pct, side: pct });
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Stocarea aspectului: cheia nouă, cu migrarea celei vechi cât cea nouă lipsește. */
export const layoutStorage: LayoutStorage = {
  getItem(key) {
    const value = read(key);
    if (value !== null || !key.includes(PANEL_LAYOUT_ID)) return value;
    return migrateLayout(read(OLD_LAYOUT_KEY), window.innerWidth);
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // mod privat, stocare blocată
    }
  },
};
