import { addDocumentVersion, contextFiles, createAnalysisJob, dataDir, eq, files } from "@lexai/db";
import { UsageTracker, imageToPdf, parsePdf, transcribePdfPages, type OcrImageKind } from "@lexai/core";
import { readFileSync } from "node:fs";
import type { JobHandler, JobContext } from "../runner";

export interface OcrJobInput {
  documentId: string;
  fileId: string;
  pages: number[];
  thenAnalyze: { dataReferinta: string } | null;
}

/** OCR pentru un fișier de context: o imagine sau paginile scanate dintr-un PDF. */
export interface ContextOcrJobInput {
  contextFileId: string;
  fileId: string;
  pages: number[];
  /** fișierul e o imagine (PNG/JPG), nu un PDF */
  image: OcrImageKind | null;
}

/**
 * Recunoașterea optică a paginilor scanate dintr-un PDF încărcat: textul recunoscut
 * devine o versiune nouă a documentului; apoi, dacă s-a cerut, pornește analiza.
 * Pentru fișierele de context, textul recunoscut înlocuiește textul lor (fără analiză).
 */
export const ocrHandler: JobHandler = async (ctx) => {
  if ("contextFileId" in (ctx.input as object)) return contextOcr(ctx, ctx.input as ContextOcrJobInput);
  const input = ctx.input as OcrJobInput;
  const { db } = ctx;
  const file = db.select().from(files).where(eq(files.id, input.fileId)).get();
  if (!file) throw new Error("Fișierul original nu mai există.");
  ctx.emit("etapa", { etapa: "ocr", mesaj: `Recunosc textul din ${input.pages.length} ${input.pages.length === 1 ? "pagină scanată" : "pagini scanate"}` });
  ctx.progress({ etapa: "ocr", pagini: input.pages.length });

  const parsed = await parsePdf(new Uint8Array(readFileSync(dataDir(file.path))), file.name, { ocr: true, signal: ctx.signal });
  if (parsed.consumOcr) ctx.recordUsage(parsed.consumOcr);
  if (ctx.signal.aborted) throw ctx.signal.reason;

  const versionId = addDocumentVersion(db, input.documentId, parsed.doc, "import", `Text recunoscut (OCR) din ${parsed.ocrPages.length} pagini`);
  ctx.emit("ocr", { pagini: parsed.ocrPages, necitite: parsed.unreadablePages, avertismente: parsed.warnings });

  let analysis: { analysisId: string; jobId: string } | null = null;
  if (input.thenAnalyze) {
    analysis = createAnalysisJob(db, { documentId: input.documentId, dataReferinta: input.thenAnalyze.dataReferinta, versionId });
    ctx.emit("analiza_pornita", analysis);
  }
  return { versionId, ocrPages: parsed.ocrPages, unreadablePages: parsed.unreadablePages, analysis };
};

async function contextOcr(ctx: JobContext, input: ContextOcrJobInput) {
  const { db } = ctx;
  const file = db.select().from(files).where(eq(files.id, input.fileId)).get();
  const fail = (error: string) => db.update(contextFiles).set({ status: "eroare", error }).where(eq(contextFiles.id, input.contextFileId)).run();
  // fișierul a fost scos din context între timp: nu mai e nimic de recunoscut
  if (!file || !db.select({ id: contextFiles.id }).from(contextFiles).where(eq(contextFiles.id, input.contextFileId)).get()) return { sters: true };
  ctx.emit("etapa", { etapa: "ocr", mesaj: input.image ? "Recunosc textul din imagine" : `Recunosc textul din ${input.pages.length} ${input.pages.length === 1 ? "pagină scanată" : "pagini scanate"}` });
  ctx.progress({ etapa: "ocr", pagini: input.image ? 1 : input.pages.length });

  try {
    const bytes = new Uint8Array(readFileSync(dataDir(file.path)));
    let text: string;
    let unreadable: number[];
    if (input.image) {
      const usage = new UsageTracker();
      const pages = await transcribePdfPages(await imageToPdf(bytes, input.image), [1], usage, ctx.signal);
      ctx.recordUsage(usage.report());
      text = pages.flatMap((p) => p.paragrafe.map((x) => x.text)).join("\n").trim();
      unreadable = text ? [] : [1];
    } else {
      const parsed = await parsePdf(bytes, file.name, { ocr: true, signal: ctx.signal });
      if (parsed.consumOcr) ctx.recordUsage(parsed.consumOcr);
      text = parsed.segments.map((s) => s.text).join("\n").trim();
      unreadable = parsed.unreadablePages;
    }
    if (ctx.signal.aborted) throw ctx.signal.reason;
    if (!text) {
      fail(input.image ? "Imaginea nu conține text lizibil." : "Nu am putut recunoaște textul.");
      return { text: 0 };
    }
    db.update(contextFiles).set({ text, status: "gata", error: null }).where(eq(contextFiles.id, input.contextFileId)).run();
    ctx.emit("ocr", { necitite: unreadable });
    return { text: text.length, unreadablePages: unreadable };
  } catch (e) {
    // o planșă sau o pagină fără niciun text lizibil nu e o eroare a jobului
    if (!ctx.signal.aborted && e instanceof Error && /nu conține text/.test(e.message)) {
      fail("Nu am găsit text lizibil în fișier.");
      return { text: 0 };
    }
    fail(ctx.signal.aborted ? "Recunoașterea textului a fost oprită." : "Recunoașterea textului a eșuat.");
    throw e;
  }
}
