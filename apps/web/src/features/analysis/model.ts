import { findingSignature, partitionIgnored, suggestionSituation, suggestionsOf } from "@lexai/core/findings";
import { STATUS_ORDER } from "@lexai/core/labels";
import type { Finding, Suggestion, VerdictStatus } from "@lexai/core/types";
import type { FindingActionKind } from "./types";

/**
 * Funcții pure pentru constatări (docs/ux/08-rezultate-analiza.md): numărare, navigare j/k,
 * evidențierile din document, variantele de sugestie. Lista de triaj e în `triage.ts`.
 */

export { STATUS_ORDER, findingSignature, partitionIgnored, suggestionSituation, suggestionsOf };

export type StatusCounts = Record<VerdictStatus, number>;

export function emptyCounts(): StatusCounts {
  return { eroare_citare: 0, interpretare_discutabila: 0, necesita_analiza_umana: 0, neverificat: 0, corect: 0 };
}

export function countByStatus(findings: readonly Finding[]): StatusCounts {
  const c = emptyCounts();
  for (const f of findings) c[f.status]++;
  return c;
}

/** Următoarea (1) sau anterioara (-1) constatare din listă; fără selecție, prima sau ultima. Nu trece de capete. */
export function stepSelection(ids: readonly string[], current: string | null, dir: 1 | -1): string | null {
  if (!ids.length) return null;
  const i = current ? ids.indexOf(current) : -1;
  if (i < 0) return dir > 0 ? ids[0] : ids[ids.length - 1];
  return ids[Math.min(ids.length - 1, Math.max(0, i + dir))];
}

/** Evidențierea unei constatări în editor (aceeași formă ca `HighlightItem` din bridge). */
export interface FindingHighlight {
  id: string;
  segId: string;
  quote: string;
  status: VerdictStatus;
}

const ANCHOR_SEP = "::";

/** id-ul evidențierii → id-ul constatării (o constatare cu mai multe ancore are mai multe evidențieri). */
export const findingIdOf = (highlightId: string): string => highlightId.split(ANCHOR_SEP)[0];

/**
 * Evidențierile din document: toate constatările cu ancore, în afară de cele rezolvate (aplicate,
 * verificate sau ignorate) și de cele corecte (doar cât e deschis grupul „Corecte”).
 */
export function highlightItems(
  findings: readonly Finding[],
  opts: { showCorrect: boolean; actions: Readonly<Record<string, FindingActionKind>> },
): FindingHighlight[] {
  const out: FindingHighlight[] = [];
  for (const f of findings) {
    if (opts.actions[f.id]) continue;
    if (f.status === "corect" && !opts.showCorrect) continue;
    f.anchors.forEach((a, i) => {
      if (!a.segmentId) return;
      out.push({ id: i === 0 ? f.id : `${f.id}${ANCHOR_SEP}${i}`, segId: a.segmentId, quote: f.citat, status: f.status });
    });
  }
  return out;
}

/** Semnătura unei liste de evidențieri: aceeași semnătură = nimic de redesenat. */
export const highlightsSignature = (items: readonly FindingHighlight[]): string => items.map((h) => `${h.id}|${h.segId}|${h.status}|${h.quote}`).join("\n");

/**
 * Constatările afișate cât rulează o reverificare sau o reluare: cele din analiza de bază,
 * înlocuite de cele sosite live (același id). Cele de bază din paragrafele reverificate sunt
 * „în reverificare” până sosesc rezultatele noi.
 */
export function mergeLive(base: readonly Finding[], live: readonly Finding[], recheckSegIds: readonly string[] | null): { findings: Finding[]; pending: Set<string> } {
  const liveIds = new Set(live.map((f) => f.id));
  const recheck = new Set(recheckSegIds ?? []);
  const pending = new Set<string>();
  const kept: Finding[] = [];
  for (const f of base) {
    if (liveIds.has(f.id)) continue;
    kept.push(f);
    if (f.anchors.some((a) => recheck.has(a.segmentId))) pending.add(f.id);
  }
  return { findings: [...kept, ...live], pending };
}

/** „03:12” sau „1:02:03”. */
export function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Textul scurtat la o limită, la final de propoziție sau de cuvânt. */
export function shorten(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const sentence = cut.lastIndexOf(". ");
  if (sentence > max * 0.5) return cut.slice(0, sentence + 1);
  const word = cut.lastIndexOf(" ");
  return `${cut.slice(0, word > max * 0.5 ? word : max).trimEnd()}…`;
}

// ───────────────────────── Constatări ignorate ─────────────────────────

/**
 * Acțiunile afișate: cele din server plus „ignorata” pentru orice constatare a cărei semnătură
 * e ignorată în document (și pentru constatările sosite live, cu id-uri noi). O constatare
 * aplicată sau verificată își păstrează acțiunea.
 */
export function withIgnoredActions(
  findings: readonly Finding[],
  actions: Readonly<Record<string, FindingActionKind>>,
  ignored: ReadonlySet<string>,
): Record<string, FindingActionKind> {
  const out: Record<string, FindingActionKind> = {};
  for (const [id, a] of Object.entries(actions)) if (a === "aplicata" || a === "verificata") out[id] = a;
  if (!ignored.size) return out;
  for (const f of findings) if (!out[f.id] && ignored.has(findingSignature(f))) out[f.id] = "ignorata";
  return out;
}

// ───────────────────────── Variantele de sugestie ─────────────────────────

/** O variantă de sugestie, pregătită pentru afișare. */
export interface SuggestionView {
  /** indicele în `Finding.sugestii` (de trimis la `recordFindingAction` ca `suggestionIndex`) */
  index: number;
  suggestion: Suggestion;
  /** eticheta situației („Clauza este convențională”), „Varianta n” sau null când e una singură */
  situatie: string | null;
  /** poate fi aplicată în editor (are text original; textul propus gol = eliminare) */
  applicable: boolean;
  /** varianta elimină pasajul (text propus gol) */
  removes: boolean;
}

export const canApplySuggestion = (s: Pick<Suggestion, "textOriginal" | "textPropus">): boolean => Boolean(s.textOriginal.trim()) && s.textOriginal !== s.textPropus;

/** Variantele de sugestie ale unei constatări (și din rezultatele vechi, cu doar `sugestie`). */
export function suggestionViews(f: Pick<Finding, "sugestii" | "sugestie">): SuggestionView[] {
  const list = suggestionsOf(f);
  return list.map((s, index) => ({
    index,
    suggestion: s,
    situatie: suggestionSituation(s, index, list.length),
    applicable: canApplySuggestion(s),
    removes: !s.textPropus.trim(),
  }));
}

/** Varianta `index` (implicit prima) sau null. */
export function suggestionAt(f: Pick<Finding, "sugestii" | "sugestie">, index = 0): Suggestion | null {
  return suggestionsOf(f)[index] ?? null;
}

/** Constatarea cerea o sugestie, dar nu are niciuna validă (agentul nu a propus una după reîncercări). */
export const suggestionMissing = (f: Pick<Finding, "sugestiiLipsa" | "sugestii" | "sugestie">): boolean => Boolean(f.sugestiiLipsa) && suggestionsOf(f).length === 0;
