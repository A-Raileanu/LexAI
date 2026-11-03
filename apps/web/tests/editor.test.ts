import { defaultMeta, exportDocx, importDocx, type JSONContent } from "@lexai/docx";
import { Editor } from "@tiptap/react";
import { afterEach, describe, expect, it } from "vitest";
import { createEditorBridge } from "../src/features/editor/bridge";
import { alignBlocks, buildDiffDocument, changedSegIds, diffWords, flattenBlocks } from "../src/features/editor/diff";
import { computeHighlightRanges } from "../src/features/editor/highlights";
import { findBlock, locateInBlock } from "../src/features/editor/locate";
import { contractExtensions } from "../src/features/editor/schema/extensions";
import { findPlaceholders } from "../src/features/editor/schema/placeholder";
import { fixSegIds } from "../src/features/editor/schema/seg-id";
import { acceptAllSuggestions, findSuggestionRanges, rejectAllSuggestions } from "../src/features/editor/schema/suggestions";
import { findMatches } from "../src/features/editor/search";

const p = (segId: string, text: string, extra: Partial<JSONContent> = {}): JSONContent => ({
  type: "paragraph",
  attrs: { segId },
  content: text ? [{ type: "text", text }] : undefined,
  ...extra,
});
const doc = (...content: JSONContent[]): JSONContent => ({ type: "doc", content });

const editors: Editor[] = [];
/** Editor fără DOM. Pluginurile se atașează la montare, așa că le atașăm manual, ca în aplicație. */
function headless(content: JSONContent) {
  const editor = new Editor({ element: null, extensions: contractExtensions(), content });
  editor.view.updateState(editor.state.reconfigure({ plugins: editor.extensionManager.plugins }));
  const fix = fixSegIds(editor.state);
  if (fix) editor.view.dispatch(fix);
  editors.push(editor);
  return editor;
}
afterEach(() => {
  while (editors.length) editors.pop()!.destroy();
});

function segIds(editor: Editor): (string | null)[] {
  const out: (string | null)[] = [];
  editor.state.doc.descendants((n) => {
    if (n.type.name === "paragraph" || n.type.name === "heading") out.push((n.attrs.segId as string | null) ?? null);
    return true;
  });
  return out;
}

describe("diff de cuvinte", () => {
  it("găsește cuvintele înlocuite, cu ștersul înaintea inseratului", () => {
    const ops = diffWords("Chiria lunară este de 1.000 lei, plătibilă lunar.", "Chiria lunară este de 1.200 lei, plătibilă lunar.");
    expect(ops).toEqual([
      { type: "equal", text: "Chiria lunară este de " },
      { type: "delete", text: "1.000" },
      { type: "insert", text: "1.200" },
      { type: "equal", text: " lei, plătibilă lunar." },
    ]);
  });

  it("grupează cuvintele consecutive modificate într-o singură zonă", () => {
    const ops = diffWords("a b c d", "a x y d");
    expect(ops).toEqual([
      { type: "equal", text: "a " },
      { type: "delete", text: "b c" },
      { type: "insert", text: "x y" },
      { type: "equal", text: " d" },
    ]);
  });

  it("textele identice nu au modificări", () => {
    expect(diffWords("același text", "același text")).toEqual([{ type: "equal", text: "același text" }]);
  });

  it("potrivește blocurile după segId, apoi în ordine", () => {
    const oldB = flattenBlocks(doc(p("a", "Unu"), p("b", "Doi"), p("x", "Art. 9. Preavizul este de 15 zile."), p("c", "Trei")));
    const newB = flattenBlocks(doc(p("a", "Unu"), p("c", "Trei"), p("b", "Doi"), p("y", "Art. 9. Preavizul este de 30 de zile.")));
    const { newToOld } = alignBlocks(oldB, newB);
    // a rămâne; dintre b și c (inversate) doar unul poate fi păstrat fără încrucișare
    expect(newToOld[0]).toBe(0);
    expect(newToOld.filter((i) => i >= 0).length).toBeGreaterThanOrEqual(2);
  });

  it("construiește documentul de comparare cu inserări, ștergeri și contoare", () => {
    const oldDoc = doc(p("a", "Chiria este de 1.000 lei."), p("b", "Preavizul este de 15 zile."), p("c", "Final."));
    const newDoc = doc(p("a", "Chiria este de 1.200 lei."), p("c", "Final."), p("d", "Clauză nouă adăugată."));
    const r = buildDiffDocument(oldDoc, newDoc);
    expect(r.identical).toBe(false);
    expect(r.changes).toBe(3); // 1.000→1.200, paragraful b șters, paragraful d adăugat
    expect(r.wordsAdded).toBe(1 + 3);
    expect(r.wordsRemoved).toBe(1 + 5);
    const blocks = r.doc.content!;
    expect(blocks.map((b) => b.attrs?.diff)).toEqual(["changed", "removed", "same", "added"]);
    const first = blocks[0].content!;
    expect(first.find((n) => n.marks?.some((m) => m.type === "diffDelete"))?.text).toBe("1.000");
    expect(first.find((n) => n.marks?.some((m) => m.type === "diffInsert"))?.text).toBe("1.200");
  });

  it("păstrează formatarea textului neschimbat în blocurile modificate", () => {
    const oldDoc = doc({ type: "paragraph", attrs: { segId: "a" }, content: [{ type: "text", text: "Art. 5", marks: [{ type: "bold" }] }, { type: "text", text: " vechi" }] });
    const newDoc = doc({ type: "paragraph", attrs: { segId: "a" }, content: [{ type: "text", text: "Art. 5", marks: [{ type: "bold" }] }, { type: "text", text: " nou" }] });
    const r = buildDiffDocument(oldDoc, newDoc);
    expect(r.doc.content![0].content![0]).toMatchObject({ text: "Art. 5", marks: [{ type: "bold" }] });
  });

  it("versiunile identice", () => {
    const d = doc(p("a", "Text"));
    expect(buildDiffDocument(d, d).identical).toBe(true);
  });

  it("changedSegIds întoarce blocurile noi sau modificate", () => {
    const oldDoc = doc(p("a", "Unu"), p("b", "Doi"));
    const newDoc = doc(p("a", "Unu"), p("b", "Doi modificat"), p("c", "Trei"));
    expect(changedSegIds(oldDoc, newDoc)).toEqual(["b", "c"]);
  });
});

