import { defaultMeta, mergeMeta, type DocumentMeta, type JSONContent } from "@lexai/docx";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { analysisBootstrap } from "@/features/analysis/data";
import { loadChat } from "@/features/chat/server";
import { loadDraftInfo } from "@/features/drafting/server";
import { generationPending } from "@/features/drafting/types";
import { EditorSkeleton } from "@/features/editor/editor-skeleton";
import { WorkspaceLoader } from "@/features/editor/workspace-loader";
import { getDocument, listVersions, workingContent } from "@/server/documents";
import { getProject } from "@/server/projects";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Editor — LexAI" };

function parseMeta(raw: string | null | undefined): DocumentMeta {
  const d = defaultMeta();
  if (!raw) return d;
  try {
    return mergeMeta(JSON.parse(raw) as Partial<DocumentMeta>);
  } catch {
    return d;
  }
}

async function Editor({ params }: { params: PageProps<"/proiecte/[id]/documente/[docId]">["params"] }) {
  await connection();
  const { id, docId } = await params;
  const doc = getDocument(docId);
  if (!doc || doc.archivedAt) notFound();
  if (doc.projectId !== id) redirect(`/proiecte/${doc.projectId}/documente/${doc.id}`);
  // cât timp documentul se generează (sau generarea n-a reușit), progresul are pagina lui
  if (doc.kind === "generat" && generationPending(loadDraftInfo(doc.id))) redirect(`/proiecte/${doc.projectId}/documente/${doc.id}/generare`);
  const project = getProject(id);
  if (!project) notFound();
  const working = workingContent(doc);

  return (
    <WorkspaceLoader
      document={{
        id: doc.id,
        title: doc.title,
        kind: doc.kind,
        projectId: doc.projectId,
        currentVersionId: doc.currentVersionId ?? null,
        draftUpdatedAt: doc.draftUpdatedAt ?? null,
        updatedAt: doc.updatedAt,
      }}
      project={{ id: project.id, name: project.name }}
      content={working.content as JSONContent}
      fromDraft={working.fromDraft}
      meta={parseMeta(doc.meta)}
      versions={listVersions(doc.id)}
      analysis={analysisBootstrap({ id: doc.id, dataReferinta: doc.dataReferinta ?? null })}
      chat={loadChat(doc.id)}
    />
  );
}

export default function DocumentEditorPage({ params }: PageProps<"/proiecte/[id]/documente/[docId]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Editor params={params} />
    </Suspense>
  );
}
