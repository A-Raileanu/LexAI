/** Starea instalării Claude Code și a conectării contului (fără dependențe de server). */

export type InstallState =
  | { phase: "inactiv" }
  | { phase: "versiune" }
  | { phase: "descarc"; version: string; received: number; total: number }
  | { phase: "instalez"; version: string }
  | { phase: "gata"; version: string }
  | { phase: "eroare"; message: string };

export type LoginState =
  | { phase: "inactiv" }
  /**
   * `url`: pagina de conectare, pentru cazul în care browserul nu s-a deschis singur;
   * `codInvalid`: ultimul cod lipit a fost respins (crește la fiecare respingere)
   */
  | { phase: "astept"; url: string | null; codInvalid: number }
  | { phase: "gata" }
  | { phase: "eroare"; message: string };

export interface ClaudeSetupState {
  instalare: InstallState;
  conectare: LoginState;
}

export const installRunning = (s: InstallState) => s.phase === "versiune" || s.phase === "descarc" || s.phase === "instalez";
