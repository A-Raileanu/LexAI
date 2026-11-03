import {
  SourceError,
  type ActRef,
  type CautaActResult,
  type CautaInActResult,
  type CitesteArticolResult,
  type InfoActResult,
  type LegalSource,
  type SourceCallContext,
  type VersionRef,
} from "@lexai/sources";
import { fmtIsoDate as fmtDate, looseKey, normalizeArticleNumber } from "@lexai/sources/text";
import { PORTAL_SOURCE_ID, PortalClient, actUrl, isPortalUrl, resolveVersionAt, type PortalClientOptions } from "./client";
import { renderArticleText, type PortalArticle, type PortalSearchResult, type PortalVersion } from "./parse";

/**
 * Sursa „Portalul Legislativ”: căutarea actelor, fișa actului (forme, acțiuni), articolul în
 * forma aplicabilă la o dată și căutarea în textul actului. Logica și textele sunt cele ale
 * instrumentelor aplicației anterioare; aici întoarcem rezultate normalizate și dovezile de înregistrat.
 */

const MAX_VERSIONS_LISTED = 8;
const MAX_ARTICLE_ACTIONS = 25;

function toVersionRef(v: PortalVersion): VersionRef {
  return {
    id: v.id,
    data: v.data,
    tip: v.tip,
    eticheta: v.tip === "baza" ? "Forma de bază" : v.tip === "republicare" ? `${v.eticheta} (${fmtDate(v.data)})` : `Consolidare ${fmtDate(v.data)}`,
  };
}

/** Metadatele actelor găsite la căutare în această analiză: id formă de bază → rezultat. */
function actMeta(ctx: SourceCallContext): Map<number, PortalSearchResult> {
  let m = ctx.state.get("actMeta") as Map<number, PortalSearchResult> | undefined;
  if (!m) ctx.state.set("actMeta", (m = new Map()));
  return m;
}

function numericId(id: number | string): number {
  const n = typeof id === "number" ? id : Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new SourceError(`act_id invalid pentru Portalul Legislativ: ${id}`, { kind: "refuz", sourceId: PORTAL_SOURCE_ID });
  return n;
}

/** Articolul pentru model: doar alineatul cerut (cu literele și notele lui) plus notele de nivel articol. */
function articleForModel(art: PortalArticle, alineat: string | null): { text: string; alineatGasit: boolean | null } {
  let units = art.unitati;
  let alineatGasit: boolean | null = null;
  if (alineat) {
    const want = alineat.replace(/[^\d^a-z]/gi, "");
    const start = units.findIndex((u) => u.tip === "alineat" && u.eticheta.replace(/[^\d^a-z]/gi, "") === want);
    alineatGasit = start >= 0;
    if (start >= 0) {
      const next = units.findIndex((u, i) => i > start && u.tip === "alineat");
      const end = next < 0 ? units.length : next;
      units = units.filter((u, i) => (i >= start && i < end) || u.tip === "nota");
    }
  }
  return { text: renderArticleText({ eticheta: art.eticheta, denumire: art.denumire, unitati: units }), alineatGasit };
}

function articleSectionKey(numar: string): string {
  return `ART. ${numar}`.toUpperCase();
}

export function findArticle(articles: { numar: string }[], requested: string): { index: number; fuzzy: boolean } {
  const n = normalizeArticleNumber(requested);
  const exact = articles.findIndex((a) => a.numar === n);
  if (exact >= 0) return { index: exact, fuzzy: false };
  // superscript pierdut (ex. „61” în loc de „6^1”)
  const noCaret = articles.findIndex((a) => a.numar.replace("^", "") === n);
  if (noCaret >= 0 && /\^/.test(articles[noCaret].numar)) return { index: noCaret, fuzzy: true };
  return { index: -1, fuzzy: false };
}

export interface PortalSourceOptions extends PortalClientOptions {
  id?: string;
  label?: string;
  /** client existent (altfel creat din opțiuni) */
  client?: PortalClient;
}

