import { ClaudeSession, mcpToolName } from "@lexai/ai";
import { UsageTracker } from "@lexai/ai/usage";
import { newSegId } from "@lexai/core";
import { BLOCK_JSON_SCHEMA, blocksToNodes, checkBlock, manualListMarker, type AgentBlock, type ChatBlock } from "@lexai/core/chat";
import { addDocumentVersion, drafts, eq, settings } from "@lexai/db";
import { EvidenceStore, RunScope, defineTool, toolsFor } from "@lexai/sources";
import { z } from "zod";
import type { JobHandler } from "../runner";
import { buildRegistry } from "../registry";
import { DRAFTING_SYSTEM, PLACEHOLDER_RE } from "./drafting-prompt";
import { completenessIssues, type DraftPlan } from "./drafting-review";
import { contextActivity, describeContextFiles, describeProjectDocuments, draftingMaterial } from "./project-context";

interface Party {
  tip: "fizica" | "juridica";
  nume: string;
  identificare: string;
  adresa: string;
  reprezentant: string;
  calitate: string;
  id: string;
}

export interface DraftingJobInput {
  documentId: string;
  draftId: string;
  titlu: string;
  tip: { id: string; nume: string; subtip: string; norme: string[] };
  parametri: {
    scop: string;
    parti: Party[];
    elemente: Record<string, string>;
    dataDocument: string;
    dataLegii: string;
    pozitie: string;
    model: { documentId: string; mod: string } | null;
    /** `false`: fără contextul proiectului (lipsește la redactările mai vechi = da) */
    context?: boolean;
  };
  deCompletat: string[];
}

/** Un alineat: text (un paragraf) sau un bloc formatat (listă, tabel, titlu, paragraf aliniat, salt de pagină). */
const Part = z.union([z.string(), z.object({ tip: z.string() }).passthrough()]);
const ProiectInput = z.object({
  titlu: z.string().min(1),
  preambul: z.array(Part),
  articole: z.array(z.object({ titlu: z.string(), alineate: z.array(Part) })).min(1),
  incheiere: z.array(Part),
  semnaturi: z.array(z.object({ parte: z.string(), nume: z.string() })),
});
type ProiectRaw = z.infer<typeof ProiectInput>;
/** Proiectul cu blocurile validate (textele simple rămân paragrafe). */
type Bucata = string | ChatBlock;
type Proiect = Omit<ProiectRaw, "preambul" | "articole" | "incheiere"> & { preambul: Bucata[]; articole: { titlu: string; alineate: Bucata[] }[]; incheiere: Bucata[] };

/**
 * Validează blocurile din proiect (aceleași reguli ca în chat) și respinge enumerările scrise de mână
 * într-un paragraf („a) …”, „- …”): ele trebuie să fie liste reale.
 */
export function normalizeProiect(raw: ProiectRaw): { ok: true; proiect: Proiect } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const parts = (list: ProiectRaw["preambul"], where: string): Bucata[] =>
    list.flatMap((x, i): Bucata[] => {
      const label = `${where}, poziția ${i + 1}`;
      if (typeof x === "string") {
        const marker = manualListMarker(x);
        if (marker) errors.push(`${label}: textul începe cu „${marker}”, ca un element de listă scris de mână; pune enumerarea într-un bloc {"tip":"lista",…} (${/[a-z]/.test(marker) ? `"numerotata":true,"stil":"litere"` : `"numerotata":false`}), fără marcaje în text.`);
        return [x];
      }
      const r = checkBlock(x as AgentBlock, label);
      if (!r.ok) {
        errors.push(r.error);
        return [];
      }
      return [r.block];
    });
  const proiect: Proiect = {
    ...raw,
    preambul: parts(raw.preambul, "preambul"),
    articole: raw.articole.map((a) => ({ titlu: a.titlu, alineate: parts(a.alineate, `„${a.titlu}”`) })),
    incheiere: parts(raw.incheiere, "încheiere"),
  };
  return errors.length ? { ok: false, errors } : { ok: true, proiect };
}

const str = { type: "string" } as const;
/** paragrafe simple (text) sau blocuri formatate */
const partsArr = { type: "array", items: { anyOf: [str, BLOCK_JSON_SCHEMA] } } as const;
const PROIECT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["titlu", "preambul", "articole", "incheiere", "semnaturi"],
  properties: {
    titlu: str,
    preambul: { ...partsArr, description: "paragrafele dinaintea articolelor: părțile și formula introductivă" },
    articole: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titlu", "alineate"],
        properties: { titlu: { ...str, description: "ex. „Art. 1. Obiectul contractului”" }, alineate: { ...partsArr, description: "alineatele: text (un paragraf, cu numerotarea alineatului în text, „(1)” sau „1.1.”) sau blocuri formatate — liste (cu litere pentru enumerările „a), b)”), tabele, subtitluri" } },
      },
    },
    incheiere: partsArr,
    semnaturi: { type: "array", items: { type: "object", additionalProperties: false, required: ["parte", "nume"], properties: { parte: str, nume: str } } },
  },
};

