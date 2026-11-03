import {
  aiUsage,
  appendJobEvent,
  claimNextJob,
  failJob,
  finishJob,
  isCancelRequested,
  setJobProgress,
  type Db,
  type Job,
  type JobKind,
} from "@lexai/db";
import type { UsageReport } from "@lexai/ai/usage";

/**
 * Bucla worker-ului: preia joburi din coadă cu o concurență limitată (ca să nu consume
 * repede limitele abonamentului Claude), le rulează prin handler-ul tipului lor și
 * transformă anularea cerută din interfață într-un AbortSignal.
 */

export interface JobContext {
  db: Db;
  job: Job;
  input: unknown;
  signal: AbortSignal;
  /** eveniment de progres (salvat în job_events, transmis live prin SSE) */
  emit: (type: string, payload: unknown) => void;
  /** starea curentă, pentru liste și reconectare */
  progress: (state: unknown) => void;
  /** consumul AI al jobului (rânduri în ai_usage, cu limitele abonamentului) */
  recordUsage: (report: UsageReport) => void;
}

export type JobHandler = (ctx: JobContext) => Promise<unknown>;

export class JobCancelled extends Error {
  constructor() {
    super("Jobul a fost anulat.");
    this.name = "AbortError";
  }
}

export function usageRows(jobId: string, report: UsageReport, now = Date.now()) {
  const l = report.limite;
  return report.linii.map((line) => ({
    jobId,
    etapa: line.etapa,
    model: line.model,
    input: line.input,
    cacheWrite: line.cacheWrite,
    cacheRead: line.cacheRead,
    output: line.output,
    apeluri: line.apeluri,
    costUsd: line.costUsd,
    limit5hPct: l?.cinciOre?.procent ?? null,
    limit5hReset: l?.cinciOre?.resetLa ? Date.parse(l.cinciOre.resetLa) : null,
    limit7dPct: l?.sapteZile?.procent ?? null,
    limit7dReset: l?.sapteZile?.resetLa ? Date.parse(l.sapteZile.resetLa) : null,
    createdAt: now,
  }));
}

export async function runJob(db: Db, job: Job, handlers: Partial<Record<JobKind, JobHandler>>, cancelPollMs = 1000) {
  const handler = handlers[job.kind];
  if (!handler) {
    failJob(db, job.id, `Nu există handler pentru joburile de tip „${job.kind}”.`);
    return;
  }
  const controller = new AbortController();
  const poll = setInterval(() => {
    if (isCancelRequested(db, job.id)) controller.abort(new JobCancelled());
  }, cancelPollMs);
  const ctx: JobContext = {
    db,
    job,
    input: JSON.parse(job.input),
    signal: controller.signal,
    emit: (type, payload) => appendJobEvent(db, job.id, type, payload),
    progress: (state) => setJobProgress(db, job.id, state),
    recordUsage: (report) => {
      const rows = usageRows(job.id, report);
      if (rows.length) db.insert(aiUsage).values(rows).run();
    },
  };
  ctx.emit("stare", { status: "in_curs" });
  try {
    const result = await handler(ctx);
    if (controller.signal.aborted) throw new JobCancelled();
    finishJob(db, job.id, result ?? null);
    ctx.emit("stare", { status: "finalizat" });
  } catch (e) {
    const cancelled = controller.signal.aborted || (e instanceof Error && e.name === "AbortError");
    const message = cancelled ? "Anulat de utilizator." : e instanceof Error ? e.message : String(e);
    failJob(db, job.id, message, cancelled ? "anulat" : "esuat");
    ctx.emit("stare", { status: cancelled ? "anulat" : "esuat", eroare: message });
    if (!cancelled) console.error(`[worker] jobul ${job.id} (${job.kind}) a eșuat:`, e);
  } finally {
    clearInterval(poll);
  }
}

/** Pornește bucla; întoarce o funcție de oprire care așteaptă joburile în curs. */
export function startRunner(
  db: Db,
  handlers: Partial<Record<JobKind, JobHandler>>,
  opts: { concurrency: () => number; pollMs?: number },
) {
  const running = new Set<Promise<void>>();
  let stopped = false;
  const tick = () => {
    if (stopped) return;
    while (running.size < Math.max(1, opts.concurrency())) {
      const job = claimNextJob(db);
      if (!job) break;
      const p = runJob(db, job, handlers).finally(() => {
        running.delete(p);
        // un loc s-a eliberat: încercăm imediat următorul job
        setImmediate(tick);
      });
      running.add(p);
    }
  };
  const timer = setInterval(tick, opts.pollMs ?? 500);
  tick();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await Promise.allSettled([...running]);
  };
}