export function createPortalLegislativSource(opts: PortalSourceOptions = {}): LegalSource {
  const id = opts.id ?? PORTAL_SOURCE_ID;
  const client = opts.client ?? new PortalClient({ ...opts, sourceId: id });

  async function actRef(ctx: SourceCallContext, baseId: number): Promise<{ ref: ActRef; baseDate: string | null }> {
    const meta = actMeta(ctx).get(baseId);
    if (meta) {
      const m = meta.eticheta.match(/^(.*?)\s+(\d+)\s+\d{2}\/\d{2}\/(\d{4})/);
      return {
        ref: { baseId, titlu: [meta.titlu, meta.descriere].filter(Boolean).join(" "), tip: m?.[1].trim(), numar: m?.[2], an: m?.[3] },
        baseDate: meta.intrareInVigoare,
      };
    }
    const { page } = await client.getActPage(baseId);
    return { ref: { baseId, titlu: page.denumire || page.titluScurt }, baseDate: null };
  }

  async function versionPage(ctx: SourceCallContext, baseId: number, date: string) {
    const { page: latest } = await client.getActPage(baseId);
    const { ref, baseDate } = await actRef(ctx, baseId);
    const resolved = resolveVersionAt(latest.versiuni, baseId, baseDate, date);
    const v = resolved.version;
    const vp = v.id === latest.versionId && !v.formaDeBaza ? await client.getActPage(baseId) : await client.getActPage(v.id, v.formaDeBaza);
    return { latest, ref, baseDate, resolved, vp };
  }

  return {
    id,
    label: opts.label ?? "Portalul Legislativ",
    description: "Portalul Legislativ (legislatie.just.ro)",
    capabilities: new Set(["cauta_act", "info_act", "citeste_articol", "cauta_in_act"] as const),
    trustsUrl: isPortalUrl,

    async cautaAct(p, ctx): Promise<CautaActResult> {
      const label = [p.tip, p.numar && `nr. ${p.numar}`, p.an && `/${p.an}`, p.titlu && `„${p.titlu}”`, p.text && `text „${p.text}”`]
        .filter(Boolean)
        .join(" ");
      ctx.activity?.(`Caut pe Portalul Legislativ: ${label}`);
      const r = await client.searchActs(p);
      const meta = actMeta(ctx);
      for (const x of r.rezultate) if (!meta.has(x.id)) meta.set(x.id, x);
      return {
        total: r.total,
        url: r.url,
        accesatLa: r.accesatLa,
        rezultate: r.rezultate.map((x) => ({
          actId: x.id,
          eticheta: x.eticheta,
          titlu: x.titlu,
          descriere: x.descriere,
          emitent: x.emitent,
          publicat: x.publicat,
          intrareInVigoare: x.intrareInVigoare,
          intrareInVigoareText: x.intrareInVigoareText,
          republicare: x.republicare,
        })),
        ...(r.rezultate.length === 0
          ? {
              dovada: {
                type: "act_negasit" as const,
                text: `Căutarea pe Portalul Legislativ nu a întors niciun act pentru criteriile: ${label}${r.tipRezolvat ? ` (tip: ${r.tipRezolvat})` : ""}.`,
                url: r.url,
                accesatLa: r.accesatLa,
              },
            }
          : {}),
      };
    },

    async infoAct(p, ctx): Promise<InfoActResult> {
      const baseId = numericId(p.actId);
      const { latest, ref, baseDate, resolved, vp } = await versionPage(ctx, baseId, p.data);
      ctx.activity?.(`Deschid fișa actului: ${ref.titlu}`);
      const actions = await client.getActions(baseId);
      const laNivelDeAct = actions.rows.filter((r) => /^actul$/i.test(r.sectiune));
      const pePuncte = actions.rows.filter((r) => !/^actul$/i.test(r.sectiune));
      const opCounts: Record<string, number> = {};
      for (const r of pePuncte) opCounts[r.operatiune] = (opCounts[r.operatiune] ?? 0) + 1;

      // doar formele relevante: baza, republicările, cele din jurul datei cerute și cea mai recentă
      const dated = resolved.toate.filter((v) => v.data).sort((a, b) => (a.data! < b.data! ? -1 : 1));
      const at = dated.findIndex((v) => v.id === resolved.version.id);
      const keep = dated.filter((v, i) => v.tip !== "consolidare" || Math.abs(i - at) <= 2 || i === dated.length - 1);
      const versiuni = (keep.length > MAX_VERSIONS_LISTED + 4 ? keep.slice(-MAX_VERSIONS_LISTED - 4) : keep).map(
        (v) => `${fmtDate(v.data)} – ${v.tip}${v.tip === "republicare" ? ` (${v.eticheta})` : ""} [id ${v.id}]`,
      );
      const omise = dated.length - versiuni.length;
      const versiune = toVersionRef(resolved.version);

      const fisa = [
        `Act: ${ref.titlu}`,
        `Denumire în portal: ${latest.denumire}`,
        `Emitent: ${latest.emitent || "—"}`,
        `Publicat în: ${latest.publicat || "—"}`,
        `Data intrării în vigoare (forma de bază): ${fmtDate(baseDate)}`,
        `Forma aplicabilă la ${fmtDate(p.data)}: ${versiune.eticheta} [id ${resolved.version.id}]${resolved.inainteDePrimaForma ? " — ATENȚIE: data cerută este anterioară primei forme cunoscute (posibil act neintrat încă în vigoare)" : ""}`,
        `Cea mai recentă formă: ${fmtDate(latest.versiuni.find((v) => v.curenta)?.data ?? null)} [id ${latest.versionId}]`,
        `Istoric forme: ${versiuni.join("; ") || "doar forma de bază"}${omise > 0 ? ` (+${omise} alte consolidări)` : ""}`,
        ...(vp.page.noteAct.length ? ["Note la nivel de act:", ...vp.page.noteAct.map((n) => `- ${n}`)] : []),
      ].join("\n");

      const actiuni = [
        `Acțiuni asupra actului (${ref.titlu}) conform Portalului Legislativ:`,
        ...(laNivelDeAct.length
          ? laNivelDeAct.map((r) => `- Actul: ${r.operatiune} ${r.actEticheta}${r.actId ? ` [act_id ${r.actId}]` : ""}`)
          : ["- Nu există acțiuni la nivelul întregului act (abrogare/suspendare totală)."]),
        `Acțiuni pe articole: ${Object.entries(opCounts).map(([k, v]) => `${k}: ${v}`).join(", ") || "niciuna"}`,
        ...pePuncte
          .filter((r) => /ABROGAT|SUSPENDAT|NECONSTITUTIONALITATE|REPUBLICAT/i.test(r.operatiune))
          .slice(0, MAX_ARTICLE_ACTIONS)
          .map((r) => `- ${r.sectiune}: ${r.operatiune} ${r.actEticheta}${r.actId ? ` [act_id ${r.actId}]` : ""}`),
      ].join("\n");

      return {
        act: ref,
        versiune,
        fisa: {
          type: "fisa_act",
          act: ref,
          versiune,
          text: fisa,
          url: actUrl(resolved.version.id, undefined, resolved.version.formaDeBaza),
          accesatLa: vp.accesatLa,
          dataReferinta: p.data,
          ultimaFormaId: latest.versionId,
        },
        actiuni: { type: "actiuni_act", act: ref, text: actiuni, url: actUrl(baseId), accesatLa: actions.accesatLa },
        nota: laNivelDeAct.some((r) => /ABROGAT/i.test(r.operatiune))
          ? "Actul figurează ca abrogat. Pentru data de la care produce efecte abrogarea, caută actul abrogator cu cauta_act (tip, număr, an) și verifică data intrării în vigoare."
          : undefined,
      };
    },

    async citesteArticol(p, ctx): Promise<CitesteArticolResult> {
      const baseId = numericId(p.actId);
      const { latest, ref, resolved, vp } = await versionPage(ctx, baseId, p.data);
      const vRef = toVersionRef(resolved.version);
      ctx.activity?.(`Citesc art. ${p.articol} din ${ref.titlu} (${vRef.eticheta})`);
      const arts = vp.page.articole;
      const found = findArticle(arts, p.articol);

      const actions = await client.getActions(baseId).catch(() => null);
      const key = articleSectionKey(normalizeArticleNumber(p.articol));
      const actiuniPeArticol = (actions?.rows ?? [])
        .filter((r) => r.sectiune.toUpperCase().replace(/\s+/g, " ") === key)
        .map((r) => `${r.operatiune} ${r.actEticheta}`);

      const header = [
        `Sursa: ${ref.titlu}`,
        `Forma: ${vRef.eticheta} [id ${vRef.id}] — aplicabilă la ${fmtDate(p.data)}`,
        resolved.inainteDePrimaForma ? "ATENȚIE: data cerută este anterioară primei forme cunoscute a actului." : "",
      ].filter(Boolean);

      if (found.index < 0) {
        // legea de aprobare a unui cod conține doar câteva articole; textul codului e un document separat
        const codeRe = /privind\s+(Codul\s+[\p{L} ]+?)\s*(?:$|,|\()/iu;
        const codeName = (ref.titlu.match(codeRe) ?? vp.page.denumire.match(codeRe))?.[1];
        if (codeName && arts.length < 50) {
          const codes = await client.searchActs({ tip: codeName }).catch(() => null);
          if (codes?.rezultate.length) {
            const meta = actMeta(ctx);
            for (const c of codes.rezultate) meta.set(c.id, c);
            return {
              gasit: false,
              redirect: {
                nota: `Actul ${ref.titlu} este legea de aprobare a ${codeName}; articolele codului se află într-un document separat pe portal. Reapelează citeste_articol cu act_id-ul codului (alege-l după data actului).`,
                coduri: codes.rezultate.map((c) => ({ actId: c.id, eticheta: c.eticheta, intrareInVigoare: c.intrareInVigoareText || null })),
              },
            };
          }
        }

        const n = normalizeArticleNumber(p.articol);
        const nums = arts.map((a) => a.numar);
        const near = nums.filter((x) => x.split("^")[0] === n.split("^")[0] || Math.abs(parseInt(x) - parseInt(n)) <= 2).slice(0, 12);
        const text = [
          ...header,
          `Articolul ${p.articol} NU există în această formă a actului.`,
          `Actul are ${arts.length} articole în această formă (primul: ${nums[0] ?? "—"}, ultimul: ${nums[nums.length - 1] ?? "—"}).`,
          `Articole apropiate: ${near.join(", ") || "—"}`,
        ].join("\n");
        return {
          gasit: false,
          text,
          actiuniPeArticol,
          dovada: {
            type: "articol_inexistent",
            act: ref,
            versiune: vRef,
            unitate: `art. ${p.articol}`,
            text,
            url: actUrl(resolved.version.id, undefined, resolved.version.formaDeBaza),
            accesatLa: vp.accesatLa,
            dataReferinta: p.data,
            ultimaFormaId: latest.versionId,
          },
        };
      }

      const art = arts[found.index];
      const scurt = articleForModel(art, p.alineat);
      return {
        gasit: true,
        abrogat: art.abrogat,
        potrivireAproximativa: found.fuzzy ? `Numărul cerut „${p.articol}” a fost asociat cu „${art.numar}” (indice superior pierdut).` : undefined,
        alineatNegasit: scurt.alineatGasit === false ? `Alineatul ${p.alineat} nu există; este redat tot articolul.` : undefined,
        text: [...header, "", scurt.text].join("\n"),
        actiuniPeArticol,
        dovada: {
          type: "text_articol",
          act: ref,
          versiune: vRef,
          unitate: `art. ${art.numar}`,
          text: [...header, "", art.text].join("\n"),
          url: actUrl(resolved.version.id, art.anchorId, resolved.version.formaDeBaza),
          accesatLa: vp.accesatLa,
          dataReferinta: p.data,
          ultimaFormaId: latest.versionId,
        },
      };
    },

    async cautaInAct(p, ctx): Promise<CautaInActResult> {
      const baseId = numericId(p.actId);
      const { latest, ref, resolved, vp } = await versionPage(ctx, baseId, p.data);
      const vRef = toVersionRef(resolved.version);
      ctx.activity?.(`Caut „${p.expresie}” în ${ref.titlu}`);
      // rădăcini tolerante la flexiune: „înregistrarea contractelor” găsește și „înregistrării contractului”
      const stem = (w: string) => (w.length >= 7 ? w.slice(0, Math.max(5, w.length - 4)) : w);
      const words = looseKey(p.expresie).split(" ").filter((w) => w.length > 2).map(stem);
      const unitHits = (t: string) => words.filter((w) => looseKey(t).includes(w)).length;
      const scored = vp.page.articole
        .map((a) => {
          const k = looseKey(a.text);
          const phrase = k.includes(looseKey(p.expresie));
          const hits = words.filter((w) => k.includes(w)).length;
          // pasajul (alineatul, litera) în care apar cele mai multe cuvinte căutate
          const best = a.unitati.reduce<{ u: (typeof a.unitati)[number] | null; n: number }>(
            (acc, u) => {
              const n = unitHits(u.text);
              return n > acc.n ? { u, n } : acc;
            },
            { u: null, n: 0 },
          );
          const together = best.n === words.length && words.length > 1 ? 10 : 0;
          return { a, best: best.u, score: (phrase ? 100 : 0) + together + hits };
        })
        .filter((x) => x.score >= Math.max(1, Math.ceil(words.length * 0.7)))
        .sort((x, y) => y.score - x.score)
        .slice(0, 4);

      const common = { act: ref, versiune: vRef, accesatLa: vp.accesatLa, dataReferinta: p.data, ultimaFormaId: latest.versionId };
      if (scored.length === 0) {
        return {
          forma: vRef.eticheta,
          rezultate: [],
          dovada: {
            ...common,
            type: "cautare_in_act",
            text: `Expresia „${p.expresie}” nu a fost găsită în ${ref.titlu}, ${vRef.eticheta}.`,
            url: actUrl(resolved.version.id, undefined, resolved.version.formaDeBaza),
          },
        };
      }
      return {
        forma: vRef.eticheta,
        rezultate: scored.map(({ a, best }) => {
          const scurt = articleForModel(a, null).text;
          return {
            articol: a.numar,
            ...(best ? { pasaj: `${best.eticheta ? `${best.eticheta} ` : ""}${best.text}` } : {}),
            text: scurt.length > 1500 ? scurt.slice(0, 1500) + " […prescurtat; citește articolul complet cu citeste_articol]" : scurt,
            dovada: {
              ...common,
              type: "text_articol" as const,
              unitate: `art. ${a.numar}`,
              text: [`Sursa: ${ref.titlu}`, `Forma: ${vRef.eticheta} [id ${vRef.id}]`, "", a.text].join("\n"),
              url: actUrl(resolved.version.id, a.anchorId, resolved.version.formaDeBaza),
            },
          };
        }),
      };
    },
  };
}
