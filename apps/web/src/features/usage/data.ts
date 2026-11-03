import "server-only";
import { aiUsage, documents, eq, getDb, gte, inArray, jobs, projects } from "@lexai/db";
import type { SubscriptionLimits } from "@lexai/ai/usage";
import { latestLimits } from "@/server/usage";
import type { JobInfo, UsageRow } from "./aggregate";

/** cât istoric trimitem clientului (intervalul maxim al paginii: 30 de zile) */
const HISTORY_MS = 31 * 24 * 60 * 60 * 1000;

export interface UsageSnapshot {
  now: number;
  limits: SubscriptionLimits | null;
  rows: UsageRow[];
  jobs: JobInfo[];
  /** există consum înregistrat vreodată (pentru starea goală) */
  everUsed: boolean;
}

export function usageSnapshot(): UsageSnapshot {
  const db = getDb();
  const now = Date.now();
  const raw = db.select().from(aiUsage).where(gte(aiUsage.createdAt, now - HISTORY_MS)).orderBy(aiUsage.createdAt).all();
  const rows: UsageRow[] = raw.map((r) => ({
    t: r.createdAt,
    jobId: r.jobId,
    etapa: r.etapa,
    model: r.model,
    input: r.input,
    output: r.output,
    cacheRead: r.cacheRead,
    cacheWrite: r.cacheWrite,
    apeluri: r.apeluri,
    cost: r.costUsd,
    l5: r.limit5hPct,
    l7: r.limit7dPct,
  }));
  const ids = [...new Set(raw.map((r) => r.jobId).filter((id): id is string => Boolean(id)))];
  const jobRows = ids.length
    ? db
        .select({
          id: jobs.id,
          kind: jobs.kind,
          status: jobs.status,
          projectId: jobs.projectId,
          projectName: projects.name,
          documentId: jobs.documentId,
          documentTitle: documents.title,
          createdAt: jobs.createdAt,
          startedAt: jobs.startedAt,
          finishedAt: jobs.finishedAt,
        })
        .from(jobs)
        .leftJoin(projects, eq(projects.id, jobs.projectId))
        .leftJoin(documents, eq(documents.id, jobs.documentId))
        .where(inArray(jobs.id, ids))
        .all()
    : [];
  const everUsed = rows.length > 0 || Boolean(db.select({ id: aiUsage.id }).from(aiUsage).limit(1).get());
  return { now, limits: latestLimits(), rows, jobs: jobRows, everUsed };
}
