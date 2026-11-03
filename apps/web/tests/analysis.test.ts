import type { Finding, VerdictStatus } from "@lexai/core/types";
import { defaultMeta, exportDocx, type JSONContent } from "@lexai/docx";
import { describe, expect, it } from "vitest";
import { annotateContent, blockPlainText, findingNotes, highlightQuote } from "../src/features/analysis/annotated-docx";
import {
  groupForFinding,
  initialProgress,
  initialStream,
  reduceJobEvent,
  reduceJobStream,
  stageIndex,
  stagesOf,
  type JobEventMessage,
  type JobProgress,
} from "../src/features/analysis/events";
import { countByStatus, findingIdOf, fmtElapsed, highlightItems, highlightsSignature, mergeLive, shorten, stepSelection } from "../src/features/analysis/model";
import { buildTriage } from "../src/features/analysis/triage";

function finding(id: string, status: VerdictStatus, segId: string, extra: Partial<Finding> = {}): Finding {
  return {
    id,
    referenceId: id.replace(/^F-/, ""),
    citat: `citat ${id}`,
    anchors: segId ? [{ segmentId: segId, start: 0, end: 5, potrivire: "exacta" }] : [],
    tipTrimitere: "explicita",
    afirmatie: "afirmație",
    status,
    titlu: `Titlu ${id}`,
    explicatie: `Explicație ${id}.`,
    verdictLaData: { status, data: "2026-11-01", rezumat: "rezumat" },
    sugestii: [],
    dovezi: [],
    ...extra,
  };
}

const ev = (seq: number | null, type: string, payload: unknown): JobEventMessage => ({ seq, type, payload });
const play = (events: JobEventMessage[], from: JobProgress = initialProgress("job_1")) => events.reduce(reduceJobEvent, from);

