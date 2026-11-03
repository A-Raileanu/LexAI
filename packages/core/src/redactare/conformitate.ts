import { z } from "zod";
import { validateEvidence, type EvidenceStore, type TrustPolicy } from "../analysis/evidence";
import { looseKey } from "../text/normalize";
import type { Evidence, FindingEvidence } from "../types";
import { EVIDENCE_LABELS, fmtDate } from "../labels";

/**
 * Redactarea unui document conform legii: fiecare clauză care se sprijină pe o normă,
 * fiecare cerință obligatorie și fiecare limită legală are un temei cu fragment exact din
 * textul oficial, validat de cod (nu de model), în forma legii de la data documentului.
 * Rezultatul e nota de conformitate care însoțește proiectul.
 */

export const TemeiSchema = z.object({
  id: z.string().min(1),
  tip: z.enum(["temei", "cerinta", "limita"]).default("temei"),
  /** unde în proiect: „Art. 4 alin. (2)”, „Clauza 7.1” */
  clauza: z.string().nullish(),
  /** textul clauzei, copiat exact din proiect */
  text_clauza: z.string().nullish(),
  /** norma: „art. 2.158 alin. (1) din Codul civil” */
  norma: z.string().min(1),
  stare: z.enum(["respectat", "de_completat", "de_verificat"]).default("respectat"),
  explicatie: z.string().min(1),
  dovezi: z.array(z.object({ id_dovada: z.string().optional(), evidence_id: z.string().optional(), fragment: z.string() })).default([]),
});
export type Temei = z.infer<typeof TemeiSchema>;

export const ConformitateSchema = z.object({
  document: z.string().min(1),
  temeiuri: z.array(TemeiSchema).min(1),
});

export interface TemeiValidat {
  temei: Temei;
  dovezi: FindingEvidence[];
  erori: string[];
}

export interface Conformitate {
  document: string;
  dataReferinta: string;
  verificatLa: string;
  proiect: string | null;
  temeiuri: TemeiValidat[];
  /** paragrafe ale proiectului care invocă acte fără un temei verificat din acele acte */
  neacoperite: { paragraf: string; acte: string[] }[];
  /** locurile de completat din proiect („[●…]”) */
  deCompletat: string[];
}

export const TIP_TEMEI_LABELS: Record<Temei["tip"], string> = { temei: "Temei", cerinta: "Cerință legală", limita: "Limită legală" };
export const STARE_LABELS: Record<Temei["stare"], string> = {
  respectat: "Respectat",
  de_completat: "De completat (lipsesc informații)",
  de_verificat: "De verificat de un jurist",
};

/** Dovezile care depind de forma actului la o dată. */
const DATED: Evidence["type"][] = ["text_articol", "cautare_in_act", "fisa_act", "articol_inexistent", "actiuni_act"];

/** Legile de aprobare ale codurilor: „Legea nr. 287/2009” și „Codul civil” sunt același act. */
const CODE_LAWS: Record<string, string> = {
  "287/2009": "cod:civil",
  "53/2003": "cod:muncii",
  "134/2010": "cod:de procedura civila",
  "135/2010": "cod:de procedura penala",
  "286/2009": "cod:penal",
  "227/2015": "cod:fiscal",
  "207/2015": "cod:de procedura fiscala",
};
const CODE_NAMES = "civil|penal|muncii|fiscal|de procedura civila|de procedura penala|de procedura fiscala|administrativ|silvic|vamal|aerian|educatiei|insolventei|controlului";
const ABBREV: [RegExp, string][] = [
  [/\b(c\.?\s?proc\.?\s?civ|c\.?\s?pr\.?\s?civ|ncpc|cpc)\b/, "cod:de procedura civila"],
  [/\b(c\.?\s?proc\.?\s?pen|c\.?\s?pr\.?\s?pen|ncpp|cpp)\b/, "cod:de procedura penala"],
  [/\b(c\.?\s?proc\.?\s?fisc|c\.?\s?pr\.?\s?fisc)\b/, "cod:de procedura fiscala"],
  [/\b(c\.\s?civ|cod\.?\s?civ|ncc)\b/, "cod:civil"],
  [/\b(c\.\s?pen)\b/, "cod:penal"],
  [/\b(c\.\s?muncii)\b/, "cod:muncii"],
  [/\b(c\.\s?fisc(al)?)\b/, "cod:fiscal"],
];

const canonical = (key: string) => CODE_LAWS[key] ?? key;

/**
 * Actele normative externe invocate într-un paragraf, ca chei comparabile: „31/1990”,
 * „cod:civil”, „constitutie”. Trimiterile interne ale proiectului („Art. 3. Obiectul”,
 * „art. 5 din prezentul contract”) nu contează.
 */
