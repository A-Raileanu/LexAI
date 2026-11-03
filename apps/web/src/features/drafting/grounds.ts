import type { FindingEvidence } from "@lexai/core/types";
import type { HighlightItem, HighlightStatus } from "@/features/editor/highlights";
import type { GroundRecord } from "./types";

/**
 * Temeiurile documentului generat (docs/ux/10-generare-temeiuri.md, faza B): starea fiecăruia,
 * gruparea pe clauze în ordinea documentului, rezumatul și evidențierile din foaie.
 * Funcții pure, testate în apps/web/tests/drafting-helpers.test.ts.
 */

/** Starea afișată: cea declarată de agent sau „nevalidat”, dacă validarea pe textul oficial a eșuat. */
export type GroundState = "respectat" | "de_completat" | "de_verificat" | "nevalidat";

export const GROUND_STATES: GroundState[] = ["nevalidat", "de_verificat", "de_completat", "respectat"];

/** Gravitatea: 0 = cea mai slabă stare. */
const SEVERITY: Record<GroundState, number> = { nevalidat: 0, de_verificat: 1, de_completat: 2, respectat: 3 };

export const STATE_LABELS: Record<GroundState, { label: string; plural: string }> = {
  respectat: { label: "Respectat", plural: "respectate" },
  de_completat: { label: "De completat", plural: "de completat" },
  de_verificat: { label: "De verificat", plural: "de verificat" },
  nevalidat: { label: "Nevalidat", plural: "nevalidate" },
};

export const TYPE_LABELS: Record<GroundRecord["temei"]["tip"], string> = { temei: "Temei", cerinta: "Cerință", limita: "Limită" };

/** Culorile stărilor din foaie, aceleași ca la analiză. */
export const STATE_HIGHLIGHT: Record<GroundState, HighlightStatus> = {
  respectat: "corect",
  de_verificat: "necesita_analiza_umana",
  de_completat: "interpretare_discutabila",
  nevalidat: "neverificat",
};

export function groundState(g: Pick<GroundRecord, "temei" | "erori">): GroundState {
  return g.erori.length ? "nevalidat" : g.temei.stare;
}

export function worstState(states: GroundState[]): GroundState {
  return states.reduce<GroundState>((w, s) => (SEVERITY[s] < SEVERITY[w] ? s : w), "respectat");
}

/** Id-ul evidențierii și al rândului din panou; indexul păstrează unicitatea dacă id-urile se repetă. */
export const groundKey = (index: number) => `tm-${index}`;

export interface IndexedGround {
  index: number;
  key: string;
  ground: GroundRecord;
  state: GroundState;
}

export interface GroundGroup {
  key: string;
  segId: string | null;
  /** „Art. 3 alin. 3.2” sau „Fără loc în document” */
  label: string;
  /** începutul clauzei din document */
  excerpt: string | null;
  state: GroundState;
  counts: Record<GroundState, number>;
  items: IndexedGround[];
}

export const NO_CLAUSE = "Fără loc în document";

const emptyCounts = (): Record<GroundState, number> => ({ respectat: 0, de_completat: 0, de_verificat: 0, nevalidat: 0 });

export function countStates(states: GroundState[]): Record<GroundState, number> {
  const c = emptyCounts();
  for (const s of states) c[s]++;
  return c;
}

/**
 * Clauzele în ordinea documentului (`segOrder` = segId-urile blocurilor, de sus în jos); clauzele
 * negăsite în document la final, apoi temeiurile fără clauză. În fiecare clauză, temeiurile cele
 * mai slabe întâi, apoi în ordinea notei.
 */
export function groupGrounds(temeiuri: GroundRecord[], segOrder: string[], segText: ReadonlyMap<string, string> = new Map()): GroundGroup[] {
  const pos = new Map(segOrder.map((id, i) => [id, i]));
  const groups = new Map<string, { segId: string | null; first: number; items: IndexedGround[] }>();
  temeiuri.forEach((ground, index) => {
    const segId = ground.segId ?? null;
    const key = segId ?? "";
    const g = groups.get(key) ?? { segId, first: index, items: [] };
    g.items.push({ index, key: groundKey(index), ground, state: groundState(ground) });
    groups.set(key, g);
  });
  const rank = (g: { segId: string | null; first: number }) => (g.segId === null ? [2, g.first] : pos.has(g.segId) ? [0, pos.get(g.segId)!] : [1, g.first]);
  return [...groups.values()]
    .sort((a, b) => {
      const [ra, ia] = rank(a);
      const [rb, ib] = rank(b);
      return ra - rb || ia - ib;
    })
    .map((g) => {
      const items = [...g.items].sort((a, b) => SEVERITY[a.state] - SEVERITY[b.state] || a.index - b.index);
      const clauze = items.map((x) => x.ground.temei.clauza?.trim()).filter((c): c is string => Boolean(c));
      const label = g.segId === null ? NO_CLAUSE : clauze.reduce<string | null>((best, c) => (best === null || c.length < best.length ? c : best), null) ?? "Clauză";
      const text = (g.segId ? segText.get(g.segId) : undefined) ?? items.map((x) => x.ground.temei.text_clauza?.trim()).find(Boolean) ?? null;
      const states = items.map((x) => x.state);
      return { key: g.segId ?? "fara-clauza", segId: g.segId, label, excerpt: text ? truncate(text, 140) : null, state: worstState(states), counts: countStates(states), items };
    });
}

