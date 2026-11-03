import { BLOCK_LIMITS, checkBlock, parseInline, plainInline, type AgentBlock, type ChatBlock } from "./blocks";

export * from "./blocks";

/**
 * Chatul din editor (docs/ux/18-chat-editor.md): domeniul unei cereri (textul selectat), modificările
 * propuse de agent și validarea lor pe textul documentului. Fără dependențe de server: același cod
 * validează în worker (înainte ca propunerea să ajungă la utilizator) și localizează pasajul în
 * browser, la aplicare.
 */

/** Partea selectată dintr-un segment: indici în textul segmentului (ca în `segmentsFromDoc`). */
export interface ChatScopeSegment {
  segmentId: string;
  start: number;
  end: number;
}

/** Selecția din document trimisă odată cu cererea; null = tot documentul. */
export interface ChatScope {
  segments: ChatScopeSegment[];
  /** textul selectat, cu paragrafele despărțite prin „\n” */
  text: string;
}

export type ProposalStatus = "propusa" | "aplicata" | "respinsa";

/**
 * Felurile modificărilor propuse:
 * - `text`: înlocuiește un pasaj dintr-un singur segment (propunerile salvate înainte de
 *   modificările structurale nu au `kind` și sunt de acest fel); `textNou` poate avea **aldin** / *cursiv*;
 * - `formatare`: schimbă doar formatarea unui pasaj (aldin, cursiv, subliniat, tăiat), textul rămâne;
 * - `inserare`: blocuri noi după / înainte de blocul care conține segmentul-ancoră;
 * - `inlocuire_blocuri`: segmente consecutive întregi (blocurile lor) înlocuite cu blocuri noi;
 * - `stergere_blocuri`: segmente consecutive întregi șterse.
 * Blocurile de nivel superior (tot tabelul, toată lista) se înlocuiesc sau se șterg întregi.
 */
export type ProposalKind = "text" | "formatare" | "inserare" | "inlocuire_blocuri" | "stergere_blocuri";

/** Stilurile unei propuneri de formatare: true = aplică, false = scoate. */
export interface FormatStyles {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
}
export const FORMAT_STYLES = ["bold", "italic", "underline", "strike"] as const;

interface ProposalBase {
  /** unic în mesaj („m1”, „m2”…), în ordinea din document */
  id: string;
  explicatie: string;
  status: ProposalStatus;
}

/** Înlocuirea unui pasaj: textul original există exact, o singură dată, în domeniu. */
export interface TextProposal extends ProposalBase {
  kind?: "text";
  segmentId: string;
  /** poziția textului original în segment, la momentul propunerii */
  start: number;
  textOriginal: string;
  textNou: string;
}

/** Formatarea unui pasaj existent (textul rămâne același). */
export interface FormatProposal extends ProposalBase {
  kind: "formatare";
  segmentId: string;
  start: number;
  textOriginal: string;
  stiluri: FormatStyles;
}

/** Blocuri noi lângă blocul care conține segmentul-ancoră. */
export interface InsertProposal extends ProposalBase {
  kind: "inserare";
  /** segmentul-ancoră */
  segmentId: string;
  pozitie: "dupa" | "inainte";
  blocuri: ChatBlock[];
}

/** Segmente consecutive întregi înlocuite cu blocuri noi (sau șterse). */
export interface BlocksProposal extends ProposalBase {
  kind: "inlocuire_blocuri" | "stergere_blocuri";
  /** primul segment înlocuit (locatorul) */
  segmentId: string;
  segmentIds: string[];
  /** textul fiecărui segment la momentul propunerii (detectează documentul schimbat între timp) */
  textOriginal: string[];
  /** gol la ștergere */
  blocuri: ChatBlock[];
}

export type ChatProposal = TextProposal | FormatProposal | InsertProposal | BlocksProposal;
export type StructuralProposal = InsertProposal | BlocksProposal;

export const isTextProposal = (p: ChatProposal): p is TextProposal => !p.kind || p.kind === "text";
export const proposalKind = (p: ChatProposal): ProposalKind => p.kind ?? "text";
/** Propunerile care lucrează pe un pasaj dintr-un segment (text sau formatare). */
export const isPassageProposal = (p: ChatProposal): p is TextProposal | FormatProposal => isTextProposal(p) || p.kind === "formatare";

