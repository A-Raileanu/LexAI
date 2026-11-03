import { FEL_DECIZIE_LABELS, SourceError, urlInDomains, type CautaDeciziiResult, type CitesteDecizieResult, type DecizieGasita, type LegalSource } from "@lexai/sources";
import { looseKey } from "@lexai/sources/text";
import { CODE_LAWS, JURISPRUDENTA_HOSTS, JURISPRUDENTA_SOURCE_ID, JurisprudentaClient, passages, type JurisprudentaClientOptions } from "./decizii";

/**
 * Sursa „Jurisprudență CCR și ÎCCJ”: deciziile CCR și ÎCCJ (HP, RIL) publicate în Monitorul
 * Oficial (căutate pe Portalul Legislativ) și jurisprudența ÎCCJ de pe scj.ro.
 */

/** pagini de rezultate citite pe portal la o căutare a agentului (10 decizii pe pagină) */
const MAX_PAGES = 20;

export interface JurisprudentaSourceOptions extends JurisprudentaClientOptions {
  id?: string;
  label?: string;
  client?: JurisprudentaClient;
}

export function createJurisprudentaSource(opts: JurisprudentaSourceOptions = {}): LegalSource {
  const id = opts.id ?? JURISPRUDENTA_SOURCE_ID;
  const client = opts.client ?? new JurisprudentaClient({ ...opts, sourceId: id });

  return {
    id,
    label: opts.label ?? "Jurisprudență CCR și ÎCCJ",
    description: "deciziile CCR și ÎCCJ (Portalul Legislativ, scj.ro)",
    capabilities: new Set(["cauta_decizii", "citeste_decizie"] as const),
    trustsUrl: (url) => urlInDomains(url, JURISPRUDENTA_HOSTS),

    async cautaDecizii(p, ctx): Promise<CautaDeciziiResult> {
      let numar = p.numar?.replace(/\D/g, "") || null;
      let an = p.an?.trim() || null;
      let cod = p.cod?.trim() || null;
      // codurile: legea de aprobare ↔ numele codului
      if (!cod && numar && an) cod = CODE_LAWS[`${numar}/${an}`] ?? null;
      if (cod && !numar) {
        const hit = Object.entries(CODE_LAWS).find(([, name]) => name === looseKey(cod!).replace(/^cod\s/, "codul "));
        if (hit) [numar, an] = hit[0].split("/");
      }
      const actLabel = cod ?? (numar && an ? `nr. ${numar}/${an}` : null);
      const expresie = p.expresie?.trim() || (p.instanta === "iccj" && actLabel ? `${p.articol ? `art. ${p.articol} ` : ""}${actLabel}` : null);
      if (!actLabel && !expresie) {
        throw new SourceError("Indicați actul (număr și an, sau numele codului) sau o expresie de căutat.", { sourceId: id, kind: "refuz" });
      }

      const rezultate: DecizieGasita[] = [];
      let total: number | null = null;
      let complet = true;
      let url = "";
      let accesatLa = "";
      const note: string[] = [];
      if (actLabel) {
        ctx.activity?.(`Caut decizii CCR și ÎCCJ pentru ${actLabel}${p.articol ? `, art. ${p.articol}` : ""}`);
        const r = await client.searchDecisions({ numar, an, cod, articol: p.articol, instanta: p.instanta, maxPagini: MAX_PAGES });
        rezultate.push(...r.rezultate);
        total = r.totalPortal;
        complet = r.complet;
        url = r.urlCautare;
        accesatLa = r.accesatLa;
        if (!r.complet) note.push(`Au fost citite primele ${r.paginiCitite} pagini de rezultate; restrânge căutarea cu „articol” sau „instanta”.`);
      }
      if (expresie && p.instanta !== "ccr") {
        ctx.activity?.(`Caut în jurisprudența ÎCCJ (scj.ro): „${expresie}”`);
        try {
          const r = await client.searchScj(expresie);
          const known = new Set(rezultate.map((d) => d.id));
          rezultate.push(...r.rezultate.filter((d) => !known.has(d.id)));
          url ||= r.urlCautare;
          accesatLa ||= r.accesatLa;
        } catch (e) {
          if (!actLabel) throw e;
          note.push(`Căutarea pe scj.ro nu a reușit: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
      if (!rezultate.length) note.push("Nicio decizie găsită. Încearcă fără „articol” sau cu o „expresie” pentru scj.ro.");
      return { rezultate, total, complet, url, accesatLa, nota: note.join(" ") || undefined };
    },

    async citesteDecizie(p, ctx): Promise<CitesteDecizieResult> {
      const d = await client.readDecision(p.id);
      ctx.activity?.(`Citesc ${d.titlu}`);
      const { text, accesatLa, ...decizie } = d;
      return {
        decizie,
        pasaje: p.expresie ? passages(text, p.expresie) : [],
        dovada: { type: "decizie", unitate: `${d.titlu} (${FEL_DECIZIE_LABELS[d.fel]})`, text, url: d.url, accesatLa },
      };
    },
  };
}
