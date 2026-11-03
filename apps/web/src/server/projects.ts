import "server-only";
import { and, analyses, desc, documents, eq, getDb, inArray, isNotNull, isNull, jobs, newId, projects } from "@lexai/db";
import { severityCounts } from "@/features/analysis/summary";
import { foldDiacritics } from "@/lib/text";
import { ignoredSignatures, resolvedFindings } from "./finding-ignores";

export type Project = typeof projects.$inferSelect;

export interface ProjectRow extends Project {
  documente: number;
  /** analize finalizate cu probleme nerezolvate (greșeli, discutabile, de verificat) */
  analizeDeschise: number;
  /** cea mai gravă stare găsită: „eroare”, „atentie” sau null */
  gravitate: "eroare" | "atentie" | null;
  ultimaActivitate: number;
}

export function listProjects(opts: { archived?: boolean; q?: string } = {}): ProjectRow[] {
  const db = getDb();
  const rows = db
    .select()
    .from(projects)
    .where(opts.archived ? isNotNull(projects.archivedAt) : isNull(projects.archivedAt))
    .orderBy(desc(projects.updatedAt))
    .all();
  const q = opts.q ? foldDiacritics(opts.q) : "";
  const filtered = q ? rows.filter((p) => foldDiacritics(`${p.name} ${p.client ?? ""}`).includes(q)) : rows;
  if (!filtered.length) return [];
  const ids = filtered.map((p) => p.id);
  const docs = db
    .select({ id: documents.id, projectId: documents.projectId, updatedAt: documents.updatedAt })
    .from(documents)
    .where(and(inArray(documents.projectId, ids), isNull(documents.archivedAt)))
    .all();
  const docIds = docs.map((d) => d.id);
  const lastAnalyses = docIds.length
    ? db
        .select({ id: analyses.id, documentId: analyses.documentId, result: analyses.result, status: analyses.status, createdAt: analyses.createdAt })
        .from(analyses)
        .where(inArray(analyses.documentId, docIds))
        .orderBy(desc(analyses.createdAt))
        .all()
    : [];
  const ignored = ignoredSignatures(db, docIds);
  const latestByDoc = new Map<string, (typeof lastAnalyses)[number]>();
  for (const a of lastAnalyses) if (!latestByDoc.has(a.documentId)) latestByDoc.set(a.documentId, a);
  const resolved = resolvedFindings(db, [...latestByDoc.values()].map((a) => a.id));
  return filtered.map((p) => {
    const own = docs.filter((d) => d.projectId === p.id);
    let open = 0;
    let gravitate: ProjectRow["gravitate"] = null;
    for (const d of own) {
      const a = latestByDoc.get(d.id);
      const counts = a?.status === "finalizata" ? severityCounts(a.result, ignored.get(d.id), resolved.get(a.id)) : null;
      if (!counts || counts.erori + counts.atentie === 0) continue;
      open++;
      if (counts.erori) gravitate = "eroare";
      else gravitate ??= "atentie";
    }
    return {
      ...p,
      documente: own.length,
      analizeDeschise: open,
      gravitate,
      ultimaActivitate: Math.max(p.updatedAt, ...own.map((d) => d.updatedAt)),
    };
  });
}

/** Numărul de constatări problematice dintr-un AnalysisResult salvat, fără cele ignorate sau rezolvate. */
export { severityCounts };

export function countProjects() {
  const all = getDb().select({ archivedAt: projects.archivedAt }).from(projects).all();
  return { active: all.filter((p) => !p.archivedAt).length, archived: all.filter((p) => p.archivedAt).length };
}

export function getProject(id: string): Project | undefined {
  return getDb().select().from(projects).where(eq(projects.id, id)).get();
}

export function pinnedProjects(): Pick<Project, "id" | "name" | "client">[] {
  return getDb()
    .select({ id: projects.id, name: projects.name, client: projects.client })
    .from(projects)
    .where(and(isNotNull(projects.pinnedAt), isNull(projects.archivedAt)))
    .orderBy(projects.pinnedAt)
    .limit(5)
    .all();
}

export function clientNames(): string[] {
  const rows = getDb().select({ client: projects.client }).from(projects).all();
  return [...new Set(rows.map((r) => r.client?.trim()).filter((c): c is string => Boolean(c)))].sort((a, b) => a.localeCompare(b, "ro"));
}

export function insertProject(values: { name: string; client?: string | null; description?: string | null }): Project {
  const now = Date.now();
  const row = { id: newId("prj"), name: values.name, client: values.client || null, description: values.description || null, createdAt: now, updatedAt: now };
  getDb().insert(projects).values(row).run();
  return getProject(row.id)!;
}

export function updateProject(id: string, values: Partial<Pick<Project, "name" | "client" | "description" | "archivedAt" | "pinnedAt">>) {
  getDb().update(projects).set({ ...values, updatedAt: Date.now() }).where(eq(projects.id, id)).run();
}

export function touchProject(id: string) {
  getDb().update(projects).set({ updatedAt: Date.now() }).where(eq(projects.id, id)).run();
}

export function recentJobs(projectId: string, limit = 8) {
  return getDb().select().from(jobs).where(eq(jobs.projectId, projectId)).orderBy(desc(jobs.createdAt)).limit(limit).all();
}
