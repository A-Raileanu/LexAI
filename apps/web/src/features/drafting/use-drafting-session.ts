"use client";

import type { Editor } from "@tiptap/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import type { EditorBridge } from "@/features/editor/bridge";
import { getDraftAction } from "./actions";
import { initialProgress, isDraftSkeleton, progressReducer, type DraftingProgress } from "./progress";
import { ACTIVE_JOB, FINAL_JOB, type DraftInfo, type JobStatus } from "./types";
import { useJobEvents, type JobConnection } from "./use-job-events";

/**
 * Starea redactării pentru un document generat, ținută la nivelul spațiului de lucru (nu în
 * panou), ca foaia să rămână blocată și proiectul să fie încărcat și când panoul e închis sau
 * pe altă filă.
 *
 * - încarcă rândul `drafts` (job, câmpuri de completat);
 * - ascultă evenimentele jobului (și retrimiterea lor, pentru fila „Generare” a unui document gata);
 * - cât timp jobul rulează, foaia e read-only;
 * - la `proiect` / `finalizat`, cere spațiului de lucru să reîncarce conținutul de lucru
 *   (versiunea nouă, fără salvare automată a scheletului) și abia apoi deblochează foaia.
 */

export type DraftingPhase = "off" | "loading" | "none" | "generating" | "finishing" | "failed" | "done";

export interface DraftingSession {
  enabled: boolean;
  phase: DraftingPhase;
  draft: DraftInfo | null;
  loadError: string | null;
  /** starea efectivă a jobului */
  status: JobStatus | null;
  progress: DraftingProgress;
  connection: JobConnection;
  /** abonare la modificările documentului din editor (pentru listele „live”) */
  subscribeDoc: (cb: () => void) => () => void;
  /** un obiect care se schimbă la fiecare modificare a documentului (cheie de cache) */
  docVersion: () => unknown;
  reloadDraft: () => Promise<void>;
}

interface Options {
  documentId: string;
  enabled: boolean;
  bridge: EditorBridge;
  editor: Editor;
  /** reîncarcă în editor conținutul de lucru salvat (versiunea generată); true dacă a reușit */
  onReload: () => Promise<boolean>;
}

type Load = { state: "loading" } | { state: "ready"; info: DraftInfo | null } | { state: "error"; error: string };

async function loadDraft(documentId: string): Promise<Load> {
  try {
    const res = await getDraftAction(documentId);
    return res.ok ? { state: "ready", info: res.data } : { state: "error", error: res.error };
  } catch {
    return { state: "error", error: "Nu am putut încărca starea generării." };
  }
}

export function useDraftingSession({ documentId, enabled, bridge, editor, onReload }: Options): DraftingSession {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [skeletonAtMount] = useState(() => enabled && isDraftSkeleton(bridge.getJSON()));
  /** jobul rula când am încărcat pagina: doar atunci reîncărcăm conținutul la final */
  const [watchedJob, setWatchedJob] = useState<string | null>(null);
  const [reloadedFor, setReloadedFor] = useState<string | null>(null);

  const reloadRef = useRef(onReload);
  useEffect(() => {
    reloadRef.current = onReload;
  });

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void loadDraft(documentId).then((l) => {
      if (!live) return;
      setLoad(l);
      if (l.state === "ready" && l.info?.job && ACTIVE_JOB.has(l.info.job.status)) setWatchedJob(l.info.job.id);
    });
    return () => {
      live = false;
    };
  }, [enabled, documentId]);

  const info = load.state === "ready" ? load.info : null;
  const jobId = enabled ? (info?.job?.id ?? null) : null;
  const events = useJobEvents(jobId, { reducer: progressReducer, initial: initialProgress });
  const progress = events.state;

  const serverStatus = info?.job?.status ?? null;
  const watching = watchedJob !== null && watchedJob === jobId;
  // pentru un job deja terminat la încărcare, retrimiterea evenimentelor nu schimbă starea
  const status: JobStatus | null = serverStatus && FINAL_JOB.has(serverStatus) && !watching ? serverStatus : (progress.status ?? serverStatus);
  const finishedSignal = progress.proiect?.versionId ?? (status === "finalizat" ? "finalizat" : null);

  let phase: DraftingPhase;
  if (!enabled) phase = "off";
  else if (load.state === "loading") phase = "loading";
  else if (load.state === "error") phase = "none";
  else if (!info) phase = "none";
  else if (watching && finishedSignal && reloadedFor !== jobId) phase = "finishing";
  else if (finishedSignal || status === "finalizat") phase = "done";
  else if (status === "esuat" || status === "anulat" || status === "intrerupt") phase = "failed";
  else if (status === "in_asteptare" || status === "in_curs") phase = "generating";
  else phase = info.conformitate ? "done" : "none";

  // foaia: blocată cât timp jobul rulează (și până aflăm starea, dacă documentul e încă scheletul)
  const lock = enabled && (phase === "generating" || phase === "finishing" || (phase === "loading" && skeletonAtMount));
  const appliedLock = useRef(false);
  useEffect(() => {
    if (appliedLock.current === lock) return;
    appliedLock.current = lock;
    bridge.setReadOnly(lock);
  }, [bridge, lock]);

  // proiectul a sosit: încărcăm versiunea nouă în editor, apoi câmpurile de completat
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!watching || !finishedSignal || !jobId || handled.current === jobId) return;
    handled.current = jobId;
    void (async () => {
      const ok = await reloadRef.current();
      const next = await loadDraft(documentId);
      setLoad((prev) => (next.state === "ready" ? next : prev));
      setReloadedFor(jobId);
      if (ok) {
        toast.success("Documentul a fost generat.", { description: "Verifică fiecare clauză înainte de semnare." });
      } else {
        toast.error("Documentul a fost generat, dar nu l-am putut încărca.", { description: "Reîncarcă pagina." });
      }
    })();
  }, [watching, finishedSignal, jobId, documentId]);

  // jobul s-a încheiat (oricum): reîmprospătăm rândul (ora de final, eroarea)
  const refreshedEnd = useRef<string | null>(null);
  useEffect(() => {
    if (!watching || !events.ended || !jobId || refreshedEnd.current === jobId) return;
    refreshedEnd.current = jobId;
    void loadDraft(documentId).then((next) => setLoad((prev) => (next.state === "ready" ? next : prev)));
  }, [watching, events.ended, jobId, documentId]);

  const subscribeDoc = useCallback(
    (cb: () => void) => {
      editor.on("transaction", cb);
      return () => {
        editor.off("transaction", cb);
      };
    },
    [editor],
  );
  const docVersion = useCallback(() => editor.state.doc, [editor]);
  const reloadDraft = useCallback(async () => {
    const next = await loadDraft(documentId);
    setLoad((prev) => (next.state === "ready" ? next : prev));
  }, [documentId]);

  return useMemo(
    () => ({
      enabled,
      phase,
      draft: info,
      loadError: load.state === "error" ? load.error : null,
      status,
      progress,
      connection: events.connection,
      subscribeDoc,
      docVersion,
      reloadDraft,
    }),
    [enabled, phase, info, load, status, progress, events.connection, subscribeDoc, docVersion, reloadDraft],
  );
}
