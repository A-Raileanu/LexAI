import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { GenerationPage } from "@/features/drafting/generation-page";
import { loadDraftInfo } from "@/features/drafting/server";
import { generationPending } from "@/features/drafting/types";
import { getDocument } from "@/server/documents";
import { getProject } from "@/server/projects";

export const metadata: Metadata = { title: "Generare — LexAI" };

async function Content({ params }: { params: PageProps<"/proiecte/[id]/documente/[docId]/generare">["params"] }) {
  await connection();
  const { id, docId } = await params;
  const doc = getDocument(docId);
  if (!doc || doc.archivedAt) notFound();
  const project = getProject(doc.projectId);
  if (!project) notFound();
  const draft = loadDraftInfo(doc.id);
  // documentul e gata (sau nu e generat): direct în editor
  if (!draft || !generationPending(draft)) redirect(`/proiecte/${doc.projectId}/documente/${doc.id}`);
  if (doc.projectId !== id) redirect(`/proiecte/${doc.projectId}/documente/${doc.id}/generare`);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <GenerationPage title={doc.title} project={{ id: project.id, name: project.name }} draft={draft} />
    </div>
  );
}

export default function GenerationRoute({ params }: PageProps<"/proiecte/[id]/documente/[docId]/generare">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
          <div className="mx-auto max-w-2xl">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-3 h-7 w-64" />
            <Skeleton className="mt-6 h-80 w-full rounded-xl" />
          </div>
        </div>
      }
    >
      <Content params={params} />
    </Suspense>
  );
}
