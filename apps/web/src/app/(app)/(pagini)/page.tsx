import { getDb, projects } from "@lexai/db";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectsView } from "@/features/projects/projects-view";
import { ClaudeSetupCard } from "@/features/settings/claude-account-card";
import { getClaudeAccount } from "@/features/settings/claude-status";
import { recentDocuments } from "@/server/documents";
import { clientNames, listProjects } from "@/server/projects";

export const metadata: Metadata = { title: "Proiecte — LexAI" };

async function Projects() {
  await connection();
  const active = listProjects();
  const archived = listProjects({ archived: true });
  const names = new Map(getDb().select({ id: projects.id, name: projects.name }).from(projects).all().map((p) => [p.id, p.name]));
  const recent = recentDocuments(6).map((d) => ({ ...d, projectName: names.get(d.projectId) ?? "" }));
  return <ProjectsView active={active} archived={archived} recent={recent} clients={clientNames()} />;
}

/** Instalarea Claude Code sau conectarea contului, cât timp lipsesc. */
async function ClaudeSetupNotice() {
  await connection();
  return <ClaudeSetupCard initial={await getClaudeAccount()} />;
}

function ProjectsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-7 w-40" />
      <div className="flex gap-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 w-60" />)}</div>
      <div className="flex flex-col gap-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <Suspense fallback={null}>
        <ClaudeSetupNotice />
      </Suspense>
      <Suspense fallback={<ProjectsSkeleton />}>
        <Projects />
      </Suspense>
    </div>
  );
}
