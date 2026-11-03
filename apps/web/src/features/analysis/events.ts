import type { Finding, ProgressEvent, VerdictStatus } from "@lexai/core/types";
import type { UsageReport } from "@lexai/core/usage";

/**
 * Starea live a unui job de analiză, reconstruită din evenimentele SSE (docs/ux/07-progres-analiza.md).
 * Reducer pur: aceleași evenimente dau aceeași stare, deci după un reload reluăm fluxul de la
 * început (sau de la `lastSeq`) și ajungem exact unde eram. Evenimentele repetate sunt ignorate.
 */

export type JobStatus = "in_asteptare" | "in_curs" | "finalizat" | "esuat" | "anulat" | "intrerupt";
export type Stage = "identificare" | "verificare" | "consolidare";

export interface ActivityLine {
  /** numărul evenimentului; cheie stabilă pentru liste */
  seq: number;
  kind: "activitate" | "constatare";
  mesaj: string;
  findingId?: string;
  status?: VerdictStatus;
}

export interface GroupProgress {
  cheie: string;
  eticheta: string;
  numar: number;
  stare: "asteptare" | "lucru" | "gata";
  /** ultimele linii de activitate (cel mult `MAX_LINES`) */
  linii: ActivityLine[];
  /** câte linii au fost în total (inclusiv cele scoase din listă) */
  totalLinii: number;
  /** constatările atribuite grupului */
  findingIds: string[];
}

export interface JobProgress {
  jobId: string | null;
  lastSeq: number;
  status: JobStatus | null;
  error: string | null;
  etapa: Stage | null;
  mesaj: string | null;
  /** trimiterile găsite (null până la identificare) */
  total: number | null;
  /** grupurile de verificare au fost anunțate */
  grouped: boolean;
  groups: GroupProgress[];
  /** constatările sosite, în ordinea primei apariții (o constatare înlocuită își păstrează locul) */
  findings: Finding[];
  consum: UsageReport | null;
  /** fluxul s-a încheiat (evenimentul `sfarsit`) */
  ended: boolean;
  /** ultimul grup activ: constatările fără grup clar îi sunt atribuite */
  lastActive: string | null;
}

export interface JobEventMessage {
  /** `id` din SSE; null pentru `sfarsit` (trimis de server fără număr) */
  seq: number | null;
  type: string;
  payload: unknown;
}

export const MAX_LINES = 200;

export function initialProgress(jobId: string | null = null): JobProgress {
  return {
    jobId,
    lastSeq: 0,
    status: null,
    error: null,
    etapa: null,
    mesaj: null,
    total: null,
    grouped: false,
    groups: [],
    findings: [],
    consum: null,
    ended: false,
    lastActive: null,
  };
}

const FINAL: ReadonlySet<string> = new Set(["finalizat", "esuat", "anulat", "intrerupt"]);
export const isFinalJobStatus = (s: string | null | undefined): boolean => Boolean(s && FINAL.has(s));

function updateGroup(groups: GroupProgress[], cheie: string, fn: (g: GroupProgress) => GroupProgress): GroupProgress[] {
  const i = groups.findIndex((g) => g.cheie === cheie);
  if (i < 0) return groups;
  const next = groups.slice();
  next[i] = fn(groups[i]);
  return next;
}

function pushLine(g: GroupProgress, line: ActivityLine): GroupProgress {
  const linii = g.linii.length >= MAX_LINES ? [...g.linii.slice(g.linii.length - MAX_LINES + 1), line] : [...g.linii, line];
  return { ...g, linii, totalLinii: g.totalLinii + 1 };
}

/**
 * Grupul căruia îi aparține o constatare nouă. Evenimentele nu leagă explicit constatarea de grup:
 * dacă rulează un singur grup, e acela; altfel căutăm actul în eticheta grupului; altfel ultimul activ.
 */
