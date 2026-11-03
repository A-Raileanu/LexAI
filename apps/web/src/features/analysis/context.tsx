"use client";

import type { Finding } from "@lexai/core/types";
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { toast } from "@/components/ui/toast";
import type { AppliedReplacement, EditorBridge } from "@/features/editor/bridge";
import { cancelAnalysisAction, ignoreFinding, loadAnalysisAction, recordFindingAction, restoreFinding, startAnalysisAction } from "./actions";
import type { JobStreamState } from "./events";
import {
  countByStatus,
  findingIdOf,
  findingSignature,
  highlightItems,
  highlightsSignature,
  mergeLive,
  partitionIgnored,
  suggestionAt,
  withIgnoredActions,
  type StatusCounts,
} from "./model";
import { documentLocators, variantKind } from "./triage";
import type { AnalysisBootstrap, AnalysisSnapshot, FindingActionKind, LatestAnalysis, ShownAnalysis } from "./types";
import { useJobEvents, type JobEnd } from "./use-job-events";

/**
 * Starea analizei documentului deschis în editor: ultima analiză (din server), progresul live al
 * jobului (SSE), constatările afișate, evidențierile din document și comenzile (pornire,
 * reverificare, oprire, aplicare / ignorare). Stă deasupra panoului, ca starea să supraviețuiască
 * închiderii foii laterale și schimbării filei, iar antetul să poată arăta pastila de progres.
 */

export type RunningTab = "progres" | "constatari";

export interface AnalysisHandle {
  /** butonul „Analizează” din antet: deschide formularul de pornire și pune focus pe el */
  requestAnalyze(): void;
}

export interface AnalysisState {
  documentId: string;
  today: string;
  defaultDate: string;
  latest: LatestAnalysis | null;
  shown: ShownAnalysis | null;
  /** jobul ultimei analize rulează (sau așteaptă în coadă) */
  running: boolean;
  /** rulează o reverificare sau o reluare peste analiza afișată */
  runningOverShown: boolean;
  stream: JobStreamState;
  /** constatările afișate (live în timpul rulării), fără cele ignorate */
  findings: Finding[];
  /** constatările ignorate (grupul „Ignorate (n)”); nu apar în altă parte */
  ignoredFindings: Finding[];
  /** constatări vechi din paragrafele aflate în reverificare */
  pending: ReadonlySet<string>;
  /** „aplicata” / „ignorata” pe id de constatare (inclusiv constatările live ignorate după semnătură) */
  actions: Readonly<Record<string, FindingActionKind>>;
  /** constatare → indicele variantei de sugestie aplicate */
  appliedSuggestion: Readonly<Record<string, number>>;
  /** numărul pe stări, fără constatările ignorate */
  counts: StatusCounts;
  hasAnalysis: boolean;
  /** analiza afișată e pentru altă versiune decât cea curentă */
  outdated: boolean;
  /** paragrafele modificate față de versiunea analizată */
  changedSegIds: string[];
  /** poziția fiecărui paragraf în document (pentru sortare și „§ 12”) */
  segOrder: ReadonlyMap<string, number>;
  /** locul fiecărui paragraf: „Art. 4” (articolul din document) sau „§ 12” */
  locators: ReadonlyMap<string, string>;
  /** textul fiecărui paragraf (contextul diff-ului corecturilor) */
  segTexts: ReadonlyMap<string, string>;
  needsSave: boolean;

  /** grupul „Corecte” e deschis: trimiterile corecte sunt subliniate și în document */
  showCorrect: boolean;
  setShowCorrect(v: boolean): void;
  selectedId: string | null;
  select(id: string | null, opts?: { focus?: boolean }): void;
  startOpen: boolean;
  setStartOpen(v: boolean): void;
  runningTab: RunningTab;
  setRunningTab(t: RunningTab): void;
  /** crește la fiecare „Analizează” din antet */
  analyzeTick: number;
  /** true o singură dată după „Analizează”: formularul de pornire își ia focusul */
  consumeFocusRequest(): boolean;
  busy: "start" | "cancel" | null;
  applyErrors: Readonly<Record<string, string>>;

