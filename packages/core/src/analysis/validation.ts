import { locateQuote } from "../text/locate";
import { looseKey } from "../text/normalize";
import type { DocSegment, Finding, FindingEvidence, LegalReference, Suggestion, UnverifiedReason, Verdict, VerdictStatus } from "../types";
import { validateEvidence, type EvidenceStore, type TrustPolicy } from "./evidence";
import { anchorsFor } from "./findings";
import { suggestionInputs, type ReportInput, type SuggestionInput } from "./tools";

/**
 * Validarea constatărilor de către cod (nu de model): dovezi existente, fragmente
 * regăsite în sursă, cerințe pe fiecare tip de verdict.
 */

export interface ValidationContext {
  segments: DocSegment[];
  dataReferinta: string;
  dataAzi: string;
  store: EvidenceStore;
  /** ce dovezi sunt acceptate ca oficiale (implicit: doar adrese https) */
  trusts?: TrustPolicy;
}

// ───────────────────────── Validarea constatărilor ─────────────────────────

const FIRM: VerdictStatus[] = ["corect", "eroare_citare"];

interface Validation {
  /** probleme cu dovezile sau verdictul (după reîncercări: verdictul e retrogradat) */
  errors: string[];
  /** probleme cu sugestiile (după reîncercări: se păstrează doar cele valide, fără retrogradare) */
  suggestionErrors: string[];
  dovezi: FindingEvidence[];
}

/** Stările pentru care o sugestie este obligatorie. */
const NEEDS_SUGGESTION: VerdictStatus[] = ["eroare_citare", "interpretare_discutabila"];

const sameText = (a: string, b: string) => looseKey(a).replace(/[\s.,;:]+$/, "") === looseKey(b).replace(/[\s.,;:]+$/, "");

/**
 * Verifică sugestiile raportate pentru o trimitere: `text_original` copiat exact din segmentul
 * trimiterii (sau din citat), `text_propus` diferit de original (și nevid pentru o greșeală),
 * `situatie` la fiecare variantă când sunt mai multe; cel puțin o sugestie validă pentru
 * „eroare_citare” și „interpretare_discutabila”. Întoarce indicii sugestiilor valide.
 */
export function checkSuggestions(input: ReportInput, ctx: Pick<ValidationContext, "segments">, ref: LegalReference): { valid: number[]; errors: string[] } {
  const status = input.verdict_la_data.status;
  const list = suggestionInputs(input);
  const errors: string[] = [];
  const valid: number[] = [];
  if (status === "corect") return { valid, errors };
  const seg = ctx.segments.find((s) => s.id === ref.segment_id);
  const inDocument = (q: string) =>
    (seg ? locateQuote(seg.text, q).potrivire !== "negasita" : false) || locateQuote(ref.citat, q).potrivire !== "negasita";
  const name = (i: number) => (input.sugestii?.length ? `sugestii[${i}]` : "sugestie");
  list.forEach((s: SuggestionInput, i) => {
    const own: string[] = [];
    if (!s.text_original.trim()) own.push(`${name(i)}.text_original lipsește: copiază exact pasajul din document pe care îl înlocuiește sugestia.`);
    else if (!inDocument(s.text_original)) own.push(`${name(i)}.text_original trebuie copiat exact din document (din segmentul trimiterii ${ref.segment_id}).`);
    if (status === "eroare_citare" && !s.text_propus.trim()) own.push(`${name(i)}.text_propus este gol: pentru o greșeală, propune textul corect.`);
    else if (s.text_original.trim() && s.text_propus.trim() && sameText(s.text_original, s.text_propus)) own.push(`${name(i)}.text_propus este identic cu text_original.`);
    if (own.length) errors.push(...own);
    else valid.push(i);
    // cere reîncercarea, dar varianta rămâne utilizabilă și fără etichetă
    if (list.length > 1 && !s.situatie?.trim()) errors.push(`${name(i)}.situatie lipsește: când dai mai multe variante, fiecare spune în ce situație se aplică.`);
  });
  if (NEEDS_SUGGESTION.includes(status) && !valid.length) {
    errors.push(
      status === "eroare_citare"
        ? "„eroare_citare” necesită cel puțin o sugestie validă în „sugestii”: text_original copiat exact din segmentul trimiterii și text_propus care corectează greșeala (articolul sau actul corect, valoarea corectă ori o reformulare fără afirmația greșită)."
        : "„interpretare_discutabila” necesită cel puțin o sugestie validă în „sugestii”; când soluția depinde de fapte sau de intenția părților, dă 2–3 variante, fiecare cu „situatie”.",
    );
  }
  return { valid, errors };
}

