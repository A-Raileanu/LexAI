import { defineTool, type AgentTool } from "@lexai/sources";
import { z } from "zod";
import { locateQuote } from "../text/locate";
import { containsLoose } from "../text/normalize";
import type { DocSegment } from "../types";

/**
 * Instrumentele agentului care nu depind de surse: căutarea și citirea în documentul analizat
 * și raportarea constatărilor. Instrumentele surselor (cauta_act, citeste_articol etc.) sunt
 * generate de `toolsFor` din @lexai/sources, după capabilitățile surselor active.
 */

const nullableString = { type: ["string", "null"] } as const;
const ns = z.string().nullable();

export const STATUS_ENUM = ["corect", "eroare_citare", "interpretare_discutabila", "necesita_analiza_umana", "neverificat"] as const;
export const CATEGORY_ENUM = [
  "act_inexistent", "identificare_gresita_act", "act_abrogat", "act_neintrat_in_vigoare", "act_suspendat",
  "articol_inexistent", "numerotare_schimbata", "text_modificat", "continut_denaturat", "valoare_gresita",
  "neconstitutionalitate", "citare_incompleta", "norma_speciala_ignorata", "conditii_omise", "aplicare_gresita",
  "concluzie_eronata", "inconsecventa_interna", "terminologie", "dispozitii_tranzitorii", "fara_temei_identificabil", "decizie_obligatorie_ignorata", "altele",
] as const;

const verdictSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "rezumat"],
  properties: {
    status: { type: "string", enum: STATUS_ENUM },
    rezumat: { type: "string" },
  },
} as const;

const SuggestionInputSchema = z.object({
  tip: z.enum(["inlocuire", "propunere_de_revizuit"]),
  situatie: ns.optional(),
  text_original: z.string(),
  text_propus: z.string(),
  motiv: z.string(),
  impact: z.array(z.object({ segment_id: z.string(), descriere: z.string() })).default([]),
});

export type SuggestionInput = z.infer<typeof SuggestionInputSchema>;

export const ReportInputSchema = z.object({
  trimitere_id: z.string(),
  categorie: z.enum(CATEGORY_ENUM).nullable(),
  titlu: z.string(),
  explicatie: z.string(),
  act_id: z.union([z.number().int(), z.string()]).nullable(),
  unitate: ns,
  verdict_la_data: z.object({ status: z.enum(STATUS_ENUM), rezumat: z.string() }),
  verdict_astazi: z.object({ status: z.enum(STATUS_ENUM), rezumat: z.string() }).nullable(),
  ipoteze: z.array(z.string()),
  exceptii: z.array(z.string()),
  informatii_lipsa: z.array(z.string()),
  motiv_neverificare: ns,
  tip_neverificare: z.enum(["sursa_lipsa", "act_ambiguu", "text_nesigur"]).nullable(),
  evenimente: z.array(z.string()),
  sugestii: z.array(SuggestionInputSchema).default([]),
  /** forma veche (o singură sugestie), acceptată în continuare; vezi `suggestionInputs` */
  sugestie: SuggestionInputSchema.nullable().optional(),
  dovezi: z.array(z.object({ evidence_id: z.string(), fragment: z.string() })),
});

export type ReportInput = z.infer<typeof ReportInputSchema>;

/** Sugestiile raportate: `sugestii` sau, în forma veche, `sugestie`. */
export function suggestionInputs(input: Pick<ReportInput, "sugestii" | "sugestie">): SuggestionInput[] {
  if (input.sugestii?.length) return input.sugestii;
  return input.sugestie ? [input.sugestie] : [];
}

const SUGGESTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tip", "situatie", "text_original", "text_propus", "motiv", "impact"],
  properties: {
    tip: { type: "string", enum: ["inlocuire", "propunere_de_revizuit"] },
    situatie: {
      ...nullableString,
      description: "când se aplică varianta, scurt (ex. „Clauza este convențională”); obligatoriu când dai mai multe variante, altfel null",
    },
    text_original: { type: "string", description: "copiat CARACTER CU CARACTER din segmentul trimiterii" },
    text_propus: { type: "string", description: "textul de înlocuire, gata de folosit" },
    motiv: { type: "string" },
    impact: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["segment_id", "descriere"],
        properties: { segment_id: { type: "string" }, descriere: { type: "string" } },
      },
    },
  },
} as const;

