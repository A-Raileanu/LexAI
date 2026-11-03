import type { SubscriptionLimits, UsageReport } from "@lexai/ai/usage";
import type { JobStatus } from "./types";

/**
 * Progresul redactării, reconstruit din evenimentele jobului (services/worker/src/handlers/drafting.ts):
 * `stare`, `etapa`, `plan`, `activitate`, `consum`, `proiect` și `sfarsit` (de la ruta SSE).
 * Funcții pure, testate în apps/web/tests/drafting-helpers.test.ts.
 */

export type Etapa = "cercetare" | "scriere" | "validare";

export interface JobEventMessage {
  type: string;
  /** numărul evenimentului (lipsește la `sfarsit`) */
  seq: number | null;
  payload: unknown;
}

export interface ActivityLine {
  seq: number;
  mesaj: string;
}

export interface ResearchedAct {
  key: string;
  /** cea mai scurtă denumire întâlnită */
  titlu: string;
  /** articolele citite, în ordinea citirii */
  unitati: string[];
  /** forma actului („Consolidare 03.05.2026”) */
  forma: string | null;
}

export interface DraftingProgress {
  status: JobStatus | null;
  etapa: Etapa | null;
  /** mesajul ultimei etape */
  mesaj: string | null;
  plan: string[];
  activitate: ActivityLine[];
  acte: ResearchedAct[];
  limite: SubscriptionLimits | null;
  proiect: { versionId: string; deCompletat: number } | null;
  eroare: string | null;
  /** a sosit `sfarsit`: fluxul s-a încheiat */
  ended: boolean;
  lastSeq: number;
}

export const MAX_ACTIVITY = 200;

export const initialProgress: DraftingProgress = {
  status: null,
  etapa: null,
  mesaj: null,
  plan: [],
  activitate: [],
  acte: [],
  limite: null,
  proiect: null,
  eroare: null,
  ended: false,
  lastSeq: 0,
};

const ETAPE: Etapa[] = ["cercetare", "scriere", "validare"];
const STATUSES: JobStatus[] = ["in_asteptare", "in_curs", "finalizat", "esuat", "anulat", "intrerupt"];

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);
const asStatus = (v: unknown): JobStatus | null => (STATUSES.includes(v as JobStatus) ? (v as JobStatus) : null);

/** „Citesc art. 1522 din LEGE nr. 287 din 17 iulie 2009 privind Codul civil (Consolidare 03.05.2026)” */
const READ_RE = /^Cite(?:sc|ște)\s+(.+?)\s+din\s+(.+?)(?:\s+\(([^()]*)\))?\s*$/u;

