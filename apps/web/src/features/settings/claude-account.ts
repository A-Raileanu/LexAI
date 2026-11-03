/**
 * Starea contului Claude, așa cum o raportează `claude auth status` (JSON).
 * Fișier fără dependențe de server: tipurile și interpretarea sunt folosite și în client.
 */

export type ClaudeAccount =
  | { state: "conectat"; email: string | null; plan: string | null; org: string | null; method: string | null; checkedAt: number }
  | { state: "neconectat"; checkedAt: number }
  | { state: "lipsa"; checkedAt: number }
  | { state: "eroare"; message: string; checkedAt: number };

const PLANS: Record<string, string> = { max: "Max", pro: "Pro", team: "Team", enterprise: "Enterprise", free: "Free" };

/** „max” → „Max”; valorile necunoscute sunt afișate cu majusculă. */
export function planLabel(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const key = raw.trim().toLowerCase();
  return PLANS[key] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Interpretează ieșirea `claude auth status`; `null` dacă nu e JSON-ul așteptat. */
export function parseAuthStatus(stdout: string, checkedAt: number): ClaudeAccount | null {
  let data: unknown;
  try {
    data = JSON.parse(stdout.trim());
  } catch {
    return null;
  }
  if (!data || typeof data !== "object" || !("loggedIn" in data)) return null;
  const d = data as Record<string, unknown>;
  if (d.loggedIn !== true) return { state: "neconectat", checkedAt };
  return {
    state: "conectat",
    email: str(d.email) ?? str(d.emailAddress),
    plan: planLabel(d.subscriptionType),
    org: str(d.orgName),
    method: str(d.authMethod),
    checkedAt,
  };
}

/** Inițialele pentru avatar, din email („andrei.pop@…” → „AP”). */
export function initials(email: string | null): string {
  if (!email) return "C";
  const local = email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase() || "C";
}
