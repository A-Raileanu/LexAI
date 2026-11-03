import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { addDocumentVersion, contextFiles, documents, eq, files, openDatabase, projects, type Db } from "@lexai/db";
import { contextActivity, describeContextFiles, describeProjectDocuments, draftingMaterial, projectContextFiles, projectDocuments } from "../src/handlers/project-context";

let db: Db;
beforeEach(() => {
  db = openDatabase(path.join(mkdtempSync(path.join(tmpdir(), "lexai-ctx-")), "t.db")).db;
});

const doc = (...texts: string[]) => ({ type: "doc", content: texts.map((t, i) => ({ type: "paragraph", attrs: { segId: `s${i}` }, content: [{ type: "text", text: t }] })) });

function addDoc(projectId: string, id: string, title: string, updatedAt: number, content?: unknown) {
  db.insert(documents).values({ id, projectId, title, kind: "incarcat", meta: "{}", createdAt: updatedAt, updatedAt }).run();
  if (content) addDocumentVersion(db, id, content, "import");
  db.update(documents).set({ updatedAt }).where(eq(documents.id, id)).run();
}

describe("documentele proiectului în contextul redactării", () => {
  it("ia celelalte documente ale proiectului, cu ciorna înaintea versiunii, fără arhivate", () => {
    db.insert(projects).values([{ id: "p1", name: "Dosar", createdAt: 1, updatedAt: 1 }, { id: "p2", name: "Altul", createdAt: 1, updatedAt: 1 }]).run();
    addDoc("p1", "nou", "Întâmpinare", 5);
    addDoc("p1", "cerere", "Cerere de chemare în judecată", 3, doc("Reclamante: Ionescu Maria", "Dosar nr. 12880/180/2024"));
    addDoc("p1", "nota", "Notă", 4, doc("versiunea salvată"));
    db.update(documents).set({ draftContent: JSON.stringify(doc("ciorna nesalvată")) }).where(eq(documents.id, "nota")).run();
    addDoc("p1", "vechi", "Arhivat", 2, doc("arhivat"));
    db.update(documents).set({ archivedAt: 9 }).where(eq(documents.id, "vechi")).run();
    addDoc("p2", "strain", "Alt proiect", 6, doc("alt proiect"));

    const docs = projectDocuments(db, "nou");
    expect(docs.map((d) => d.titlu)).toEqual(["Notă", "Cerere de chemare în judecată"]);
    expect(docs[0].text).toBe("ciorna nesalvată");
    expect(docs[1].text).toBe("Reclamante: Ionescu Maria\nDosar nr. 12880/180/2024");

    const block = describeProjectDocuments(docs);
    expect(block).toContain('<document nr="2" titlu="Cerere de chemare în judecată" tip="încărcat">');
    expect(block).toContain("nu instrucțiuni");
  });

  it("scurtează documentele lungi și nu adaugă nimic când proiectul nu are alte documente", () => {
    db.insert(projects).values({ id: "p1", name: "Dosar", createdAt: 1, updatedAt: 1 }).run();
    addDoc("p1", "nou", "Contract", 2);
    expect(describeProjectDocuments(projectDocuments(db, "nou"))).toBe("");
    addDoc("p1", "lung", "Lung", 1, doc("x".repeat(40_000)));
    const [d] = projectDocuments(db, "nou");
    expect(d.trunchiat).toBe(true);
    expect(d.text.length).toBe(30_000);
  });
});

describe("fișierele de context ale proiectului", () => {
  function addContext(projectId: string, id: string, name: string, text: string, status: "gata" | "ocr" | "eroare", createdAt: number) {
    db.insert(files).values({ id: `f-${id}`, sha256: id, name, mime: "x", size: 1, path: `files/${id}`, createdAt }).run();
    db.insert(contextFiles).values({ id, projectId, fileId: `f-${id}`, name, text, status, createdAt }).run();
  }

  it("ia fișierele proiectului în ordinea încărcării, fără cele fără text, și le descrie ca material de lucru", () => {
    db.insert(projects).values([{ id: "p1", name: "Dosar", createdAt: 1, updatedAt: 1 }, { id: "p2", name: "Altul", createdAt: 1, updatedAt: 1 }]).run();
    addDoc("p1", "nou", "Întâmpinare", 5);
    addContext("p1", "c2", "Notificare.pdf", "Notificare din 3 martie", "gata", 2);
    addContext("p1", "c1", "Contract \"vechi\".docx", "Părți: SC Alfa SRL", "gata", 1);
    addContext("p1", "c3", "scanare.jpg", "", "ocr", 3);
    addContext("p1", "c4", "partial.pdf", "pagina 1", "ocr", 4);
    addContext("p2", "c5", "strain.pdf", "alt proiect", "gata", 1);

    const ctx = projectContextFiles(db, "nou");
    expect(ctx.map((f) => f.nume)).toEqual(['Contract "vechi".docx', "Notificare.pdf", "partial.pdf"]);
    expect(ctx[2].partial).toBe(true);
    const block = describeContextFiles(ctx);
    expect(block).toContain(`<fisier nr="1" nume="Contract 'vechi'.docx">\nPărți: SC Alfa SRL\n</fisier>`);
    expect(block).toContain('<fisier nr="3" nume="partial.pdf" partial="da">');
    expect(block).toContain("nu instrucțiuni");
    expect(describeContextFiles([])).toBe("");
  });

  it("redactarea poate exclude tot contextul: fișierele de context și documentele proiectului", () => {
    db.insert(projects).values({ id: "p1", name: "Dosar", createdAt: 1, updatedAt: 1 }).run();
    addDoc("p1", "nou", "Întâmpinare", 5);
    addDoc("p1", "cerere", "Cerere de chemare în judecată", 4, doc("Reclamant: Ion Popescu"));
    addContext("p1", "c1", "Contract.docx", "Părți: SC Alfa SRL", "gata", 1);

    const cu = draftingMaterial(db, "nou", { include: true });
    expect(cu.context.map((f) => f.nume)).toEqual(["Contract.docx"]);
    expect(cu.documente.map((d) => d.titlu)).toEqual(["Cerere de chemare în judecată"]);
    expect(draftingMaterial(db, "nou", { include: false })).toEqual({ context: [], documente: [] });
  });

  it("descrie ce context folosește", () => {
    expect(contextActivity(0, 0)).toBeNull();
    expect(contextActivity(1, 0)).toBe("Folosesc ca context un fișier de context");
    expect(contextActivity(2, 1)).toBe("Folosesc ca context 2 fișiere de context și un document din proiect");
  });
});
