/**
 * Textul din fluxul de conținut al unei pagini PDF, pe benzi orizontale.
 *
 * Documentul adnotat desenează pagina originală în benzi decupate. Fără filtrare, fiecare
 * bandă ar conține tot textul paginii (ascuns de decupare, dar găsit la căutare și copiere).
 * Aici se găsesc operatorii care afișează text și linia lor de bază, ca fiecare bandă să
 * păstreze doar textul ei. Grafica și imaginile rămân neschimbate.
 */

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m × n, în convenția PDF (vector-rând) */
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

/** Un operator de afișare a textului: pozițiile lui în flux și linia de bază (coordonatele paginii). */
export interface TextShow {
  start: number;
  end: number;
  y: number;
  /** ce rămâne în locul operatorului eliminat (' și " mută și rândul curent) */
  replacement: string;
}

const isSpace = (c: number) => c === 0x20 || c === 0x0a || c === 0x0d || c === 0x09 || c === 0x0c || c === 0x00;
const isDelim = (c: number) => c === 0x28 || c === 0x29 || c === 0x3c || c === 0x3e || c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d || c === 0x2f || c === 0x25;

interface Token {
  start: number;
  end: number;
  text: string;
  /** operator (cuvânt cheie), nu operand */
  op: boolean;
}

function* tokens(b: Uint8Array): Generator<Token> {
  const n = b.length;
  const text = (s: number, e: number) => String.fromCharCode(...b.subarray(s, e));
  let i = 0;
  while (i < n) {
    const c = b[i];
    if (isSpace(c)) {
      i++;
      continue;
    }
    const start = i;
    if (c === 0x25) {
      while (i < n && b[i] !== 0x0a && b[i] !== 0x0d) i++;
      continue;
    }
    if (c === 0x28) {
      // șir literal, cu paranteze echilibrate și caractere protejate de „\”
      let depth = 0;
      for (; i < n; i++) {
        if (b[i] === 0x5c) i++;
        else if (b[i] === 0x28) depth++;
        else if (b[i] === 0x29 && --depth === 0) break;
      }
      i++;
      yield { start, end: i, text: "", op: false };
      continue;
    }
    if (c === 0x3c && b[i + 1] !== 0x3c) {
      while (i < n && b[i] !== 0x3e) i++;
      i++;
      yield { start, end: i, text: "", op: false };
      continue;
    }
    if ((c === 0x3c && b[i + 1] === 0x3c) || (c === 0x3e && b[i + 1] === 0x3e)) {
      i += 2;
      yield { start, end: i, text: text(start, i), op: false };
      continue;
    }
    if (c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d) {
      i++;
      yield { start, end: i, text: text(start, i), op: false };
      continue;
    }
    i++;
    while (i < n && !isSpace(b[i]) && !isDelim(b[i])) i++;
    const t = text(start, i);
    const operand = c === 0x2f || /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) || t === "true" || t === "false" || t === "null";
    yield { start, end: i, text: t, op: !operand };
    if (t === "ID") {
      // imagine inline: date binare până la „EI” precedat și urmat de spațiu
      i++;
      while (i < n && !(isSpace(b[i - 1]) && b[i] === 0x45 && b[i + 1] === 0x49 && (i + 2 >= n || isSpace(b[i + 2])))) i++;
      i += 2;
    }
  }
}

/** Operatorii de afișare a textului dintr-un flux de conținut, cu linia de bază a fiecăruia. */
export function textShows(content: Uint8Array): TextShow[] {
  const out: TextShow[] = [];
  const stack: Matrix[] = [];
  let ctm: Matrix = IDENTITY;
  let tm: Matrix = IDENTITY;
  let tlm: Matrix = IDENTITY;
  let leading = 0;
  let operands: Token[] = [];
  const num = (k: number) => Number(operands[operands.length - k]?.text);
  const nums = (count: number) => operands.slice(-count).map((t) => Number(t.text));
  const nextLine = (tx: number, ty: number) => {
    tlm = mul([1, 0, 0, 1, tx, ty], tlm);
    tm = tlm;
  };
  const baseline = () => mul(tm, ctm)[5];

  for (const tok of tokens(content)) {
    if (!tok.op) {
      operands.push(tok);
      continue;
    }
    const start = operands[0]?.start ?? tok.start;
    switch (tok.text) {
      case "q":
        stack.push(ctm);
        break;
      case "Q":
        ctm = stack.pop() ?? IDENTITY;
        break;
      case "cm":
        ctm = mul(nums(6) as Matrix, ctm);
        break;
      case "BT":
        tm = tlm = IDENTITY;
        break;
      case "Tm":
        tm = tlm = nums(6) as Matrix;
        break;
      case "Td":
        nextLine(num(2), num(1));
        break;
      case "TD":
        leading = -num(1);
        nextLine(num(2), num(1));
        break;
      case "TL":
        leading = num(1);
        break;
      case "T*":
        nextLine(0, -leading);
        break;
      case "Tj":
      case "TJ":
        out.push({ start, end: tok.end, y: baseline(), replacement: "" });
        break;
      case "'":
        nextLine(0, -leading);
        out.push({ start, end: tok.end, y: baseline(), replacement: "T*" });
        break;
      case '"': {
        const [aw, ac] = operands.slice(-3, -1).map((t) => t.text);
        nextLine(0, -leading);
        out.push({ start, end: tok.end, y: baseline(), replacement: `${aw} Tw ${ac} Tc T*` });
        break;
      }
    }
    operands = [];
  }
  return out;
}

/** Fluxul de conținut fără textul a cărui linie de bază nu cade în [lo, hi). */
export function keepTextBetween(content: Uint8Array, shows: TextShow[], lo: number, hi: number): Uint8Array {
  const parts: Uint8Array[] = [];
  let pos = 0;
  for (const s of shows) {
    if (s.y >= lo && s.y < hi) continue;
    parts.push(content.subarray(pos, s.start), Uint8Array.from(` ${s.replacement} `, (c) => c.charCodeAt(0)));
    pos = s.end;
  }
  parts.push(content.subarray(pos));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
