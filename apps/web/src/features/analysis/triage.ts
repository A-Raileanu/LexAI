import { CATEGORY_LABELS, STATUS_META, STATUS_ORDER } from "@lexai/core/labels";
import type { ActRef, Finding, FindingEvidence, Suggestion, VerdictStatus } from "@lexai/core/types";
import type { SuggestionView } from "./model";
import type { FindingActionKind } from "./types";

/**
 * Lista de triaj a rezultatelor (docs/ux/08b-rezultate-analiza-revizie.md): trimiterea scurtă,
 * locul în document, grupurile (probleme, corecte, rezolvate, ignorate), diff-ul la nivel de
 * cuvânt al corecturilor, alegerea variantei și tastele. Funcții pure, fără React.
 */

// ───────────────────────── Trimiterea scurtă ─────────────────────────

const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();

/** Codurile, după legea de aprobare (număr/an) sau după titlu („COD CIVIL…”). */
const CODES: { num: string; an: string; title: RegExp; abbr: string }[] = [
  { num: "134", an: "2010", title: /^COD(UL)? DE PROCEDURA CIVILA/, abbr: "C. proc. civ." },
  { num: "135", an: "2010", title: /^COD(UL)? DE PROCEDURA PENALA/, abbr: "C. proc. pen." },
  { num: "207", an: "2015", title: /^COD(UL)? DE PROCEDURA FISCALA/, abbr: "C. proc. fisc." },
  { num: "287", an: "2009", title: /^COD(UL)? CIVIL/, abbr: "C. civ." },
  { num: "286", an: "2009", title: /^COD(UL)? PENAL/, abbr: "C. pen." },
  { num: "227", an: "2015", title: /^COD(UL)? FISCAL/, abbr: "C. fisc." },
  { num: "53", an: "2003", title: /^COD(UL)? MUNCII/, abbr: "C. muncii" },
  { num: "57", an: "2019", title: /^COD(UL)? ADMINISTRATIV/, abbr: "C. adm." },
];

const TYPE_ABBR: [RegExp, string][] = [
  [/^(?:ORDONANTA DE URGENTA|OUG$|O\.U\.G\.?$)/, "OUG"],
  [/^(?:OG|O\.G\.?)$/, "OG"],
  [/^(?:HG|H\.G\.?)$/, "HG"],
  [/^ORDONANTA/, "OG"],
  [/^HOTARARE/, "HG"],
  [/^LEGE/, "L."],
  [/^DECRET/, "Decretul"],
  [/^ORDIN/, "Ordinul"],
  [/^DECIZI/, "Decizia nr."],
  [/^REGULAMENT/, "Regulamentul"],
];

/** Tipul, numărul și anul actului: din câmpuri sau din titlu („LEGE nr. 31 din 16 noiembrie 1990”). */
export function actParts(act: Pick<ActRef, "titlu" | "tip" | "numar" | "an">): { tip: string | null; numar: string | null; an: string | null } {
  const m = act.titlu.match(/^(.+?)\s+nr\.?\s*(\d+)(?:\s*\/\s*(\d{4})|\s+din\s+(?:\d{1,2}\s+\S+\s+)?(\d{4}))?/i);
  return {
    tip: act.tip?.trim() || m?.[1]?.trim() || null,
    numar: act.numar?.trim() || m?.[2] || null,
    an: act.an?.trim() || m?.[3] || m?.[4] || null,
  };
}

/** Abrevierea actului: „C. civ.”, „L. 31/1990”, „OUG 195/2002”; `code` = codurile (se pun după unitate). */
export function actAbbrev(act: Pick<ActRef, "titlu" | "tip" | "numar" | "an">): { text: string; code: boolean } {
  const { tip, numar, an } = actParts(act);
  const title = fold(act.titlu.trim());
  const code = CODES.find((c) => (c.num === numar && c.an === an) || c.title.test(title));
  if (code) return { text: code.abbr, code: true };
  if (/^CONSTITUTI/.test(title)) return { text: "Constituția", code: true };
  const t = tip ? fold(tip) : "";
  const abbr = TYPE_ABBR.find(([re]) => re.test(t))?.[1];
  if (abbr && numar) return { text: `${abbr} ${numar}${an ? `/${an}` : ""}`, code: false };
  return { text: act.titlu.trim(), code: false };
}

