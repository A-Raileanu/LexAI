/**
 * Catalogul documentelor care pot fi redactate de la zero. Normele de pornire vin din
 * metodologia Legalis (docs/metodologie/redactare.md, §7): sunt doar
 * locuri unde agentul începe cercetarea; legea se citește întotdeauna la data documentului.
 */

export type FieldKind = "text" | "textarea" | "money" | "duration" | "date" | "select";

export interface EssentialField {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: string[];
}

export interface DocType {
  id: string;
  group: "Contracte" | "Muncă și societăți" | "Litigii și notificări" | "Protecția datelor" | "Altele";
  name: string;
  summary: string;
  synonyms: string[];
  subtypes: string[];
  roles: string[];
  fields: EssentialField[];
  /** normele de la care pornește cercetarea agentului */
  norms: string[];
}

const PRET: EssentialField = { key: "pret", label: "Preț / sumă", kind: "money", help: "Suma și moneda; dacă se plătește în rate, precizează în „Modalitatea de plată”." };
const PLATA: EssentialField = { key: "plata", label: "Modalitatea de plată", kind: "text", placeholder: "ex. lunar, până la data de 5, prin transfer bancar" };
const DURATA: EssentialField = { key: "durata", label: "Durata", kind: "duration" };
const LOC: EssentialField = { key: "loc", label: "Locul executării", kind: "text" };

