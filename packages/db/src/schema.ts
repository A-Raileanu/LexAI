import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Schema bazei de date. Un singur utilizator, fără autentificare: aplicația rulează local.
 * Setările stau în `settings` (un singur rând, id = 1). Momentele sunt în milisecunde
 * (Date.now()); JSON-ul este stocat ca text.
 */

const id = () => text("id").primaryKey();
const createdAt = () => integer("created_at").notNull();

// ───────────────────────── Setări ─────────────────────────

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  /** modelul Claude folosit de joburi */
  model: text("model").notNull().default("claude-sonnet-5-5"),
  /** câte joburi AI rulează în paralel */
  workerConcurrency: integer("worker_concurrency").notNull().default(2),
  /** data implicită de referință (yyyy-mm-dd); null = ziua curentă */
  defaultReferenceDate: text("default_reference_date"),
});

// ───────────────────────── Proiecte și documente ─────────────────────────

export const projects = sqliteTable("projects", {
  id: id(),
  name: text("name").notNull(),
  client: text("client"),
  description: text("description"),
  /** fixat în sidebar (null = nefixat) */
  pinnedAt: integer("pinned_at"),
  archivedAt: integer("archived_at"),
  createdAt: createdAt(),
  updatedAt: integer("updated_at").notNull(),
});

export const files = sqliteTable(
  "files",
  {
    id: id(),
    sha256: text("sha256").notNull(),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    /** relativ la directorul de date */
    path: text("path").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("files_sha256").on(t.sha256)],
);