export function groupForFinding(state: Pick<JobProgress, "groups" | "lastActive">, f: Finding): string | null {
  const running = state.groups.filter((g) => g.stare === "lucru");
  if (running.length === 1) return running[0].cheie;
  if (!running.length) return null;
  const numar = f.act?.numar;
  const an = f.act?.an;
  if (numar) {
    const needle = an ? `${numar}/${an}` : `nr. ${numar}`;
    const hit = running.filter((g) => g.eticheta.includes(needle));
    if (hit.length === 1) return hit[0].cheie;
  }
  return running.some((g) => g.cheie === state.lastActive) ? state.lastActive : running[running.length - 1].cheie;
}

function findingLine(seq: number, f: Finding): ActivityLine {
  const mesaj = f.unitate ? `${f.unitate} — ${f.titlu}` : f.titlu;
  return { seq, kind: "constatare", mesaj, findingId: f.id, status: f.status };
}

function applyEvent(s: JobProgress, seq: number, type: string, payload: unknown): JobProgress {
  const p = (payload ?? {}) as Record<string, unknown>;
  switch (type) {
    case "stare": {
      const status = p.status as JobStatus | undefined;
      return { ...s, status: status ?? s.status, error: typeof p.eroare === "string" ? p.eroare : s.error };
    }
    case "etapa": {
      const e = payload as Extract<ProgressEvent, { type: "etapa" }>;
      return { ...s, status: s.status ?? "in_curs", etapa: e.etapa, mesaj: e.mesaj };
    }
    case "identificare": {
      const e = payload as Extract<ProgressEvent, { type: "identificare" }>;
      return { ...s, total: s.total ?? e.trimiteri?.references?.length ?? null };
    }
    case "trimiteri": {
      const e = payload as Extract<ProgressEvent, { type: "trimiteri" }>;
      const known = new Map(s.groups.map((g) => [g.cheie, g]));
      const groups = (e.grupuri ?? []).map(
        (g) => known.get(g.cheie) ?? { cheie: g.cheie, eticheta: g.eticheta, numar: g.numar, stare: "asteptare" as const, linii: [], totalLinii: 0, findingIds: [] },
      );
      return { ...s, total: e.total, grouped: true, groups };
    }
    case "grup_start": {
      const e = payload as Extract<ProgressEvent, { type: "grup_start" }>;
      const exists = s.groups.some((g) => g.cheie === e.cheie);
      const groups = exists
        ? updateGroup(s.groups, e.cheie, (g) => ({ ...g, stare: "lucru" }))
        : [...s.groups, { cheie: e.cheie, eticheta: e.eticheta, numar: e.numar ?? 0, stare: "lucru" as const, linii: [], totalLinii: 0, findingIds: [] }];
      return { ...s, groups, lastActive: e.cheie };
    }
    case "activitate": {
      const e = payload as Extract<ProgressEvent, { type: "activitate" }>;
      return { ...s, groups: updateGroup(s.groups, e.cheie, (g) => pushLine(g, { seq, kind: "activitate", mesaj: e.mesaj })), lastActive: e.cheie };
    }
    case "constatare": {
      const f = (payload as Extract<ProgressEvent, { type: "constatare" }>).finding;
      if (!f?.id) return s;
      const i = s.findings.findIndex((x) => x.id === f.id);
      const findings = i >= 0 ? s.findings.map((x, j) => (j === i ? f : x)) : [...s.findings, f];
      // o constatare înlocuită își actualizează linia; una nouă primește linie în grupul ei
      const owner = s.groups.find((g) => g.findingIds.includes(f.id));
      let groups = s.groups;
      if (owner) {
        groups = updateGroup(groups, owner.cheie, (g) => ({ ...g, linii: g.linii.map((l) => (l.findingId === f.id ? findingLine(l.seq, f) : l)) }));
      } else {
        const cheie = groupForFinding(s, f);
        if (cheie) groups = updateGroup(groups, cheie, (g) => ({ ...pushLine(g, findingLine(seq, f)), findingIds: [...g.findingIds, f.id] }));
      }
      return { ...s, findings, groups };
    }
    case "grup_final": {
      const e = payload as Extract<ProgressEvent, { type: "grup_final" }>;
      return { ...s, groups: updateGroup(s.groups, e.cheie, (g) => ({ ...g, stare: "gata" })) };
    }
    case "consum": {
      const e = payload as Extract<ProgressEvent, { type: "consum" }>;
      return e.consum ? { ...s, consum: e.consum } : s;
    }
    case "eroare": {
      const e = payload as Extract<ProgressEvent, { type: "eroare" }>;
      return { ...s, error: e.mesaj ?? s.error };
    }
    case "sfarsit":
      return { ...s, ended: true, status: (p.status as JobStatus | undefined) ?? s.status, error: typeof p.eroare === "string" ? p.eroare : s.error };
    default:
      return s;
  }
}

