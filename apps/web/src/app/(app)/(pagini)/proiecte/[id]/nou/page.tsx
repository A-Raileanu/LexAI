import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageCrumbs } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { NewDocumentForm } from "@/features/drafting/new-document-form";
import { listContextFiles } from "@/server/context-files";
import { listDocuments } from "@/server/documents";
import { getProject } from "@/server/projects";

export const metadata: Metadata = { title: "Document nou — LexAI" };

async function Content({ params }: { params: PageProps<"/proiecte/[id]/nou">["params"] }) {
  await connection();
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <PageCrumbs
        crumbs={[
          { label: "Proiecte", href: "/" },
          { label: project.name, href: `/proiecte/${id}` },
        ]}
        current="Document nou"
        className="mx-auto max-w-2xl"
      />
      <NewDocumentForm
        projectId={id}
        projectName={project.name}
        context={{ fisiere: listContextFiles(id).filter((f) => f.chars > 0 || f.status === "ocr").length, documente: listDocuments(id).length }}
      />
    </div>
  );
}

export default function NewDocumentPage({ params }: PageProps<"/proiecte/[id]/nou">) {
  return (
    <Suspense fallback={<div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8"><Skeleton className="h-4 w-40" /><Skeleton className="mt-3 h-7 w-48" /><Skeleton className="mt-6 h-64 w-full" /></div>}>
      <Content params={params} />
    </Suspense>
  );
}
