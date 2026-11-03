"use server";

import { defaultMeta } from "@lexai/docx";
import { drafts, enqueueJob, getDb, newId } from "@lexai/db";
import { insertDocument } from "@/server/documents";
import { getProject } from "@/server/projects";
import { todayIso } from "@/lib/format";
import { docType, missingFields, type DraftParams } from "./catalog";
import { latestDraftRow, loadDraftInfo } from "./server";
import type { DraftInfo } from "./types";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Pornește redactarea: documentul (cu un schelet temporar), parametrii asistentului și
 * jobul „redactare” pentru worker. Editorul afișează progresul și înlocuiește scheletul
 * cu proiectul generat.
 */
export async function startDrafting(projectId: string, params: DraftParams): Promise<Result<{ documentId: string; jobId: string }>> {
  const project = getProject(projectId);
  if (!project || project.archivedAt) return { ok: false, error: "Proiectul nu există sau este arhivat." };
  const t = docType(params.tip);
  if (!t) return { ok: false, error: "Tipul de document nu este cunoscut." };
  if (!ISO.test(params.dataDocument) || !ISO.test(params.dataLegii)) return { ok: false, error: "Datele documentului sunt invalide." };
  if (t.id === "altul" && !params.elemente.continut?.trim()) return { ok: false, error: "Descrie ce trebuie să conțină documentul." };

  const title = t.id === "altul" ? (params.scop.trim().slice(0, 160) || "Document nou") : params.subtip && t.subtypes.length ? `${t.name} — ${params.subtip}` : t.name;
  const skeleton = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1, segId: "gen_titlu", textAlign: "center" }, content: [{ type: "text", text: title.toUpperCase() }] },
      { type: "paragraph", attrs: { segId: "gen_status" }, content: [{ type: "text", text: "LexAI redactează documentul…" }] },
    ],
  };
  const doc = insertDocument({
    projectId,
    title,
    kind: "generat",
    content: skeleton,
    meta: defaultMeta(),
    origin: "generare",
    dataReferinta: params.dataLegii,
    note: "Schelet inițial (generare în curs)",
  });
  const db = getDb();
  const draftId = newId("drf");
  const job = enqueueJob(db, {
    kind: "redactare",
    projectId,
    documentId: doc.id,
    input: {
      documentId: doc.id,
      draftId,
      titlu: title,
      tip: { id: t.id, nume: t.name, subtip: params.subtip, norme: t.norms },
      parametri: params,
      deCompletat: missingFields(t, params),
    },
  });
  db.insert(drafts).values({ id: draftId, documentId: doc.id, jobId: job.id, tip: t.id, parametri: JSON.stringify(params), createdAt: Date.now() }).run();
  return { ok: true, data: { documentId: doc.id, jobId: job.id } };
}

/** Redactarea unui document generat: rândul din `drafts`, starea jobului și nota de conformitate. */
export async function getDraftAction(documentId: string): Promise<Result<DraftInfo | null>> {
  if (typeof documentId !== "string" || !documentId) return { ok: false, error: "Documentul nu există." };
  return { ok: true, data: loadDraftInfo(documentId) };
}

/**
 * Document nou din denumire și descriere: fără catalog și fără pași. Agentul deduce din
 * descriere tipul documentului, părțile și normele aplicabile; ce lipsește rămâne „[● …]”.
 */
export async function createDocumentFromDescription(
  projectId: string,
  input: { titlu: string; descriere: string; context: boolean },
): Promise<Result<{ documentId: string; jobId: string }>> {
  const titlu = input.titlu.trim();
  const descriere = input.descriere.trim();
  if (!titlu) return { ok: false, error: "Scrie denumirea documentului." };
  if (titlu.length > 160) return { ok: false, error: "Denumirea este prea lungă (maximum 160 de caractere)." };
  if (descriere.length < 15) return { ok: false, error: "Descrie pe scurt ce trebuie să conțină documentul." };
  const azi = todayIso();
  return startDrafting(projectId, {
    tip: "altul",
    subtip: "",
    scop: titlu,
    parti: [],
    elemente: { continut: descriere },
    dataDocument: azi,
    dataLegii: azi,
    pozitie: "echilibrat",
    model: null,
    context: input.context !== false,
  });
}

/**
 * „Generează din nou” după o generare eșuată sau oprită: pornește o redactare nouă cu aceiași
 * parametri (un document nou în același proiect). Documentul vechi rămâne neatins.
 */
export async function rerunDraftingAction(documentId: string): Promise<Result<{ documentId: string; projectId: string; jobId: string }>> {
  const info = typeof documentId === "string" ? loadDraftInfo(documentId) : null;
  const row = info ? latestDraftRow(documentId) : undefined;
  if (!info || !row) return { ok: false, error: "Nu am găsit parametrii generării." };
  if (info.job && (info.job.status === "in_asteptare" || info.job.status === "in_curs")) return { ok: false, error: "Generarea este încă în curs." };
  let params: DraftParams;
  try {
    params = JSON.parse(row.parametri) as DraftParams;
  } catch {
    return { ok: false, error: "Parametrii generării sunt corupți." };
  }
  const res = await startDrafting(info.projectId, params);
  if (!res.ok) return res;
  return { ok: true, data: { ...res.data, projectId: info.projectId } };
}
