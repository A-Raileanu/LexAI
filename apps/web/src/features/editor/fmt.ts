/** Formatări de dată și oră pentru editor (ora României, ca restul aplicației). */

const TZ = "Europe/Bucharest";
const hm = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const day = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const dayShort = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", timeZone: TZ });
const key = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });

export const timeHM = (ms: number) => hm.format(ms);
export const dateLong = (ms: number) => day.format(ms);
/** „28 oct. 2026, 09:15” */
export const dateTime = (ms: number) => `${day.format(ms)}, ${hm.format(ms)}`;
/** „28 oct., 09:15” */
export const dateTimeShort = (ms: number) => `${dayShort.format(ms)}, ${hm.format(ms)}`;

export const dayKey = (ms: number) => key.format(ms);

/** „Azi”, „Ieri” sau data, față de ziua dată (yyyy-mm-dd). */
export function dayLabel(ms: number, todayKey: string | null): string {
  const k = dayKey(ms);
  if (todayKey && k === todayKey) return "Azi";
  if (todayKey) {
    const [y, m, d] = todayKey.split("-").map(Number);
    const yesterday = key.format(new Date(Date.UTC(y, m - 1, d - 1, 12)));
    if (k === yesterday) return "Ieri";
  }
  return day.format(ms);
}