export function validateReport(input: ReportInput, ctx: ValidationContext, ref: LegalReference): Validation {
  const errors: string[] = [];
  const dovezi: FindingEvidence[] = [];
  for (const d of input.dovezi) {
    const r = validateEvidence(ctx.store, d.evidence_id, d.fragment, ctx.trusts);
    if ("error" in r) errors.push(r.error);
    else {
      dovezi.push(r);
      if (r.validare === "respinsa") errors.push(`Dovada ${d.evidence_id}: ${r.motivRespingere}`);
    }
  }
  const ok = dovezi.filter((d) => d.validare === "confirmata");

  const checkVerdict = (v: { status: VerdictStatus } | null, date: string, label: string) => {
    if (!v) return;
    const forDate = ok.filter((d) => !d.evidence.dataReferinta || d.evidence.dataReferinta === date);
    if (v.status === "corect") {
      if (!forDate.some((d) => d.evidence.type === "text_articol" || d.evidence.type === "fisa_act")) {
        errors.push(
          `Verdictul „corect” ${label} necesită cel puțin o dovadă confirmată cu textul normei citit pentru data ${date} (citeste_articol/cauta_in_act/info_act cu această dată).`,
        );
      }
    }
    if (v.status === "eroare_citare" && forDate.length === 0 && ok.length === 0) {
      errors.push(`Verdictul „eroare_citare” ${label} necesită cel puțin o dovadă confirmată (inclusiv dovezi de inexistență).`);
    }
    if (v.status === "interpretare_discutabila") {
      if (ok.length === 0) errors.push("„interpretare_discutabila” necesită textul normei ca dovadă.");
      if (input.ipoteze.length === 0) errors.push("„interpretare_discutabila” necesită „ipoteze”.");
    }
    if (v.status === "necesita_analiza_umana" && input.informatii_lipsa.length === 0) {
      errors.push("„necesita_analiza_umana” necesită „informatii_lipsa”.");
    }
    if (v.status === "neverificat" && !input.motiv_neverificare?.trim()) {
      errors.push("„neverificat” necesită „motiv_neverificare”.");
    }
  };
  checkVerdict(input.verdict_la_data, ctx.dataReferinta, "la data de referință");
  if (ctx.dataAzi !== ctx.dataReferinta) {
    if (!input.verdict_astazi && FIRM.includes(input.verdict_la_data.status)) {
      errors.push(`Data de referință (${ctx.dataReferinta}) diferă de data de azi (${ctx.dataAzi}): completează și verdict_astazi, pe baza formei aplicabile azi.`);
    }
    checkVerdict(input.verdict_astazi, ctx.dataAzi, "pentru data de azi");
  }
  return { errors, suggestionErrors: checkSuggestions(input, ctx, ref).errors, dovezi };
}

function toVerdict(v: { status: VerdictStatus; rezumat: string }, data: string): Verdict {
  return { status: v.status, rezumat: v.rezumat, data };
}