export const documents = sqliteTable(
  "documents",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    /** „incarcat” (din fișier) sau „generat” (redactat de la zero) */
    kind: text("kind", { enum: ["incarcat", "generat"] }).notNull(),
    sourceFileId: text("source_file_id").references(() => files.id),
    currentVersionId: text("current_version_id"),
    /** ciorna salvată automat (JSON Tiptap), încă nesalvată ca versiune */
    draftContent: text("draft_content"),
    draftUpdatedAt: integer("draft_updated_at"),
    /** DocumentMeta (pagină, font implicit, antete, note de subsol) */
    meta: text("meta").notNull(),
    dataReferinta: text("data_referinta"),
    archivedAt: integer("archived_at"),
    createdAt: createdAt(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [index("documents_project").on(t.projectId)],
);

/**
 * Fișierele de context ale proiectului: material de lucru (acte, corespondență, modele, note)
 * care intră automat în generările din proiect (redactare și chat). Nu se analizează și nu se
 * editează; se păstrează doar textul extras.
 */
export const contextFiles = sqliteTable(
  "context_files",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    fileId: text("file_id")
      .notNull()
      .references(() => files.id),
    name: text("name").notNull(),
    /** textul extras; la un PDF cu pagini scanate, cel din paginile cu text până termină OCR-ul */
    text: text("text").notNull().default(""),
    /** „gata”, „ocr” (pagini scanate în recunoaștere) sau „eroare” */
    status: text("status", { enum: ["gata", "ocr", "eroare"] }).notNull(),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [index("context_files_project").on(t.projectId)],
);

export const documentVersions = sqliteTable(
  "document_versions",
  {
    id: id(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    content: text("content").notNull(),
    origin: text("origin", { enum: ["import", "manual", "ai_sugestie", "generare", "restaurare"] }).notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("document_versions_number").on(t.documentId, t.number)],
);

// ───────────────────────── Analiză și redactare ─────────────────────────

export const analyses = sqliteTable(
  "analyses",
  {
    id: id(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    versionId: text("version_id").notNull(),
    jobId: text("job_id"),
    dataReferinta: text("data_referinta").notNull(),
    status: text("status", { enum: ["in_curs", "finalizata", "intrerupta", "esuata", "anulata"] }).notNull(),
    /** AnalysisResult complet: trimiteri, constatări cu dovezi, acoperire, consum */
    result: text("result"),
    createdAt: createdAt(),
    finishedAt: integer("finished_at"),
  },
  (t) => [index("analyses_document").on(t.documentId)],
);

/** Ce a făcut utilizatorul cu o constatare (sugestie aplicată sau ignorată). */
export const findingActions = sqliteTable(
  "finding_actions",
  {
    analysisId: text("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    findingId: text("finding_id").notNull(),
    action: text("action", { enum: ["aplicata", "ignorata"] }).notNull(),
    /**
     * „ignorata”: semnătura stabilă a constatării (`findingSignature` din @lexai/core), ca ignorarea
     * să se aplice și analizelor ulterioare ale documentului. Null la rândurile vechi.
     */
    signature: text("signature"),
    /** „aplicata”: indicele variantei din `Finding.sugestii` aplicate */
    suggestionIndex: integer("suggestion_index"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("finding_actions_pk").on(t.analysisId, t.findingId)],
);

export const drafts = sqliteTable("drafts", {
  id: id(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  jobId: text("job_id"),
  /** tipul documentului din catalog */
  tip: text("tip").notNull(),
  /** răspunsurile din asistent */
  parametri: text("parametri").notNull(),
  /** nota de conformitate: temeiurile validate */
  conformitate: text("conformitate"),
  createdAt: createdAt(),
});

/**
 * Chatul din editor (docs/ux/18-chat-editor.md): o conversație pe document. Mesajul asistentului
 * se creează odată cu jobul (`job_id`) și primește răspunsul la final; starea lui (în curs, eșuat,
 * oprit) vine din job. `proposals` = modificările propuse (`ChatProposal[]` din @lexai/core/chat),
 * fiecare cu starea ei (propusă / aplicată / respinsă).
 */
export const chatMessages = sqliteTable(
  "chat_messages",
  {
    id: id(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["utilizator", "asistent"] }).notNull(),
    content: text("content").notNull().default(""),
    /** selecția trimisă cu cererea (`ChatScope`), doar la mesajele utilizatorului */
    scope: text("scope"),
    proposals: text("proposals"),
    jobId: text("job_id"),
    createdAt: createdAt(),
  },
  (t) => [index("chat_messages_document").on(t.documentId, t.createdAt)],
);

// ───────────────────────── Joburi AI ─────────────────────────

export const JOB_KINDS = ["ocr", "analiza", "reverificare", "redactare", "chat"] as const;
export const JOB_STATUSES = ["in_asteptare", "in_curs", "finalizat", "esuat", "anulat", "intrerupt"] as const;

export const jobs = sqliteTable(
  "jobs",
  {
    id: id(),
    kind: text("kind", { enum: JOB_KINDS }).notNull(),
    status: text("status", { enum: JOB_STATUSES }).notNull(),
    projectId: text("project_id"),
    documentId: text("document_id"),
    input: text("input").notNull(),
    result: text("result"),
    error: text("error"),
    /** ultima stare a progresului (pentru liste și reconectare) */
    progress: text("progress"),
    cancelRequested: integer("cancel_requested", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    startedAt: integer("started_at"),
    finishedAt: integer("finished_at"),
  },
  (t) => [index("jobs_status").on(t.status, t.createdAt), index("jobs_document").on(t.documentId)],
);

export const jobEvents = sqliteTable(
  "job_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    type: text("type").notNull(),
    payload: text("payload").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("job_events_seq").on(t.jobId, t.seq)],
);

// ───────────────────────── Surse și consum ─────────────────────────

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  priority: integer("priority").notNull().default(100),
  config: text("config").notNull().default("{}"),
});

export const sourceCache = sqliteTable(
  "source_cache",
  {
    key: text("key").primaryKey(),
    sourceId: text("source_id").notNull(),
    value: text("value").notNull(),
    fetchedAt: integer("fetched_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("source_cache_expires").on(t.expiresAt)],
);

export const aiUsage = sqliteTable(
  "ai_usage",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: text("job_id"),
    etapa: text("etapa").notNull(),
    model: text("model").notNull(),
    input: integer("input").notNull().default(0),
    cacheWrite: integer("cache_write").notNull().default(0),
    cacheRead: integer("cache_read").notNull().default(0),
    output: integer("output").notNull().default(0),
    apeluri: integer("apeluri").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    limit5hPct: real("limit_5h_pct"),
    limit5hReset: integer("limit_5h_reset"),
    limit7dPct: real("limit_7d_pct"),
    limit7dReset: integer("limit_7d_reset"),
    createdAt: createdAt(),
  },
  (t) => [index("ai_usage_created").on(t.createdAt)],
);

export const now = () => Date.now();
export { sql };
