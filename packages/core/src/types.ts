/**
 * Tipurile domeniului (fără dependențe de framework). Toate textele afișate utilizatorului sunt în română.
 */
import type { ActId, ActRef, Evidence, VersionRef } from "@lexai/sources";
import type { UsageReport } from "@lexai/ai/usage";
import type { MatchQuality } from "./text/locate";

export type { ActId, ActRef, Evidence, EvidenceDraft, EvidenceType, VersionRef } from "@lexai/sources";

// ───────────────────────── Document ─────────────────────────

export type DocKind = "pdf" | "docx" | "doc";

export type SegmentKind =
  | "paragraf"
  | "titlu"
  | "tabel"
  | "nota"
  | "antet"
  | "subsol"
  | "ocr";

export type SegmentQuality = "ok" | "ocr" | "ocr_nesigur";

export interface DocSegment {
  /** identificator stabil: `segId` al blocului din documentul Tiptap (ex. "p_8f3k2a"); pentru PDF, "s12" */
  id: string;
  text: string;
  kind: SegmentKind;
  quality: SegmentQuality;
  /** pagina (1-based), doar pentru PDF */
  page?: number;
  /**
   * Pentru PDF: bucățile din stratul de text pdf.js care compun segmentul.
   * offset = poziția în `text` unde începe bucata.
   */
  pdfItems?: { page: number; item: number; offset: number; length: number }[];
}

export interface ParsedDocument {
  kind: DocKind;
  fileName: string;
  fileSize: number;
  /** SHA-256 al fișierului original */
  sha256: string;
  segments: DocSegment[];
  pageCount?: number;
  /** pagini fără text care nu au putut fi recunoscute */
  unreadablePages: number[];
  /** pagini recunoscute prin OCR */
  ocrPages: number[];
  warnings: string[];
  /** consumul recunoașterii optice (PDF scanat), adăugat la consumul analizei */
  consumOcr?: UsageReport;
}

// ───────────────────────── Surse / dovezi ─────────────────────────

/** O dovadă citată într-o constatare, validată de cod. */
export interface FindingEvidence {
  evidence: Evidence;
  /** fragmentul relevant, copiat din evidence.text */
  fragment: string;
  /** rezultatul verificării făcute de cod */
  validare: "confirmata" | "respinsa";
  motivRespingere?: string;
}

// ───────────────────────── Trimiteri ─────────────────────────

/** O trimitere la legislație identificată în document. */
export interface LegalReference {
  id: string;
  segment_id: string;
  /** citat exact din segment */
  citat: string;
  tip: "explicita" | "implicita";
  act: { tip: string | null; numar: string | null; an: string | null; denumire: string | null } | null;
  unitate: string | null;
  afirmatie: string;
}

/** Trimiterile analizei, păstrate pentru reluarea verificărilor incomplete. */
export interface ReferenceSet {
  references: LegalReference[];
  /** trimitere canonică → duplicatele ei (același context), verificate o singură dată */
  duplicates: [string, string[]][];
}

// ───────────────────────── Constatări ─────────────────────────

/** De ce a rămas o trimitere neverificată; fiecare motiv are altă cale de recuperare. */
export type UnverifiedReason =
  | "sursa_lipsa"
  | "act_ambiguu"
  | "text_nesigur"
  | "validare_esuata"
  | "limita_atinsa";

export type VerdictStatus =
  | "corect"
  | "eroare_citare"
  | "interpretare_discutabila"
  | "necesita_analiza_umana"
  | "neverificat";

export type ErrorCategory =
  | "act_inexistent"
  | "identificare_gresita_act"
  | "act_abrogat"
  | "act_neintrat_in_vigoare"
  | "act_suspendat"
  | "articol_inexistent"
  | "numerotare_schimbata"
  | "text_modificat"
  | "continut_denaturat"
  | "valoare_gresita"
  | "neconstitutionalitate"
  | "citare_incompleta"
  | "norma_speciala_ignorata"
  | "conditii_omise"
  | "aplicare_gresita"
  | "concluzie_eronata"
  | "inconsecventa_interna"
  | "terminologie"
  | "dispozitii_tranzitorii"
  | "fara_temei_identificabil"
  | "decizie_obligatorie_ignorata"
  | "altele";

export interface Verdict {
  status: VerdictStatus;
  /** data pentru care s-a evaluat (ISO) */
  data: string;
  rezumat: string;
}

export interface Suggestion {
  tip: "inlocuire" | "propunere_de_revizuit";
  /**
   * Când se aplică varianta (etichetă scurtă, ex. „Clauza este convențională”). Lipsește când
   * există o singură variantă, valabilă indiferent de situație.
   */
  situatie?: string;
  /** copiat exact din segmentul trimiterii (validat de cod) */
  textOriginal: string;
  /** textul de înlocuire; gol = pasajul se elimină */
  textPropus: string;
  motiv: string;
  /** alte clauze/definiții afectate de modificare */
  impact: { segmentId: string; descriere: string }[];
}

