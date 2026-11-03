import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EditorSkeleton } from "@/features/editor/editor-skeleton";
import { getDocument } from "@/server/documents";
import { connection } from "next/server";

/** Link scurt (paleta ⌘K): redirecționează la ruta completă a editorului. */
async function Redirect({ params }: { params: PageProps<"/documente/[docId]">["params"] }) {
  await connection();
  const { docId } = await params;
  const doc = getDocument(docId);
  if (!doc) notFound();
  redirect(`/proiecte/${doc.projectId}/documente/${doc.id}`);
  return null;
}

export default function DocumentShortcutPage({ params }: PageProps<"/documente/[docId]">) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <Redirect params={params} />
    </Suspense>
  );
}