/** Unitatea fără numele actului repetat („art. 5 din Legea nr. 31/1990” → „art. 5”). */
export function cleanUnit(unitate: string): string {
  return unitate
    .replace(/\s+(?:din|al|a|ale)\s+(?:Codul|Legea|Legii|OUG|O\.U\.G|Ordonan|Hot[aă]r|Constitu|Decizi|Decretul|Ordinul)[^)]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Unitatea numește o parte a actului (articol, alineat…), nu actul însuși („Legea nr. 31/1990”). */
const UNIT_PART = /\b(?:art|alin|lit|pct|par|anexa|cap|capitolul|titlul|sec[tț]iunea|teza)\b/i;

/** „art. 1.350 alin. (3) C. civ.”, „L. 31/1990, art. 197”; fallback: citatul scurtat. */
export function shortReference(f: Pick<Finding, "act" | "unitate" | "citat">): string {
  const raw = f.unitate ? cleanUnit(f.unitate) : "";
  const unit = UNIT_PART.test(raw) ? raw : "";
  if (f.act) {
    const a = actAbbrev(f.act);
    // unitatea numește alt act decât cel identificat (ex. o lege abrogată): o păstrăm ca atare
    const numar = actParts(f.act).numar;
    if (!unit && raw && numar && !new RegExp(`\\b${numar}\\b`).test(raw)) return raw;
    if (!unit) return a.text;
    return a.code ? `${unit} ${a.text}` : `${a.text}, ${unit}`;
  }
  if (raw) return raw;
  const q = f.citat.replace(/\s+/g, " ").trim();
  return `„${q.length > 80 ? `${q.slice(0, 79).trimEnd()}…` : q}”`;
}

// ───────────────────────── Locul în document ─────────────────────────

/** Antetul unui articol din document: „Art. 4”, „ART. 4.”, „Articolul 4”. Nu „art. 4” (o trimitere în text). */
const ARTICLE_HEAD = /^\s*(?:Art\.|ART\.|Articolul|ARTICOLUL)\s*(\d+(?:\^\d+)?)/;

/**
 * Eticheta locului fiecărui paragraf: articolul din document în care se află („Art. 4”) sau,
 * înaintea primului articol și în documentele fără articole, numărul paragrafului („§ 12”).
 */
export function documentLocators(segments: readonly { segId: string; text: string }[]): Map<string, string> {
  const out = new Map<string, string>();
  let current: string | null = null;
  segments.forEach((s, i) => {
    const m = s.text.match(ARTICLE_HEAD);
    if (m) current = `Art. ${m[1]}`;
    out.set(s.segId, current ?? `§ ${i + 1}`);
  });
  return out;
}

/** Locul constatării (prima ancoră); null dacă nu a fost localizată. */
export function locatorOf(f: Pick<Finding, "anchors">, locators: ReadonlyMap<string, string>): string | null {
  const a = f.anchors.find((x) => x.segmentId && x.potrivire !== "negasita") ?? f.anchors[0];
  return a ? (locators.get(a.segmentId) ?? null) : null;
}

// ───────────────────────── Grupurile listei ─────────────────────────

export type ResolvedKind = Exclude<FindingActionKind, "ignorata">;
export type SortMode = "gravitate" | "document";
/** grupurile de probleme: o stare sau, la „ordinea din document”, toate împreună */
export type GroupKey = Exclude<VerdictStatus, "corect"> | "toate";

export interface TriageGroup {
  key: GroupKey;
  findings: Finding[];
}

export interface Triage {
  /** de rezolvat: tot ce nu e corect, rezolvat sau ignorat */
  problems: TriageGroup[];
  correct: Finding[];
  resolved: { f: Finding; kind: ResolvedKind }[];
  ignored: Finding[];
  /** „2 din 6 rezolvate”: rezolvate + ignorate din tot ce nu e corect */
  progress: { done: number; total: number; applied: number; verified: number; ignored: number };
}

/** Ordinea din document: poziția paragrafului (nelocalizatele la sfârșit), apoi a citatului. */
export function byDocumentOrder<T extends Pick<Finding, "anchors">>(list: readonly T[], order?: ReadonlyMap<string, number>): T[] {
  const pos = (f: T) => {
    const a = f.anchors[0];
    return (a ? order?.get(a.segmentId) : undefined) ?? Number.MAX_SAFE_INTEGER;
  };
  return list
    .map((f, i) => ({ f, i, p: pos(f), s: f.anchors[0]?.start ?? 0 }))
    .sort((a, b) => a.p - b.p || a.s - b.s || a.i - b.i)
    .map((x) => x.f);
}

export function buildTriage(
  findings: readonly Finding[],
  ignoredFindings: readonly Finding[],
  actions: Readonly<Record<string, FindingActionKind>>,
  order?: ReadonlyMap<string, number>,
  sort: SortMode = "gravitate",
): Triage {
  const open: Finding[] = [];
  const correct: Finding[] = [];
  const resolvedList: Finding[] = [];
  for (const f of findings) {
    const a = actions[f.id];
    if (a === "aplicata" || a === "verificata") resolvedList.push(f);
    else if (f.status === "corect") correct.push(f);
    else open.push(f);
  }
  const sorted = byDocumentOrder(open, order);
  const problems: TriageGroup[] =
    sort === "document"
      ? sorted.length
        ? [{ key: "toate", findings: sorted }]
        : []
      : STATUS_ORDER.filter((s): s is Exclude<VerdictStatus, "corect"> => s !== "corect")
          .map((key) => ({ key, findings: sorted.filter((f) => f.status === key) }))
          .filter((g) => g.findings.length > 0);
  const resolved = byDocumentOrder(resolvedList, order).map((f) => ({ f, kind: actions[f.id] as ResolvedKind }));
  const ignored = byDocumentOrder(ignoredFindings, order);
  const applied = resolved.filter((r) => r.kind === "aplicata").length;
  const verified = resolved.length - applied;
  const ignoredProblems = ignored.filter((f) => f.status !== "corect").length;
  const resolvedProblems = resolved.filter((r) => r.f.status !== "corect").length;
  return {
    problems,
    correct: byDocumentOrder(correct, order),
    resolved,
    ignored,
    progress: { done: resolvedProblems + ignoredProblems, total: open.length + resolvedProblems + ignoredProblems, applied, verified, ignored: ignoredProblems },
  };
}

/** Constatarea care se deschide după ce `id` pleacă din listă: următoarea, altfel anterioara. */
export function nextAfterRemoval(ids: readonly string[], id: string): string | null {
  const i = ids.indexOf(id);
  if (i < 0) return ids[0] ?? null;
  return ids[i + 1] ?? ids[i - 1] ?? null;
}

// ───────────────────────── Conținutul constatării deschise ─────────────────────────

const GENERIC_TITLES = new Set(["trimitere neverificata", "trimitere neverificată"]);

/** Concluzia (titlul), fără titlurile generice; fallback: eticheta categoriei. */
export function conclusionOf(f: Pick<Finding, "titlu" | "status" | "categorie">): string | null {
  const t = f.titlu?.trim() ?? "";
  const low = t.toLowerCase();
  const meta = STATUS_META[f.status];
  const generic = !t || GENERIC_TITLES.has(low) || low === meta.label.toLowerCase() || low === meta.scurt.toLowerCase();
  if (!generic) return t;
  return f.categorie ? CATEGORY_LABELS[f.categorie] : null;
}

/** Explicația: pentru „Neverificat”, motivul; rezumatul verdictului doar dacă lipsește explicația. */
export function explanationOf(f: Pick<Finding, "status" | "explicatie" | "motivNeverificare" | "verdictLaData">): string {
  if (f.status === "neverificat" && f.motivNeverificare?.trim()) return f.motivNeverificare.trim();
  return f.explicatie?.trim() || f.verdictLaData.rezumat?.trim() || "";
}

/** Verdictul de azi, doar dacă diferă de cel de la data de referință. */
export function todayDiffers(f: Pick<Finding, "verdictLaData" | "verdictAstazi">): VerdictStatus | null {
  return f.verdictAstazi && f.verdictAstazi.status !== f.verdictLaData.status ? f.verdictAstazi.status : null;
}

/** Dovada afișată (prima confirmată) și celelalte, pentru „Alte surse”. */
export function evidenceOf(f: Pick<Finding, "dovezi">): { main: FindingEvidence | null; rejected: FindingEvidence | null; others: FindingEvidence[] } {
  const confirmed = f.dovezi.filter((d) => d.validare === "confirmata");
  const main = confirmed[0] ?? null;
  return { main, rejected: main ? null : (f.dovezi[0] ?? null), others: f.dovezi.filter((d) => d !== main) };
}

/** Citatul scurtat la ~`max` caractere, la final de cuvânt, cu „…”. */
export function clipQuote(text: string, max = 280): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const word = cut.lastIndexOf(" ");
  return `${cut.slice(0, word > max * 0.6 ? word : max).replace(/[\s,;:]+$/, "")}…`;
}

