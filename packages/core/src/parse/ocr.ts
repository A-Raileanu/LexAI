import { PDFDocument } from "pdf-lib";
import { z } from "zod";
import { MODEL } from "@lexai/ai";
import { claudeCli, type AiClient } from "../ai";
import type { UsageTracker } from "../usage";

/**
 * Recunoaștere optică (OCR) cu Claude pentru paginile scanate din PDF-uri.
 * Cuvintele/fragmentele nesigure sunt marcate ⟦…⟧, ca utilizatorul să le vadă
 * înainte de orice verdict.
 */

const OCR_SYSTEM = `Transcrii fidel textul din documente juridice românești scanate.
Reguli:
- Copiază textul exact, cu diacritice, fără corecturi, fără rezumare și fără a adăuga nimic.
- Păstrează ordinea de citire; un paragraf = un bloc de text continuu (titlurile, punctele din liste și celulele de tabel sunt paragrafe separate).
- Include anteturi, subsoluri, note de subsol, ștampile și text din tabele.
- Orice cuvânt sau fragment de care nu ești sigur îl încadrezi între ⟦ și ⟧ (ex. „art. ⟦17⟧”). Marchează "nesigur": true pentru paragrafele care conțin astfel de fragmente.
- Dacă pagina nu conține text lizibil, întoarce lizibil=false și nicio listă de paragrafe.`;

const PagesSchema = z.object({
  pagini: z.array(
    z.object({
      pagina: z.number().int(),
      lizibil: z.boolean(),
      paragrafe: z.array(z.object({ text: z.string(), nesigur: z.boolean() })),
    }),
  ),
});

export type OcrPages = z.infer<typeof PagesSchema>["pagini"];

const PAGES_PER_CALL = 10;

export async function transcribePdfPages(pdf: Uint8Array, pages: number[], usage: UsageTracker, signal?: AbortSignal, ai: AiClient = claudeCli): Promise<OcrPages> {
  const src = await PDFDocument.load(pdf, { ignoreEncryption: true });
  const out: OcrPages = [];
  for (let i = 0; i < pages.length; i += PAGES_PER_CALL) {
    const batch = pages.slice(i, i + PAGES_PER_CALL);
    const sub = await PDFDocument.create();
    const copied = await sub.copyPages(src, batch.map((p) => p - 1));
    copied.forEach((p) => sub.addPage(p));
    const bytes = await sub.save();
    const data = Buffer.from(bytes).toString("base64");

    const result = await ai.run(
      {
        model: MODEL,
        effort: "medium",
        maxOutputTokens: 64000,
        system: OCR_SYSTEM,
        jsonSchema: z.toJSONSchema(PagesSchema),
        signal,
        onMessage: (m) => usage.record("ocr", m.model, m.usage),
        onLimits: (l) => usage.setLimits(l),
      },
      [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
        {
          type: "text",
          text: `Documentul atașat conține ${batch.length} pagini, care sunt paginile ${batch.join(", ")} din documentul original (în această ordine). Transcrie fiecare pagină; în câmpul "pagina" folosește numărul paginii din documentul original.`,
        },
      ],
    );
    if (result.stopReason === "refusal") continue;
    try {
      out.push(...PagesSchema.parse(result.structured).pagini.filter((p) => batch.includes(p.pagina)));
    } catch {
      /* paginile din acest lot rămân necitite */
    }
  }
  return out;
}

export type OcrImageKind = "png" | "jpg";

/**
 * O imagine (fotografie sau scanare) pusă într-un PDF de o pagină, ca să treacă prin aceeași
 * recunoaștere ca paginile scanate. Pagina are proporțiile imaginii, încadrată în A4; rezoluția
 * imaginii rămâne cea originală.
 */
export async function imageToPdf(bytes: Uint8Array, kind: OcrImageKind): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const img = kind === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  const scale = Math.min(595 / img.width, 842 / img.height);
  const [w, h] = [img.width * scale, img.height * scale];
  pdf.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
  return pdf.save();
}
