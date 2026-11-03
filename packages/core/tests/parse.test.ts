import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isZipFile, parseDoc } from "../src/parse/doc";
import { segmentsFromDoc } from "../src/document/segments";

describe("extragerea textului din DOC", () => {
  it("produce un document Tiptap cu segId pe fiecare paragraf", async () => {
    const buf = readFileSync(new URL("./fixtures/contract-test.doc", import.meta.url));
    const r = await parseDoc(buf, "contract-test.doc");
    expect(r.kind).toBe("doc");
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(r.segments[0].text).toBe("CONTRACT DE SOCIETATE");
    expect(r.segments.some((s) => s.text.includes("art. 999"))).toBe(true);
    expect(segmentsFromDoc(r.doc, { meta: r.meta })).toEqual(r.segments);
    const ids = r.doc.content.map((n) => n.attrs?.segId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(r.warnings[0]).toContain("formatarea originală și imaginile nu sunt păstrate");
  });

  it("păstrează ghilimelele românești și liniile de pauză", async () => {
    // fixture scris de textutil (macOS) în formatul Word 97
    const r = await parseDoc(readFileSync(new URL("./fixtures/ghilimele.doc", import.meta.url)), "ghilimele.doc");
    expect(r.segments[0].text).toBe("Contract „Exemplu” – art. 5 — final.");
  });

  it("recunoaște fișierele .doc care sunt de fapt DOCX", async () => {
    const zip = Buffer.from("PK\u0003\u0004rest");
    expect(isZipFile(zip)).toBe(true);
    await expect(parseDoc(zip, "x.doc")).rejects.toThrow("DOCX");
  });
});

describe("imaginile pentru OCR", () => {
  it("pune imaginea într-un PDF de o pagină, cu proporțiile ei încadrate în A4", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const { imageToPdf } = await import("../src/parse/ocr");
    // PNG 1×1, transparent
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    const pdf = await PDFDocument.load(await imageToPdf(png, "png"));
    expect(pdf.getPageCount()).toBe(1);
    const { width, height } = pdf.getPage(0).getSize();
    expect(Math.round(width)).toBe(595);
    expect(Math.round(height)).toBe(595);
  });
});

describe("PDF-urile fără strat de text (scanări, planșe)", () => {
  it("la încărcare (fără OCR) nu sunt o eroare: paginile așteaptă recunoașterea", async () => {
    const { imageToPdf } = await import("../src/parse/ocr");
    const { parsePdf } = await import("../src/parse/pdf");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    const pdf = await imageToPdf(png, "png");
    const r = await parsePdf(pdf, "plansa.pdf", { ocr: false });
    expect(r.segments).toHaveLength(0);
    expect(r.unreadablePages).toEqual([1]);
    // cu OCR, dacă nici recunoașterea nu găsește text, PDF-ul chiar nu are ce citi
    const ai = { run: async () => ({ structured: { pagini: [{ pagina: 1, lizibil: false, paragrafe: [] }] }, stopReason: "end_turn" }) } as never;
    await expect(parsePdf(pdf, "plansa.pdf", { ai })).rejects.toThrow(/nu conține text/);
  });
});
