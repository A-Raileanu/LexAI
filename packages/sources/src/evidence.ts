/**
 * Dovezile: orice text normativ citit dintr-o sursă este înregistrat în registrul analizei,
 * cu sursa din care provine (`sourceId`). Constatările pot cita doar dovezi din registru.
 */

export type EvidenceType =
  | "text_articol"
  | "articol_inexistent"
  | "act_negasit"
  | "actiuni_act"
  | "fisa_act"
  | "cautare_in_act"
  | "sursa_web"
  | "decizie";

/** Identificatorul unui act sau al unei forme în sursa care l-a furnizat (pe portal: număr întreg). */
export type ActId = number | string;

export interface ActRef {
  /** id-ul formei de bază în sursă (pe legislatie.just.ro: număr) */
  baseId: ActId;
  /** ex. "LEGE nr. 31 din 16 noiembrie 1990" */
  titlu: string;
  tip?: string;
  numar?: string;
  an?: string;
}

export interface VersionRef {
  /** id-ul formei (consolidare/republicare/bază) în sursă */
  id: ActId;
  /** data de la care se aplică forma (ISO yyyy-mm-dd) */
  data: string | null;
  tip: "consolidare" | "republicare" | "baza";
  eticheta: string;
}

export interface Evidence {
  id: string;
  /** sursa care a furnizat textul (id-ul din registrul de surse) */
  sourceId: string;
  type: EvidenceType;
  act?: ActRef;
  versiune?: VersionRef;
  /** "art. 7 alin. (1) lit. b)" etc. */
  unitate?: string;
  /** textul sursă exact, așa cum a fost citit */
  text: string;
  url: string;
  /** momentul accesării (ISO) */
  accesatLa: string;
  /** data de referință pentru care a fost rezolvată versiunea */
  dataReferinta?: string;
  /** cea mai recentă formă a actului la momentul accesării (pentru detectarea schimbărilor) */
  ultimaFormaId?: ActId;
}

/** Dovada întoarsă de o sursă, înainte de înregistrare (id-ul și sursa le adaugă registrul). */
export type EvidenceDraft = Omit<Evidence, "id" | "sourceId">;

export class EvidenceStore {
  private items = new Map<string, Evidence>();
  private counter = 0;

  add(e: Omit<Evidence, "id">): Evidence {
    const id = `E${++this.counter}`;
    const ev: Evidence = { ...e, id };
    this.items.set(id, ev);
    return ev;
  }

  /** după id („E12”) sau, pentru paginile web citite, după URL-ul exact */
  get(id: string): Evidence | undefined {
    const key = id.trim();
    if (/^https?:\/\//i.test(key)) {
      const norm = (u: string) => u.replace(/#.*$/, "").replace(/\/$/, "");
      return [...this.items.values()].reverse().find((e) => e.type === "sursa_web" && norm(e.url) === norm(key));
    }
    return this.items.get(key.toUpperCase());
  }

  all(): Evidence[] {
    return [...this.items.values()];
  }

  /** Reîncarcă un registru salvat (dovezile păstrate între apeluri). */
  static from(items: Evidence[]): EvidenceStore {
    const store = new EvidenceStore();
    for (const e of items) {
      store.items.set(e.id, e);
      store.counter = Math.max(store.counter, Number(e.id.slice(1)) || 0);
    }
    return store;
  }
}
