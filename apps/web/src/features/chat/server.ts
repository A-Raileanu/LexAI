import "server-only";
import type { ChatProposal, ChatScope } from "@lexai/core/chat";
import { asc, chatMessages, eq, getDb, inArray, jobs, type Db, type Job } from "@lexai/db";
import type { ChatMessageView, ChatReplyState } from "./types";

function parse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function replyState(job: Job | undefined, content: string): ChatReplyState {
  if (!job) return content ? "gata" : "eroare";
  if (job.status === "in_asteptare" || job.status === "in_curs") return "in_curs";
  if (job.status === "finalizat") return "gata";
  if (job.status === "anulat") return "oprit";
  return "eroare";
}

/** Conversația unui document, în ordine cronologică, cu starea joburilor răspunsurilor. */
export function loadChat(documentId: string, db: Db = getDb()): ChatMessageView[] {
  const rows = db.select().from(chatMessages).where(eq(chatMessages.documentId, documentId)).orderBy(asc(chatMessages.createdAt)).all();
  const jobIds = rows.map((r) => r.jobId).filter((x): x is string => Boolean(x));
  const byId = new Map(jobIds.length ? db.select().from(jobs).where(inArray(jobs.id, jobIds)).all().map((j) => [j.id, j]) : []);
  return rows.map((r) => {
    const job = r.jobId ? byId.get(r.jobId) : undefined;
    return {
      id: r.id,
      role: r.role,
      content: r.content,
      scope: parse<ChatScope>(r.scope),
      proposals: parse<ChatProposal[]>(r.proposals) ?? [],
      createdAt: r.createdAt,
      reply:
        r.role === "asistent"
          ? {
              state: replyState(job, r.content),
              jobId: r.jobId ?? null,
              error: job?.status === "intrerupt" ? "Procesul a fost oprit în timpul răspunsului." : (job?.error ?? (job ? null : "Răspunsul nu mai este disponibil.")),
              startedAt: job?.startedAt ?? job?.createdAt ?? null,
            }
          : null,
    };
  });
}
