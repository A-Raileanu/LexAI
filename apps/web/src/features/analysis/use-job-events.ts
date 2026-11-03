"use client";

import { useEffect, useEffectEvent, useReducer } from "react";
import { initialStream, reduceJobStream, type JobEventMessage, type JobStreamState } from "./events";

/** Tipurile de evenimente transmise de `/api/jobs/[id]/events` (`event:` din SSE). */
const EVENT_TYPES = ["stare", "etapa", "identificare", "trimiteri", "grup_start", "activitate", "constatare", "grup_final", "consum", "rezultat", "eroare", "sfarsit"];

const BATCH_MS = 60;
const MAX_RETRIES = 8;

export interface JobEnd {
  status: string;
  eroare: string | null;
}

/**
 * Progresul live al unui job, prin EventSource. Retrimite evenimentele de la început (deci și după
 * un reload ajunge la ultima stare), apoi le primește pe cele noi; evenimentele vin în loturi, ca
 * o reluare cu sute de pași să nu producă sute de randări. La o eroare de rețea, EventSource reia
 * singur cu `Last-Event-ID`; dacă renunță, ne reconectăm noi de la ultimul `seq` văzut.
 */
export function useJobEvents(jobId: string | null, handlers: { onEnd?: (end: JobEnd) => void; onStart?: () => void } = {}): JobStreamState {
  const [state, dispatch] = useReducer(reduceJobStream, jobId, initialStream);
  const ended = useEffectEvent((end: JobEnd) => handlers.onEnd?.(end));
  const startedEvent = useEffectEvent(() => handlers.onStart?.());

  useEffect(() => {
    if (!jobId) return;
    let es: EventSource | null = null;
    let lastSeq = 0;
    let closed = false;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    let queue: JobEventMessage[] = [];

    const flush = () => {
      flushTimer = undefined;
      if (!queue.length) return;
      const events = queue;
      queue = [];
      dispatch({ kind: "events", jobId, events });
    };

    const connect = () => {
      if (closed) return;
      es = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/events${lastSeq ? `?after=${lastSeq}` : ""}`);
      es.onopen = () => {
        retries = 0;
        dispatch({ kind: "connection", jobId, connection: "open" });
      };
      const onMessage = (e: MessageEvent<string>) => {
        let payload: unknown = null;
        try {
          payload = JSON.parse(e.data);
        } catch {
          return;
        }
        const seq = e.lastEventId && e.type !== "sfarsit" ? Number(e.lastEventId) : null;
        if (seq !== null && Number.isFinite(seq)) {
          if (seq <= lastSeq) return;
          lastSeq = seq;
        }
        queue.push({ seq: seq !== null && Number.isFinite(seq) ? seq : null, type: e.type, payload });
        if (e.type === "stare" && (payload as { status?: string } | null)?.status === "in_curs") startedEvent();
        if (e.type === "sfarsit") {
          // fluxul s-a încheiat: nu mai lăsăm EventSource să se reconecteze
          closed = true;
          es?.close();
          flush();
          dispatch({ kind: "connection", jobId, connection: "closed" });
          const p = payload as Partial<JobEnd>;
          ended({ status: p.status ?? "necunoscut", eroare: p.eroare ?? null });
          return;
        }
        flushTimer ??= setTimeout(flush, BATCH_MS);
      };
      for (const t of EVENT_TYPES) es.addEventListener(t, onMessage as EventListener);
      es.onerror = () => {
        if (closed) return;
        dispatch({ kind: "connection", jobId, connection: "reconnecting" });
        // CLOSED = EventSource a renunțat (ex. răspuns HTTP greșit); altfel reia singur
        if (es?.readyState === EventSource.CLOSED && retries < MAX_RETRIES) {
          retries++;
          retryTimer = setTimeout(connect, Math.min(15_000, 1000 * 2 ** retries));
        }
      };
    };

    connect();
    return () => {
      closed = true;
      es?.close();
      clearTimeout(retryTimer);
      clearTimeout(flushTimer);
    };
  }, [jobId]);

  return state.jobId === jobId ? state : initialStream(jobId);
}
