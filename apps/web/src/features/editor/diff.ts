import type { JSONContent } from "@lexai/docx";

/**
 * Compararea a două versiuni: diff la nivel de cuvânt pe textul simplu al fiecărui bloc,
 * blocurile fiind potrivite după `segId` (fără încrucișări) și apoi în ordine.
 * Totul e pur (JSON → JSON), ca să poată fi testat fără editor.
 */

const TEXT_BLOCKS = new Set(["paragraph", "heading"]);

// ───────────── diff de cuvinte ─────────────

export type DiffOp = { type: "equal" | "insert" | "delete"; text: string };

export function tokenize(s: string): string[] {
  return s.match(/\s+|[^\s]+/g) ?? [];
}

const MAX_CELLS = 4_000_000;

/** LCS pe jetoane (cuvinte și spații), după eliminarea prefixului și sufixului comun. */
function diffTokens(a: string[], b: string[]): DiffOp[] {
  let pre = 0;
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++;
  let suf = 0;
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++;
  const A = a.slice(pre, a.length - suf);
  const B = b.slice(pre, b.length - suf);
  const ops: DiffOp[] = [];
  if (pre) ops.push({ type: "equal", text: a.slice(0, pre).join("") });

  const n = A.length;
  const m = B.length;
  if (n && m && (n + 1) * (m + 1) <= MAX_CELLS) {
    // tabel LCS de la coadă, ca reconstrucția să meargă înainte
    const w = m + 1;
    const dp = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i * w + j] = A[i] === B[j] ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (A[i] === B[j]) {
        ops.push({ type: "equal", text: A[i] });
        i++;
        j++;
      } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
        ops.push({ type: "delete", text: A[i++] });
      } else {
        ops.push({ type: "insert", text: B[j++] });
      }
    }
    while (i < n) ops.push({ type: "delete", text: A[i++] });
    while (j < m) ops.push({ type: "insert", text: B[j++] });
  } else {
    if (n) ops.push({ type: "delete", text: A.join("") });
    if (m) ops.push({ type: "insert", text: B.join("") });
  }

  if (suf) ops.push({ type: "equal", text: a.slice(a.length - suf).join("") });
  return ops;
}

/**
 * Curățare semantică: spațiile egale prinse între două modificări intră în modificare, iar într-o
 * zonă modificată ștersul vine înaintea inseratului („~~1.000~~ 1.200”, nu cuvinte întrețesute).
 */
function cleanup(ops: DiffOp[]): DiffOp[] {
  const out: DiffOp[] = [];
  let del = "";
  let ins = "";
  const flush = () => {
    if (del) out.push({ type: "delete", text: del });
    if (ins) out.push({ type: "insert", text: ins });
    del = ins = "";
  };
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k];
    if (op.type === "delete") del += op.text;
    else if (op.type === "insert") ins += op.text;
    else {
      const between = (del || ins) && /^\s+$/.test(op.text) && k + 1 < ops.length && ops[k + 1].type !== "equal";
      if (between) {
        del += op.text;
        ins += op.text;
        continue;
      }
      flush();
      const prev = out[out.length - 1];
      if (prev?.type === "equal") prev.text += op.text;
      else out.push({ ...op });
    }
  }
  flush();
  return out;
}

export function diffWords(a: string, b: string): DiffOp[] {
  if (a === b) return a ? [{ type: "equal", text: a }] : [];
  return cleanup(diffTokens(tokenize(a), tokenize(b)));
}

export const countWords = (s: string) => (s.match(/[^\s]+/g) ?? []).length;

// ───────────── blocuri ─────────────

export interface FlatBlock {
  segId: string | null;
  text: string;
  node: JSONContent;
}

export function inlineText(node: JSONContent): string {
  let out = "";
  for (const c of node.content ?? []) {
    if (c.type === "text") out += c.text ?? "";
    else if (c.type === "hardBreak") out += "\n";
    else if (c.content) out += inlineText(c);
  }
  return out;
}

/** Paragrafele și titlurile documentului, în ordine (inclusiv din liste și tabele). */
export function flattenBlocks(doc: JSONContent | null | undefined): FlatBlock[] {
  const out: FlatBlock[] = [];
  const walk = (nodes: JSONContent[] | undefined) => {
    for (const n of nodes ?? []) {
      if (n.type && TEXT_BLOCKS.has(n.type)) {
        const id = typeof n.attrs?.segId === "string" && n.attrs.segId ? n.attrs.segId : null;
        out.push({ segId: id, text: inlineText(n), node: n });
      } else walk(n.content);
    }
  };
  walk(doc?.type === "doc" ? doc.content : doc ? [doc] : []);
  return out;
}

/** Cea mai lungă subsecvență crescătoare (indicii în `seq`), O(n log n). */
function lis(seq: number[]): number[] {
  const tails: number[] = [];
  const prev = new Array<number>(seq.length).fill(-1);
  for (let i = 0; i < seq.length; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (seq[tails[mid]] < seq[i]) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[i] = tails[lo - 1];
    tails[lo] = i;
  }
  const out: number[] = [];
  for (let k = tails.length ? tails[tails.length - 1] : -1; k >= 0; k = prev[k]) out.push(k);
  return out.reverse();
}

function similarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().match(/[^\s]+/g) ?? []);
  const wb = new Set(b.toLowerCase().match(/[^\s]+/g) ?? []);
  if (!wa.size && !wb.size) return 1;
  let common = 0;
  for (const w of wa) if (wb.has(w)) common++;
  return (2 * common) / (wa.size + wb.size);
}

/**
 * Potrivirea blocurilor: întâi după `segId` (păstrând ordinea), apoi, în golurile dintre
 * potriviri, în ordine, dacă textele seamănă suficient. `newToOld[j]` = indicele vechi sau -1.
 */
export function alignBlocks(oldBlocks: FlatBlock[], newBlocks: FlatBlock[]): { newToOld: number[]; oldToNew: number[] } {
  const oldIndex = new Map<string, number>();
  const dupOld = new Set<string>();
  oldBlocks.forEach((b, i) => {
    if (!b.segId) return;
    if (oldIndex.has(b.segId)) dupOld.add(b.segId);
    else oldIndex.set(b.segId, i);
  });
  const seenNew = new Set<string>();
  const cands: { o: number; n: number }[] = [];
  newBlocks.forEach((b, j) => {
    if (!b.segId || dupOld.has(b.segId) || seenNew.has(b.segId)) return;
    seenNew.add(b.segId);
    const o = oldIndex.get(b.segId);
    if (o !== undefined) cands.push({ o, n: j });
  });
  const keep = lis(cands.map((c) => c.o)).map((k) => cands[k]);

  const newToOld = new Array<number>(newBlocks.length).fill(-1);
  const oldToNew = new Array<number>(oldBlocks.length).fill(-1);
  for (const c of keep) {
    newToOld[c.n] = c.o;
    oldToNew[c.o] = c.n;
  }

  // golurile dintre ancore: perechi în ordine, pentru texte asemănătoare
  const anchors = [{ o: -1, n: -1 }, ...keep, { o: oldBlocks.length, n: newBlocks.length }];
  for (let k = 0; k + 1 < anchors.length; k++) {
    let j = anchors[k].n + 1;
    for (let i = anchors[k].o + 1; i < anchors[k + 1].o; i++) {
      for (let jj = j; jj < anchors[k + 1].n; jj++) {
        if (similarity(oldBlocks[i].text, newBlocks[jj].text) >= 0.3) {
          newToOld[jj] = i;
          oldToNew[i] = jj;
          j = jj + 1;
          break;
        }
      }
    }
  }
  return { newToOld, oldToNew };
}

/** Forma canonică pentru comparare: fără valori null/undefined (editorul scrie atributele implicite ca null) și fără segId. */
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) {
      const x = (v as Record<string, unknown>)[k];
      if (x === null || x === undefined || k === "segId") continue;
      const c = canonical(x);
      if (c && typeof c === "object" && !Array.isArray(c) && !Object.keys(c).length) continue;
      out[k] = c;
    }
    return out;
  }
  return v;
}

const sameFormatting = (a: JSONContent, b: JSONContent) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** `segId`-urile blocurilor noi sau modificate față de o versiune (pentru reverificare). */
export function changedSegIds(oldDoc: JSONContent | null | undefined, newDoc: JSONContent | null | undefined): string[] {
  const old = new Map<string, string>();
  for (const b of flattenBlocks(oldDoc)) if (b.segId && !old.has(b.segId)) old.set(b.segId, b.text);
  const out: string[] = [];
  for (const b of flattenBlocks(newDoc)) {
    if (!b.segId || !b.text.trim()) continue;
    if (old.get(b.segId) !== b.text) out.push(b.segId);
  }
  return out;
}

// ───────────── documentul de comparare ─────────────

export type BlockDiffStatus = "same" | "changed" | "added" | "removed" | "format";

export interface DiffResult {
  /** documentul afișat: structura versiunii noi, cu mark-urile `diffInsert` / `diffDelete` */
  doc: JSONContent;
  changes: number;
  wordsAdded: number;
  wordsRemoved: number;
  identical: boolean;
}

/** Bucata [start, end) din conținutul inline al unui bloc, cu mark-urile originale. */
export function sliceInline(content: JSONContent[] | undefined, start: number, end: number): JSONContent[] {
  const out: JSONContent[] = [];
  const lenOf = (c: JSONContent) => (c.type === "text" ? (c.text ?? "").length : c.type === "hardBreak" ? 1 : 0);
  const total = (content ?? []).reduce((n, c) => n + lenOf(c), 0);
  let at = 0;
  for (const c of content ?? []) {
    const len = lenOf(c);
    const s = Math.max(start, at);
    const e = Math.min(end, at + len);
    // nodurile fără text (imaginile) rămân în bucata în care încep; cele de la final, în ultima bucată
    const leaf = len === 0 && at >= start && (at < end || at === total);
    if (e > s || leaf) {
      if (c.type === "text") out.push({ ...c, text: (c.text ?? "").slice(s - at, e - at) });
      else out.push({ ...c });
    }
    at += len;
    if (at > end || (at === end && end < total)) break;
  }
  return out;
}

