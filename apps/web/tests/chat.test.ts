import type { JSONContent } from "@lexai/docx";
import { TextSelection } from "@tiptap/pm/state";
import { Editor } from "@tiptap/react";
import { afterEach, describe, expect, it } from "vitest";
import { validateChanges, type ChatProposal } from "@lexai/core/chat";
import { documentLayout, type TiptapDoc } from "@lexai/core/document";
import { proposalEdit } from "../src/features/chat/edits";
import { blocksPhrase, formatSummary, proposalLocation, proposalSummary, proposalsHeading } from "../src/features/chat/labels";
import { createEditorBridge, type AppliedBlocks } from "../src/features/editor/bridge";
import { ChatMarks, chatMarksKey } from "../src/features/editor/chat-marks";
import { migrateLayout } from "../src/features/editor/panel/layout";
import { contractExtensions } from "../src/features/editor/schema/extensions";

const p = (segId: string, text: string): JSONContent => ({ type: "paragraph", attrs: { segId }, content: [{ type: "text", text }] });
const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });
const content = doc(p("s1", "Chiria lunară este de 1.000 lei, plătibilă lunar."), p("s2", "Preavizul este de 15 zile. Preavizul se comunică în scris."));

const editors: Editor[] = [];
function headless(c: JSONContent) {
  const editor = new Editor({ element: null, extensions: [...contractExtensions(), ChatMarks], content: c });
  editor.view.updateState(editor.state.reconfigure({ plugins: editor.extensionManager.plugins }));
  editors.push(editor);
  return editor;
}
afterEach(() => {
  while (editors.length) editors.pop()!.destroy();
});

/** Poziția din document a caracterului `index` din paragraful `n` (paragrafe simple, fără noduri inline). */
function pos(editor: Editor, n: number, index: number) {
  let at = 0;
  for (let i = 0; i < n; i++) at += editor.state.doc.child(i).nodeSize;
  return at + 1 + index;
}

describe("aplicarea modificărilor propuse în chat", () => {
  it("aplică mai multe modificări într-o singură tranzacție (un singur Cmd+Z)", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    const out = bridge.applyProposals([
      { segId: "s1", start: 22, original: "1.000 lei", replacement: "1.200 lei" },
      { segId: "s2", start: 18, original: "15 zile", replacement: "30 de zile" },
      { segId: "s1", start: 6, original: " lunară", replacement: "" },
    ]);
    expect(out.every(Boolean)).toBe(true);
    expect(editor.state.doc.child(0).textContent).toBe("Chiria este de 1.200 lei, plătibilă lunar.");
    expect(editor.state.doc.child(1).textContent).toBe("Preavizul este de 30 de zile. Preavizul se comunică în scris.");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.child(0).textContent).toBe("Chiria lunară este de 1.000 lei, plătibilă lunar.");
    expect(editor.state.doc.child(1).textContent).toBe("Preavizul este de 15 zile. Preavizul se comunică în scris.");
  });

  it("aplică la poziția din propunere când textul se repetă și o anulează după context", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    // „Preavizul” apare de două ori: poziția din propunere decide
    const [edit] = bridge.applyProposals([{ segId: "s2", start: 27, original: "Preavizul", replacement: "Notificarea" }]);
    expect(editor.state.doc.child(1).textContent).toBe("Preavizul este de 15 zile. Notificarea se comunică în scris.");
    expect(bridge.revertReplacement(edit!)).toBe(true);
    expect(editor.state.doc.child(1).textContent).toBe("Preavizul este de 15 zile. Preavizul se comunică în scris.");
  });

  it("nu aplică dacă pasajul s-a schimbat între timp; o mutare a textului e tolerată", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    editor.view.dispatch(editor.state.tr.insertText("Notă: ", 1));
    const out = bridge.applyProposals([
      // mutat cu 6 caractere, dar unic: se aplică
      { segId: "s1", start: 22, original: "1.000 lei", replacement: "1.200 lei" },
      // dispărut: nu se aplică nimic
      { segId: "s2", start: 18, original: "20 de zile", replacement: "30 de zile" },
      // ambiguu și mutat: nu se aplică
      { segId: "s2", start: 3, original: "Preavizul", replacement: "X" },
    ]);
    expect(out.map(Boolean)).toEqual([true, false, false]);
    expect(editor.state.doc.child(0).textContent).toBe("Notă: Chiria lunară este de 1.200 lei, plătibilă lunar.");
    expect(editor.state.doc.child(1).textContent).toBe("Preavizul este de 15 zile. Preavizul se comunică în scris.");
  });

  it("din două modificări peste același pasaj o aplică doar pe una", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    const out = bridge.applyProposals([
      { segId: "s1", start: 22, original: "1.000 lei", replacement: "1.200 lei" },
      { segId: "s1", start: 22, original: "1.000", replacement: "2.000" },
    ]);
    expect(out.filter(Boolean)).toHaveLength(1);
    expect(editor.state.doc.child(0).textContent).toMatch(/^Chiria lunară este de [12]\.[02]00 lei/);
  });
});

