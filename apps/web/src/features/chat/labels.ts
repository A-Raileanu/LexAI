import { isPassageProposal, isTextProposal, type ChatBlock, type ChatProposal, type FormatStyles } from "@lexai/core/chat";

/** Textele cardurilor de modificări (docs/ux/18-chat-editor.md), fără React, ca să fie testabile. */

/** „1 modificare”, „5 modificări”, „20 de modificări”. */
export function count(n: number, one: string, many: string, oneWord?: string): string {
  if (n === 1) return oneWord ?? `1 ${one}`;
  return n % 100 >= 20 || n % 100 === 0 ? `${n} de ${many}` : `${n} ${many}`;
}

/** Antetul listei: „5 modificări propuse”. */
export const proposalsHeading = (n: number) => `${count(n, "modificare propusă", "modificări propuse")}`;

/**
 * Locul unei propuneri, ca în 08b: „Art. 3”, „După Art. 4”, „Înainte de § 2”, „Art. 9 – Art. 10”.
 * `locators` = locul fiecărui segment din documentul curent; null dacă segmentele nu mai există.
 */
export function proposalLocation(p: ChatProposal, locators: ReadonlyMap<string, string>): string | null {
  const at = locators.get(p.segmentId);
  if (isPassageProposal(p)) return at ?? null;
  if (p.kind === "inserare") return at ? `${p.pozitie === "inainte" ? "Înainte de" : "După"} ${at}` : null;
  const end = locators.get(p.segmentIds.at(-1) ?? "");
  if (!at) return end ?? null;
  return end && end !== at ? `${at} – ${end}` : at;
}

const BLOCK_WORDS: Record<ChatBlock["tip"], [string, string, string]> = {
  paragraf: ["un paragraf", "paragraf", "paragrafe"],
  titlu: ["un titlu", "titlu", "titluri"],
  lista: ["o listă", "listă", "liste"],
  tabel: ["un tabel", "tabel", "tabele"],
  salt_pagina: ["un salt de pagină", "salt de pagină", "salturi de pagină"],
};

/** „un tabel și un salt de pagină”, „2 paragrafe, un titlu și o listă”. */
export function blocksPhrase(blocks: readonly ChatBlock[]): string {
  const counts = new Map<ChatBlock["tip"], number>();
  for (const b of blocks) counts.set(b.tip, (counts.get(b.tip) ?? 0) + 1);
  const parts = [...counts].map(([tip, n]) => {
    const [oneWord, one, many] = BLOCK_WORDS[tip];
    return count(n, one, many, oneWord);
  });
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} și ${parts.at(-1)}` : (parts[0] ?? "");
}

const STYLE_WORDS: Record<keyof FormatStyles, [string, string]> = {
  bold: ["îngroșat", "fără îngroșare"],
  italic: ["cursiv", "fără cursiv"],
  underline: ["subliniat", "fără subliniere"],
  strike: ["tăiat", "fără tăiere"],
};

/** „Formatare: îngroșat, fără cursiv”. */
export function formatSummary(styles: FormatStyles): string {
  const words = (Object.keys(STYLE_WORDS) as (keyof FormatStyles)[]).filter((k) => styles[k] !== undefined).map((k) => STYLE_WORDS[k][styles[k] ? 0 : 1]);
  return `Formatare: ${words.join(", ")}`;
}

/** Rezumatul unei propuneri structurale sau de formatare: „Adaugă un paragraf”, „Înlocuiește 3 paragrafe cu un tabel”, „Formatare: îngroșat”. */
export function proposalSummary(p: ChatProposal): string | null {
  if (p.kind === "formatare") return formatSummary(p.stiluri);
  if (isTextProposal(p)) return null;
  if (p.kind === "inserare") return `Adaugă ${blocksPhrase(p.blocuri)}`;
  const n = count(p.segmentIds.length, "paragraf", "paragrafe", "un paragraf");
  if (p.kind === "stergere_blocuri") return `Șterge ${n}`;
  return `Înlocuiește ${n} cu ${blocksPhrase(p.blocuri)}`;
}

export const STALE: Record<ChatProposal["kind"] & string, string> = {
  text: "Textul din document s-a schimbat de la propunere. Cere din nou modificarea.",
  formatare: "Textul din document s-a schimbat de la propunere. Cere din nou modificarea.",
  inserare: "Paragraful lângă care se inserează nu mai există în document. Cere din nou modificarea.",
  inlocuire_blocuri: "Paragrafele vizate s-au schimbat de la propunere. Cere din nou modificarea.",
  stergere_blocuri: "Paragrafele vizate s-au schimbat de la propunere. Cere din nou modificarea.",
};