  start(dataReferinta: string): Promise<boolean>;
  recheck(): Promise<boolean>;
  resume(): Promise<boolean>;
  restart(): Promise<boolean>;
  cancel(): Promise<void>;
  /**
   * Aplică varianta `index` (implicit prima) din `f.sugestii` direct în text (o editare obișnuită,
   * anulabilă și cu Cmd+Z); varianta „Păstrează textul” doar rezolvă constatarea. Întoarce false
   * dacă textul nu mai e în document. `onUndo` rulează după „Anulează” din toast.
   */
  apply(f: Finding, index?: number, opts?: UndoOptions): boolean;
  /** „Am verificat”: rezolvată, fără modificare în document */
  verify(f: Finding, opts?: UndoOptions): void;
  ignore(f: Finding, opts?: UndoOptions): void;
  /** „Restaurează”: constatarea ignorată revine în listă (ignorarea se șterge) */
  restore(f: Finding): void;
  /** anulează acțiunea constatării (aplicare, verificare sau ignorare); readuce textul original */
  undo(f: Finding): void;
}

export interface UndoOptions {
  onUndo?: () => void;
}

const AnalysisContext = createContext<AnalysisState | null>(null);

export function useAnalysis(): AnalysisState {
  const v = useContext(AnalysisContext);
  if (!v) throw new Error("useAnalysis() trebuie folosit în AnalysisProvider.");
  return v;
}

export function useAnalysisOptional(): AnalysisState | null {
  return useContext(AnalysisContext);
}

const EMPTY: AnalysisSnapshot = { latest: null, shown: null, ignored: [] };

function endMessage(snapshot: AnalysisSnapshot): string {
  const c = countByStatus(partitionIgnored(snapshot.shown?.result.findings ?? [], new Set(snapshot.ignored)).visible);
  const parts = [
    c.eroare_citare && `${c.eroare_citare} ${c.eroare_citare === 1 ? "greșeală de citare" : "greșeli de citare"}`,
    c.interpretare_discutabila && `${c.interpretare_discutabila} ${c.interpretare_discutabila === 1 ? "interpretare discutabilă" : "interpretări discutabile"}`,
    c.necesita_analiza_umana && `${c.necesita_analiza_umana} de analizat de un jurist`,
  ].filter(Boolean);
  return parts.length ? `Analiza s-a încheiat: ${parts.join(", ")}.` : "Analiza s-a încheiat fără probleme găsite.";
}

interface ProviderProps {
  documentId: string;
  bridge: EditorBridge;
  bootstrap?: AnalysisBootstrap;
  currentVersionId: string | null;
  /** ciorna diferă de ultima versiune sau nu există încă o versiune */
  needsSave: boolean;
  /** se schimbă la fiecare salvare (recalculează paragrafele modificate) */
  revision: number | null;
  saveVersion: (note: string) => Promise<boolean>;
  openPanel: () => void;
  onAvailabilityChange?: (hasAnalysis: boolean) => void;
  handleRef?: Ref<AnalysisHandle>;
  children: ReactNode;
}

