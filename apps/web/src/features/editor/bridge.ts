"use client";

import { blocksToNodes, hasInlineFormat, locateProposal, parseInline, plainInline, type BlockStyle, type ChatBlock, type ChatScope, type FormatStyles } from "@lexai/core/chat";
import { segmentsFromDoc } from "@lexai/core/document";
import type { SegmentKind } from "@lexai/core/types";
import type { JSONContent } from "@lexai/docx";
import { Fragment, type Node as PMNode } from "@tiptap/pm/model";
import { TextSelection, type Transaction } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { createContext, useContext } from "react";
import { chatMarksKey, type ChatMarksMeta, type ChatTarget } from "./chat-marks";
import { changedSegIds } from "./diff";
import { computeHighlightRanges, highlightsKey, type HighlightItem, type HighlightsStorage } from "./highlights";
import { blockTextMap, findBlock, locateInBlock, type BlockAt } from "./locate";
import { findPlaceholders } from "./schema/placeholder";
import { SEG_BLOCKS } from "./schema/seg-id";
import { SUGGESTION_META, acceptSuggestion, listSuggestions, rejectSuggestion, type SuggestionMeta, type SuggestionSummary } from "./schema/suggestions";

export type { HighlightItem, HighlightStatus } from "./highlights";

export interface BridgeSegment {
  segId: string;
  text: string;
  kind: SegmentKind;
}

export interface BridgePlaceholder {
  index: number;
  hint: string;
  /** textul afișat, „[● hint]” */
  text: string;
  segId: string | null;
}

export interface InsertSuggestionInput {
  segId: string;
  original: string;
  replacement: string;
  findingId?: string | null;
}

export interface ReplacementInput {
  segId: string;
  original: string;
  replacement: string;
}

/** O înlocuire aplicată direct în text, cu contextul ei (pentru anulare). */
export interface AppliedReplacement extends ReplacementInput {
  /** textul blocului imediat înainte / după pasajul înlocuit (cel mult 40 de caractere) */
  before: string;
  after: string;
  /** conținutul inline original al pasajului (cu formatarea lui), readus la anulare */
  originalJSON?: JSONContent[];
  /** o formatare: textul nu s-a schimbat, doar mark-urile */
  format?: boolean;
}

/** O modificare propusă în chat, de aplicat la poziția ei din paragraf (vezi `locateProposal`). */
export interface TextProposalEdit {
  kind?: "text";
  segId: string;
  /** poziția textului original în textul paragrafului, la momentul propunerii */
  start: number;
  original: string;
  replacement: string;
}

/** Formatarea unui pasaj (mark-urile bold / italic / underline / strike): true = aplică, false = scoate. */
export interface FormatEdit {
  kind: "format";
  segId: string;
  start: number;
  original: string;
  styles: FormatStyles;
}

/** Blocuri noi după / înainte de blocul de nivel superior care conține segmentul `anchor`. */
export interface InsertBlocksEdit {
  kind: "insert";
  anchor: string;
  position: "dupa" | "inainte";
  blocks: ChatBlock[];
}

/** Segmente consecutive întregi (cu textul lor de la propunere) înlocuite cu blocuri noi; fără blocuri = ștergere. */
export interface ReplaceBlocksEdit {
  kind: "replace";
  segIds: string[];
  originals: string[];
  blocks: ChatBlock[];
}

export type ProposalEdit = TextProposalEdit | FormatEdit | InsertBlocksEdit | ReplaceBlocksEdit;

/** O modificare structurală aplicată, cu ce trebuie pentru „Anulează”. */
export interface AppliedBlocks {
  kind: "blocks";
  /** blocurile de nivel superior inserate și cele scoase (JSON) */
  inserted: JSONContent[];
  removed: JSONContent[];
  /** segId-urile blocurilor noi, în ordine */
  newSegIds: string[];
  /** un segId din blocul de nivel superior imediat înainte / după blocurile noi (după aplicare) */
  before: string | null;
  after: string | null;
}

export type AppliedEdit = AppliedReplacement | AppliedBlocks;

export const isAppliedBlocks = (e: AppliedEdit): e is AppliedBlocks => "kind" in e && e.kind === "blocks";

/** Ce se evidențiază în document la previzualizarea unei propuneri. */
export type PreviewTarget =
  | Pick<TextProposalEdit, "kind" | "segId" | "start" | "original">
  | Pick<InsertBlocksEdit, "kind" | "anchor" | "position">
  | Pick<ReplaceBlocksEdit, "kind" | "segIds">;