describe("selecția ca domeniu al cererii", () => {
  it("dă paragrafele și pozițiile din textul lor", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    expect(bridge.selectionScope()).toBeNull();
    expect(bridge.selectionKey()).toBe("");
    // de la „1.000” (s1) până după „Preavizul este” (s2)
    editor.view.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, pos(editor, 0, 22), pos(editor, 1, 14))));
    expect(bridge.selectionScope()).toEqual({
      segments: [
        { segmentId: "s1", start: 22, end: 49 },
        { segmentId: "s2", start: 0, end: 14 },
      ],
      text: "1.000 lei, plătibilă lunar.\nPreavizul este",
    });
    expect(bridge.selectionKey()).not.toBe("");
  });

  it("marchează selecția și pasajul previzualizat ca decorații, fără istoric", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    bridge.markChatScope(true);
    expect(chatMarksKey.getState(editor.state)?.scope).toBe(true);
    expect(bridge.previewProposal({ segId: "s2", start: 18, original: "15 zile" })).toBe(true);
    expect(chatMarksKey.getState(editor.state)?.target).toEqual({ mode: "inline", from: pos(editor, 1, 18), to: pos(editor, 1, 25) });
    expect(bridge.previewProposal({ segId: "s2", start: 18, original: "nu există" })).toBe(false);
    expect(chatMarksKey.getState(editor.state)?.target).toBeNull();
    expect(editor.commands.undo()).toBe(false);
  });
});

describe("lățimea panoului", () => {
  it("mărește lățimea veche implicită și păstrează panoul închis sau mai lat", () => {
    // 360 px din 1440 = 25 %
    const migrated = JSON.parse(migrateLayout(JSON.stringify({ main: 75, side: 25 }), 1440)!);
    expect(migrated.side).toBeCloseTo((440 / 1440) * 100);
    expect(migrated.main + migrated.side).toBeCloseTo(100);
    const closed = JSON.stringify({ main: 100, side: 0 });
    expect(migrateLayout(closed, 1440)).toBe(closed);
    const wide = JSON.stringify({ main: 60, side: 40 });
    expect(migrateLayout(wide, 1440)).toBe(wide);
    expect(migrateLayout(null, 1440)).toBeNull();
    expect(migrateLayout("{", 1440)).toBeNull();
  });
});

// ───────────────────────── modificări structurale ─────────────────────────