describe("reducer-ul evenimentelor de job", () => {
  const groups = [
    { cheie: "lege|31|1990", eticheta: "Lege nr. 31/1990 (societăți)", numar: 2 },
    { cheie: "lege|53|2003", eticheta: "Lege nr. 53/2003 (Codul muncii)", numar: 1 },
  ];
  const f1 = finding("F-T1", "eroare_citare", "p_1", { act: { baseId: 1, titlu: "LEGE nr. 31 din 1990", numar: "31", an: "1990" } });
  const f2 = finding("F-T2", "corect", "p_2", { act: { baseId: 2, titlu: "LEGE nr. 53 din 2003", numar: "53", an: "2003" } });
  const stream: JobEventMessage[] = [
    ev(1, "stare", { status: "in_curs" }),
    ev(2, "etapa", { type: "etapa", etapa: "identificare", mesaj: "Identific trimiterile" }),
    ev(3, "trimiteri", { type: "trimiteri", total: 3, grupuri: groups }),
    ev(4, "etapa", { type: "etapa", etapa: "verificare", mesaj: "Verific 3 trimiteri" }),
    ev(5, "grup_start", { type: "grup_start", cheie: groups[0].cheie, eticheta: groups[0].eticheta, numar: 2 }),
    ev(6, "activitate", { type: "activitate", cheie: groups[0].cheie, mesaj: "Caut pe Portalul Legislativ" }),
    ev(7, "grup_start", { type: "grup_start", cheie: groups[1].cheie, eticheta: groups[1].eticheta, numar: 1 }),
    ev(8, "constatare", { type: "constatare", finding: f1 }),
    ev(9, "constatare", { type: "constatare", finding: f2 }),
    ev(10, "consum", { type: "consum", consum: { linii: [], total: { costUsd: 0.1 }, sursaPreturi: "x", limite: { cinciOre: { procent: 41, resetLa: null }, sapteZile: null, stare: "allowed", actualizatLa: "2026-11-01T10:00:00Z" } } }),
    ev(11, "grup_final", { type: "grup_final", cheie: groups[0].cheie }),
  ];

  it("reconstruiește etapele, grupurile, constatările și consumul", () => {
    const s = play(stream);
    expect(s.status).toBe("in_curs");
    expect(s.etapa).toBe("verificare");
    expect(s.total).toBe(3);
    expect(s.grouped).toBe(true);
    expect(s.groups.map((g) => g.stare)).toEqual(["gata", "lucru"]);
    expect(s.findings.map((f) => f.id)).toEqual(["F-T1", "F-T2"]);
    expect(s.consum?.limite?.cinciOre?.procent).toBe(41);
    expect(s.lastSeq).toBe(11);
    // constatările sunt atribuite grupului după act, chiar dacă două grupuri rulează simultan
    expect(s.groups[0].findingIds).toEqual(["F-T1"]);
    expect(s.groups[1].findingIds).toEqual(["F-T2"]);
    expect(s.groups[0].linii.map((l) => l.kind)).toEqual(["activitate", "constatare"]);
  });

  it("ignoră evenimentele repetate (reluare după reconectare)", () => {
    const once = play(stream);
    const twice = play(stream, once);
    expect(twice).toBe(once);
    const partial = play(stream.slice(0, 6));
    expect(play(stream, partial)).toEqual(once);
  });

  it("înlocuiește o constatare actualizată fără să o dubleze", () => {
    const updated = { ...f1, status: "interpretare_discutabila" as const, titlu: "Revizuit" };
    const s = play([...stream, ev(12, "constatare", { type: "constatare", finding: updated })]);
    expect(s.findings).toHaveLength(2);
    expect(s.findings[0].status).toBe("interpretare_discutabila");
    const line = s.groups[0].linii.find((l) => l.findingId === "F-T1");
    expect(line?.status).toBe("interpretare_discutabila");
    expect(s.groups[0].findingIds).toEqual(["F-T1"]);
  });

  it("încheie fluxul la `sfarsit` (fără număr de eveniment)", () => {
    const s = play([...stream, ev(null, "sfarsit", { status: "anulat", eroare: "Anulat de utilizator." })]);
    expect(s.ended).toBe(true);
    expect(s.status).toBe("anulat");
    expect(s.error).toBe("Anulat de utilizator.");
    expect(s.lastSeq).toBe(11);
  });

  it("atribuie constatarea ultimului grup activ când actul nu se potrivește", () => {
    const s = play(stream.slice(0, 7));
    expect(groupForFinding(s, finding("F-X", "corect", "p_9"))).toBe(groups[1].cheie);
    const single = play(stream.slice(0, 6));
    expect(groupForFinding(single, finding("F-Y", "corect", "p_9"))).toBe(groups[0].cheie);
    expect(groupForFinding(play(stream.slice(0, 4)), finding("F-Z", "corect", "p_9"))).toBeNull();
  });

  it("calculează etapa curentă (1–4) pentru pastilă și lista de etape", () => {
    expect(stageIndex(initialProgress())).toBe(1);
    expect(stageIndex(play(stream.slice(0, 3)))).toBe(3);
    expect(stageIndex(play([...stream, ev(12, "etapa", { type: "etapa", etapa: "consolidare", mesaj: "Consolidez" })]))).toBe(4);
    const stages = stagesOf(play(stream), { refs: (n) => `${n} trimiteri`, groups: (n) => `${n} grupuri` });
    expect(stages.map((s) => s.state)).toEqual(["gata", "gata", "curent", "urmeaza"]);
    expect(stages[0].detail).toBe("3 trimiteri");
    expect(stages[2].detail).toBe("1 din 2 grupuri");
  });

  it("reducer-ul fluxului pornește de la zero pentru alt job și aplică loturi", () => {
    let s = reduceJobStream(initialStream("job_1"), { kind: "events", jobId: "job_1", events: stream });
    expect(s.findings).toHaveLength(2);
    s = reduceJobStream(s, { kind: "connection", jobId: "job_1", connection: "open" });
    expect(s.connection).toBe("open");
    const other = reduceJobStream(s, { kind: "events", jobId: "job_2", events: [ev(1, "stare", { status: "in_curs" })] });
    expect(other.jobId).toBe("job_2");
    expect(other.findings).toHaveLength(0);
    expect(other.lastSeq).toBe(1);
  });
});