/** Numele sursei pentru linia de sub citat. */
export function sourceName(url: string, label?: string | null): string {
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    host = "";
  }
  if (host.endsWith("legislatie.just.ro")) return "Portal Legislativ";
  if (host) return host;
  return label?.trim() || "Sursa";
}

// ───────────────────────── Variantele de corectură ─────────────────────────

/**
 * Ce face o variantă: înlocuiește textul, îl elimină, îl păstrează („Păstrează textul”) sau
 * nu poate fi aplicată automat (fără text original de găsit în document).
 */
export type VariantKind = "inlocuire" | "eliminare" | "pastrare" | "manual";

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export function variantKind(s: Pick<Suggestion, "textOriginal" | "textPropus">): VariantKind {
  const orig = squash(s.textOriginal);
  const prop = squash(s.textPropus);
  if (!orig) return "manual";
  if (!prop) return "eliminare";
  if (orig === prop) return "pastrare";
  return "inlocuire";
}

/** Alegerea implicită: o singură variantă e aleasă; la două sau mai multe, nimic (decizia e a avocatului). */
export function initialChoice(views: readonly Pick<SuggestionView, "index">[]): number | null {
  return views.length === 1 ? views[0].index : null;
}

/** Tasta `1`–`9` → indicele variantei, dacă există. */
export function choiceFromKey(key: string, count: number): number | null {
  if (!/^[1-9]$/.test(key)) return null;
  const i = Number(key) - 1;
  return i < count ? i : null;
}