const contract = doc(
  { type: "heading", attrs: { segId: "t", level: 1 }, content: [{ type: "text", text: "CONTRACT" }] },
  { type: "paragraph", attrs: { segId: "a3", textAlign: "justify", firstLineIndentPt: 36 }, content: [{ type: "text", text: "Art. 3. Prețul este de 10.000 lei.", marks: [{ type: "textStyle", attrs: { fontFamily: "Arial", fontSize: "11pt" } }] }] },
  p("a4", "Art. 4. Prestatorul execută serviciile."),
  p("a9", "Art. 9. Calendarul:"),
  p("c1", "Etapa 1 – analiză: 1–15 martie;"),
  p("c2", "Etapa 2 – dezvoltare: aprilie;"),
  p("c3", "Etapa 3 – recepție: mai."),
  p("an", "ANEXA 1"),
);
const tableBlocks = [{ tip: "tabel" as const, antet: ["Etapa", "Perioada"], randuri: [["Analiză", "1–15 martie"], ["Dezvoltare", "aprilie"], ["Recepție", "mai"]] }];
const texts = (editor: Editor) => {
  const out: string[] = [];
  editor.state.doc.forEach((n) => out.push(n.type.name === "pageBreak" ? "⏎" : n.type.name === "table" ? `[tabel ${n.childCount}×${n.firstChild?.childCount}]` : n.textContent));
  return out;
};
const segIds = (editor: Editor) => {
  const ids: string[] = [];
  editor.state.doc.descendants((n) => {
    if (typeof n.attrs.segId === "string") ids.push(n.attrs.segId);
  });
  return ids;
};

