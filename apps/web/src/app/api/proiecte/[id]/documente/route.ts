import { enqueueJob, getDb } from "@lexai/db";
import type { NextRequest } from "next/server";
import { startAnalysis } from "@/server/analysis";
import { insertDocument } from "@/server/documents";
import { MAX_UPLOAD_BYTES, storeFile } from "@/server/files";
import { ACCEPTED, ImportError, fileKind, importFile, titleFromFileName } from "@/server/import";
import { getProject } from "@/server/projects";

/**
 * Încărcarea unui document într-un proiect: salvează fișierul, îl importă pentru editare
 * (versiunea 1) și, opțional, pornește analiza. PDF-urile cu pagini scanate primesc
 * întâi un job de recunoaștere optică (OCR); analiza pornește după el.
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/proiecte/[id]/documente">) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project || project.archivedAt) return Response.json({ eroare: "Proiectul nu există sau este arhivat." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ eroare: "Lipsește fișierul." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ eroare: "Fișierul depășește limita de 50 MB." }, { status: 413 });
  const kind = fileKind(file.name);
  if (!kind) return Response.json({ eroare: "Format neacceptat. Încarcă un fișier DOCX, DOC sau PDF." }, { status: 415 });
  const dataReferinta = String(form?.get("dataReferinta") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataReferinta)) return Response.json({ eroare: "Data de referință este invalidă." }, { status: 400 });
  const analyze = form?.get("analizeaza") === "1";

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const imported = await importFile(bytes, file.name);
    const stored = storeFile(bytes, file.name, file.type || ACCEPTED[kind]);
    const doc = insertDocument({
      projectId: id,
      title: titleFromFileName(file.name),
      kind: "incarcat",
      content: imported.content,
      meta: imported.meta,
      origin: "import",
      sourceFileId: stored.id,
      dataReferinta,
      note: `Importat din ${file.name}`,
    });
    let jobId: string | null = null;
    let ocrJobId: string | null = null;
    if (imported.pagesNeedingOcr.length) {
      ocrJobId = enqueueJob(getDb(), {
        kind: "ocr",
        projectId: id,
        documentId: doc.id,
        input: { documentId: doc.id, fileId: stored.id, pages: imported.pagesNeedingOcr, thenAnalyze: analyze ? { dataReferinta } : null },
      }).id;
    } else if (analyze) {
      jobId = startAnalysis({ documentId: doc.id, dataReferinta }).jobId;
    }
    return Response.json({ documentId: doc.id, warnings: imported.warnings, ocrPages: imported.pagesNeedingOcr, jobId, ocrJobId });
  } catch (e) {
    if (e instanceof ImportError) return Response.json({ eroare: e.message }, { status: 422 });
    console.error("[upload]", e);
    return Response.json({ eroare: "Importul a eșuat. Încearcă din nou." }, { status: 500 });
  }
}
