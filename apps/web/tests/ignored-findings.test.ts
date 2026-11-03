import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { findingSignature } from "@lexai/core/findings";
import type { Finding, VerdictStatus } from "@lexai/core/types";
import { analyses, documents, findingActions, openDatabase, projects, type Db } from "@lexai/db";
import type { JSONContent } from "@lexai/docx";
import { beforeEach, describe, expect, it } from "vitest";
import { annotateContent } from "../src/features/analysis/annotated-docx";
import { countByStatus, highlightItems, suggestionViews, withIgnoredActions } from "../src/features/analysis/model";
import { buildTriage } from "../src/features/analysis/triage";
import { severityCounts, summarize } from "../src/features/analysis/summary";
import { ignoreFindingRow, ignoreRows, ignoredFor, ignoredSignatures, resolvedFindings, restoreSignature, signatureOf } from "../src/server/finding-ignores";

function finding(id: string, status: VerdictStatus, citat: string, extra: Partial<Finding> = {}): Finding {
  return {
    id,
    referenceId: id.replace(/^F-/, ""),
    citat,
    anchors: [{ segmentId: "p_1", start: 0, end: 5, potrivire: "exacta" }],
    tipTrimitere: "explicita",
    afirmatie: citat,
    status,
    titlu: `Titlu ${id}`,
    explicatie: `Explicație ${id}.`,
    verdictLaData: { status, data: "2026-11-01", rezumat: "" },
    sugestii: [],
    dovezi: [],
    ...extra,
  };
}

const TITLU = "Prin înregistrarea la organul fiscal contractul constituie titlu executoriu.";
const FORMA = "Părțile pot opta și pentru încheierea contractului în formă autentică.";

let db: Db;
let n = 0;
beforeEach(() => {
  db = openDatabase(path.join(mkdtempSync(path.join(tmpdir(), "lexai-test-")), "t.db")).db;
  const now = Date.now();
  db.insert(projects).values({ id: "prj_1", name: "Proiect", createdAt: now, updatedAt: now }).run();
  for (const id of ["doc_1", "doc_2"]) {
    db.insert(documents).values({ id, projectId: "prj_1", title: id, kind: "incarcat", meta: "{}", createdAt: now, updatedAt: now }).run();
  }
});

function addAnalysis(documentId: string, findings: Finding[]): string {
  const id = `ana_${++n}`;
  db.insert(analyses)
    .values({ id, documentId, versionId: "ver_x", dataReferinta: "2026-11-01", status: "finalizata", result: JSON.stringify({ findings }), createdAt: Date.now() + n })
    .run();
  return id;
}