const withMark = (nodes: JSONContent[], type: "diffInsert" | "diffDelete", change: number): JSONContent[] =>
  nodes.map((n) => (n.type === "text" ? { ...n, marks: [...(n.marks ?? []), { type, attrs: { change } }] } : n));

const blockAttrs = (n: JSONContent, diff: BlockDiffStatus, change: number | null) => ({ ...n.attrs, diff, diffChange: change });

/**
 * Construiește documentul de comparare dintre `oldDoc` și `newDoc`. Blocurile modificate primesc
 * marcajul din margine (`diff`), cuvintele inserate/șterse mark-uri cu indexul modificării
 * (`change`), pentru navigarea „Modificarea i din n”. Cu `onlyChanged`, nodurile de nivel 1
 * fără modificări sunt omise (comparații foarte mari).
 */
export function buildDiffDocument(oldDoc: JSONContent | null | undefined, newDoc: JSONContent | null | undefined, opts: { onlyChanged?: boolean } = {}): DiffResult {
  const oldBlocks = flattenBlocks(oldDoc);
  const newBlocks = flattenBlocks(newDoc);
  const { newToOld, oldToNew } = alignBlocks(oldBlocks, newBlocks);

  // blocurile șterse se afișează după blocul nou care corespunde ultimului bloc vechi păstrat
  const removedAfter = new Map<number, number[]>();
  let anchor = -1;
  oldBlocks.forEach((_, i) => {
    if (oldToNew[i] >= 0) anchor = oldToNew[i];
    else {
      const list = removedAfter.get(anchor) ?? [];
      list.push(i);
      removedAfter.set(anchor, list);
    }
  });

  let changes = 0;
  let wordsAdded = 0;
  let wordsRemoved = 0;
  let blockIndex = 0;

  // în liste și tabele, blocurile șterse devin paragrafe (o celulă acceptă doar paragrafe)
  const removedNodes = (anchorIdx: number, nested: boolean): JSONContent[] =>
    (removedAfter.get(anchorIdx) ?? []).map((i) => {
      const b = oldBlocks[i];
      wordsRemoved += countWords(b.text);
      const change = changes++;
      const type = nested ? "paragraph" : b.node.type;
      return { ...b.node, type, attrs: blockAttrs(b.node, "removed", change), content: withMark(b.node.content ?? [], "diffDelete", change) };
    });

  const transformBlock = (n: JSONContent): JSONContent => {
    const j = blockIndex++;
    const nb = newBlocks[j];
    const oi = newToOld[j];
    if (oi < 0) {
      wordsAdded += countWords(nb.text);
      const change = changes++;
      return { ...n, attrs: blockAttrs(n, "added", change), content: withMark(n.content ?? [], "diffInsert", change) };
    }
    const ob = oldBlocks[oi];
    if (ob.text === nb.text) {
      if (sameFormatting(ob.node, n)) return { ...n, attrs: blockAttrs(n, "same", null) };
      return { ...n, attrs: blockAttrs(n, "format", changes++) };
    }
    const ops = diffWords(ob.text, nb.text);
    const content: JSONContent[] = [];
    let oPos = 0;
    let nPos = 0;
    let current: number | null = null;
    for (const op of ops) {
      const len = op.text.length;
      if (op.type === "equal") {
        content.push(...sliceInline(n.content, nPos, nPos + len));
        oPos += len;
        nPos += len;
        if (/\S/.test(op.text)) current = null;
        continue;
      }
      if (current === null) current = changes++;
      if (op.type === "delete") {
        wordsRemoved += countWords(op.text);
        content.push(...withMark(sliceInline(ob.node.content, oPos, oPos + len), "diffDelete", current));
        oPos += len;
      } else {
        wordsAdded += countWords(op.text);
        content.push(...withMark(sliceInline(n.content, nPos, nPos + len), "diffInsert", current));
        nPos += len;
      }
    }
    return { ...n, attrs: blockAttrs(n, "changed", null), content };
  };

  const hasChange = (n: JSONContent): boolean =>
    (typeof n.attrs?.diff === "string" && n.attrs.diff !== "same") || (n.content ?? []).some(hasChange);

  const walk = (nodes: JSONContent[] | undefined, top: boolean): JSONContent[] => {
    const out: JSONContent[] = [];
    if (top) out.push(...removedNodes(-1, false));
    for (const n of nodes ?? []) {
      if (n.type && TEXT_BLOCKS.has(n.type)) {
        const j = blockIndex;
        out.push(transformBlock(n));
        out.push(...removedNodes(j, !top));
      } else if (n.content) {
        out.push({ ...n, content: walk(n.content, false) });
      } else out.push(n);
    }
    return out;
  };

  const source = newDoc?.type === "doc" ? newDoc.content : [];
  let content = walk(source, true);
  if (opts.onlyChanged) content = content.filter(hasChange);
  if (!content.length) content = [{ type: "paragraph" }];
  return { doc: { type: "doc", content }, changes, wordsAdded, wordsRemoved, identical: changes === 0 };
}
