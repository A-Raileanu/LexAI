import { normalizeWithMap } from "./normalize";

export type MatchQuality = "exacta" | "aproximativa" | "negasita";

export interface LocatedQuote {
  start: number;
  end: number;
  potrivire: MatchQuality;
  /** 0–1, doar pentru potriviri aproximative */
  scor?: number;
}

/**
 * Găsește poziția exactă a unui citat într-un text (indici în textul ORIGINAL).
 * 1. potrivire exactă după normalizare (diacritice, ghilimele, spații)
 * 2. potrivire exactă fără diacritice / fără majuscule
 * 3. potrivire aproximativă pe ferestre de cuvinte (marcată ca atare)
 * Nu întoarce niciodată „tot paragraful” ca rezultat implicit.
 */
export function locateQuote(text: string, quote: string, hintStart?: number): LocatedQuote {
  if (!quote.trim() || !text.trim()) return { start: 0, end: 0, potrivire: "negasita" };

  for (const opts of [{}, { stripDiacritics: true, lowercase: true }]) {
    const t = normalizeWithMap(text, opts);
    const q = normalizeWithMap(quote, opts).text;
    if (!q) continue;
    const idx = pickOccurrence(t.text, q, hintStart, t.map);
    if (idx >= 0) {
      const start = t.map[idx];
      const end = t.map[idx + q.length - 1] + 1;
      return { start, end, potrivire: "exacta" };
    }
  }

  const fuzzy = fuzzyLocate(text, quote);
  if (fuzzy) return fuzzy;
  return { start: 0, end: 0, potrivire: "negasita" };
}

function pickOccurrence(hay: string, needle: string, hintStart: number | undefined, map: number[]): number {
  let idx = hay.indexOf(needle);
  if (idx < 0 || hintStart === undefined) return idx;
  // dacă există mai multe apariții, o alegem pe cea mai apropiată de indiciu
  let best = idx;
  let bestDist = Math.abs(map[idx] - hintStart);
  while ((idx = hay.indexOf(needle, idx + 1)) >= 0) {
    const d = Math.abs(map[idx] - hintStart);
    if (d < bestDist) {
      best = idx;
      bestDist = d;
    }
  }
  return best;
}

interface Token {
  word: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const norm = normalizeWithMap(text, { stripDiacritics: true, lowercase: true });
  const tokens: Token[] = [];
  const re = /[\p{L}\p{N}^]+/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(norm.text))) {
    tokens.push({
      word: m[0],
      start: norm.map[m.index],
      end: norm.map[m.index + m[0].length - 1] + 1,
    });
  }
  return tokens;
}

/**
 * Potrivire aproximativă: fereastra de cuvinte cu cel mai mare scor de suprapunere
 * (bigrame de cuvinte, în ordine). Acceptată doar peste un prag ridicat.
 */
function fuzzyLocate(text: string, quote: string): LocatedQuote | null {
  const tt = tokenize(text);
  const qt = tokenize(quote).map((t) => t.word);
  if (qt.length < 3 || tt.length === 0) return null;

  const qBigrams = new Set<string>();
  for (let i = 0; i < qt.length - 1; i++) qBigrams.add(qt[i] + " " + qt[i + 1]);
  const qWords = new Set(qt);

  const win = qt.length;
  let best: { score: number; i: number } | null = null;
  for (let i = 0; i + Math.max(2, Math.floor(win * 0.7)) <= tt.length; i++) {
    const slice = tt.slice(i, Math.min(tt.length, i + win));
    let wordHits = 0;
    for (const t of slice) if (qWords.has(t.word)) wordHits++;
    let bigramHits = 0;
    for (let j = 0; j < slice.length - 1; j++) {
      if (qBigrams.has(slice[j].word + " " + slice[j + 1].word)) bigramHits++;
    }
    const score = 0.4 * (wordHits / win) + 0.6 * (bigramHits / Math.max(1, qBigrams.size));
    if (!best || score > best.score) best = { score, i };
  }
  if (!best || best.score < 0.6) return null;

  // restrânge fereastra la primul și ultimul cuvânt care apar în citat
  let s = best.i;
  let e = Math.min(tt.length, best.i + win) - 1;
  while (s < e && !qWords.has(tt[s].word)) s++;
  while (e > s && !qWords.has(tt[e].word)) e--;
  return {
    start: tt[s].start,
    end: tt[e].end,
    potrivire: "aproximativa",
    scor: Math.round(best.score * 100) / 100,
  };
}
