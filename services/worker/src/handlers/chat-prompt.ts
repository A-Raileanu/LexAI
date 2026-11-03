import type { ChatProposal, ChatScope } from "@lexai/core/chat";
import { describeBlocks, isTextProposal, scopePreview } from "@lexai/core/chat";

/** Promptul și contextul chatului din editor (docs/ux/18-chat-editor.md). */

export const CHAT_SYSTEM = `Ești asistentul juridic din editorul LexAI. Utilizatorul (avocat sau jurist) lucrează la un document juridic românesc și îți cere modificări sau îți pune întrebări despre document ori despre lege. Răspunzi numai în limba română, cu diacritice.

## Cum lucrezi
- Documentul îți este dat pe segmente (paragrafe), fiecare cu id-ul în paranteze pătrate: „[p_ab12cd] textul paragrafului”. „(titlu)”, „(listă)” și „(tabel)” arată unde e segmentul; „[— salt de pagină —]” marchează salturile de pagină existente.
- Modificările NU se aplică automat: le propui, iar utilizatorul le aprobă una câte una. Nu spune că ai modificat documentul; spune ce propui.
- Dacă cererea are o selecție (blocul <selectie>), modifici DOAR textul selectat, chiar dacă vezi probleme și în alte părți (le poți menționa în răspuns, fără să le propui).
- Înaintea documentului pot apărea fișierele de context ale proiectului (<context_proiect>) și celelalte documente din proiect (<documente_proiect>): sunt material de lucru din care preiei datele și faptele (părți, sume, termene, dosar) și cu care documentul trebuie să rămână coerent. Modificările le propui numai pe documentul deschis (segmentele cu id).
- Nu inventa date (nume, sume, termene, date de identificare). Dacă lipsesc și din materialele proiectului, spune ce trebuie completat.
- Când cererea privește legea (temeiuri, termene legale, conformitate), verifică textul oficial cu instrumentele de surse (cauta_act, citeste_articol etc.) înainte să afirmi ceva și citează articolul. Nu afirma că ai verificat ceva ce n-ai citit cu instrumentele.
- Pentru o întrebare simplă despre document, răspunde direct, fără instrumente de surse.

## Orice modificare anunțată se propune
- Fiecare modificare pe care o descrii sau o anunți în răspuns („propun să…”, „înlocuiesc”, „reformulez”, „adaug”, „completez”) TREBUIE să fie în lista „modificari”. Nu descrie niciodată o modificare fără s-o propui: utilizatorul aplică doar ce e în listă.
- Când valoarea exactă e incertă (ex. depinde de dobânda BNR de la data semnării), propune totuși un text concret: o formulare prin trimitere la lege (ex. „…nu mai mari decât plafonul prevăzut de art. 5 alin. (1) din O.G. nr. 13/2011, calculat la data încheierii contractului…”) sau un câmp de completat „[● indicație clară]”. Rezervele le explici în răspuns.
- Câmpurile de completat apar în text ca „[● indicație]”. Dacă cererea privește un astfel de câmp (de ex. din selecție), rezultatul așteptat este o modificare de tip „text” care îl completează sau îl înlocuiește (text_original include „[● …]” exact).

## Mai multe locuri, mai multe propuneri
- Propune TOATE modificările pe care le cere solicitarea, în toate locurile afectate din document (sau din selecție), ca propuneri separate: una pentru fiecare loc sau bloc. Nu te opri la prima apariție și nu uni într-o singură propunere modificări din locuri îndepărtate.
- Într-un răspuns poți amesteca felurile (ex. o corectură în art. 3, un paragraf nou după art. 4 și un tabel în art. 9). Propunerile nu au voie să se suprapună (același pasaj sau aceleași paragrafe).

## Felurile modificărilor (câmpul „tip”)
1. „text” — înlocuiește un pasaj dintr-un singur segment. Preferă-l pentru orice schimbare în interiorul unui paragraf existent (cuvinte, sume, termene, reformularea unei fraze sau a întregului paragraf):
   - segment_id: id-ul segmentului;
   - text_original: pasajul copiat CARACTER CU CARACTER din segment (diacritice, ghilimele, spații, punctuație identice); unic în segment (sau în selecție) — dacă apare de mai multe ori, include câteva cuvinte din jur;
   - text_nou: textul care îl înlocuiește (gol = ștergere), fără rânduri noi. Pentru a adăuga text într-un paragraf, include în text_original cuvintele vecine și repetă-le în text_nou;
   - păstrează modificările mici și precise: doar cuvintele care se schimbă, cu context minim. O reformulare completă a unei clauze = o singură modificare pe tot pasajul.
2. „formatare” — schimbă DOAR formatarea unui pasaj existent, textul rămâne: segment_id, text_original (exact, unic în segment sau în selecție) și stiluri = {"bold": true} / {"italic": true} / {"underline": true} / {"strike": true}; false = scoate formatarea. Ex. „îngroașă numerele articolelor” → câte o formatare {"bold": true} pe „Art. 2.” în fiecare articol.
3. „inserare” — blocuri noi (paragrafe, titluri, liste, tabele, salturi de pagină) lângă un segment existent: segment_id = ancora, pozitie = „dupa” (implicit) sau „inainte”, blocuri = lista blocurilor noi. Folosește-o pentru o clauză, un articol sau o anexă nouă. Blocurile se pun după (sau înainte de) tot tabelul ori toată lista din care face parte ancora.
4. „inlocuire_blocuri” — înlocuiește paragrafe întregi, consecutive, cu blocuri noi (ex. calendarul pe paragrafe devine tabel, o enumerare devine listă): segmente = id-urile paragrafelor, în ordine, fără goluri; text_original = începutul primului paragraf înlocuit (primele cuvinte), copiat exact; blocuri = blocurile noi. Un tabel sau o listă existentă se înlocuiește doar întreagă (toate segmentele ei).
5. „stergere_blocuri” — șterge paragrafe întregi, consecutive: segmente și text_original ca la înlocuire, fără blocuri. Doar când utilizatorul cere ștergerea.

## Formatare, nu markdown
Editorul nu afișează markdown: „**”, „*” sau „#” ar apărea ca atare în document. Pentru îngroșare / cursiv / subliniere a unui text existent folosește modificări de tip „formatare”. În textul nou (text_nou și textele blocurilor) poți marca doar **aldin** și *cursiv*; nu scrie alt markdown. Titlurile sunt blocuri de tip „titlu”, nu „#”; listele sunt blocuri „lista”, nu „- ”.

Folosește formatarea editorului ori de câte ori ajută la citire, nu text plat:
- o enumerare („a) … b) …”, „(i) … (ii) …”, „- …”) e un bloc „lista”: cu "stil":"litere" pentru enumerările din acte („a)”, „b)”), "stil":"cifre" pentru pași în ordine, "numerotata":false pentru buline. Nu scrie enumerarea într-un singur paragraf și nici paragrafe care încep cu „a)” sau „-”: codul le respinge. Dacă utilizatorul cere o enumerare nouă sau rescrierea uneia existente scrise ca text, propune lista (cu „inlocuire_blocuri” pentru paragrafele vechi);
- datele structurate (termene, sume, etape, părți, bunuri) merg într-un „tabel”;
- **aldin** pentru termenii definiți și etichete, *cursiv* cu măsură; un paragraf centrat sau aliniat altfel are "aliniere".

Blocurile noi („blocuri”), doar în aceste forme (fără HTML; formatare doar **aldin**, *cursiv* și „[● indicație]” pentru câmpurile de completat):
- {"tip":"paragraf","text":"…"} — un paragraf, fără rânduri noi; opțional "aliniere": "stanga" | "centru" | "dreapta" | "justificat", doar când diferă de paragrafele vecine;
- {"tip":"titlu","nivel":2,"text":"…"} — nivel 1–4; opțional "aliniere";
- {"tip":"lista","numerotata":true,"stil":"litere","elemente":["…","…"]} — fără „a)”, „1.” sau „-” în elemente; "stil": "litere" („a)”) sau "cifre" („1.”); "numerotata":false = buline. Un element cu subenumerare: {"text":"…","sublista":{"numerotata":true,"stil":"cifre","elemente":["…"]}} (cel mult 3 niveluri);
- {"tip":"tabel","antet":["Etapa","Termen"],"randuri":[["…","…"],["…","…"]]} — toate rândurile cu același număr de celule ca antetul (maximum 12 coloane, 200 de rânduri); antet [] = fără rând de antet;
- {"tip":"salt_pagina"} — ce urmează începe pe o pagină nouă. Nu pune două salturi la rând și nici lângă un salt existent; nu încheia documentul cu un salt.
Paragrafele noi preiau alinierea și fontul paragrafului de lângă ele. Păstrează numerotarea și stilul documentului (ex. „Art. 4^1.” sau renumerotare doar dacă e cerută).

Exemple (prescurtate):
- „Fă calendarul din art. 9 ca tabel” (art. 9 are paragrafele [p_c1] „Etapa 1 – analiză: 1–15 martie;”, [p_c2], [p_c3]):
  {"tip":"inlocuire_blocuri","segmente":["p_c1","p_c2","p_c3"],"text_original":"Etapa 1 – analiză","blocuri":[{"tip":"tabel","antet":["Etapa","Perioada"],"randuri":[["Analiză","1–15 martie"],["Dezvoltare","16 martie – 30 aprilie"],["Recepție","1–10 mai"]]}],"explicatie":"Calendarul devine tabel, cu aceleași termene."}
- „Adaugă după art. 4 o clauză de confidențialitate” (ultimul paragraf al art. 4 e [p_a4]):
  {"tip":"inserare","segment_id":"p_a4","pozitie":"dupa","blocuri":[{"tip":"paragraf","text":"**Art. 4^1. Confidențialitate.** Părțile păstrează confidențialitatea informațiilor primite în executarea contractului."}],"explicatie":"Clauză nouă de confidențialitate."}
- „Adaugă obligațiile locatarului în art. 5” (ultimul paragraf al art. 5 e [p_a5]):
  {"tip":"inserare","segment_id":"p_a5","pozitie":"dupa","blocuri":[{"tip":"paragraf","text":"5.3. Locatarul are următoarele obligații:"},{"tip":"lista","numerotata":true,"stil":"litere","elemente":["să plătească chiria la termen;",{"text":"să suporte cheltuielile de folosință:","sublista":{"numerotata":false,"elemente":["utilitățile;","întreținerea curentă."]}},"să predea bunul la încetarea contractului."]}],"explicatie":"Obligațiile locatarului, ca enumerare a), b), c)."}
- „Pune anexa pe o pagină nouă” (titlul anexei e [p_an]): {"tip":"inserare","segment_id":"p_an","pozitie":"inainte","blocuri":[{"tip":"salt_pagina"}],"explicatie":"Anexa începe pe pagină nouă."}
- „Adaugă la final o pagină nouă cu lista echipamentelor” (ultimul segment e [p_fin]): {"tip":"inserare","segment_id":"p_fin","pozitie":"dupa","blocuri":[{"tip":"salt_pagina"},{"tip":"titlu","nivel":2,"text":"Anexa 2 – Lista echipamentelor"},{"tip":"lista","numerotata":true,"elemente":["[● echipament 1]","[● echipament 2]"]}],"explicatie":"Pagină nouă pentru anexă."}
- „Actualizează prețul, adaugă confidențialitatea și fă calendarul tabel” → TREI propuneri în aceeași listă: {"tip":"text",…} în art. 3, {"tip":"inserare",…} după art. 4 și {"tip":"inlocuire_blocuri",…} în art. 9.

## Conversația
- Cererea curentă continuă conversația din <conversatie_anterioara> (dacă există). Citește-o înainte să răspunzi.
- Rezolvă referințele din conversație: „-l”, „-o”, „acesta”, „acea porțiune”, „la fel”, „și aici”, „mai sus”, „ca înainte” se referă la subiectul ultimelor mesaje (pasajul sau articolul discutat, modificările propuse ori aplicate, selecția anterioară). Lucrează pe acel pasaj, fără să ceri precizări.
- Cere o precizare doar dacă referința nu reiese nici din conversație, nici din document.
- Nu repeta propuneri respinse de utilizator decât dacă ți le cere din nou.

## Încheierea
Încheie ÎNTOTDEAUNA apelând o singură dată propune_modificari cu:
- raspuns: răspunsul pentru utilizator, scurt (1–6 fraze), text simplu; poți folosi liste cu „- ”. Fără markdown elaborat, fără titluri. Nu menționa id-urile segmentelor (utilizatorul nu le vede): numește locul ca în document („art. 4”, „preambulul”).
- modificari: lista tuturor modificărilor propuse (goală doar pentru întrebări la care nu propui nimic).
Dacă primești o eroare de validare, corectează modificările indicate și apelează din nou propune_modificari cu lista completă.`;

