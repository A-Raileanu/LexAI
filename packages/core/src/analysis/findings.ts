import { locateQuote } from "../text/locate";
import { looseKey } from "../text/normalize";
import type { Anchor, AnalysisResult, Coverage, DocSegment, Finding, LegalReference, ParsedDocument, SourceVersionUsed, Suggestion, UnverifiedReason, VerdictStatus } from "../types";

/**
 * Funcții pure despre constatări, folosite și pe server și în browser
 * (salvarea progresului și reluarea verificărilor incomplete).
 */

export function anchorsFor(ref: LegalReference, segments: DocSegment[]): Anchor[] {
  const seg = segments.find((s) => s.id === ref.segment_id);
  if (seg) {
    const loc = locateQuote(seg.text, ref.citat);
    if (loc.potrivire !== "negasita") return [{ segmentId: seg.id, ...loc }];
  }
  // citatul poate depăși limita segmentului: încearcă segmentele vecine
  const idx = segments.findIndex((s) => s.id === ref.segment_id);
  for (const j of [idx + 1, idx - 1]) {
    const s = segments[j];
    if (!s) continue;
    const loc = locateQuote(s.text, ref.citat);
    if (loc.potrivire !== "negasita") return [{ segmentId: s.id, ...loc }];
  }
  return [{ segmentId: ref.segment_id, start: 0, end: 0, potrivire: "negasita" }];
}

export function unverifiedFinding(ref: LegalReference, segments: DocSegment[], data: string, motiv: string, tip: UnverifiedReason): Finding {
  return {
    id: `F-${ref.id}`,
    referenceId: ref.id,
    citat: ref.citat,
    anchors: anchorsFor(ref, segments),
    tipTrimitere: ref.tip,
    afirmatie: ref.afirmatie,
    unitate: ref.unitate ?? undefined,
    status: "neverificat",
    titlu: "Trimitere neverificată",
    explicatie: motiv,
    verdictLaData: { status: "neverificat", data, rezumat: motiv },
    motivNeverificare: motiv,
    tipNeverificare: tip,
    sugestii: [],
    dovezi: [],
  };
}

/** Constatarea pentru un duplicat: același verdict, ancorat la propria apariție. */
export function copyForDuplicate(f: Finding, d: LegalReference, segments: DocSegment[]): Finding {
  return {
    ...f,
    id: `F-${d.id}`,
    referenceId: d.id,
    citat: d.citat,
    afirmatie: d.afirmatie,
    tipTrimitere: d.tip,
    anchors: anchorsFor(d, segments),
    preluatDin: f.id,
  };
}

/** Trimiterile care trebuie (re)verificate la o reluare: fără rezultat sau oprite de o limită. */
export function pendingReferences(result: Pick<AnalysisResult, "findings" | "trimiteri">): LegalReference[] {
  const set = result.trimiteri;
  if (!set) return [];
  const byRef = new Map(result.findings.map((f) => [f.referenceId, f]));
  // duplicatele primesc rezultatul trimiterii canonice, nu se verifică separat
  const dupIds = new Set(set.duplicates.flatMap(([, ds]) => ds));
  return set.references.filter((r) => {
    if (dupIds.has(r.id)) return false;
    const f = byRef.get(r.id);
    return !f || f.tipNeverificare === "limita_atinsa";
  });
}

/** Câmpurile acoperirii care derivă din constatări. */
type FindingCoverage = Pick<
  Coverage,
  "trimiteriGasite" | "explicite" | "implicite" | "verificateCuSursa" | "verificateCuWeb" | "corecte" | "eroriConfirmate" | "interpretariDiscutabile" | "analizaUmana" | "neverificate" | "citateNelocalizate"
>;

