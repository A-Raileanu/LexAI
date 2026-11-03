import { describe, expect, it } from "vitest";
import { acteCitate, invocaLegea } from "../src/redactare/conformitate";
import { markdownToDocx, markdownToDocxChildren } from "../src/redactare/markdown-docx";

describe("redactare", () => {
  it("recunoaște trimiterile la acte externe, nu pe cele interne", () => {
    expect(invocaLegea("Litigiile se soluționează potrivit Legii nr. 134/2010 privind Codul de procedură civilă.")).toBe(true);
    expect(invocaLegea("Contractul se completează cu dispozițiile Codului civil.")).toBe(true);
    expect(invocaLegea("Datele se prelucrează conform Regulamentului (UE) 2016/679.")).toBe(true);
    expect(invocaLegea("Potrivit OUG nr. 57/2019, …")).toBe(true);
    expect(invocaLegea("Art. 1. Obiectul contractului")).toBe(false);
    expect(invocaLegea("Plata se face potrivit art. 5 din prezentul contract.")).toBe(false);
    expect(invocaLegea("Decizia de concediere nr. 5 se comunică în scris.")).toBe(false);
  });

  it("identifică actele citate, inclusiv abrevierile și legile de aprobare ale codurilor", () => {
    expect(acteCitate("potrivit art. 1.350 C.civ. și art. 194 C.proc.civ.").sort()).toEqual(["cod:civil", "cod:de procedura civila"]);
    expect(acteCitate("conform Legii nr. 287/2009 privind Codul civil")).toEqual(["cod:civil"]);
    expect(acteCitate("Conform Legii nr. 260/2008 și OUG nr. 40/1999").sort()).toEqual(["260/2008", "40/1999"]);
    expect(acteCitate("Legea nr. 1.234/2020")).toEqual(["1234/2020"]);
  });

  it("exportă Markdown în Word", async () => {
    const md = "# CONTRACT\n\nÎntre **A** și *B*.\nRând nou.\n\n## Art. 1\n\n1.1. Text.\n\n- punct\n\n| A | B |\n|---|---|\n| x | y |\n\n> citat";
    expect(markdownToDocxChildren(md)).toHaveLength(7);
    const buf = await markdownToDocx(md, "CONTRACT");
    expect(buf.subarray(0, 2).toString()).toBe("PK");
    const { default: JSZip } = await import("jszip");
    const sig = await markdownToDocx("Semnătura: ____________________ și *cursiv*", "T");
    const xml = await (await JSZip.loadAsync(sig)).file("word/document.xml")!.async("string");
    expect(xml).toContain("____________________");
  });

  it("scrie un DOCX valid, cu titluri, liste, tabele, legături și numerotarea paginilor", async () => {
    const md = "# TITLU\n\n- unu\n  - doi\n\n| A | B |\n|---|---|\n| [lege](https://legislatie.just.ro/x) | y |";
    const blocks = markdownToDocxChildren(md);
    expect(blocks.map((b) => (b.type === "table" ? "tabel" : (b.style ?? b.bullet ?? "p")))).toEqual(["Heading1", 0, 1, "tabel"]);
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(await markdownToDocx(md, "Titlu & co"));
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('<w:pStyle w:val="Heading1"/>');
    expect(xml).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain('<w:numId w:val="1"/>');
    expect(xml).toContain("<w:tbl>");
    expect(xml).toContain('<w:hyperlink r:id="rIdLink1">');
    const rels = await zip.file("word/_rels/document.xml.rels")!.async("string");
    expect(rels).toContain('Target="https://legislatie.just.ro/x" TargetMode="External"');
    expect(await zip.file("word/footer1.xml")!.async("string")).toContain("NUMPAGES");
    expect(await zip.file("docProps/core.xml")!.async("string")).toContain("<dc:title>Titlu &amp; co</dc:title>");
  });
});