export interface Anchor {
  segmentId: string;
  start: number;
  end: number;
  potrivire: MatchQuality;
  scor?: number;
}

export interface Finding {
  id: string;
  referenceId: string;
  /** citatul din document */
  citat: string;
  anchors: Anchor[];
  tipTrimitere: "explicita" | "implicita";
  /** ce afirmă documentul despre lege */
  afirmatie: string;
  /** actul și unitatea identificate (dacă au fost identificate) */
  act?: ActRef;
  unitate?: string;
  status: VerdictStatus;
  categorie?: ErrorCategory;
  titlu: string;
  explicatie: string;
  /** la data de referință */
  verdictLaData: Verdict;
  /** astăzi (doar dacă data de referință diferă de azi) */
  verdictAstazi?: Verdict;
  /** pentru interpretări discutabile */
  ipoteze?: string[];
  exceptii?: string[];
  /** ce informații lipsesc pentru o concluzie (analiză umană) */
  informatiiLipsa?: string[];
  /** de ce nu a putut fi verificat */
  motivNeverificare?: string;
  tipNeverificare?: UnverifiedReason;
  /** evenimente legislative relevante (modificări, republicări, tranziții) */
  evenimente?: string[];
  /**
   * Variantele de corectură sau de reformulare, în ordinea recomandării (cele validate de cod).
   * „eroare_citare” și „interpretare_discutabila” au cel puțin una, cu excepția `sugestiiLipsa`.
   */
  sugestii: Suggestion[];
  /** @deprecated alias pentru `sugestii[0]` (rezultate salvate înainte de variante, rapoarte vechi) */
  sugestie?: Suggestion;
  /**
   * Constatarea cerea o sugestie, dar agentul nu a dat una validă nici după reîncercări.
   * Nu completăm text din cod: interfața spune că sugestia lipsește.
   */
  sugestiiLipsa?: boolean;
  dovezi: FindingEvidence[];
  /** dacă verdictul a fost retrogradat de validarea automată */
  retrogradat?: { de: VerdictStatus; motiv: string };
  /** trimitere identică cu alta deja verificată: rezultatul a fost preluat de la aceasta (id constatare) */
  preluatDin?: string;
  /** stare locală setată de utilizator */
  stareUtilizator?: "rezolvat" | "ignorat";
}

// ───────────────────────── Acoperire și raport ─────────────────────────

export interface Coverage {
  trimiteriGasite: number;
  explicite: number;
  implicite: number;
  verificateCuSursa: number;
  /** din care cu dovadă dintr-o pagină web oficială (a doua trecere) */
  verificateCuWeb: number;
  corecte: number;
  eroriConfirmate: number;
  interpretariDiscutabile: number;
  analizaUmana: number;
  neverificate: number;
  segmenteTotal: number;
  segmenteOcr: number;
  segmenteOcrNesigur: number;
  paginiNecitite: number[];
  citateNelocalizate: number;
}

export interface SourceVersionUsed {
  act: ActRef;
  versiune: VersionRef;
  /** sursa din care provine forma și adresa ei */
  sourceId?: string;
  url?: string;
  accesatLa: string;
  /** cea mai recentă formă cunoscută la data verificării */
  ultimaFormaId?: ActId;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  /** data de referință aleasă (ISO) */
  dataReferinta: string;
  /** data verificării (azi, ISO) */
  dataVerificarii: string;
  dataDocumentDetectata?: string | null;
  model: string;
  findings: Finding[];
  coverage: Coverage;
  surse: SourceVersionUsed[];
  avertismente: string[];
  durataMs: number;
  /** tokeni și cost estimat (USD) */
  consum?: UsageReport;
  /** trimiterile identificate (pentru reluarea verificărilor incomplete) */
  trimiteri?: ReferenceSet;
  /** sursele active la verificare */
  surseActive?: { id: string; label: string }[];
  /** doar aceste segmente au fost (re)analizate (vezi `recheckSegmentIds`) */
  segmenteVerificate?: string[];
}

// ───────────────────────── Evenimente de progres ─────────────────────────

export type ProgressEvent =
  | { type: "etapa"; etapa: "identificare" | "verificare" | "consolidare"; mesaj: string }
  | { type: "identificare"; trimiteri: ReferenceSet; dataDocument?: string | null }
  | { type: "trimiteri"; total: number; grupuri: { cheie: string; eticheta: string; numar: number }[]; dataDocument?: string | null }
  | { type: "grup_start"; cheie: string; eticheta: string; numar?: number }
  | { type: "activitate"; cheie: string; mesaj: string }
  | { type: "constatare"; finding: Finding }
  | { type: "grup_final"; cheie: string }
  | { type: "consum"; consum: UsageReport }
  | { type: "rezultat"; result: AnalysisResult }
  | { type: "eroare"; mesaj: string };
