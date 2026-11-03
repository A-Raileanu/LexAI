import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { importDocx, type ImportResult } from "../src";
import { allSegIds, block, markTypes, nodes, text, textNode, textStyle } from "./helpers";

/** DOCX scris de mână, cu construcțiile pe care Word le produce și biblioteca `docx` nu: moșteniri de stiluri, câmpuri, desene. */
const NS = `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"`;

const STYLES = `<w:styles ${NS}>
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" w:hAnsiTheme="minorHAnsi"/><w:sz w:val="22"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Titlu1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Articol"><w:name w:val="Articol"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="both"/><w:ind w:firstLine="567"/></w:pPr><w:rPr><w:i/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ArticolRosu"><w:name w:val="Articol rosu"/><w:basedOn w:val="Articol"/><w:rPr><w:color w:val="FF0000"/></w:rPr></w:style>
  <w:style w:type="character" w:styleId="Accent"><w:name w:val="Accent"/><w:rPr><w:b/><w:u w:val="single"/></w:rPr></w:style>
</w:styles>`;

const THEME = `<a:theme ${NS}><a:themeElements><a:fontScheme name="x"><a:majorFont><a:latin typeface="Cambria"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme></a:themeElements></a:theme>`;

const NUMBERING = `<w:numbering ${NS}>
  <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum>
  <w:num w:numId="5"><w:abstractNumId w:val="0"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="7"/></w:lvlOverride></w:num>
</w:numbering>`;

const run = (t: string, rPr = "") => `<w:r>${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}<w:t xml:space="preserve">${t}</w:t></w:r>`;

const DOCUMENT = `<w:document ${NS}><w:body>
  <w:p><w:pPr><w:pStyle w:val="Titlu1"/></w:pPr>${run("Titlu localizat")}</w:p>
  <w:p><w:pPr><w:pStyle w:val="ArticolRosu"/></w:pPr>${run("Moștenit ")}${run("accent", '<w:rStyle w:val="Accent"/>')}${run(" drept", "<w:i w:val=\"0\"/>")}</w:p>
  <w:p>${run("Sz implicit Normal")}${run(" majuscule", "<w:caps/>")}${run(" mare", '<w:rFonts w:asciiTheme="majorHAnsi"/>')}</w:p>
  <w:p>
    <w:r><w:t xml:space="preserve">Vezi </w:t></w:r>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> HYPERLINK "https://www.ccr.ro" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>CCR</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>
    <w:r><w:t xml:space="preserve"> și art. </w:t></w:r>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> REF _Ref1 \\h </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>5</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>
    <w:r><w:drawing><a:graphic/></w:drawing></w:r>
    <w:r><w:drawing><a:graphic/></w:drawing></w:r>
  </w:p>
  <w:p><w:ins w:id="1" w:author="x">${run("inserat")}</w:ins><w:del w:id="2" w:author="x"><w:r><w:delText>șters</w:delText></w:r></w:del>${run(" rămas")}</w:p>
  <w:sdt><w:sdtPr/><w:sdtContent><w:p>${run("În control de conținut")}</w:p></w:sdtContent></w:sdt>
  <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr>${run("punctul șapte")}</w:p>
  <w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr>${run("punctul opt")}</w:p>
  <w:p><w:pPr><w:pStyle w:val="Titlu1"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr>${run("Titlu numerotat")}</w:p>
  <w:tbl>
    <w:tblGrid><w:gridCol w:w="1500"/><w:gridCol w:w="1500"/><w:gridCol w:w="3000"/></w:tblGrid>
    <w:tr><w:tc><w:tcPr><w:vMerge w:val="restart"/><w:shd w:val="clear" w:color="auto" w:fill="DDEEFF"/></w:tcPr><w:p>${run("vertical")}</w:p></w:tc><w:tc><w:tcPr><w:gridSpan w:val="2"/></w:tcPr><w:p>${run("orizontal")}</w:p></w:tc></w:tr>
    <w:tr><w:tc><w:tcPr><w:vMerge/></w:tcPr><w:p/></w:tc><w:tc><w:p>${run("b")}</w:p></w:tc><w:tc><w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="5"/></w:numPr></w:pPr>${run("în listă")}</w:p></w:tc></w:tr>
  </w:tbl>
  <w:p><w:pPr><w:sectPr><w:type w:val="nextPage"/></w:sectPr></w:pPr>${run("Sfârșit secțiune 1")}</w:p>
  <w:p>${run("Secțiunea 2")}<w:r><w:rPr><w:highlight w:val="cyan"/></w:rPr><w:t>cyan</w:t></w:r><w:r><w:sym w:font="Symbol" w:char="F0B7"/></w:r><w:unknownThing/></w:p>
  <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body></w:document>`;