export function acteCitate(paragraf: string): string[] {
  const p = looseKey(paragraf).replace(/\b(prezentul|prezentei|prezentului|prezenta)\s+\w+/g, " ");
  const keys = new Set<string>();
  for (const m of p.matchAll(new RegExp(`\\b(?:codul|codului|codurile)\\s+(${CODE_NAMES})\\b`, "g"))) keys.add(`cod:${m[1]}`);
  for (const [re, key] of ABBREV) if (re.test(p)) keys.add(key);
  if (/\bconstitutia\b|\bconstitutiei\b/.test(p)) keys.add("constitutie");
  const acts =
    /\b(?:legea|legii|legile|o\.?u\.?g\.?|ordonanta|ordonantei|o\.?g\.?|h\.?g\.?|hotararea|hotararii|regulamentul|regulamentului|directiva|directivei|decizia|deciziei|ordinul|ordinului)\b[^\n]{0,40}?\b(?:nr\.?\s*)?(?:\((?:ue|ce)\)\s*(?:nr\.?\s*)?)?(\d[\d.]*)\s*\/\s*(\d{2,4})/g;
  for (const m of p.matchAll(acts)) keys.add(canonical(`${m[1].replace(/\./g, "")}/${m[2]}`));
  return [...keys];
}

/** @deprecated folosit de teste: un paragraf invocă legea dacă citează cel puțin un act extern */
export function invocaLegea(paragraf: string): boolean {
  return acteCitate(paragraf).length > 0;
}

/** Actul din care provine o dovadă, ca cheie comparabilă cu `acteCitate`. */
function actKey(e: Evidence): string | null {
  const t = e.act?.titlu ? looseKey(e.act.titlu.replace(/\*+/g, "")) : "";
  if (!t) return null;
  const cod = t.match(new RegExp(`^codul\\s+(${CODE_NAMES})\\b`));
  if (cod) return `cod:${cod[1]}`;
  if (/^constitutia/.test(t)) return "constitutie";
  if (e.act?.numar && e.act.an) return canonical(`${e.act.numar.replace(/\D/g, "")}/${e.act.an}`);
  const m = t.match(/nr\.?\s*(\d+)\s+din\s+\d{1,2}\s+\w+\s+(\d{4})/);
  return m ? canonical(`${m[1]}/${m[2]}`) : null;
}

export function etichetaAct(key: string): string {
  if (key.startsWith("cod:")) return `Codul ${key.slice(4)}`;
  if (key === "constitutie") return "Constituția";
  return `actul nr. ${key}`;
}

export function validateTemeiuri(
  input: z.infer<typeof ConformitateSchema>,
  store: EvidenceStore,
  dataReferinta: string,
  proiect: { fisier: string; paragrafe: string[] } | null,
  /** ce dovezi sunt acceptate ca oficiale (ex. `trustFrom(registry)`); implicit: doar adrese https */
  trusts?: TrustPolicy,
): Conformitate {
  const proiectKey = proiect ? looseKey(proiect.paragrafe.join("\n")) : "";
  const temeiuri = input.temeiuri.map((t): TemeiValidat => {
    const erori: string[] = [];
    const dovezi: FindingEvidence[] = [];
    for (const d of t.dovezi) {
      const id = d.id_dovada ?? d.evidence_id ?? "";
      const r = validateEvidence(store, id, d.fragment, trusts);
      if ("error" in r) erori.push(r.error);
      else {
        dovezi.push(r);
        if (r.validare === "respinsa") erori.push(`Dovada ${id}: ${r.motivRespingere}`);
      }
    }
    const ok = dovezi.filter((d) => d.validare === "confirmata");
    if (!ok.length) erori.push("Niciun fragment confirmat din textul oficial: citește norma (citeste_articol) și copiază fragmentul exact.");
    for (const d of ok) {
      const at = d.evidence.dataReferinta;
      if (at && DATED.includes(d.evidence.type) && at !== dataReferinta) {
        erori.push(`Dovada ${d.evidence.id} e citită în forma de la ${at}, nu la data documentului (${dataReferinta}): recitește norma pentru data ${dataReferinta}.`);
      }
    }
    if (proiect) {
      if (t.text_clauza?.trim()) {
        if (!proiectKey.includes(looseKey(t.text_clauza))) erori.push("text_clauza nu apare în proiect: copiază-l exact din proiect.");
      } else if (t.stare === "respectat" && t.tip === "temei") {
        erori.push("Pentru un temei „respectat”, completează text_clauza cu textul din proiect care îl aplică.");
      }
    }
    return { temei: t, dovezi, erori };
  });

  // fiecare act citat într-un paragraf trebuie acoperit de un temei din acel paragraf,
  // a cărui dovadă confirmată provine chiar din actul citat
  const acoperiri = temeiuri
    .filter((t) => !t.erori.length && t.temei.text_clauza)
    .map((t) => {
      const ok = t.dovezi.filter((d) => d.validare === "confirmata");
      const acte = new Set(ok.map((d) => actKey(d.evidence)).filter((k): k is string => !!k));
      // sursele fără act pe portal (EUR-Lex, HUDOC, ccr.ro): actul se ia din „norma”
      if (ok.some((d) => !d.evidence.act)) for (const k of acteCitate(t.temei.norma)) acte.add(k);
      return { clauza: looseKey(t.temei.text_clauza!), acte };
    });
  const neacoperite: Conformitate["neacoperite"] = [];
  for (const p of proiect?.paragrafe ?? []) {
    const citate = acteCitate(p);
    if (!citate.length) continue;
    const k = looseKey(p);
    const aici = acoperiri.filter((a) => k.includes(a.clauza) || a.clauza.includes(k));
    const lipsa = citate.filter((c) => !aici.some((a) => a.acte.has(c)));
    if (lipsa.length) neacoperite.push({ paragraf: p, acte: lipsa.map(etichetaAct) });
  }
  const deCompletat = [...new Set((proiect?.paragrafe ?? []).flatMap((p) => p.match(/\[●[^\]]*\]/g) ?? []))];

  return { document: input.document, dataReferinta, verificatLa: new Date().toISOString(), proiect: proiect?.fisier ?? null, temeiuri, neacoperite, deCompletat };
}

