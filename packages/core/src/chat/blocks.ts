import { newSegId } from "../document/segments";
import type { DocMark, DocNode } from "../document/types";

/**
 * Blocurile noi (paragrafe, titluri, liste, tabele, salturi de pagină), în formatul compact primit de
 * la agent: în chatul din editor și în proiectele generate. Codul le validează și le transformă în
 * JSON Tiptap (contractul din docs/arhitectura/document-json.md); agentul nu scrie niciodată HTML
 * sau JSON Tiptap. Formatare inline: **aldin**, *cursiv* și câmpurile de completat „[● indicație]”.
 * Listele pot fi numerotate cu cifre („1.”) sau cu litere („a)”, ca enumerările din acte) și pot
 * avea subliste; paragrafele și titlurile pot avea aliniere proprie.
 */

export type Alignment = "stanga" | "centru" | "dreapta" | "justificat";

export interface ListBlock {
  tip: "lista";
  numerotata: boolean;
  /** numerotare cu litere: „a)”, „b)” (doar pentru listele numerotate) */
  litere?: boolean;
  elemente: ListItem[];
}

/** Un element de listă: text sau text urmat de o sublistă. */
export type ListItem = string | { text: string; sublista: ListBlock };

export type ChatBlock =
  | { tip: "paragraf"; text: string; aliniere?: Alignment }
  | { tip: "titlu"; nivel: 1 | 2 | 3 | 4; text: string; aliniere?: Alignment }
  | ListBlock
  | { tip: "tabel"; antet: string[]; randuri: string[][] }
  | { tip: "salt_pagina" };

/** Un bloc așa cum îl trimite agentul (câmpurile depind de `tip`). */
export interface AgentBlock {
  tip: string;
  text?: string;
  nivel?: number;
  aliniere?: string;
  numerotata?: boolean;
  /** listele numerotate: „cifre” (implicit) sau „litere” */
  stil?: string;
  /** text sau {"text": "…", "sublista": {"numerotata": …, "stil": …, "elemente": […]}} */
  elemente?: unknown[];
  antet?: string[];
  randuri?: string[][];
}

export const BLOCK_LIMITS = { blocks: 60, text: 4_000, listItems: 100, listDepth: 3, tableCols: 12, tableRows: 200, cell: 1_000 } as const;

const ALIGNMENTS: Record<Alignment, string> = { stanga: "left", centru: "center", dreapta: "right", justificat: "justify" };

/** Textul unui element de listă (fără sublistă). */
export const itemText = (item: ListItem) => (typeof item === "string" ? item : item.text);

/** Câte elemente are lista, cu tot cu sublistele. */
export function countItems(list: ListBlock): number {
  return list.elemente.reduce((n, e) => n + 1 + (typeof e === "string" ? 0 : countItems(e.sublista)), 0);
}

/** Textul simplu al unui bloc (paragrafele, elementele listelor, celulele), pe rânduri. */
export function blockPlainText(b: ChatBlock): string {
  const list = (l: ListBlock): string[] => l.elemente.flatMap((e) => [plainInline(itemText(e)), ...(typeof e === "string" ? [] : list(e.sublista))]);
  switch (b.tip) {
    case "paragraf":
    case "titlu":
      return plainInline(b.text);
    case "lista":
      return list(b).join("\n");
    case "tabel":
      return [b.antet, ...b.randuri].map((r) => r.map(plainInline).join(" | ")).join("\n");
    case "salt_pagina":
      return "";
  }
}

/** O bucată de text cu formatarea ei. */
export interface InlineRun {
  text: string;
  bold: boolean;
  italic: boolean;
}

/**
 * Formatarea inline din textul nou (de la agent): `**aldin**` și `*cursiv*`. Un `*` singur care nu
 * deschide sau nu închide o pereche (ex. „art. 5*”, „2 * 3”) rămâne literal. Null dacă `**` nu e
 * pereche (marcaj neînchis): textul nu ajunge niciodată în document cu `**`.
 */
