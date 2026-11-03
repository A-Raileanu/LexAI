import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

/**
 * Joburile AI în curs, citite direct din baza de date (doar citire), ca la închidere să
 * putem avertiza: oprirea worker-ului le întrerupe, iar la repornire apar ca întrerupte.
 */

const KIND_LABEL: Record<string, string> = {
  analiza: "analiza",
  reverificare: "reverificarea",
  redactare: "generarea",
  ocr: "recunoașterea textului",
  chat: "răspunsul din chat",
};

export interface ActiveJob {
  kind: string;
  label: string;
  title: string | null;
}

export function activeJobs(dbFile: string): ActiveJob[] {
  if (!existsSync(dbFile)) return [];
  let db: DatabaseSync | null = null;
  try {
    db = new DatabaseSync(dbFile, { readOnly: true });
    const rows = db
      .prepare("select j.kind as kind, d.title as title from jobs j left join documents d on d.id = j.document_id where j.status = 'in_curs'")
      .all() as { kind: string; title: string | null }[];
    return rows.map((r) => ({ kind: r.kind, label: KIND_LABEL[r.kind] ?? r.kind, title: r.title }));
  } catch {
    return [];
  } finally {
    db?.close();
  }
}

export function describeJobs(jobs: ActiveJob[]): string {
  return jobs.map((j) => `• ${j.label[0].toUpperCase()}${j.label.slice(1)}${j.title ? ` — „${j.title}”` : ""}`).join("\n");
}
