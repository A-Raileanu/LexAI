/**
 * Normalizare text românesc pentru comparații robuste:
 * - diacritice cu sedilă (ş, ţ) → virgulă (ș, ț)
 * - ghilimele, apostrofuri și liniuțe unificate
 * - spații albe comprimate
 * - opțional: eliminarea diacriticelor și litere mici
 *
 * `normalizeWithMap` păstrează și o hartă de la fiecare caracter normalizat
 * la poziția din textul original, ca evidențierile să cadă exact pe textul sursă.
 */

const CHAR_MAP: Record<string, string> = {
  "ş": "ș",
  "Ş": "Ș",
  "ţ": "ț",
  "Ţ": "Ț",
  "„": '"',
  "”": '"',
  "“": '"',
  "«": '"',
  "»": '"',
  "‚": "'",
  "‘": "'",
  "’": "'",
  "–": "-",
  "—": "-",
  "‑": "-",
  " ": " ",
  " ": " ",
  " ": " ",
  "­": "",
  "​": "",
};

const STRIP_DIACRITICS: Record<string, string> = {
  "ă": "a",
  "â": "a",
  "î": "i",
  "ș": "s",
  "ț": "t",
  "Ă": "A",
  "Â": "A",
  "Î": "I",
  "Ș": "S",
  "Ț": "T",
};

export interface NormalizeOptions {
  /** Elimină diacriticele (pentru potriviri aproximative). */
  stripDiacritics?: boolean;
  /** Transformă în litere mici. */
  lowercase?: boolean;
}

export interface NormalizedText {
  text: string;
  /** map[i] = indexul din textul original pentru caracterul normalizat i */
  map: number[];
}

export function normalizeWithMap(input: string, opts: NormalizeOptions = {}): NormalizedText {
  const out: string[] = [];
  const map: number[] = [];
  let lastWasSpace = true; // elimină spațiile de la început

  for (let i = 0; i < input.length; i++) {
    let ch = input[i];
    if (ch in CHAR_MAP) ch = CHAR_MAP[ch];
    if (ch === "") continue;
    if (/\s/.test(ch)) {
      if (lastWasSpace) continue;
      out.push(" ");
      map.push(i);
      lastWasSpace = true;
      continue;
    }
    if (opts.stripDiacritics && ch in STRIP_DIACRITICS) ch = STRIP_DIACRITICS[ch];
    if (opts.lowercase) ch = ch.toLowerCase();
    out.push(ch);
    map.push(i);
    lastWasSpace = false;
  }
  // elimină spațiul final
  if (out.length && out[out.length - 1] === " ") {
    out.pop();
    map.pop();
  }
  return { text: out.join(""), map };
}

export function normalizeRo(input: string, opts: NormalizeOptions = {}): string {
  return normalizeWithMap(input, opts).text;
}

/** Cheie de comparație tolerantă: fără diacritice, litere mici, spații comprimate. */
export function looseKey(input: string): string {
  return normalizeRo(input, { stripDiacritics: true, lowercase: true });
}

/** Verifică dacă `needle` apare în `haystack` după normalizare tolerantă. */
export function containsLoose(haystack: string, needle: string): boolean {
  const n = looseKey(needle);
  if (!n) return false;
  return looseKey(haystack).includes(n);
}

/**
 * Normalizează numărul unui articol: "6^1", "6¹", "6 ind. 1", "6 indice 1" → "6^1".
 * Romanele (ex. "I", "IV") sunt păstrate cu majuscule.
 */
export function normalizeArticleNumber(raw: string): string {
  const supers: Record<string, string> = {
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
  };
  let s = raw.trim();
  s = s.replace(/^(articolul|articol|art\.?)\s*/i, "");
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => "^" + [...m].map((c) => supers[c]).join(""));
  s = s.replace(/\s*(?:ind\.?|indice)\s*(\d+)/i, "^$1");
  s = s.replace(/\s*\^\s*/g, "^");
  s = s.replace(/\s+/g, "");
  s = s.replace(/[.,;:]$/, "");
  // în coduri, numerele mari au separator de mii: „2.517” → „2517”
  s = s.replace(/^(\d{1,3})\.(\d{3})(?=\^|$)/, "$1$2");
  return s.toUpperCase();
}

// ───────────────────────── Date și spații ─────────────────────────

const RO_MONTHS: Record<string, number> = {
  ianuarie: 1, februarie: 2, martie: 3, aprilie: 4, mai: 5, iunie: 6,
  iulie: 7, august: 8, septembrie: 9, octombrie: 10, noiembrie: 11, decembrie: 12,
};

/** Spațiile (inclusiv cele fără întrerupere) comprimate într-unul singur. */
export function clean(s: string): string {
  return s.replace(/ /g, " ").replace(/\s+/g, " ").trim();
}

function iso(y: number, m: number, d: number): string {
  return `${y.toString().padStart(4, "0")}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
}

/** "18.12.2025" | "18-12-2025" | "18/12/2025" | "17 noiembrie 1990" → ISO */
export function parseRoDate(s: string): string | null {
  const t = clean(s).toLowerCase();
  let m = t.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = t.match(/(\d{1,2})\s+([a-zăâîșş]+)\s+(\d{4})/);
  if (m && RO_MONTHS[m[2].replace("ş", "ș")]) return iso(+m[3], RO_MONTHS[m[2].replace("ş", "ș")], +m[1]);
  return null;
}

/** „2024-03-15” → „15.03.2024” */
export function fmtIsoDate(iso: string | null | undefined): string {
  if (!iso) return "necunoscută";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}
