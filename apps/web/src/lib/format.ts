const rtf = new Intl.RelativeTimeFormat("ro-RO", { numeric: "auto" });
const full = new Intl.DateTimeFormat("ro-RO", { dateStyle: "long", timeStyle: "short" });
const short = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric" });

/** „acum 5 minute”, „ieri”, „12 oct. 2026” (după o săptămână). */
export function relativeTime(ms: number, now = Date.now()): string {
  const diff = (ms - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return "chiar acum";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(diff / 86400), "day");
  return short.format(ms);
}

export function fullDate(ms: number): string {
  return full.format(ms);
}

export function fmtDateIso(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** Data de azi în fusul orar al României (yyyy-mm-dd). */
export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());
}
