import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { newSegId, paragraphNode, segmentsFromDoc } from "../document/segments";
import type { DocNode, DocumentMeta, TiptapDoc } from "../document/types";
import type { DocSegment } from "../types";

/**
 * DOC (Word 97–2003) → document Tiptap: corp, anteturi, subsoluri, note de subsol și de final,
 * casete de text și comentarii (ca note). Formatarea originală și imaginile nu se păstrează: textul
 * e împărțit în paragrafe, fiecare cu segId propriu. (DOCX se convertește cu @lexai/docx.)
 */

// `filterUnicode: false`: altfel biblioteca înlocuiește „” cu " și –/— cu -
interface TextOptions {
  filterUnicode?: boolean;
}

interface WordDocument {
  getBody(o?: TextOptions): string;
  getFootnotes(o?: TextOptions): string;
  getEndnotes(o?: TextOptions): string;
  getHeaders(o?: TextOptions & { includeFooters?: boolean }): string;
  getFooters(o?: TextOptions): string;
  getAnnotations(o?: TextOptions): string;
  getTextboxes(o?: TextOptions & { includeHeadersAndFooters?: boolean; includeBody?: boolean }): string;
}

type WordExtractorClass = new () => { extract(source: string | Buffer): Promise<WordDocument> };

// word-extractor este CommonJS, fără tipuri
const load = createRequire(import.meta.url);

export interface ParsedWordDoc {
  kind: "doc";
  fileName: string;
  fileSize: number;
  sha256: string;
  doc: TiptapDoc;
  /** anteturile, subsolurile și notele (setările de pagină rămân cele implicite) */
  meta: Pick<DocumentMeta, "headers" | "footers" | "footnotes">;
  /** segmentele analizei (corp + anteturi, subsoluri, note) */
  segments: DocSegment[];
  warnings: string[];
}

/** Fișierele .doc care sunt de fapt DOCX (arhive ZIP) trebuie convertite cu @lexai/docx. */
export function isZipFile(buffer: Uint8Array): boolean {
  return buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function paragraphs(s: string): string[] {
  return s
    .split(/\r?\n/)
    .map((p) => p.replace(/[\u0007\u000b\u000c]/g, " ").trim())
    .filter(Boolean);
}

export async function parseDoc(buffer: Buffer, fileName: string): Promise<ParsedWordDoc> {
  if (isZipFile(buffer)) throw new Error("Fișierul are extensia .doc, dar este un document DOCX; convertiți-l ca DOCX.");
  const WordExtractor = load("word-extractor") as WordExtractorClass;
  const doc = await new WordExtractor().extract(buffer);
  const used = new Set<string>();
  const blocks = (text: string): DocNode[] => paragraphs(text).map((p) => paragraphNode(p, used));

  const raw = { filterUnicode: false };
  const body = blocks(doc.getBody(raw));
  const headers = blocks(doc.getHeaders({ ...raw, includeFooters: false }));
  const footers = blocks(doc.getFooters(raw));
  const notes = (prefix: string, text: string) => blocks(text).map((b, i) => ({ id: `${prefix}-${i + 1}`, content: [b] }));
  const meta = {
    headers: headers.length ? [headers] : [],
    footers: footers.length ? [footers] : [],
    footnotes: [
      ...notes("nota", doc.getFootnotes(raw)),
      ...notes("nota-final", doc.getEndnotes(raw)),
      ...notes("caseta", doc.getTextboxes({ ...raw, includeHeadersAndFooters: false })),
      ...notes("comentariu", doc.getAnnotations(raw)),
    ],
  };
  const tiptap: TiptapDoc = { type: "doc", content: body.length ? body : [{ type: "paragraph", attrs: { segId: newSegId(used) } }] };
  const segments = segmentsFromDoc(tiptap, { meta });
  const warnings = ["Fișier .doc: formatarea originală și imaginile nu sunt păstrate; textul este împărțit pe paragrafe. Pentru formatare și imagini, salvează documentul ca .docx din Word și încarcă-l din nou."];
  if (segments.length === 0) warnings.push("Documentul nu conține text care să poată fi extras.");
  return {
    kind: "doc",
    fileName,
    fileSize: buffer.length,
    sha256: createHash("sha256").update(buffer).digest("hex"),
    doc: tiptap,
    meta,
    segments,
    warnings,
  };
}
