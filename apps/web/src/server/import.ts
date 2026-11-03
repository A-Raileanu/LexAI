import "server-only";
import path from "node:path";
import { importDocx, textFromParagraphs, defaultMeta, type DocumentMeta, type JSONContent } from "@lexai/docx";
import { storeImage } from "./images";

export interface ImportedDocument {
  content: JSONContent;
  meta: DocumentMeta;
  warnings: string[];
  /** paginile PDF fără strat de text, care au nevoie de recunoaștere optică (OCR) */
  pagesNeedingOcr: number[];
}

export class ImportError extends Error {}

export const ACCEPTED = {
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".pdf": "application/pdf",
} as const;

export function fileKind(name: string): keyof typeof ACCEPTED | null {
  const ext = path.extname(name).toLowerCase();
  return ext in ACCEPTED ? (ext as keyof typeof ACCEPTED) : null;
}

/**
 * `images: false` când contează doar textul (fișierele de context): imaginile nu se mai salvează.
 * Textul trimis la AI vine din segmente, care ignoră imaginile.
 */
export async function importFile(bytes: Uint8Array, name: string, opts: { images?: boolean } = {}): Promise<ImportedDocument> {
  const kind = fileKind(name);
  if (!kind) throw new ImportError("Format neacceptat. Încarcă un fișier DOCX, DOC sau PDF.");
  if (kind === ".docx") {
    try {
      const r = await importDocx(bytes, { imageSrc: opts.images === false ? () => "" : storeImage });
      return { ...r, pagesNeedingOcr: [] };
    } catch {
      throw new ImportError("Fișierul DOCX nu a putut fi citit. Verifică dacă nu este deteriorat sau protejat cu parolă.");
    }
  }
  const { parseDoc, parsePdf } = await import("@lexai/core/parse");
  if (kind === ".doc") {
    try {
      const r = await parseDoc(Buffer.from(bytes), name);
      return { content: r.doc as JSONContent, meta: { ...defaultMeta(), ...r.meta } as DocumentMeta, warnings: r.warnings, pagesNeedingOcr: [] };
    } catch (e) {
      throw new ImportError(e instanceof Error && /DOCX/.test(e.message) ? e.message : "Fișierul DOC nu a putut fi citit. Poate fi deteriorat.");
    }
  }
  try {
    // fără OCR la încărcare: paginile scanate sunt trimise worker-ului, ca să nu blocăm cererea
    const r = await parsePdf(bytes, name, { ocr: false });
    const content = r.segments.length ? (r.doc as JSONContent) : textFromParagraphs([""]);
    // setările de pagină, fontul și spațierea deduse din PDF (cele sigure; restul rămân implicite)
    return { content, meta: { ...defaultMeta(), ...r.meta } as DocumentMeta, warnings: r.warnings, pagesNeedingOcr: r.unreadablePages };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    throw new ImportError(/password|parol/i.test(msg) ? "PDF-ul este protejat cu parolă. Elimină protecția și încearcă din nou." : "Nu am putut citi PDF-ul. Poate fi deteriorat.");
  }
}

export function titleFromFileName(name: string): string {
  return path.basename(name, path.extname(name)).replace(/[_]+/g, " ").trim() || "Document fără titlu";
}