describe("ignorările se păstrează între analize (după semnătură)", () => {
  it("o constatare ignorată rămâne ignorată la o analiză nouă, cu alte id-uri", () => {
    const a1 = addAnalysis("doc_1", [finding("F-T1", "eroare_citare", TITLU, { categorie: "identificare_gresita_act" }), finding("F-T4", "interpretare_discutabila", FORMA)]);
    const sig = signatureOf(db, a1, "F-T1", null)!;
    ignoreFindingRow(db, { analysisId: a1, findingId: "F-T1", signature: sig });

    // analiza nouă: alte id-uri, același pasaj (spații și punctuație diferite), aceeași problemă
    const next = [
      finding("F-T2", "eroare_citare", "Prin înregistrarea la organul  fiscal contractul constituie titlu executoriu", { categorie: "identificare_gresita_act" }),
      finding("F-T9", "interpretare_discutabila", FORMA),
      finding("F-T3", "corect", "Alt pasaj."),
    ];
    addAnalysis("doc_1", next);
    const ignored = ignoredFor(db, "doc_1");
    const actions = withIgnoredActions(next, {}, ignored);
    expect(actions).toEqual({ "F-T2": "ignorata" });
    // celălalt document nu e afectat
    expect(ignoredSignatures(db, ["doc_1", "doc_2"]).has("doc_2")).toBe(false);

    // „Restaurează” șterge ignorarea, indiferent din ce analiză a fost făcută
    expect(restoreSignature(db, "doc_1", findingSignature(next[0]))).toBe(1);
    expect(ignoredFor(db, "doc_1").size).toBe(0);
  });

  it("rândurile vechi, fără semnătură, își iau semnătura din rezultatul analizei lor", () => {
    const a1 = addAnalysis("doc_1", [finding("F-T4", "interpretare_discutabila", FORMA, { categorie: "conditii_omise" })]);
    db.insert(findingActions).values({ analysisId: a1, findingId: "F-T4", action: "ignorata", createdAt: Date.now() }).run();
    expect(ignoreRows(db, ["doc_1"])).toEqual([{ analysisId: a1, findingId: "F-T4", documentId: "doc_1", signature: findingSignature({ citat: FORMA, categorie: "conditii_omise" }) }]);
    const later = [finding("F-T7", "interpretare_discutabila", FORMA, { categorie: "conditii_omise" })];
    expect(withIgnoredActions(later, {}, ignoredFor(db, "doc_1"))).toEqual({ "F-T7": "ignorata" });
    expect(restoreSignature(db, "doc_1", findingSignature(later[0]))).toBe(1);
    expect(db.select().from(findingActions).all()).toEqual([]);
  });

  it("o constatare încă nesalvată (live) se ignoră după citatul și categoria primite", () => {
    const a1 = addAnalysis("doc_1", []);
    expect(signatureOf(db, a1, "F-T5", { citat: TITLU, categorie: null })).toBe(findingSignature({ citat: TITLU }));
    expect(signatureOf(db, a1, "F-T5", null)).toBeNull();
  });
});

describe("numărătorile și insignele fără constatările ignorate", () => {
  const list = [
    finding("F-1", "eroare_citare", TITLU, { categorie: "identificare_gresita_act" }),
    finding("F-2", "eroare_citare", "art. 7 din Legea nr. 31/1990"),
    finding("F-3", "interpretare_discutabila", FORMA),
    finding("F-4", "corect", "Alt pasaj."),
  ];
  const ignored = new Set([findingSignature(list[0]), findingSignature(list[2])]);
  const json = JSON.stringify({ findings: list });

  it("insigna documentului și alertele proiectului", () => {
    expect(summarize(json)).toEqual({ corect: 1, erori: 2, discutabil: 1, uman: 0, neverificat: 0 });
    expect(summarize(json, ignored)).toEqual({ corect: 1, erori: 1, discutabil: 0, uman: 0, neverificat: 0 });
    expect(severityCounts(json, ignored)).toEqual({ erori: 1, atentie: 0 });
    // totul ignorat: documentul nu mai apare „cu probleme”
    expect(severityCounts(json, new Set(list.map(findingSignature)))).toEqual({ erori: 0, atentie: 0 });
    expect(summarize(null)).toBeNull();
  });

  it("constatările aplicate sau verificate nu mai sunt probleme în insigne", () => {
    const a = addAnalysis("doc_1", list);
    const b = addAnalysis("doc_2", list);
    const now = Date.now();
    db.insert(findingActions)
      .values([
        { analysisId: a, findingId: "F-2", action: "aplicata", signature: null, suggestionIndex: 0, createdAt: now },
        { analysisId: a, findingId: "F-3", action: "aplicata", signature: null, suggestionIndex: -1, createdAt: now },
        { analysisId: b, findingId: "F-1", action: "ignorata", signature: findingSignature(list[0]), suggestionIndex: null, createdAt: now },
      ])
      .run();
    const resolved = resolvedFindings(db, [a, b]);
    expect([...(resolved.get(a) ?? [])].sort()).toEqual(["F-2", "F-3"]);
    expect(resolved.has(b)).toBe(false);
    // F-1 ignorată, F-2 aplicată, F-3 verificată: documentul nu mai are probleme
    expect(severityCounts(json, new Set([findingSignature(list[0])]), resolved.get(a))).toEqual({ erori: 0, atentie: 0 });
    expect(summarize(json, null, resolved.get(a))).toEqual({ corect: 1, erori: 1, discutabil: 0, uman: 0, neverificat: 0 });
  });

  it("panoul: numărători, evidențieri și „rezolvate” (aplicate + ignorate)", () => {
    const actions = withIgnoredActions(list, { "F-2": "aplicata", "F-3": "aplicata" }, ignored);
    // aplicarea are prioritate față de ignorare
    expect(actions).toEqual({ "F-1": "ignorata", "F-2": "aplicata", "F-3": "aplicata" });
    const visible = list.filter((f) => actions[f.id] !== "ignorata");
    expect(countByStatus(visible)).toMatchObject({ eroare_citare: 1, interpretare_discutabila: 1, corect: 1 });
    expect(highlightItems(visible, { showCorrect: true, actions }).map((h) => h.id)).toEqual(["F-4"]);
    const hidden = list.filter((f) => actions[f.id] === "ignorata");
    expect(buildTriage(visible, hidden, actions).progress).toMatchObject({ done: 3, total: 3, applied: 2, ignored: 1 });
  });
});

