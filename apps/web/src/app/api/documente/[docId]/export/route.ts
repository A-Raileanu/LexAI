import { defaultMeta, exportDocx, type DocumentMeta, type JSONContent } from "@lexai/docx";
import type { NextRequest } from "next/server";
import { fmtDate, plural } from "@lexai/core/labels";
import { withoutIgnored } from "@lexai/core/findings";
import { getDb } from "@lexai/db";
import { annotateContent } from "@/features/analysis/annotated-docx";
import { findingStateForAnalysis, latestWithResult, parseResult } from "@/features/analysis/data";
import { FORBIDDEN_FILENAME, contentDisposition, exportFileName } from "@/features/editor/export/filename";
import { getDocument, getVersion, workingContent } from "@/server/documents";
import { ignoredFor } from "@/server/finding-ignores";
import { resolveImage } from "@/server/images";
import { renderDocumentPdf } from "@/server/pdf";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const FORMATS = new Set(["docx", "docx-adnotat", "pdf"]);

/** Evidențierile de culoare (`textStyle.backgroundColor`) scoase, dacă utilizatorul nu le vrea în fișier. */
function stripHighlights(node: JSONContent): JSONContent {
  const marks = node.marks
    ?.map((m) => {
      if (m.type !== "textStyle" || !m.attrs?.backgroundColor) return m;
      const attrs = { ...m.attrs };
      delete attrs.backgroundColor;
      return { ...m, attrs };
    })
    .filter((m) => m.type !== "textStyle" || Object.values(m.attrs ?? {}).some((v) => v !== null && v !== undefined));
  return { ...node, ...(marks ? { marks } : {}), ...(node.content ? { content: node.content.map(stripHighlights) } : {}) };
}

/**
 * Exportul documentului (docs/ux/12-export.md): conținutul de lucru (ciorna sau versiunea curentă)
 * sau o versiune anume (`versiune`), cu sugestiile neaplicate și placeholderele evidențiate.
 * Formate: `docx` (curat), `docx-adnotat` (după o analiză), `pdf` (documentul, ca în editor; tot el
 * se folosește la „Printează…”). Parametri: `format`, `versiune`, `nume` (fără extensie),
 * `evidentieri=1`, `pagini=1` (PDF: „Pagina 2 din 5” în subsol).
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/documente/[docId]/export">) {
  const { docId } = await ctx.params;
  const params = req.nextUrl.searchParams;
  const format = params.get("format") ?? "docx";
  if (!FORMATS.has(format)) return Response.json({ eroare: "Formatul cerut nu este disponibil încă." }, { status: 400 });

  const doc = getDocument(docId);
  if (!doc) return Response.json({ eroare: "Documentul nu există." }, { status: 404 });

  let content: JSONContent;
  let versionNumber: number | null;
  let draft = false;
  const versionId = params.get("versiune");
  if (versionId) {
    const v = getVersion(versionId);
    if (!v || v.documentId !== doc.id) return Response.json({ eroare: "Versiunea nu există." }, { status: 404 });
    content = JSON.parse(v.content) as JSONContent;
    versionNumber = v.number;
  } else {
    const w = workingContent(doc);
    content = w.content as JSONContent;
    versionNumber = w.version?.number ?? null;
    draft = w.fromDraft;
  }

  let meta: DocumentMeta = defaultMeta();
  try {
    if (doc.meta) meta = { ...meta, ...(JSON.parse(doc.meta) as Partial<DocumentMeta>) };
  } catch {
    // meta coruptă: exportăm cu valorile implicite
  }

  if (params.get("evidentieri") !== "1") content = stripHighlights(content);

  // DOCX adnotat (features/analysis): pasajele citate evidențiate + note sub paragrafele cu constatări
  if (format === "docx-adnotat") {
    const analysis = latestWithResult(doc.id);
    if (!analysis?.result) return Response.json({ eroare: "Rulează mai întâi o analiză." }, { status: 404 });
    const parsed = parseResult(analysis.result);
    if (!parsed) return Response.json({ eroare: "Rezultatul analizei nu poate fi citit." }, { status: 500 });
    // constatările ignorate (în orice analiză a documentului) nu apar în documentul adnotat
    const ignored = ignoredFor(getDb(), doc.id);
    const { result, ignorate } = withoutIgnored(parsed, ignored);
    const state = findingStateForAnalysis(analysis, result, ignored);
    const annotated = annotateContent(content, result.findings, {
      actions: state.actions,
      appliedSuggestion: state.appliedSuggestion,
      ignored,
      intro: `Document adnotat de LexAI · legislația în vigoare la ${fmtDate(analysis.dataReferinta)} · ${plural(result.findings.length, "trimitere verificată", "trimiteri verificate")}${ignorate ? ` (${plural(ignorate, "constatare ignorată exclusă", "constatări ignorate excluse")})` : ""}. Notele sunt generate automat; decizia finală îți aparține.`,
    });
    content = annotated.content;
  }

  const custom = params.get("nume")?.trim();
  if (custom && FORBIDDEN_FILENAME.test(custom)) return Response.json({ eroare: 'Numele nu poate conține / \\ : * ? " < > |' }, { status: 400 });
  const ext = format === "pdf" ? "pdf" : "docx";
  const defaultName = exportFileName(doc.title, versionNumber, draft, ext);
  const name = custom ? `${custom.replace(/\.(docx|pdf)$/i, "")}.${ext}` : format === "docx-adnotat" ? defaultName.replace(/\.docx$/, "_adnotat.docx") : defaultName;

  if (format === "pdf") {
    try {
      const pdf = await renderDocumentPdf(content, meta, { title: doc.title, pageNumbers: params.get("pagini") === "1" });
      return new Response(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": contentDisposition(name),
          "Content-Length": String(pdf.byteLength),
          "Cache-Control": "no-store",
        },
      });
    } catch (e) {
      console.error("[export pdf]", e);
      return Response.json({ eroare: "Nu am putut genera PDF-ul." }, { status: 500 });
    }
  }

  try {
    const buf = await exportDocx(content, meta, { image: resolveImage });
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": contentDisposition(name),
        "Content-Length": String(buf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("[export]", e);
    return Response.json({ eroare: "Nu am putut genera fișierul." }, { status: 500 });
  }
}
