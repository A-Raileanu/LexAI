import { isIgnored, suggestionSituation, suggestionsOf } from "@lexai/core/findings";
import { CATEGORY_LABELS, STATUS_META } from "@lexai/core/labels";
import { locateQuote } from "@lexai/core/text";
import type { Finding, VerdictStatus } from "@lexai/core/types";
import type { JSONContent, JSONMark } from "@lexai/docx";
import { STATUS_ORDER, shorten } from "./model";
import type { FindingActionKind } from "./types";

/**
 * Documentul adnotat (docs/ux/12-export.md, „DOCX adnotat”): documentul de lucru, cu pasajele
 * citate evidențiate în culoarea stării și, sub fiecare paragraf cu constatări, câte o notă mică
 * în culoarea verdictului (stare, titlu, explicație scurtă, sugestie). Transformare pură pe JSON-ul
 * editorului; fișierul îl produce `exportDocx`.
 */

/** Culorile textului (aceleași ca `STATUS_COLOR` din @lexai/core/report) și ale evidențierii (nuanța deschisă). */
export const ANNOTATION_COLORS: Record<VerdictStatus, { text: string; fill: string }> = {
  eroare_citare: { text: "#C2410C", fill: "#FDE2D6" },
  interpretare_discutabila: { text: "#B45309", fill: "#FDEFC8" },
  necesita_analiza_umana: { text: "#7E22CE", fill: "#F0E4FC" },
  neverificat: { text: "#475569", fill: "#E8ECF1" },
  corect: { text: "#15803D", fill: "#DAF3E3" },
};

const NOTE_FONT = "Arial";
const NOTE_SIZE = "9pt";
const EXPLANATION_MAX = 320;

export interface AnnotateOptions {
  /** ce a făcut utilizatorul cu fiecare constatare; cele ignorate nu apar */
  actions?: Readonly<Record<string, FindingActionKind>>;
  /** semnăturile ignorate ale documentului (`findingSignature`); constatările lor nu apar */
  ignored?: ReadonlySet<string>;
  /** constatare → varianta de sugestie aplicată (implicit prima) */
  appliedSuggestion?: Readonly<Record<string, number>>;
  /** include și trimiterile corecte (implicit nu, ca în editor) */
  includeCorrect?: boolean;
  /** un rând de context la începutul documentului */
  intro?: string;
}

export interface AnnotateResult {
  content: JSONContent;
  /** constatări adnotate */
  notes: number;
  /** constatări al căror paragraf nu există în acest conținut (adăugate la sfârșit) */
  unplaced: number;
}

const TEXT_BLOCKS = new Set(["paragraph", "heading"]);

const style = (color: string, extra: Record<string, unknown> = {}): JSONMark => ({ type: "textStyle", attrs: { color, fontSize: NOTE_SIZE, fontFamily: NOTE_FONT, ...extra } });

function run(text: string, color: string, marks: JSONMark[] = []): JSONContent {
  return { type: "text", text, marks: [...marks, style(color)] };
}

function noteParagraph(content: JSONContent[]): JSONContent {
  return { type: "paragraph", attrs: { indentPt: 18, spaceBeforePt: 0, spaceAfterPt: 3, lineHeight: 1.15 }, content };
}

/**
 * Notele unei constatări: un paragraf cu starea, titlul și explicația, plus câte unul pentru fiecare
 * variantă de sugestie (etichetată cu situația, când sunt mai multe) sau pentru sugestia lipsă.
 */
export function findingNotes(f: Finding, action?: FindingActionKind, opts: { withQuote?: boolean; appliedIndex?: number } = {}): JSONContent[] {
  const color = ANNOTATION_COLORS[f.status].text;
  const label = STATUS_META[f.status].label;
  const head: JSONContent[] = [run(`${label}${f.categorie ? ` · ${CATEGORY_LABELS[f.categorie]}` : ""}`, color, [{ type: "bold" }]), run(` — ${f.titlu.replace(/[.\s]+$/, "")}`, color, [{ type: "bold" }])];
  if (opts.withQuote && f.citat) head.push(run(` („${shorten(f.citat, 160)}”)`, color, [{ type: "italic" }]));
  const explanation = shorten(f.explicatie || f.verdictLaData?.rezumat || "", EXPLANATION_MAX);
  if (explanation) head.push(run(`. ${explanation.replace(/^\.\s*/, "")}`, color));
  const out = [noteParagraph(head)];
  const variants = suggestionsOf(f);
  variants.forEach((s, i) => {
    if (!s.textOriginal && !s.textPropus) return;
    const situation = suggestionSituation(s, i, variants.length);
    const kind = s.tip === "inlocuire" ? "Sugestie" : "Variantă de revizuit";
    const parts: JSONContent[] = [run(`${kind}${situation ? ` (${situation})` : ""}: `, color, [{ type: "bold" }])];
    if (s.textOriginal) parts.push(run(s.textOriginal, color, [{ type: "strike" }]), run(" → ", color));
    parts.push(s.textPropus ? run(s.textPropus, color) : run("(se elimină)", color, [{ type: "italic" }]));
    if (action === "aplicata" && (opts.appliedIndex ?? 0) === i) parts.push(run(" (aplicată în document)", color, [{ type: "italic" }]));
    out.push(noteParagraph(parts));
  });
  if (!variants.length && f.sugestiiLipsa) {
    out.push(noteParagraph([run("Sugestie: ", color, [{ type: "bold" }]), run("nicio corectură validă propusă automat; de redactat de un jurist.", color, [{ type: "italic" }])]));
  }
  return out;
}

