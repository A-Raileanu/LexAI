import { files, getDb, inArray } from "@lexai/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ProjectSwitcher } from "@/components/app-shell/project-switcher";
import { Skeleton } from "@/components/ui/skeleton";
import { summarize } from "@/features/documents/analysis-badge";
import { ProjectView } from "@/features/projects/project-view";
import { todayIso } from "@/lib/format";
import { getSettings } from "@/server/settings";
import { listContextFiles } from "@/server/context-files";
import { listDocuments } from "@/server/documents";
import { ignoredSignatures, resolvedFindings } from "@/server/finding-ignores";
import { getProject, listProjects, recentJobs } from "@/server/projects";

export const metadata: Metadata = { title: "Proiect — LexAI" };

async function Project({ params }: { params: PageProps<"/proiecte/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  const docs = listDocuments(id);
  const fileIds = docs.map((d) => d.sourceFileId).filter((x): x is string => Boolean(x));
  const fileNames = new Map(
    fileIds.length ? getDb().select({ id: files.id, name: files.name }).from(files).where(inArray(files.id, fileIds)).all().map((f) => [f.id, f.name]) : [],
  );
  const context = listContextFiles(id);
  const titles = new Map(docs.map((d) => [d.id, d.title]));
  const contextNames = new Map(context.map((f) => [f.id, f.name]));
  // joburile de OCR ale fișierelor de context n-au document: se afișează cu numele fișierului
  const jobTitle = (j: { documentId: string | null; input: string }) => {
    if (j.documentId) return titles.get(j.documentId) ?? null;
    try {
      const ctxId = (JSON.parse(j.input) as { contextFileId?: string }).contextFileId;
      return ctxId ? (contextNames.get(ctxId) ?? null) : null;
    } catch {
      return null;
    }
  };
  // constatările ignorate sau rezolvate nu contează în insigne și în „Cu probleme”
  const ignored = ignoredSignatures(getDb(), docs.map((d) => d.id));
  const resolved = resolvedFindings(getDb(), docs.flatMap((d) => (d.ultimaAnaliza ? [d.ultimaAnaliza.id] : [])));
  const active = listProjects();
  const row = (project.archivedAt ? listProjects({ archived: true }) : active).find((p) => p.id === id);
  const today = todayIso();
  const settings = getSettings(getDb());
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <ProjectView
        today={today}
        defaultDate={settings.defaultReferenceDate ?? today}
        project={{ ...project, ultimaActivitate: row?.ultimaActivitate ?? project.updatedAt }}
        contextFiles={context}
        docs={docs.map((d) => ({
          id: d.id,
          title: d.title,
          kind: d.kind,
          ext: d.sourceFileId ? (fileNames.get(d.sourceFileId)?.split(".").pop()?.toUpperCase() ?? null) : null,
          versiune: d.versiune,
          updatedAt: d.updatedAt,
          analysis: d.ultimaAnaliza ? { status: d.ultimaAnaliza.status, counts: summarize(d.ultimaAnaliza.result, ignored.get(d.id), resolved.get(d.ultimaAnaliza.id)) } : null,
          analysisAt: d.ultimaAnaliza?.createdAt ?? null,
        }))}
        jobs={recentJobs(id, 20).map((j) => ({ id: j.id, kind: j.kind, status: j.status, documentTitle: jobTitle(j), createdAt: j.createdAt, startedAt: j.startedAt, finishedAt: j.finishedAt, error: j.error }))}
        switcher={<ProjectSwitcher currentId={id} projects={active.map((p) => ({ id: p.id, name: p.name, client: p.client, pinnedAt: p.pinnedAt, ultimaActivitate: p.ultimaActivitate }))} />}
      />
    </div>
  );
}

export default function ProjectPage({ params }: PageProps<"/proiecte/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="mt-8 h-72 w-full" />
        </div>
      }
    >
      <Project params={params} />
    </Suspense>
  );
}