/** „always”: derulează oricum; „if-needed”: doar dacă ținta nu se vede întreagă. */
export type PreviewScroll = boolean | "always" | "if-needed";

const REPLACEMENT_CONTEXT = 40;

/**
 * API-ul editorului pentru panourile de analiză și redactare (docs/ux/05-editor.md).
 * Toate metodele sunt sincrone și sigure de apelat oricând după montarea editorului.
 */
export interface EditorBridge {
  /** documentul curent, în formatul contractului */
  getJSON(): JSONContent;
  /** segmentele analizei, ca în `@lexai/core` (text fără sugestiile de inserare neacceptate) */
  getSegments(): BridgeSegment[];
  /** înlocuiește evidențierile (decorații, nu mark-uri); citatul se caută fără diacritice/spații, altfel tot blocul */
  setHighlights(items: HighlightItem[]): void;
  /** derulează la evidențiere, o marchează activă și pulsează; null = nicio evidențiere activă (toate la 100 %) */
  focusHighlight(id: string | null): void;
  /** click pe un pasaj evidențiat; întoarce funcția de dezabonare */
  onHighlightClick(cb: (id: string) => void): () => void;
  /** marchează `original` ca șters și inserează `replacement` după el; întoarce id-ul sugestiei sau null */
  insertSuggestion(input: InsertSuggestionInput): string | null;
  /**
   * Înlocuiește direct `original` cu `replacement` (gol = șterge) în blocul `segId`, ca o editare
   * obișnuită: o singură tranzacție, anulabilă cu Cmd+Z. Null dacă textul nu e găsit exact.
   */
  applyReplacement(input: ReplacementInput): AppliedReplacement | null;
  /** readuce textul original al unei înlocuiri (după context); true dacă textul e (din nou) cel original */
  revertReplacement(edit: AppliedReplacement): boolean;
  acceptSuggestion(id: string): boolean;
  rejectSuggestion(id: string): boolean;
  /** sugestiile nerezolvate din document */
  listSuggestions(): SuggestionSummary[];
  listPlaceholders(): BridgePlaceholder[];
  /** selectează câmpul `index` și îl aduce în vizor */
  focusPlaceholder(index: number): void;
  setReadOnly(readOnly: boolean): void;
  /** înlocuiește tot conținutul (ciorne transmise de generator); se salvează ca orice modificare */
  replaceContent(json: JSONContent): void;
  /** `segId`-urile blocurilor noi sau modificate față de conținutul unei versiuni */
  changedSegIdsSince(versionContent: JSONContent): string[];

  // ───── chatul din editor (docs/ux/18-chat-editor.md) ─────
  /** notificare la fiecare schimbare a selecției sau a textului; întoarce funcția de dezabonare */
  onSelectionChange(cb: () => void): () => void;
  /** cheia selecției curente (se schimbă odată cu selecția sau cu textul) */
  selectionKey(): string;
  /** selecția curentă ca domeniu al unei cereri (paragrafe + poziții în textul lor); null fără text selectat */
  selectionScope(): ChatScope | null;
  /** focusul revine în document, cu selecția intactă */
  focusEditor(): void;
  /** selecția rămâne marcată în document și când focusul e în panou */
  markChatScope(on: boolean): void;
  /**
   * Evidențiază ținta unei modificări propuse (pasajul, paragrafele înlocuite sau locul inserării;
   * celelalte evidențieri se estompează); null = fără. Întoarce false dacă ținta nu mai există.
   */
  previewProposal(target: PreviewTarget | null, opts?: { scroll?: PreviewScroll }): boolean;
  /**
   * Aplică modificări propuse într-o singură tranzacție (un singur Cmd+Z), de la sfârșitul
   * documentului spre început. Textul se aplică la poziția din propunere sau la singura apariție;
   * blocurile noi primesc segId-uri noi. null = pasajul / paragrafele s-au schimbat (sau se
   * suprapun cu altă modificare aplicată acum).
   */
  applyProposals(edits: ProposalEdit[]): (AppliedEdit | null)[];
  /** anulează o modificare aplicată (text sau blocuri); false dacă documentul s-a schimbat între timp */
  revertEdit(edit: AppliedEdit): boolean;
}

export interface BridgeHooks {
  onReadOnlyChange?: (readOnly: boolean) => void;
}

