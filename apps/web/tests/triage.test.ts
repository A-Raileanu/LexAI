import type { Finding, Suggestion, VerdictStatus } from "@lexai/core/types";
import { describe, expect, it } from "vitest";
import { suggestionViews } from "../src/features/analysis/model";
import {
  actAbbrev,
  buildTriage,
  choiceFromKey,
  conclusionOf,
  documentLocators,
  explanationOf,
  initialChoice,
  isTypingTarget,
  keyIntent,
  locatorOf,
  nextAfterRemoval,
  primaryAction,
  shortReference,
  suggestionDiff,
  todayDiffers,
  variantKind,
  wordDiff,
} from "../src/features/analysis/triage";

function finding(id: string, status: VerdictStatus, segId: string, extra: Partial<Finding> = {}): Finding {
  return {
    id,
    referenceId: id,
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

const sug = (textOriginal: string, textPropus: string, situatie?: string): Suggestion => ({ tip: "inlocuire", textOriginal, textPropus, motiv: "", impact: [], ...(situatie ? { situatie } : {}) });

describe("trimiterea scurtă și locul în document", () => {
  it("abreviază codurile (după unitate) și celelalte acte (înainte)", () => {
    expect(actAbbrev({ titlu: "CODUL CIVIL din 17 iulie 2009 (Legea nr. 287/2009)" })).toEqual({ text: "C. civ.", code: true });
    expect(actAbbrev({ titlu: "LEGE nr. 287 din 17 iulie 2009 privind Codul civil" }).text).toBe("C. civ.");
    expect(actAbbrev({ titlu: "CODUL MUNCII din 2003 (LEGE nr. 53 din 24 ianuarie 2003)" }).text).toBe("C. muncii");
    expect(actAbbrev({ titlu: "COD DE PROCEDURĂ CIVILĂ din 1 iulie 2010" }).text).toBe("C. proc. civ.");
    expect(actAbbrev({ titlu: "LEGE nr. 31 din 16 noiembrie 1990 privind societățile" })).toEqual({ text: "L. 31/1990", code: false });
    expect(actAbbrev({ titlu: "ORDONANŢĂ DE URGENŢĂ nr. 195 din 12 decembrie 2002" }).text).toBe("OUG 195/2002");
    expect(actAbbrev({ titlu: "ORDONANŢĂ DE URGENŢĂ nr. 99 din 6 decembrie 2006", tip: "OUG", numar: "99", an: "2006" }).text).toBe("OUG 99/2006");
    expect(actAbbrev({ titlu: "HOTĂRÂRE nr. 1 din 2016" }).text).toBe("HG 1/2016");
  });

  it("construiește „art. … C. civ.”, „L. 31/1990, art. …” și cade pe citat", () => {
    const civ = { baseId: 1, titlu: "CODUL CIVIL din 17 iulie 2009 (Legea nr. 287/2009)" };
    const l31 = { baseId: 2, titlu: "LEGE nr. 31 din 16 noiembrie 1990", tip: "LEGE", numar: "31", an: "1990" };
    expect(shortReference({ act: civ, unitate: "art. 1.350 alin. (3)", citat: "x" })).toBe("art. 1.350 alin. (3) C. civ.");
    expect(shortReference({ act: l31, unitate: "art. 197", citat: "x" })).toBe("L. 31/1990, art. 197");
    // unitatea care numește actul însuși nu se repetă
    expect(shortReference({ act: l31, unitate: "Lege nr. 31/1990", citat: "x" })).toBe("L. 31/1990");
    // unitatea numește alt act (cel citat greșit): rămâne cum e
    const muncii = { baseId: 3, titlu: "CODUL MUNCII din 2003 (LEGE nr. 53 din 24 ianuarie 2003)" };
    expect(shortReference({ act: muncii, unitate: "Legea nr. 10/1972", citat: "x" })).toBe("Legea nr. 10/1972");
    expect(shortReference({ act: l31, unitate: "art. 5 din Legea nr. 31/1990", citat: "x" })).toBe("L. 31/1990, art. 5");
    expect(shortReference({ unitate: undefined, citat: "Prestatorii externi vor respecta obligațiile" })).toBe("„Prestatorii externi vor respecta obligațiile”");
  });

  it("locul: articolul din document sau „§ n”", () => {
    const segs = [
      { segId: "a", text: "CONTRACT" },
      { segId: "b", text: "Art. 1. Forma" },
      { segId: "c", text: "Potrivit art. 7 din lege…" },
      { segId: "d", text: "ARTICOLUL 2 Capitalul" },
      { segId: "e", text: "Capitalul este…" },
    ];
    const loc = documentLocators(segs);
    expect([...loc.values()]).toEqual(["§ 1", "Art. 1", "Art. 1", "Art. 2", "Art. 2"]);
    expect([...documentLocators([{ segId: "x", text: "fără articole" }, { segId: "y", text: "nici aici" }]).values()]).toEqual(["§ 1", "§ 2"]);
    expect(locatorOf(finding("F", "corect", "c"), loc)).toBe("Art. 1");
    expect(locatorOf(finding("F", "corect", ""), loc)).toBeNull();
  });
});

describe("grupurile listei de triaj", () => {
  const order = new Map(["p1", "p2", "p3", "p4"].map((s, i) => [s, i]));
  const list = [
    finding("F-1", "corect", "p1"),
    finding("F-2", "eroare_citare", "p3"),
    finding("F-3", "interpretare_discutabila", "p2"),
    finding("F-4", "eroare_citare", "p1"),
    finding("F-5", "necesita_analiza_umana", "p4"),
    finding("F-6", "neverificat", ""),
  ];

  it("problemele pe stări, corectele separat, rezolvatele și ignoratele în ordinea din document", () => {
    const ignored = [finding("F-7", "eroare_citare", "p4"), finding("F-8", "interpretare_discutabila", "p1")];
    const t = buildTriage(list, ignored, { "F-2": "aplicata", "F-5": "verificata", "F-7": "ignorata", "F-8": "ignorata" }, order);
    expect(t.problems.map((g) => [g.key, g.findings.map((f) => f.id)])).toEqual([
      ["eroare_citare", ["F-4"]],
      ["interpretare_discutabila", ["F-3"]],
      ["neverificat", ["F-6"]],
    ]);
    expect(t.correct.map((f) => f.id)).toEqual(["F-1"]);
    expect(t.resolved).toEqual([
      { f: list[1], kind: "aplicata" },
      { f: list[4], kind: "verificata" },
    ]);
    expect(t.ignored.map((f) => f.id)).toEqual(["F-8", "F-7"]);
    // „4 din 7 rezolvate”: 2 rezolvate + 2 ignorate din cele 7 care nu sunt corecte
    expect(t.progress).toEqual({ done: 4, total: 7, applied: 1, verified: 1, ignored: 2 });
  });

  it("„Ordonează ca în document”: un singur grup, fără grupuri goale", () => {
    const t = buildTriage(list, [], {}, order, "document");
    expect(t.problems).toHaveLength(1);
    expect(t.problems[0].key).toBe("toate");
    expect(t.problems[0].findings.map((f) => f.id)).toEqual(["F-4", "F-3", "F-2", "F-5", "F-6"]);
    expect(buildTriage([list[0]], [], {}, order, "document").problems).toEqual([]);
  });

  it("după ignorare / aplicare se deschide următoarea, altfel anterioara", () => {
    expect(nextAfterRemoval(["a", "b", "c"], "a")).toBe("b");
    expect(nextAfterRemoval(["a", "b", "c"], "c")).toBe("b");
    expect(nextAfterRemoval(["a"], "a")).toBeNull();
    expect(nextAfterRemoval(["a", "b"], "x")).toBe("a");
  });

  it("concluzia ascunde titlurile generice; explicația pentru „Neverificat” e motivul", () => {
    expect(conclusionOf({ titlu: "Trimitere neverificată", status: "neverificat" })).toBeNull();
    expect(conclusionOf({ titlu: "Greșeală", status: "eroare_citare", categorie: "articol_inexistent" })).toBe("Articol inexistent");
    expect(conclusionOf({ titlu: "Art. 1.350 are doar două alineate", status: "eroare_citare" })).toBe("Art. 1.350 are doar două alineate");
    expect(explanationOf(finding("F", "neverificat", "", { motivNeverificare: "Sursa nu a fost găsită." }))).toBe("Sursa nu a fost găsită.");
    expect(explanationOf(finding("F", "eroare_citare", "", { explicatie: "" }))).toBe("rezumat");
    expect(todayDiffers(finding("F", "eroare_citare", "", { verdictAstazi: { status: "corect", data: "2026-11-01", rezumat: "" } }))).toBe("corect");
    expect(todayDiffers(finding("F", "eroare_citare", "", { verdictAstazi: { status: "eroare_citare", data: "2026-11-01", rezumat: "" } }))).toBeNull();
  });
});

describe("diff-ul la nivel de cuvânt", () => {
  it("marchează doar cuvintele schimbate, șters înainte de adăugat", () => {
    expect(wordDiff("conform art. 1.350 alin. (3) C. civ.", "conform art. 1.350 alin. (2) C. civ.")).toEqual([
      { kind: "same", text: "conform art. 1.350 alin. " },
      { kind: "del", text: "(3)" },
      { kind: "ins", text: "(2)" },
      { kind: "same", text: " C. civ." },
    ]);
  });

  it("punctuația de la final nu marchează tot cuvântul; „1.350” rămâne un cuvânt", () => {
    expect(wordDiff("limitată, conform", "limitată nou-înființată, conform")).toEqual([
      { kind: "same", text: "limitată" },
      { kind: "ins", text: " nou-înființată" },
      { kind: "same", text: ", conform" },
    ]);
    expect(wordDiff("art. 1.350.", "art. 1.351.")).toEqual([
      { kind: "same", text: "art. " },
      { kind: "del", text: "1.350" },
      { kind: "ins", text: "1.351" },
      { kind: "same", text: "." },
    ]);
  });

  it("alipește spațiile dintre două schimbări, ca diff-ul să nu se fărâmițeze", () => {
    expect(wordDiff("a b c", "x y z")).toEqual([
      { kind: "del", text: "a b c" },
      { kind: "ins", text: "x y z" },
    ]);
  });

  it("eliminarea și textele identice", () => {
    expect(wordDiff("pasaj de eliminat", "")).toEqual([{ kind: "del", text: "pasaj de eliminat" }]);
    expect(wordDiff("la fel", "la fel")).toEqual([{ kind: "same", text: "la fel" }]);
  });

  it("adaugă contextul din paragraf, tăiat la 60 de caractere cu „…”", () => {
    const before = "Prima parte a paragrafului, destul de lungă încât să fie tăiată la început, ";
    const after = " și o continuare lungă după corectură, care trebuie și ea tăiată la final cu puncte.";
    const parts = suggestionDiff(sug("200 lei", "500 lei"), `${before}200 lei${after}`);
    expect(parts.map((p) => p.kind)).toEqual(["same", "del", "ins", "same"]);
    expect(parts[0].text.startsWith("…")).toBe(true);
    expect(parts[0].text.length).toBeLessThanOrEqual(61);
    expect(parts[1].text).toBe("200");
    expect(parts[2].text).toBe("500");
    expect(parts[3].text.endsWith("…")).toBe(true);
    expect(parts[3].text.length).toBeLessThanOrEqual(61);
    // fără paragraf (sau textul nu e în el): doar diff-ul corecturii
    expect(suggestionDiff(sug("200 lei", "500 lei"), "alt text")).toEqual(wordDiff("200 lei", "500 lei"));
  });
});

describe("variantele și acțiunea principală", () => {
  it("felul variantei", () => {
    expect(variantKind(sug("a", "b"))).toBe("inlocuire");
    expect(variantKind(sug("a", ""))).toBe("eliminare");
    expect(variantKind(sug("text  ", "text"))).toBe("pastrare");
    expect(variantKind(sug("", "clauză nouă"))).toBe("manual");
  });

  it("nimic preselectat la două sau mai multe variante; o singură corectură e aleasă", () => {
    const one = suggestionViews({ sugestii: [sug("a", "b")] });
    const many = suggestionViews({ sugestii: [sug("a", "b", "Dacă e SRL"), sug("a", "c", "Dacă e SA")] });
    expect(initialChoice(one)).toBe(0);
    expect(initialChoice(many)).toBeNull();
    expect(many.map((v) => v.situatie)).toEqual(["Dacă e SRL", "Dacă e SA"]);
  });

  it("tastele 1–9 aleg varianta dacă există", () => {
    expect(choiceFromKey("1", 3)).toBe(0);
    expect(choiceFromKey("3", 3)).toBe(2);
    expect(choiceFromKey("4", 3)).toBeNull();
    expect(choiceFromKey("0", 3)).toBeNull();
    expect(choiceFromKey("a", 3)).toBeNull();
  });

  it("„Aplică varianta” e dezactivat până la alegere; „Am verificat” fără corectură", () => {
    const st = { resolved: false, running: false, canResolve: true };
    const err = finding("F", "eroare_citare", "p");
    const many = suggestionViews({ sugestii: [sug("a", "b", "x"), sug("a", "c", "y")] });
    expect(primaryAction(err, many, null, st)).toEqual({ kind: "aplica-varianta", enabled: false });
    expect(primaryAction(err, many, 1, st)).toEqual({ kind: "aplica-varianta", enabled: true });
    expect(primaryAction(err, suggestionViews({ sugestii: [sug("a", "b")] }), 0, st)).toEqual({ kind: "aplica", enabled: true });
    expect(primaryAction(err, suggestionViews({ sugestii: [sug("a", "b")] }), 0, { ...st, running: true })).toEqual({ kind: "aplica", enabled: false });
    expect(primaryAction(err, [], null, st)).toEqual({ kind: "verificat", enabled: true });
    expect(primaryAction(err, suggestionViews({ sugestii: [sug("", "clauză")] }), 0, st)).toEqual({ kind: "verificat", enabled: true });
    expect(primaryAction(finding("F", "corect", "p"), [], null, st)).toBeNull();
    expect(primaryAction(err, many, 1, { ...st, resolved: true })).toBeNull();
  });
});

describe("tastatura", () => {
  it("tastele din 08b, fără modificatori", () => {
    expect(keyIntent({ key: "j" })).toEqual({ kind: "next" });
    expect(keyIntent({ key: "k" })).toEqual({ kind: "prev" });
    expect(keyIntent({ key: "a" })).toEqual({ kind: "apply" });
    expect(keyIntent({ key: "i" })).toEqual({ kind: "ignore" });
    expect(keyIntent({ key: "v" })).toEqual({ kind: "verify" });
    expect(keyIntent({ key: "d" })).toEqual({ kind: "details" });
    expect(keyIntent({ key: "o" })).toEqual({ kind: "source" });
    expect(keyIntent({ key: "Escape" })).toEqual({ kind: "close" });
    expect(keyIntent({ key: "2" })).toEqual({ kind: "variant", index: 1 });
    expect(keyIntent({ key: "a", metaKey: true })).toBeNull();
    expect(keyIntent({ key: "x" })).toBeNull();
  });

  it("nu reacționează în câmpuri, în editor sau în meniuri", () => {
    expect(isTypingTarget({ tagName: "INPUT" })).toBe(true);
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: "BUTTON", closest: (s: string) => (s.includes("menu") ? {} : null) })).toBe(true);
    expect(isTypingTarget({ tagName: "BUTTON", closest: () => null })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
