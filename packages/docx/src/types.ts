/**
 * Tipurile contractului comun (docs/arhitectura/document-json.md). `JSONContent` e o variantă
 * locală, compatibilă structural cu cea din Tiptap, ca pachetul să nu depindă de editor.
 */

import type { ImageExt } from "./image";

export interface JSONMark {
  type: string;
  attrs?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface JSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: JSONMark[];
  text?: string;
  [key: string]: unknown;
}

export type Block = JSONContent;

export interface PageMarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Tipul unui antet sau subsol, ca în Word: implicit, doar pe prima pagină sau pe paginile pare. */
export type HeaderKind = "default" | "first" | "even";

export interface DocumentMeta {
  page: {
    size: "A4" | "Letter";
    orientation: "portrait" | "landscape";
    marginsMm: PageMarginsMm;
    /** distanța de la marginea foii până la antet / subsol, în mm (implicit 12,5 mm, ca în Word) */
    headerMm?: number;
    footerMm?: number;
  };
  /** spațiul implicit după paragraf, în pt (ca „Spacing After” din Word) */
  defaults: { fontFamily: string; fontSizePt: number; lineHeight: number; spaceAfterPt: number };
  headers: Block[][];
  footers: Block[][];
  /** tipul fiecărui antet / subsol de pe același index; lipsă = toate implicite */
  headerKinds?: HeaderKind[];
  footerKinds?: HeaderKind[];
  /** antet și subsol diferite pe prima pagină (fără unul „first”, prima pagină nu are antet) */
  titlePage?: boolean;
  /** antet și subsol diferite pe paginile pare */
  evenOdd?: boolean;
  footnotes: { id: string; content: Block[] }[];
}

/** O imagine din document, cu octeții ei. */
export interface ImageSource {
  data: Uint8Array;
  /** tipul MIME (image/png, image/jpeg, image/gif, image/bmp, image/webp) */
  contentType: string;
  /** extensia, fără punct */
  ext: ImageExt;
}

export interface ImportOptions {
  /**
   * Unde se păstrează o imagine: primește octeții și întoarce adresa pusă în `src`. Implicit,
   * imaginea rămâne în document ca data URL.
   */
  imageSrc?: (img: ImageSource) => string;
}

export interface ImportResult {
  content: JSONContent;
  meta: DocumentMeta;
  warnings: string[];
}

/** Valorile implicite din contract: A4 portret, margini 25 mm, Times New Roman 12 pt, 1.15, 6 pt după paragraf. */
export function defaultMeta(): DocumentMeta {
  return {
    page: { size: "A4", orientation: "portrait", marginsMm: { top: 25, right: 25, bottom: 25, left: 25 } },
    defaults: { fontFamily: "Times New Roman", fontSizePt: 12, lineHeight: 1.15, spaceAfterPt: 6 },
    headers: [],
    footers: [],
    footnotes: [],
  };
}

/** Distanța implicită a antetului și subsolului față de marginea foii (720 twips în Word). */
export const HEADER_DISTANCE_MM = 12.7;

/**
 * Antetul sau subsolul care apare pe pagina dată (numerotată de la 1), după regulile din Word:
 * prima pagină are zona „first” când `titlePage`, paginile pare zona „even” când `evenOdd`,
 * restul zona implicită. Întoarce `undefined` când pagina nu are antet / subsol.
 */
export function zoneForPage(meta: Pick<DocumentMeta, "headers" | "footers" | "headerKinds" | "footerKinds" | "titlePage" | "evenOdd">, zone: "headers" | "footers", page: number): Block[] | undefined {
  const list = meta[zone] ?? [];
  const kinds = (zone === "headers" ? meta.headerKinds : meta.footerKinds) ?? [];
  const byKind = (k: HeaderKind) => {
    const i = list.findIndex((_, idx) => (kinds[idx] ?? "default") === k);
    return i < 0 ? undefined : list[i];
  };
  if (page === 1 && meta.titlePage) return byKind("first");
  if (page % 2 === 0 && meta.evenOdd) return byKind("even");
  return byKind("default");
}