export function truncate(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? `1 ${one}` : `${n} ${n % 100 >= 20 || (n >= 100 && n % 100 === 0) ? "de " : ""}${many}`);

/** „6 temeiuri · 4 respectate · 1 de completat · 1 de verificat” (stările goale lipsesc). */
export function summaryLine(temeiuri: Pick<GroundRecord, "temei" | "erori">[]): string {
  const c = countStates(temeiuri.map(groundState));
  const parts = [plural(temeiuri.length, "temei", "temeiuri")];
  if (c.respectat) parts.push(`${c.respectat} ${c.respectat === 1 ? "respectat" : "respectate"}`);
  if (c.de_completat) parts.push(`${c.de_completat} de completat`);
  if (c.de_verificat) parts.push(`${c.de_verificat} de verificat`);
  if (c.nevalidat) parts.push(`${c.nevalidat} ${c.nevalidat === 1 ? "nevalidat" : "nevalidate"}`);
  return parts.join(" · ");
}

/** Evidențierile clauzelor în foaie (temeiurile fără bloc nu au evidențiere). */
export function groundHighlights(temeiuri: GroundRecord[]): HighlightItem[] {
  return temeiuri.flatMap((g, i) =>
    g.segId ? [{ id: groundKey(i), segId: g.segId, quote: g.temei.text_clauza?.trim() ?? "", status: STATE_HIGHLIGHT[groundState(g)] }] : [],
  );
}

/** Indexul temeiului dintr-un id de evidențiere, sau null. */
export function groundIndexFromKey(id: string): number | null {
  const m = id.match(/^tm-(\d+)$/);
  return m ? Number(m[1]) : null;
}

// ───────────────────────── lista de triaj (docs/ux/08b, aplicat temeiurilor) ─────────────────────────

/** Ordinea grupurilor din panou: cele care cer atenție întâi, respectatele la final (închise). */
export const STATE_GROUP_ORDER: GroundState[] = ["nevalidat", "de_completat", "de_verificat", "respectat"];

export const STATE_GROUP_LABELS: Record<GroundState, string> = {
  nevalidat: "Nevalidate",
  de_completat: "De completat",
  de_verificat: "De verificat",
  respectat: "Respectate",
};

export interface StateGroup {
  state: GroundState;
  items: IndexedGround[];
}

/**
 * Temeiurile grupate pe stare (fără grupuri goale); în grup, în ordinea documentului (blocurile
 * negăsite, apoi cele fără loc, la final), apoi în ordinea notei.
 */
export function groupByState(temeiuri: GroundRecord[], segOrder: string[]): StateGroup[] {
  const pos = new Map(segOrder.map((id, i) => [id, i]));
  const rank = (g: GroundRecord) => (g.segId === null ? Number.MAX_SAFE_INTEGER : (pos.get(g.segId) ?? Number.MAX_SAFE_INTEGER - 1));
  const items: IndexedGround[] = temeiuri.map((ground, index) => ({ index, key: groundKey(index), ground, state: groundState(ground) }));
  return STATE_GROUP_ORDER.map((state) => ({
    state,
    items: items.filter((i) => i.state === state).sort((a, b) => rank(a.ground) - rank(b.ground) || a.index - b.index),
  })).filter((g) => g.items.length > 0);
}