/** Cheia actului: „287/2009” dacă are număr și an, altfel denumirea fără diacritice. */
export function actKey(titlu: string): string {
  const t = titlu.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const slash = t.match(/nr\.?\s*(\d+)\s*\/\s*(\d{4})/);
  if (slash) return `${slash[1]}/${slash[2]}`;
  const din = t.match(/nr\.?\s*(\d+)\s+din\s+\d{1,2}\s+\p{L}+\s+(\d{4})/u);
  if (din) return `${din[1]}/${din[2]}`;
  return t.replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

/** Actul și articolul dintr-o linie de activitate „Citesc …” (sau „Citește …” în joburile vechi), sau null. */
export function parseReadActivity(mesaj: string): { unitate: string; act: string; forma: string | null } | null {
  const m = mesaj.match(READ_RE);
  if (!m) return null;
  return { unitate: m[1].trim(), act: m[2].trim(), forma: m[3]?.trim() || null };
}

function addAct(acte: ResearchedAct[], mesaj: string): ResearchedAct[] {
  const r = parseReadActivity(mesaj);
  if (!r) return acte;
  const key = actKey(r.act);
  const i = acte.findIndex((a) => a.key === key);
  if (i < 0) return [...acte, { key, titlu: r.act, unitati: [r.unitate], forma: r.forma }];
  const a = acte[i];
  const next: ResearchedAct = {
    ...a,
    titlu: r.act.length < a.titlu.length ? r.act : a.titlu,
    unitati: a.unitati.includes(r.unitate) ? a.unitati : [...a.unitati, r.unitate],
    forma: r.forma ?? a.forma,
  };
  return acte.map((x, j) => (j === i ? next : x));
}

/** Aplică un eveniment. Întoarce aceeași stare pentru evenimentele vechi sau necunoscute. */
export function progressReducer(state: DraftingProgress, e: JobEventMessage): DraftingProgress {
  if (e.seq !== null && e.seq <= state.lastSeq) return state;
  const p = obj(e.payload);
  const base = e.seq !== null ? { ...state, lastSeq: e.seq } : { ...state };
  switch (e.type) {
    case "stare": {
      const status = asStatus(p.status);
      if (!status) return base;
      return { ...base, status, eroare: str(p.eroare) ?? (status === "finalizat" ? null : base.eroare) };
    }
    case "etapa": {
      const etapa = ETAPE.includes(p.etapa as Etapa) ? (p.etapa as Etapa) : null;
      return etapa ? { ...base, etapa, mesaj: str(p.mesaj), status: base.status ?? "in_curs" } : base;
    }
    case "plan":
      return { ...base, plan: Array.isArray(p.sectiuni) ? p.sectiuni.filter((s): s is string => typeof s === "string") : base.plan };
    case "activitate": {
      const mesaj = str(p.mesaj);
      if (!mesaj) return base;
      const activitate = [...base.activitate, { seq: e.seq ?? base.lastSeq, mesaj }];
      return { ...base, activitate: activitate.length > MAX_ACTIVITY ? activitate.slice(-MAX_ACTIVITY) : activitate, acte: addAct(base.acte, mesaj) };
    }
    case "consum": {
      const consum = obj(p.consum) as Partial<UsageReport>;
      return consum.limite ? { ...base, limite: consum.limite } : base;
    }
    case "proiect": {
      const versionId = str(p.versionId);
      if (!versionId) return base;
      return { ...base, proiect: { versionId, deCompletat: Number(p.deCompletat) || 0 } };
    }
    case "sfarsit": {
      const status = asStatus(p.status) ?? base.status;
      return { ...base, ended: true, status, eroare: str(p.eroare) ?? (status === "finalizat" ? null : base.eroare) };
    }
    default:
      return e.seq !== null ? base : state;
  }
}

export type StepState = "gata" | "in_curs" | "urmeaza" | "oprit";

export interface Step {
  id: "plan" | Etapa;
  label: string;
  state: StepState;
  meta: string | null;
}

const nr = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${n % 100 >= 20 || (n >= 100 && n % 100 === 0) ? "de " : ""}${many}`);

/**
 * Etapele afișate (docs/ux/10-generare-temeiuri.md, fără nota de conformitate): Cercetare legislativă,
 * Plan, Redactare. `status` e starea jobului (din server sau din evenimente). Etapa „validare” vine doar
 * din joburile vechi și contează ca redactare încheiată.
 */
export function stepsOf(p: DraftingProgress, status: JobStatus | null): Step[] {
  const done = status === "finalizat" || p.proiect !== null;
  const stopped = status === "esuat" || status === "anulat" || status === "intrerupt";
  const running = status === "in_curs" || (status === null && p.etapa !== null);
  const at = done ? 3 : p.etapa ? ETAPE.indexOf(p.etapa) : running ? 0 : -1;
  const articole = p.acte.reduce((n, a) => n + a.unitati.length, 0);
  const etapa = (i: number): StepState => {
    if (done || at > i) return "gata";
    if (at === i) return stopped ? "oprit" : running ? "in_curs" : "urmeaza";
    return "urmeaza";
  };
  // planul se anunță în timpul cercetării: e gata când sosește, nu are o fază proprie
  const planState: StepState = p.plan.length || done || at > 0 ? "gata" : "urmeaza";
  return [
    {
      id: "cercetare",
      label: "Cercetare legislativă",
      state: etapa(0),
      meta: p.acte.length ? `${nr(p.acte.length, "act cercetat", "acte cercetate")} · ${nr(articole, "articol citit", "articole citite")}` : null,
    },
    { id: "plan", label: "Plan", state: planState, meta: p.plan.length ? nr(p.plan.length, "secțiune", "secțiuni") : null },
    {
      id: "scriere",
      label: "Redactare",
      state: etapa(1),
      meta: p.proiect ? nr(p.proiect.deCompletat, "câmp de completat", "câmpuri de completat") : p.plan.length && etapa(1) === "gata" ? nr(p.plan.length, "secțiune", "secțiuni") : null,
    },
  ];
}

/** „04:18”, „1:02:05” (cronometru, cifre tabulare). */
export function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** Scheletul pus de `startDrafting` până sosește proiectul (blocul „LexAI redactează documentul…”). */
export function isDraftSkeleton(doc: { content?: { attrs?: Record<string, unknown> | null }[] } | null | undefined): boolean {
  return Boolean(doc?.content?.some((n) => n.attrs?.segId === "gen_status"));
}
