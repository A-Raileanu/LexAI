import type { ActId, ActRef, EvidenceDraft, VersionRef } from "./evidence";

/**
 * Contractul unei surse de legislație. Analiza nu cunoaște sursele concrete (Portalul
 * Legislativ, jurisprudența, paginile oficiale etc.): vorbește cu ele prin această interfață,
 * iar instrumentele agentului se generează din capabilitățile surselor active.
 */

export const CAPABILITIES = [
  "cauta_act",
  "info_act",
  "citeste_articol",
  "cauta_in_act",
  "cauta_decizii",
  "citeste_decizie",
  "citeste_pagina",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

/** Contextul unui apel: anulare, mesaje de activitate și starea sursei pe durata unei analize. */
export interface SourceCallContext {
  signal?: AbortSignal;
  /** mesaj scurt pentru utilizator (ex. „Citesc art. 11 din …”, la persoana I) */
  activity?: (mesaj: string) => void;
  /** stare păstrată de sursă pe durata unei analize (ex. metadatele actelor găsite la căutare) */
  state: Map<string, unknown>;
}

// ───────────────────────── Acte normative ─────────────────────────

export interface CautaActParams {
  tip: string | null;
  numar: string | null;
  an: string | null;
  titlu: string | null;
  text: string | null;
  /** doar acte în vigoare la această dată (ISO) */
  inVigoareLa: string | null;
}

export interface ActHit {
  actId: ActId;
  /** ex. „LEGE 31 16/11/1990” */
  eticheta: string;
  titlu: string;
  descriere: string;
  emitent: string;
  publicat: string;
  /** ISO, dacă a putut fi interpretată */
  intrareInVigoare: string | null;
  intrareInVigoareText: string;
  republicare: boolean;
}

export interface CautaActResult {
  rezultate: ActHit[];
  total: number | null;
  url: string;
  accesatLa: string;
  /** dovada că actul nu a fost găsit (doar când nu există rezultate) */
  dovada?: EvidenceDraft;
  /** indicație pentru agent */
  nota?: string;
}

export interface InfoActParams {
  actId: ActId;
  /** data pentru care se determină forma aplicabilă (ISO) */
  data: string;
}

export interface InfoActResult {
  act: ActRef;
  versiune?: VersionRef;
  /** fișa actului: forme, forma aplicabilă, note la nivel de act */
  fisa: EvidenceDraft;
  /** acțiunile suferite de act (abrogări, suspendări, decizii CCR, modificări) */
  actiuni?: EvidenceDraft;
  nota?: string;
}

export interface CitesteArticolParams {
  actId: ActId;
  /** „7”, „6^1”, „I” */
  articol: string;
  /** doar acest alineat (ex. „1”); null pentru tot articolul */
  alineat: string | null;
  data: string;
}

export type CitesteArticolResult =
  | {
      gasit: true;
      /** textul complet al articolului (cu antetul formei) */
      dovada: EvidenceDraft;
      /** ce primește agentul (eventual doar alineatul cerut, cu notele) */
      text: string;
      abrogat: boolean;
      /** numărul cerut a fost asociat aproximativ (ex. indice superior pierdut) */
      potrivireAproximativa?: string;
      /** alineatul cerut nu există; este redat tot articolul */
      alineatNegasit?: string;
      actiuniPeArticol: string[];
    }
  | {
      gasit: false;
      /** dovada inexistenței articolului în forma aplicabilă */
      dovada: EvidenceDraft;
      text: string;
      actiuniPeArticol: string[];
    }
  | {
      gasit: false;
      /** actul cerut e legea de aprobare a unui cod: articolele sunt în alt document */
      redirect: { nota: string; coduri: { actId: ActId; eticheta: string; intrareInVigoare: string | null }[] };
    };

export interface CautaInActParams {
  actId: ActId;
  expresie: string;
  data: string;
}

export interface CautaInActResult {
  /** eticheta formei în care s-a căutat */
  forma: string;
  rezultate: {
    articol: string;
    /** pasajul (alineatul, litera) cu cele mai multe cuvinte căutate */
    pasaj?: string;
    /** textul pentru agent (posibil prescurtat) */
    text: string;
    dovada: EvidenceDraft;
  }[];
  /** dovada că expresia nu apare (doar când nu există rezultate) */
  dovada?: EvidenceDraft;
}

// ───────────────────────── Jurisprudență ─────────────────────────

export type Instanta = "ccr" | "iccj";
export type FelDecizie = "ccr_exceptie" | "ccr_obiectie" | "ccr_alta" | "iccj_hp" | "iccj_ril" | "iccj_alta" | "alta";

export interface CautaDeciziiParams {
  /** actul: număr și an (ex. 31, 1990) */
  numar: string | null;
  an: string | null;
  /** sau numele codului (ex. „codul civil”) */
  cod: string | null;
  articol: string | null;
  instanta: Instanta | null;
  /** cuvinte cheie pentru căutarea în jurisprudența ÎCCJ (scj.ro) */
  expresie: string | null;
}

export interface DecizieGasita {
  id: string;
  titlu: string;
  descriere: string;
  instanta: Instanta | null;
  fel: FelDecizie;
  data: string | null;
  publicat: string;
  url: string;
  /** „articol”: descrierea leagă articolul de act; „posibil”: apar amândouă, fără legătură clară */
  potrivire?: "articol" | "posibil";
  nota?: string;
}

export interface CautaDeciziiResult {
  rezultate: DecizieGasita[];
  /** decizii găsite înainte de filtrare */
  total: number | null;
  complet: boolean;
  url: string;
  accesatLa: string;
  nota?: string;
}

export interface CitesteDecizieParams {
  id: string;
  /** opțional: pasajele care conțin expresia */
  expresie: string | null;
}

export interface CitesteDecizieResult {
  decizie: DecizieGasita & { solutie: string | null; dispozitiv: string | null };
  /** textul complet al deciziei */
  dovada: EvidenceDraft;
  pasaje: string[];
}

// ───────────────────────── Pagini oficiale ─────────────────────────

export interface CitestePaginaParams {
  url: string;
}

export interface CitestePaginaResult {
  url: string;
  titlu: string;
  /** textul paginii (complet; agentul primește o variantă trunchiată) */
  dovada: EvidenceDraft;
}

// ───────────────────────── Sursa ─────────────────────────

export interface CapabilityIO {
  cauta_act: [CautaActParams, CautaActResult];
  info_act: [InfoActParams, InfoActResult];
  citeste_articol: [CitesteArticolParams, CitesteArticolResult];
  cauta_in_act: [CautaInActParams, CautaInActResult];
  cauta_decizii: [CautaDeciziiParams, CautaDeciziiResult];
  citeste_decizie: [CitesteDecizieParams, CitesteDecizieResult];
  citeste_pagina: [CitestePaginaParams, CitestePaginaResult];
}

export type CapabilityParams<C extends Capability> = CapabilityIO[C][0];
export type CapabilityResult<C extends Capability> = CapabilityIO[C][1];

/** Numele metodei care implementează o capabilitate. */
export const CAPABILITY_METHOD = {
  cauta_act: "cautaAct",
  info_act: "infoAct",
  citeste_articol: "citesteArticol",
  cauta_in_act: "cautaInAct",
  cauta_decizii: "cautaDecizii",
  citeste_decizie: "citesteDecizie",
  citeste_pagina: "citestePagina",
} as const satisfies Record<Capability, string>;

type Method<C extends Capability> = (p: CapabilityParams<C>, ctx: SourceCallContext) => Promise<CapabilityResult<C>>;

export interface LegalSource {
  /** identificator stabil (ex. „portal-legislativ”), păstrat în dovezi */
  id: string;
  /** nume pentru utilizator */
  label: string;
  /** descriere pentru prompturi, ex. „Portalul Legislativ (legislatie.just.ro)” */
  description?: string;
  capabilities: ReadonlySet<Capability>;
  /** adresele pe care sursa le garantează ca oficiale (validarea dovezilor); implicit: oricare */
  trustsUrl?(url: string): boolean;
  cautaAct?: Method<"cauta_act">;
  infoAct?: Method<"info_act">;
  citesteArticol?: Method<"citeste_articol">;
  cautaInAct?: Method<"cauta_in_act">;
  cautaDecizii?: Method<"cauta_decizii">;
  citesteDecizie?: Method<"citeste_decizie">;
  citestePagina?: Method<"citeste_pagina">;
}

/** Apelează capabilitatea `cap` a sursei (eroare dacă sursa nu o implementează). */
export function callSource<C extends Capability>(
  source: LegalSource,
  cap: C,
  params: CapabilityParams<C>,
  ctx: SourceCallContext,
): Promise<CapabilityResult<C>> {
  const fn = source[CAPABILITY_METHOD[cap]] as Method<C> | undefined;
  if (!source.capabilities.has(cap) || !fn) {
    return Promise.reject(new SourceError(`Sursa „${source.label}” nu oferă „${cap}”.`, { sourceId: source.id }));
  }
  return fn.call(source, params, ctx);
}

// ───────────────────────── Erori ─────────────────────────

/**
 * Eroare a unei surse. `kind`:
 * - „indisponibil”: sursa nu a putut fi accesată (agentul primește „SURSĂ INDISPONIBILĂ”);
 * - „refuz”: cererea nu este acceptată (ex. domeniu nepermis, PDF); mesajul ajunge ca atare la agent.
 */
export class SourceError extends Error {
  readonly url?: string;
  readonly sourceId?: string;
  readonly kind: "indisponibil" | "refuz";
  constructor(message: string, opts: { url?: string; sourceId?: string; kind?: "indisponibil" | "refuz" } = {}) {
    super(message);
    this.name = "SourceError";
    this.url = opts.url;
    this.sourceId = opts.sourceId;
    this.kind = opts.kind ?? "indisponibil";
  }
}