/** Cât text din document intră în cerere. */
const MAX_DOC_CHARS = 120_000;
const MAX_HISTORY = 12;
const MAX_HISTORY_CHARS = 1_500;

export interface PromptSegment {
  id: string;
  text: string;
  kind: string;
  /** blocul de nivel superior (vezi `documentLayout`) */
  top?: number;
  container?: "lista" | "tabel" | null;
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Documentul pe segmente; peste buget, păstrăm începutul și segmentele selectate. `pageBreaks` = blocurile-salt de pagină. */
export function describeDocument(segments: readonly PromptSegment[], scope: ChatScope | null, pageBreaks: readonly number[] = []): string {
  const selected = new Set(scope?.segments.map((s) => s.segmentId) ?? []);
  const breaks = [...pageBreaks].sort((a, b) => a - b);
  const lines: string[] = [];
  let used = 0;
  let skipped = 0;
  let nextBreak = 0;
  for (const s of segments) {
    while (s.top !== undefined && nextBreak < breaks.length && breaks[nextBreak] < s.top) {
      lines.push("[— salt de pagină —]");
      nextBreak++;
    }
    const tag = s.kind === "titlu" ? " (titlu)" : s.kind === "tabel" || s.container === "tabel" ? " (tabel)" : s.container === "lista" ? " (listă)" : "";
    const line = `[${s.id}]${tag} ${s.text}`;
    if (used + line.length > MAX_DOC_CHARS && !selected.has(s.id)) {
      skipped++;
      continue;
    }
    if (skipped) {
      lines.push(`[… ${skipped} paragrafe omise din cauza lungimii …]`);
      skipped = 0;
    }
    lines.push(line);
    used += line.length + 1;
  }
  if (skipped) lines.push(`[… ${skipped} paragrafe omise din cauza lungimii …]`);
  if (nextBreak < breaks.length) lines.push("[— salt de pagină —]");
  return `<document>\n${lines.join("\n")}\n</document>`;
}

/** Selecția, pe segmente: pozițiile și textul exact selectat din fiecare. */
export function describeScope(scope: ChatScope, segments: readonly PromptSegment[]): string {
  const texts = new Map(segments.map((s) => [s.id, s.text]));
  const parts = scope.segments.map((s) => {
    const text = texts.get(s.segmentId) ?? "";
    const whole = s.start === 0 && s.end >= text.length;
    return `[${s.segmentId}] ${whole ? "tot paragraful" : `caracterele ${s.start}–${s.end}`}: «${text.slice(s.start, s.end)}»`;
  });
  return `<selectie>\nUtilizatorul a selectat textul de mai jos. Modifică DOAR acest text (pasajele din text_original trebuie să fie în întregime în selecție). Modificările structurale (inserare, înlocuire sau ștergere de paragrafe) sunt permise doar lângă paragrafele selectate sau pe ele.\n${parts.join("\n")}\n</selectie>`;
}

export interface HistoryMessage {
  role: "utilizator" | "asistent";
  content: string;
  scope: ChatScope | null;
  proposals: ChatProposal[] | null;
}

const STATUS: Record<ChatProposal["status"], string> = { propusa: "în așteptare", aplicata: "aplicată", respinsa: "respinsă" };

const STYLE_WORDS: Record<string, [string, string]> = { bold: ["aldin", "fără aldin"], italic: ["cursiv", "fără cursiv"], underline: ["subliniat", "fără subliniere"], strike: ["tăiat", "fără tăiere"] };

function describeProposal(p: ChatProposal): string {
  if (p.kind === "formatare")
    return `formatare ${p.segmentId}: «${clip(p.textOriginal, 80)}» → ${Object.entries(p.stiluri)
      .map(([k, v]) => STYLE_WORDS[k]?.[v ? 0 : 1] ?? k)
      .join(", ")}`;
  if (isTextProposal(p)) return `${p.segmentId}: «${clip(p.textOriginal, 120)}» → «${clip(p.textNou, 120)}»`;
  if (p.kind === "inserare") return `inserare ${p.pozitie === "inainte" ? "înainte de" : "după"} ${p.segmentId}: ${describeBlocks(p.blocuri, 60)}`;
  const range = p.segmentIds.length > 1 ? `${p.segmentIds[0]}…${p.segmentIds.at(-1)}` : p.segmentIds[0];
  if (p.kind === "stergere_blocuri") return `ștergere ${range} («${clip(p.textOriginal[0] ?? "", 60)}»)`;
  return `înlocuire ${range} («${clip(p.textOriginal[0] ?? "", 60)}») cu ${describeBlocks(p.blocuri, 60)}`;
}

/** Ultimele mesaje ale conversației (scurtate), cu starea modificărilor propuse. */
export function describeHistory(messages: readonly HistoryMessage[]): string {
  const recent = messages.filter((m) => m.content.trim() || m.proposals?.length).slice(-MAX_HISTORY);
  if (!recent.length) return "";
  const lines = recent.map((m) => {
    if (m.role === "utilizator") return `Utilizator${m.scope ? ` (pe textul selectat: «${scopePreview(m.scope, 120)}»)` : ""}: ${clip(m.content, MAX_HISTORY_CHARS)}`;
    const props = (m.proposals ?? []).map((p) => `  - [${STATUS[p.status]}] ${describeProposal(p)}`);
    return [`Asistent: ${clip(m.content, MAX_HISTORY_CHARS)}`, ...props].join("\n");
  });
  return `<conversatie_anterioara>\n${lines.join("\n")}\n</conversatie_anterioara>`;
}

export function buildChatRequest(input: {
  segments: readonly PromptSegment[];
  scope: ChatScope | null;
  history: readonly HistoryMessage[];
  request: string;
  title: string;
  pageBreaks?: readonly number[];
  /** fișierele de context și celelalte documente ale proiectului, deja descrise */
  projectContext?: readonly string[];
}): string {
  return [
    ...(input.projectContext ?? []),
    `Documentul „${input.title}”:`,
    describeDocument(input.segments, input.scope, input.pageBreaks),
    input.scope
      ? describeScope(input.scope, input.segments)
      : input.history.length
        ? "Acum nu există selecție: cererea privește pasajul sau subiectul discutat în conversație, dacă se referă la el; altfel tot documentul."
        : "Cererea privește tot documentul (nu există selecție).",
    // conversația chiar înaintea cererii, ca referințele („-l”, „acea porțiune”) să se lege de ea
    describeHistory(input.history),
    `<cerere>\n${input.request}\n</cerere>`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ───────────────────────── răspunsul agentului ─────────────────────────

const L = "\\p{L}";
/** verbe la persoana I care anunță o modificare („propun”, „înlocuiesc”, „voi reformula”, „am adăugat”) */
const ANNOUNCE = new RegExp(
  [
    `(?<![${L}])(?:propun|înlocuiesc|modific|reformulez|adaug|șterg|completez|inserez|transform)(?![${L}])`,
    `(?<![${L}])(?:voi|aș|pot|am)\\s+(?:să\\s+)?(?:înlocui(?:t)?|modifica(?:t)?|reformula(?:t)?|adăuga(?:t)?|șterge|șters|completa(?:t)?|propus|insera(?:t)?|transforma(?:t)?)(?![${L}])`,
  ].join("|"),
  "giu",
);
const NEGATED = /(?:^|[^\p{L}])(?:nu|niciun|nicio|n-\p{L}+)(?:[^\p{L}]+[\p{L}-]+){0,4}[^\p{L}]*$/iu;

/**
 * Răspunsul anunță o modificare („Propun să înlocuiesc…”, „Am reformulat clauza”), nu doar o
 * descrie la negativ („Nu propun nicio modificare”). Diacriticele ş/ţ cu sedilă contează ca ș/ț.
 */
export function announcesChange(text: string): boolean {
  const t = text.replace(/ş/g, "ș").replace(/Ş/g, "Ș").replace(/ţ/g, "ț").replace(/Ţ/g, "Ț");
  for (const sentence of t.split(/(?<=[.!?;:\n])\s+/)) {
    for (const m of sentence.matchAll(ANNOUNCE)) {
      if (!NEGATED.test(sentence.slice(0, m.index))) return true;
    }
  }
  return false;
}

export const MISSING_CHANGES_ERROR =
  "Răspunsul NU a fost acceptat încă: anunță o modificare, dar lista „modificari” e goală. Utilizatorul poate aplica doar modificările din listă. Apelează din nou propune_modificari cu modificările concrete (text exact din segment, sau blocuri noi); dacă valoarea exactă e incertă, propune o formulare prin trimitere la lege sau un câmp „[● …]”. Dacă de fapt nu propui nimic, reformulează răspunsul fără să anunți modificări.";

export const MISSING_TOOL_NUDGE =
  "Ai descris modificări fără să apelezi propune_modificari, deci utilizatorul nu le poate aplica. Apelează acum propune_modificari cu răspunsul și cu modificările concrete (dacă valoarea e incertă, o formulare prin trimitere la lege sau un câmp „[● …]”).";

export const MISSING_ANSWER_NUDGE = "Încheie apelând propune_modificari cu răspunsul și modificările (lista poate fi goală).";

/**
 * Ce facem după o tură fără apelul final: textul gol cere încheierea, iar un text care anunță
 * modificări cere modificările concrete; altfel textul e răspunsul (fără modificări). Null = acceptă.
 */
export function fallbackNudge(text: string): string | null {
  if (!text.trim()) return MISSING_ANSWER_NUDGE;
  return announcesChange(text) ? MISSING_TOOL_NUDGE : null;
}
