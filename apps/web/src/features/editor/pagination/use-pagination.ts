"use client";

import type { Editor } from "@tiptap/react";
import { useSyncExternalStore } from "react";
import { PaginationStore, type PaginationSnapshot, type PaginationStorage } from "./extension";

const NONE = new PaginationStore();

/** Numărul real de pagini și pagina cursorului (editorul fără extensia de paginare: o pagină). */
export function usePagination(editor: Editor): PaginationSnapshot {
  const store = (editor.storage as unknown as { lexPagination?: PaginationStorage }).lexPagination?.store ?? NONE;
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
