import type { TerminalMode } from "@lexai/terminal/ticket";

/** Modurile terminalului, în ordinea din selector. Fără dependențe de server. */
export const MODES: { id: TerminalMode; label: string; command: string; tooltip: string }[] = [
  { id: "claude", label: "Interactiv", command: "claude", tooltip: "Pornește claude în mod interactiv" },
  { id: "auth-login", label: "Autentificare", command: "claude auth login", tooltip: "Rulează claude auth login" },
  { id: "auth-status", label: "Stare", command: "claude auth status", tooltip: "Rulează claude auth status" },
  { id: "auth-logout", label: "Deconectare", command: "claude auth logout", tooltip: "Rulează claude auth logout" },
];

export const modeInfo = (id: TerminalMode) => MODES.find((m) => m.id === id)!;

export function parseMode(value: unknown): TerminalMode | null {
  return MODES.some((m) => m.id === value) ? (value as TerminalMode) : null;
}

export const SERVICE_DOWN = "Serviciul de terminal nu rulează. Pornește aplicația cu `pnpm dev`.";