function findingCoverage(findings: readonly Finding[]): FindingCoverage {
  const by = (s: Finding["status"]) => findings.filter((f) => f.status === s).length;
  return {
    trimiteriGasite: findings.length,
    explicite: findings.filter((f) => f.tipTrimitere === "explicita").length,
    implicite: findings.filter((f) => f.tipTrimitere === "implicita").length,
    verificateCuSursa: findings.filter((f) => f.status !== "neverificat" && f.dovezi.some((d) => d.validare === "confirmata")).length,
    verificateCuWeb: findings.filter(
      (f) => f.status !== "neverificat" && f.dovezi.some((d) => d.validare === "confirmata" && d.evidence.type === "sursa_web"),
    ).length,
    corecte: by("corect"),
    eroriConfirmate: by("eroare_citare"),
    interpretariDiscutabile: by("interpretare_discutabila"),
    analizaUmana: by("necesita_analiza_umana"),
    neverificate: by("neverificat"),
    citateNelocalizate: findings.filter((f) => f.anchors.every((a) => a.potrivire === "negasita")).length,
  };
}

export function computeCoverage(doc: Pick<ParsedDocument, "segments" | "unreadablePages">, findings: Finding[]): Coverage {
  const c = findingCoverage(findings);
  return {
    trimiteriGasite: c.trimiteriGasite,
    explicite: c.explicite,
    implicite: c.implicite,
    verificateCuSursa: c.verificateCuSursa,
    verificateCuWeb: c.verificateCuWeb,
    corecte: c.corecte,
    eroriConfirmate: c.eroriConfirmate,
    interpretariDiscutabile: c.interpretariDiscutabile,
    analizaUmana: c.analizaUmana,
    neverificate: c.neverificate,
    segmenteTotal: doc.segments.length,
    segmenteOcr: doc.segments.filter((s) => s.quality !== "ok").length,
    segmenteOcrNesigur: doc.segments.filter((s) => s.quality === "ocr_nesigur").length,
    paginiNecitite: doc.unreadablePages,
    citateNelocalizate: c.citateNelocalizate,
  };
}

