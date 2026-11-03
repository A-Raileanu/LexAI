import { IconFileText, IconFileTypePdf, IconFileWord, type Icon } from "@tabler/icons-react";

/**
 * Formatele de export (docs/ux/12-export.md). Un format nou = o intrare aici: `available`
 * spune dacă se poate exporta acum (și de ce nu), `url` dă adresa de descărcare.
 */

export interface ExportContext {
  documentId: string;
  kind: "incarcat" | "generat";
  /** există o analiză finalizată pentru document */
  hasAnalysis: boolean;
}

export interface ExportOptions {
  /** id-ul versiunii; null = conținutul de lucru (ciorna curentă) */
  versionId: string | null;
  /** numele fișierului, fără extensie */
  fileName: string;
  keepHighlights: boolean;
  /** PDF: „Pagina 2 din 5” în subsol */
  pageNumbers?: boolean;
}

export type Availability = { ok: true } | { ok: false; reason: string };

export interface ExportFormat {
  id: string;
  title: string;
  /** titlul scurt din meniul rapid */
  menuTitle: string;
  description: string;
  icon: Icon;
  ext: string;
  buttonLabel: string;
  /** opțiunile afișate în dialog pentru acest format */
  options: { version: boolean; fileName: boolean; keepHighlights: boolean; pageNumbers: boolean };
  available(ctx: ExportContext): Availability;
  url(ctx: ExportContext, opts: ExportOptions): string;
}

function exportUrl(ctx: ExportContext, opts: ExportOptions, format: string): string {
  const q = new URLSearchParams({ format });
  if (opts.versionId) q.set("versiune", opts.versionId);
  if (opts.fileName.trim()) q.set("nume", opts.fileName.trim());
  if (opts.keepHighlights) q.set("evidentieri", "1");
  if (opts.pageNumbers) q.set("pagini", "1");
  return `/api/documente/${ctx.documentId}/export?${q}`;
}

/** DOCX adnotat: doar după o analiză cu rezultat (features/analysis). */
const afterAnalysis = (ctx: ExportContext): Availability => (ctx.hasAnalysis ? { ok: true } : { ok: false, reason: "Rulează mai întâi o analiză." });

export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: "docx-curat",
    title: "DOCX curat",
    menuTitle: "DOCX",
    description: "Textul final, fără marcaje. Pentru trimis, semnat sau editat în Word.",
    icon: IconFileWord,
    ext: "docx",
    buttonLabel: "Descarcă DOCX",
    options: { version: true, fileName: true, keepHighlights: true, pageNumbers: false },
    available: () => ({ ok: true }),
    url: (ctx, opts) => exportUrl(ctx, opts, "docx"),
  },
  {
    id: "pdf",
    title: "PDF",
    menuTitle: "PDF",
    description: "Documentul așa cum arată în editor, gata de trimis sau de printat.",
    icon: IconFileTypePdf,
    ext: "pdf",
    buttonLabel: "Descarcă PDF",
    options: { version: true, fileName: true, keepHighlights: true, pageNumbers: true },
    available: () => ({ ok: true }),
    url: (ctx, opts) => exportUrl(ctx, opts, "pdf"),
  },
  {
    id: "docx-adnotat",
    title: "DOCX adnotat",
    menuTitle: "DOCX adnotat",
    description: "Pasajele citate evidențiate și constatările ca note sub paragrafe. Pentru lucru.",
    icon: IconFileText,
    ext: "docx",
    buttonLabel: "Descarcă DOCX adnotat",
    options: { version: true, fileName: true, keepHighlights: false, pageNumbers: false },
    available: afterAnalysis,
    url: (ctx, opts) => exportUrl(ctx, opts, "docx-adnotat"),
  },
];

export const formatById = (id: string) => EXPORT_FORMATS.find((f) => f.id === id) ?? EXPORT_FORMATS[0];

/** PDF-ul conținutului de lucru, pentru „Printează…”. */
export const printUrl = (ctx: ExportContext) => exportUrl(ctx, { versionId: null, fileName: "", keepHighlights: false }, "pdf");
