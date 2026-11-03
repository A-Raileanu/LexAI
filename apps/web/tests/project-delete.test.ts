import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { aiUsage, analyses, chatMessages, contextFiles, documentVersions, documents, eq, files, findingActions, jobEvents, jobs, openDatabase, projects, type Db } from "@lexai/db";
import { beforeEach, describe, expect, it } from "vitest";
import { deleteArchivedProject } from "../src/server/project-delete";

let db: Db;
const now = 1_700_000_000_000;

beforeEach(() => {
  db = openDatabase(path.join(mkdtempSync(path.join(tmpdir(), "lexai-del-")), "t.db")).db;
  db.insert(projects).values([
    { id: "p1", name: "De șters", archivedAt: now, createdAt: now, updatedAt: now },
    { id: "p2", name: "Rămâne", createdAt: now, updatedAt: now },
  ]).run();
  db.insert(files).values([
    { id: "f1", sha256: "a", name: "a.pdf", mime: "application/pdf", size: 1, path: "files/aa/a.pdf", createdAt: now },
    { id: "f2", sha256: "b", name: "b.docx", mime: "x", size: 1, path: "files/bb/b.docx", createdAt: now },
    // același conținut încărcat în alt proiect: alt rând, același fișier fizic
    { id: "f3", sha256: "b", name: "b-copie.docx", mime: "x", size: 1, path: "files/bb/b.docx", createdAt: now },
  ]).run();
  db.insert(documents).values([
    { id: "d1", projectId: "p1", title: "A", kind: "incarcat", sourceFileId: "f1", meta: "{}", createdAt: now, updatedAt: now },
    { id: "d2", projectId: "p1", title: "B", kind: "incarcat", sourceFileId: "f2", meta: "{}", createdAt: now, updatedAt: now },
    { id: "d3", projectId: "p2", title: "C", kind: "incarcat", sourceFileId: "f3", meta: "{}", createdAt: now, updatedAt: now },
  ]).run();
  db.insert(documentVersions).values({ id: "v1", documentId: "d1", number: 1, content: "{}", origin: "import", createdAt: now }).run();
  db.insert(analyses).values({ id: "a1", documentId: "d1", versionId: "v1", dataReferinta: "2026-11-01", status: "finalizata", createdAt: now }).run();
  db.insert(findingActions).values({ analysisId: "a1", findingId: "F-1", action: "aplicata", createdAt: now }).run();
  db.insert(jobs).values([
    { id: "j1", kind: "analiza", status: "finalizat", projectId: "p1", documentId: "d1", input: "{}", createdAt: now },
    { id: "j2", kind: "analiza", status: "finalizat", projectId: "p2", documentId: "d3", input: "{}", createdAt: now },
  ]).run();
  db.insert(jobEvents).values({ jobId: "j1", seq: 1, type: "etapa", payload: "{}", createdAt: now }).run();
  db.insert(aiUsage).values({ jobId: "j1", etapa: "verificare", model: "m", createdAt: now }).run();
});

describe("ștergerea definitivă a unui proiect arhivat", () => {
  it("șterge imaginile din documente pe care nu le mai folosește alt document", () => {
    const img = (c: string) => `${c.repeat(64)}.png`;
    const doc = (...names: string[]) => JSON.stringify({ type: "doc", content: names.map((n) => ({ type: "image", attrs: { src: `/api/imagini/${n}` } })) });
    db.update(documentVersions).set({ content: doc(img("a"), img("b")) }).where(eq(documentVersions.id, "v1")).run();
    db.update(documents).set({ meta: JSON.stringify({ headers: [[{ type: "paragraph", content: JSON.parse(doc(img("c"))).content }]] }) }).where(eq(documents.id, "d2")).run();
    // b e folosită și de un document din alt proiect
    db.insert(documentVersions).values({ id: "v3", documentId: "d3", number: 1, content: doc(img("b")), origin: "import", createdAt: now }).run();
    const r = deleteArchivedProject(db, "p1");
    expect(r.ok && r.fisiere.filter((f) => f.startsWith("files/imagini/")).sort()).toEqual([`files/imagini/${img("a")}`, `files/imagini/${img("c")}`]);
  });

  it("șterge și fișierele de context ale proiectului", () => {
    db.insert(files).values({ id: "f4", sha256: "c", name: "poza.jpg", mime: "image/jpeg", size: 1, path: "files/cc/c.jpg", createdAt: now }).run();
    db.insert(contextFiles).values({ id: "ctx1", projectId: "p1", fileId: "f4", name: "poza.jpg", text: "text", status: "gata", createdAt: now }).run();
    const r = deleteArchivedProject(db, "p1");
    expect(r.ok && r.fisiere.sort()).toEqual(["files/aa/a.pdf", "files/cc/c.jpg"]);
    expect(db.select().from(contextFiles).all()).toHaveLength(0);
    expect(db.select().from(files).all().map((f) => f.id)).toEqual(["f3"]);
  });

  it("șterge documentele, analizele, joburile și fișierele nefolosite, dar păstrează consumul și restul", () => {
    const r = deleteArchivedProject(db, "p1");
    expect(r).toEqual({ ok: true, documente: 2, fisiere: ["files/aa/a.pdf"] });
    expect(db.select().from(projects).all().map((p) => p.id)).toEqual(["p2"]);
    expect(db.select().from(documents).all().map((d) => d.id)).toEqual(["d3"]);
    expect(db.select().from(documentVersions).all()).toHaveLength(0);
    expect(db.select().from(analyses).all()).toHaveLength(0);
    expect(db.select().from(findingActions).all()).toHaveLength(0);
    expect(db.select().from(jobs).all().map((j) => j.id)).toEqual(["j2"]);
    expect(db.select().from(jobEvents).all()).toHaveLength(0);
    // f2 dispare ca rând, dar fișierul fizic rămâne: îl folosește și f3 (alt proiect)
    expect(db.select().from(files).all().map((f) => f.id)).toEqual(["f3"]);
    expect(db.select().from(aiUsage).all()).toHaveLength(1);
  });

  it("refuză proiectele active și pe cele cu joburi în curs", () => {
    expect(deleteArchivedProject(db, "p2")).toMatchObject({ ok: false });
    expect(deleteArchivedProject(db, "nu-exista")).toMatchObject({ ok: false });
    db.update(jobs).set({ status: "in_curs" }).where(eq(jobs.id, "j1")).run();
    expect(deleteArchivedProject(db, "p1")).toMatchObject({ ok: false });
    expect(db.select().from(documents).all()).toHaveLength(3);
  });

  it("șterge și conversațiile de chat ale documentelor și joburile lor", () => {
    db.insert(jobs).values({ id: "jc", kind: "chat", status: "finalizat", projectId: "p1", documentId: "d2", input: "{}", createdAt: now }).run();
    db.insert(chatMessages).values([
      { id: "c1", documentId: "d2", role: "utilizator", content: "Reformulează", createdAt: now },
      { id: "c2", documentId: "d2", role: "asistent", content: "Propun…", jobId: "jc", createdAt: now + 1 },
      { id: "c3", documentId: "d3", role: "utilizator", content: "Rămâne", createdAt: now },
    ]).run();
    expect(deleteArchivedProject(db, "p1").ok).toBe(true);
    expect(db.select().from(chatMessages).all().map((m) => m.id)).toEqual(["c3"]);
    expect(db.select().from(jobs).where(eq(jobs.id, "jc")).all()).toHaveLength(0);
  });
});