export function AnalysisProvider(p: ProviderProps) {
  const { documentId, bridge, currentVersionId, needsSave, revision, saveVersion, openPanel, onAvailabilityChange } = p;
  const [snapshot, setSnapshotState] = useState<AnalysisSnapshot>(p.bootstrap?.snapshot ?? EMPTY);
  const today = p.bootstrap?.today ?? "";
  const defaultDate = p.bootstrap?.defaultDate ?? today;

  const setSnapshot = useCallback(
    (next: AnalysisSnapshot | ((s: AnalysisSnapshot) => AnalysisSnapshot)) => {
      setSnapshotState((prev) => {
        const s = typeof next === "function" ? next(prev) : next;
        if (Boolean(s.shown) !== Boolean(prev.shown)) queueMicrotask(() => onAvailabilityChange?.(Boolean(s.shown)));
        return s;
      });
    },
    [onAvailabilityChange],
  );

  const [showCorrect, setShowCorrect] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startOpen, setStartOpen] = useState(false);
  const [runningTab, setRunningTab] = useState<RunningTab>("progres");
  const [analyzeTick, setAnalyzeTick] = useState(0);
  const [busy, setBusy] = useState<"start" | "cancel" | null>(null);
  const [applyErrors, setApplyErrors] = useState<Record<string, string>>({});
  const focusRequest = useRef(false);
  const consumeFocusRequest = useCallback(() => {
    const pending = focusRequest.current;
    focusRequest.current = false;
    return pending;
  }, []);

  const { latest, shown } = snapshot;
  const running = latest?.status === "in_curs";
  const runningOverShown = Boolean(running && latest?.baseAnalysisId && shown && shown.id === latest.baseAnalysisId);

  // ───────────── reîncărcare și fluxul live ─────────────
  const reload = useCallback(
    async (end?: JobEnd) => {
      const res = await loadAnalysisAction(documentId);
      setBusy((b) => (b === "cancel" ? null : b));
      if (!res.ok) {
        toast.error("Nu am putut încărca analiza.", { description: res.error });
        return;
      }
      setSnapshot(res.data);
      if (!end) return;
      if (end.status === "finalizat") toast.success(endMessage(res.data), { action: { label: "Deschide", onClick: openPanel } });
      else if (end.status === "anulat") toast("Analiza a fost oprită. Constatările găsite până acum rămân.");
      else toast.error("Analiza nu a putut continua.", { description: end.eroare ?? undefined });
    },
    [documentId, openPanel, setSnapshot],
  );

  const stream = useJobEvents(running ? (latest?.job?.id ?? null) : null, {
    onEnd: (end) => void reload(end),
    // jobul era în coadă la încărcare: când pornește, reîncărcăm o dată (ora pornirii pentru cronometru)
    onStart: () => {
      if (latest?.job?.status === "in_asteptare") void reload();
    },
  });

  // ───────────── constatările afișate ─────────────
  const { findings: allFindings, pending } = useMemo(() => {
    if (running && runningOverShown && shown) return mergeLive(shown.result.findings, stream.findings, latest?.recheckSegIds ?? null);
    if (running) return { findings: stream.findings, pending: new Set<string>() };
    return { findings: shown?.result.findings ?? [], pending: new Set<string>() };
  }, [running, runningOverShown, shown, stream.findings, latest?.recheckSegIds]);

  // ignorările sunt pe semnătură: se aplică și constatărilor live, cu id-uri noi
  const ignoredSignatures = useMemo(() => new Set(snapshot.ignored ?? []), [snapshot.ignored]);
  const actions = useMemo(() => withIgnoredActions(allFindings, shown?.actions ?? {}, ignoredSignatures), [allFindings, shown, ignoredSignatures]);
  const appliedSuggestion = useMemo(() => shown?.appliedSuggestion ?? {}, [shown]);
  const { findings, ignoredFindings } = useMemo(() => {
    const visible: Finding[] = [];
    const hidden: Finding[] = [];
    for (const f of allFindings) (actions[f.id] === "ignorata" ? hidden : visible).push(f);
    return { findings: visible, ignoredFindings: hidden };
  }, [allFindings, actions]);
  const counts = useMemo(() => countByStatus(findings), [findings]);

  // poziția, locul și textul paragrafelor și paragrafele modificate: se recalculează la fiecare salvare
  const { segOrder, locators, segTexts } = useMemo(() => {
    void revision;
    const segments = bridge.getSegments();
    return {
      segOrder: new Map(segments.map((s, i) => [s.segId, i])),
      locators: documentLocators(segments),
      segTexts: new Map(segments.map((s) => [s.segId, s.text])),
    };
  }, [bridge, revision]);
  const analyzedContent = shown?.versionContent ?? null;
  const changedSegIds = useMemo(() => {
    void revision;
    return analyzedContent ? bridge.changedSegIdsSince(analyzedContent) : [];
  }, [bridge, analyzedContent, revision]);

  // ───────────── evidențierile din document ─────────────
  const items = useMemo(() => highlightItems(findings, { showCorrect, actions }), [findings, showCorrect, actions]);
  const lastSignature = useRef<string | null>(null);
  useEffect(() => {
    const sig = `${currentVersionId}\n${highlightsSignature(items)}`;
    if (sig === lastSignature.current) return;
    lastSignature.current = sig;
    bridge.setHighlights(items);
  }, [bridge, items, currentVersionId]);
  useEffect(
    () => () => {
      lastSignature.current = null;
      bridge.setHighlights([]);
    },
    [bridge],
  );

  // trimiterile corecte sunt subliniate doar la cerere (clasa din globals.css)
  useEffect(() => {
    document.body.classList.toggle("lex-show-corect", showCorrect);
    return () => document.body.classList.remove("lex-show-corect");
  }, [showCorrect]);

  const onHighlightClick = useEffectEvent((highlightId: string) => {
    const id = findingIdOf(highlightId);
    setSelectedId(id);
    setRunningTab("constatari");
    bridge.focusHighlight(highlightId);
    // după clic: pe ecran îngust panoul e un Sheet, iar clicul care l-ar deschide l-ar închide imediat
    setTimeout(openPanel, 0);
  });
  useEffect(() => bridge.onHighlightClick((id) => onHighlightClick(id)), [bridge]);

  // nicio constatare selectată (Esc, închidere, ignorare): toate evidențierile revin la 100 %
  useEffect(() => {
    if (selectedId === null) bridge.focusHighlight(null);
  }, [bridge, selectedId]);

  const select = useCallback(
    (id: string | null, opts: { focus?: boolean } = {}) => {
      setSelectedId(id);
      if (id && opts.focus !== false) bridge.focusHighlight(id);
    },
    [bridge],
  );

  // ───────────── comenzi ─────────────
  const run = async (dataReferinta: string, extra: { versionId?: string; recheckSegIds?: string[]; baseAnalysisId?: string } = {}): Promise<boolean> => {
    if (busy) return false;
    setBusy("start");
    try {
      // analiza rulează pe versiunea salvată: ciorna devine întâi versiune, ca rezultatul să corespundă textului văzut
      if (!extra.versionId && needsSave) {
        const ok = await saveVersion(extra.recheckSegIds ? "Salvată pentru reverificare" : "Salvată pentru analiză");
        if (!ok) return false;
      }
      const res = await startAnalysisAction({ documentId, dataReferinta, ...extra });
      if (!res.ok) {
        toast.error("Analiza nu a putut porni.", { description: res.error });
        return false;
      }
      setSnapshot(res.data);
      setStartOpen(false);
      setRunningTab(extra.recheckSegIds ? "constatari" : "progres");
      setApplyErrors({});
      return true;
    } finally {
      setBusy((b) => (b === "start" ? null : b));
    }
  };

  const start = (dataReferinta: string) => run(dataReferinta);
  const recheck = async () => (shown && changedSegIds.length ? run(shown.dataReferinta, { recheckSegIds: changedSegIds, baseAnalysisId: shown.id }) : false);
  /** „Reia de unde a rămas”: de la rezultatul parțial, pe aceeași versiune; fără rezultat, de la zero */
  const resume = async () => {
    if (!latest) return false;
    if (latest.hasResult) return run(latest.dataReferinta, { versionId: latest.versionId, baseAnalysisId: latest.id });
    return run(latest.dataReferinta);
  };
  const restart = async () => (latest ? run(latest.dataReferinta) : false);

  const cancel = async () => {
    const jobId = latest?.job?.id;
    if (!jobId || busy) return;
    setBusy("cancel");
    const res = await cancelAnalysisAction(jobId);
    if (!res.ok) {
      setBusy(null);
      toast.error("Nu am putut opri analiza.", { description: res.error });
    }
    // fluxul se încheie cu `sfarsit`, apoi `reload` readuce starea
  };

  // o singură notificare activă: cea nouă o înlocuiește pe cea veche (08b, 4.8)
  const lastToast = useRef<string | null>(null);
  const notify = (title: string, undo?: () => void) => {
    if (lastToast.current) toast.dismiss(lastToast.current);
    lastToast.current = toast(title, { timeout: 6000, action: undo ? { label: "Anulează", onClick: undo } : undefined });
  };

  const setAction = (findingId: string, action: FindingActionKind | null, suggestionIndex = 0) => {
    if (!shown) return;
    const analysisId = shown.id;
    const patch = (s: AnalysisSnapshot, a: FindingActionKind | null | undefined, index: number | undefined): AnalysisSnapshot => {
      if (!s.shown || s.shown.id !== analysisId) return s;
      const next = { ...s.shown.actions };
      const applied = { ...s.shown.appliedSuggestion };
      if (a) next[findingId] = a;
      else delete next[findingId];
      if (a === "aplicata" && index !== undefined) applied[findingId] = index;
      else delete applied[findingId];
      return { ...s, shown: { ...s.shown, actions: next, appliedSuggestion: applied } };
    };
    const previous = shown.actions[findingId];
    const previousIndex = shown.appliedSuggestion?.[findingId];
    setSnapshot((s) => patch(s, action, suggestionIndex));
    void recordFindingAction(analysisId, findingId, action, { suggestionIndex }).then((res) => {
      if (res.ok) return;
      setSnapshot((s) => patch(s, previous, previousIndex));
      toast.error("Nu am putut salva alegerea.", { description: res.error });
    });
  };

  const clearApplyError = (id: string) =>
    setApplyErrors((e) => {
      if (!(id in e)) return e;
      const next = { ...e };
      delete next[id];
      return next;
    });

  // înlocuirile aplicate în această sesiune (contextul lor, pentru „Anulează”)
  const edits = useRef(new Map<string, AppliedReplacement>());

  /** Readuce textul original al corecturii aplicate; false dacă pasajul a fost modificat între timp. */
  const revertApplied = (f: Finding): boolean => {
    const s = suggestionAt(f, appliedSuggestion[f.id] ?? 0);
    if (s && variantKind(s) === "pastrare") return true;
    const known = edits.current.get(f.id);
    const candidates: AppliedReplacement[] = known
      ? [known]
      : s
        ? f.anchors.map((a) => ({ segId: a.segmentId, original: s.textOriginal, replacement: s.textPropus, before: "", after: "" }))
        : [];
    for (const e of candidates) {
      if (bridge.revertReplacement(e)) {
        edits.current.delete(f.id);
        return true;
      }
    }
    return false;
  };

  const apply = (f: Finding, index = 0, opts: UndoOptions = {}): boolean => {
    const s = suggestionAt(f, index);
    if (!s || !shown) return false;
    if (variantKind(s) === "pastrare") {
      clearApplyError(f.id);
      setAction(f.id, "aplicata", index);
      notify("Constatare rezolvată; textul rămâne neschimbat.", () => {
        setAction(f.id, null);
        opts.onUndo?.();
      });
      return true;
    }
    let edit: AppliedReplacement | null = null;
    for (const a of f.anchors) {
      edit = bridge.applyReplacement({ segId: a.segmentId, original: s.textOriginal, replacement: s.textPropus });
      if (edit) break;
    }
    if (!edit) {
      const inBody = f.anchors.some((a) => segTexts.has(a.segmentId));
      const message = inBody ? "Textul din document nu mai corespunde. Reverifică paragraful." : "Pasajul nu e în textul editabil (de exemplu, e într-o notă de subsol); modifică-l manual.";
      setApplyErrors((e) => ({ ...e, [f.id]: message }));
      return false;
    }
    edits.current.set(f.id, edit);
    clearApplyError(f.id);
    setAction(f.id, "aplicata", index);
    notify("Corectură aplicată în document.", () => {
      if (!revertApplied(f)) {
        toast.error("Nu am putut readuce textul original.", { description: "Pasajul a fost modificat între timp; folosește Cmd+Z în document." });
        return;
      }
      setAction(f.id, null);
      opts.onUndo?.();
    });
    return true;
  };

  const verify = (f: Finding, opts: UndoOptions = {}) => {
    if (!shown) return;
    setAction(f.id, "verificata");
    notify("Marcată ca verificată.", () => {
      setAction(f.id, null);
      opts.onUndo?.();
    });
  };

  /** Ignorarea se salvează pe semnătură; până răspunde serverul, semnătura e adăugată local. */
  const setIgnored = (f: Finding, ignored: boolean) => {
    const analysisId = shown?.id ?? latest?.id;
    if (!analysisId) return;
    const sig = findingSignature(f);
    const patch = (s: AnalysisSnapshot, on: boolean): AnalysisSnapshot => {
      const has = s.ignored.includes(sig);
      if (on === has) return s;
      return { ...s, ignored: on ? [...s.ignored, sig] : s.ignored.filter((x) => x !== sig) };
    };
    setSnapshot((s) => patch(s, ignored));
    const input = { analysisId, findingId: f.id, citat: f.citat, categorie: f.categorie ?? null };
    void (ignored ? ignoreFinding(input) : restoreFinding(input)).then((res) => {
      if (res.ok) return;
      setSnapshot((s) => patch(s, !ignored));
      toast.error("Nu am putut salva alegerea.", { description: res.error });
    });
  };

  const ignore = (f: Finding, opts: UndoOptions = {}) => {
    setSelectedId((cur) => (cur === f.id ? null : cur));
    setIgnored(f, true);
    notify("Constatare ignorată.", () => {
      setIgnored(f, false);
      opts.onUndo?.();
    });
  };

  const restore = (f: Finding) => {
    setIgnored(f, false);
    notify("Constatare restaurată.");
  };

  const undo = (f: Finding) => {
    const action = actions[f.id];
    if (action === "ignorata") return restore(f);
    if (action === "aplicata" && !revertApplied(f)) {
      toast.error("Nu am putut readuce textul original.", { description: "Pasajul a fost modificat între timp; constatarea rămâne rezolvată." });
      return;
    }
    setAction(f.id, null);
  };

  useImperativeHandle(
    p.handleRef,
    () => ({
      requestAnalyze() {
        openPanel();
        if (!running) {
          setStartOpen(true);
          focusRequest.current = true;
        }
        setAnalyzeTick((t) => t + 1);
      },
    }),
    [openPanel, running],
  );

  const value: AnalysisState = {
    documentId,
    today,
    defaultDate,
    latest,
    shown,
    running,
    runningOverShown,
    stream,
    findings,
    ignoredFindings,
    pending,
    actions,
    appliedSuggestion,
    counts,
    hasAnalysis: Boolean(shown),
    outdated: Boolean(shown && currentVersionId && shown.versionId !== currentVersionId),
    changedSegIds,
    segOrder,
    locators,
    segTexts,
    needsSave,
    showCorrect,
    setShowCorrect,
    selectedId,
    select,
    startOpen,
    setStartOpen,
    runningTab,
    setRunningTab,
    analyzeTick,
    consumeFocusRequest,
    busy,
    applyErrors,
    start,
    recheck,
    resume,
    restart,
    cancel,
    apply,
    verify,
    ignore,
    restore,
    undo,
  };

  return <AnalysisContext.Provider value={value}>{p.children}</AnalysisContext.Provider>;
}
