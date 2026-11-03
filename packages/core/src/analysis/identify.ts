import { z } from "zod";
import { MODEL, structuredResult } from "@lexai/ai";
import { claudeCli, type AiClient } from "../ai";
import type { DocSegment, LegalReference } from "../types";
import type { UsageTracker } from "../usage";
import { looseKey } from "../text/normalize";
import { IDENTIFY_SYSTEM } from "./prompts";

const ReferenceSchema = z.object({
  segment_id: z.string(),
  citat: z.string(),
  tip: z.enum(["explicita", "implicita"]),
  act: z
    .object({
      tip: z.string().nullable(),
      numar: z.string().nullable(),
      an: z.string().nullable(),
      denumire: z.string().nullable(),
    })
    .nullable(),
  unitate: z.string().nullable(),
  afirmatie: z.string(),
});

const IdentifySchema = z.object({
  data_document: z.string().nullable(),
  trimiteri: z.array(ReferenceSchema),
});

export type { LegalReference };

export interface IdentifyResult {
  dataDocument: string | null;
  references: LegalReference[];
}

/** Segmentele, numerotate, așa cum le vede modelul. */
export function renderSegments(segments: DocSegment[]): string {
  return segments
    .map((s) => {
      const tags = [s.kind !== "paragraf" ? s.kind : "", s.page ? `p.${s.page}` : "", s.quality !== "ok" ? s.quality : ""]
        .filter(Boolean)
        .join(", ");
      return `[${s.id}]${tags ? ` (${tags})` : ""} ${s.text}`;
    })
    .join("\n");
}

const CHUNK_CHARS = 120_000;