function sursa(d: FindingEvidence): string {
  const e = d.evidence;
  const nume = [e.act?.titlu, e.unitate].filter(Boolean).join(", ").replace(/\*+/g, "") || EVIDENCE_LABELS[e.type];
  const forma = e.versiune?.data ? ` (forma din ${fmtDate(e.versiune.data)})` : "";
  return `[${nume}${forma}](${e.url})`;
}

export function renderNotaConformitate(c: Conformitate, generatDe: string): string {
  const valide = c.temeiuri.filter((t) => !t.erori.length);
  const count = (s: Temei["stare"]) => valide.filter((t) => t.temei.stare === s).length;
  const out: string[] = [
    `# Notă de conformitate — ${c.document}`,
    "",
    `Legea a fost citită în forma aplicabilă la **${fmtDate(c.dataReferinta)}**. Verificare automată a dovezilor: ${fmtDate(c.verificatLa.slice(0, 10))}. Generat de ${generatDe}.`,
    "",
    "## Rezumat",
    "",
    `- Temeiuri și cerințe verificate cu textul oficial: ${valide.length} din ${c.temeiuri.length}`,
    `- Respectate: ${count("respectat")} · de completat: ${count("de_completat")} · de verificat de un jurist: ${count("de_verificat")}`,
    ...(c.proiect ? [`- Trimiteri din proiect fără temei verificat: ${c.neacoperite.length}`, `- Locuri de completat în proiect: ${c.deCompletat.length}`] : []),
    "",
    "## Temeiuri și cerințe",
    "",
  ];
  for (const t of c.temeiuri) {
    const x = t.temei;
    out.push(`### ${x.id} · ${x.norma} — ${t.erori.length ? "nevalidat" : STARE_LABELS[x.stare]}`, "");
    out.push(`${TIP_TEMEI_LABELS[x.tip]}${x.clauza ? ` · în proiect: ${x.clauza}` : ""}`, "");
    if (x.text_clauza) out.push(`> ${x.text_clauza}`, "");
    out.push(x.explicatie, "");
    const ok = t.dovezi.filter((d) => d.validare === "confirmata");
    if (ok.length) {
      out.push("Textul oficial:", "");
      for (const d of ok) out.push(`- „${d.fragment}” — ${sursa(d)}`);
      out.push("");
    }
    if (t.erori.length) out.push(`Nevalidat: ${t.erori.join(" ")}`, "");
  }
  const deFacut = valide.filter((t) => t.temei.stare !== "respectat");
  if (deFacut.length) {
    out.push("## De completat sau de verificat", "");
    for (const t of deFacut) out.push(`- **${t.temei.id}** (${STARE_LABELS[t.temei.stare]}): ${t.temei.explicatie}`);
    out.push("");
  }
  if (c.deCompletat.length) {
    out.push("## Locuri de completat în proiect", "");
    for (const x of c.deCompletat) out.push(`- ${x}`);
    out.push("");
  }
  if (c.neacoperite.length) {
    out.push("## Trimiteri din proiect fără temei verificat", "");
    for (const n of c.neacoperite) out.push(`- ${n.acte.join(", ")}: ${n.paragraf.length > 300 ? `${n.paragraf.slice(0, 300)}…` : n.paragraf}`);
    out.push("");
  }
  out.push(
    "---",
    "",
    "Nota arată pe ce texte oficiale se sprijină proiectul, la data indicată. Nu constituie consultanță juridică. Proiectul trebuie revizuit de un jurist înainte de semnare, iar legislația se poate modifica după data verificării.",
  );
  return out.join("\n");
}