describe("aplicarea modificărilor structurale", () => {
  it("mai multe propuneri de feluri diferite, primite în altă ordine, se aplică împreună și se anulează cu un singur Cmd+Z", () => {
    const editor = headless(contract);
    const bridge = createEditorBridge(editor);
    const layout = documentLayout(editor.getJSON() as TiptapDoc);
    // agentul le trimite în altă ordine decât cea din document
    const check = validateChanges(
      [
        { tip: "inlocuire_blocuri", segmente: ["c1", "c2", "c3"], text_original: "Etapa 1", blocuri: tableBlocks },
        { tip: "inserare", segment_id: "an", pozitie: "inainte", blocuri: [{ tip: "salt_pagina" }] },
        { tip: "inserare", segment_id: "a4", pozitie: "dupa", blocuri: [{ tip: "paragraf", text: "Art. 4^1. **Confidențialitate.**" }] },
        { segment_id: "a3", text_original: "10.000 lei", text_nou: "12.000 lei" },
      ],
      layout.segments,
      null,
      { pageBreaks: layout.pageBreaks, blocks: layout.blocks },
    );
    expect(check.ok).toBe(true);
    if (!check.ok) return;
    expect(check.proposals.map((x) => x.kind)).toEqual(["text", "inserare", "inlocuire_blocuri", "inserare"]);
    const before = JSON.stringify(editor.getJSON());
    const out = bridge.applyProposals(check.proposals.map(proposalEdit));
    expect(out.every(Boolean)).toBe(true);
    expect(texts(editor)).toEqual(["CONTRACT", "Art. 3. Prețul este de 12.000 lei.", "Art. 4. Prestatorul execută serviciile.", "Art. 4^1. Confidențialitate.", "Art. 9. Calendarul:", "[tabel 4×2]", "⏎", "ANEXA 1"]);
    // segId-uri unice; cele vechi neatinse rămân (ancorele analizei)
    const ids = segIds(editor);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ["t", "a3", "a4", "a9", "an"]) expect(ids).toContain(id);
    for (const id of ["c1", "c2", "c3"]) expect(ids).not.toContain(id);
    // paragraful nou moștenește alinierea, indentarea și fontul ancorei? (ancora a4 e simplă: fără atribute)
    const added = editor.state.doc.child(3);
    expect(added.attrs.textAlign).toBeNull();
    expect(added.child(1).marks.map((m) => m.type.name)).toEqual(["bold"]);
    expect(editor.commands.undo()).toBe(true);
    expect(JSON.stringify(editor.getJSON())).toBe(before);
  });

  it("moștenește formatarea paragrafului-ancoră și inserează la începutul și la sfârșitul documentului", () => {
    const editor = headless(contract);
    const bridge = createEditorBridge(editor);
    const out = bridge.applyProposals([
      { kind: "insert", anchor: "a3", position: "dupa", blocks: [{ tip: "paragraf", text: "Plata se face lunar." }] },
      { kind: "insert", anchor: "t", position: "inainte", blocks: [{ tip: "paragraf", text: "Nr. [● număr]" }] },
      { kind: "insert", anchor: "an", position: "dupa", blocks: [{ tip: "salt_pagina" }, { tip: "titlu", nivel: 2, text: "ANEXA 2" }] },
    ]);
    expect(out.every(Boolean)).toBe(true);
    const t = texts(editor);
    expect(t[0]).toBe("Nr. [● număr]");
    // (StarterKit pune un paragraf gol după un titlu de la final)
    expect(t.filter(Boolean).slice(-3)).toEqual(["ANEXA 1", "⏎", "ANEXA 2"]);
    const plata = editor.state.doc.child(3);
    expect(plata.textContent).toBe("Plata se face lunar.");
    expect(plata.attrs).toMatchObject({ textAlign: "justify", firstLineIndentPt: 36 });
    expect(plata.firstChild!.marks[0].attrs).toMatchObject({ fontFamily: "Arial", fontSize: "11pt" });
    expect(editor.state.doc.child(editor.state.doc.childCount - 2).type.name).toBe("heading");
  });

  it("nu aplică înlocuirea dacă paragrafele s-au schimbat și o anulează după context", () => {
    const editor = headless(contract);
    const bridge = createEditorBridge(editor);
    const replace = { kind: "replace" as const, segIds: ["c1", "c2", "c3"], originals: ["Etapa 1 – analiză: 1–15 martie;", "Etapa 2 – dezvoltare: aprilie;", "Etapa 3 – recepție: mai."], blocks: tableBlocks };
    // textul unui paragraf s-a schimbat: nu se aplică nimic
    const c2 = editor.state.doc.child(5);
    let at = 0;
    for (let i = 0; i < 5; i++) at += editor.state.doc.child(i).nodeSize;
    editor.view.dispatch(editor.state.tr.insertText("!", at + c2.nodeSize - 1));
    expect(bridge.applyProposals([replace])).toEqual([null]);
    editor.commands.undo();
    // o ștergere și o înlocuire, apoi „Anulează” pe fiecare, după o editare în altă parte
    const [applied, deleted] = bridge.applyProposals([replace, { kind: "replace", segIds: ["a4"], originals: ["Art. 4. Prestatorul execută serviciile."], blocks: [] }]);
    expect(applied && deleted).toBeTruthy();
    expect(texts(editor)).toEqual(["CONTRACT", "Art. 3. Prețul este de 10.000 lei.", "Art. 9. Calendarul:", "[tabel 4×2]", "ANEXA 1"]);
    editor.view.dispatch(editor.state.tr.insertText("Notă. ", 1));
    expect(bridge.revertEdit(deleted as AppliedBlocks)).toBe(true);
    expect(bridge.revertEdit(applied as AppliedBlocks)).toBe(true);
    expect(texts(editor)).toEqual(["Notă. CONTRACT", "Art. 3. Prețul este de 10.000 lei.", "Art. 4. Prestatorul execută serviciile.", "Art. 9. Calendarul:", "Etapa 1 – analiză: 1–15 martie;", "Etapa 2 – dezvoltare: aprilie;", "Etapa 3 – recepție: mai.", "ANEXA 1"]);
    expect(segIds(editor)).toContain("c2");
    // a doua anulare nu mai găsește blocurile
    expect(bridge.revertEdit(applied as AppliedBlocks)).toBe(false);
  });

  it("anulează un salt de pagină inserat singur (fără segId-uri)", () => {
    const editor = headless(contract);
    const bridge = createEditorBridge(editor);
    const [e] = bridge.applyProposals([{ kind: "insert", anchor: "an", position: "inainte", blocks: [{ tip: "salt_pagina" }] }]);
    expect(texts(editor).slice(-2)).toEqual(["⏎", "ANEXA 1"]);
    expect(bridge.revertEdit(e!)).toBe(true);
    expect(texts(editor)).not.toContain("⏎");
  });

  it("previzualizează paragrafele înlocuite și locul inserării ca decorații pe blocuri", () => {
    const editor = headless(contract);
    const bridge = createEditorBridge(editor);
    expect(bridge.previewProposal({ kind: "replace", segIds: ["c1", "c2", "c3"] })).toBe(true);
    const t = chatMarksKey.getState(editor.state)?.target;
    expect(t?.mode).toBe("blocks");
    expect(editor.state.doc.slice(t!.from, t!.to).content.childCount).toBe(3);
    expect(bridge.previewProposal({ kind: "insert", anchor: "an", position: "inainte" })).toBe(true);
    expect(chatMarksKey.getState(editor.state)?.target?.mode).toBe("before");
    expect(bridge.previewProposal({ kind: "replace", segIds: ["c1", "c3"] })).toBe(false);
    expect(chatMarksKey.getState(editor.state)?.target).toBeNull();
    expect(editor.commands.undo()).toBe(false);
  });
});