describe("localizarea citatelor", () => {
  it("ignoră diacriticele, sedilele, majusculele și spațiile", () => {
    const editor = headless(doc(p("s1", "Potrivit art. 1.824  din Codul civil, preavizul nu poate fi mai scurt.")));
    const block = findBlock(editor.state.doc, "s1")!;
    const r = locateInBlock(block, "art. 1.824 din codul civil")!;
    expect(editor.state.doc.textBetween(r.from, r.to)).toBe("art. 1.824  din Codul civil");

    const editor2 = headless(doc(p("s2", "Obligaţiile părţilor sunt stabilite în anexă.")));
    const b2 = findBlock(editor2.state.doc, "s2")!;
    const r2 = locateInBlock(b2, "obligatiile partilor")!;
    expect(editor2.state.doc.textBetween(r2.from, r2.to)).toBe("Obligaţiile părţilor");
  });

  it("cade pe tot blocul când citatul lipsește", () => {
    const editor = headless(doc(p("s1", "Primul paragraf."), p("s2", "Al doilea paragraf.")));
    const ranges = computeHighlightRanges(editor.state.doc, [
      { id: "f1", segId: "s2", quote: "inexistent cu totul aici", status: "eroare_citare" },
      { id: "f2", segId: "s1", quote: "primul", status: "corect" },
      { id: "f3", segId: "lipsa", quote: "x", status: "neverificat" },
    ]);
    expect(ranges).toHaveLength(2);
    const f1 = ranges.find((r) => r.id === "f1")!;
    expect(f1.fallback).toBe(true);
    expect(editor.state.doc.textBetween(f1.from, f1.to)).toBe("Al doilea paragraf.");
    const f2 = ranges.find((r) => r.id === "f2")!;
    expect(editor.state.doc.textBetween(f2.from, f2.to)).toBe("Primul");
  });

  it("caută fără diacritice în bara de căutare", () => {
    const editor = headless(doc(p("s1", "Părțile convin. Partile semnează.")));
    expect(findMatches(editor.state.doc, "partile")).toHaveLength(2);
  });
});