export function parseInline(text: string): InlineRun[] | null {
  const tokens = text.split(/(\*\*|\*)/);
  const runs: InlineRun[] = [];
  let bold = false;
  let italic = false;
  const push = (t: string) => {
    if (!t) return;
    const last = runs.at(-1);
    if (last && last.bold === bold && last.italic === italic) last.text += t;
    else runs.push({ text: t, bold, italic });
  };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "**") {
      bold = !bold;
      continue;
    }
    if (t === "*") {
      const prev = tokens[i - 1] ?? "";
      const next = tokens[i + 1] ?? "";
      if (italic && /\S$/.test(prev)) {
        italic = false;
        continue;
      }
      // deschide doar dacă urmează text lipit și există un „*” de închidere după un caracter nevid
      if (!italic && /^\S/.test(next)) {
        let closes = false;
        for (let k = i + 2; k < tokens.length; k++) {
          if (tokens[k] === "*" && /\S$/.test(tokens[k - 1] ?? "")) {
            closes = true;
            break;
          }
        }
        if (closes) {
          italic = true;
          continue;
        }
      }
      push("*");
      continue;
    }
    push(t);
  }
  return bold ? null : runs;
}

/** Textul simplu (fără marcajele de formatare). */
export const plainInline = (text: string) => (parseInline(text) ?? [{ text }]).map((r) => r.text).join("");

/** Textul are formatare inline (aldin / cursiv). */
export const hasInlineFormat = (text: string) => (parseInline(text) ?? []).some((r) => r.bold || r.italic);

type BlockCheck = { ok: true; block: ChatBlock } | { ok: false; error: string };

function checkText(raw: unknown, what: string, max: number, allowEmpty = false): string | { error: string } {
  if (typeof raw !== "string") return { error: `${what}: lipsește textul.` };
  const t = raw.trim();
  if (!t && !allowEmpty) return { error: `${what}: textul e gol; scoate blocul sau completează-l.` };
  if (/[\r\n]/.test(t)) return { error: `${what}: textul nu poate conține rânduri noi; folosește blocuri (paragrafe, elemente de listă) separate.` };
  if (t.length > max) return { error: `${what}: textul e prea lung (${t.length} caractere; maximum ${max}).` };
  if (!parseInline(t)) return { error: `${what}: marcajele „**” pentru aldin nu sunt pereche (închide-le sau scoate-le).` };
  if (/<\/?[a-z][^>]*>/i.test(t)) return { error: `${what}: nu folosi HTML; scrie text simplu (doar **aldin**).` };
  return t;
}

/**
 * Un paragraf care începe ca un element de listă scris de mână („a) ”, „(b) ”, „- ”, „• ”): enumerarea
 * trebuie să fie o listă reală, ca editorul să o numeroteze și să o poată reorganiza.
 */
export function manualListMarker(text: string): string | null {
  const m = text.match(/^\s*(\([a-z]\)|[a-z]\)|[-•–])\s+/);
  return m ? m[1] : null;
}

const manualListError = (marker: string) =>
  `începe cu „${marker}”, ca un element de listă scris de mână; pune enumerarea într-un bloc „lista” (${/[a-z]/.test(marker) ? "numerotata: true, stil: „litere”" : "cu buline"}), fără marcaje în text.`;

function checkAlignment(raw: unknown): Alignment | undefined | { error: string } {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw === "string" && raw in ALIGNMENTS) return raw as Alignment;
  return { error: `alinierea trebuie să fie „stanga”, „centru”, „dreapta” sau „justificat” (nu „${String(raw)}”).` };
}

type ListCheck = { ok: true; list: ListBlock; items: number } | { ok: false; error: string };