describe("textele cardurilor", () => {
  const loc = new Map([
    ["a3", "Art. 3"],
    ["a4", "Art. 4"],
    ["c1", "Art. 9"],
    ["c3", "Art. 9"],
  ]);
  const ins: ChatProposal = { kind: "inserare", id: "m1", segmentId: "a4", pozitie: "dupa", blocuri: [{ tip: "salt_pagina" }, { tip: "paragraf", text: "a" }, { tip: "paragraf", text: "b" }], explicatie: "", status: "propusa" };
  const rep: ChatProposal = { kind: "inlocuire_blocuri", id: "m2", segmentId: "c1", segmentIds: ["c1", "c2", "c3"], textOriginal: ["", "", ""], blocuri: tableBlocks, explicatie: "", status: "propusa" };
  it("locul, rezumatul și numărul propunerilor", () => {
    expect(proposalLocation(ins, loc)).toBe("După Art. 4");
    expect(proposalLocation(rep, loc)).toBe("Art. 9");
    expect(proposalLocation({ ...rep, segmentIds: ["a3", "c1"] }, loc)).toBe("Art. 9");
    expect(proposalSummary(ins)).toBe("Adaugă un salt de pagină și 2 paragrafe");
    expect(proposalSummary(rep)).toBe("Înlocuiește 3 paragrafe cu un tabel");
    expect(proposalSummary({ ...rep, kind: "stergere_blocuri", segmentIds: ["c1"], blocuri: [] })).toBe("Șterge un paragraf");
    expect(proposalsHeading(1)).toBe("1 modificare propusă");
    expect(proposalsHeading(5)).toBe("5 modificări propuse");
    expect(proposalsHeading(21)).toBe("21 de modificări propuse");
    expect(blocksPhrase([{ tip: "lista", numerotata: true, elemente: ["x"] }, { tip: "titlu", nivel: 2, text: "y" }, { tip: "paragraf", text: "z" }])).toBe("o listă, un titlu și un paragraf");
  });
});

