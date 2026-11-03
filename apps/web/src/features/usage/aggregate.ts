/**
 * Agregarea consumului AI pentru pagina Utilizare: intervale, grupare pe ore / zile,
 * defalcare pe etape și pe joburi, formatarea numerelor. Fără dependențe de server.
 */

export interface UsageRow {
  t: number;
  jobId: string | null;
  etapa: string;
  model: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  apeluri: number;
  cost: number;
  l5: number | null;
  l7: number | null;
}

export interface JobInfo {
  id: string;
  kind: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  documentId: string | null;
  documentTitle: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
}

export type Range = "24h" | "7z" | "30z";
export const RANGES: Record<Range, string> = { "24h": "24 h", "7z": "7 zile", "30z": "30 zile" };

const HOUR = 3_600_000;

export const tokensOf = (r: Pick<UsageRow, "input" | "output" | "cacheRead" | "cacheWrite">) => r.input + r.output + r.cacheRead + r.cacheWrite;

function startOfHour(t: number): number {
  const d = new Date(t);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function addDays(t: number, n: number): number {
  const d = new Date(t);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** Începutul primei găleți din interval (ora sau ziua aliniată). */
export function rangeStart(range: Range, now: number): number {
  if (range === "24h") return startOfHour(now) - 23 * HOUR;
  return addDays(startOfDay(now), range === "7z" ? -6 : -29);
}

export function inRange<T extends { t: number }>(rows: readonly T[], range: Range, now: number): T[] {
  const from = rangeStart(range, now);
  return rows.filter((r) => r.t >= from && r.t <= now);
}

export interface Bucket {
  start: number;
  label: string;
  input: number;
  output: number;
  cache: number;
  tokens: number;
  cost: number;
  /** vârful procentului de limită în găleată (null = nicio citire) */
  l5: number | null;
  l7: number | null;
}

const hourFmt = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short" });

/** Grupează rândurile pe ore (24 h) sau pe zile (7 / 30 zile); găleți goale incluse. */
export function bucketize(rows: readonly UsageRow[], range: Range, now: number): Bucket[] {
  const hourly = range === "24h";
  const count = hourly ? 24 : range === "7z" ? 7 : 30;
  const first = rangeStart(range, now);
  const buckets: Bucket[] = [];
  for (let i = 0; i < count; i++) {
    const start = hourly ? first + i * HOUR : addDays(first, i);
    buckets.push({ start, label: (hourly ? hourFmt : dayFmt).format(start), input: 0, output: 0, cache: 0, tokens: 0, cost: 0, l5: null, l7: null });
  }
  const index = (t: number) => (hourly ? Math.floor((t - first) / HOUR) : buckets.findLastIndex((b) => b.start <= t));
  for (const r of rows) {
    if (r.t < first || r.t > now) continue;
    const b = buckets[index(r.t)];
    if (!b) continue;
    b.input += r.input;
    b.output += r.output;
    b.cache += r.cacheRead + r.cacheWrite;
    b.tokens += tokensOf(r);
    b.cost += r.cost;
    if (r.l5 !== null) b.l5 = Math.max(b.l5 ?? 0, r.l5);
    if (r.l7 !== null) b.l7 = Math.max(b.l7 ?? 0, r.l7);
  }
  return buckets;
}

export interface Totals {
  tokens: number;
  input: number;
  output: number;
  cache: number;
  cost: number;
  peak5: number | null;
  peak7: number | null;
}

export function totals(rows: readonly UsageRow[]): Totals {
  const t: Totals = { tokens: 0, input: 0, output: 0, cache: 0, cost: 0, peak5: null, peak7: null };
  for (const r of rows) {
    t.tokens += tokensOf(r);
    t.input += r.input;
    t.output += r.output;
    t.cache += r.cacheRead + r.cacheWrite;
    t.cost += r.cost;
    if (r.l5 !== null) t.peak5 = Math.max(t.peak5 ?? 0, r.l5);
    if (r.l7 !== null) t.peak7 = Math.max(t.peak7 ?? 0, r.l7);
  }
  return t;
}

const STAGES: Record<string, string> = {
  ocr: "Extragere text",
  identificare: "Identificare trimiteri",
  verificare: "Verificare temeiuri",
  web: "Căutare web",
  redactare: "Redactare (agent)",
  chat: "Chat în editor",
  raport: "Raport / export",
};

export function stageLabel(etapa: string): string {
  return STAGES[etapa] ?? (etapa ? etapa.charAt(0).toUpperCase() + etapa.slice(1) : "Altele");
}

export interface StageShare {
  etapa: string;
  label: string;
  tokens: number;
  cost: number;
  /** procent din costul echivalent (sau din tokeni, dacă nu există cost), 0–100 */
  share: number;
}

/** Defalcarea pe etape, descrescător după cost. */
export function byStage(rows: readonly UsageRow[]): StageShare[] {
  const map = new Map<string, StageShare>();
  for (const r of rows) {
    const s = map.get(r.etapa) ?? { etapa: r.etapa, label: stageLabel(r.etapa), tokens: 0, cost: 0, share: 0 };
    s.tokens += tokensOf(r);
    s.cost += r.cost;
    map.set(r.etapa, s);
  }
  const list = [...map.values()];
  const totalCost = list.reduce((a, s) => a + s.cost, 0);
  const totalTokens = list.reduce((a, s) => a + s.tokens, 0);
  for (const s of list) s.share = totalCost > 0 ? (s.cost / totalCost) * 100 : totalTokens > 0 ? (s.tokens / totalTokens) * 100 : 0;
  return list.sort((a, b) => b.cost - a.cost || b.tokens - a.tokens);
}

export interface JobUsage {
  job: JobInfo;
  /** primul consum înregistrat (pentru sortare și filtrare pe interval) */
  t: number;
  tokens: number;
  input: number;
  output: number;
  cache: number;
  cost: number;
  stages: StageShare[];
  /** ms între pornire și încheiere (null dacă nu se știe) */
  durationMs: number | null;
}

/** Consumul pe joburi (doar rândurile cu job cunoscut), cele mai noi primele. */
export function byJob(rows: readonly UsageRow[], jobs: readonly JobInfo[]): JobUsage[] {
  const info = new Map(jobs.map((j) => [j.id, j]));
  const groups = new Map<string, UsageRow[]>();
  for (const r of rows) {
    if (!r.jobId || !info.has(r.jobId)) continue;
    const g = groups.get(r.jobId) ?? [];
    g.push(r);
    groups.set(r.jobId, g);
  }
  const out: JobUsage[] = [];
  for (const [id, g] of groups) {
    const job = info.get(id)!;
    const t = totals(g);
    out.push({
      job,
      t: Math.min(...g.map((r) => r.t)),
      tokens: t.tokens,
      input: t.input,
      output: t.output,
      cache: t.cache,
      cost: t.cost,
      stages: byStage(g),
      durationMs: job.startedAt && job.finishedAt ? Math.max(0, job.finishedAt - job.startedAt) : null,
    });
  }
  return out.sort((a, b) => b.t - a.t);
}

export const JOB_KIND_LABELS: Record<string, string> = { ocr: "Extragere text", analiza: "Analiză", reverificare: "Reverificare", redactare: "Generare", chat: "Chat" };
export const JOB_STATUS_LABELS: Record<string, string> = {
  in_asteptare: "În așteptare",
  in_curs: "În curs",
  finalizat: "Finalizat",
  esuat: "Eșuat",
  anulat: "Anulat",
  intrerupt: "Întrerupt",
};

// ───────────── formatare ─────────────

const int = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 });
const one = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** „950”, „182 k”, „2,4 M”. */
export function fmtTokens(n: number): string {
  if (n < 1000) return int.format(n);
  if (n < 1_000_000) return `${int.format(Math.round(n / 1000))} k`;
  return `${one.format(n / 1_000_000)} M`;
}

/** „1,40 $”, „< 0,01 $”, „0,00 $”. */
export function fmtUsd(n: number): string {
  if (n > 0 && n < 0.005) return "< 0,01 $";
  return `${money.format(n)} $`;
}

/** „34 %” (cu spațiu, ca în tipografia românească). */
export function fmtPct(n: number): string {
  return `${int.format(n)} %`;
}

/** „1m 40s”, „45s”, „2h 05m”. */
export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

/** „în 2 h 13 min”, „în 48 min”, „în 3 zile”. */
export function fmtUntil(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 60) return `în ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return min % 60 ? `în ${h} h ${min % 60} min` : `în ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "în o zi" : `în ${d} zile`;
}