// ───────────────────────── Proiect → JSON Tiptap ─────────────────────────

type Inline = { type: "text"; text: string; marks?: { type: string; attrs?: Record<string, unknown> }[] };

/** Text cu **îngroșat** și „[● indicație]” → noduri inline. */
export function inlineNodes(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*([^*]+)\*\*|\[●\s*([^\]]*)\]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "text", text: m[1], marks: [{ type: "bold" }] });
    else out.push({ type: "text", text: m[0], marks: [{ type: "placeholder", attrs: { hint: m[2].trim() } }] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out.length ? out : [];
}

export function proiectToDoc(p: Proiect) {
  const used = new Set<string>();
  const para = (text: string, attrs: Record<string, unknown> = {}) => ({ type: "paragraph", attrs: { segId: newSegId(used), textAlign: "justify", ...attrs }, content: inlineNodes(text) });
  // blocurile formatate: paragrafele lor sunt justificate, ca restul textului
  const part = (b: Bucata): unknown[] => (typeof b === "string" ? [para(b)] : blocksToNodes([b], used, { paragraph: { textAlign: "justify" } }));
  const content: unknown[] = [
    { type: "heading", attrs: { level: 1, segId: newSegId(used), textAlign: "center" }, content: inlineNodes(p.titlu) },
    ...p.preambul.flatMap(part),
  ];
  for (const a of p.articole) {
    content.push({ type: "heading", attrs: { level: 3, segId: newSegId(used) }, content: inlineNodes(a.titlu) });
    for (const al of a.alineate) content.push(...part(al));
  }
  for (const t of p.incheiere) content.push(...part(t));
  if (p.semnaturi.length) {
    const cell = (text: string, bold = false) => ({
      type: "tableCell",
      attrs: { colspan: 1, rowspan: 1, colwidth: null },
      content: [
        {
          type: "paragraph",
          attrs: { segId: newSegId(used), textAlign: "center" },
          // câmpurile „[● …]” rămân placeholder-e și în tabelul de semnături
          content: inlineNodes(text).map((n) => (bold ? { ...n, marks: [...(n.marks ?? []), { type: "bold" }] } : n)),
        },
      ],
    });
    content.push({
      type: "table",
      content: [
        { type: "tableRow", content: p.semnaturi.map((s) => cell(s.parte, true)) },
        { type: "tableRow", content: p.semnaturi.map((s) => cell(s.nume)) },
        { type: "tableRow", content: p.semnaturi.map(() => cell("Semnătura: ____________")) },
      ],
    });
  }
  return { type: "doc", content };
}

function blockTexts(doc: { content: unknown[] }): { segId: string; text: string }[] {
  const out: { segId: string; text: string }[] = [];
  const walk = (n: { type?: string; text?: string; attrs?: { segId?: string }; content?: unknown[] }) => {
    if ((n.type === "paragraph" || n.type === "heading") && n.attrs?.segId) {
      const parts: string[] = [];
      const collect = (c: { text?: string; content?: unknown[] }) => {
        if (c.text) parts.push(c.text);
        (c.content ?? []).forEach((x) => collect(x as typeof c));
      };
      collect(n);
      out.push({ segId: n.attrs.segId, text: parts.join("") });
      return;
    }
    (n.content ?? []).forEach((x) => walk(x as typeof n));
  };
  walk(doc as never);
  return out;
}

export function describeRequest(input: DraftingJobInput): string {
  const p = input.parametri;
  const parti = p.parti
    .map((x, i) => {
      const fields = [
        x.nume || "[● nume]",
        x.tip === "fizica" ? "persoană fizică" : "persoană juridică",
        x.identificare ? `${x.tip === "fizica" ? "CNP" : "CUI"} ${x.identificare}` : `[● ${x.tip === "fizica" ? "CNP" : "CUI"}]`,
        x.adresa ? `${x.tip === "fizica" ? "domiciliu" : "sediu"}: ${x.adresa}` : `[● ${x.tip === "fizica" ? "domiciliul" : "sediul"}]`,
        x.reprezentant ? `reprezentată de ${x.reprezentant}` : "",
      ].filter(Boolean);
      return `- Partea ${i + 1} (${x.calitate}): ${fields.join(", ")}`;
    })
    .join("\n");
  const pozitie = p.pozitie === "echilibrat" ? "echilibrată" : `în favoarea părții ${p.parti.find((x) => x.id === p.pozitie)?.calitate ?? ""}`;
  const elemente = Object.entries(p.elemente)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  if (input.tip.id === "altul") {
    // document descris liber: tipul, părțile și elementele se deduc din descriere
    return [
      `Redactează documentul „${input.titlu}”, după descrierea utilizatorului:`,
      `<descriere>\n${p.elemente.continut ?? p.scop}\n</descriere>`,
      "",
      "Analizează descrierea în profunzime: stabilește tipul documentului, părțile și calitatea lor, ce trebuie să obțină documentul, elementele esențiale și poziția (implicit echilibrată). Folosește fiecare informație din descriere și adaugă tot ce ar include un practician pentru acest tip de document. Nu inventa date de identificare, sume sau termene: ce nu reiese din descriere scrie ca „[● indicație]”.",
      `Data documentului: ${p.dataDocument}. Legislația se citește în forma de la: ${p.dataLegii} (folosește această dată la citeste_articol).`,
    ].join("\n");
  }
  return [
    `Redactează: ${input.tip.nume}${input.tip.subtip ? ` — ${input.tip.subtip}` : ""}.`,
    `Titlul propus: ${input.titlu}`,
    p.scop ? `Scopul: ${p.scop}` : "",
    `Data documentului: ${p.dataDocument}. Legislația se citește în forma de la: ${p.dataLegii} (folosește această dată la citeste_articol).`,
    `Poziția: ${pozitie}.`,
    "",
    "Părțile:",
    parti,
    "",
    elemente ? `Elemente esențiale indicate:\n${elemente}` : "Elemente esențiale: neindicate (folosește „[● …]”).",
    input.deCompletat.length ? `\nInformații lipsă (rămân „[● …]” în proiect): ${input.deCompletat.join("; ")}.` : "",
    input.tip.norme.length ? `\nNorme de pornire (verifică-le pe textul oficial; caută și normele speciale):\n${input.tip.norme.map((n) => `- ${n}`).join("\n")}` : "",
  ]
    .filter((x) => x !== "")
    .join("\n");
}

const MAX_TURNS = 80;

/**
 * Redactarea unui document nou: agentul cercetează legea prin sursele active și predă
 * proiectul cu finalizeaza_proiect; codul verifică formatarea și completitudinea lui.
 * Proiectul devine o versiune nouă a documentului; câmpurile de completat se salvează în `drafts`.
 */
export const draftingHandler: JobHandler = async (ctx) => {
  const input = ctx.input as DraftingJobInput;
  const { db } = ctx;
  const registry = buildRegistry(db);
  const store = new EvidenceStore();
  const scope = new RunScope();
  const usage = new UsageTracker();
  const model = db.select({ m: settings.model }).from(settings).where(eq(settings.id, 1)).get()?.m ?? "claude-sonnet-5-5";

  let accepted: Proiect | null = null;
  let session: ClaudeSession | null = null;
  const activity = (mesaj: string) => ctx.emit("activitate", { mesaj });

  let draftPlan: DraftPlan | null = null;
  let reviewed = false;

  const plan = defineTool({
    name: "anunta_plan",
    description:
      "Predă analiza documentului înainte de cercetare: tipul și contextul, elementele pe care trebuie să le conțină (fiecare cu motivul) și structura (titlurile articolelor sau secțiunilor). Poți apela din nou dacă cercetarea schimbă planul.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["analiza", "elemente", "sectiuni"],
      properties: {
        analiza: { type: "string", description: "tipul documentului, scopul, părțile și interesele lor, riscurile de acoperit (3–8 propoziții)" },
        elemente: {
          type: "array",
          description: "tot ce trebuie să conțină documentul, inclusiv ce reiese din descriere și ce ar adăuga un practician",
          items: { type: "object", additionalProperties: false, required: ["element", "motiv"], properties: { element: str, motiv: str } },
        },
        sectiuni: { type: "array", items: str, description: "titlurile articolelor sau secțiunilor, în ordine" },
      },
    },
    input: z.object({ analiza: z.string(), elemente: z.array(z.object({ element: z.string(), motiv: z.string() })), sectiuni: z.array(z.string()) }),
    run: (p) => {
      draftPlan = p;
      ctx.emit("plan", { sectiuni: p.sectiuni });
      ctx.progress({ etapa: "cercetare", sectiuni: p.sectiuni.length });
      return { content: "Plan înregistrat. Cercetează acum normele aplicabile, apoi scrie proiectul complet, acoperind fiecare element din analiză." };
    },
  });

  const finalize = defineTool({
    name: "finalizeaza_proiect",
    description: "Predă proiectul complet al documentului. Codul verifică formatarea și că acoperă planul.",
    inputSchema: PROIECT_SCHEMA,
    input: ProiectInput,
    run: (raw) => {
      if (!draftPlan) return { content: "Predă întâi analiza documentului cu anunta_plan, apoi proiectul.", isError: true };
      const norm = normalizeProiect(raw);
      if (!norm.ok) {
        return { content: `Proiectul NU a fost acceptat încă: formatarea nu e validă.\n- ${norm.errors.slice(0, 20).join("\n- ")}\nCorectează și apelează din nou finalizeaza_proiect cu proiectul complet.`, isError: true };
      }
      const proiect = norm.proiect;
      // completitudinea, o singură dată: articole fără conținut sau secțiuni din plan care lipsesc
      if (!reviewed) {
        reviewed = true;
        const lipsuri = completenessIssues(proiect, draftPlan);
        if (lipsuri.length) {
          return { content: `Proiectul NU a fost acceptat încă: nu e complet.\n- ${lipsuri.join("\n- ")}\nCompletează documentul și apelează din nou finalizeaza_proiect cu proiectul complet.`, isError: true };
        }
      }
      accepted = proiect;
      setImmediate(() => session?.stop());
      return { content: "Proiect acceptat. Încheie." };
    },
  });

  const tools = toolsFor(registry, { store, scope, signal: ctx.signal, activity, extra: [plan, finalize] });
  let turns = 0;
  ctx.emit("etapa", { etapa: "cercetare", mesaj: "Cercetez legislația aplicabilă" });
  ctx.progress({ etapa: "cercetare" });

  session = await ClaudeSession.start({
    model,
    // redactarea cere gândire: ce trebuie inclus depinde de descriere și de lege
    effort: "high",
    maxOutputTokens: 64000,
    system: `${DRAFTING_SYSTEM}\n\n## Instrumente disponibile\n${tools.map((t) => `- ${t.name}${t.promptLine ? `: ${t.promptLine}` : ""}`).join("\n")}\nInstrumentele apar cu prefixul „mcp__lexai__” (ex. ${mcpToolName("finalizeaza_proiect")}).`,
    tools,
    signal: ctx.signal,
    onLimits: (l) => {
      usage.setLimits(l);
      ctx.emit("consum", { consum: usage.report() });
    },
    onMessage: (m) => {
      turns++;
      usage.record("redactare", m.model, m.usage);
      ctx.emit("consum", { consum: usage.report() });
      if (turns === 4) ctx.emit("etapa", { etapa: "scriere", mesaj: "Scriu proiectul" });
      if (turns >= MAX_TURNS && !accepted) session?.stop();
    },
  });

  try {
    // contextul proiectului (fișierele din tabul Context și celelalte documente: părți, dosar, fapte),
    // dacă utilizatorul nu l-a exclus din formular
    const { context, documente } = draftingMaterial(db, input.documentId, { include: input.parametri.context !== false });
    const folosite = contextActivity(context.length, documente.length);
    if (folosite) activity(folosite);
    let result = await session.send([describeRequest(input), describeContextFiles(context), describeProjectDocuments(documente)].filter(Boolean).join("\n\n"));
    for (let nudge = 0; nudge < 2 && !accepted && result.subtype === "success" && !ctx.signal.aborted; nudge++) {
      result = await session.send("Nu ai predat încă proiectul. Finalizează cercetarea și apelează finalizeaza_proiect cu proiectul complet.");
    }
  } finally {
    await session.close();
    ctx.recordUsage(usage.report());
  }
  if (ctx.signal.aborted) throw ctx.signal.reason ?? new Error("Anulat.");
  const done = accepted as Proiect | null;
  if (!done) throw new Error("Agentul nu a predat proiectul documentului. Încearcă din nou.");

  const doc = proiectToDoc(done);
  const blocks = blockTexts(doc);
  const placeholders = [...new Set(blocks.flatMap((b) => [...b.text.matchAll(PLACEHOLDER_RE)].map((m) => m[0])))];
  const versionId = addDocumentVersion(db, input.documentId, doc, "generare", "Proiect generat de LexAI");
  // fără notă de conformitate: rândul păstrează doar câmpurile de completat (forma veche, cu temeiuri goale)
  const generatLa = new Date().toISOString();
  db.update(drafts)
    .set({ conformitate: JSON.stringify({ document: done.titlu, dataReferinta: input.parametri.dataLegii, verificatLa: generatLa, proiect: null, temeiuri: [], neacoperite: [], deCompletat: placeholders, generatLa }) })
    .where(eq(drafts.id, input.draftId))
    .run();
  ctx.emit("proiect", { versionId, deCompletat: placeholders.length });
  return { versionId, deCompletat: placeholders.length };
};