/** „Art. 7 alin. 7.2” → „Art. 7.2”; „Clauza 4” rămâne; fără clauză: locul blocului din document. */
export function shortClause(clauza: string | null | undefined, fallback: string | null = null): string | null {
  const c = clauza?.replace(/\s+/g, " ").trim();
  if (!c) return fallback;
  const m = c.match(/^Art(?:icolul|\.)?\s*(\d+)\s*(?:,\s*)?alin(?:\.|eatul)?\s*\(?(\d+(?:\.\d+)*)\)?/i);
  if (m) return m[2].startsWith(`${m[1]}.`) ? `Art. ${m[2]}` : `Art. ${m[1]}(${m[2]})`;
  const a = c.match(/^Art(?:icolul|\.)?\s*(\d+(?:\.\d+)*)/i);
  if (a) return `Art. ${a[1]}`;
  return truncate(c, 24);
}

/** Actele din textul normei, cu abrevierile din 08b (ordinea contează: procedura înaintea codului). */
const NORM_ACTS: [RegExp, string][] = [
  [/(?:din\s+)?Cod(?:ul)?\s+de\s+procedur[aă]\s+civil[aă]|(?:din\s+)?Cod(?:ul)?\s+procedur[aă]\s+civil[aă]/gi, "C. proc. civ."],
  [/(?:din\s+)?Cod(?:ul)?\s+de\s+procedur[aă]\s+penal[aă]|(?:din\s+)?Cod(?:ul)?\s+procedur[aă]\s+penal[aă]/gi, "C. proc. pen."],
  [/(?:din\s+)?Cod(?:ul)?\s+de\s+procedur[aă]\s+fiscal[aă]/gi, "C. proc. fisc."],
  [/(?:din\s+)?Cod(?:ul)?\s+civil/gi, "C. civ."],
  [/(?:din\s+)?Cod(?:ul)?\s+penal/gi, "C. pen."],
  [/(?:din\s+)?Cod(?:ul)?\s+fiscal/gi, "C. fisc."],
  [/(?:din\s+)?Cod(?:ul)?\s+muncii/gi, "C. muncii"],
  [/(?:din\s+)?Cod(?:ul)?\s+administrativ/gi, "C. adm."],
  [/(?:din\s+)?(?:Ordonan[țţt]a\s+de\s+urgen[țţt][aă](?:\s+a\s+Guvernului)?|O\.?U\.?G\.?)\s+nr\.?\s*(\d+)\s*\/\s*(\d{4})/gi, "OUG $1/$2"],
  [/(?:din\s+)?(?:Ordonan[țţt]a(?:\s+Guvernului)?|O\.?G\.?)\s+nr\.?\s*(\d+)\s*\/\s*(\d{4})/gi, "OG $1/$2"],
  [/(?:din\s+)?(?:Hot[aă]r[aâ]rea\s+Guvernului|H\.?G\.?)\s+nr\.?\s*(\d+)\s*\/\s*(\d{4})/gi, "HG $1/$2"],
  [/(?:din\s+)?Legea\s+nr\.?\s*(\d+)\s*\/\s*(\d{4})/gi, "L. $1/$2"],
];

/** Norma scurtă: „art. 453 alin. (1) din Codul de procedură civilă” → „art. 453 alin. (1) C. proc. civ.”. */
export function shortNorm(norma: string): string {
  let out = norma.replace(/\s+/g, " ").trim();
  for (const [re, abbr] of NORM_ACTS) out = out.replace(re, abbr);
  // „(republicată)”, „, cu modificările ulterioare” nu ajută în rând
  return out.replace(/\s*\((?:republicat[aă]?|r\d*)\)/gi, "").replace(/,?\s*cu modific[aă]rile(?: [șş]i complet[aă]rile)? ulterioare/gi, "").trim();
}

/** Abrevierea actului unei dovezi, pentru a o compara cu norma (null dacă nu o știm). */
export function evidenceActShort(d: Pick<FindingEvidence, "evidence">): string | null {
  const t = d.evidence.act?.titlu;
  if (!t) return null;
  const s = shortNorm(t.replace(/\*+/g, ""));
  const code = s.match(/C\. (?:proc\. )?[a-zăâîșț]+\./i)?.[0] ?? s.match(/\bC\. muncii\b/)?.[0];
  if (code) return code;
  const m = t.match(/^(LEGE|ORDONAN[ȚŢT][AĂ] DE URGEN[ȚŢT][AĂ]|ORDONAN[ȚŢT][AĂ]|HOT[AĂ]R[AÂ]RE)\s+nr\.\s*(\d+)\s+din\s+.*?(\d{4})/i);
  if (!m) return null;
  const tip = m[1].toUpperCase().startsWith("LEGE") ? "L." : /URGEN/i.test(m[1]) ? "OUG" : /^ORDON/i.test(m[1]) ? "OG" : "HG";
  return `${tip} ${m[2]}/${m[3]}`;
}

