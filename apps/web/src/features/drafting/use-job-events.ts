"use client";

import { useEffect, useReducer } from "react";
import type { JobEventMessage } from "./progress";

/**
 * Evenimentele unui job, din `GET /api/jobs/[id]/events` (Server-Sent Events): retrimiterea din
 * baza de date, apoi fluxul live, până la `sfarsit`. La căderea conexiunii, EventSource reia
 * singur cu `Last-Event-ID`; dacă renunță (eroare HTTP, server oprit), reconectăm noi cu
 * `?after=` și pauze crescătoare. Evenimentele deja văzute (după `seq`) sunt ignorate.
 *
 * Starea e a apelantului: `reducer(state, event)` (pur) construiește ce trebuie afișat.
 */

export type JobConnection = "idle" | "connecting" | "open" | "reconnecting" | "closed";

/** Tipurile de evenimente emise de worker-ul de redactare, plus `sfarsit` de la ruta SSE. */
export const DRAFTING_EVENT_TYPES = ["stare", "etapa", "plan", "activitate", "consum", "proiect", "sfarsit"] as const;

const BACKOFF_MS = [1000, 2000, 4000, 8000, 15000];
/** după atâtea reconectări eșuate la rând renunțăm (jobul nu mai există, sesiune expirată) */
const MAX_ATTEMPTS = 12;

interface Options<S> {
  reducer: (state: S, event: JobEventMessage) => S;
  initial: S;
  /** tipurile de evenimente ascultate (EventSource nu are „toate”) */
  types?: readonly string[];
}

interface HookState<S> {
  jobId: string | null;
  state: S;
  lastSeq: number;
  connection: JobConnection;
  ended: boolean;
}

type Action<S> =
  | { kind: "reset"; jobId: string | null; initial: S }
  | { kind: "event"; event: JobEventMessage; reducer: (state: S, event: JobEventMessage) => S }
  | { kind: "connection"; connection: JobConnection };

function hookReducer<S>(s: HookState<S>, a: Action<S>): HookState<S> {
  switch (a.kind) {
    case "reset":
      return { jobId: a.jobId, state: a.initial, lastSeq: 0, connection: a.jobId ? "connecting" : "idle", ended: false };
    case "connection":
      return s.ended || s.connection === a.connection ? s : { ...s, connection: a.connection };
    case "event": {
      const { event } = a;
      if (event.seq !== null && event.seq <= s.lastSeq) return s;
      const ended = event.type === "sfarsit";
      return {
        ...s,
        state: a.reducer(s.state, event),
        lastSeq: event.seq ?? s.lastSeq,
        ended: s.ended || ended,
        connection: ended ? "closed" : s.connection === "open" ? s.connection : "open",
      };
    }
  }
}

export function useJobEvents<S>(jobId: string | null, { reducer, initial, types = DRAFTING_EVENT_TYPES }: Options<S>) {
  const [hs, dispatch] = useReducer(hookReducer<S>, { jobId, state: initial, lastSeq: 0, connection: jobId ? "connecting" : "idle", ended: false } as HookState<S>);

  // alt job: starea pornește de la zero (ajustare în timpul randării, fără efect)
  if (hs.jobId !== jobId) dispatch({ kind: "reset", jobId, initial });

  const typesKey = types.join(",");
  useEffect(() => {
    if (!jobId) return;
    let es: EventSource | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let lastSeq = 0;
    let stopped = false;

    const open = () => {
      if (stopped) return;
      es = new EventSource(`/api/jobs/${encodeURIComponent(jobId)}/events?after=${lastSeq}`);
      es.onopen = () => {
        attempt = 0;
        dispatch({ kind: "connection", connection: "open" });
      };
      const onEvent = (ev: Event) => {
        const me = ev as MessageEvent<string>;
        const seq = me.lastEventId && ev.type !== "sfarsit" ? Number(me.lastEventId) : null;
        if (seq !== null && Number.isFinite(seq)) {
          if (seq <= lastSeq) return;
          lastSeq = seq;
        }
        let payload: unknown = null;
        try {
          payload = JSON.parse(me.data);
        } catch {
          payload = null;
        }
        dispatch({ kind: "event", event: { type: ev.type, seq: seq !== null && Number.isFinite(seq) ? seq : null, payload }, reducer });
        if (ev.type === "sfarsit") {
          stopped = true;
          es?.close();
        }
      };
      for (const t of typesKey.split(",")) es.addEventListener(t, onEvent);
      es.onerror = () => {
        if (stopped) return;
        dispatch({ kind: "connection", connection: "reconnecting" });
        // CONNECTING: browserul reia singur (cu Last-Event-ID); CLOSED: reluăm noi
        if (es?.readyState === EventSource.CLOSED) {
          es.close();
          if (attempt >= MAX_ATTEMPTS) {
            dispatch({ kind: "connection", connection: "closed" });
            return;
          }
          const wait = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
          attempt++;
          timer = setTimeout(open, wait);
        }
      };
    };

    // fila a revenit din fundal: dacă reluarea automată a eșuat, încercăm imediat
    const onVisible = () => {
      if (document.visibilityState !== "visible" || stopped || !es || es.readyState !== EventSource.CLOSED) return;
      clearTimeout(timer);
      attempt = 0;
      open();
    };

    open();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      es?.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
    // reducer-ul e pur și stabil (definit la nivel de modul de apelant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, typesKey]);

  const current = hs.jobId === jobId ? hs : { state: initial, lastSeq: 0, connection: (jobId ? "connecting" : "idle") as JobConnection, ended: false };
  return { state: current.state, lastSeq: current.lastSeq, connection: current.connection, ended: current.ended };
}
