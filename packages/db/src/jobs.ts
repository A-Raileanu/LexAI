import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import type { Db } from "./client";
import { newId } from "./ids";
import { JOB_KINDS, jobEvents, jobs } from "./schema";

/**
 * Coada de joburi AI, în SQLite. Web-ul creează joburi; worker-ul le preia atomic,
 * scrie evenimente de progres (job_events, numerotate) și rezultatul. Clienții citesc
 * evenimentele după `seq`, deci se pot reconecta oricând fără să piardă nimic.
 */

export type JobKind = (typeof JOB_KINDS)[number];
export type Job = typeof jobs.$inferSelect;
export type JobEvent = { seq: number; type: string; payload: unknown; createdAt: number };

export function enqueueJob(
  db: Db,
  job: { kind: JobKind; input: unknown; projectId?: string | null; documentId?: string | null },
): Job {
  const row = {
    id: newId("job"),
    kind: job.kind,
    status: "in_asteptare" as const,
    projectId: job.projectId ?? null,
    documentId: job.documentId ?? null,
    input: JSON.stringify(job.input),
    createdAt: Date.now(),
  };
  db.insert(jobs).values(row).run();
  return getJob(db, row.id)!;
}

export function getJob(db: Db, id: string): Job | undefined {
  return db.select().from(jobs).where(eq(jobs.id, id)).get();
}

/** Preia cel mai vechi job în așteptare (atomic: un singur worker îl primește). */
export function claimNextJob(db: Db): Job | undefined {
  return db.transaction((tx) => {
    const next = tx
      .select({ id: jobs.id })
      .from(jobs)
      .where(eq(jobs.status, "in_asteptare"))
      .orderBy(asc(jobs.createdAt))
      .limit(1)
      .get();
    if (!next) return undefined;
    tx.update(jobs).set({ status: "in_curs", startedAt: Date.now() }).where(and(eq(jobs.id, next.id), eq(jobs.status, "in_asteptare"))).run();
    return tx.select().from(jobs).where(eq(jobs.id, next.id)).get();
  });
}

export function appendJobEvent(db: Db, jobId: string, type: string, payload: unknown): number {
  return db.transaction((tx) => {
    const last = tx
      .select({ seq: sql<number>`coalesce(max(${jobEvents.seq}), 0)` })
      .from(jobEvents)
      .where(eq(jobEvents.jobId, jobId))
      .get();
    const seq = (last?.seq ?? 0) + 1;
    tx.insert(jobEvents).values({ jobId, seq, type, payload: JSON.stringify(payload), createdAt: Date.now() }).run();
    return seq;
  });
}

export function readJobEvents(db: Db, jobId: string, afterSeq = 0, limit = 500): JobEvent[] {
  return db
    .select()
    .from(jobEvents)
    .where(and(eq(jobEvents.jobId, jobId), gt(jobEvents.seq, afterSeq)))
    .orderBy(asc(jobEvents.seq))
    .limit(limit)
    .all()
    .map((e) => ({ seq: e.seq, type: e.type, payload: JSON.parse(e.payload), createdAt: e.createdAt }));
}

export function setJobProgress(db: Db, jobId: string, progress: unknown) {
  db.update(jobs).set({ progress: JSON.stringify(progress) }).where(eq(jobs.id, jobId)).run();
}

export function finishJob(db: Db, jobId: string, result: unknown) {
  db.update(jobs).set({ status: "finalizat", result: JSON.stringify(result), finishedAt: Date.now() }).where(eq(jobs.id, jobId)).run();
}

export function failJob(db: Db, jobId: string, error: string, status: "esuat" | "anulat" | "intrerupt" = "esuat") {
  db.update(jobs).set({ status, error, finishedAt: Date.now() }).where(eq(jobs.id, jobId)).run();
}

export function requestJobCancel(db: Db, jobId: string) {
  const job = getJob(db, jobId);
  if (!job) return;
  if (job.status === "in_asteptare") failJob(db, jobId, "Anulat înainte de pornire.", "anulat");
  else if (job.status === "in_curs") db.update(jobs).set({ cancelRequested: true }).where(eq(jobs.id, jobId)).run();
}

export function isCancelRequested(db: Db, jobId: string): boolean {
  return Boolean(db.select({ c: jobs.cancelRequested }).from(jobs).where(eq(jobs.id, jobId)).get()?.c);
}

/** La pornirea worker-ului: joburile rămase „în curs” au fost întrerupte (proces oprit). */
export function markInterruptedJobs(db: Db): number {
  const res = db
    .update(jobs)
    .set({ status: "intrerupt", error: "Procesul a fost oprit în timpul execuției.", finishedAt: Date.now() })
    .where(eq(jobs.status, "in_curs"))
    .run();
  return res.changes;
}

export function activeJobsFor(db: Db, documentId: string): Job[] {
  return db
    .select()
    .from(jobs)
    .where(and(eq(jobs.documentId, documentId), inArray(jobs.status, ["in_asteptare", "in_curs"])))
    .all();
}