/**
 * Linia sursei de sub citat: „Portal Legislativ · forma din 14.12.2025”; actul și unitatea apar
 * doar dacă diferă de cele din normă.
 */
export function evidenceSourceLine(d: Pick<FindingEvidence, "evidence">, norma: string, fmt: (iso: string) => string): string {
  const e = d.evidence;
  const parts: string[] = [];
  const act = evidenceActShort(d);
  const norm = shortNorm(norma);
  if (e.act && (!act || !norm.includes(act))) parts.push(evidenceTitle(d));
  parts.push(sourceName(e.url));
  const forma = e.versiune?.data ?? e.dataReferinta ?? null;
  if (forma) parts.push(`forma din ${fmt(forma)}`);
  return parts.join(" · ");
}

// ───────────────────────── dovezi ─────────────────────────

const HOSTS: [RegExp, string][] = [
  [/(^|\.)legislatie\.just\.ro$/, "Portal Legislativ"],
  [/(^|\.)ccr\.ro$/, "Curtea Constituțională"],
  [/(^|\.)scj\.ro$/, "Înalta Curte de Casație și Justiție"],
  [/(^|\.)eur-lex\.europa\.eu$/, "EUR-Lex"],
  [/(^|\.)hudoc\.echr\.coe\.int$/, "HUDOC (CEDO)"],
  [/(^|\.)monitoruloficial\.ro$/, "Monitorul Oficial"],
];

/** Numele sursei după adresă („Portal Legislativ”), altfel domeniul. */
export function sourceName(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Sursă";
  }
  return HOSTS.find(([re]) => re.test(host))?.[1] ?? host;
}

/** „Codul civil (Legea nr. 287/2009), art. 1522” — titlul actului fără asteriscuri, plus unitatea. */
export function evidenceTitle(d: Pick<FindingEvidence, "evidence">): string {
  const e = d.evidence;
  const act = e.act?.titlu?.replace(/\*+/g, "").replace(/\(\s*republicat\s*\)/gi, "(republicat)").replace(/\s+/g, " ").trim();
  return [act, e.unitate].filter(Boolean).join(", ") || "Text oficial";
}

/**
 * Câmpurile de completat rămase: aparițiile, valorile distincte și câte din cele inițiale au fost
 * completate. Un câmp inițial al cărui text a rămas în document (ca text simplu, fără marcaj) nu
 * se socotește completat.
 */
export function fillProgress(remaining: { text: string }[], initial: string[], docText = ""): { remaining: number; distinct: number; total: number; done: number } {
  const distinct = new Set(remaining.map((p) => p.text.trim())).size;
  const left = new Set(remaining.map((p) => p.text.trim()));
  const total = initial.length;
  const done = initial.filter((t) => !left.has(t.trim()) && !docText.includes(t.trim())).length;
  return { remaining: remaining.length, distinct, total: Math.max(total, distinct), done };
}

// ───────────────────────── câmpuri de completat ─────────────────────────

export interface SegmentLike {
  segId: string;
  text: string;
  kind: string;
}

/**
 * Contextul unui câmp `[● …]`: titlul secțiunii în care se află (ultimul titlu dinaintea blocului)
 * și câteva cuvinte din jurul lui.
 */
export function placeholderContext(segments: SegmentLike[], segId: string | null, text: string, radius = 48): { section: string | null; before: string; after: string } {
  const i = segId ? segments.findIndex((s) => s.segId === segId) : -1;
  if (i < 0) return { section: null, before: "", after: "" };
  let section: string | null = null;
  for (let j = i - (segments[i].kind === "titlu" ? 0 : 1); j > 0; j--) {
    if (segments[j].kind === "titlu") {
      section = truncate(segments[j].text, 60);
      break;
    }
  }
  const block = segments[i].text.replace(/\s+/g, " ");
  const at = block.indexOf(text.replace(/\s+/g, " "));
  if (at < 0) return { section, before: truncate(block, radius * 2), after: "" };
  const rawBefore = block.slice(Math.max(0, at - radius), at);
  const rawAfter = block.slice(at + text.length, at + text.length + radius);
  // tăiem la margine de cuvânt
  const cutBefore = at > radius;
  const cutAfter = at + text.length + radius < block.length;
  const before = cutBefore ? `…${rawBefore.slice(rawBefore.indexOf(" ") + 1)}` : rawBefore.trimStart();
  const after = cutAfter ? `${rawAfter.slice(0, Math.max(rawAfter.lastIndexOf(" "), 0))}…` : rawAfter.trimEnd();
  return { section, before, after };
}