export function sourcesUsed(findings: Finding[]): SourceVersionUsed[] {
  const map = new Map<string, SourceVersionUsed>();
  for (const f of findings) {
    for (const d of f.dovezi) {
      const e = d.evidence;
      if (d.validare !== "confirmata" || !e.act || !e.versiune) continue;
      const k = `${e.sourceId ?? ""}:${e.act.baseId}:${e.versiune.id}`;
      if (!map.has(k)) {
        map.set(k, { act: e.act, versiune: e.versiune, sourceId: e.sourceId, url: e.url.replace(/#.*$/, ""), accesatLa: e.accesatLa, ultimaFormaId: e.ultimaFormaId });
      }
    }
  }
  return [...map.values()];
}

// ───────────────────────── Sugestii: forma veche și cea nouă ─────────────────────────

/**
 * Variantele de sugestie ale unei constatări. Rezultatele salvate înainte de variante au doar
 * `sugestie`; cele noi au `sugestii` (și `sugestie` = prima, pentru compatibilitate).
 */
export function suggestionsOf(f: Pick<Finding, "sugestii" | "sugestie">): Suggestion[] {
  const list = Array.isArray(f.sugestii) && f.sugestii.length ? f.sugestii : f.sugestie ? [f.sugestie] : [];
  return list.map((s) => (Array.isArray(s.impact) ? s : { ...s, impact: [] }));
}

/**
 * Eticheta situației în care se aplică o variantă de sugestie: `situatie` dată de agent sau,
 * când sunt mai multe variante fără etichetă, „Varianta n”. O singură variantă: fără etichetă (null).
 */
export function suggestionSituation(s: Pick<Suggestion, "situatie">, index: number, count: number): string | null {
  if (s.situatie?.trim()) return s.situatie.trim();
  return count > 1 ? `Varianta ${index + 1}` : null;
}

/** O constatare în forma curentă: `sugestii` completat, `sugestie` = prima variantă. Idempotentă. */
export function normalizeFinding(f: Finding): Finding {
  const sugestii = suggestionsOf(f);
  const out: Finding = { ...f, sugestii };
  if (sugestii.length) out.sugestie = sugestii[0];
  else delete out.sugestie;
  return out;
}

/** Un rezultat salvat, în forma curentă (citirea din baza de date, exporturi, reluări). */
export function normalizeResult<T extends Pick<AnalysisResult, "findings">>(r: T): T {
  return { ...r, findings: (r.findings ?? []).map(normalizeFinding) };
}

// ───────────────────────── Constatări ignorate ─────────────────────────

/** Ce trebuie știut despre o constatare pentru semnătură (și pentru numărări din JSON-ul salvat). */
export interface SignatureSource {
  citat: string;
  categorie?: string | null;
}

const SIGNATURE_SEP = "\u241f";

/**
 * Semnătura stabilă a unei constatări, independentă de id-ul ei (`F-T3` se schimbă la fiecare
 * analiză): citatul din document normalizat (`looseKey`, fără punctuația finală) și categoria.
 * O ignorare înregistrată cu semnătura se aplică și constatărilor echivalente din analizele
 * ulterioare ale aceluiași document (analiză nouă, reverificare, reluare).
 */
export function findingSignature(f: SignatureSource): string {
  // doar pasajul citat: modelul poate încadra aceeași problemă în altă categorie la o nouă
  // analiză, iar o problemă ignorată trebuie să rămână ignorată
  return looseKey(f.citat ?? "").replace(/[\s.,;:]+$/, "");
}

/** Semnătura salvată (inclusiv formatul vechi „citat␟categorie”) în forma curentă. */
export function canonicalSignature(sig: string): string {
  return sig.split(SIGNATURE_SEP)[0];
}

/** Semnăturile constatărilor ignorate ale unui document. */
export type IgnoredSignatures = ReadonlySet<string>;

export const isIgnored = (f: SignatureSource, ignored: IgnoredSignatures | null | undefined): boolean => Boolean(ignored?.size) && ignored!.has(findingSignature(f));

/** Constatările vizibile și cele ignorate (în ordinea primită). */
export function partitionIgnored<T extends SignatureSource>(findings: readonly T[], ignored: IgnoredSignatures | null | undefined): { visible: T[]; ignored: T[] } {
  const visible: T[] = [];
  const hidden: T[] = [];
  for (const f of findings) (isIgnored(f, ignored) ? hidden : visible).push(f);
  return { visible, ignored: hidden };
}

export type StatusCounts = Record<VerdictStatus, number>;

/**
 * Numărul de constatări pe stare, fără cele ignorate. Folosit de insigne, alertele proiectelor
 * și panoul de rezultate: o constatare ignorată nu mai este o problemă nicăieri.
 */
export function countVisibleByStatus(findings: readonly (SignatureSource & { status: string })[], ignored?: IgnoredSignatures | null): StatusCounts {
  const c: StatusCounts = { eroare_citare: 0, interpretare_discutabila: 0, necesita_analiza_umana: 0, neverificat: 0, corect: 0 };
  for (const f of findings) {
    if (isIgnored(f, ignored)) continue;
    if (f.status in c) c[f.status as VerdictStatus]++;
    else c.neverificat++;
  }
  return c;
}

/**
 * Rezultatul fără constatările ignorate (raportul PDF, exporturi): lista filtrată, acoperirea
 * recalculată pentru constatările rămase și numărul celor scoase.
 */
export function withoutIgnored(r: AnalysisResult, ignored: IgnoredSignatures | null | undefined): { result: AnalysisResult; ignorate: number } {
  const { visible, ignored: hidden } = partitionIgnored(normalizeResult(r).findings, ignored);
  if (!hidden.length) return { result: { ...r, findings: visible }, ignorate: 0 };
  return { result: { ...r, findings: visible, coverage: { ...r.coverage, ...findingCoverage(visible) } }, ignorate: hidden.length };
}
