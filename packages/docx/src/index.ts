export { importDocx } from "./import";
export { exportDocx, type ExportOptions } from "./export";
export { decodeDataUrl, displaySize, imageSize, IMAGE_MIME, sniffImage, type ImageData, type ImageExt, type ImageResolver } from "./image";
export { textFromParagraphs } from "./plain";
export { createSegIdGenerator } from "./segid";
export { defaultMeta, HEADER_DISTANCE_MM, zoneForPage } from "./types";
export { mergeMeta } from "./style";
export type { Block, DocumentMeta, HeaderKind, ImageSource, ImportOptions, ImportResult, JSONContent, JSONMark, PageMarginsMm } from "./types";
export { buildPdfDefinition, identityFonts, pickFontFamily, PT_PER_MM, type PdfDefinition, type PdfFonts, type PdfNode, type PdfNodeInfo, type PdfOptions } from "./pdf";
