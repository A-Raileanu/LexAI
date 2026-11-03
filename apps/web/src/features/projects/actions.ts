"use server";

import { rmSync } from "node:fs";
import { dataDir, getDb } from "@lexai/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteContextFile } from "@/server/context-files";
import { deleteArchivedProject } from "@/server/project-delete";
import { getProject, insertProject, updateProject } from "@/server/projects";

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const ProjectInput = z.object({
  name: z.string().trim().min(1, "Numele proiectului este obligatoriu.").max(160, "Numele este prea lung."),
  client: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
});

export async function createProject(input: z.input<typeof ProjectInput>): Promise<ActionResult<{ id: string }>> {
  const parsed = ProjectInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const p = insertProject(parsed.data);
  revalidatePath("/");
  return { ok: true, data: { id: p.id } };
}

export async function editProject(id: string, input: Partial<z.input<typeof ProjectInput>>): Promise<ActionResult> {
  if (!getProject(id)) return { ok: false, error: "Proiectul nu există." };
  const parsed = ProjectInput.partial().safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  updateProject(id, parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function setProjectArchived(id: string, archived: boolean): Promise<ActionResult> {
  updateProject(id, { archivedAt: archived ? Date.now() : null, ...(archived ? { pinnedAt: null } : {}) });
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

export async function setProjectPinned(id: string, pinned: boolean): Promise<ActionResult> {
  updateProject(id, { pinnedAt: pinned ? Date.now() : null });
  revalidatePath("/", "layout");
  return { ok: true, data: undefined };
}

/** Șterge definitiv un proiect arhivat, cu documentele, analizele, joburile și fișierele lui. */
export async function deleteProject(id: string): Promise<ActionResult<{ documente: number }>> {
  const r = deleteArchivedProject(getDb(), id);
  if (!r.ok) return r;
  for (const rel of r.fisiere) {
    try {
      rmSync(dataDir(rel), { force: true });
    } catch {
      // un fișier rămas pe disc nu împiedică ștergerea proiectului
    }
  }
  revalidatePath("/", "layout");
  return { ok: true, data: { documente: r.documente } };
}

/** Scoate un fișier din contextul proiectului (și îl șterge de pe disc). */
export async function removeContextFile(projectId: string, id: string): Promise<ActionResult> {
  if (!deleteContextFile(projectId, id)) return { ok: false, error: "Fișierul nu mai există." };
  revalidatePath(`/proiecte/${projectId}`);
  return { ok: true, data: undefined };
}