describe("segId", () => {
  it("completează segId-urile lipsă la încărcare", () => {
    const editor = headless(doc({ type: "paragraph", content: [{ type: "text", text: "fără id" }] }, { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Titlu" }] }));
    const ids = segIds(editor);
    expect(ids.every((id) => typeof id === "string" && /^p_[a-z0-9]{6}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rămân unice după despărțirea unui paragraf (Enter), iar prima parte își păstrează id-ul", () => {
    const editor = headless(doc(p("p_aaaaaa", "Primul rând al doilea rând")));
    editor.commands.setTextSelection(1 + "Primul rând".length);
    editor.commands.splitBlock();
    const ids = segIds(editor);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe("p_aaaaaa");
    expect(ids[1]).not.toBe("p_aaaaaa");
    expect(ids[1]).toBeTruthy();
  });

  it("rămân unice după lipirea unui bloc copiat, fără a schimba originalul", () => {
    const editor = headless(doc(p("p_orig01", "Original"), p("p_altul1", "Altul")));
    // copia e lipită înaintea originalului
    editor.commands.insertContentAt(0, p("p_orig01", "Copie"));
    const ids = segIds(editor);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    const original = findBlock(editor.state.doc, "p_orig01")!;
    expect(original.node.textContent).toBe("Original");
  });

  it("păstrează id-urile la tastare", () => {
    const editor = headless(doc(p("p_keep01", "Text")));
    editor.commands.insertContentAt(3, { type: "text", text: "xyz" });
    expect(segIds(editor)).toEqual(["p_keep01"]);
  });
});

describe("sugestii AI", () => {
  const content = doc(p("s1", "Chiria lunară este de 1.000 lei."), p("s2", "Preavizul este de 15 zile."));

  it("inserează sugestia ca ștergere + inserare și o acceptă", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    const id = bridge.insertSuggestion({ segId: "s1", original: "1.000 lei", replacement: "1.200 lei", findingId: "f1" })!;
    expect(id).toMatch(/^sug_/);
    const ranges = findSuggestionRanges(editor.state.doc, id);
    expect(ranges.map((r) => [r.kind, r.text])).toEqual([
      ["delete", "1.000 lei"],
      ["insert", "1.200 lei"],
    ]);
    expect(bridge.listSuggestions()).toHaveLength(1);
    // textul pentru analiză nu include inserarea neacceptată
    expect(bridge.getSegments()[0].text).toBe("Chiria lunară este de 1.000 lei.");

    expect(bridge.acceptSuggestion(id)).toBe(true);
    expect(editor.state.doc.child(0).textContent).toBe("Chiria lunară este de 1.200 lei.");
    expect(findSuggestionRanges(editor.state.doc)).toHaveLength(0);
  });

  it("respinge sugestia", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    const id = bridge.insertSuggestion({ segId: "s2", original: "15 zile", replacement: "30 de zile" })!;
    expect(bridge.rejectSuggestion(id)).toBe(true);
    expect(editor.state.doc.child(1).textContent).toBe("Preavizul este de 15 zile.");
    expect(findSuggestionRanges(editor.state.doc)).toHaveLength(0);
  });

  it("acceptă sau respinge toate sugestiile", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    bridge.insertSuggestion({ segId: "s1", original: "1.000", replacement: "1.200" });
    bridge.insertSuggestion({ segId: "s2", original: "15", replacement: "30" });
    expect(acceptAllSuggestions(editor)).toBe(true);
    expect(editor.state.doc.textContent).toBe("Chiria lunară este de 1.200 lei.Preavizul este de 30 zile.");

    const editor2 = headless(content);
    const bridge2 = createEditorBridge(editor2);
    bridge2.insertSuggestion({ segId: "s1", original: "1.000", replacement: "1.200" });
    expect(rejectAllSuggestions(editor2)).toBe(true);
    expect(editor2.state.doc.textContent).toBe("Chiria lunară este de 1.000 lei.Preavizul este de 15 zile.");
  });

  it("comenzile Tiptap pentru sugestii merg și în chain()", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    const id = bridge.insertSuggestion({ segId: "s1", original: "1.000", replacement: "1.200" })!;
    const commands = editor.commands as unknown as Record<string, (id?: string) => boolean>;
    expect(commands.acceptSuggestion(id)).toBe(true);
    expect(editor.state.doc.child(0).textContent).toBe("Chiria lunară este de 1.200 lei.");
  });

  it("aplică o corectură direct în text, o anulează din panou și cu Cmd+Z", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    const edit = bridge.applyReplacement({ segId: "s1", original: "1.000 lei", replacement: "1.200 lei" })!;
    expect(edit).toMatchObject({ segId: "s1", original: "1.000 lei", replacement: "1.200 lei", before: "Chiria lunară este de ", after: "." });
    // editare obișnuită: fără marcaje de sugestie
    expect(editor.state.doc.child(0).textContent).toBe("Chiria lunară este de 1.200 lei.");
    expect(findSuggestionRanges(editor.state.doc)).toHaveLength(0);
    expect(bridge.getSegments()[0].text).toBe("Chiria lunară este de 1.200 lei.");
    // „Anulează” readuce textul original
    expect(bridge.revertReplacement(edit)).toBe(true);
    expect(editor.state.doc.child(0).textContent).toBe("Chiria lunară este de 1.000 lei.");
    // a doua anulare nu mai schimbă nimic
    expect(bridge.revertReplacement(edit)).toBe(true);
    expect(editor.state.doc.child(0).textContent).toBe("Chiria lunară este de 1.000 lei.");

    // un singur pas în istoric: Cmd+Z anulează înlocuirea
    bridge.applyReplacement({ segId: "s2", original: "15 zile", replacement: "30 de zile" });
    expect(editor.state.doc.child(1).textContent).toBe("Preavizul este de 30 de zile.");
    expect(editor.commands.undo()).toBe(true);
    expect(editor.state.doc.child(1).textContent).toBe("Preavizul este de 15 zile.");
  });

  it("aplică o eliminare și o anulează", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    const edit = bridge.applyReplacement({ segId: "s1", original: " lunară", replacement: "" })!;
    expect(editor.state.doc.child(0).textContent).toBe("Chiria este de 1.000 lei.");
    expect(bridge.revertReplacement(edit)).toBe(true);
    expect(editor.state.doc.child(0).textContent).toBe("Chiria lunară este de 1.000 lei.");
  });

  it("nu anulează o corectură al cărei pasaj a fost modificat între timp", () => {
    const editor = headless(content);
    const bridge = createEditorBridge(editor);
    const edit = bridge.applyReplacement({ segId: "s1", original: "1.000", replacement: "1.200" })!;
    editor.commands.setContent(doc(p("s1", "Text cu totul nou."), p("s2", "Preavizul este de 15 zile.")));
    expect(bridge.revertReplacement(edit)).toBe(false);
    expect(bridge.applyReplacement({ segId: "s1", original: "nu există", replacement: "x" })).toBeNull();
  });

  it("nu inserează sugestii când textul original lipsește", () => {
    const editor = headless(content);
    expect(createEditorBridge(editor).insertSuggestion({ segId: "s1", original: "nu există", replacement: "x" })).toBeNull();
  });

  it("listează câmpurile de completat", () => {
    const editor = headless(
      doc({
        type: "paragraph",
        attrs: { segId: "s1" },
        content: [
          { type: "text", text: "Între " },
          { type: "text", text: "[● numele proprietarului]", marks: [{ type: "placeholder", attrs: { hint: "numele proprietarului" } }] },
          { type: "text", text: " și " },
          { type: "text", text: "[● chiriaș]", marks: [{ type: "placeholder", attrs: { hint: "chiriaș" } }] },
        ],
      }),
    );
    expect(findPlaceholders(editor.state.doc).map((x) => x.hint)).toEqual(["numele proprietarului", "chiriaș"]);
    expect(createEditorBridge(editor).listPlaceholders()[1]).toMatchObject({ index: 1, segId: "s1", text: "[● chiriaș]" });
  });
});

