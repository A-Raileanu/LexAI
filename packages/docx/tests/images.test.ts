import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildPdfDefinition, exportDocx, importDocx, zoneForPage, type ImageSource, type PdfNode } from "../src";
import { nodes, text } from "./helpers";

// PNG 1×1 transparent
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const EMF = Buffer.from([1, 0, 0, 0, 0x6c, 0, 0, 0, 0, 0, 0, 0]);

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const drawing = (rId: string, cx: number, cy: number, descr: string) => `<w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="1" name="Imagine" descr="${descr}"/>
  <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="x"/></pic:nvPicPr>
  <pic:blipFill><a:blip r:embed="${rId}"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

const textBox = (t: string) => `<w:r><mc:AlternateContent>
  <mc:Choice Requires="wps"><w:drawing><wp:anchor><wp:extent cx="1000" cy="1000"/><wp:docPr id="2" name="Casetă"/><a:graphic><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
    <wps:wsp><wps:txbx><w:txbxContent><w:p><w:r><w:t>${t}</w:t></w:r></w:p></w:txbxContent></wps:txbx></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice>
  <mc:Fallback><w:pict><v:shape><v:textbox><w:txbxContent><w:p><w:r><w:t>${t} (VML)</w:t></w:r></w:p></w:txbxContent></v:textbox></v:shape></w:pict></mc:Fallback>
