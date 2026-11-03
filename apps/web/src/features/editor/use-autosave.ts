"use client";

import type { JSONContent } from "@lexai/docx";
import type { Editor, EditorEvents } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraftAction, type SaveToken } from "./actions";
import { segIdKey } from "./schema/seg-id";
import { SUGGESTION_META, type SuggestionMeta } from "./schema/suggestions";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

export const AUTOSAVE_MS = 1500;
/** meta pe tranzacțiile care nu sunt modificări ale utilizatorului (ex. încărcarea altui conținut) */
export const NO_SAVE_META = "lexaiNoSave";

export interface SaveState {
  status: SaveStatus;
  /** momentul ultimei salvări (ciornă sau versiune) */
  savedAt: number | null;
  savedKind: "draft" | "version";
  failures: number;
  /** există o ciornă care diferă de ultima versiune */
  hasDraft: boolean;
}

interface Options {
  documentId: string;
  token: SaveToken;
  savedAt: number | null;
  hasDraft: boolean;
  onConflict: () => void;
}

/**
 * Salvarea automată a ciornei (1,5 s după ultima modificare), plus evidența modificărilor
 * de la ultima versiune: dacă singurele modificări sunt sugestii AI acceptate, versiunea
 * următoare primește originea `ai_sugestie`.
 */
export function useAutosave(editor: Editor, opts: Options) {
  const { documentId, onConflict } = opts;
  const [state, setState] = useState<SaveState>({
    status: "saved",
    savedAt: opts.savedAt,
    savedKind: opts.hasDraft ? "draft" : "version",
    failures: 0,
    hasDraft: opts.hasDraft,
  });

  const tokenRef = useRef(opts.token);
  const dirtyRef = useRef(false);
  const pausedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Promise<boolean> | null>(null);
  const userEditsRef = useRef(false);
  const acceptedRef = useRef(0);
  const onConflictRef = useRef(onConflict);
  useEffect(() => {
    onConflictRef.current = onConflict;
  }, [onConflict]);

  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  const flush = useCallback(async (): Promise<boolean> => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    if (inflightRef.current) await inflightRef.current;
    if (!dirtyRef.current) return true;
    if (pausedRef.current) return false;
    dirtyRef.current = false;
    setState((s) => ({ ...s, status: "saving" }));
    const run = (async () => {
      try {
        const res = await saveDraftAction(documentId, JSON.stringify(editor.getJSON()), tokenRef.current);
        if (res.ok) {
          tokenRef.current = res.data;
          const again = dirtyRef.current;
          setState({ status: again ? "dirty" : "saved", savedAt: res.data.draftUpdatedAt ?? Date.now(), savedKind: "draft", failures: 0, hasDraft: true });
          if (again) timerRef.current = setTimeout(() => void flushRef.current(), AUTOSAVE_MS);
          return true;
        }
        dirtyRef.current = true;
        if (res.conflict) {
          pausedRef.current = true;
          setState((s) => ({ ...s, status: "error" }));
          onConflictRef.current();
          return false;
        }
        setState((s) => ({ ...s, status: "error", failures: s.failures + 1 }));
        return false;
      } catch {
        dirtyRef.current = true;
        setState((s) => ({ ...s, status: "error", failures: s.failures + 1 }));
        return false;
      }
    })();
    inflightRef.current = run;
    const ok = await run;
    inflightRef.current = null;
    return ok;
  }, [documentId, editor]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  useEffect(() => {
    const onUpdate = ({ transaction }: EditorEvents["update"]) => {
      if (!transaction.docChanged || transaction.getMeta(NO_SAVE_META) || transaction.getMeta(segIdKey)) return;
      const meta = transaction.getMeta(SUGGESTION_META) as SuggestionMeta | undefined;
      if (meta?.action === "accept") acceptedRef.current += meta.ids.length;
      else if (!meta) userEditsRef.current = true;
      dirtyRef.current = true;
      setState((s) => (s.status === "dirty" ? s : { ...s, status: "dirty" }));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (!pausedRef.current) timerRef.current = setTimeout(() => void flushRef.current(), AUTOSAVE_MS);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
    };
  }, [editor]);

  // avertizare la închiderea filei cu modificări nesalvate
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !inflightRef.current) return;
      void flushRef.current();
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // la părăsirea paginii prin navigare internă: ultima salvare, fără așteptare
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (dirtyRef.current && !pausedRef.current) {
        try {
          void saveDraftAction(documentId, JSON.stringify(editor.getJSON()), tokenRef.current);
        } catch {
          // editorul a fost deja distrus
        }
      }
    },
    [documentId, editor],
  );

  /** Originea propusă pentru versiunea următoare și nota automată. */
  const versionOrigin = useCallback((): { origin: "manual" | "ai_sugestie"; note: string | null } => {
    const n = acceptedRef.current;
    if (n > 0 && !userEditsRef.current) return { origin: "ai_sugestie", note: n === 1 ? "Acceptată o sugestie AI" : `Acceptate ${n} sugestii AI` };
    return { origin: "manual", note: null };
  }, []);

  /** După „Salvează versiunea” / restaurare / reîncărcare: totul e salvat, ciorna e goală. */
  const markClean = useCallback((token: SaveToken, opts: { savedAt?: number; hasDraft?: boolean } = {}) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    tokenRef.current = token;
    dirtyRef.current = false;
    pausedRef.current = false;
    userEditsRef.current = false;
    acceptedRef.current = 0;
    const hasDraft = opts.hasDraft ?? false;
    setState({ status: "saved", savedAt: opts.savedAt ?? Date.now(), savedKind: hasDraft ? "draft" : "version", failures: 0, hasDraft });
  }, []);

  const getToken = useCallback(() => tokenRef.current, []);
  const isDirty = useCallback(() => dirtyRef.current, []);
  const content = useCallback(() => editor.getJSON() as JSONContent, [editor]);

  return { state, flush, versionOrigin, markClean, getToken, isDirty, content };
}