describe("gruparea, filtrarea și navigarea constatărilor", () => {
  const list = [
    finding("F-1", "corect", "p_a"),
    finding("F-2", "eroare_citare", "p_c"),
    finding("F-3", "interpretare_discutabila", "p_b"),
    finding("F-4", "eroare_citare", "p_a"),
    finding("F-5", "neverificat", ""),
  ];
  const order = new Map([
    ["p_a", 0],
    ["p_b", 1],
    ["p_c", 2],
  ]);

  it("numără pe stări", () => {
    expect(countByStatus(list)).toEqual({ eroare_citare: 2, interpretare_discutabila: 1, necesita_analiza_umana: 0, neverificat: 1, corect: 1 });
  });

  it("grupează pe gravitate și, în grup, în ordinea din document", () => {
    const t = buildTriage(list, [], {}, order);
    expect(t.problems.map((g) => g.key)).toEqual(["eroare_citare", "interpretare_discutabila", "neverificat"]);
    expect(t.problems[0].findings.map((f) => f.id)).toEqual(["F-4", "F-2"]);
    expect(t.problems.flatMap((g) => g.findings.map((f) => f.id))).toEqual(["F-4", "F-2", "F-3", "F-5"]);
    expect(t.correct.map((f) => f.id)).toEqual(["F-1"]);
  });

  it("navighează cu j / k fără să treacă de capete", () => {
    const ids = ["a", "b", "c"];
    expect(stepSelection(ids, null, 1)).toBe("a");
    expect(stepSelection(ids, null, -1)).toBe("c");
    expect(stepSelection(ids, "a", 1)).toBe("b");
    expect(stepSelection(ids, "c", 1)).toBe("c");
    expect(stepSelection(ids, "a", -1)).toBe("a");
    expect(stepSelection(ids, "x", 1)).toBe("a");
    expect(stepSelection([], "a", 1)).toBeNull();
  });

  it("evidențierile: fără cele rezolvate, corectele doar la cerere, o evidențiere pe ancoră", () => {
    const multi = finding("F-6", "necesita_analiza_umana", "p_a", {
      anchors: [
        { segmentId: "p_a", start: 0, end: 3, potrivire: "exacta" },
        { segmentId: "p_b", start: 0, end: 3, potrivire: "exacta" },
      ],
    });
    const items = highlightItems([...list, multi], { showCorrect: false, actions: { "F-2": "aplicata" } });
    expect(items.map((h) => h.id)).toEqual(["F-3", "F-4", "F-6", "F-6::1"]);
    expect(items[0]).toEqual({ id: "F-3", segId: "p_b", quote: "citat F-3", status: "interpretare_discutabila" });
    expect(findingIdOf("F-6::1")).toBe("F-6");
    expect(highlightItems(list, { showCorrect: true, actions: {} }).map((h) => h.id)).toContain("F-1");
    expect(highlightsSignature(items)).toBe(highlightsSignature(highlightItems([...list, multi], { showCorrect: false, actions: { "F-2": "aplicata" } })));
  });

  it("combină constatările de bază cu cele live la o reverificare", () => {
    const base = [finding("F-1", "corect", "p_a"), finding("F-2", "eroare_citare", "p_b"), finding("F-3", "corect", "p_c")];
    const live = [finding("F-2", "corect", "p_b")];
    const { findings, pending } = mergeLive(base, live, ["p_b", "p_c"]);
    expect(findings.map((f) => `${f.id}:${f.status}`)).toEqual(["F-1:corect", "F-3:corect", "F-2:corect"]);
    expect([...pending]).toEqual(["F-3"]);
    expect(mergeLive(base, [], null).pending.size).toBe(0);
  });

  it("progresul rezolvării: corectele nu se numără", () => {
    expect(buildTriage(list, [], { "F-2": "aplicata" }).progress).toMatchObject({ done: 1, total: 4, applied: 1 });
  });

  it("formatează timpul scurs și scurtează textele", () => {
    expect(fmtElapsed(0)).toBe("00:00");
    expect(fmtElapsed(192_000)).toBe("03:12");
    expect(fmtElapsed(3_723_000)).toBe("1:02:03");
    expect(shorten("Scurt.", 50)).toBe("Scurt.");
    expect(shorten("Prima propoziție este aici. A doua propoziție este mult mai lungă decât limita.", 40)).toBe("Prima propoziție este aici.");
    expect(shorten("cuvinte multe fără niciun punct până la capăt", 20)).toBe("cuvinte multe fără…");
  });
});

