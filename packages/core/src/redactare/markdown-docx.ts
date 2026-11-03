import JSZip from "jszip";

/**
 * Proiectele redactate sunt scrise în Markdown simplu și exportate în Word, cu formatarea
 * obișnuită a actelor juridice: Times New Roman 12, text aliniat stânga-dreapta, titlul centrat,
 * pagini numerotate. Se recunosc: titluri (#, ##, ###), paragrafe, liste (-, 1.), citate (>),
 * tabele (| … |), separatoare (---), **îngroșat**, *cursiv*, [text](url).
 * Rândurile consecutive rămân pe rânduri separate (blocurile de semnătură, adresele).
 *
 * Fișierul DOCX (OOXML) este scris direct, cu jszip.
 */

const CM = 567; // twips

export type DocxRun = { text: string; bold?: boolean; italics?: boolean; link?: string } | { break: true } | { tab: true };

export interface DocxParagraph {
  type: "paragraph";
  style?: "Heading1" | "Heading2" | "Heading3" | "Quote";
  align?: "center" | "left" | "both";
  /** nivelul în lista cu buline */
  bullet?: 0 | 1;
  indent?: { left: number; hanging?: number };
  /** linie orizontală (separator) */
  rule?: boolean;
  runs: DocxRun[];
}

export interface DocxTable {
  type: "table";
  rows: { header: boolean; cells: DocxRun[][] }[];
}

export type DocxBlock = DocxParagraph | DocxTable;