export type PrimaryAction = { kind: "aplica" | "aplica-varianta" | "verificat"; enabled: boolean } | null;

/**
 * Acțiunea principală (08b, 4.7): „Aplică” pentru o corectură, „Aplică varianta” (activă doar
 * după alegere) pentru variante, „Am verificat” fără corectură; nimic pentru corecte și rezolvate.
 * Aplicarea așteaptă sfârșitul analizei (`running`); `canResolve` = există o analiză salvată.
 */
export function primaryAction(
  f: Pick<Finding, "status">,
  views: readonly Pick<SuggestionView, "index" | "suggestion">[],
  chosen: number | null,
  state: { resolved: boolean; running: boolean; canResolve: boolean },
): PrimaryAction {
  if (f.status === "corect" || state.resolved) return null;
  const usable = views.filter((v) => variantKind(v.suggestion) !== "manual");
  const canApply = state.canResolve && !state.running;
  if (views.length >= 2 && usable.length) {
    const pick = views.find((v) => v.index === chosen);
    return { kind: "aplica-varianta", enabled: Boolean(pick && variantKind(pick.suggestion) !== "manual" && canApply) };
  }
  if (views.length === 1 && usable.length) return { kind: "aplica", enabled: canApply };
  return { kind: "verificat", enabled: state.canResolve };
}

// ───────────────────────── Diff la nivel de cuvânt ─────────────────────────

export type DiffPart = { kind: "same" | "del" | "ins"; text: string };

/**
 * Cuvinte și spații; punctuația de la final de cuvânt („limitată,”) e un semn separat, ca o
 * virgulă să nu marcheze tot cuvântul. Punctele din interior rămân („1.350”, „31/1990”).
 */
export const tokenize = (s: string): string[] =>
  (s.match(/\s+|\S+/g) ?? []).flatMap((t) => {
    const m = t.match(/^(.*?[^,.;:!?])([,.;:!?]+)$/);
    return m ? [m[1], m[2]] : [t];
  });

const MAX_CELLS = 250_000;

function push(out: DiffPart[], kind: DiffPart["kind"], text: string) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.kind === kind) last.text += text;
  else out.push({ kind, text });
}

/**
 * Diff-ul a două texte la nivel de cuvânt (LCS pe cuvinte și spații). Într-o porțiune
 * schimbată, textul șters vine înaintea celui adăugat; spațiile dintre două schimbări se
 * alipesc schimbării, ca diff-ul să nu se fărâmițeze.
 */