export function buildFinding(input: ReportInput, ref: LegalReference, ctx: ValidationContext, dovezi: FindingEvidence[], errors: string[]): Finding {
  const confirmed = dovezi.find((d) => d.validare === "confirmata" && d.evidence.act);
  let status = input.verdict_la_data.status;
  let verdictLaData = toVerdict(input.verdict_la_data, ctx.dataReferinta);
  let verdictAstazi = input.verdict_astazi && ctx.dataAzi !== ctx.dataReferinta ? toVerdict(input.verdict_astazi, ctx.dataAzi) : undefined;
  let retrogradat: Finding["retrogradat"];
  let motivNeverificare = input.motiv_neverificare ?? undefined;
  let tipNeverificare: UnverifiedReason | undefined = status === "neverificat" ? (input.tip_neverificare ?? "sursa_lipsa") : undefined;

  // validarea automată a eșuat după reîncercări → nu acordăm un verdict ferm
  if (errors.length && status !== "neverificat") {
    retrogradat = { de: status, motiv: `Dovezile nu au putut fi confirmate automat în sursa oficială: ${errors.join(" ")}` };
    status = "neverificat";
    tipNeverificare = "validare_esuata";
    motivNeverificare = retrogradat.motiv;
    verdictLaData = { ...verdictLaData, status: "neverificat" };
    if (verdictAstazi && verdictAstazi.status !== "neverificat") verdictAstazi = { ...verdictAstazi, status: "neverificat" };
  }

  // text din OCR nesigur → semnalăm înainte de orice verdict ferm
  const seg = ctx.segments.find((s) => s.id === ref.segment_id);
  if (seg?.quality === "ocr_nesigur" && status !== "neverificat" && /⟦|\ufffd/.test(ref.citat)) {
    retrogradat = {
      de: status,
      motiv: "Pasajul din document conține fragmente citite nesigur (OCR sau caractere ilizibile). Verificați textul din document înainte de a vă baza pe verdict.",
    };
    status = "neverificat";
    tipNeverificare = "text_nesigur";
    motivNeverificare = retrogradat.motiv;
    verdictLaData = { ...verdictLaData, status: "neverificat" };
  }

  // doar sugestiile valide; fără una validă acolo unde era obligatorie, semnalăm lipsa (nu inventăm text)
  const inputs = suggestionInputs(input);
  const sugestii: Suggestion[] =
    status === "corect"
      ? []
      : checkSuggestions(input, ctx, ref).valid.map((i) => {
          const s = inputs[i];
          return {
            tip: s.tip === "inlocuire" && status === "eroare_citare" ? "inlocuire" : "propunere_de_revizuit",
            ...(s.situatie?.trim() ? { situatie: s.situatie.trim() } : {}),
            textOriginal: s.text_original,
            textPropus: s.text_propus,
            motiv: s.motiv,
            impact: (s.impact ?? [])
              .filter((x) => ctx.segments.some((seg) => seg.id === x.segment_id))
              .map((x) => ({ segmentId: x.segment_id, descriere: x.descriere })),
          };
        });
  const sugestiiLipsa = NEEDS_SUGGESTION.includes(status) && !sugestii.length ? true : undefined;

  return {
    id: `F-${ref.id}`,
    referenceId: ref.id,
    citat: ref.citat,
    anchors: anchorsFor(ref, ctx.segments),
    tipTrimitere: ref.tip,
    afirmatie: ref.afirmatie,
    act: confirmed?.evidence.act,
    unitate: input.unitate ?? ref.unitate ?? undefined,
    status,
    categorie: input.categorie ?? undefined,
    titlu: input.titlu,
    explicatie: input.explicatie,
    verdictLaData,
    verdictAstazi,
    ipoteze: input.ipoteze.length ? input.ipoteze : undefined,
    exceptii: input.exceptii.length ? input.exceptii : undefined,
    informatiiLipsa: input.informatii_lipsa.length ? input.informatii_lipsa : undefined,
    motivNeverificare,
    tipNeverificare,
    evenimente: input.evenimente.length ? input.evenimente : undefined,
    sugestii,
    sugestie: sugestii[0],
    sugestiiLipsa,
    dovezi,
    retrogradat,
  };
}