function inline(text: string): DocxRun[] {
  const out: DocxRun[] = [];
  // „____” (liniile de semnătură) și „***” rămân text: marcajele cer un caracter util lângă ele
  const re = /\*\*([^*\s](?:.*?[^*\s])?)\*\*|(?<![\w*])\*([^*\s](?:[^*]*?[^*\s])?)\*(?![\w*])|(?<![\w_])_([^_\s](?:[^_]*?[^_\s])?)_(?![\w_])|`(.+?)`|\[([^\]]+)\]\((https?:[^)\s]+)\)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    if (m[1]) out.push({ text: m[1], bold: true });
    else if (m[2] || m[3]) out.push({ text: (m[2] ?? m[3])!, italics: true });
    else if (m[4]) out.push({ text: m[4] });
    else if (m[5]) out.push({ text: m[5], link: m[6] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** Rândurile unui paragraf, cu întreruperi de rând între ele. */
function lines(ls: string[]): DocxRun[] {
  return ls.flatMap((l, i) => (i === 0 ? inline(l) : [{ break: true } as const, ...inline(l)]));
}

function table(rows: string[]): DocxTable {
  const cells = rows.map((r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
  const width = Math.max(...cells.map((r) => r.length));
  return {
    type: "table",
    rows: cells.map((r, i) => ({
      header: i === 0,
      cells: Array.from({ length: width }, (_, j) => (i === 0 ? [{ text: r[j] ?? "", bold: true }] : inline(r[j] ?? ""))),
    })),
  };
}

export function markdownToDocxChildren(md: string): DocxBlock[] {
  const out: DocxBlock[] = [];
  const src = md.replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  let firstHeading = true;
  while (i < src.length) {
    const line = src[i];
    const t = line.trim();
    if (!t) {
      i++;
      continue;
    }
    const h = t.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length as 1 | 2 | 3;
      out.push({ type: "paragraph", style: `Heading${level}`, align: level === 1 && firstHeading ? "center" : "left", runs: inline(h[2]) });
      if (level === 1) firstHeading = false;
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})$/.test(t)) {
      out.push({ type: "paragraph", rule: true, runs: [] });
      i++;
      continue;
    }
    if (t.startsWith("|")) {
      const rows: string[] = [];
      while (i < src.length && src[i].trim().startsWith("|")) rows.push(src[i++].trim());
      out.push(table(rows.filter((r) => !/^\|[\s:|-]+\|$/.test(r))));
      continue;
    }
    const bullet = t.match(/^[-*•]\s+(.*)$/);
    if (bullet) {
      out.push({ type: "paragraph", bullet: line.search(/\S/) >= 2 ? 1 : 0, align: "both", runs: inline(bullet[1]) });
      i++;
      continue;
    }
    const numbered = t.match(/^(\d+(?:\.\d+)*[.)])\s+(.*)$/);
    if (numbered) {
      out.push({
        type: "paragraph",
        align: "both",
        indent: { left: Math.round(0.75 * CM), hanging: Math.round(0.75 * CM) },
        runs: [{ text: numbered[1] }, { tab: true }, ...inline(numbered[2])],
      });
      i++;
      continue;
    }
    if (t.startsWith(">")) {
      const q: string[] = [];
      while (i < src.length && src[i].trim().startsWith(">")) q.push(src[i++].trim().replace(/^>\s?/, ""));
      out.push({ type: "paragraph", style: "Quote", indent: { left: CM }, align: "both", runs: lines(q) });
      continue;
    }
    // paragraf: rândurile până la un rând gol sau un alt bloc
    const para: string[] = [];
    while (i < src.length) {
      const l = src[i].trim();
      if (!l || /^(#{1,3}\s|[-*•]\s|\d+(?:\.\d+)*[.)]\s|>|\||-{3,}$|\*{3,}$)/.test(l)) break;
      para.push(l);
      i++;
    }
    out.push({ type: "paragraph", align: "both", runs: lines(para) });
  }
  return out;
}

// ───────────────────────── OOXML ─────────────────────────

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const W_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function runXml(r: DocxRun, links: string[]): string {
  if ("break" in r) return "<w:r><w:br/></w:r>";
  if ("tab" in r) return "<w:r><w:tab/></w:r>";
  const props = [r.bold ? "<w:b/>" : "", r.italics ? "<w:i/>" : "", r.link ? '<w:rStyle w:val="Hyperlink"/>' : ""].join("");
  const run = `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(r.text)}</w:t></w:r>`;
  if (!r.link) return run;
  links.push(r.link);
  return `<w:hyperlink r:id="rIdLink${links.length}">${run}</w:hyperlink>`;
}

function paragraphXml(p: DocxParagraph, links: string[]): string {
  const ppr = [
    p.style ? `<w:pStyle w:val="${p.style}"/>` : "",
    p.bullet !== undefined ? `<w:numPr><w:ilvl w:val="${p.bullet}"/><w:numId w:val="1"/></w:numPr>` : "",
    p.rule ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="999999"/></w:pBdr>' : "",
    p.indent ? `<w:ind w:left="${p.indent.left}"${p.indent.hanging ? ` w:hanging="${p.indent.hanging}"` : ""}/>` : "",
    p.align ? `<w:jc w:val="${p.align}"/>` : "",
  ].join("");
  return `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ""}${p.runs.map((r) => runXml(r, links)).join("")}</w:p>`;
}

function tableXml(t: DocxTable, links: string[]): string {
  const cols = Math.max(1, ...t.rows.map((r) => r.cells.length));
  const width = Math.floor(9072 / cols);
  const border = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="auto"/>`;
  return [
    "<w:tbl>",
    `<w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${["top", "left", "bottom", "right", "insideH", "insideV"].map(border).join("")}</w:tblBorders></w:tblPr>`,
    `<w:tblGrid>${`<w:gridCol w:w="${width}"/>`.repeat(cols)}</w:tblGrid>`,
    ...t.rows.map(
      (row) =>
        `<w:tr>${row.header ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${row.cells
          .map((c) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/></w:tcPr><w:p>${c.map((r) => runXml(r, links)).join("")}</w:p></w:tc>`)
          .join("")}</w:tr>`,
    ),
    "</w:tbl>",
  ].join("");
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W_NS}>
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="240"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="180" w:after="80"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:i/><w:color w:val="000000"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:rPr><w:i/><w:color w:val="444444"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>
</w:styles>`;

const NUMBERING = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${W_NS}>
<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>
<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
<w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="◦"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr></w:lvl>
</w:abstractNum>
<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

const field = (instr: string) =>
  `<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>`;
const small = (t: string) => `<w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r>`;

const FOOTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr ${W_NS}><w:p><w:pPr><w:jc w:val="center"/></w:pPr>${small("Pagina ")}${field("PAGE")}${small(" din ")}${field("NUMPAGES")}</w:p></w:ftr>`;

export async function markdownToDocx(md: string, titlu: string): Promise<Buffer> {
  const links: string[] = [];
  const body = markdownToDocxChildren(md)
    .map((b) => (b.type === "table" ? tableXml(b, links) + "<w:p/>" : paragraphXml(b, links)))
    .join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W_NS}><w:body>${body}<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const rel = (id: string, type: string, target: string, external = false) =>
    `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${esc(target)}"${external ? ' TargetMode="External"' : ""}/>`;
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  );
  zip.file(
    "docProps/core.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(titlu)}</dc:title><dc:creator>LexAI</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${[
      rel("rIdStyles", "styles", "styles.xml"),
      rel("rIdNumbering", "numbering", "numbering.xml"),
      rel("rIdFooter", "footer", "footer1.xml"),
      ...links.map((l, i) => rel(`rIdLink${i + 1}`, "hyperlink", l, true)),
    ].join("")}</Relationships>`,
  );
  zip.file("word/document.xml", document);
  zip.file("word/styles.xml", STYLES);
  zip.file("word/numbering.xml", NUMBERING);
  zip.file("word/footer1.xml", FOOTER);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