function checkList(raw: { numerotata?: unknown; stil?: unknown; elemente?: unknown }, where: string, depth: number): ListCheck {
  const fail = (error: string): ListCheck => ({ ok: false, error });
  const items = raw.elemente;
  if (!Array.isArray(items) || !items.length) return fail(`${where}: lista nu are elemente.`);
  if (depth > BLOCK_LIMITS.listDepth) return fail(`${where}: prea multe niveluri de subliste (maximum ${BLOCK_LIMITS.listDepth}).`);
  if (raw.stil !== undefined && raw.stil !== null && raw.stil !== "cifre" && raw.stil !== "litere") return fail(`${where}: stilul listei trebuie să fie „cifre” sau „litere”.`);
  const numerotata = Boolean(raw.numerotata) || raw.stil === "litere";
  const litere = numerotata && raw.stil === "litere";
  // marcajele scrise de mână dispar: lista își pune singură numerele, literele sau bulinele
  const strip = (t: string) => t.replace(/^\s*(?:[-•*–]|\d+[.)]|\(?[a-z]\))\s+/, "");
  const out: ListItem[] = [];
  let count = 0;
  for (const [i, it] of items.entries()) {
    const label = `${where}, elementul ${i + 1}`;
    if (it && typeof it === "object" && !Array.isArray(it)) {
      const o = it as { text?: unknown; sublista?: unknown };
      const t = checkText(o.text, label, BLOCK_LIMITS.text);
      if (typeof t !== "string") return fail(t.error);
      if (!o.sublista || typeof o.sublista !== "object") return fail(`${label}: un element-obiect are nevoie de „sublista” (altfel scrie elementul ca text).`);
      const sub = checkList(o.sublista as Record<string, unknown>, `${label}, sublista`, depth + 1);
      if (!sub.ok) return sub;
      out.push({ text: strip(t), sublista: sub.list });
      count += 1 + sub.items;
    } else {
      const t = checkText(it, label, BLOCK_LIMITS.text);
      if (typeof t !== "string") return fail(t.error);
      out.push(strip(t));
      count += 1;
    }
  }
  if (count > BLOCK_LIMITS.listItems) return fail(`${where}: lista are prea multe elemente (maximum ${BLOCK_LIMITS.listItems}).`);
  return { ok: true, list: { tip: "lista", numerotata, ...(litere ? { litere: true } : {}), elemente: out }, items: count };
}

/** Verifică un bloc de la agent și îl aduce la forma canonică. */
export function checkBlock(b: AgentBlock, label: string): BlockCheck {
  const fail = (error: string): BlockCheck => ({ ok: false, error: `${label}: ${error}` });
  switch (b?.tip) {
    case "paragraf":
    case "titlu": {
      const t = checkText(b.text, b.tip, BLOCK_LIMITS.text);
      if (typeof t !== "string") return fail(t.error);
      const aliniere = checkAlignment(b.aliniere);
      if (aliniere && typeof aliniere === "object") return fail(aliniere.error);
      const align = aliniere ? { aliniere } : {};
      if (b.tip === "paragraf" && /^\s*\|.*\|\s*$/.test(t)) return fail("pare un tabel scris ca text; folosește blocul de tip „tabel”.");
      if (b.tip === "paragraf" && /^#{1,6}\s/.test(t)) return fail("pare un titlu markdown; folosește blocul de tip „titlu”.");
      const marker = b.tip === "paragraf" ? manualListMarker(t) : null;
      if (marker) return fail(`paragraful ${manualListError(marker)}`);
      if (b.tip === "paragraf") return { ok: true, block: { tip: "paragraf", text: t, ...align } };
      const nivel = b.nivel ?? 2;
      if (![1, 2, 3, 4].includes(nivel)) return fail("nivelul titlului trebuie să fie 1, 2, 3 sau 4.");
      return { ok: true, block: { tip: "titlu", nivel: nivel as 1 | 2 | 3 | 4, text: t, ...align } };
    }
    case "lista": {
      const r = checkList(b, "lista", 1);
      return r.ok ? { ok: true, block: r.list } : fail(r.error);
    }
    case "tabel": {
      const head = b.antet ?? [];
      const rows = b.randuri;
      if (!Array.isArray(head) || !Array.isArray(rows)) return fail("tabelul are nevoie de „antet” (listă, poate fi goală) și „randuri” (listă de rânduri).");
      if (!rows.length) return fail("tabelul nu are rânduri.");
      if (rows.length > BLOCK_LIMITS.tableRows) return fail(`tabelul are prea multe rânduri (${rows.length}; maximum ${BLOCK_LIMITS.tableRows}).`);
      const cols = head.length || (Array.isArray(rows[0]) ? rows[0].length : 0);
      if (!cols) return fail("tabelul nu are coloane.");
      if (cols > BLOCK_LIMITS.tableCols) return fail(`tabelul are prea multe coloane (${cols}; maximum ${BLOCK_LIMITS.tableCols}).`);
      const cell = (v: unknown, where: string): string | { error: string } => checkText(v, where, BLOCK_LIMITS.cell, true);
      const antet: string[] = [];
      for (const [i, h] of head.entries()) {
        const t = cell(h, `antetul coloanei ${i + 1}`);
        if (typeof t !== "string") return fail(t.error);
        antet.push(t);
      }
      const randuri: string[][] = [];
      for (const [r, row] of rows.entries()) {
        if (!Array.isArray(row) || row.length !== cols) return fail(`rândul ${r + 1} are ${Array.isArray(row) ? row.length : 0} celule, dar tabelul are ${cols} coloane; toate rândurile trebuie să aibă același număr de celule.`);
        const out: string[] = [];
        for (const [c, v] of row.entries()) {
          const t = cell(v, `celula ${r + 1}×${c + 1}`);
          if (typeof t !== "string") return fail(t.error);
          out.push(t);
        }
        randuri.push(out);
      }
      if (![...antet, ...randuri.flat()].some((t) => t)) return fail("tabelul e gol.");
      return { ok: true, block: { tip: "tabel", antet, randuri } };
    }
    case "salt_pagina":
      return { ok: true, block: { tip: "salt_pagina" } };
    default:
      return fail(`tip de bloc necunoscut („${String(b?.tip)}”); folosește paragraf, titlu, lista, tabel sau salt_pagina.`);
  }
}

// ───────────────────────── JSON Tiptap ─────────────────────────

export interface BlockStyle {
  /** atributele de paragraf moștenite (aliniere, indentare, spațiere) — doar pe paragrafele simple */
  paragraph?: Record<string, unknown>;
  /** fontul moștenit (`textStyle`: fontFamily, fontSize) — pe tot textul nou */
  textStyle?: Record<string, unknown> | null;
}

const PLACEHOLDER = /\[●\s*([^\]]*)\]/g;

