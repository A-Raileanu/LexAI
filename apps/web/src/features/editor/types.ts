import type { DocumentMeta, JSONContent } from "@lexai/docx";
import type { AnalysisBootstrap } from "@/features/analysis/types";
import type { ChatMessageView } from "@/features/chat/types";
import type { VersionSummary } from "./actions";

export interface WorkspaceDocument {
  id: string;
  title: string;
  kind: "incarcat" | "generat";
  projectId: string;
  currentVersionId: string | null;
  draftUpdatedAt: number | null;
  updatedAt: number;
}

export interface WorkspaceProps {
  document: WorkspaceDocument;
  project: { id: string; name: string };
  content: JSONContent;
  fromDraft: boolean;
  meta: DocumentMeta;
  versions: VersionSummary[];
  /** ultima analiză și data de referință implicită (panoul „Constatări”) */
  analysis?: AnalysisBootstrap;
  /** conversația documentului (fila „Chat”) */
  chat?: ChatMessageView[];
}

export type PanelTab = "constatari" | "temeiuri" | "chat" | "istoric";

export type Origin = VersionSummary["origin"];