const newSuggestionId = () => `sug_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

function scrollToPos(editor: Editor, pos: number) {
  try {
    const dom = editor.view.domAtPos(pos).node;
    const el = dom instanceof Element ? dom : dom.parentElement;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  } catch {
    // editorul nu e montat (teste, server)
  }
}

const FORMAT_MARKS = ["bold", "italic", "underline", "strike"] as const;

/**
 * Textul nou cu **aldin** / *cursiv* ca noduri de text: mark-urile pasajului înlocuit (ca la
 * `insertText`) plus aldin / cursiv pe bucățile marcate.
 */
function formattedText(tr: Transaction, from: number, to: number, markup: string): PMNode[] {
  const { schema } = tr.doc.type;
  const $from = tr.doc.resolve(from);
  const base = (to > from ? $from.marksAcross(tr.doc.resolve(to)) : null) ?? $from.marks();
  return (parseInline(markup) ?? [{ text: plainInline(markup), bold: false, italic: false }])
    .filter((r) => r.text)
    .map((r) => {
      let marks = base;
      if (r.bold) marks = schema.marks.bold.create().addToSet(marks);
      if (r.italic) marks = schema.marks.italic.create().addToSet(marks);
      return schema.text(r.text, marks);
    });
}

/** Primul strămoș care derulează (biroul editorului); null dacă nu există. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/**
 * Aduce ținta previzualizării în vizor (centrată; de sus, dacă e mai înaltă decât fereastra).
 * Pozițiile vin din DOM-ul randat, deci țin cont de spațiile paginării. Cu `ifNeeded`, nu
 * derulează dacă ținta se vede întreagă. Fără animație la `prefers-reduced-motion`.
 */
function scrollToTarget(editor: Editor, target: ChatTarget, ifNeeded: boolean) {
  try {
    if (!editor.isInitialized) return;
    const els = [...(editor.view.dom as HTMLElement).querySelectorAll<HTMLElement>("[data-chat-target]")];
    if (!els.length) return scrollToPos(editor, target.from);
    const rects = els.map((e) => e.getBoundingClientRect());
    const top = Math.min(...rects.map((r) => r.top));
    const bottom = Math.max(...rects.map((r) => r.bottom));
    const box = scrollParent(els[0]);
    // fără birou derulabil, documentul se vede întreg; scrollIntoView ar muta și containerele cu overflow ascuns
    if (!box) return;
    const view = box.getBoundingClientRect();
    if (ifNeeded && top >= view.top && bottom <= view.bottom) return;
    const height = bottom - top;
    const offset = height + 48 <= view.height ? (view.height - height) / 2 : 48;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    box.scrollTo({ top: box.scrollTop + (top - view.top) - offset, behavior: reduced ? "auto" : "smooth" });
  } catch {
    // editorul nu e montat (teste, server)
  }
}

/**
 * Intervalul din document și contextul unei înlocuiri a caracterelor [start, end) din textul blocului.
 * O eliminare ia și spațiul dinainte, ca să nu rămână două spații (sau spațiu înainte de punct).
 */
function planReplacement(block: BlockAt, segId: string, start: number, end: number, replacement: string): { from: number; to: number; edit: AppliedReplacement } | null {
  const { text, positions } = blockTextMap(block);
  if (start < 0 || end <= start || end > positions.length) return null;
  const to = positions[end - 1] + 1;
  if (!replacement && start > 0 && /\s/.test(text[start - 1]) && (end >= text.length || /[\s.,;:)]/.test(text[end]))) start--;
  const edit = {
    segId,
    original: text.slice(start, end),
    replacement,
    before: text.slice(Math.max(0, start - REPLACEMENT_CONTEXT), start),
    after: text.slice(end, end + REPLACEMENT_CONTEXT),
  };
  return { from: positions[start], to, edit };
}

/** Poziția unei modificări propuse în blocul ei, acum; null dacă pasajul s-a schimbat. */
function locateEdit(editor: Editor, e: Pick<TextProposalEdit, "segId" | "start" | "original">): { block: BlockAt; start: number; end: number } | null {
  const block = findBlock(editor.state.doc, e.segId);
  if (!block) return null;
  const at = locateProposal(blockTextMap(block).text, { start: e.start, textOriginal: e.original });
  return at === null ? null : { block, start: at, end: at + e.original.length };
}

// ───────────── modificări structurale ─────────────

interface TopLayout {
  /** pozițiile de început ale blocurilor de nivel superior, plus sfârșitul documentului */
  starts: number[];
  /** segmentele cu text, în ordine, cu blocul lor de nivel superior (ca `documentLayout` din core) */
  segs: { id: string; text: string; top: number; node: PMNode; container: boolean }[];
}

function topLayout(doc: PMNode): TopLayout {
  const starts: number[] = [];
  const segs: TopLayout["segs"] = [];
  const seen = new Set<string>();
  doc.forEach((child, offset, i) => {
    starts.push(offset);
    const visit = (node: PMNode, pos: number) => {
      if (SEG_BLOCKS.has(node.type.name)) {
        const id = node.attrs.segId as string | null;
        const text = blockTextMap({ node, pos }).text;
        if (id && text.trim() && !seen.has(id)) {
          seen.add(id);
          segs.push({ id, text, top: i, node, container: node !== child });
        }
        return;
      }
      node.forEach((c, off) => visit(c, pos + 1 + off));
    };
    visit(child, offset);
  });
  starts.push(doc.content.size);
  return { starts, segs };
}

function allSegIds(doc: PMNode): Set<string> {
  const used = new Set<string>();
  doc.descendants((node) => {
    if (SEG_BLOCKS.has(node.type.name)) {
      if (typeof node.attrs.segId === "string" && node.attrs.segId) used.add(node.attrs.segId);
      return false;
    }
    return true;
  });
  return used;
}

function segIdsIn(nodes: readonly PMNode[]): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    const add = (node: PMNode) => {
      if (SEG_BLOCKS.has(node.type.name)) {
        if (typeof node.attrs.segId === "string" && node.attrs.segId) out.push(node.attrs.segId);
        return;
      }
      node.forEach(add);
    };
    add(n);
  }
  return out;
}

const PARA_FORMAT = ["indentPt", "firstLineIndentPt", "lineHeight", "spaceBeforePt", "spaceAfterPt"] as const;

/** Formatarea moștenită de blocurile noi: a paragrafului-ancoră (alinierea doar dacă nu e centrat / dreapta) și fontul lui. */
function inheritedStyle(seg: TopLayout["segs"][number] | undefined): BlockStyle {
  if (!seg) return {};
  let textStyle: Record<string, unknown> | null = null;
  seg.node.forEach((c) => {
    if (textStyle || !c.isText) return;
    const m = c.marks.find((x) => x.type.name === "textStyle");
    if (m && (m.attrs.fontFamily || m.attrs.fontSize)) textStyle = { fontFamily: m.attrs.fontFamily ?? null, fontSize: m.attrs.fontSize ?? null };
  });
  if (seg.container || seg.node.type.name !== "paragraph") return { textStyle };
  const a = seg.node.attrs;
  const align = a.textAlign as string | null;
  const centered = align === "center" || align === "right";
  const paragraph: Record<string, unknown> = {};
  if (!centered && align) paragraph.textAlign = align;
  for (const k of PARA_FORMAT) if (typeof a[k] === "number" && !(centered && (k === "indentPt" || k === "firstLineIndentPt"))) paragraph[k] = a[k];
  return { paragraph, textStyle };
}

/** Intervalul [from, to) al blocurilor de nivel superior pentru segmentele unei înlocuiri, dacă sunt neschimbate. */
function locateRun(layout: TopLayout, segIds: readonly string[], originals?: readonly string[]): { from: number; to: number; first: number } | null {
  if (!segIds.length) return null;
  const first = layout.segs.findIndex((x) => x.id === segIds[0]);
  if (first < 0) return null;
  for (let k = 0; k < segIds.length; k++) {
    const seg = layout.segs[first + k];
    if (!seg || seg.id !== segIds[k]) return null;
    if (originals && seg.text !== originals[k]) return null;
  }
  const last = first + segIds.length - 1;
  const t0 = layout.segs[first].top;
  const t1 = layout.segs[last].top;
  // blocuri întregi: niciun alt segment cu text în tabelul / lista înlocuită
  if (layout.segs[first - 1]?.top === t0 || layout.segs[last + 1]?.top === t1) return null;
  return { from: layout.starts[t0], to: layout.starts[t1 + 1], first };
}

interface BlockPlan {
  from: number;
  to: number;
  nodes: PMNode[];
}

function planBlocks(editor: Editor, e: InsertBlocksEdit | ReplaceBlocksEdit, layout: TopLayout, used: Set<string>): BlockPlan | null {
  const { schema } = editor.state;
  const build = (style: BlockStyle) => {
    try {
      return blocksToNodes(e.blocks, used, style).map((j) => schema.nodeFromJSON(j));
    } catch {
      return null;
    }
  };
  if (e.kind === "insert") {
    const seg = layout.segs.find((x) => x.id === e.anchor);
    if (!seg || !e.blocks.length) return null;
    const pos = e.position === "inainte" ? layout.starts[seg.top] : layout.starts[seg.top + 1];
    const nodes = build(inheritedStyle(seg));
    return nodes ? { from: pos, to: pos, nodes } : null;
  }
  const run = locateRun(layout, e.segIds, e.originals);
  if (!run) return null;
  const nodes = build(inheritedStyle(layout.segs[run.first]));
  return nodes ? { from: run.from, to: run.to, nodes } : null;
}

/** Un segId din blocul de nivel superior `index` (primul sau ultimul); null dacă nu există. */
function segIdOfTop(doc: PMNode, index: number, last: boolean): string | null {
  if (index < 0 || index >= doc.childCount) return null;
  const ids = segIdsIn([doc.child(index)]);
  return (last ? ids.at(-1) : ids[0]) ?? null;
}

const nodesJSON = (doc: PMNode, fromIndex: number, count: number): string =>
  JSON.stringify(Array.from({ length: count }, (_, k) => (fromIndex + k < doc.childCount ? doc.child(fromIndex + k).toJSON() : null)));

/** Indicele blocului de nivel superior care conține segmentul `segId` (inclusiv paragrafe goale). */
function topIndexOf(doc: PMNode, segId: string): number {
  let found = -1;
  doc.forEach((child, _off, i) => {
    if (found < 0 && segIdsIn([child]).includes(segId)) found = i;
  });
  return found;
}

const chatMeta = (editor: Editor, meta: ChatMarksMeta) => editor.view.dispatch(editor.state.tr.setMeta(chatMarksKey, meta).setMeta("addToHistory", false));

export function createEditorBridge(editor: Editor, hooks: BridgeHooks = {}): EditorBridge {
  const storage = () => (editor.storage as unknown as { lexHighlights?: HighlightsStorage }).lexHighlights;

  const bridge: EditorBridge = {
    // obiecte simple (atributele ProseMirror n-au prototip și nu trec prin acțiunile de server)
    getJSON: () => JSON.parse(JSON.stringify(editor.getJSON())) as JSONContent,

    getSegments: () => segmentsFromDoc(editor.getJSON() as never).map((s) => ({ segId: s.id, text: s.text, kind: s.kind })),

    setHighlights(items) {
      const ranges = computeHighlightRanges(editor.state.doc, items);
      editor.view.dispatch(editor.state.tr.setMeta(highlightsKey, { ranges }).setMeta("addToHistory", false));
    },

    focusHighlight(id) {
      if (id === null) {
        if (highlightsKey.getState(editor.state)?.active) editor.view.dispatch(editor.state.tr.setMeta(highlightsKey, { active: null }).setMeta("addToHistory", false));
        return;
      }
      const st = highlightsKey.getState(editor.state);
      const range = st?.ranges.find((r) => r.id === id);
      // activă și dacă evidențierea apare abia după (o constatare readusă din „Ignorate”)
      editor.view.dispatch(editor.state.tr.setMeta(highlightsKey, { active: id, pulse: true }).setMeta("addToHistory", false));
      if (!range) return;
      const el = editor.isInitialized ? (editor.view.dom as HTMLElement).querySelector(`[data-hl-id="${CSS.escape(id)}"]`) : null;
      if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      else scrollToPos(editor, range.from);
    },

    onHighlightClick(cb) {
      const s = storage();
      s?.listeners.add(cb);
      return () => {
        s?.listeners.delete(cb);
      };
    },

    insertSuggestion({ segId, original, replacement, findingId }) {
      const block = findBlock(editor.state.doc, segId);
      if (!block || !original.trim()) return null;
      const range = locateInBlock(block, original, { exact: true });
      if (!range) return null;
      const { schema } = editor.state;
      const id = newSuggestionId();
      const attrs = { id, author: "ai", findingId: findingId ?? null, createdAt: new Date().toISOString() };
      const tr = editor.state.tr;
      tr.removeMark(range.from, range.to, schema.marks.suggestInsert);
      tr.addMark(range.from, range.to, schema.marks.suggestDelete.create(attrs));
      if (replacement) {
        const before = tr.doc.nodeAt(range.to - 1);
        const base = (before?.marks ?? []).filter((m) => !["suggestDelete", "suggestInsert", "placeholder"].includes(m.type.name));
        tr.insert(range.to, schema.text(replacement, [...base, schema.marks.suggestInsert.create(attrs)]));
      }
      const meta: SuggestionMeta = { action: "insert", ids: [id] };
      editor.view.dispatch(tr.setMeta(SUGGESTION_META, meta));
      return id;
    },

    applyReplacement({ segId, original, replacement }) {
      const block = findBlock(editor.state.doc, segId);
      if (!block || !original.trim()) return null;
      const range = locateInBlock(block, original, { exact: true });
      if (!range) return null;
      const { positions } = blockTextMap(block);
      const start = positions.indexOf(range.from);
      const end = positions.indexOf(range.to - 1) + 1;
      const plan = planReplacement(block, segId, start, end, replacement);
      if (!plan) return null;
      editor.view.dispatch(replacement ? editor.state.tr.insertText(replacement, plan.from, plan.to) : editor.state.tr.delete(plan.from, plan.to));
      return plan.edit;
    },

    revertReplacement(edit) {
      const block = findBlock(editor.state.doc, edit.segId);
      if (!block) return false;
      const { text, positions } = blockTextMap(block);
      // o formatare nu schimbă textul: se readuc mark-urile originale
      if (!edit.format && text.includes(edit.before + edit.original + edit.after)) return true;
      const needle = edit.before + edit.replacement + edit.after;
      const at = needle ? text.indexOf(needle) : -1;
      if (at < 0 || text.indexOf(needle, at + 1) >= 0) return false;
      const start = at + edit.before.length;
      const end = start + edit.replacement.length;
      let original: Fragment | null = null;
      try {
        original = edit.originalJSON?.length ? Fragment.fromJSON(editor.schema, edit.originalJSON) : null;
      } catch {
        original = null;
      }
      let tr;
      if (original && end > start) tr = editor.state.tr.replaceWith(positions[start], positions[end - 1] + 1, original);
      else if (original) tr = editor.state.tr.insert(start < positions.length ? positions[start] : positions.length ? positions[positions.length - 1] + 1 : block.pos + 1, original);
      else if (end > start) tr = editor.state.tr.insertText(edit.original, positions[start], positions[end - 1] + 1);
      else {
        const pos = start < positions.length ? positions[start] : positions.length ? positions[positions.length - 1] + 1 : block.pos + 1;
        tr = editor.state.tr.insertText(edit.original, pos);
      }
      editor.view.dispatch(tr);
      return true;
    },

    acceptSuggestion: (id) => acceptSuggestion(editor, id),
    rejectSuggestion: (id) => rejectSuggestion(editor, id),
    listSuggestions: () => listSuggestions(editor.state.doc),

    listPlaceholders: () => findPlaceholders(editor.state.doc).map(({ index, hint, text, segId }) => ({ index, hint, text, segId })),

    focusPlaceholder(index) {
      const ph = findPlaceholders(editor.state.doc)[index];
      if (!ph) return;
      const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, ph.from, ph.to));
      editor.view.dispatch(tr.scrollIntoView());
      if (editor.isInitialized) {
        editor.view.focus();
        scrollToPos(editor, ph.from);
      }
    },

    setReadOnly(readOnly) {
      editor.setEditable(!readOnly);
      hooks.onReadOnlyChange?.(readOnly);
    },

    replaceContent(json) {
      editor.commands.setContent(json, { emitUpdate: true });
    },

    changedSegIdsSince: (versionContent) => changedSegIds(versionContent, editor.getJSON() as JSONContent),

    onSelectionChange(cb) {
      editor.on("transaction", cb);
      return () => {
        editor.off("transaction", cb);
      };
    },

    selectionKey() {
      const { from, to, empty } = editor.state.selection;
      return empty ? "" : `${from}:${to}:${editor.state.doc.content.size}`;
    },

    selectionScope() {
      const { from, to, empty } = editor.state.selection;
      if (empty) return null;
      const segments: ChatScope["segments"] = [];
      const texts: string[] = [];
      editor.state.doc.nodesBetween(from, to, (node, pos) => {
        if (SEG_BLOCKS.has(node.type.name)) {
          const segId = node.attrs.segId as string | null;
          if (!segId) return false;
          const { text, positions } = blockTextMap({ node, pos });
          let start = -1;
          let end = -1;
          positions.forEach((p, i) => {
            if (p >= from && p < to) {
              if (start < 0) start = i;
              end = i + 1;
            }
          });
          if (start >= 0 && text.slice(start, end).trim()) {
            segments.push({ segmentId: segId, start, end });
            texts.push(text.slice(start, end));
          }
          return false;
        }
        return !node.isTextblock;
      });
      return segments.length ? { segments, text: texts.join("\n") } : null;
    },

    focusEditor() {
      if (editor.isInitialized) editor.view.focus();
    },

    markChatScope(on) {
      if (Boolean(chatMarksKey.getState(editor.state)?.scope) !== on) chatMeta(editor, { scope: on });
    },

    previewProposal(target, opts = {}) {
      let next: ChatTarget | null = null;
      if (target && (!target.kind || target.kind === "text")) {
        const t = target as TextProposalEdit;
        const hit = locateEdit(editor, t);
        if (hit) {
          const { positions } = blockTextMap(hit.block);
          next = { mode: "inline", from: positions[hit.start], to: positions[hit.end - 1] + 1 };
        }
      } else if (target?.kind === "insert") {
        const layout = topLayout(editor.state.doc);
        const seg = layout.segs.find((x) => x.id === target.anchor);
        if (seg) next = { mode: target.position === "inainte" ? "before" : "after", from: layout.starts[seg.top], to: layout.starts[seg.top + 1] };
      } else if (target?.kind === "replace") {
        const run = locateRun(topLayout(editor.state.doc), target.segIds);
        if (run) next = { mode: "blocks", from: run.from, to: run.to };
      }
      const cur = chatMarksKey.getState(editor.state)?.target ?? null;
      if (next?.from !== cur?.from || next?.to !== cur?.to || next?.mode !== cur?.mode) chatMeta(editor, { target: next });
      const scroll = opts.scroll === true ? "always" : opts.scroll || null;
      if (next && scroll) scrollToTarget(editor, next, scroll === "if-needed");
      return Boolean(next) || !target;
    },

    applyProposals(edits) {
      const doc = editor.state.doc;
      const layout = topLayout(doc);
      const used = allSegIds(doc);
      type Plan = { from: number; to: number; i: number } & ({ text: NonNullable<ReturnType<typeof planReplacement>>; markup: string } | { format: FormatEdit; edit: AppliedReplacement } | { blocks: BlockPlan });
      const plans: Plan[] = [];
      edits.forEach((e, i) => {
        if (e.kind === "insert" || e.kind === "replace") {
          const b = planBlocks(editor, e, layout, used);
          if (b) plans.push({ from: b.from, to: b.to, i, blocks: b });
          return;
        }
        if (!e.original) return;
        const hit = locateEdit(editor, e);
        if (!hit) return;
        if (e.kind === "format") {
          const { text, positions } = blockTextMap(hit.block);
          const from = positions[hit.start];
          const to = positions[hit.end - 1] + 1;
          const edit: AppliedReplacement = {
            segId: e.segId,
            original: e.original,
            replacement: e.original,
            before: text.slice(Math.max(0, hit.start - REPLACEMENT_CONTEXT), hit.start),
            after: text.slice(hit.end, hit.end + REPLACEMENT_CONTEXT),
            originalJSON: doc.slice(from, to).content.toJSON() as JSONContent[],
            format: true,
          };
          plans.push({ from, to, i, format: e, edit });
          return;
        }
        // textul nou poate avea **aldin** / *cursiv*: în document ajung mark-uri, nu asteriscuri
        const p = planReplacement(hit.block, e.segId, hit.start, hit.end, plainInline(e.replacement));
        if (p) plans.push({ from: p.from, to: p.to, i, text: { ...p, edit: { ...p.edit, originalJSON: doc.slice(p.from, p.to).content.toJSON() as JSONContent[] } }, markup: e.replacement });
      });
      // de la sfârșitul documentului spre început: pozițiile celor rămase nu se mută; la aceeași
      // poziție, intervalul mai lung întâi (o inserare „înainte” rămâne înaintea înlocuirii)
      plans.sort((a, b) => b.from - a.from || b.to - a.to);
      // două modificări peste același loc (propuneri din mesaje diferite): se aplică doar prima
      const out: (AppliedEdit | null)[] = edits.map(() => null);
      const pending: { i: number; stepEnd: number; from: number; plan: BlockPlan; removed: JSONContent[] }[] = [];
      let tr: Transaction = editor.state.tr;
      let floor = Infinity;
      for (const p of plans) {
        if (p.to > floor) continue;
        if ("text" in p) {
          if (!p.text.edit.replacement) tr = tr.delete(p.from, p.to);
          else if (hasInlineFormat(p.markup)) tr = tr.replaceWith(p.from, p.to, formattedText(tr, p.from, p.to, p.markup));
          else tr = tr.insertText(p.text.edit.replacement, p.from, p.to);
          out[p.i] = p.text.edit;
        } else if ("format" in p) {
          const { schema } = editor.state;
          for (const name of FORMAT_MARKS) {
            const on = p.format.styles[name];
            const type = schema.marks[name];
            if (on === undefined || !type) continue;
            tr = on ? tr.addMark(p.from, p.to, type.create()) : tr.removeMark(p.from, p.to, type);
          }
          out[p.i] = p.edit;
        } else {
          const removed: JSONContent[] = [];
          doc.nodesBetween(p.from, p.to, (node, pos) => {
            if (pos >= p.from && pos + node.nodeSize <= p.to) removed.push(node.toJSON() as JSONContent);
            return false;
          });
          try {
            if (p.blocks.nodes.length) tr = tr.replaceWith(p.from, p.to, Fragment.from(p.blocks.nodes));
            else tr = tr.delete(p.from, p.to);
          } catch {
            continue;
          }
          pending.push({ i: p.i, stepEnd: tr.steps.length, from: p.from, plan: p.blocks, removed });
        }
        floor = p.from;
      }
      // contextul fiecărei modificări structurale, în documentul final (pentru „Anulează”)
      for (const x of pending) {
        const at = tr.mapping.slice(x.stepEnd).map(x.from, -1);
        const index = tr.doc.resolve(at).index(0);
        out[x.i] = {
          kind: "blocks",
          inserted: x.plan.nodes.map((n) => n.toJSON() as JSONContent),
          removed: x.removed,
          newSegIds: segIdsIn(x.plan.nodes),
          before: segIdOfTop(tr.doc, index - 1, true),
          after: segIdOfTop(tr.doc, index + x.plan.nodes.length, false),
        };
      }
      if (tr.docChanged) editor.view.dispatch(tr);
      return out;
    },

    revertEdit(edit) {
      if (!isAppliedBlocks(edit)) return bridge.revertReplacement(edit);
      const doc = editor.state.doc;
      const n = edit.inserted.length;
      // unde sunt acum blocurile noi: după segId-urile lor, altfel între vecini
      let start = -1;
      if (edit.newSegIds.length) {
        const top = topIndexOf(doc, edit.newSegIds[0]);
        const k0 = edit.inserted.findIndex((j) => segIdsIn([editor.schema.nodeFromJSON(j)]).includes(edit.newSegIds[0]));
        if (top >= 0 && k0 >= 0) start = top - k0;
      } else if (edit.before) {
        const top = topIndexOf(doc, edit.before);
        if (top >= 0) start = top + 1;
      } else if (edit.after) {
        const top = topIndexOf(doc, edit.after);
        if (top >= 0) start = top - n;
      } else if (doc.childCount === n) start = 0;
      if (start < 0 || start + n > doc.childCount) return false;
      if (nodesJSON(doc, start, n) !== JSON.stringify(edit.inserted)) return false;
      const layout = topLayout(doc);
      const from = layout.starts[start];
      const to = layout.starts[start + n];
      try {
        const nodes = edit.removed.map((j) => editor.schema.nodeFromJSON(j));
        const tr = nodes.length ? editor.state.tr.replaceWith(from, to, Fragment.from(nodes)) : editor.state.tr.delete(from, to);
        editor.view.dispatch(tr);
        return true;
      } catch {
        return false;
      }
    },
  };
  return bridge;
}

export const EditorBridgeContext = createContext<EditorBridge | null>(null);

/** Bridge-ul editorului din spațiul de lucru (pentru panourile randate în el). */
export function useEditorBridge(): EditorBridge {
  const bridge = useContext(EditorBridgeContext);
  if (!bridge) throw new Error("useEditorBridge() trebuie folosit în spațiul de lucru al editorului.");
  return bridge;
}