const isInsert = (n: JSONContent) => n.marks?.some((m) => m.type === "suggestInsert") ?? false;

/** Textul unui bloc, ca la segmentarea analizei (fără inserările propuse, `hardBreak` = „\n”). */
export function blockPlainText(block: JSONContent): string {
  let out = "";
  for (const c of block.content ?? []) {
    if (c.type === "text") out += isInsert(c) ? "" : (c.text ?? "");
    else if (c.type === "hardBreak") out += "\n";
  }
  return out;
}

/** Evidențiază citatul în bloc (marcaj `highlight` în culoarea stării); fără potrivire, blocul rămâne neschimbat. */
export function highlightQuote(block: JSONContent, quote: string, color: string, hint?: number): JSONContent {
  const text = blockPlainText(block);
  const loc = locateQuote(text, quote, hint);
  if (loc.potrivire === "negasita" || loc.end <= loc.start) return block;
  const out: JSONContent[] = [];
  let off = 0;
  for (const c of block.content ?? []) {
    if (c.type === "hardBreak") {
      off += 1;
      out.push(c);
      continue;
    }
    if (c.type !== "text" || isInsert(c) || !c.text) {
      out.push(c);
      continue;
    }
    const from = off;
    const to = off + c.text.length;
    off = to;
    const s = Math.max(from, loc.start);
    const e = Math.min(to, loc.end);
    if (e <= s) {
      out.push(c);
      continue;
    }
    const piece = (a: number, b: number, hl: boolean): JSONContent => {
      const marks = (c.marks ?? []).filter((m) => !(hl && m.type === "highlight"));
      return { ...c, text: c.text!.slice(a - from, b - from), marks: hl ? [...marks, { type: "highlight", attrs: { color } }] : c.marks };
    };
    if (s > from) out.push(piece(from, s, false));
    out.push(piece(s, e, true));
    if (e < to) out.push(piece(e, to, false));
  }
  return { ...block, content: out };
}

function bySeverity(a: Finding, b: Finding): number {
  return STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (a.anchors[0]?.start ?? 0) - (b.anchors[0]?.start ?? 0);
}

/** Construiește documentul adnotat din conținutul de lucru și constatările analizei. */
export function annotateContent(content: JSONContent, findings: readonly Finding[], opts: AnnotateOptions = {}): AnnotateResult {
  const actions = opts.actions ?? {};
  const kept = findings
    .filter((f) => actions[f.id] !== "ignorata" && !isIgnored(f, opts.ignored) && (opts.includeCorrect || f.status !== "corect"))
    .sort(bySeverity);
  const applied = opts.appliedSuggestion ?? {};

  // notele merg sub blocul primei ancore; evidențierile, în blocul fiecărei ancore
  const notesBySeg = new Map<string, Finding[]>();
  const marksBySeg = new Map<string, { f: Finding; hint: number }[]>();
  const noAnchor: Finding[] = [];
  for (const f of kept) {
    const first = f.anchors[0]?.segmentId;
    if (!first) {
      noAnchor.push(f);
      continue;
    }
    notesBySeg.set(first, [...(notesBySeg.get(first) ?? []), f]);
    for (const a of f.anchors) {
      if (a.segmentId && a.potrivire !== "negasita" && actions[f.id] !== "aplicata") marksBySeg.set(a.segmentId, [...(marksBySeg.get(a.segmentId) ?? []), { f, hint: a.start }]);
    }
  }

  const placed = new Set<string>();
  const walk = (nodes: JSONContent[] | undefined): JSONContent[] | undefined => {
    if (!nodes) return nodes;
    const out: JSONContent[] = [];
    for (const n of nodes) {
      const segId = typeof n.attrs?.segId === "string" ? n.attrs.segId : null;
      if (n.type && TEXT_BLOCKS.has(n.type) && segId) {
        let node = n;
        for (const { f, hint } of marksBySeg.get(segId) ?? []) node = highlightQuote(node, f.citat, ANNOTATION_COLORS[f.status].fill, hint);
        out.push(node);
        const notes = placed.has(segId) ? undefined : notesBySeg.get(segId);
        if (notes) {
          placed.add(segId);
          for (const f of notes) out.push(...findingNotes(f, actions[f.id], { appliedIndex: applied[f.id] }));
        }
        continue;
      }
      out.push(n.content ? { ...n, content: walk(n.content) } : n);
    }
    return out;
  };

  const body = walk(content.content) ?? [];
  const unplaced = [...noAnchor, ...[...notesBySeg.entries()].filter(([seg]) => !placed.has(seg)).flatMap(([, fs]) => fs)].sort(bySeverity);
  const tail: JSONContent[] = unplaced.length
    ? [
        { type: "paragraph", attrs: { spaceBeforePt: 18, spaceAfterPt: 4 }, content: [run("Constatări fără paragraf corespondent în această versiune", "#5B6275", [{ type: "bold" }])] },
        ...unplaced.flatMap((f) => findingNotes(f, actions[f.id], { withQuote: true, appliedIndex: applied[f.id] })),
      ]
    : [];
  const head: JSONContent[] = opts.intro ? [{ type: "paragraph", attrs: { spaceAfterPt: 10 }, content: [run(opts.intro, "#5B6275", [{ type: "italic" }])] }] : [];

  return { content: { ...content, content: [...head, ...body, ...tail] }, notes: kept.length, unplaced: unplaced.length };
}