/** Aplică un eveniment; cele deja văzute (seq ≤ lastSeq) sunt ignorate, ca reluarea să fie idempotentă. */
export function reduceJobEvent(state: JobProgress, ev: JobEventMessage): JobProgress {
  if (ev.seq !== null) {
    if (ev.seq <= state.lastSeq) return state;
    return { ...applyEvent(state, ev.seq, ev.type, ev.payload), lastSeq: ev.seq };
  }
  return applyEvent(state, state.lastSeq, ev.type, ev.payload);
}

export type JobEventAction = { kind: "events"; jobId: string; events: JobEventMessage[] } | { kind: "connection"; jobId: string; connection: Connection };

export type Connection = "connecting" | "open" | "reconnecting" | "closed";

export interface JobStreamState extends JobProgress {
  connection: Connection;
}

export function initialStream(jobId: string | null = null): JobStreamState {
  return { ...initialProgress(jobId), connection: jobId ? "connecting" : "closed" };
}

/** Reducer-ul hook-ului `useJobEvents`: evenimentele vin în loturi (un singur render pe lot). */
export function reduceJobStream(state: JobStreamState, action: JobEventAction): JobStreamState {
  // un job nou pornește de la zero
  const base = state.jobId === action.jobId ? state : initialStream(action.jobId);
  if (action.kind === "connection") return base.connection === action.connection ? base : { ...base, connection: action.connection };
  let next: JobProgress = base;
  for (const ev of action.events) next = reduceJobEvent(next, ev);
  return next === base ? base : { ...base, ...next };
}

// ───────────── etapele afișate (4, ca în 07) ─────────────

export interface StageView {
  id: "identificare" | "grupare" | "verificare" | "consolidare";
  label: string;
  state: "gata" | "curent" | "urmeaza";
  detail: string | null;
}

/** Index 1–4 al etapei curente (pentru pastila compactă „Analiză · 3/4”). */
export function stageIndex(p: Pick<JobProgress, "etapa" | "grouped" | "status">): number {
  if (p.status === "finalizat") return 4;
  if (p.etapa === "consolidare") return 4;
  if (p.etapa === "verificare") return 3;
  if (p.grouped) return 3;
  return 1;
}

export function stagesOf(p: JobProgress, fmt: { refs: (n: number) => string; groups: (n: number) => string }): StageView[] {
  const idx = stageIndex(p);
  const done = p.groups.filter((g) => g.stare === "gata").length;
  const st = (i: number): StageView["state"] => (p.status === "finalizat" || i < idx ? "gata" : i === idx ? "curent" : "urmeaza");
  return [
    { id: "identificare", label: "Identificare trimiteri", state: st(1), detail: p.total !== null ? fmt.refs(p.total) : idx === 1 ? p.mesaj : null },
    { id: "grupare", label: "Grupare pe acte normative", state: p.grouped ? "gata" : st(2), detail: p.grouped ? fmt.groups(p.groups.length) : null },
    {
      id: "verificare",
      label: "Verificare la sursă",
      state: st(3),
      detail: p.grouped && p.groups.length ? `${done} din ${p.groups.length} grupuri` : idx === 3 ? p.mesaj : null,
    },
    { id: "consolidare", label: "Consolidare", state: st(4), detail: idx === 4 && p.status !== "finalizat" ? "Pregătesc raportul" : null },
  ];
}