export const DOC_TYPES: DocType[] = [
  {
    id: "contract",
    group: "Contracte",
    name: "Contract (general)",
    summary: "Vânzare, prestări servicii, împrumut, mandat, alte contracte numite sau nenumite.",
    synonyms: ["vanzare", "prestari", "servicii", "imprumut", "mandat", "contract"],
    subtypes: ["Prestări servicii", "Vânzare-cumpărare", "Împrumut de consumație", "Mandat", "Alt contract"],
    roles: ["Prestator", "Beneficiar", "Vânzător", "Cumpărător", "Împrumutător", "Împrumutat", "Mandant", "Mandatar"],
    fields: [{ key: "obiect", label: "Obiectul contractului", kind: "textarea", required: true, help: "Ce se vinde, ce servicii se prestează, ce sumă se împrumută." }, PRET, PLATA, DURATA, LOC],
    norms: [
      "Codul civil: art. 1.178 (libertatea formei), art. 1.179 (condițiile de validitate), art. 1.203 (clauzele standard neuzuale)",
      "Codul civil: capitolul contractului special ales (ex. împrumutul de consumație, art. 2.158 și urm.)",
      "Dacă o parte e consumator: Legea nr. 193/2000 privind clauzele abuzive (art. 4)",
    ],
  },
  {
    id: "inchiriere",
    group: "Contracte",
    name: "Contract de închiriere",
    summary: "Locuință, spațiu comercial, teren; cu chirie, garanție și predare-primire.",
    synonyms: ["chirie", "inchiriere", "locatiune", "locuinta", "spatiu"],
    subtypes: ["Locuință", "Spațiu comercial", "Teren", "Alt bun"],
    roles: ["Locator", "Locatar"],
    fields: [
      { key: "obiect", label: "Bunul închiriat", kind: "textarea", required: true, help: "Descrie bunul suficient cât să poată fi identificat (adresă, suprafață, număr cadastral)." },
      { ...PRET, label: "Chiria", required: true },
      PLATA,
      { ...DURATA, required: true },
      { key: "garantie", label: "Garanția", kind: "money" },
    ],
    norms: [
      "Codul civil: art. 1.777 și urm. (locațiunea)",
      "Codul civil: art. 1.798 (contractul înregistrat la organele fiscale sau autentic e titlu executoriu pentru chirie)",
      "Codul civil: art. 1.809 (expirarea termenului; restituirea bunului), art. 1.824 și urm. (locuințe)",
      "Codul fiscal: art. 83 (înregistrarea contractului la organul fiscal)",
    ],
  },
  {
    id: "munca",
    group: "Contracte",
    name: "Contract individual de muncă",
    summary: "Contract de muncă pe durată determinată sau nedeterminată și act adițional.",
    synonyms: ["munca", "angajare", "cim", "act aditional", "salariat"],
    subtypes: ["Contract individual de muncă", "Act adițional"],
    roles: ["Angajator", "Salariat"],
    fields: [
      { key: "functia", label: "Funcția / ocupația", kind: "text", required: true, help: "Cu codul COR, dacă îl cunoști." },
      { key: "loc", label: "Locul de muncă", kind: "text", required: true },
      { ...PRET, label: "Salariul de bază brut", required: true },
      { key: "program", label: "Programul de lucru", kind: "text", placeholder: "ex. 8 ore/zi, 40 ore/săptămână" },
      DURATA,
      { key: "modificare", label: "Modificarea (pentru act adițional)", kind: "textarea" },
    ],
    norms: [
      "Codul muncii: art. 16 (forma scrisă, limba română, înregistrarea în registru)",
      "Codul muncii: art. 17 (informarea și elementele obligatorii)",
      "Modelul-cadru al contractului individual de muncă stabilit prin ordin al ministrului",
    ],
  },
  {
    id: "disciplinar",
    group: "Muncă și societăți",
    name: "Decizie de sancționare disciplinară",
    summary: "Decizia angajatorului după cercetarea disciplinară prealabilă.",
    synonyms: ["sanctiune", "disciplinar", "decizie", "abatere"],
    subtypes: ["Avertisment scris", "Retrogradare", "Reducerea salariului", "Desfacerea disciplinară a contractului"],
    roles: ["Angajator", "Salariat"],
    fields: [
      { key: "fapta", label: "Fapta (abaterea disciplinară)", kind: "textarea", required: true },
      { key: "cercetare", label: "Cercetarea disciplinară prealabilă", kind: "textarea", required: true, help: "Data convocării, data și concluziile cercetării, apărarea salariatului." },
      { key: "data_cunostinta", label: "Data la care angajatorul a luat cunoștință de faptă", kind: "date", required: true },
      { key: "sanctiune", label: "Sancțiunea", kind: "text" },
    ],
    norms: ["Codul muncii: art. 247–252 (răspunderea disciplinară; art. 252 — forma scrisă, termenele, conținutul obligatoriu)"],
  },
  {
    id: "act-constitutiv",
    group: "Muncă și societăți",
    name: "Act constitutiv",
    summary: "SRL, SNC sau SCS: asociați, capital, obiect de activitate, administrare.",
    synonyms: ["srl", "societate", "infiintare", "act constitutiv", "statut"],
    subtypes: ["SRL", "SNC", "SCS"],
    roles: ["Asociat", "Asociat unic", "Administrator"],
    fields: [
      { key: "denumire", label: "Denumirea societății", kind: "text", required: true },
      { key: "sediu", label: "Sediul social", kind: "text", required: true },
      { key: "capital", label: "Capitalul social", kind: "money", required: true },
      { key: "obiect", label: "Obiectul principal de activitate", kind: "text", required: true, help: "Codul CAEN și descrierea." },
      { key: "administrare", label: "Administrarea", kind: "textarea" },
    ],
    norms: ["Legea nr. 31/1990: art. 7 (conținutul actului constitutiv) și dispozițiile privind forma societății alese"],
  },
  {
    id: "notificare",
    group: "Litigii și notificări",
    name: "Notificare / punere în întârziere",
    summary: "Somație de plată, notificare de reziliere, punere în întârziere.",
    synonyms: ["somatie", "notificare", "punere in intarziere", "reziliere", "plata"],
    subtypes: ["Punere în întârziere", "Notificare de reziliere", "Somație de plată", "Altă notificare"],
    roles: ["Creditor", "Debitor", "Expeditor", "Destinatar"],
    fields: [
      { key: "temei", label: "Contractul sau raportul juridic", kind: "textarea", required: true },
      { key: "obligatie", label: "Obligația neexecutată", kind: "textarea", required: true },
      PRET,
      { key: "termen", label: "Termenul acordat", kind: "text", placeholder: "ex. 15 zile de la primire" },
    ],
    norms: ["Codul civil: art. 1.522 (punerea în întârziere de către creditor)", "Codul civil: art. 1.549–1.554 (rezoluțiunea și rezilierea), dacă e cazul"],
  },
  {
    id: "cerere-judecata",
    group: "Litigii și notificări",
    name: "Cerere de chemare în judecată",
    summary: "Cererea introductivă: părți, obiect, motive, probe; competență și taxe.",
    synonyms: ["actiune", "cerere de chemare in judecata", "proces", "instanta", "reclamant"],
    subtypes: ["Pretenții", "Obligație de a face", "Constatare", "Altă acțiune"],
    roles: ["Reclamant", "Pârât"],
    fields: [
      { key: "obiect", label: "Obiectul cererii", kind: "textarea", required: true, help: "Ce ceri instanței; valoarea, dacă e evaluabilă în bani." },
      { key: "situatie", label: "Situația de fapt", kind: "textarea", required: true },
      { key: "probe", label: "Probele", kind: "textarea" },
      { key: "instanta", label: "Instanța", kind: "text" },
    ],
    norms: ["Codul de procedură civilă: art. 194 (cuprinsul cererii)", "Codul de procedură civilă: competența materială și teritorială", "OUG nr. 80/2013 (taxele judiciare de timbru)"],
  },
  {
    id: "gdpr",
    group: "Protecția datelor",
    name: "Notă de informare GDPR",
    summary: "Informarea persoanelor vizate privind prelucrarea datelor personale.",
    synonyms: ["gdpr", "date personale", "informare", "confidentialitate", "prelucrare"],
    subtypes: ["Clienți", "Angajați", "Candidați", "Vizitatori site"],
    roles: ["Operator", "Persoane vizate"],
    fields: [
      { key: "scopuri", label: "Scopurile prelucrării", kind: "textarea", required: true },
      { key: "date", label: "Categoriile de date", kind: "textarea", required: true },
      { key: "destinatari", label: "Destinatarii", kind: "textarea" },
      { key: "stocare", label: "Durata stocării", kind: "text" },
    ],
    norms: ["Regulamentul (UE) 2016/679: art. 13–14 (obligațiile de informare)", "Legea nr. 190/2018 (măsuri de punere în aplicare a GDPR)"],
  },
  {
    id: "altul",
    group: "Altele",
    name: "Alt document",
    summary: "Descrie ce ai nevoie: tipul, părțile, ce trebuie să conțină.",
    synonyms: [],
    subtypes: [],
    roles: ["Parte"],
    fields: [{ key: "continut", label: "Ce trebuie să conțină documentul", kind: "textarea", required: true }],
    norms: [],
  },
];

