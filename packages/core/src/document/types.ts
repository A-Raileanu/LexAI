/**
 * Documentul în format JSON Tiptap v3 (contractul din docs/arhitectura/document-json.md).
 * Tipuri minime, compatibile cu `JSONContent`, fără dependență de Tiptap.
 */

export interface DocMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: DocMark[];
}

/** Rădăcina: `{ type: "doc", content: Block[] }`. */
export interface TiptapDoc extends DocNode {
  type: "doc";
  content: DocNode[];
}

export interface DocumentMeta {
  page: {
    size: "A4" | "Letter";
    orientation: "portrait" | "landscape";
    marginsMm: { top: number; right: number; bottom: number; left: number };
  };
  /** spațiul implicit după paragraf, în pt (ca „Spacing After” din Word) */
  defaults: { fontFamily: string; fontSizePt: number; lineHeight: number; spaceAfterPt: number };
  /** anteturi (păstrate pentru export; afișate doar informativ) */
  headers: DocNode[][];
  footers: DocNode[][];
  footnotes: { id: string; content: DocNode[] }[];
}

export const DEFAULT_DOCUMENT_META: DocumentMeta = {
  page: { size: "A4", orientation: "portrait", marginsMm: { top: 25, right: 25, bottom: 25, left: 25 } },
  defaults: { fontFamily: "Times New Roman", fontSizePt: 12, lineHeight: 1.15, spaceAfterPt: 6 },
  headers: [],
  footers: [],
  footnotes: [],
};