describe("formatarea propusă în chat", () => {
  const marksOf = (editor: Editor, n: number, text: string) => {
    let found: string[] | null = null;
    editor.state.doc.child(n).forEach((c) => {
      if (c.isText && c.text === text) found = c.marks.map((m) => m.type.name);
    });
    return found;
  };

  it("aplică și scoate mark-uri pe pasajul exact, în aceeași tranzacție cu celelalte modificări", () => {
    const editor = headless(doc(p("s1", "Art. 2. Chiria este de 1.000 lei."), { type: "paragraph", attrs: { segId: "s2" }, content: [{ type: "text", text: "Art. 3. ", marks: [{ type: "italic" }] }, { type: "text", text: "Preavizul este de 15 zile." }] }));
    const bridge = createEditorBridge(editor);
    const out = bridge.applyProposals([
      { kind: "format", segId: "s1", start: 0, original: "Art. 2.", styles: { bold: true } },
      { kind: "format", segId: "s2", start: 0, original: "Art. 3.", styles: { bold: true, italic: false } },
      { segId: "s2", start: 26, original: "15 zile", replacement: "**30 de zile**" },
    ]);
    expect(out.every(Boolean)).toBe(true);
    expect(marksOf(editor, 0, "Art. 2.")).toEqual(["bold"]);
    expect(marksOf(editor, 1, "Art. 3.")).toEqual(["bold"]);
    // fără asteriscuri în document: textul nou e aldin
    expect(editor.state.doc.child(1).textContent).toBe("Art. 3. Preavizul este de 30 de zile.");
    expect(marksOf(editor, 1, "30 de zile")).toEqual(["bold"]);
    expect(editor.state.doc.textContent).not.toContain("*");
    // un singur Cmd+Z
    editor.commands.undo();
    expect(marksOf(editor, 0, "Art. 2. Chiria este de 1.000 lei.")).toEqual([]);
    expect(marksOf(editor, 1, "Art. 3. ")).toEqual(["italic"]);
  });

  it("„Anulează” readuce formatarea originală, iar o formatare veche nu se aplică", () => {
    const editor = headless(doc(p("s1", "Art. 2. Chiria este de 1.000 lei.")));
    const bridge = createEditorBridge(editor);
    const [e] = bridge.applyProposals([{ kind: "format", segId: "s1", start: 0, original: "Art. 2.", styles: { bold: true, underline: true } }]);
    expect(marksOf(editor, 0, "Art. 2.")).toEqual(["bold", "underline"]);
    expect(bridge.revertEdit(e!)).toBe(true);
    expect(editor.state.doc.child(0).childCount).toBe(1);
    // textul s-a schimbat: formatarea nu mai găsește pasajul
    editor.view.dispatch(editor.state.tr.insertText("3", 6, 7));
    expect(bridge.applyProposals([{ kind: "format", segId: "s1", start: 0, original: "Art. 2.", styles: { bold: true } }])).toEqual([null]);
  });

  it("textul nou cu *cursiv* se anulează cu formatarea originală", () => {
    const editor = headless(doc({ type: "paragraph", attrs: { segId: "s1" }, content: [{ type: "text", text: "Termen: 15 zile.", marks: [{ type: "underline" }] }] }));
    const bridge = createEditorBridge(editor);
    const [e] = bridge.applyProposals([{ segId: "s1", start: 8, original: "15 zile", replacement: "*30 de zile*" }]);
    expect(editor.state.doc.textContent).toBe("Termen: 30 de zile.");
    expect(marksOf(editor, 0, "30 de zile")).toEqual(["italic", "underline"]);
    expect(bridge.revertEdit(e!)).toBe(true);
    expect(editor.state.doc.textContent).toBe("Termen: 15 zile.");
    expect(editor.state.doc.child(0).childCount).toBe(1);
  });

  it("cardul de formatare are eticheta stilurilor", () => {
    expect(formatSummary({ bold: true, italic: false })).toBe("Formatare: îngroșat, fără cursiv");
    expect(proposalSummary({ kind: "formatare", id: "m1", segmentId: "s1", start: 0, textOriginal: "Art. 2.", stiluri: { bold: true }, explicatie: "", status: "propusa" })).toBe("Formatare: îngroșat");
    expect(proposalEdit({ kind: "formatare", id: "m1", segmentId: "s1", start: 0, textOriginal: "Art. 2.", stiluri: { bold: true }, explicatie: "", status: "propusa" })).toEqual({ kind: "format", segId: "s1", start: 0, original: "Art. 2.", styles: { bold: true } });
  });
});