const REPORT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "trimitere_id", "categorie", "titlu", "explicatie", "act_id", "unitate",
    "verdict_la_data", "verdict_astazi", "ipoteze", "exceptii", "informatii_lipsa",
    "motiv_neverificare", "tip_neverificare", "evenimente", "sugestii", "dovezi",
  ],
  properties: {
    trimitere_id: { type: "string" },
    categorie: { anyOf: [{ type: "string", enum: CATEGORY_ENUM }, { type: "null" }] },
    titlu: { type: "string" },
    explicatie: { type: "string" },
    act_id: { type: ["integer", "string", "null"], description: "act_id-ul formei de bază, dacă actul a fost identificat" },
    unitate: { ...nullableString, description: "unitatea normativă verificată, ex. 'art. 11 alin. (1)'" },
    verdict_la_data: verdictSchema,
    verdict_astazi: { anyOf: [verdictSchema, { type: "null" }] },
    ipoteze: { type: "array", items: { type: "string" } },
    exceptii: { type: "array", items: { type: "string" } },
    informatii_lipsa: { type: "array", items: { type: "string" } },
    motiv_neverificare: nullableString,
    tip_neverificare: {
      anyOf: [{ type: "string", enum: ["sursa_lipsa", "act_ambiguu", "text_nesigur"] }, { type: "null" }],
      description:
        "doar pentru „neverificat”: sursa_lipsa (actul/articolul nu poate fi găsit sau citit), act_ambiguu (actul nu poate fi identificat fără echivoc), text_nesigur (textul documentului e ilizibil)",
    },
    evenimente: { type: "array", items: { type: "string" } },
    sugestii: {
      type: "array",
      items: SUGGESTION_JSON_SCHEMA,
      description:
        "variantele de corectură/reformulare: cel puțin una pentru „eroare_citare” și „interpretare_discutabila”, 2–3 (cu „situatie”) când soluția depinde de fapte sau de intenția părților; listă goală pentru „corect”",
    },
    sugestie: { anyOf: [SUGGESTION_JSON_SCHEMA, { type: "null" }], description: "învechit: folosește „sugestii”" },
    dovezi: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["evidence_id", "fragment"],
        properties: {
          evidence_id: { type: "string", description: "id-ul dovezii (ex. „E12”) sau URL-ul exact al unei pagini citite cu web_fetch" },
          fragment: { type: "string", description: "copiat exact din textul dovezii" },
        },
      },
    },
  },
};

// ───────────────────────── Documentul analizat ─────────────────────────

const DOC_WINDOW = 250;

/** cauta_in_document și citeste_segment, pe segmentele documentului analizat. */
export function documentTools(segments: DocSegment[], activity: (mesaj: string) => void = () => {}): AgentTool[] {
  return [
    defineTool({
      name: "cauta_in_document",
      description:
        "Caută o expresie în documentul analizat (toate segmentele, inclusiv note, tabele, anteturi). Întoarce, pentru fiecare segment găsit, un fragment în jurul potrivirii; pentru textul întreg folosește citeste_segment.",
      promptLine:
        "- cauta_in_document: caută în documentul analizat (definiții, alte clauze, trimiteri interne) – obligatoriu înainte de a propune o modificare care ar putea afecta alte clauze. Întoarce un fragment în jurul potrivirii.",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["expresie"],
        properties: { expresie: { type: "string" } },
      },
      input: z.object({ expresie: z.string().min(2) }),
      run: (p) => {
        activity(`Caut în document: „${p.expresie}”`);
        const matching = segments.filter((s) => containsLoose(s.text, p.expresie));
        const hits = matching.slice(0, 10).map((s) => {
          // fereastră în jurul potrivirii, nu începutul segmentului
          const loc = locateQuote(s.text, p.expresie);
          const from = Math.max(0, loc.start - DOC_WINDOW);
          const to = Math.min(s.text.length, loc.end + DOC_WINDOW);
          const fragment = `${from > 0 ? "[…] " : ""}${s.text.slice(from, to)}${to < s.text.length ? " […]" : ""}`;
          return { segment_id: s.id, tip: s.kind, lungime_segment: s.text.length, fragment };
        });
        return { content: JSON.stringify({ total: matching.length, segmente: hits }) };
      },
    }),
    defineTool({
      name: "citeste_segment",
      description: "Textul complet al unui segment din documentul analizat (ex. „s14”), cu segmentele vecine dacă ceri.",
      promptLine: "- citeste_segment: textul complet al unui segment din document (și, opțional, al vecinilor).",
      inputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["segment_id", "vecine"],
        properties: {
          segment_id: { type: "string" },
          vecine: { type: "integer", description: "câte segmente înainte și după (0–3)" },
        },
      },
      input: z.object({ segment_id: z.string(), vecine: z.number().int().min(0).max(3) }),
      run: (p) => {
        const i = segments.findIndex((s) => s.id === p.segment_id);
        if (i < 0) return { content: `Segmentul ${p.segment_id} nu există.`, isError: true };
        activity(`Citesc segmentul ${p.segment_id} din document`);
        const segs = segments.slice(Math.max(0, i - p.vecine), i + p.vecine + 1);
        return { content: JSON.stringify({ segmente: segs.map((s) => ({ segment_id: s.id, tip: s.kind, text: s.text })) }) };
      },
    }),
  ];
}

/** raporteaza_constatare: `report` validează și înregistrează; întoarce mesajul pentru agent. */
export function reportTool(report: (input: ReportInput) => { ok: boolean; message: string }): AgentTool {
  return defineTool({
    name: "raporteaza_constatare",
    description: "Înregistrează rezultatul verificării pentru o trimitere. Câmpurile neaplicabile: null sau listă goală.",
    promptLine:
      "- raporteaza_constatare: înregistrează rezultatul pentru O trimitere. Apelează-l exact o dată pentru fiecare trimitere primită (dacă primești o eroare de validare, corectează și apelează din nou).",
    inputSchema: REPORT_JSON_SCHEMA,
    input: ReportInputSchema,
    run: (p) => {
      const r = report(p);
      return { content: r.message, isError: !r.ok };
    },
  });
}
