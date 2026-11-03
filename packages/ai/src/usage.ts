/**
 * Consumul de tokeni și costul estimat în USD. Fișier fără dependențe de server,
 * folosit și în browser (combinarea consumului OCR cu cel al analizei).
 */

export type Stage = "ocr" | "identificare" | "verificare" | "web" | "redactare" | "chat";

export interface TokenCounts {
  /** input la preț întreg */
  input: number;
  /** tokeni scriși în cache (5 minute) */
  cacheWrite: number;
  /** tokeni citiți din cache */
  cacheRead: number;
  /** output, inclusiv raționamentul (thinking) */
  output: number;
  apeluri: number;
  /** căutări web (taxate separat) */
  cautariWeb: number;
}

export interface UsageLine extends TokenCounts {
  etapa: Stage;
  model: string;
  costUsd: number;
}

/** O fereastră de limită a abonamentului Claude. */
export interface LimitWindow {
  /** procentul folosit, 0–100 */
  procent: number;
  /** momentul resetării (ISO) */
  resetLa: string | null;
}

/** Nivelul de utilizare al abonamentului Claude, raportat de CLI după fiecare apel. */
export interface SubscriptionLimits {
  cinciOre: LimitWindow | null;
  sapteZile: LimitWindow | null;
  /** „allowed”, „allowed_warning” sau „rejected” */
  stare: string;
  /** momentul citirii (ISO) */
  actualizatLa: string;
}

export interface UsageReport {
  linii: UsageLine[];
  total: TokenCounts & { costUsd: number };
  /** prețuri folosite la estimare */
  sursaPreturi: string;
  /** ultima stare cunoscută a limitelor abonamentului */
  limite?: SubscriptionLimits;
}

/** USD per milion de tokeni. Sursa: platform.claude.com/docs/en/about-claude/pricing */
export const PRICING: Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10 },
  "claude-opus-5-5": { input: 4, cacheWrite: 5, cacheRead: 0.2, output: 20 },
  "claude-haiku-5-5": { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5 },
};
/** USD per căutare web ($10 / 1.000 căutări) */
export const WEB_SEARCH_USD = 0.01;
export const PRICING_SOURCE = "Cost echivalent API (cu abonamentul Claude nu se plătește per token), după prețurile publice Anthropic (platform.claude.com/docs/en/about-claude/pricing), verificate la 01.11.2026";

const empty = (): TokenCounts => ({ input: 0, cacheWrite: 0, cacheRead: 0, output: 0, apeluri: 0, cautariWeb: 0 });

function priceFor(model: string) {
  const key = Object.keys(PRICING).find((k) => model.startsWith(k));
  return key ? PRICING[key] : undefined;
}

export function costOf(model: string, t: TokenCounts): number {
  const p = priceFor(model);
  const web = (t.cautariWeb ?? 0) * WEB_SEARCH_USD;
  if (!p) return web;
  return (t.input * p.input + t.cacheWrite * p.cacheWrite + t.cacheRead * p.cacheRead + t.output * p.output) / 1_000_000 + web;
}

/** Câmpurile `usage` din răspunsurile API (același format în SDK). */
export interface ApiUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
  server_tool_use?: { web_search_requests?: number | null } | null;
}

export class UsageTracker {
  private lines = new Map<string, UsageLine>();
  private limits: SubscriptionLimits | undefined;

  setLimits(l: SubscriptionLimits) {
    this.limits = latestLimits(this.limits, l);
  }

  record(etapa: Stage, model: string, u: ApiUsage | null | undefined) {
    if (!u) return;
    const key = `${etapa}|${model}`;
    const l = this.lines.get(key) ?? { etapa, model, ...empty(), costUsd: 0 };
    l.input += u.input_tokens ?? 0;
    l.output += u.output_tokens ?? 0;
    l.cacheWrite += u.cache_creation_input_tokens ?? 0;
    l.cacheRead += u.cache_read_input_tokens ?? 0;
    l.apeluri += 1;
    l.cautariWeb += u.server_tool_use?.web_search_requests ?? 0;
    l.costUsd = costOf(model, l);
    this.lines.set(key, l);
  }

  report(): UsageReport {
    return buildReport([...this.lines.values()], this.limits);
  }
}

function latestLimits(...all: (SubscriptionLimits | undefined)[]): SubscriptionLimits | undefined {
  return all.reduce<SubscriptionLimits | undefined>((a, b) => (!b ? a : !a || b.actualizatLa >= a.actualizatLa ? b : a), undefined);
}

function buildReport(linii: UsageLine[], limite?: SubscriptionLimits): UsageReport {
  const total = { ...empty(), costUsd: 0 };
  for (const l of linii) {
    total.input += l.input;
    total.cacheWrite += l.cacheWrite;
    total.cacheRead += l.cacheRead;
    total.output += l.output;
    total.apeluri += l.apeluri;
    total.cautariWeb += l.cautariWeb ?? 0;
    total.costUsd += l.costUsd;
  }
  return { linii, total, sursaPreturi: PRICING_SOURCE, ...(limite ? { limite } : {}) };
}

export function mergeUsage(...reports: (UsageReport | undefined)[]): UsageReport {
  const map = new Map<string, UsageLine>();
  for (const r of reports) {
    for (const l of r?.linii ?? []) {
      const key = `${l.etapa}|${l.model}`;
      const cur = map.get(key) ?? { ...l, ...empty(), costUsd: 0 };
      cur.input += l.input;
      cur.cacheWrite += l.cacheWrite;
      cur.cacheRead += l.cacheRead;
      cur.output += l.output;
      cur.apeluri += l.apeluri;
      cur.cautariWeb += l.cautariWeb ?? 0;
      cur.costUsd = costOf(cur.model, cur);
      map.set(key, cur);
    }
  }
  return buildReport([...map.values()], latestLimits(...reports.map((r) => r?.limite)));
}

export function totalTokens(t: TokenCounts): number {
  return t.input + t.cacheWrite + t.cacheRead + t.output;
}

export function fmtUsd(v: number): string {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: v > 0 && v < 0.1 ? 4 : 2,
  }).format(v);
}

export function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(".", ",")} mil.`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} mii`;
  return String(n);
}

export const STAGE_LABELS: Record<Stage, string> = {
  ocr: "Recunoaștere text (OCR)",
  identificare: "Identificarea trimiterilor",
  verificare: "Verificarea pe Portalul Legislativ",
  web: "Căutare web pentru trimiterile neverificate",
  redactare: "Redactarea documentului",
  chat: "Chat în editor",
};