function inline(text: string, style: BlockStyle): DocNode[] {
  const base: DocMark[] = style.textStyle && Object.values(style.textStyle).some((v) => v !== null && v !== undefined) ? [{ type: "textStyle", attrs: { ...style.textStyle } }] : [];
  const out: DocNode[] = [];
  for (const p of parseInline(text) ?? [{ text: plainInline(text), bold: false, italic: false }]) {
    const marks: DocMark[] = [...(p.bold ? [{ type: "bold" }] : []), ...(p.italic ? [{ type: "italic" }] : []), ...base];
    const push = (t: string, extra: DocMark[] = []) => {
      if (!t) return;
      const all = [...extra, ...marks];
      out.push(all.length ? { type: "text", text: t, marks: all } : { type: "text", text: t });
    };
    // câmpurile „[● indicație]” devin câmpuri de completat, ca în proiectele generate
    let last = 0;
    for (const m of p.text.matchAll(PLACEHOLDER)) {
      push(p.text.slice(last, m.index));
      push(m[0], [{ type: "placeholder", attrs: { hint: m[1].trim() } }]);
      last = m.index! + m[0].length;
    }
    push(p.text.slice(last));
  }
  return out;
}

const para = (text: string, used: Set<string>, style: BlockStyle, attrs: Record<string, unknown> = {}): DocNode => {
  const content = inline(text, style);
  return { type: "paragraph", attrs: { ...attrs, segId: newSegId(used) }, ...(content.length ? { content } : {}) };
};

/**
 * Blocurile în JSON Tiptap: fiecare paragraf / titlu (inclusiv din liste și celule) primește un
 * `segId` nou, diferit de cele din `used` (care se completează).
 */
