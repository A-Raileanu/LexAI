import type { LegalReference } from "../types";
import { groupKey } from "./identify";

/**
 * Pregătirea surselor înainte de agent: pentru citările explicite, cu act identificat
 * fără echivoc, serverul caută actul (prin instrumentele surselor active: cauta_act, info_act,
 * citeste_articol), citește fișa și articolul în forma aplicabilă
 * (și azi, dacă data de referință diferă). Agentul primește totul într-o singură cerere
 * și folosește instrumentele doar pentru ambiguități și trimiteri implicite.
 */

/** Apel memoizat al unui instrument (același apel nu se repetă în grup). */
export type ToolCaller = (name: string, input: Record<string, unknown>) => Promise<{ content: string; isError?: boolean }>;

/** Codurile au pe portal un document separat de legea de aprobare. */
export const CODE_DOCS: Record<string, string> = {
  "lege|287|2009": "codul civil",
  "lege|53|2003": "codul muncii",
  "lege|134|2010": "codul de procedură civilă",
  "lege|135|2010": "codul de procedură penală",
  "lege|286|2009": "codul penal",
  "lege|227|2015": "codul fiscal",
  "lege|207|2015": "codul de procedură fiscală",
};

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** „art. 11 alin. (1) lit. b)” → { articol: "11", alineat: "1" } */
export function parseUnit(text: string | null | undefined): { articol: string; alineat: string | null } | null {
  if (!text) return null;
  const m = text.match(/\bart(?:icolul|\.)?\s*((?:\d{1,3}\.)?\d+(?:\s*\^\s*\d+|[⁰¹²³⁴⁵⁶⁷⁸⁹]+|\s*ind(?:ice|\.)?\s*\d+)?)/i);
  if (!m) return null;
  const articol = m[1]
    .replace(/\s*ind(?:ice|\.)?\s*(\d+)/i, "^$1")
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (s) => "^" + [...s].map((c) => SUPERSCRIPT.indexOf(c)).join(""))
    .replace(/\s+/g, "");
  const alin = text.slice((m.index ?? 0) + m[0].length).match(/^\s*,?\s*alin(?:eatul|\.)?\s*\(?(\d+)\)?/i);
  return { articol, alineat: alin ? alin[1] : null };
}

interface SearchHit {
  act_id: number | string;
  eticheta: string;
}

function parseHits(content: string): SearchHit[] {
  try {
    return (JSON.parse(content).rezultate ?? []) as SearchHit[];
  } catch {
    return [];
  }
}

/** Identifică actul fără echivoc sau întoarce null (agentul se ocupă de ambiguitate). */
async function resolveAct(ref: LegalReference, call: ToolCaller): Promise<{ actId: number | string; nota?: string } | { ambiguu: string }> {
  const key = groupKey(ref);
  // „Cod nr. 287/2009” sau „Codul civil (Legea nr. 287/2009)” → documentul codului
  const [, nr, an] = key.split("|");
  const isCode = /cod/i.test(`${ref.act?.tip ?? ""} ${ref.act?.denumire ?? ""}`);
  const code = CODE_DOCS[key] ?? (isCode && nr && an ? CODE_DOCS[`lege|${nr}|${an}`] : undefined);
  if (code) {
    const year = an;
    const hits = parseHits((await call("cauta_act", { tip: code, numar: null, an: null, titlu: null, text: null, in_vigoare_la: null })).content);
    const match = hits.filter((h) => h.eticheta.includes(year)).sort((a, b) => Number(/\(R\)/.test(a.eticheta)) - Number(/\(R\)/.test(b.eticheta)));
    return match[0] ? { actId: match[0].act_id, nota: `documentul codului (${match[0].eticheta})` } : { ambiguu: `documentul ${code} din ${year} nu a fost găsit` };
  }
  const a = ref.act;
  if (!a?.numar || !a.an) return { ambiguu: "actul nu are număr și an în document" };
  const hits = parseHits((await call("cauta_act", { tip: a.tip, numar: a.numar.replace(/\D/g, ""), an: a.an, titlu: null, text: null, in_vigoare_la: null })).content);
  if (hits.length === 1) return { actId: hits[0].act_id };
  return { ambiguu: hits.length ? `${hits.length} acte găsite pentru ${a.tip ?? "act"} nr. ${a.numar}/${a.an}` : `niciun act găsit pentru ${a.tip ?? "act"} nr. ${a.numar}/${a.an}` };
}

/** Textul blocului <surse_pregatite> pentru grup (gol dacă nu s-a putut pregăti nimic). */
export async function prefetchSources(refs: LegalReference[], dataReferinta: string, dataAzi: string, call: ToolCaller): Promise<string> {
  const explicit = refs.filter((r) => r.tip === "explicita" && r.act);
  if (!explicit.length) return "";

  const byAct = new Map<string, LegalReference[]>();
  for (const r of explicit) byAct.set(groupKey(r), [...(byAct.get(groupKey(r)) ?? []), r]);

  const dates = dataAzi === dataReferinta ? [dataReferinta] : [dataReferinta, dataAzi];
  // actele în paralel; în cadrul unui act, fișa și articolele tot în paralel (ordinea textului se păstrează)
  const parts = await Promise.all(
    [...byAct.values()].map(async (group) => {
      const ids = group.map((r) => r.id).join(", ");
      const act = await resolveAct(group[0], call);
      if ("ambiguu" in act) return `## ${ids}: identificare automată nereușită (${act.ambiguu}) — identifică actul cu instrumentele.`;

      const units = new Set<string>();
      for (const r of group) {
        const u = parseUnit(r.unitate) ?? parseUnit(r.citat);
        if (u) units.add(u.articol);
      }
      // fișa (forme, abrogări, decizii CCR): o dată dacă se citesc articole (ele poartă datele),
      // la fiecare dată dacă trimiterea privește actul întreg (ex. „aflat în vigoare”)
      const sheetDates = units.size ? [dataReferinta] : dates;
      const reads: [string, Promise<{ content: string }>][] = [
        ...sheetDates.map(
          (d) => [`### info_act (data ${d})`, call("info_act", { act_id: act.actId, data: d })] as [string, Promise<{ content: string }>],
        ),
        ...[...units].flatMap((articol) =>
          dates.map(
            (d) =>
              [`### citeste_articol art. ${articol} (data ${d})`, call("citeste_articol", { act_id: act.actId, articol, alineat: null, data: d })] as [
                string,
                Promise<{ content: string }>,
              ],
          ),
        ),
      ];
      const done = await Promise.all(reads.map(async ([title, p]) => `${title}\n${(await p).content}`));
      return [`## Act identificat automat pentru ${ids}: act_id ${act.actId}${act.nota ? ` — ${act.nota}` : ""}`, ...done].join("\n");
    }),
  );
  return parts.join("\n\n");
}