describe("exporturile și variantele de sugestie", () => {
  const text = (t: string): JSONContent => ({ type: "text", text: t });
  const allText = (n: JSONContent): string => (n.text ?? "") + (n.content ?? []).map(allText).join("");
  const CLAUSE = "Dacă Locatarul nu restituie Locuința la termen, datorează o sumă egală cu chiria.";

  it("DOCX adnotat: fără constatările ignorate, cu toate variantele etichetate", () => {
    const content: JSONContent = { type: "doc", content: [{ type: "paragraph", attrs: { segId: "p_1" }, content: [text(`${CLAUSE} ${TITLU}`)] }] };
    const discutabil = finding("F-1", "interpretare_discutabila", CLAUSE, {
      sugestii: [
        { tip: "propunere_de_revizuit", situatie: "Clauza este convențională", textOriginal: "Dacă Locatarul", textPropus: "Părțile convin că, dacă Locatarul", motiv: "", impact: [] },
        { tip: "propunere_de_revizuit", situatie: "Clauza se elimină", textOriginal: CLAUSE, textPropus: "", motiv: "", impact: [] },
      ],
    });
    const ignoredError = finding("F-2", "eroare_citare", TITLU, { categorie: "identificare_gresita_act" });
    const res = annotateContent(content, [discutabil, ignoredError], { ignored: new Set([findingSignature(ignoredError)]), actions: { "F-1": "aplicata" }, appliedSuggestion: { "F-1": 1 } });
    expect(res.notes).toBe(1);
    const lines = res.content.content!.map(allText);
    expect(lines.some((l) => l.includes("Titlu F-2"))).toBe(false);
    expect(lines).toContain("Variantă de revizuit (Clauza este convențională): Dacă Locatarul → Părțile convin că, dacă Locatarul");
    expect(lines).toContain(`Variantă de revizuit (Clauza se elimină): ${CLAUSE} → (se elimină) (aplicată în document)`);
  });

  it("variantele pentru interfață, și din rezultatele vechi", () => {
    const views = suggestionViews(finding("F-1", "interpretare_discutabila", CLAUSE, {
      sugestii: [
        { tip: "propunere_de_revizuit", textOriginal: "Dacă", textPropus: "Părțile convin că, dacă", motiv: "", impact: [] },
        { tip: "propunere_de_revizuit", textOriginal: CLAUSE, textPropus: "", motiv: "", impact: [] },
      ],
    }));
    expect(views.map((v) => [v.index, v.situatie, v.applicable, v.removes])).toEqual([
      [0, "Varianta 1", true, false],
      [1, "Varianta 2", true, true],
    ]);
    const old = { ...finding("F-2", "eroare_citare", "art. 7"), sugestie: { tip: "inlocuire" as const, textOriginal: "art. 7", textPropus: "art. 8", motiv: "", impact: [] } };
    delete (old as Partial<Finding>).sugestii;
    expect(suggestionViews(old).map((v) => [v.situatie, v.suggestion.textPropus])).toEqual([[null, "art. 8"]]);
  });
});
