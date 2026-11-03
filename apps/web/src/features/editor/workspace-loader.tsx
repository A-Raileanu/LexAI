"use client";

import dynamic from "next/dynamic";
import { EditorSkeleton } from "./editor-skeleton";
import type { WorkspaceProps } from "./types";

/**
 * Spațiul de lucru e randat doar în browser: editorul, panoul redimensionabil (lățimea
 * reținută local) și layout-ul pe lățimi depind de DOM, deci nu au ce căuta pe server.
 */
const EditorWorkspace = dynamic(() => import("./workspace").then((m) => m.EditorWorkspace), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

export function WorkspaceLoader(props: WorkspaceProps) {
  return <EditorWorkspace {...props} />;
}