export function blocksToNodes(blocks: readonly ChatBlock[], used: Set<string>, style: BlockStyle = {}): DocNode[] {
  const list = (l: ListBlock): DocNode => ({
    type: l.numerotata ? "orderedList" : "bulletList",
    ...(l.numerotata ? { attrs: { start: 1, type: l.litere ? "a" : null } } : {}),
    content: l.elemente.map((e) => ({ type: "listItem", content: [para(itemText(e), used, style), ...(typeof e === "string" ? [] : [list(e.sublista)])] })),
  });
  return blocks.map((b): DocNode => {
    switch (b.tip) {
      case "paragraf":
        return para(b.text, used, style, { ...style.paragraph, ...(b.aliniere ? { textAlign: ALIGNMENTS[b.aliniere] } : {}) });
      case "titlu": {
        // titlul își păstrează mărimea din stil; moștenește doar fontul
        const family = style.textStyle?.fontFamily;
        const content = inline(b.text, { textStyle: family ? { fontFamily: family } : null });
        return { type: "heading", attrs: { level: b.nivel, segId: newSegId(used), ...(b.aliniere ? { textAlign: ALIGNMENTS[b.aliniere] } : {}) }, content };
      }
      case "lista":
        return list(b);
      case "tabel": {
        const cell = (type: "tableCell" | "tableHeader", text: string): DocNode => ({ type, attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [para(text, used, style)] });
        const rows: DocNode[] = [];
        if (b.antet.length) rows.push({ type: "tableRow", content: b.antet.map((h) => cell("tableHeader", h)) });
        for (const r of b.randuri) rows.push({ type: "tableRow", content: r.map((v) => cell("tableCell", v)) });
        return { type: "table", content: rows };
      }
      case "salt_pagina":
        return { type: "pageBreak" };
    }
  });
}

/** O descriere scurtă a blocurilor (istoricul trimis agentului, titluri accesibile). */
export function describeBlocks(blocks: readonly ChatBlock[], max = 80): string {
  const clip = (s: string) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);
  return blocks
    .map((b) => {
      switch (b.tip) {
        case "paragraf":
          return `paragraf «${clip(plainInline(b.text))}»`;
        case "titlu":
          return `titlu «${clip(plainInline(b.text))}»`;
        case "lista":
          return `listă ${b.litere ? "cu litere " : b.numerotata ? "numerotată " : ""}cu ${countItems(b)} elemente`;
        case "tabel":
          return `tabel ${b.antet.length || b.randuri[0]?.length || 0} coloane × ${b.randuri.length} rânduri${b.antet.length ? ` (antet: ${clip(b.antet.map(plainInline).join(" | "))})` : ""}`;
        case "salt_pagina":
          return "salt de pagină";
      }
    })
    .join("; ");
}

// ───────────────────────── schema pentru agent ─────────────────────────

const STR = { type: "string" } as const;
const STRINGS = { type: "array", items: STR } as const;

/** Lista, pentru schema JSON a instrumentelor (folosită și în subliste). */
const LIST_PROPS = {
  numerotata: { type: "boolean", description: "lista: numerotată (true) sau cu buline (false)" },
  stil: { type: "string", enum: ["cifre", "litere"], description: "lista numerotată: „cifre” (1., 2.) sau „litere” (a), b) — enumerările din acte)" },
  elemente: {
    type: "array",
    description: "lista: elementele, fără marcaje („a)”, „1.”, „-”) în text; un element cu sublistă: {\"text\": \"…\", \"sublista\": {\"numerotata\": …, \"stil\": …, \"elemente\": […]}}",
    items: {
      anyOf: [
        STR,
        {
          type: "object",
          additionalProperties: false,
          required: ["text", "sublista"],
          properties: {
            text: STR,
            sublista: { type: "object", required: ["elemente"], properties: { numerotata: { type: "boolean" }, stil: { type: "string", enum: ["cifre", "litere"] }, elemente: { type: "array" } } },
          },
        },
      ],
    },
  },
} as const;

/** Schema JSON a unui bloc, pentru instrumentele agentului (chat și redactare). */
export const BLOCK_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["tip"],
  properties: {
    tip: { type: "string", enum: ["paragraf", "titlu", "lista", "tabel", "salt_pagina"] },
    text: { ...STR, description: "paragraf / titlu: textul, fără rânduri noi; **aldin**, *cursiv*, „[● indicație]”" },
    nivel: { type: "integer", minimum: 1, maximum: 4, description: "titlu: nivelul (1–4)" },
    aliniere: { type: "string", enum: ["stanga", "centru", "dreapta", "justificat"], description: "paragraf / titlu: alinierea, doar când diferă de restul documentului" },
    ...LIST_PROPS,
    antet: { ...STRINGS, description: "tabel: capetele de coloană ([] = fără antet)" },
    randuri: { type: "array", items: STRINGS, description: "tabel: rândurile, fiecare cu același număr de celule" },
  },
} as const;