</mc:AlternateContent></w:r>`;

async function buildDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="emf" ContentType="image/x-emf"/></Types>`,
  );
  zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rImg" Type="${REL}/image" Target="media/logo.png"/>
      <Relationship Id="rEmf" Type="${REL}/image" Target="media/desen.emf"/>
      <Relationship Id="rH1" Type="${REL}/header" Target="header1.xml"/>
      <Relationship Id="rH2" Type="${REL}/header" Target="header2.xml"/>
      <Relationship Id="rF1" Type="${REL}/footer" Target="footer1.xml"/>
      <Relationship Id="rSet" Type="${REL}/settings" Target="settings.xml"/>
    </Relationships>`,
  );
  zip.file("word/media/logo.png", PNG);
  zip.file("word/media/desen.emf", EMF);
  zip.file("word/settings.xml", `<?xml version="1.0"?><w:settings ${NS}><w:evenAndOddHeaders w:val="0"/></w:settings>`);
  zip.file("word/header1.xml", `<?xml version="1.0"?><w:hdr ${NS}><w:p><w:r><w:t>Antet pagini următoare</w:t></w:r></w:p></w:hdr>`);
  zip.file("word/_rels/header2.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rLogo" Type="${REL}/image" Target="media/logo.png"/></Relationships>`);
  zip.file("word/header2.xml", `<?xml version="1.0"?><w:hdr ${NS}><w:p>${drawing("rLogo", 952500, 476250, "Sigla")}</w:p></w:hdr>`);
  zip.file("word/footer1.xml", `<?xml version="1.0"?><w:ftr ${NS}><w:p><w:r><w:t>Subsol</w:t></w:r></w:p></w:ftr>`);
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document ${NS}><w:body>
      <w:p><w:r><w:t xml:space="preserve">Înainte </w:t></w:r>${drawing("rImg", 1905000, 952500, "Ștampila societății")}<w:r><w:t xml:space="preserve"> după.</w:t></w:r></w:p>
      <w:p><w:r><w:t>Paragraf cu casetă.</w:t></w:r>${textBox("Text din casetă")}</w:p>
      <w:p><w:r><w:pict><v:shape style="width:150pt;height:75pt"><v:imagedata r:id="rImg" o:title="VML"/></v:shape></w:pict></w:r></w:p>
      <w:p>${drawing("rEmf", 9525, 9525, "")}</w:p>
      <w:p><w:r><w:t>Final</w:t></w:r></w:p>
      <w:sectPr><w:headerReference w:type="default" r:id="rH1"/><w:headerReference w:type="first" r:id="rH2"/><w:footerReference w:type="default" r:id="rF1"/>
        <w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="567" w:footer="851"/><w:titlePg/></w:sectPr>
    </w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("importDocx — imagini, casete de text, anteturi pe tipuri", () => {
  it("păstrează imaginile inline, cu dimensiunea și descrierea lor", async () => {
    const r = await importDocx(await buildDocx());
    const imgs = nodes(r.content, "image");
    expect(imgs).toHaveLength(2);
    expect(imgs[0].attrs).toMatchObject({ alt: "Ștampila societății", width: 200, height: 100 });
    expect(String(imgs[0].attrs!.src)).toMatch(/^data:image\/png;base64,/);
    // VML: 150pt × 75pt
    expect(imgs[1].attrs).toMatchObject({ alt: "VML", width: 200, height: 100 });
    // imaginea stă între textele paragrafului
    const p = r.content.content![0];
    expect(p.content!.map((n) => n.type)).toEqual(["text", "image", "text"]);
    expect(text(p)).toBe("Înainte  după.");
  });

  it("semnalează imaginile care nu pot fi afișate (EMF)", async () => {
    const r = await importDocx(await buildDocx());
    expect(r.warnings.some((w) => w.includes("EMF"))).toBe(true);
  });

  it("caseta de text devine paragraf după paragraful care o ancorează (varianta DrawingML)", async () => {
    const r = await importDocx(await buildDocx());
    const texts = r.content.content!.map((b) => text(b));
    const i = texts.indexOf("Paragraf cu casetă.");
    expect(texts[i + 1]).toBe("Text din casetă");
    expect(texts.join("|")).not.toContain("(VML)");
  });

  it("anteturile își păstrează tipul; prima pagină are sigla, celelalte textul", async () => {
    const r = await importDocx(await buildDocx());
    expect(r.meta.titlePage).toBe(true);
    expect(r.meta.evenOdd).toBeUndefined();
    expect(r.meta.headerKinds).toEqual(["default", "first"]);
    expect(text(zoneForPage(r.meta, "headers", 2)!)).toBe("Antet pagini următoare");
    expect(nodes(zoneForPage(r.meta, "headers", 1)!, "image")).toHaveLength(1);
    // subsolul există doar implicit: prima pagină (titlePg) nu are subsol
    expect(zoneForPage(r.meta, "footers", 1)).toBeUndefined();
    expect(text(zoneForPage(r.meta, "footers", 3)!)).toBe("Subsol");
    expect(r.meta.page.headerMm).toBe(10);
    expect(r.meta.page.footerMm).toBe(15);
  });

  it("imageSrc decide unde se păstrează imaginile; aceeași imagine e salvată o dată", async () => {
    const seen: ImageSource[] = [];
    const r = await importDocx(await buildDocx(), {
      imageSrc: (img) => {
        seen.push(img);
        return `/api/imagini/${seen.length}.${img.ext}`;
      },
    });
    // logo.png e folosit în corp (de două ori) și în antet, dar e citit și salvat o singură dată
    expect(seen.map((s) => [s.ext, s.contentType])).toEqual([["png", "image/png"]]);
    expect(nodes(r.content, "image").map((n) => n.attrs!.src)).toEqual(["/api/imagini/1.png", "/api/imagini/1.png"]);
  });

  it("exportul DOCX păstrează imaginile și antetul primei pagini (ciclu export → import)", async () => {
    const r = await importDocx(await buildDocx());
    const again = await importDocx(await exportDocx(r.content, r.meta));
    expect(nodes(again.content, "image")).toHaveLength(2);
    expect(nodes(again.content, "image")[0].attrs).toMatchObject({ width: 200, height: 100, alt: "Ștampila societății" });
    expect(again.meta.titlePage).toBe(true);
    expect(nodes(zoneForPage(again.meta, "headers", 1)!, "image")).toHaveLength(1);
    expect(text(zoneForPage(again.meta, "headers", 2)!)).toBe("Antet pagini următoare");
    expect(zoneForPage(again.meta, "footers", 1)).toBeUndefined();
  });

  it("PDF: imaginea stă între bucățile de text; prima pagină are antetul ei", async () => {
    const r = await importDocx(await buildDocx());
    const def = buildPdfDefinition(r.content, r.meta);
    // rând scurt: coloane, cu textul pe linia de jos a imaginii
    const cols = def.content[0].columns as PdfNode[];
    expect(cols.map((n) => (n.image ? "image" : "text"))).toEqual(["text", "image", "text"]);
    expect(cols[1]).toMatchObject({ width: 150, height: 75 });
    expect((cols[0].margin as number[])[1]).toBeGreaterThan(50);
    // text lung: imaginea pe rândul ei, între bucățile de text
    const long = { ...r.content, content: [{ type: "paragraph", content: [{ type: "text", text: "lung ".repeat(60) }, nodes(r.content, "image")[0], { type: "text", text: "final" }] }] };
    const stack = buildPdfDefinition(long, r.meta).content[0].stack as PdfNode[];
    expect(stack.map((n) => (n.image ? "image" : "text"))).toEqual(["text", "image", "text"]);
    const first = def.header!(1, 3) as PdfNode;
    expect(JSON.stringify(first)).toContain('"image":"data:image/png;base64,');
    expect(JSON.stringify(def.header!(2, 3))).toContain("Antet pagini următoare");
    expect(def.footer!(1, 3)).toBeNull();
    expect(JSON.stringify(def.footer!(2, 3))).toContain("Subsol");
  });
});
