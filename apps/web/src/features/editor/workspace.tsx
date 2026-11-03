"use client";

import type { JSONContent } from "@lexai/docx";
import { IconAlertTriangle } from "@tabler/icons-react";
import { TextSelection } from "@tiptap/pm/state";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDefaultLayout, usePanelRef } from "react-resizable-panels";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { AnalysisProvider, type AnalysisHandle } from "@/features/analysis/context";
import { AnalysisStatusPill } from "@/features/analysis/status-pill";
import { ChatProvider, type ChatHandle } from "@/features/chat/context";
import { matchesHotkey } from "@/lib/hotkey";
import { cn } from "@/lib/utils";
import { useDraftingSession } from "@/features/drafting/use-drafting-session";
import {
  editVersionNoteAction,
  getVersionContentAction,
  loadWorkingAction,
  renameDocumentAction,
  restoreVersionAction,
  saveVersionAction,
  type VersionSummary,
} from "./actions";
import { EditorBridgeContext, createEditorBridge } from "./bridge";
import { buildDiffDocument } from "./diff";
import { ExportDialog, runExport } from "./export/export-dialog";
import { exportFileName } from "./export/filename";
import { printUrl, type ExportContext, type ExportFormat } from "./export/formats";
import { printPdf } from "./export/print";
import { FindBar } from "./find-bar";
import { dateTimeShort } from "./fmt";
import { EditorHeader } from "./header";
import { DRAFT } from "./history/history-panel";
import { ChangeNav, CompareBand, LARGE_DIFF, PreviewBanner, VersionSheet, scrollToChange, type ViewMode } from "./history/version-view";
import { readLocal, useElementSize, useMediaQuery, writeLocal } from "./hooks";
import { PANEL_LAYOUT_ID, SIDE_DEFAULT_PX, SIDE_MAX_PX, SIDE_MIN_PX, layoutStorage } from "./panel/layout";
import { SidePanel } from "./panel/side-panel";
import { findPlaceholders, requestPlaceholder } from "./schema/placeholder";
import { acceptSuggestion, findSuggestionRanges, listSuggestions, rejectSuggestion } from "./schema/suggestions";
import { A4Sheet, MM_PX, pageSizeMm } from "./sheet";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { StatusBar, docStats, type ZoomSetting } from "./status-bar";
import { SuggestionPopover, type HoveredSuggestion } from "./suggestion-popover";
import { EditorContextItems, TableBar } from "./table-bar";
import { Toolbar } from "./toolbar/toolbar";
import { firstFont } from "./toolbar/shared";
import type { PanelTab, WorkspaceProps } from "./types";
import { NO_SAVE_META, useAutosave } from "./use-autosave";
import { usePagination } from "./pagination/use-pagination";
import { LexEditorContent, useLexEditor } from "./use-lex-editor";

const ZOOM_KEY = "lexai:editor:zoom";

function fontsIn(content: JSONContent): string[] {
  const out = new Set<string>();
  const walk = (n: JSONContent) => {
    for (const m of n.marks ?? []) if (m.type === "textStyle" && m.attrs?.fontFamily) out.add(firstFont(m.attrs.fontFamily));
    n.content?.forEach(walk);
  };
  walk(content);
  return [...out].filter(Boolean);
}