/** Segmentele pe care le atinge o propunere (ancora, pentru inserare). */
export const proposalSegments = (p: ChatProposal): string[] => (p.kind === "inlocuire_blocuri" || p.kind === "stergere_blocuri" ? p.segmentIds : [p.segmentId]);

/** O modificare așa cum o trimite agentul (instrumentul `propune_modificari`). */
export interface ProposedChange {
  /** lipsă = „text” */
  tip?: string;
  /** text / formatare: segmentul modificat; inserare: segmentul-ancoră */
  segment_id?: string;
  /** formatare: stilurile (true = aplică, false = scoate) */
  stiluri?: Record<string, unknown>;
  /** text: pasajul înlocuit; înlocuire / ștergere de blocuri: începutul primului segment */
  text_original?: string;
  text_nou?: string;
  pozitie?: string;
  /** înlocuire / ștergere de blocuri: id-urile segmentelor consecutive */
  segmente?: string[];
  blocuri?: AgentBlock[];
  explicatie?: string;
}

export const MAX_CHAT_CHANGES = 50;
export const MAX_REPLACED_SEGMENTS = 200;

/** Pozițiile tuturor aparițiilor exacte (inclusiv suprapuse) ale lui `needle` în `text`. */
export function occurrences(text: string, needle: string): number[] {
  const out: number[] = [];
  if (!needle) return out;
  for (let at = text.indexOf(needle); at >= 0; at = text.indexOf(needle, at + 1)) out.push(at);
  return out;
}

const loose = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[şŞ]/g, "s")
    .replace(/[ţŢ]/g, "t")
    .replace(/\s+/g, " ")
    .toLowerCase();

export type ChangeCheck = { ok: true; proposals: ChatProposal[] } | { ok: false; errors: string[] };

/** Un segment al documentului pentru validare; `top` = blocul de nivel superior (implicit, segmentul însuși). */
export interface ValidationSegment {
  id: string;
  text: string;
  top?: number;
}

export interface ValidationLayout {
  /** indicii blocurilor de nivel superior care sunt salturi de pagină (vezi `documentLayout`) */
  pageBreaks?: readonly number[];
  /** numărul blocurilor de nivel superior */
  blocks?: number;
}

type Accepted = {
  n: number;
  p: ChatProposal;
  /** ordinea în document: indicele segmentului, apoi poziția în el */
  order: [number, number];
  /** text: intervalul din segment */
  range?: { start: number; end: number };
  /** structurale: segmentele acoperite */
  covers?: string[];
  /** inserare: locul dintre blocurile de nivel superior */
  gap?: number;
};

/**
 * Verifică modificările propuse pe textul segmentelor. Pentru `text`:
 * - segmentul există, iar `text_original` apare EXACT în el (caracter cu caracter);
 * - cu selecție, segmentul face parte din ea și pasajul e în întregime în interiorul ei;
 * - pasajul e unic (în segment sau, cu selecție, în partea selectată);
 * - textele nu traversează și nu adaugă rânduri noi (modificarea rămâne în paragraf).
 * Pentru cele structurale:
 * - ancora / segmentele există; segmentele înlocuite sunt consecutive și acoperă blocuri întregi
 *   (tot tabelul, toată lista); `text_original` = începutul primului segment, exact;
 * - blocurile noi sunt valide (vezi `checkBlock`), fără salturi de pagină consecutive (nici cu
 *   cele existente), fără salt de pagină la începutul sau la sfârșitul documentului, iar o
 *   înlocuire nu pune doar un salt de pagină în locul textului;
 * - cu selecție: ancora și fiecare segment înlocuit / șters fac parte din selecție (măcar parțial).
 * Între propuneri: nicio suprapunere (pasaje din același segment, segmente înlocuite de două ori,
 * text sau ancoră într-un segment înlocuit, două inserări în același loc).
 * Rezultatul e în ordinea din document (id-uri „m1”, „m2”… în această ordine).
 * Erorile sunt formulate pentru agent (le primește ca rezultat de instrument și corectează).
 */