describe("imagini în document", () => {
  const IMG = { type: "image", attrs: { src: "/api/imagini/abc.png", alt: "Sigla", title: null, width: 120, height: 60 } };
  const withImage = (segId: string, before: string, after: string): JSONContent => ({
    type: "paragraph",
    attrs: { segId },
    content: [{ type: "text", text: before }, IMG, { type: "text", text: after }],
  });

  it("schema păstrează imaginea inline, cu dimensiunile ei", () => {
    const editor = headless(doc(withImage("p1", "Înainte ", " după")));
    const p1 = (editor.getJSON() as JSONContent).content![0];
    expect(p1.content!.map((c) => c.type)).toEqual(["text", "image", "text"]);
    expect(p1.content![1].attrs).toMatchObject({ src: "/api/imagini/abc.png", alt: "Sigla", width: 120, height: 60 });
  });

  it("citatele se găsesc peste imagine; imaginea nu intră în text", () => {
    const editor = headless(doc(withImage("p1", "Înainte ", " după")));
    const block = findBlock(editor.state.doc, "p1")!;
    const r = locateInBlock(block, "Înainte  după")!;
    expect(editor.state.doc.textBetween(r.from, r.to)).toBe("Înainte  după");
  });

  it("compararea versiunilor nu pierde imaginea dintr-un paragraf modificat", () => {
    const res = buildDiffDocument(doc(withImage("p1", "Prețul este ", " lei")), doc(withImage("p1", "Prețul total este ", " lei")));
    const images = JSON.stringify(res.doc).match(/"type":"image"/g) ?? [];
    expect(images.length).toBeGreaterThanOrEqual(1);
  });
});