/** Spațiul de lucru al editorului: antet, bară, foaia A4, panoul lateral, bara de stare. */
export function EditorWorkspace(props: WorkspaceProps) {
  const { document: initialDoc, project, meta } = props;
  const documentId = initialDoc.id;
  const editor = useLexEditor(props.content, meta);
  const [readOnly, setReadOnly] = useState(false);
  const bridge = useMemo(() => createEditorBridge(editor, { onReadOnlyChange: setReadOnly }), [editor]);
  const docFonts = useMemo(() => fontsIn(props.content), [props.content]);

  const [title, setTitle] = useState(initialDoc.title);
  const [versions, setVersions] = useState<VersionSummary[]>(props.versions);
  const [currentVersionId, setCurrentVersionId] = useState(initialDoc.currentVersionId);
  const [conflict, setConflict] = useState(false);
  const autosave = useAutosave(editor, {
    documentId,
    token: { currentVersionId: initialDoc.currentVersionId, draftUpdatedAt: initialDoc.draftUpdatedAt },
    savedAt: props.fromDraft ? initialDoc.draftUpdatedAt : (props.versions[0]?.createdAt ?? null),
    hasDraft: props.fromDraft,
    onConflict: () => setConflict(true),
  });
  const save = autosave.state;
  const draftDiffers = save.hasDraft || save.status !== "saved";

  // ───────────── layout ─────────────
  const wide = useMediaQuery("(min-width: 1280px)");
  const tablet = useMediaQuery("(min-width: 768px)");
  const panelRef = usePanelRef();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({ id: PANEL_LAYOUT_ID, panelIds: ["main", "side"], storage: layoutStorage });
  const [panelTab, setPanelTab] = useState<PanelTab>(initialDoc.kind === "generat" ? "temeiuri" : "constatari");
  const [panelOpen, setPanelOpen] = useState(() => !defaultLayout || (defaultLayout.side ?? 1) > 0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openPanel = useCallback(
    (tab?: PanelTab) => {
      if (tab) setPanelTab(tab);
      if (wide) {
        panelRef.current?.expand();
        setPanelOpen(true);
      } else setSheetOpen(true);
    },
    [wide, panelRef],
  );
  const closePanel = useCallback(() => {
    if (wide) {
      panelRef.current?.collapse();
      setPanelOpen(false);
    } else setSheetOpen(false);
  }, [wide, panelRef]);
  const togglePanel = () => ((wide ? panelOpen : sheetOpen) ? closePanel() : openPanel());

  // ───────────── zoom ─────────────
  const [zoom, setZoomState] = useState<ZoomSetting>(() => {
    const v = readLocal(ZOOM_KEY);
    return v === "fit" ? "fit" : Number(v) > 0 ? Number(v) : 1;
  });
  const setZoom = (z: ZoomSetting) => {
    setZoomState(z);
    writeLocal(ZOOM_KEY, String(z));
  };
  const [deskRef, deskSize] = useElementSize<HTMLDivElement>();
  const page = pageSizeMm(meta);
  const fit = deskSize.width ? Math.max(0.3, (deskSize.width - 32) / (page.width * MM_PX)) : 1;
  const effectiveZoom = zoom === "fit" ? fit : zoom === 1 ? Math.min(1, fit) : zoom;
  const pagination = usePagination(editor);
  const contentWidthPx = (page.width - meta.page.marginsMm.left - meta.page.marginsMm.right) * MM_PX;

  // ───────────── vizualizarea versiunilor ─────────────
  const [viewMode, setViewMode] = useState<ViewMode>({ kind: "edit" });
  const versionCache = useRef(new Map<string, JSONContent>());
  const compareRef = useRef<HTMLDivElement | null>(null);

  const loadContent = useCallback(
    async (id: string): Promise<JSONContent> => {
      if (id === DRAFT) return editor.getJSON() as JSONContent;
      const hit = versionCache.current.get(id);
      if (hit) return hit;
      const res = await getVersionContentAction(documentId, id);
      if (!res.ok) throw new Error(res.error);
      const content = res.data.content as JSONContent;
      versionCache.current.set(id, content);
      return content;
    },
    [documentId, editor],
  );

  const openVersion = useCallback(
    (versionId: string) => {
      setViewMode({ kind: "preview", versionId, content: null });
      if (!wide) setSheetOpen(false);
      loadContent(versionId).then(
        (content) => setViewMode((m) => (m.kind === "preview" && m.versionId === versionId ? { ...m, content } : m)),
        (e: unknown) => setViewMode((m) => (m.kind === "preview" && m.versionId === versionId ? { ...m, error: e instanceof Error ? e.message : "Eroare" } : m)),
      );
    },
    [loadContent, wide],
  );

  const compare = useCallback(
    (left: string, right: string, onlyChanged?: boolean) => {
      setViewMode({ kind: "compare", left, right, result: null, onlyChanged: Boolean(onlyChanged), large: false });
      if (!wide) setSheetOpen(false);
      Promise.all([loadContent(left), loadContent(right)]).then(
        ([a, b]) => {
          let result = buildDiffDocument(a, b, { onlyChanged: Boolean(onlyChanged) });
          let large = false;
          if (result.changes > LARGE_DIFF) {
            large = true;
            if (onlyChanged === undefined) {
              onlyChanged = true;
              result = buildDiffDocument(a, b, { onlyChanged: true });
            }
          }
          setViewMode((m) => (m.kind === "compare" && m.left === left && m.right === right ? { ...m, result, large, onlyChanged: Boolean(onlyChanged) } : m));
        },
        () => setViewMode((m) => (m.kind === "compare" && m.left === left && m.right === right ? { ...m, error: "Nu am putut compara aceste versiuni." } : m)),
      );
    },
    [loadContent, wide],
  );

  const closeView = useCallback(() => {
    setViewMode({ kind: "edit" });
    requestAnimationFrame(() => editor.commands.focus());
  }, [editor]);

  // ───────────── salvare și restaurare ─────────────
  const [saveOpen, setSaveOpen] = useState(false);

  const saveVersion = useCallback(
    async (note: string): Promise<boolean> => {
      await autosave.flush();
      const auto = autosave.versionOrigin();
      const res = await saveVersionAction(documentId, JSON.stringify(editor.getJSON()), { note: note.trim() || auto.note, origin: auto.origin, expected: autosave.getToken() });
      if (!res.ok) {
        if (res.conflict) setConflict(true);
        else toast.error("Nu am putut salva versiunea.", { description: res.error });
        return false;
      }
      autosave.markClean(res.data.token, { savedAt: res.data.version.createdAt });
      setVersions(res.data.versions);
      setCurrentVersionId(res.data.token.currentVersionId);
      toast.success("Versiunea a fost salvată", { action: { label: "Vezi în istoric", onClick: () => openPanel("istoric") } });
      return true;
    },
    [autosave, documentId, editor, openPanel],
  );

  const replaceEditorContent = useCallback(
    (content: unknown) => {
      editor
        .chain()
        .command(({ tr }) => {
          tr.setMeta("addToHistory", false).setMeta(NO_SAVE_META, true);
          return true;
        })
        .setContent(content as JSONContent, { emitUpdate: false })
        .run();
    },
    [editor],
  );

  /** Conținutul de lucru de pe server (ex. proiectul generat) înlocuiește foaia, fără salvare automată. */
  const reloadWorking = async (): Promise<boolean> => {
    const res = await loadWorkingAction(documentId);
    if (!res.ok) {
      toast.error("Nu am putut încărca documentul.", { description: res.error });
      return false;
    }
    replaceEditorContent(res.data.content);
    autosave.markClean(res.data.token, { savedAt: res.data.token.draftUpdatedAt ?? res.data.versions[0]?.createdAt, hasDraft: res.data.token.draftUpdatedAt !== null });
    setVersions(res.data.versions);
    setCurrentVersionId(res.data.token.currentVersionId);
    return true;
  };
  const drafting = useDraftingSession({ documentId, enabled: initialDoc.kind === "generat", bridge, editor, onReload: reloadWorking });

  const [restoreTarget, setRestoreTarget] = useState<VersionSummary | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function restore(versionId: string, opts: { undo?: boolean } = {}): Promise<boolean> {
    const target = versions.find((v) => v.id === versionId);
    await autosave.flush();
    const draft = autosave.state.hasDraft || autosave.isDirty() ? JSON.stringify(editor.getJSON()) : null;
    const res = await restoreVersionAction(documentId, versionId, draft);
    if (!res.ok) {
      toast.error("Nu am putut restaura versiunea. Documentul a rămas neschimbat.", { description: res.error });
      return false;
    }
    replaceEditorContent(res.data.content);
    autosave.markClean(res.data.token, { savedAt: res.data.version.createdAt });
    setVersions(res.data.versions);
    setCurrentVersionId(res.data.token.currentVersionId);
    setViewMode({ kind: "edit" });
    const undoId = res.data.undoVersionId;
    if (!opts.undo) {
      toast.success(target ? `Am restaurat versiunea din ${dateTimeShort(target.createdAt)}.` : "Versiunea a fost restaurată.", {
        action: undoId ? { label: "Anulează", onClick: () => void restore(undoId, { undo: true }) } : undefined,
      });
    } else toast.success("Restaurarea a fost anulată.");
    return true;
  }

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    setRestoring(true);
    const ok = await restore(restoreTarget.id);
    setRestoring(false);
    if (ok) setRestoreTarget(null);
  };

  const askRestore = (versionId: string) => setRestoreTarget(versions.find((v) => v.id === versionId) ?? null);

  const resolveConflict = async (keepMine: boolean) => {
    if (keepMine) {
      const res = await saveVersionAction(documentId, JSON.stringify(editor.getJSON()), { note: "Păstrată după un conflict de salvare", origin: "manual", force: true });
      if (!res.ok) return toast.error("Nu am putut salva versiunea.", { description: res.error });
      autosave.markClean(res.data.token, { savedAt: res.data.version.createdAt });
      setVersions(res.data.versions);
      setCurrentVersionId(res.data.token.currentVersionId);
    } else if (!(await reloadWorking())) return;
    setConflict(false);
  };

  const rename = async (t: string) => {
    const res = await renameDocumentAction(documentId, t);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    setTitle(res.data.title);
    return true;
  };

  const editNote = async (versionId: string, note: string) => {
    const res = await editVersionNoteAction(documentId, versionId, note);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    setVersions(res.data.versions);
    return true;
  };

  // ───────────── export ─────────────
  const [exportOpen, setExportOpen] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(() => Boolean(props.analysis?.snapshot.shown));
  const exportCtx: ExportContext = { documentId, kind: initialDoc.kind, hasAnalysis };
  const currentNumber = versions.find((v) => v.id === currentVersionId)?.number ?? null;
  const quickExport = (format: ExportFormat) =>
    void runExport(format, exportCtx, { versionId: null, fileName: exportFileName(title, currentNumber, draftDiffers, "x").replace(/\.x$/, ""), keepHighlights: false }, autosave.flush);
  // „Printează…” / ⌘P: PDF-ul conținutului de lucru, nu pagina aplicației
  const print = () => void printPdf(printUrl(exportCtx), autosave.flush);
  // „Salvează” / ⌘S: o versiune nouă, doar dacă s-a schimbat ceva de la ultima
  const needsSave = draftDiffers || !currentVersionId;
  const saveNow = () => {
    if (!readOnly && needsSave) void saveVersion("");
  };

  // ───────────── câmpuri și sugestii ─────────────
  const nextPlaceholder = useCallback(
    (dir: 1 | -1 = 1) => {
      const list = findPlaceholders(editor.state.doc);
      if (!list.length) return;
      const at = editor.state.selection.from;
      const idx = dir > 0 ? list.findIndex((p) => p.from > at) : list.map((p) => p.to < at).lastIndexOf(true);
      bridge.focusPlaceholder(idx >= 0 ? idx : dir > 0 ? 0 : list.length - 1);
    },
    [bridge, editor],
  );

  const selectSuggestion = useCallback(
    (id: string) => {
      const ranges = findSuggestionRanges(editor.state.doc, id);
      if (!ranges.length) return;
      const from = ranges[0].from;
      const to = ranges[ranges.length - 1].to;
      editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to)).scrollIntoView());
      editor.view.focus();
    },
    [editor],
  );

  const nextSuggestion = useCallback(
    (dir: 1 | -1 = 1) => {
      const list = listSuggestions(editor.state.doc);
      if (!list.length) return;
      const at = editor.state.selection.from;
      const idx = dir > 0 ? list.findIndex((s) => s.from > at) : list.map((s) => s.from < at).lastIndexOf(true);
      selectSuggestion(list[idx >= 0 ? idx : dir > 0 ? 0 : list.length - 1].id);
    },
    [editor, selectSuggestion],
  );

  /** Sugestia de sub cursor sau următoarea. */
  const currentSuggestionId = useCallback((): string | null => {
    const { from, to } = editor.state.selection;
    const ranges = findSuggestionRanges(editor.state.doc);
    const inside = ranges.find((r) => r.from <= to && r.to >= from);
    return (inside ?? ranges.find((r) => r.from >= from) ?? ranges[0])?.id ?? null;
  }, [editor]);

  const [hovered, setHovered] = useState<HoveredSuggestion | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  };
  const leaveHover = () => {
    keepHover();
    hoverTimer.current = setTimeout(() => setHovered(null), 250);
  };
  const onDeskMouseOver = (e: React.MouseEvent) => {
    const el = (e.target as Element).closest?.("[data-suggestion-id]");
    if (!el) return;
    keepHover();
    const id = el.getAttribute("data-suggestion-id");
    if (id && hovered?.id !== id) setHovered({ id, el });
  };
  const onDeskMouseOut = (e: React.MouseEvent) => {
    if ((e.target as Element).closest?.("[data-suggestion-id]")) leaveHover();
  };

  // ───────────── căutare, dialoguri, context ─────────────
  const [find, setFind] = useState<{ replace: boolean; key: number } | null>(null);
  const openFind = (replace: boolean) => setFind((f) => ({ replace, key: (f?.key ?? 0) + 1 }));
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [ctxInTable, setCtxInTable] = useState(false);

  // ───────────── analiză (features/analysis) ─────────────
  const analysisRef = useRef<AnalysisHandle>(null);
  const openAnalysisPanel = useCallback(() => openPanel("constatari"), [openPanel]);
  const analyze = useCallback(() => {
    if (analysisRef.current) analysisRef.current.requestAnalyze();
    else openPanel("constatari");
  }, [openPanel]);

  // ───────────── chat (features/chat) ─────────────
  const chatRef = useRef<ChatHandle>(null);
  const openChat = useCallback(() => {
    openPanel("chat");
    chatRef.current?.requestFocus();
  }, [openPanel]);

  // ───────────── scurtături globale ─────────────
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const is = (k: string) => matchesHotkey(e, k);
      const run = (fn: () => void) => {
        e.preventDefault();
        fn();
      };
      const editing = viewMode.kind === "edit";
      if (is("mod+s")) return run(saveNow);
      if (is("mod+p")) return run(print);
      if (is("mod+shift+e")) return run(() => setExportOpen(true));
      if (is("mod+shift+y")) return run(() => openPanel("istoric"));
      if (is("mod+shift+a")) return run(analyze);
      if (is("mod+.")) return run(togglePanel);
      if (is("mod+j")) return run(openChat);
      if (is("mod+/")) return run(() => setShortcutsOpen(true));
      if (is("mod+f") && editing) return run(() => openFind(false));
      if (is("mod+alt+f") && editing) return run(() => openFind(true));
      if (viewMode.kind === "compare" && (is("mod+alt+]") || is("mod+alt+["))) {
        const dir = is("mod+alt+]") ? "next" : "prev";
        return run(() => document.querySelector<HTMLButtonElement>(`[data-change-nav="${dir}"]`)?.click());
      }
      if (!editing) return;
      if (is("mod+alt+arrowdown")) return run(() => nextPlaceholder(1));
      if (is("mod+alt+arrowup")) return run(() => nextPlaceholder(-1));
      if (is("mod+alt+]")) return run(() => nextSuggestion(1));
      if (is("mod+alt+[")) return run(() => nextSuggestion(-1));
      if (is("mod+alt+y") || is("mod+alt+n")) {
        const id = currentSuggestionId();
        if (id) return run(() => (is("mod+alt+y") ? acceptSuggestion(editor, id) : rejectSuggestion(editor, id)));
      }
    };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ───────────── randare ─────────────
  const preview = viewMode.kind === "preview" ? viewMode : null;
  const comparing = viewMode.kind === "compare" ? viewMode : null;
  const previewVersion = preview ? versions.find((v) => v.id === preview.versionId) : undefined;
  const toolbarDisabled = readOnly || viewMode.kind !== "edit";
  const activeIds = preview ? [preview.versionId] : comparing ? [comparing.left, comparing.right] : [];

  const historyProps = {
    versions,
    currentVersionId,
    draftDiffers,
    activeIds,
    onOpen: openVersion,
    onCompare: (a: string, b: string) => compare(a, b),
    onRestore: askRestore,
    onEditNote: editNote,
    onSaveVersion: () => setSaveOpen(true),
  };

  const sidePanel = (
    <SidePanel
      tab={panelTab}
      onTabChange={setPanelTab}
      kind={initialDoc.kind}
      documentId={documentId}
      versionId={currentVersionId}
      bridge={bridge}
      drafting={drafting}
      history={historyProps}
      onClose={closePanel}
      onLocate={wide ? undefined : () => setSheetOpen(false)}
    />
  );

  const main = (
    <main id="continut" tabIndex={-1} className="flex h-full min-w-0 flex-1 flex-col outline-none">
      <Toolbar
        editor={editor}
        disabled={toolbarDisabled}
        defaultFont={meta.defaults.fontFamily}
        defaultSize={meta.defaults.fontSizePt}
        defaultLineHeight={meta.defaults.lineHeight}
        docFonts={docFonts}
        panelOpen={wide ? panelOpen : sheetOpen}
        onTogglePanel={togglePanel}
        onFind={openFind}
      />

      {preview && (
        <PreviewBanner
          version={previewVersion}
          onCompare={() => compare(preview.versionId, DRAFT)}
          onRestore={() => askRestore(preview.versionId)}
          onClose={closeView}
          restoreDisabled={preview.versionId === currentVersionId && !draftDiffers}
          showBack={!wide}
        />
      )}
      {comparing && (
        <CompareBand
          mode={comparing}
          versions={versions}
          onChange={(l, r) => compare(l, r)}
          onToggleAll={(all) => compare(comparing.left, comparing.right, !all)}
          onRestoreOld={() => comparing.left !== DRAFT && askRestore(comparing.left)}
          onClose={closeView}
        />
      )}
      {save.failures >= 3 && (
        <Alert variant="destructive" appearance="soft" className="rounded-none border-x-0 border-t-0">
          <IconAlertTriangle aria-hidden />
          <AlertTitle>Nu am putut salva ciorna.</AlertTitle>
          <AlertDescription>Modificările sunt păstrate în această filă; nu o închide.</AlertDescription>
        </Alert>
      )}

      <div className={viewMode.kind === "edit" ? "contents" : "hidden"}>
        <div
          ref={deskRef}
          className="lex-desk relative min-h-0 flex-1 overflow-auto bg-desk px-4 py-8"
          onMouseOver={onDeskMouseOver}
          onMouseOut={onDeskMouseOut}
        >
          {find && <FindBar key={find.key} editor={editor} replace={find.replace} onClose={() => setFind(null)} />}
          <ContextMenu disabled={readOnly} onOpenChange={(o) => o && setCtxInTable(editor.isActive("table"))}>
            <ContextMenuTrigger className="block">
              <A4Sheet meta={meta} zoom={effectiveZoom} pages={pagination.pages}>
                <LexEditorContent editor={editor} />
              </A4Sheet>
            </ContextMenuTrigger>
            <ContextMenuContent className="min-w-56">
              <EditorContextItems
                editor={editor}
                inTable={ctxInTable}
                onInsertField={() => requestPlaceholder(editor)}
              />
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </div>
      {viewMode.kind !== "edit" && (
        <VersionSheet
          content={preview ? preview.content : (comparing?.result?.doc ?? null)}
          contentKey={preview ? `p:${preview.versionId}` : `c:${comparing?.left}:${comparing?.right}:${comparing?.onlyChanged}`}
          meta={meta}
          zoom={effectiveZoom}
          diff={Boolean(comparing)}
          loading={preview ? !preview.content && !preview.error : !comparing?.result && !comparing?.error}
          containerRef={compareRef}
          footer={
            comparing?.result && !comparing.result.identical ? (
              <ChangeNav key={`${comparing.left}:${comparing.right}`} total={comparing.result.changes} onGo={(i) => scrollToChange(compareRef.current, i)} />
            ) : null
          }
        >
          {preview?.error && <p className="mb-3 text-center text-sm text-destructive">{preview.error}</p>}
        </VersionSheet>
      )}
      <TableBar editor={editor} contentWidthPx={contentWidthPx} hidden={viewMode.kind !== "edit"} />
      <SuggestionPopover editor={editor} hovered={viewMode.kind === "edit" ? hovered : null} total={hovered ? docStats(editor.state.doc).suggestions : 0} onClose={leaveHover} onKeep={keepHover} />
    </main>
  );

  return (
    <EditorBridgeContext.Provider value={bridge}>
      <AnalysisProvider
        documentId={documentId}
        bridge={bridge}
        bootstrap={props.analysis}
        currentVersionId={currentVersionId}
        needsSave={draftDiffers || !currentVersionId}
        revision={save.savedAt}
        saveVersion={saveVersion}
        openPanel={openAnalysisPanel}
        onAvailabilityChange={setHasAnalysis}
        handleRef={analysisRef}
      >
      <ChatProvider documentId={documentId} bridge={bridge} initial={props.chat ?? []} flush={autosave.flush} handleRef={chatRef}>
      <div className="relative flex h-svh flex-col overflow-hidden">
        <EditorHeader
          project={project}
          title={title}
          onRename={rename}
          save={save}
          saveOpen={saveOpen}
          onSaveOpenChange={setSaveOpen}
          onSaveVersion={saveVersion}
          onRetrySave={() => void autosave.flush()}
          needsSave={needsSave}
          readOnly={readOnly}
          compact={!wide}
          onVersions={() => openPanel("istoric")}
          onAnalyze={analyze}
          analysisStatus={<AnalysisStatusPill onOpen={openAnalysisPanel} compact={!wide} />}
          onExport={() => setExportOpen(true)}
          onQuickExport={quickExport}
          onPrint={print}
          exportCtx={exportCtx}
          onShortcuts={() => setShortcutsOpen(true)}
        />

        <div className="flex min-h-0 flex-1">
          {wide ? (
            <ResizablePanelGroup orientation="horizontal" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>
              <ResizablePanel id="main" minSize={480}>
                {main}
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel
                id="side"
                panelRef={panelRef}
                defaultSize={SIDE_DEFAULT_PX}
                minSize={SIDE_MIN_PX}
                maxSize={SIDE_MAX_PX}
                collapsible
                collapsedSize={0}
                onResize={(size) => setPanelOpen(size.inPixels > 0)}
                className="bg-background"
              >
                {sidePanel}
              </ResizablePanel>
            </ResizablePanelGroup>
          ) : (
            main
          )}
        </div>

        <StatusBar
          editor={editor}
          pages={pagination.pages}
          page={pagination.page}
          zoom={zoom}
          effectiveZoom={effectiveZoom}
          onZoom={setZoom}
          onNextPlaceholder={() => nextPlaceholder(1)}
          onNextSuggestion={() => nextSuggestion(1)}
          compact={!tablet}
        />
      </div>

      {!wide && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side={tablet ? "right" : "bottom"} showCloseButton={false} className={cn("gap-0 p-0", tablet ? "w-[calc(min(30rem,100vw)+var(--bleed))] pe-(--bleed) sm:max-w-[calc(30rem+var(--bleed))]" : "h-[85svh] pb-(--bleed)")}>
            <SheetTitle className="sr-only">Panoul documentului</SheetTitle>
            {sidePanel}
          </SheetContent>
        </Sheet>
      )}

      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        ctx={exportCtx}
        title={title}
        versions={versions}
        currentVersionId={currentVersionId}
        hasDraft={draftDiffers}
        issues={exportOpen ? { placeholders: docStats(editor.state.doc).placeholders, suggestions: docStats(editor.state.doc).suggestions } : { placeholders: 0, suggestions: 0 }}
        onGotoPlaceholder={() => {
          closeView();
          bridge.focusPlaceholder(0);
        }}
        onGotoSuggestion={() => {
          closeView();
          const first = listSuggestions(editor.state.doc)[0];
          if (first) selectSuggestion(first.id);
        }}
        beforeExport={autosave.flush}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      <AlertDialog open={Boolean(restoreTarget)} onOpenChange={(o) => !o && !restoring && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{restoreTarget ? `Restaurezi versiunea din ${dateTimeShort(restoreTarget.createdAt)}?` : "Restaurezi versiunea?"}</AlertDialogTitle>
            <AlertDialogDescription>Documentul va reveni la această versiune. Starea actuală se salvează automat ca versiune nouă, deci o poți recupera oricând.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Renunță</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => (e.preventDefault(), void confirmRestore())} disabled={restoring}>
              {restoring ? "Se restaurează…" : "Restaurează"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={conflict} onOpenChange={() => undefined}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Documentul a fost modificat în altă fereastră</AlertDialogTitle>
            <AlertDialogDescription>Alege ce păstrezi. Dacă păstrezi ce ai aici, textul curent se salvează ca versiune nouă.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => (e.preventDefault(), void resolveConflict(false))}>Încarcă versiunea de acolo</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => (e.preventDefault(), void resolveConflict(true))}>Păstrează ce am aici</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </ChatProvider>
      </AnalysisProvider>
    </EditorBridgeContext.Provider>
  );
}