export function validateChanges(changes: readonly ProposedChange[], segments: readonly ValidationSegment[], scope?: ChatScope | null, layout: ValidationLayout = {}): ChangeCheck {
  const errors: string[] = [];
  if (changes.length > MAX_CHAT_CHANGES) return { ok: false, errors: [`Prea multe modificări (${changes.length}); propune cel mult ${MAX_CHAT_CHANGES}, grupând modificările apropiate.`] };
  const index = new Map(segments.map((s, i) => [s.id, i]));
  const topOf = (i: number) => segments[i].top ?? i;
  const breaks = new Set(segments.every((s) => s.top !== undefined) ? (layout.pageBreaks ?? []) : []);
  const blockCount = layout.blocks ?? (segments.length ? topOf(segments.length - 1) + 1 : 0);
  const ranges = new Map<string, { start: number; end: number }>();
  for (const s of scope?.segments ?? []) {
    const r = ranges.get(s.segmentId);
    ranges.set(s.segmentId, r ? { start: Math.min(r.start, s.start), end: Math.max(r.end, s.end) } : { start: s.start, end: s.end });
  }
  const accepted: Accepted[] = [];
  const explicatie = (c: ProposedChange) => (typeof c.explicatie === "string" ? c.explicatie.trim() : "");

  /** Blocurile noi: valide, fără salturi de pagină consecutive; `gapBefore`/`gapAfter` = locul lor între blocurile existente. */
  const checkBlocks = (c: ProposedChange, label: string, gapBefore: number, gapAfter: number): ChatBlock[] | string => {
    const raw = c.blocuri;
    if (!Array.isArray(raw) || !raw.length) return `${label}: lipsesc blocurile noi („blocuri”).`;
    if (raw.length > BLOCK_LIMITS.blocks) return `${label}: prea multe blocuri (${raw.length}; maximum ${BLOCK_LIMITS.blocks}); împarte în mai multe modificări.`;
    const out: ChatBlock[] = [];
    for (const [i, b] of raw.entries()) {
      const r = checkBlock(b, `${label}, blocul ${i + 1}`);
      if (!r.ok) return r.error;
      if (r.block.tip === "salt_pagina" && out.at(-1)?.tip === "salt_pagina") return `${label}: două salturi de pagină consecutive (blocurile ${i} și ${i + 1}); păstrează unul.`;
      out.push(r.block);
    }
    if (out[0].tip === "salt_pagina") {
      if (gapBefore === 0) return `${label}: un salt de pagină la începutul documentului ar lăsa prima pagină goală.`;
      if (breaks.has(gapBefore - 1)) return `${label}: chiar înainte există deja un salt de pagină; nu adăuga încă unul.`;
    }
    if (out.at(-1)!.tip === "salt_pagina") {
      if (gapAfter >= blockCount) return `${label}: un salt de pagină la sfârșitul documentului ar lăsa o pagină goală; adaugă după el conținutul paginii noi.`;
      if (breaks.has(gapAfter)) return `${label}: chiar după există deja un salt de pagină; nu adăuga încă unul.`;
    }
    return out;
  };

  changes.forEach((c, i) => {
    const n = i + 1;
    const kind = (c.tip ?? "text") as ProposalKind;

    if (kind === "text" || kind === "formatare") {
      const segId = c.segment_id ?? "";
      const label = `Modificarea ${n} (${kind === "formatare" ? "formatare, " : ""}segmentul ${segId})`;
      const orig = c.text_original ?? "";
      const nou = c.text_nou ?? "";
      const at = index.get(segId);
      if (at === undefined) return errors.push(`${label}: segmentul nu există în document. Folosește id-ul din paranteza pătrată a paragrafului.`);
      const text = segments[at].text;
      if (!orig.trim()) return errors.push(`${label}: text_original e gol. Ca să adaugi text, include în text_original cuvintele vecine și repetă-le în text_nou (sau, pentru paragrafe noi, folosește tip „inserare”).`);
      if (orig.includes("\n")) return errors.push(`${label}: text_original traversează un rând nou din paragraf; propune modificări separate pentru fiecare rând.`);
      const stiluri: FormatStyles = {};
      if (kind === "text") {
        if (orig === nou) return errors.push(`${label}: text_nou e identic cu text_original; scoate modificarea.`);
        if (nou.includes("\n")) return errors.push(`${label}: text_nou nu poate conține rânduri sau paragrafe noi; pentru paragrafe noi folosește tip „inserare” sau „inlocuire_blocuri”.`);
        if (!parseInline(nou)) return errors.push(`${label}: marcajele „**” din text_nou nu sunt pereche; editorul nu afișează markdown, deci închide-le sau scoate-le.`);
        if (plainInline(nou) === orig) return errors.push(`${label}: text_nou schimbă doar formatarea; pentru aldin / cursiv / subliniat folosește tip „formatare” (text_original + stiluri), nu markdown.`);
        if (/^#{1,6}\s/.test(nou) && !/^#{1,6}\s/.test(orig)) return errors.push(`${label}: nu folosi „#” pentru titluri; un titlu nou este un bloc de tip „titlu” (inserare sau inlocuire_blocuri).`);
      } else {
        const raw = c.stiluri && typeof c.stiluri === "object" ? c.stiluri : {};
        const unknown = Object.keys(raw).filter((k) => !(FORMAT_STYLES as readonly string[]).includes(k));
        if (unknown.length) return errors.push(`${label}: stiluri necunoscute (${unknown.join(", ")}); folosește doar bold, italic, underline, strike.`);
        for (const k of FORMAT_STYLES) if (typeof raw[k] === "boolean") stiluri[k] = raw[k] as boolean;
        if (!Object.keys(stiluri).length) return errors.push(`${label}: lipsesc stilurile („stiluri”: de ex. {"bold": true}; false = scoate formatarea).`);
      }

      let found = occurrences(text, orig);
      if (!found.length) {
        const approx = loose(text).includes(loose(orig));
        return errors.push(
          approx
            ? `${label}: text_original nu se potrivește exact (diacritice, majuscule, ghilimele sau spații diferite). Copiază-l caracter cu caracter din segment.`
            : `${label}: text_original nu apare în segment. Copiază-l exact din textul segmentului.`,
        );
      }
      if (scope) {
        const r = ranges.get(segId);
        if (!r) return errors.push(`${label}: segmentul nu face parte din textul selectat. În această cerere poți modifica DOAR textul selectat.`);
        found = found.filter((x) => x >= r.start && x + orig.length <= r.end);
        if (!found.length) return errors.push(`${label}: pasajul nu este în întregime în textul selectat. Modifică doar textul dintre marcajele selecției.`);
      }
      if (found.length > 1) return errors.push(`${label}: text_original apare de ${found.length} ori${scope ? " în textul selectat" : " în segment"}; include câteva cuvinte din jur ca să fie unic.`);
      const start = found[0];
      const p: ChatProposal =
        kind === "text"
          ? { kind: "text", id: "", segmentId: segId, start, textOriginal: orig, textNou: nou, explicatie: explicatie(c), status: "propusa" }
          : { kind: "formatare", id: "", segmentId: segId, start, textOriginal: orig, stiluri, explicatie: explicatie(c), status: "propusa" };
      accepted.push({ n, p, order: [at, start], range: { start, end: start + orig.length } });
      return;
    }

    if (kind === "inserare") {
      const segId = c.segment_id ?? "";
      const label = `Modificarea ${n} (inserare lângă segmentul ${segId})`;
      const at = index.get(segId);
      if (at === undefined) return errors.push(`${label}: segmentul-ancoră nu există în document. Folosește id-ul din paranteza pătrată a paragrafului.`);
      const pozitie = c.pozitie ?? "dupa";
      if (pozitie !== "dupa" && pozitie !== "inainte") return errors.push(`${label}: pozitie trebuie să fie „dupa” sau „inainte”.`);
      if (scope && !ranges.has(segId)) return errors.push(`${label}: ancora nu face parte din textul selectat. Cu selecție, inserează doar lângă paragrafele selectate.`);
      const top = topOf(at);
      const gap = pozitie === "dupa" ? top + 1 : top;
      const blocuri = checkBlocks(c, label, gap, gap);
      if (typeof blocuri === "string") return errors.push(blocuri);
      // ordinea: înainte de primul segment al blocului ancoră sau după ultimul
      let first = at;
      let last = at;
      while (first > 0 && topOf(first - 1) === top) first--;
      while (last < segments.length - 1 && topOf(last + 1) === top) last++;
      accepted.push({
        n,
        p: { kind: "inserare", id: "", segmentId: segId, pozitie, blocuri, explicatie: explicatie(c), status: "propusa" },
        order: pozitie === "dupa" ? [last, Number.MAX_SAFE_INTEGER] : [first, -2],
        gap,
      });
      return;
    }

    if (kind === "inlocuire_blocuri" || kind === "stergere_blocuri") {
      const ids = Array.isArray(c.segmente) ? c.segmente.filter((x) => typeof x === "string") : [];
      const label = `Modificarea ${n} (${kind === "inlocuire_blocuri" ? "înlocuire" : "ștergere"} de blocuri${ids.length ? `, segmentele ${ids[0]}…${ids.at(-1)}` : ""})`;
      if (!ids.length) return errors.push(`${label}: lipsesc segmentele („segmente”: id-urile paragrafelor consecutive, în ordine).`);
      if (ids.length > MAX_REPLACED_SEGMENTS) return errors.push(`${label}: prea multe segmente (maximum ${MAX_REPLACED_SEGMENTS}).`);
      if (new Set(ids).size !== ids.length) return errors.push(`${label}: un segment apare de două ori în „segmente”.`);
      const missing = ids.filter((id) => !index.has(id));
      if (missing.length) return errors.push(`${label}: segmentele ${missing.join(", ")} nu există în document.`);
      const idx = ids.map((id) => index.get(id)!).sort((a, b) => a - b);
      for (let k = 1; k < idx.length; k++) {
        if (idx[k] !== idx[k - 1] + 1) return errors.push(`${label}: segmentele nu sunt consecutive (lipsește ${segments[idx[k - 1] + 1].id}); include toate paragrafele dintre primul și ultimul sau propune modificări separate.`);
      }
      const firstI = idx[0];
      const lastI = idx.at(-1)!;
      const extra: string[] = [];
      for (let k = firstI - 1; k >= 0 && topOf(k) === topOf(firstI); k--) extra.unshift(segments[k].id);
      for (let k = lastI + 1; k < segments.length && topOf(k) === topOf(lastI); k++) extra.push(segments[k].id);
      if (extra.length) return errors.push(`${label}: segmentele fac parte dintr-un tabel sau dintr-o listă care se înlocuiește întreg; include și ${extra.join(", ")} sau modifică textul celulelor / elementelor cu tip „text”.`);
      const orig = (c.text_original ?? "").trim();
      const firstText = segments[firstI].text.trimStart();
      if (!orig) return errors.push(`${label}: text_original lipsește; copiază exact începutul primului segment înlocuit (${segments[firstI].id}).`);
      if (!firstText.startsWith(orig)) {
        return errors.push(
          loose(firstText).startsWith(loose(orig))
            ? `${label}: text_original nu se potrivește exact cu începutul segmentului ${segments[firstI].id} (diacritice, ghilimele sau spații). Copiază-l caracter cu caracter.`
            : `${label}: text_original nu e începutul primului segment (${segments[firstI].id}: «${firstText.slice(0, 60)}»). Verifică segmentele alese.`,
        );
      }
      if (scope) {
        const outside = idx.filter((k) => !ranges.has(segments[k].id)).map((k) => segments[k].id);
        if (outside.length) return errors.push(`${label}: segmentele ${outside.join(", ")} nu fac parte din textul selectat. Cu selecție, înlocuiești sau ștergi doar paragrafele selectate.`);
      }
      const topFirst = topOf(firstI);
      const topLast = topOf(lastI);
      let blocuri: ChatBlock[] = [];
      if (kind === "inlocuire_blocuri") {
        const r = checkBlocks(c, label, topFirst, topLast + 1);
        if (typeof r === "string") return errors.push(r);
        if (r.every((b) => b.tip === "salt_pagina")) return errors.push(`${label}: înlocuirea ar șterge textul și ar pune doar un salt de pagină. Pentru un salt de pagină folosește „inserare”; ștergerea textului doar dacă utilizatorul a cerut-o („stergere_blocuri”).`);
        blocuri = r;
      } else {
        if (Array.isArray(c.blocuri) && c.blocuri.length) return errors.push(`${label}: o ștergere nu are blocuri noi; pentru a pune altceva în loc folosește „inlocuire_blocuri”.`);
        if (breaks.has(topFirst - 1) && breaks.has(topLast + 1)) return errors.push(`${label}: ștergerea ar lăsa două salturi de pagină consecutive; șterge și unul dintre ele sau păstrează un paragraf între ele.`);
      }
      const covers = idx.map((k) => segments[k].id);
      accepted.push({
        n,
        p: { kind, id: "", segmentId: covers[0], segmentIds: covers, textOriginal: idx.map((k) => segments[k].text), blocuri, explicatie: explicatie(c), status: "propusa" },
        order: [firstI, -1],
        covers,
      });
      return;
    }

    errors.push(`Modificarea ${n}: tip necunoscut („${String(c.tip)}”); folosește text, formatare, inserare, inlocuire_blocuri sau stergere_blocuri.`);
  });

  // ───── suprapuneri între propuneri ─────
  const textBySeg = new Map<string, Accepted[]>();
  for (const a of accepted) if (a.range) textBySeg.set(a.p.segmentId, [...(textBySeg.get(a.p.segmentId) ?? []), a]);
  for (const [seg, list] of textBySeg) {
    const sorted = [...list].sort((a, b) => a.range!.start - b.range!.start);
    for (let k = 1; k < sorted.length; k++) {
      if (sorted[k].range!.start < sorted[k - 1].range!.end) errors.push(`Modificările ${Math.min(sorted[k - 1].n, sorted[k].n)} și ${Math.max(sorted[k - 1].n, sorted[k].n)} se suprapun în segmentul ${seg}; combină-le într-o singură modificare.`);
    }
  }
  const coveredBy = new Map<string, number>();
  for (const a of accepted) {
    for (const id of a.covers ?? []) {
      const other = coveredBy.get(id);
      if (other !== undefined) {
        errors.push(`Modificările ${other} și ${a.n} înlocuiesc sau șterg aceleași paragrafe (${id}); combină-le într-o singură modificare.`);
        break;
      }
      coveredBy.set(id, a.n);
    }
  }
  for (const a of accepted) {
    if (a.covers) continue;
    const other = coveredBy.get(a.p.segmentId);
    if (other === undefined) continue;
    errors.push(
      a.gap !== undefined
        ? `Modificarea ${a.n} inserează lângă segmentul ${a.p.segmentId}, pe care modificarea ${other} îl înlocuiește sau îl șterge; pune blocurile noi în modificarea ${other}.`
        : `Modificarea ${a.n} schimbă ${a.p.kind === "formatare" ? "formatarea" : "textul"} segmentului ${a.p.segmentId}, pe care modificarea ${other} îl înlocuiește sau îl șterge; include schimbarea în blocurile modificării ${other}.`,
    );
  }
  const gaps = new Map<number, number>();
  for (const a of accepted) {
    if (a.gap === undefined) continue;
    const other = gaps.get(a.gap);
    if (other !== undefined) errors.push(`Modificările ${other} și ${a.n} inserează în același loc; combină blocurile într-o singură inserare.`);
    else gaps.set(a.gap, a.n);
  }

  if (errors.length) return { ok: false, errors };
  const sorted = [...accepted].sort((a, b) => a.order[0] - b.order[0] || a.order[1] - b.order[1] || a.n - b.n);
  return { ok: true, proposals: sorted.map((a, k) => ({ ...a.p, id: `m${k + 1}` })) };
}

/** Propunerile în ordinea din document (`order` = indicele fiecărui segment); cele fără segment, la final. */
export function sortProposals<T extends ChatProposal>(list: readonly T[], order: ReadonlyMap<string, number>): T[] {
  const key = (p: ChatProposal): [number, number] => {
    const at = order.get(p.segmentId) ?? Number.MAX_SAFE_INTEGER;
    if (p.kind === "inserare") return [at, p.pozitie === "inainte" ? -2 : Number.MAX_SAFE_INTEGER];
    return isPassageProposal(p) ? [at, p.start] : [at, -1];
  };
  return list
    .map((p, i) => ({ p, i, k: key(p) }))
    .sort((a, b) => a.k[0] - b.k[0] || a.k[1] - b.k[1] || a.i - b.i)
    .map((x) => x.p);
}

/**
 * Unde se aplică acum o propunere în textul paragrafului: la poziția din propunere dacă textul e
 * încă acolo, altfel la singura lui apariție. Null dacă pasajul s-a schimbat sau a devenit ambiguu.
 */
export function locateProposal(text: string, p: Pick<TextProposal, "start" | "textOriginal">): number | null {
  if (!p.textOriginal) return null;
  if (text.startsWith(p.textOriginal, p.start)) return p.start;
  const found = occurrences(text, p.textOriginal);
  return found.length === 1 ? found[0] : null;
}

/** Textul scurt al unei selecții pentru cip și pentru istoricul trimis agentului. */
export function scopePreview(scope: Pick<ChatScope, "text">, max = 60): string {
  const t = scope.text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}