const RELS = `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

async function build(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("word/document.xml", DOCUMENT);
  zip.file("word/styles.xml", STYLES);
  zip.file("word/numbering.xml", NUMBERING);
  zip.file("word/theme/theme1.xml", THEME);
  zip.file("word/_rels/document.xml.rels", RELS);
  return zip.generateAsync({ type: "uint8array" });
}

describe("importDocx — XML de Word scris de mână", () => {
  let r: ImportResult;
  beforeAll(async () => {
    r = await importDocx(await build());
  });

  it("ia valorile implicite din docDefaults, temă și stilul Normal", () => {
    expect(r.meta.defaults).toEqual({ fontFamily: "Calibri", fontSizePt: 12, lineHeight: 1.08, spaceAfterPt: 8 });
    expect(r.meta.page).toMatchObject({ size: "Letter", orientation: "portrait", marginsMm: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 } });
  });

  it("recunoaște titlurile după numele stilului (și când id-ul e localizat)", () => {
    const h = block(r.content, "Titlu localizat");
    expect(h).toMatchObject({ type: "heading", attrs: { level: 1, textAlign: "center", spaceAfterPt: 8 } });
    expect(markTypes(h.content![0])).toEqual(["bold", "textStyle"]);
    expect(textStyle(h.content![0])).toEqual({ fontSize: "16pt" });
  });

  it("rezolvă moștenirea stilurilor de paragraf și de caracter", () => {
    const p = block(r.content, "Moștenit");
    expect(p.attrs).toMatchObject({ textAlign: "justify", firstLineIndentPt: 28.35 });
    expect(markTypes(textNode(p, "Moștenit "))).toEqual(["italic", "textStyle"]);
    expect(textStyle(textNode(p, "Moștenit "))).toEqual({ color: "#ff0000" });
    expect(markTypes(textNode(p, "accent"))).toEqual(["bold", "italic", "textStyle", "underline"]);
    expect(markTypes(textNode(p, " drept"))).toEqual(["textStyle"]);
    const q = block(r.content, "Sz implicit");
    expect(q.content![0].marks).toBeUndefined();
    expect(text(q)).toBe("Sz implicit Normal MAJUSCULE mare");
    expect(textStyle(textNode(q, " mare"))).toEqual({ fontFamily: "Cambria" });
  });

  it("păstrează rezultatul câmpurilor, cu link pentru HYPERLINK", () => {
    const p = block(r.content, "Vezi");
    expect(text(p)).toBe("Vezi CCR și art. 5");
    expect(textNode(p, "CCR").marks).toEqual([{ type: "link", attrs: { href: "https://www.ccr.ro" } }]);
  });

  it("acceptă modificările urmărite și citește controalele de conținut", () => {
    expect(text(block(r.content, "inserat"))).toBe("inserat rămas");
    expect(text(r.content)).not.toContain("șters");
    expect(text(r.content)).toContain("În control de conținut");
  });

  it("aplică startOverride și nu pune titlurile în liste", () => {
    const ol = nodes(r.content, "orderedList")[0];
    expect(ol.attrs?.start).toBe(7);
    expect(ol.content!.map(text)).toEqual(["punctul șapte", "punctul opt"]);
    expect(block(r.content, "Titlu numerotat").type).toBe("heading");
  });

  it("citește fuziunile fără w:val și aplatizează listele din celule", () => {
    const [table] = nodes(r.content, "table");
    const [r0, r1] = table.content!;
    expect(r0.content![0].attrs).toEqual({ colspan: 1, rowspan: 2, colwidth: [100], backgroundColor: "#ddeeff" });
    expect(r0.content![1].attrs).toEqual({ colspan: 2, rowspan: 1, colwidth: [100, 200] });
    expect(r1.content!.map(text)).toEqual(["b", "9. în listă"]);
  });

  it("transformă sfârșitul de secțiune în salt de pagină", () => {
    const top = r.content.content!;
    const i = top.findIndex((n) => text(n) === "Sfârșit secțiune 1");
    expect(top[i + 1].type).toBe("pageBreak");
    expect(top[i + 2].type).toBe("paragraph");
  });

  it("convertește evidențierea și simbolurile", () => {
    expect(textStyle(textNode(r.content, "cyan"))).toEqual({ backgroundColor: "#00ffff" });
    expect(text(block(r.content, "Secțiunea 2")).endsWith("·")).toBe(true);
  });

  it("avertizează o singură dată, în română, pentru ce nu se poate importa", () => {
    expect(r.warnings).toEqual(
      expect.arrayContaining([
        "Formele și desenele din document nu au fost importate.",
        "Câmpurile automate (trimiteri, cuprins, date etc.) au fost importate ca text simplu.",
        "Modificările urmărite (Track Changes) au fost importate ca acceptate.",
        "Numerotarea automată a titlurilor nu a fost păstrată.",
        "Listele din celulele de tabel au fost transformate în paragrafe.",
        "Documentul are mai multe secțiuni; setările de pagină sunt preluate din ultima secțiune.",
        "Elemente nerecunoscute, ignorate la import: w:unknownThing.",
      ]),
    );
    expect(new Set(r.warnings).size).toBe(r.warnings.length);
    expect(r.warnings.filter((w) => w.startsWith("Formele"))).toHaveLength(1);
  });

  it("dă segId unic fiecărui paragraf", () => {
    const ids = allSegIds(r);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
