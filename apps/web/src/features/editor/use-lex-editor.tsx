"use client";

import type { DocumentMeta, JSONContent } from "@lexai/docx";
import { Placeholder } from "@tiptap/extensions";
import { Editor, EditorContent, type EditorOptions, type Extensions } from "@tiptap/react";
import { useLayoutEffect, useState } from "react";
import { ChatMarks } from "./chat-marks";
import { Highlights } from "./highlights";
import { Pagination } from "./pagination/extension";
import { contractExtensions } from "./schema/extensions";
import { FormattingShortcuts } from "./schema/formatting";
import { Search } from "./search";

/** Extensiile editorului: schema contractului + paginare, evidențieri, marcajele chatului, căutare, scurtături, indiciul de început. */
export function editorExtensions(meta: DocumentMeta): Extensions {
  return [
    ...contractExtensions(),
    FormattingShortcuts.configure({ defaultFontSizePt: meta.defaults.fontSizePt }),
    Pagination,
    Highlights,
    ChatMarks,
    Search,
    // numele „placeholder” aparține mark-ului de câmp din contract
    Placeholder.extend({ name: "emptyHint" }).configure({
      placeholder: ({ editor, pos }) => (pos === 0 && editor.isEmpty ? "Începe să scrii sau apasă ⌘K pentru comenzi." : ""),
      showOnlyCurrent: true,
      dataAttribute: "empty-hint",
    }),
  ];
}

/**
 * Editorul trăiește cât starea componentei. Cu `cacheComponents`, Next ține pagina părăsită într-un
 * `<Activity>` ascuns: efectele se curăță, iar `useEditor` din Tiptap ar distruge editorul și l-ar
 * întoarce `null` la randarea următoare. Aici instanța rămâne aceeași (conținut, istoric, stare de
 * editare); doar vederea ei se desprinde cât pagina e ascunsă — vezi `LexEditorContent`.
 */
function useDurableEditor(options: Partial<EditorOptions>): Editor {
  const [editor] = useState(() => new Editor(options));
  return editor;
}

/** `EditorContent` care reatașează vederea editorului când pagina redevine vizibilă. */
export function LexEditorContent({ editor }: { editor: Editor }) {
  return (
    <>
      <ViewKeeper editor={editor} />
      <EditorContent editor={editor} />
    </>
  );
}

/**
 * Desprinderea amânată a vederii, per editor (nu per componentă): când arborele se schimbă (ex. sub
 * 1280 px panoul lateral nu mai e redimensionabil și `main` se remontează), noul `ViewKeeper` o anulează
 * pe a celui vechi; altfel vederea s-ar desprinde imediat după ce noul `EditorContent` a preluat-o.
 */
const pendingDetach = new WeakMap<Editor, ReturnType<typeof setTimeout>>();

// frate înaintea lui EditorContent: efectul lui rulează primul, deci vederea există când EditorContent o preia
function ViewKeeper({ editor }: { editor: Editor }) {
  useLayoutEffect(() => {
    clearTimeout(pendingDetach.get(editor));
    pendingDetach.delete(editor);
    if (editor.isDestroyed) editor.mount(document.createElement("div"));
    // amânat: în StrictMode efectul revine imediat; altfel pagina e ascunsă sau închisă și vederea
    // (cu ascultătorii ei pe `document`) se eliberează, iar editorul rămâne în starea componentei
    return () => {
      pendingDetach.set(
        editor,
        setTimeout(() => {
          pendingDetach.delete(editor);
          editor.unmount();
        }, 0),
      );
    };
  }, [editor]);
  return null;
}

export function useLexEditor(content: JSONContent, meta: DocumentMeta): Editor {
  return useDurableEditor({
    extensions: editorExtensions(meta),
    content,
    editorProps: {
      attributes: {
        class: "lex-prose",
        lang: "ro",
        spellcheck: "true",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": "Textul documentului",
      },
    },
  });
}

/** Editor doar pentru citire (versiuni vechi, comparare), cu extensii suplimentare. */
export function useReadOnlyEditor(content: JSONContent, meta: DocumentMeta, extra: Extensions = []): Editor {
  return useDurableEditor({
    extensions: [...contractExtensions(), FormattingShortcuts.configure({ defaultFontSizePt: meta.defaults.fontSizePt }), Pagination, ...extra],
    content,
    editable: false,
    editorProps: { attributes: { class: "lex-prose", lang: "ro", "aria-readonly": "true", "aria-label": "Versiune (doar citire)" } },
  });
}
