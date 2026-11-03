import type { ErrorCategory, EvidenceType, SegmentKind, UnverifiedReason, VerdictStatus } from "./types";

/**
 * Etichetele (în română) ale stărilor, categoriilor și dovezilor, plus formatarea datelor.
 * Folosite de rapoarte și de interfață.
 */

export const STATUS_META: Record<
  VerdictStatus,
  { label: string; scurt: string; descriere: string }
> = {
  eroare_citare: {
    label: "Greșeală confirmată",
    scurt: "Greșeală",
    descriere: "Greșeală constatată obiectiv în sursa oficială (act sau articol inexistent, abrogat, valoare diferită).",
  },
  interpretare_discutabila: {
    label: "Interpretare discutabilă",
    scurt: "Discutabil",
    descriere: "Citarea este corectă formal, dar concluzia juridică poate fi contestată; vezi ipotezele și excepțiile.",
  },
  necesita_analiza_umana: {
    label: "Necesită analiză umană",
    scurt: "Analiză umană",
    descriere: "Concluzia depinde de fapte care nu reies din document.",
  },
  neverificat: {
    label: "Neverificat",
    scurt: "Neverificat",
    descriere: "Nu a existat o sursă suficientă pentru un verdict. Nu înseamnă că trimiterea este corectă.",
  },
  corect: {
    label: "Confirmat cu sursă",
    scurt: "Corect",
    descriere: "Afirmația corespunde textului oficial citit pentru data indicată.",
  },
};

export const STATUS_ORDER: VerdictStatus[] = [
  "eroare_citare",
  "interpretare_discutabila",
  "necesita_analiza_umana",
  "neverificat",
  "corect",
];

export const CATEGORY_LABELS: Record<ErrorCategory, string> = {
  act_inexistent: "Act inexistent",
  identificare_gresita_act: "Act identificat greșit",
  act_abrogat: "Act abrogat",
  act_neintrat_in_vigoare: "Act neintrat în vigoare",
  act_suspendat: "Act suspendat",
  articol_inexistent: "Articol inexistent",
  numerotare_schimbata: "Numerotare schimbată",
  text_modificat: "Text modificat",
  continut_denaturat: "Conținut denaturat",
  valoare_gresita: "Valoare greșită",
  neconstitutionalitate: "Neconstituționalitate",
  citare_incompleta: "Citare incompletă",
  norma_speciala_ignorata: "Normă specială ignorată",
  conditii_omise: "Condiții omise",
  aplicare_gresita: "Aplicare greșită",
  concluzie_eronata: "Concluzie contestabilă",
  inconsecventa_interna: "Inconsecvență internă",
  terminologie: "Terminologie",
  dispozitii_tranzitorii: "Dispoziții tranzitorii",
  fara_temei_identificabil: "Fără temei identificabil",
  decizie_obligatorie_ignorata: "Decizie obligatorie ignorată",
  altele: "Altele",
};

export const UNVERIFIED_LABELS: Record<UnverifiedReason, string> = {
  sursa_lipsa: "Sursă negăsită",
  act_ambiguu: "Act ambiguu",
  text_nesigur: "Text nesigur în document",
  validare_esuata: "Dovezi neconfirmate",
  limita_atinsa: "Verificare neterminată",
};

export const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  text_articol: "Text articol",
  articol_inexistent: "Articol inexistent în forma citită",
  act_negasit: "Act negăsit la căutare",
  actiuni_act: "Acțiuni asupra actului",
  fisa_act: "Fișa actului",
  cautare_in_act: "Căutare în act",
  sursa_web: "Pagină web oficială",
  decizie: "Decizie CCR / ÎCCJ",
};

export const SEGMENT_KIND_LABELS: Record<SegmentKind, string> = {
  paragraf: "Paragraf",
  titlu: "Titlu",
  tabel: "Tabel",
  nota: "Notă",
  antet: "Antet",
  subsol: "Subsol",
  ocr: "Text recunoscut (OCR)",
};

const dateFmt = new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
const dateShort = new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTime = new Intl.DateTimeFormat("ro-RO", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDateLong(iso: string | null | undefined): string {
  return iso ? dateFmt.format(parseIsoDay(iso)) : "—";
}

export function fmtDate(iso: string | null | undefined): string {
  return iso ? dateShort.format(parseIsoDay(iso)) : "—";
}

export function fmtDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : "—";
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

export function fmtDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${s % 60} s`;
}

export function localTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());
}

export function plural(n: number, one: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  // în română: „20 de trimiteri”, „3 trimiteri”
  const de = n % 100 >= 20 || (n >= 100 && n % 100 === 0) ? "de " : "";
  return `${n} ${de}${many}`;
}

export const REFERENCE_TYPE_LABELS = { explicita: "explicită", implicita: "implicită" } as const;

/** „1 explicită”, „3 explicite” */
export function countRefTypes(explicite: number, implicite: number): string {
  return `${explicite} ${explicite === 1 ? "explicită" : "explicite"} · ${implicite} ${implicite === 1 ? "implicită" : "implicite"}`;
}