describe("JSON-ul editorului prin DOCX", () => {
  it("face drumul editor → exportDocx → importDocx păstrând textul, structura și formatarea", async () => {
    const editor = headless(
      doc(
        { type: "heading", attrs: { segId: "h1", level: 1 }, content: [{ type: "text", text: "CONTRACT DE ÎNCHIRIERE" }] },
        {
          type: "paragraph",
          attrs: { segId: "p1", textAlign: "justify", indentPt: 36, firstLineIndentPt: 18, lineHeight: 1.5, spaceBeforePt: 6, spaceAfterPt: 12 },
          content: [
            { type: "text", text: "Între " },
            { type: "text", text: "Ion Popescu", marks: [{ type: "bold" }, { type: "textStyle", attrs: { fontFamily: "Arial", fontSize: "14pt", color: "#c00000" } }] },
            { type: "text", text: ", domiciliat în " },
            { type: "text", text: "[● adresa]", marks: [{ type: "placeholder", attrs: { hint: "adresa" } }] },
            { type: "text", text: "." },
          ],
        },
        { type: "bulletList", content: [{ type: "listItem", content: [p("l1", "Primul punct")] }, { type: "listItem", content: [p("l2", "Al doilea punct")] }] },
        { type: "pageBreak" },
        {
          type: "table",
          content: [
            { type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: [200], backgroundColor: "#eeeeee" }, content: [p("c1", "Celula 1")] }, { type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: [300] }, content: [p("c2", "Celula 2")] }] },
          ],
        },
        p("p2", "Final"),
      ),
    );
    const json = editor.getJSON() as JSONContent;
    const buf = await exportDocx(json, defaultMeta());
    const back = await importDocx(buf);

    const texts = (d: JSONContent) => flattenBlocks(d).map((b) => b.text).filter((t) => t.trim());
    expect(texts(back.content)).toEqual(texts(json));

    const types = back.content.content!.map((n) => n.type);
    expect(types).toContain("heading");
    expect(types).toContain("bulletList");
    expect(types).toContain("table");
    expect(types).toContain("pageBreak");

    const para = flattenBlocks(back.content).find((b) => b.text.startsWith("Între"))!.node;
    expect(para.attrs).toMatchObject({ textAlign: "justify", indentPt: 36, firstLineIndentPt: 18, lineHeight: 1.5, spaceBeforePt: 6, spaceAfterPt: 12 });
    const bold = para.content!.find((n) => n.text === "Ion Popescu")!;
    expect(bold.marks).toEqual(expect.arrayContaining([{ type: "bold" }, expect.objectContaining({ type: "textStyle", attrs: expect.objectContaining({ fontFamily: "Arial", fontSize: "14pt", color: "#c00000" }) })]));
    expect(para.content!.find((n) => n.marks?.some((m) => m.type === "placeholder"))).toMatchObject({ text: "[● adresa]" });

    const cell = back.content.content!.find((n) => n.type === "table")!.content![0].content![0];
    expect(cell.attrs).toMatchObject({ backgroundColor: "#eeeeee", colwidth: [200] });

    // și se încarcă din nou în editor fără pierderi
    const again = headless(back.content);
    expect(texts(again.getJSON() as JSONContent)).toEqual(texts(json));
  });
});

describe("comparare: atributele implicite", () => {
  it("nu marchează ca formatare modificată atributele null scrise de editor", () => {
    const stored = doc(p("a", "Text"));
    const fromEditor = doc({ type: "paragraph", attrs: { segId: "a", textAlign: null, indentPt: null, lineHeight: null }, content: [{ type: "text", text: "Text" }] });
    expect(buildDiffDocument(stored, fromEditor).identical).toBe(true);
  });
});