export const DOC_GROUPS = ["Contracte", "Muncă și societăți", "Litigii și notificări", "Protecția datelor"] as const;

export function docType(id: string): DocType | undefined {
  return DOC_TYPES.find((t) => t.id === id);
}

export interface Party {
  id: string;
  tip: "fizica" | "juridica";
  nume: string;
  identificare: string;
  adresa: string;
  reprezentant: string;
  calitate: string;
}

export interface DraftParams {
  tip: string;
  subtip: string;
  scop: string;
  parti: Party[];
  elemente: Record<string, string>;
  dataDocument: string;
  dataLegii: string;
  pozitie: "echilibrat" | string;
  model: { documentId: string; mod: "structura" | "inspiratie" } | null;
  /** `false`: contextul proiectului (fișierele din tabul Context și celelalte documente) nu intră în cererea de redactare (implicit intră) */
  context?: boolean;
}

/** Câmpurile lăsate goale: vor deveni „[● …]” în proiect. */
export function missingFields(t: DocType, p: DraftParams): string[] {
  const out: string[] = [];
  for (const f of t.fields) if (!p.elemente[f.key]?.trim()) out.push(f.label);
  p.parti.forEach((x, i) => {
    if (!x.nume.trim()) out.push(`Numele părții ${i + 1}`);
    if (!x.identificare.trim()) out.push(`${x.tip === "fizica" ? "CNP-ul" : "CUI-ul"} ${x.nume || `părții ${i + 1}`}`);
    if (!x.adresa.trim()) out.push(`${x.tip === "fizica" ? "Domiciliul" : "Sediul"} ${x.nume || `părții ${i + 1}`}`);
  });
  return out;
}