export function wordDiff(a: string, b: string): DiffPart[] {
  const x = tokenize(a);
  const y = tokenize(b);
  const n = x.length;
  const m = y.length;
  if (n * m > MAX_CELLS) {
    const out: DiffPart[] = [];
    push(out, "del", a);
    push(out, "ins", b);
    return out;
  }
  // lcs[i][j] = lungimea LCS pentru x[i..] și y[j..]
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) lcs[i][j] = x[i] === y[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  }
  // pași: same / del / ins, apoi porțiunile schimbate cu șters înainte de adăugat
  const steps: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && x[i] === y[j]) {
      steps.push({ kind: "same", text: x[i] });
      i++;
      j++;
    } else if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      steps.push({ kind: "ins", text: y[j++] });
    } else {
      steps.push({ kind: "del", text: x[i++] });
    }
  }
  // spațiile „same” dintre două schimbări intră în schimbare (în ambele părți)
  for (let k = 1; k < steps.length - 1; k++) {
    const s = steps[k];
    if (s.kind !== "same" || s.text.trim()) continue;
    const prev = steps[k - 1];
    const next = steps.slice(k + 1).find((t) => t.kind !== "same" || t.text.trim());
    if (prev.kind !== "same" && next && next.kind !== "same") {
      steps.splice(k, 1, { kind: "del", text: s.text }, { kind: "ins", text: s.text });
      k++;
    }
  }
  const out: DiffPart[] = [];
  let del = "";
  let ins = "";
  const flush = () => {
    push(out, "del", del);
    push(out, "ins", ins);
    del = "";
    ins = "";
  };
  for (const s of steps) {
    if (s.kind === "del") del += s.text;
    else if (s.kind === "ins") ins += s.text;
    else {
      flush();
      push(out, "same", s.text);
    }
  }
  flush();
  return out;
}

function clipStart(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(text.length - max);
  const sp = cut.search(/\s/);
  return `…${sp >= 0 && sp < max * 0.5 ? cut.slice(sp) : cut}`;
}

function clipEnd(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const sp = cut.search(/\s\S*$/);
  return `${sp > max * 0.5 ? cut.slice(0, sp) : cut}…`;
}

/**
 * Diff-ul unei corecturi, cu cel mult `context` caractere de context nemodificat de fiecare
 * parte („…” unde se taie). Contextul vine din paragraful documentului, dacă textul original
 * e găsit în el; porțiunile nemodificate lungi din mijloc se scurtează la fel.
 */
export function suggestionDiff(s: Pick<Suggestion, "textOriginal" | "textPropus">, segmentText?: string | null, context = 60): DiffPart[] {
  const parts: DiffPart[] = [];
  const at = segmentText && s.textOriginal ? segmentText.indexOf(s.textOriginal) : -1;
  if (at >= 0) push(parts, "same", segmentText!.slice(0, at));
  for (const p of wordDiff(s.textOriginal, s.textPropus)) push(parts, p.kind, p.text);
  if (at >= 0) push(parts, "same", segmentText!.slice(at + s.textOriginal.length));
  return parts.map((p, k) => {
    if (p.kind !== "same") return p;
    const first = k === 0;
    const last = k === parts.length - 1;
    if (first && last) return p;
    if (first) return { kind: "same", text: clipStart(p.text, context) };
    if (last) return { kind: "same", text: clipEnd(p.text, context) };
    if (p.text.length <= context * 2 + 20) return p;
    return { kind: "same", text: `${clipEnd(p.text, context)} ${clipStart(p.text, context)}` };
  });
}

// ───────────────────────── Tastatura ─────────────────────────

export type KeyIntent =
  | { kind: "next" }
  | { kind: "prev" }
  | { kind: "apply" }
  | { kind: "ignore" }
  | { kind: "verify" }
  | { kind: "details" }
  | { kind: "source" }
  | { kind: "close" }
  | { kind: "variant"; index: number };

/** Tasta → comanda din 08b (4.10); null pentru orice altceva (inclusiv cu modificatori). */
export function keyIntent(e: { key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean }): KeyIntent | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  switch (e.key) {
    case "j":
      return { kind: "next" };
    case "k":
      return { kind: "prev" };
    case "a":
      return { kind: "apply" };
    case "i":
      return { kind: "ignore" };
    case "v":
      return { kind: "verify" };
    case "d":
      return { kind: "details" };
    case "o":
      return { kind: "source" };
    case "Escape":
      return { kind: "close" };
  }
  return /^[1-9]$/.test(e.key) ? { kind: "variant", index: Number(e.key) - 1 } : null;
}

/** Tastele se ignoră în câmpuri, în editor și în meniurile deschise (dialogurile le verifică panoul). */
export function isTypingTarget(t: { tagName?: string; isContentEditable?: boolean; closest?: (s: string) => unknown } | null): boolean {
  if (!t) return false;
  if (t.isContentEditable) return true;
  if (t.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return (t as { type?: string }).type !== "radio";
  return Boolean(t.closest?.("[role=menu],[role=listbox],[role=alertdialog]"));
}
