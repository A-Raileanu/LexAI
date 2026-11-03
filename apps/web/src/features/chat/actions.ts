"use server";

import type { ChatProposal } from "@lexai/core/chat";
import { activeJobsFor, and, chatMessages, desc, documents, enqueueJob, eq, getDb, getJob, jobs, lt, newId, requestJobCancel } from "@lexai/db";
import { z } from "zod";
import { loadChat } from "./server";
import type { ChatMessageView, ChatScope, ProposalStatus } from "./types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const MAX_REQUEST = 8_000;

const Scope = z.object({
  segments: z
    .array(z.object({ segmentId: z.string().min(1).max(200), start: z.number().int().min(0), end: z.number().int().min(1) }).refine((s) => s.end > s.start, "Selecție invalidă."))
    .min(1)
    .max(2_000),
  text: z.string().max(400_000),
});

function liveDocument(documentId: string) {
  if (typeof documentId !== "string" || !documentId) return null;
  const doc = getDb().select({ id: documents.id, projectId: documents.projectId, archivedAt: documents.archivedAt }).from(documents).where(eq(documents.id, documentId)).get();
  return doc && !doc.archivedAt ? doc : null;
}

const chatRunning = (documentId: string) => activeJobsFor(getDb(), documentId).some((j) => j.kind === "chat");

export async function loadChatAction(documentId: string): Promise<Result<ChatMessageView[]>> {
  if (!liveDocument(documentId)) return { ok: false, error: "Documentul nu există." };
  return { ok: true, data: loadChat(documentId) };
}

/**
 * Trimite o cerere: mesajul utilizatorului (cu selecția), mesajul gol al asistentului și jobul
 * „chat”. Clientul salvează întâi ciorna, ca worker-ul să lucreze pe textul de pe ecran.
 */
export async function sendChatAction(documentId: string, text: string, scope: ChatScope | null): Promise<Result<ChatMessageView[]>> {
  const doc = liveDocument(documentId);
  if (!doc) return { ok: false, error: "Documentul nu există." };
  const request = typeof text === "string" ? text.trim() : "";
  if (!request) return { ok: false, error: "Scrie cererea." };
  if (request.length > MAX_REQUEST) return { ok: false, error: `Cererea este prea lungă (maximum ${MAX_REQUEST} de caractere).` };
  let parsedScope: ChatScope | null = null;
  if (scope) {
    const p = Scope.safeParse(scope);
    if (!p.success) return { ok: false, error: "Selecția nu este validă. Selectează din nou textul." };
    parsedScope = p.data;
  }
  if (chatRunning(documentId)) return { ok: false, error: "Un răspuns este deja în curs. Așteaptă-l sau oprește-l." };

  const db = getDb();
  const now = Date.now();
  const userMessageId = newId("msg");
  const messageId = newId("msg");
  db.transaction((tx) => {
    tx.insert(chatMessages).values({ id: userMessageId, documentId, role: "utilizator", content: request, scope: parsedScope ? JSON.stringify(parsedScope) : null, createdAt: now }).run();
    const job = enqueueJob(tx as unknown as typeof db, { kind: "chat", projectId: doc.projectId, documentId, input: { documentId, userMessageId, messageId } });
    // asistentul după utilizator, chiar în aceeași milisecundă
    tx.insert(chatMessages).values({ id: messageId, documentId, role: "asistent", content: "", jobId: job.id, createdAt: now + 1 }).run();
  });
  return { ok: true, data: loadChat(documentId) };
}

/** „Reîncearcă” după un răspuns eșuat sau oprit: același mesaj al asistentului, job nou. */
export async function retryChatAction(messageId: string): Promise<Result<ChatMessageView[]>> {
  const db = getDb();
  const msg = typeof messageId === "string" ? db.select().from(chatMessages).where(eq(chatMessages.id, messageId)).get() : undefined;
  if (!msg || msg.role !== "asistent") return { ok: false, error: "Mesajul nu există." };
  const doc = liveDocument(msg.documentId);
  if (!doc) return { ok: false, error: "Documentul nu există." };
  if (chatRunning(msg.documentId)) return { ok: false, error: "Un răspuns este deja în curs." };
  const user = db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(and(eq(chatMessages.documentId, msg.documentId), eq(chatMessages.role, "utilizator"), lt(chatMessages.createdAt, msg.createdAt)))
    .orderBy(desc(chatMessages.createdAt))
    .get();
  if (!user) return { ok: false, error: "Cererea nu mai există." };
  const job = enqueueJob(db, { kind: "chat", projectId: doc.projectId, documentId: msg.documentId, input: { documentId: msg.documentId, userMessageId: user.id, messageId } });
  db.update(chatMessages).set({ content: "", proposals: null, jobId: job.id }).where(eq(chatMessages.id, messageId)).run();
  return { ok: true, data: loadChat(msg.documentId) };
}

export async function stopChatAction(jobId: string): Promise<Result<undefined>> {
  const db = getDb();
  const job = typeof jobId === "string" ? getJob(db, jobId) : undefined;
  if (!job || job.kind !== "chat") return { ok: false, error: "Răspunsul nu există." };
  requestJobCancel(db, jobId);
  return { ok: true, data: undefined };
}

const STATUSES: readonly ProposalStatus[] = ["propusa", "aplicata", "respinsa"];

/** Starea unor modificări propuse dintr-un mesaj (aplicată / respinsă / din nou în așteptare). */
export async function setProposalStatusAction(messageId: string, proposalIds: string[], status: ProposalStatus): Promise<Result<ChatProposal[]>> {
  if (!STATUSES.includes(status) || !Array.isArray(proposalIds) || !proposalIds.every((x) => typeof x === "string")) return { ok: false, error: "Cerere invalidă." };
  const db = getDb();
  const ids = new Set(proposalIds);
  const out = db.transaction((tx) => {
    const msg = tx.select({ proposals: chatMessages.proposals }).from(chatMessages).where(eq(chatMessages.id, messageId)).get();
    if (!msg?.proposals) return null;
    const list = (JSON.parse(msg.proposals) as ChatProposal[]).map((p) => (ids.has(p.id) ? { ...p, status } : p));
    tx.update(chatMessages).set({ proposals: JSON.stringify(list) }).where(eq(chatMessages.id, messageId)).run();
    return list;
  });
  return out ? { ok: true, data: out } : { ok: false, error: "Mesajul nu mai există." };
}

/** „Șterge conversația”: mesajele și joburile de chat ale documentului (textul documentului rămâne). */
export async function clearChatAction(documentId: string): Promise<Result<undefined>> {
  if (!liveDocument(documentId)) return { ok: false, error: "Documentul nu există." };
  if (chatRunning(documentId)) return { ok: false, error: "Oprește întâi răspunsul în curs." };
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(chatMessages).where(eq(chatMessages.documentId, documentId)).run();
    // inclusiv joburile încercărilor anterioare (după „Reîncearcă”); evenimentele lor, în cascadă
    tx.delete(jobs).where(and(eq(jobs.documentId, documentId), eq(jobs.kind, "chat"))).run();
  });
  return { ok: true, data: undefined };
}
