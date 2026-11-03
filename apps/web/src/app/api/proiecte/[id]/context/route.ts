import type { NextRequest } from "next/server";
import { CONTEXT_FORMATS, addContextFile, contextKind } from "@/server/context-files";
import { MAX_UPLOAD_BYTES } from "@/server/files";
import { ImportError } from "@/server/import";
import { getProject } from "@/server/projects";

/**
 * Încărcarea unui fișier de context în proiect: se salvează și i se extrage textul, fără analiză.
 * Imaginile și paginile scanate din PDF primesc un job de recunoaștere optică (OCR).
 */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/proiecte/[id]/context">) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project || project.archivedAt) return Response.json({ eroare: "Proiectul nu există sau este arhivat." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ eroare: "Lipsește fișierul." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ eroare: "Fișierul depășește limita de 50 MB." }, { status: 413 });
  if (!contextKind(file.name)) return Response.json({ eroare: `Format neacceptat. Încarcă un fișier ${CONTEXT_FORMATS}.` }, { status: 415 });

  try {
    const r = await addContextFile(id, new Uint8Array(await file.arrayBuffer()), file.name, file.type);
    return Response.json(r);
  } catch (e) {
    if (e instanceof ImportError) return Response.json({ eroare: e.message }, { status: 422 });
    console.error("[context]", e);
    return Response.json({ eroare: "Încărcarea a eșuat. Încearcă din nou." }, { status: 500 });
  }
}
