"use client";

import { createContext, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type Ref } from "react";
import { toast } from "@/components/ui/toast";
import { documentLocators } from "@/features/analysis/triage";
import type { JobEventMessage } from "@/features/drafting/progress";
import { useJobEvents } from "@/features/drafting/use-job-events";
import { isTextProposal, proposalKind, sortProposals } from "@lexai/core/chat";
import type { AppliedEdit, EditorBridge, PreviewScroll } from "@/features/editor/bridge";
import { clearChatAction, loadChatAction, retryChatAction, sendChatAction, setProposalStatusAction, stopChatAction } from "./actions";
import { proposalEdit, proposalTarget } from "./edits";
import { proposalLocation, STALE } from "./labels";
import type { ChatMessageView, ChatProposal, ChatScope, ProposalStatus } from "./types";

/**
 * Starea chatului documentului (docs/ux/18-chat-editor.md): conversația, răspunsul în curs (SSE),
 * selecția trimisă cu cererea și aplicarea modificărilor propuse. Stă în spațiul de lucru, deasupra
 * panoului, ca ciorna cererii și progresul să supraviețuiască schimbării filei și închiderii foii.
 */

export interface ChatHandle {
  /** ⌘J: pune focusul în compozitor (panoul e deschis de spațiul de lucru) */
  requestFocus(): void;
}

export interface ChatState {
  messages: ChatMessageView[];
  /** răspunsul în curs (mesajul asistentului), dacă există */
  running: ChatMessageView | null;
  /** ultimul pas al agentului pentru răspunsul în curs */
  activity: string | null;
  draft: string;
  setDraft(v: string): void;
  /** selecția din document care intră în cerere (null = tot documentul) */
  scope: ChatScope | null;
  dismissScope(): void;
  sending: boolean;
  /** eroarea ultimei trimiteri (sub compozitor) */
  sendError: string | null;
  send(): Promise<void>;
  stop(): void;
  retry(messageId: string): void;
  apply(messageId: string, proposalIds: string[]): void;
  reject(messageId: string, proposalId: string): void;
  reconsider(messageId: string, proposalId: string): void;
  undo(messageId: string, proposalId: string): void;
  clear(): Promise<boolean>;
  /** mesajul de eroare al aplicării, pe `${messageId}:${proposalId}` */
  applyErrors: Readonly<Record<string, string>>;
  /** evidențiază în document ținta unei modificări (și derulează la ea, după `scroll`); null = fără */
  preview(p: ChatProposal | null, opts?: { scroll?: PreviewScroll }): void;
  /** locul fiecărui paragraf („Art. 4”, „§ 12”) și textul lui (contextul diff-ului) */
  locators: ReadonlyMap<string, string>;
  segTexts: ReadonlyMap<string, string>;
  /** propunerile mesajului în ordinea din document */
  ordered(m: ChatMessageView): ChatProposal[];
  /** locul unei propuneri („Art. 3”, „După Art. 4”), reținut și după ce paragrafele dispar */
  location(messageId: string, p: ChatProposal): string;
  /** true o singură dată după ⌘J */
  consumeFocusRequest(): boolean;
  focusTick: number;
  focusEditor(): void;
}

const ChatContext = createContext<ChatState | null>(null);

export function useChat(): ChatState {
  const v = useContext(ChatContext);
  if (!v) throw new Error("useChat() trebuie folosit în ChatProvider.");
  return v;
}

const EVENT_TYPES = ["stare", "activitate", "raspuns", "sfarsit"] as const;

interface StreamState {
  activity: string | null;
}
const initialStream: StreamState = { activity: null };
function streamReducer(s: StreamState, e: JobEventMessage): StreamState {
  if (e.type !== "activitate") return s;
  const mesaj = (e.payload as { mesaj?: unknown } | null)?.mesaj;
  return typeof mesaj === "string" ? { activity: mesaj } : s;
}

const key = (messageId: string, proposalId: string) => `${messageId}:${proposalId}`;

interface ProviderProps {
  documentId: string;
  bridge: EditorBridge;
  initial: ChatMessageView[];
  /** salvează ciorna înainte de cerere (worker-ul citește textul salvat) */
  flush: () => Promise<boolean>;
  handleRef?: Ref<ChatHandle>;
  children: ReactNode;
}