describe("DOCX adnotat", () => {
  const text = (t: string, marks?: JSONContent["marks"]): JSONContent => ({ type: "text", text: t, ...(marks ? { marks } : {}) });
  const para = (segId: string, ...content: JSONContent[]): JSONContent => ({ type: "paragraph", attrs: { segId }, content });
  const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });
  const allText = (n: JSONContent): string => (n.text ?? "") + (n.content ?? []).map(allText).join("");

  it("evidențiază citatul peste mai multe noduri de text, păstrând mark-urile", () => {
    const block = para("p_1", text("Conform "), text("art. 11 alin. (1)", [{ type: "bold" }]), text(" din Legea nr. 31/1990."));
    expect(blockPlainText(block)).toBe("Conform art. 11 alin. (1) din Legea nr. 31/1990.");
    const out = highlightQuote(block, "alin. (1) din Legea", "#FDE2D6");
    const pieces = out.content!.map((n) => ({ t: n.text, hl: n.marks?.some((m) => m.type === "highlight") ?? false, bold: n.marks?.some((m) => m.type === "bold") ?? false }));
    expect(pieces).toEqual([
      { t: "Conform ", hl: false, bold: false },
      { t: "art. 11 ", hl: false, bold: true },
      { t: "alin. (1)", hl: true, bold: true },
      { t: " din Legea", hl: true, bold: false },
      { t: " nr. 31/1990.", hl: false, bold: false },
    ]);
    expect(allText(out)).toBe(allText(block));
    // citat inexistent: blocul rămâne neschimbat
    expect(highlightQuote(block, "Codul fiscal", "#FFF")).toBe(block);
  });

  it("ignoră inserările propuse neacceptate la căutarea citatului", () => {
    const block = para("p_1", text("art. "), text("99", [{ type: "suggestInsert", attrs: { id: "s" } }]), text("7 lit. d)"));
    expect(blockPlainText(block)).toBe("art. 7 lit. d)");
    const out = highlightQuote(block, "art. 7", "#FFF");
    expect(out.content!.filter((n) => n.marks?.some((m) => m.type === "highlight")).map((n) => n.text)).toEqual(["art. ", "7"]);
  });

  it("adaugă note în culoarea verdictului sub paragrafele cu constatări", () => {
    const content = doc(
      para("p_1", text("Capitalul social este de 200 lei, conform art. 11 din Legea nr. 31/1990.")),
      { type: "bulletList", content: [{ type: "listItem", content: [para("p_2", text("Concedierea conform art. 61 din Codul muncii."))] }] },
      para("p_3", text("Text fără trimiteri.")),
    );
    const f1 = finding("F-1", "eroare_citare", "p_1", {
      citat: "art. 11 din Legea nr. 31/1990",
      categorie: "valoare_gresita",
      sugestie: { tip: "inlocuire", textOriginal: "200 lei", textPropus: "500 lei", motiv: "m", impact: [] },
    });
    const f2 = finding("F-2", "interpretare_discutabila", "p_2", { citat: "art. 61 din Codul muncii" });
    const ok = finding("F-3", "corect", "p_3", { citat: "Text" });
    const ignored = finding("F-4", "eroare_citare", "p_3", { citat: "trimiteri" });
    const missing = finding("F-5", "necesita_analiza_umana", "p_lipsa");

    const res = annotateContent(content, [ok, f2, f1, ignored, missing], { actions: { "F-4": "ignorata" }, intro: "Document adnotat" });
    expect(res.notes).toBe(3);
    expect(res.unplaced).toBe(1);
    const top = res.content.content!;
    expect(allText(top[0])).toBe("Document adnotat");
    expect(top[1].attrs?.segId).toBe("p_1");
    expect(top[1].content!.some((n) => n.marks?.some((m) => m.type === "highlight"))).toBe(true);
    // nota și sugestia, imediat după paragraf
    expect(allText(top[2])).toContain("Greșeală confirmată · Valoare greșită — Titlu F-1");
    expect(top[2].content![0].marks).toContainEqual({ type: "textStyle", attrs: { color: "#C2410C", fontSize: "9pt", fontFamily: "Arial" } });
    expect(allText(top[3])).toBe("Sugestie: 200 lei → 500 lei");
    expect(top[3].content!.find((n) => n.text === "200 lei")?.marks?.some((m) => m.type === "strike")).toBe(true);
    // în listă, nota rămâne în elementul listei
    const item = top[4].content![0].content!;
    expect(item).toHaveLength(2);
    expect(allText(item[1])).toContain("Interpretare discutabilă");
    // paragraful cu o constatare corectă și una ignorată nu primește nici notă, nici evidențiere
    expect(top[5].attrs?.segId).toBe("p_3");
    expect(top[5].content!.some((n) => n.marks?.some((m) => m.type === "highlight"))).toBe(false);
    // constatarea fără paragraf corespondent ajunge la sfârșit, cu citatul
    expect(allText(top[6])).toBe("Constatări fără paragraf corespondent în această versiune");
    expect(allText(top[7])).toContain("„citat F-5”");
    expect(top).toHaveLength(8);
  });

  it("include corectele la cerere și marchează sugestiile aplicate", () => {
    const content = doc(para("p_1", text("art. 7 lit. d) din Legea nr. 31/1990")));
    const f = finding("F-1", "corect", "p_1", { citat: "art. 7 lit. d)" });
    expect(annotateContent(content, [f]).notes).toBe(0);
    expect(annotateContent(content, [f], { includeCorrect: true }).notes).toBe(1);
    const applied = finding("F-2", "eroare_citare", "p_1", { citat: "art. 7", sugestie: { tip: "inlocuire", textOriginal: "art. 7", textPropus: "art. 8", motiv: "", impact: [] } });
    const notes = findingNotes(applied, "aplicata");
    expect(allText(notes[1])).toContain("aplicată în document");
    // sugestia aplicată: pasajul nu mai e evidențiat (modificarea e deja în document)
    const res = annotateContent(content, [applied], { actions: { "F-2": "aplicata" } });
    expect(res.content.content![0].content!.some((n) => n.marks?.some((m) => m.type === "highlight"))).toBe(false);
  });

  it("produce un fișier DOCX valid", async () => {
    const content = doc(para("p_1", text("Potrivit art. 1 alin. (2) din Legea nr. 31/1990, societățile au personalitate juridică.")));
    const res = annotateContent(content, [finding("F-1", "interpretare_discutabila", "p_1", { citat: "art. 1 alin. (2) din Legea nr. 31/1990" })]);
    const buf = await exportDocx(res.content, defaultMeta());
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 2).toString()).toBe("PK");
  });
});