function chunkSegments(segments: DocSegment[]): DocSegment[][] {
  const chunks: DocSegment[][] = [];
  let cur: DocSegment[] = [];
  let size = 0;
  for (const s of segments) {
    if (size + s.text.length > CHUNK_CHARS && cur.length) {
      chunks.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(s);
    size += s.text.length + 10;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

async function identifyChunk(chunk: DocSegment[], part: number, parts: number, usage: UsageTracker, signal: AbortSignal | undefined, ai: AiClient) {
  const result = await ai.run(
    {
      model: MODEL,
      effort: "medium",
      maxOutputTokens: 64000,
      system: IDENTIFY_SYSTEM,
      jsonSchema: z.toJSONSchema(IdentifySchema),
      signal,
      onMessage: (m) => usage.record("identificare", m.model, m.usage),
      onLimits: (l) => usage.setLimits(l),
    },
    (parts > 1 ? `Partea ${part} din ${parts} a documentului.\n\n` : "") +
      `<document>\n${renderSegments(chunk)}\n</document>\n\nIdentifică toate trimiterile la legislația românească.`,
  );
  if (result.stopReason === "refusal") {
    throw new Error("Modelul a refuzat analiza acestei părți a documentului.");
  }
  if (result.stopReason === "max_tokens") {
    throw new Error("Documentul conține prea multe trimiteri pentru o singură trecere; răspunsul a fost trunchiat.");
  }
  return IdentifySchema.parse(structuredResult(result, "identificarea trimiterilor"));
}

export interface IdentifyOptions {
  ai?: AiClient;
  /** numerotarea trimiterilor continuă de aici (T{idOffset+1}, …), ca la reverificarea unor paragrafe */
  idOffset?: number;
}

export async function identifyReferences(segments: DocSegment[], usage: UsageTracker, signal?: AbortSignal, opts: IdentifyOptions = {}): Promise<IdentifyResult> {
  const ai = opts.ai ?? claudeCli;
  const offset = opts.idOffset ?? 0;
  const chunks = chunkSegments(segments.filter((s) => s.text.trim()));
  const results = await Promise.all(chunks.map((c, i) => identifyChunk(c, i + 1, chunks.length, usage, signal, ai)));
  const known = new Set(segments.map((s) => s.id));
  const references: LegalReference[] = [];
  const seen = new Set<string>();
  let dataDocument: string | null = null;
  for (const r of results) {
    dataDocument ??= r.data_document && /^\d{4}-\d{2}-\d{2}$/.test(r.data_document) ? r.data_document : null;
    for (const t of r.trimiteri) {
      if (!known.has(t.segment_id)) continue;
      const key = `${t.segment_id}|${t.citat}`;
      if (seen.has(key)) continue;
      seen.add(key);
      references.push({ ...t, id: `T${offset + references.length + 1}` });
    }
  }
  return { dataDocument, references };
}

// ───────────────────────── Grupare pe acte ─────────────────────────

export interface ReferenceGroup {
  cheie: string;
  eticheta: string;
  references: LegalReference[];
}

const CODE_ALIASES: [RegExp, string][] = [
  [/codul? de procedura civila|\bc\.?\s?proc\.?\s?civ|\bcpc\b/, "lege|134|2010"],
  [/codul? de procedura penala|\bc\.?\s?proc\.?\s?pen|\bcpp\b/, "lege|135|2010"],
  [/codul? de procedura fiscala/, "lege|207|2015"],
  [/codul? civil|\bc\.?\s?civ\b/, "lege|287|2009"],
  [/codul? penal|\bc\.?\s?pen\b/, "lege|286|2009"],
  [/codul? muncii/, "lege|53|2003"],
  [/codul? fiscal/, "lege|227|2015"],
  [/codul? administrativ/, "oug|57|2019"],
];

function normType(t: string | null): string {
  const k = (t ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, "").trim();
  if (/urgenta|^oug/.test(k)) return "oug";
  if (/^og$|^ordonanta/.test(k)) return "og";
  if (/^hg$|hotarare/.test(k)) return "hg";
  if (/^l$|^lege/.test(k)) return "lege";
  if (/constitut/.test(k)) return "constitutie";
  return k || "act";
}

export function groupKey(r: LegalReference): string {
  const a = r.act;
  if (a?.numar && a?.an) return `${normType(a.tip)}|${a.numar.replace(/\D/g, "")}|${a.an}`;
  const name = (a?.denumire ?? a?.tip ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  for (const [re, key] of CODE_ALIASES) if (re.test(name)) return key;
  if (/constitut/.test(name)) return "constitutie";
  if (name.trim()) return `nume|${name.replace(/\s+/g, " ").trim()}`;
  return "neidentificat";
}

export function groupLabel(r: LegalReference): string {
  const a = r.act;
  if (!a) return "Trimiteri fără act identificat";
  if (a.denumire && !a.numar) return a.denumire;
  const tip = a.tip ?? "Act";
  return `${tip.charAt(0).toUpperCase()}${tip.slice(1)}${a.numar ? ` nr. ${a.numar}` : ""}${a.an ? `/${a.an}` : ""}${a.denumire ? ` (${a.denumire})` : ""}`;
}

const MAX_PER_GROUP = 10;
/** grupurile cu cel mult atâtea trimiteri sunt comasate, ca să nu plătim de fiecare dată promptul și instrumentele */
const SMALL_GROUP = 2;
const MAX_MIXED_GROUP = 6;

/**
 * O trimitere preia verdictul alteia doar dacă și contextul e echivalent: același act și
 * aceeași unitate, același citat, aceeași afirmație și același text al pasajului. Două
 * clauze cu aceeași propoziție dar despre situații diferite se verifică separat
 * (sursa legislativă se refolosește oricum, din cache).
 */
export function dedupeReferences(
  refs: LegalReference[],
  segments: DocSegment[],
): { unique: LegalReference[]; duplicates: Map<string, LegalReference[]> } {
  const segText = new Map(segments.map((s) => [s.id, looseKey(s.text)]));
  const byKey = new Map<string, LegalReference>();
  const duplicates = new Map<string, LegalReference[]>();
  const unique: LegalReference[] = [];
  for (const r of refs) {
    const key = [groupKey(r), looseKey(r.unitate ?? ""), looseKey(r.citat), looseKey(r.afirmatie), segText.get(r.segment_id) ?? r.segment_id].join("|");
    const canonical = byKey.get(key);
    if (canonical) duplicates.set(canonical.id, [...(duplicates.get(canonical.id) ?? []), r]);
    else {
      byKey.set(key, r);
      unique.push(r);
    }
  }
  return { unique, duplicates };
}

export function groupReferences(refs: LegalReference[]): ReferenceGroup[] {
  const map = new Map<string, ReferenceGroup>();
  for (const r of refs) {
    const k = groupKey(r);
    const g = map.get(k) ?? { cheie: k, eticheta: groupLabel(r), references: [] };
    g.references.push(r);
    map.set(k, g);
  }
  // grupurile mari sunt împărțite, ca fiecare agent să rămână concentrat;
  // cele mici sunt comasate într-un agent comun
  const out: ReferenceGroup[] = [];
  const small = [...map.values()].filter((g) => g.references.length <= SMALL_GROUP);
  if (small.length > 1) {
    let batch: ReferenceGroup[] = [];
    const flush = () => {
      if (!batch.length) return;
      out.push({
        cheie: batch.map((g) => g.cheie).join("+"),
        eticheta: batch.map((g) => g.eticheta).join(" · "),
        references: batch.flatMap((g) => g.references),
      });
      batch = [];
    };
    for (const g of small) {
      if (batch.reduce((n, b) => n + b.references.length, 0) + g.references.length > MAX_MIXED_GROUP) flush();
      batch.push(g);
      map.delete(g.cheie);
    }
    flush();
  }
  for (const g of map.values()) {
    if (g.references.length <= MAX_PER_GROUP) {
      out.push(g);
      continue;
    }
    for (let i = 0; i < g.references.length; i += MAX_PER_GROUP) {
      const part = Math.floor(i / MAX_PER_GROUP) + 1;
      out.push({ cheie: `${g.cheie}#${part}`, eticheta: `${g.eticheta} (${part})`, references: g.references.slice(i, i + MAX_PER_GROUP) });
    }
  }
  return out;
}