export function ChatProvider({ documentId, bridge, initial, flush, handleRef, children }: ProviderProps) {
  const [messages, setMessages] = useState<ChatMessageView[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [applyErrors, setApplyErrors] = useState<Record<string, string>>({});
  const [focusTick, setFocusTick] = useState(0);
  const [docTick, setDocTick] = useState(0);
  const focusRequest = useRef(false);

  // ───────────── selecția din document ─────────────
  const selKey = useSyncExternalStore(bridge.onSelectionChange, bridge.selectionKey, () => "");
  const [dismissed, setDismissed] = useState<string | null>(null);
  const liveScope = useMemo(() => (selKey ? bridge.selectionScope() : null), [bridge, selKey]);
  const scope = liveScope && selKey !== dismissed ? liveScope : null;
  const dismissScope = useCallback(() => setDismissed(selKey), [selKey]);

  // ───────────── răspunsul în curs ─────────────
  const running = useMemo(() => [...messages].reverse().find((m) => m.reply?.state === "in_curs") ?? null, [messages]);
  const jobId = running?.reply?.jobId ?? null;
  const stream = useJobEvents(jobId, { reducer: streamReducer, initial: initialStream, types: EVENT_TYPES });

  // fluxul s-a încheiat (răspuns, eroare, oprire): conversația se reîncarcă de pe server
  useEffect(() => {
    if (!jobId || !stream.ended) return;
    let alive = true;
    void loadChatAction(documentId).then((res) => {
      if (alive && res.ok) setMessages(res.data);
    });
    return () => {
      alive = false;
    };
  }, [documentId, jobId, stream.ended]);

  // ───────────── contextul diff-ului ─────────────
  const { locators, segTexts, segOrder } = useMemo(() => {
    void docTick;
    void messages;
    const segments = bridge.getSegments();
    return { locators: documentLocators(segments), segTexts: new Map(segments.map((s) => [s.segId, s.text])), segOrder: new Map(segments.map((s, i) => [s.segId, i])) };
  }, [bridge, docTick, messages]);

  // propunerile noi vin deja în ordinea din document (validarea le ordonează); cele vechi, doar de text, se ordonează aici
  const ordered = useCallback((m: ChatMessageView) => (m.proposals.every((p) => p.kind) ? m.proposals : sortProposals(m.proposals, segOrder)), [segOrder]);

  // locul fiecărei propuneri, reținut: după o înlocuire, paragrafele vechi nu mai există în document
  const places = useRef(new Map<string, string>());
  const location = (messageId: string, p: ChatProposal) => {
    const k = key(messageId, p.id);
    const now = proposalLocation(p, locators);
    if (now) places.current.set(k, now);
    return places.current.get(k) ?? (p.kind === "inserare" ? "Inserare" : "Paragraf");
  };

  // ───────────── trimitere ─────────────
  const send = async () => {
    const text = draft.trim();
    if (!text || sending || running) return;
    setSending(true);
    setSendError(null);
    try {
      // worker-ul citește ciorna salvată: textul trebuie să fie cel de pe ecran
      if (!(await flush())) {
        setSendError("Nu am putut salva documentul înainte de cerere. Încearcă din nou.");
        return;
      }
      const res = await sendChatAction(documentId, text, scope);
      if (!res.ok) {
        setSendError(res.error);
        return;
      }
      setMessages(res.data);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  const stop = () => {
    if (!jobId) return;
    void stopChatAction(jobId).then((res) => {
      if (!res.ok) toast.error("Nu am putut opri răspunsul.", { description: res.error });
    });
  };

  const retry = (messageId: string) => {
    if (running) return;
    void (async () => {
      await flush();
      const res = await retryChatAction(messageId);
      if (!res.ok) toast.error("Nu am putut reîncerca.", { description: res.error });
      else setMessages(res.data);
    })();
  };

  const clear = async () => {
    const res = await clearChatAction(documentId);
    if (!res.ok) {
      toast.error("Nu am putut șterge conversația.", { description: res.error });
      return false;
    }
    setMessages([]);
    setApplyErrors({});
    return true;
  };

  // ───────────── modificările propuse ─────────────
  // o singură notificare activă: cea nouă o înlocuiește pe cea veche (ca la analiză)
  const lastToast = useRef<string | null>(null);
  const notify = (title: string, undo?: () => void, description?: string) => {
    if (lastToast.current) toast.dismiss(lastToast.current);
    lastToast.current = toast(title, { timeout: description ? 9000 : 6000, description, action: undo ? { label: "Anulează", onClick: undo } : undefined });
  };

  const patchStatus = (messageId: string, ids: readonly string[], status: ProposalStatus) =>
    setMessages((list) => list.map((m) => (m.id === messageId ? { ...m, proposals: m.proposals.map((p) => (ids.includes(p.id) ? { ...p, status } : p)) } : m)));

  /** Starea nouă, local imediat și apoi pe server; la eșec revine. */
  const setStatus = (messageId: string, ids: string[], status: ProposalStatus) => {
    const before = messages.find((m) => m.id === messageId)?.proposals ?? [];
    patchStatus(messageId, ids, status);
    void setProposalStatusAction(messageId, ids, status).then((res) => {
      if (res.ok) return;
      for (const p of before) if (ids.includes(p.id)) patchStatus(messageId, [p.id], p.status);
      toast.error("Nu am putut salva alegerea.", { description: res.error });
    });
  };

  const setErrors = (patch: Record<string, string | null>) =>
    setApplyErrors((e) => {
      const next = { ...e };
      for (const [k, v] of Object.entries(patch)) {
        if (v) next[k] = v;
        else delete next[k];
      }
      return next;
    });

  // modificările aplicate în această sesiune (contextul lor, pentru „Anulează”)
  const edits = useRef(new Map<string, AppliedEdit>());

  const revert = (messageId: string, p: ChatProposal): boolean => {
    const known = edits.current.get(key(messageId, p.id));
    // după reîncărcarea paginii: textul se readuce după conținut; blocurile, doar cu ⌘Z
    const edit: AppliedEdit | undefined = known ?? (isTextProposal(p) ? { segId: p.segmentId, original: p.textOriginal, replacement: p.textNou, before: "", after: "" } : undefined);
    if (!edit || !bridge.revertEdit(edit)) return false;
    edits.current.delete(key(messageId, p.id));
    return true;
  };

  const undoApplied = (messageId: string, ids: string[]) => {
    const msg = messages.find((m) => m.id === messageId);
    const reverted: string[] = [];
    // în ordinea inversă aplicării: contextul fiecăreia include textul celorlalte
    for (const p of [...(msg?.proposals ?? [])].reverse()) if (ids.includes(p.id) && revert(messageId, p)) reverted.push(p.id);
    if (reverted.length) {
      setStatus(messageId, reverted, "propusa");
      setDocTick((t) => t + 1);
    }
    if (reverted.length < ids.length) toast.error("Nu am putut readuce textul original.", { description: "Documentul a fost modificat între timp; folosește ⌘Z în document." });
  };

  const apply = (messageId: string, proposalIds: string[]) => {
    const msg = messages.find((m) => m.id === messageId);
    const list = (msg ? ordered(msg) : []).filter((p) => proposalIds.includes(p.id) && p.status === "propusa");
    if (!list.length) return;
    // locurile, înainte ca paragrafele înlocuite să dispară
    const where = new Map(list.map((p) => [p.id, location(messageId, p)]));
    bridge.previewProposal(null);
    const results = bridge.applyProposals(list.map(proposalEdit));
    const ok: string[] = [];
    const skipped: string[] = [];
    const errors: Record<string, string | null> = {};
    list.forEach((p, i) => {
      const r = results[i];
      if (r) {
        ok.push(p.id);
        edits.current.set(key(messageId, p.id), r);
        errors[key(messageId, p.id)] = null;
      } else {
        errors[key(messageId, p.id)] = STALE[proposalKind(p)];
        skipped.push(where.get(p.id) ?? p.id);
      }
    });
    setErrors(errors);
    if (!ok.length) return;
    setStatus(messageId, ok, "aplicata");
    setDocTick((t) => t + 1);
    notify(
      ok.length === 1 ? "Modificare aplicată în document." : `${ok.length} modificări aplicate în document.`,
      () => undoApplied(messageId, ok),
      skipped.length ? `${skipped.length === 1 ? "Nu s-a aplicat" : `Nu s-au aplicat ${skipped.length}`}: ${skipped.join(", ")}. Documentul s-a schimbat acolo.` : undefined,
    );
  };

  const reject = (messageId: string, proposalId: string) => {
    setStatus(messageId, [proposalId], "respinsa");
    setErrors({ [key(messageId, proposalId)]: null });
    bridge.previewProposal(null);
    notify("Modificare respinsă.", () => setStatus(messageId, [proposalId], "propusa"));
  };

  const reconsider = (messageId: string, proposalId: string) => setStatus(messageId, [proposalId], "propusa");
  const undo = (messageId: string, proposalId: string) => undoApplied(messageId, [proposalId]);

  const preview = useCallback(
    (p: ChatProposal | null, opts?: { scroll?: PreviewScroll }) => {
      bridge.previewProposal(p && p.status !== "aplicata" ? proposalTarget(p) : null, opts);
    },
    [bridge],
  );
  // previzualizarea nu rămâne agățată când panoul dispare
  useEffect(() => () => void bridge.previewProposal(null), [bridge]);

  const consumeFocusRequest = useCallback(() => {
    const pending = focusRequest.current;
    focusRequest.current = false;
    return pending;
  }, []);

  useImperativeHandle(
    handleRef,
    () => ({
      requestFocus() {
        focusRequest.current = true;
        setFocusTick((t) => t + 1);
      },
    }),
    [],
  );

  const value: ChatState = {
    messages,
    running,
    activity: running ? stream.state.activity : null,
    draft,
    setDraft: (v) => {
      setDraft(v);
      if (sendError) setSendError(null);
    },
    scope,
    dismissScope,
    sending,
    sendError,
    send,
    stop,
    retry,
    apply,
    reject,
    reconsider,
    undo,
    clear,
    applyErrors,
    preview,
    locators,
    segTexts,
    ordered,
    location,
    consumeFocusRequest,
    focusTick,
    focusEditor: bridge.focusEditor,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
