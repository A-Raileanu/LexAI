# 18 — Chat în editor (modificări aprobate de utilizator)

**Rută / context:** editorul (`/proiecte/[id]/documente/[docId]`), fila **Chat** din panoul din dreapta. · **Scop:** utilizatorul cere în cuvinte proprii o modificare („reformulează clauza de reziliere”, „uniformizează denumirea părților”) sau pune o întrebare despre document ori despre lege. AI-ul răspunde și, când e cazul, **propune** modificări. Documentul nu se schimbă până când utilizatorul nu aplică fiecare modificare. · **Ce face utilizatorul aici:** selectează (opțional) un pasaj, scrie cererea, citește răspunsul, compară textul vechi cu cel nou și aplică sau respinge fiecare modificare.

> Cererea utilizatorului: „Trebuie adăugat în editor și chat pentru a cere modificări care trebuiesc aprobate de user. Dacă am selectat text, modificările solicitate trebuie să fie doar pe textul selectat. Chatul trebuie integrat în bara din dreapta. Mărim și lățimea barei.”
>
> Rămân valabile: `00-directie.md`, panoul din `05-editor.md` (cu lățimile actualizate aici) și limbajul vizual din `08b-rezultate-analiza-revizie.md`: minimum 13 px, rânduri clare, separatoare `--divider`, text colorat doar cu tokenii `-fg`, diff-ul din 5.8. Tot de acolo păstrăm regula „aplicarea înlocuiește direct textul” (fără pas de modificare urmărită). Feedbackul „când am o problemă selectată, celelalte evidențieri scad la 50 %” se aplică și aici: o modificare în previzualizare estompează evidențierile analizei.

## Referințe analizate (≥10)

17 aplicații. Toate capturile au fost deschise și citite din imagine.

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Grammarly | [ecran](https://mobbin.com/screens/b727d76e-6475-4a20-a8bd-d0ad05569b30) | Cardul arată fragmentul în context, cu cuvântul șters tăiat. Dedesubt: „Accept” (primar), „Dismiss” și „⋯”. Cât cardul e deschis, pasajul e subliniat și în document. | Lipsește „Accept all”. Categoriile colorate (Correctness, Clarity…) încarcă panoul. |
| 2 | Grammarly | [ecran](https://mobbin.com/screens/471e731a-630a-45f0-becb-8990c3176bfd) | Asistentul e o filă în capul panoului, lângă sugestii. Starea goală are o întrebare și trei idei scurte, iar câmpul de scris stă jos. | Varianta [extinsă](https://mobbin.com/screens/ef979bb7-21f8-4d5d-91e8-309385afe2cc), cu ~15 prompturi, copleșește. |
| 3 | Confluence | [ecran](https://mobbin.com/screens/048344a5-3f3c-4740-b41f-c8ca1e34b23f) | Contextul cererii e un cip eliminabil („Change tone to professional ×”). Acțiunile sunt clare: Discard / Replace. Avertismentul „Uses AI. Verify results.” e scurt. | Popover-ul acoperă textul. Rezultatul e tot textul rescris, fără diff, deci nu vezi ce s-a schimbat. |
| 4 | Notion | [ecran](https://mobbin.com/screens/7e25606f-869e-4867-8400-cfac83d7e1b1) | Chatul stă în panoul din dreapta. Mesajul utilizatorului e un balon gri, aliniat la dreapta. Răspunsul e text simplu, fără balon. | „Suggested revision” e text simplu, fără buton de aplicare. |
| 5 | Notion | [ecran](https://mobbin.com/screens/e173b891-b6af-4af8-9a64-532d1fbfec29) | Modificările sunt grupate sub răspuns, iar acțiunea de salvare stă fix lângă câmpul de scris. | Diferențele apar abia după „Show changes”. Avocatul vrea să le vadă direct. |
| 6 | Coda | [ecran](https://mobbin.com/screens/8afc95c3-c1be-431e-a1eb-8db4ceb86593) | Domeniul „Selection” e explicit. Starea goală are butoane de prompt („Summarize”, „Give me feedback”). | Domeniul se alege în două locuri (segmente și dropdown). La noi e un singur cip. |
| 7 | Fabric | [ecran](https://mobbin.com/screens/b392bc22-bf75-4b35-be0a-ae58de609dc2) | Filele panoului (Comments / Info / Ask) au chatul ca filă. Cipul de context („Current file”) stă în câmpul de scris. | Rândul de cipuri de sugestii e tăiat pe orizontală. |
| 8 | Semrush | [ecran](https://mobbin.com/screens/d5fa9c73-0fbd-4b6e-9d7a-b7fa36e54a2c) | Panoul „AI chat” are o acțiune de golire a conversației în antet. | La „rewrite” răspunde cu text de copiat, fără aplicare în document. |
| 9 | Microsoft Copilot | [ecran](https://mobbin.com/screens/8b77f912-1c9c-4efc-813c-aad036488111) | Antet sobru, separator de zi și buton „↓” pentru salt la ultimul mesaj. [Starea goală](https://mobbin.com/screens/e359db96-9980-4d1a-9a75-1ccd8037c328) spune în trei puncte ce poate face. | Avertismentul se suprapune peste răspuns. |
| 10 | Langdock | [ecran](https://mobbin.com/screens/7c1c4ec7-4d53-4625-9310-e9cde1b4417b) | Pasajul vizat e evidențiat în document. Pașii agentului („Read …”) sunt vizibili în chat. | Două câmpuri de cerere (în document și în chat). |
| 11 | Langdock | [ecran](https://mobbin.com/screens/579fb137-50fa-42d0-9222-4970f35648d5) | În timpul generării, butonul de trimitere devine **Stop** (pătrat). | Tot documentul devine schelet gri și nu mai poate fi citit. |
| 12 | Obvious | [ecran](https://mobbin.com/screens/0f5a43f5-12a4-4bab-b79a-2c90f83a7ce8) | Eroarea e o bandă discretă lângă câmpul de scris, cu „Retry”. | Mesajul generic nu spune ce a eșuat. |
| 13 | Obvious | [ecran](https://mobbin.com/screens/1f36e597-7677-4b85-a4bb-9a3825820cec) | Selecția din document rămâne evidențiată cât timp lucrezi în chat. | Meniul plutitor de pe selecție dublează chatul. |
| 14 | Lightfield | [ecran](https://mobbin.com/screens/99d01dcd-a6c6-4a51-8e61-b202b1fe08af) | Cere confirmare înainte de scriere. Pașii apar ca rânduri scurte, iar eroarea e inline, cu „Retry”. | Pașii în curs, estompați, arată ca dezactivați. |
| 15 | Google AI Studio | [ecran](https://mobbin.com/screens/7b4e8430-808c-4720-a543-2a5a528b940c) | Răspunsul afișează durata („Ran for 46s”) și are acțiuni de restaurare. | Eroarea e o casetă gri fără reîncercare. |
| 16 | Descript | [ecran](https://mobbin.com/screens/70417483-5f13-428a-85f3-124185470745) | Diff la nivel de cuvânt, citibil în flux. | Gri pe gri, cu contrast slab. |
| 17 | Devin | [ecran](https://mobbin.com/screens/e48cb198-fd26-4a92-b17a-a988aa5cbef8) | Fiecare bloc se aprobă separat, cu roșu/verde și contoare. | Diff-ul pe linii, alăturat: prea lat și „de cod” pentru 440 px. |
| 18 | Dropbox Dash | [ecran](https://mobbin.com/screens/47b713f0-ddcf-42a6-a7ec-e1ddfd45eb04) | Chatul și documentul stau alăturate, cu textul vizat evidențiat ([ecran](https://mobbin.com/screens/0680af21-bd55-4b98-bf02-c2805815585d)). | AI-ul cere de două ori textul de rescris: selecția nu ajunge în context. Cipul nostru de selecție rezolvă exact asta. |
| 19 | Asana | [ecran](https://mobbin.com/screens/a7c7d26a-be3a-4cfa-aef0-8c5688f18034) | Înlocuirea conținutului se confirmă explicit („Replace existing content?”). | Înlocuire în bloc. Noi aplicăm granular, pe modificări. |

## Tipare comune

- **Chatul e o filă a panoului din dreapta**, nu un popover peste text: Grammarly, Fabric, Notion, Copilot, Semrush. Popover-ele (Confluence, Obvious) acoperă exact textul discutat.
- **Utilizatorul: balon gri la dreapta. AI: text simplu la stânga** (Notion, Copilot, Dropbox Dash, Obvious). Răspunsul AI nu are casetă.
- **Contextul e un cip în câmpul de scris**, eliminabil cu ×: Confluence, Fabric, Coda. Fără el, AI-ul cere textul din nou (Dropbox Dash).
- **Selecția rămâne vizibilă în document** cât lucrezi în chat (Obvious, Langdock, Dropbox Dash).
- **Modificarea se arată ca diff la nivel de cuvânt**, cu acțiuni pe fiecare: Grammarly (Accept / Dismiss), Devin (pe bloc), Descript (în flux). „Aplică toate” n-am găsit într-un chat; îl adăugăm, ca la „Acceptă toate” din `05`.
- **Legătura cu documentul:** cardul deschis subliniază pasajul în document (Grammarly). Nicio aplicație nu face asta la hover pe card, așa că îl proiectăm noi, după modelul constatărilor din 08b.
- **Progresul:** pașii agentului ca rânduri scurte (Langdock, Lightfield), durata (AI Studio), iar butonul de trimitere devine Stop (Langdock).
- **Starea goală:** 3–4 sugestii scurte, nu o listă lungă (Grammarly, Coda, Fabric). Plus o frază despre ce poate face (Copilot).
- **Erorile:** inline, lângă locul unde contează, cu „Reîncearcă” (Obvious, Lightfield).

## Decizia de layout

### Panoul: lățime și file

- **Lățimea crește:** implicit **440 px** (era 360), minimum **360** (era 300), maximum **720** (era 560). Pe 1440 px, foaia A4 (794 px) încape lângă panoul de 440 px. Peste 560 px, utilizatorul poate lucra cu panoul lat când citește conversații lungi.
- **Migrarea lățimii salvate:**
  - Lățimea se reține ca până acum, dar sub o cheie nouă (`lexai-editor-layout-v2`).
  - La prima deschidere se citește lățimea veche. Dacă panoul era deschis și mai îngust de 440 px (practic, vechiul implicit de 360), pornește la 440 px.
  - Un panou mai lat rămâne cum era, iar unul închis rămâne închis.
- **Foaia (`Sheet`) pe ecran îngust:**
  - 1024–1279 px și tabletă: din dreapta, `min(30rem, 100vw)` (era 26rem).
  - Telefon: rămâne foaia de jos, de 85 % din înălțime.
- **File:** `Constatări · [De completat] · Chat · Istoric`. Chatul vine după munca de verificare și înaintea istoricului. Fila e aceeași pentru documentele încărcate și cele generate.
- **Fără chipul 5h/7z în antetul panoului** (cerut explicit de utilizator). Consumul apare doar în pagina Utilizare, ca la celelalte joburi.

```
┌────────────────────── panou 440 px ───────────────────────┐
│ Constatări   Chat   Istoric                             ✕ │ 40 px (filele existente)
├────────────────────────────────────────────────────────────┤
│ Conversația documentului                               ⋯  │ 40 px · 13 fg-2 · meniu: Șterge conversația
├────────────────────────────────────────────────────────────┤ border-divider
│                           ┌──────────────────────────────┐ │
│                           │ ┃ „Locatarul poate rezilia…” │ │ selecția trimisă: 13 fg-2, bară stângă
│                           │ Reformulează ca pact         │ │ balon utilizator: bg-muted, 14/22
│                           │ comisoriu de gradul IV.      │ │
│                           └──────────────────────────────┘ │
│                                                            │
│ Am reformulat clauza ca pact comisoriu expres: rezilierea  │ răspuns AI: text simplu 14/22
│ operează de drept, fără punere în întârziere.              │
│                                                            │
│ Modificări propuse · 2              [ Aplică toate (2) ]   │ 13 semibold fg-2 · Button outline sm
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Art. 7                                       în așteptare│ 13 fg-3 (locatorul, clic = arată în document)
│ │ Locatarul poate ░rezilia contractul░ ▒considera        │ │ diff serif 15/24 (08b 5.8)
│ │ contractul reziliat de drept▒ dacă…                    │ │
│ │ Clauza devine pact comisoriu de gradul IV.             │ │ explicație 14/22 fg-2
│ │ [ Aplică ]  Respinge                                   │ │ Button sm · ghost sm
│ └────────────────────────────────────────────────────────┘ │ card: rounded-xl, inset-ring divider
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Art. 7                                    ✓ Aplicată   │ │ după aplicare: eticheta verde (-fg) + „Anulează”
│ │ …                                                      │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ ◌ Citesc art. 1.553 C. civ. pe Portalul Legislativ · 12 s  │ în curs: spinner + ultimul pas + timp scurs
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │ compozitor (card, inset-ring divider)
│ │ [▤ Doar textul selectat: „Locatarul poate rez…” ✕]     │ │ cip 13 px, apare doar cu selecție
│ │ Ce schimb în textul selectat?                          │ │ Textarea 14/22, 2–8 rânduri
│ │                                                        │ │
│ │ Enter trimite · Shift+Enter rând nou            (↑)    │ │ 13 fg-3 · buton rotund 32 px (■ în timpul rulării)
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Mesajele

- **Utilizatorul:** balon `bg-muted` (`dark:bg-accent`), `rounded-xl`, aliniat la dreapta, cel mult 85 % din lățime, text 14/22.
  - Dacă cererea a avut o selecție, deasupra textului apare citatul selecției: 13/20, `fg-2`, cu bară stângă de 2 px `--divider`, trunchiat la 2 rânduri. Așa se vede mereu la ce text s-a referit cererea.
- **AI-ul:** text simplu 14/22, fără balon și fără avatar. Paragrafele se despart prin rând liber, iar liniile „- ” devin listă.
- **Fără nume, ore și avatare** pe fiecare mesaj. Ora apare doar în tooltip-ul titlului (`title`). Conversația e una pe document, cronologică.
- **Istoricul se păstrează** pe document (tabela `chat_messages`) și se reîncarcă la redeschidere. Se golește doar din `⋯ → Șterge conversația` (AlertDialog).

### Modificările propuse

- Se afișează **sub răspunsul care le-a propus**, **în ordinea din document**, cu antetul „5 modificări propuse” (13 semibold `fg-2`; „1 modificare propusă”, „21 de modificări propuse”). La ≥ 2 modificări în așteptare apare și „Aplică toate (n)” (Button outline sm).
- **O cerere poate schimba documentul în mai multe locuri:** agentul propune câte o modificare pentru fiecare loc sau bloc (nu se oprește la prima apariție și nu unește modificări îndepărtate). Felurile se pot amesteca în același răspuns (o corectură în Art. 3, un paragraf nou după Art. 4, un tabel în Art. 9). Cel mult 50 de propuneri pe răspuns.
- **Cardul unei modificări** (`rounded-xl`, `inset-ring` 1 px `--divider`, `p-3`, `gap-2`):
  1. **Rândul de sus:** locatorul („Art. 7”, „§ 12”, ca în 08b) și starea, aliniată la dreapta: „în așteptare” `fg-3` · „✓ Aplicată” `v-corect-fg` · „Respinsă” `fg-3`.
     - Locatorul e buton: derulează documentul la pasaj și îl evidențiază. Pe ecran îngust, închide întâi foaia.
  2. **Conținutul**, după felul modificării (vezi „Modificări structurale” mai jos). Pentru textul dintr-un paragraf, **diff-ul**, cu componenta `Diff` din analiză (`suggestion-view.tsx`):
     - serif 15/24;
     - șters: tăiat, pe fundal `v-eroare-bg`;
     - adăugat: subliniat, pe fundal `v-corect-bg`;
     - maximum 60 de caractere de context de fiecare parte (`suggestionDiff`).
  3. **Explicația:** 14/22, `fg-2`, o frază.
  4. **Acțiunile:** „Aplică” (primar sm), „Respinge” (ghost sm).
     - După aplicare: „Anulează” (ghost sm).
     - După respingere: „Reconsideră” (ghost sm), care readuce modificarea în așteptare.
### Modificări structurale

Pe lângă înlocuirea unui pasaj dintr-un paragraf (`text`), agentul poate propune:

| Fel | Ce face | Locatorul | Cardul |
|---|---|---|---|
| `formatare` | doar formatarea unui pasaj existent: aldin, cursiv, subliniat, tăiat (aplică sau scoate); textul rămâne | „Art. 2” | „Formatare: îngroșat”, apoi pasajul în context, randat deja cu formatarea nouă (fără diff roșu / verde) |
| `inserare` | blocuri noi după / înainte de blocul (paragraf, tot tabelul, toată lista) care conține paragraful-ancoră | „După Art. 4”, „Înainte de Art. 12” | „Adaugă un paragraf”, apoi blocurile noi randate |
| `inlocuire_blocuri` | paragrafe consecutive întregi înlocuite cu blocuri noi (ex. calendarul din Art. 9 devine tabel) | „Art. 9” (sau „Art. 9 – Art. 10”) | „Înlocuiește 3 paragrafe cu un tabel”, textul vechi tăiat (restrâns la 2 rânduri, „Tot textul înlocuit”), apoi blocurile noi |
| `stergere_blocuri` | paragrafe consecutive întregi șterse (doar la cerere) | „Art. 9” | „Șterge 2 paragrafe” + textul tăiat |

- **Formatare, nu markdown:** editorul nu interpretează markdown, deci în document nu ajung niciodată „**”, „*” sau „#”. Îngroșarea / cursivul unui text existent e o propunere `formatare` (mark-uri pe intervalul exact, în aceeași tranzacție cu celelalte, anulabilă; detectarea textului schimbat ca la `text`). În textul nou (al unei modificări de text sau al blocurilor) se acceptă doar `**aldin**` și `*cursiv*`, transformate în mark-uri la aplicare și în previzualizare („Cu formatare: …” sub diff). Un „**” fără pereche e refuzat; un „*” singur care nu deschide sau nu închide o pereche („art. 5*”, „2 * 3”) rămâne literal. O modificare de text care schimbă doar formatarea și „#” pentru titluri sunt refuzate, cu trimitere la `formatare` / blocul `titlu`.
- **Blocurile noi** vin de la agent într-un format compact (paragraf, titlu 1–4, listă cu buline / numerotată, tabel cu antet și rânduri, salt de pagină), cu **aldin** și *cursiv* ca singură formatare. Codul le validează și le transformă în JSON-ul documentului; agentul nu scrie HTML sau JSON.
- **Previzualizarea în card:** paragrafele și titlurile în serif 15/24, listele ca liste, tabelul ca tabel real (13 px, bordură `--divider`, antet pe `bg-muted`; primele 8 rânduri + „Încă n rânduri”; un tabel lat derulează orizontal în card, nu în panou), saltul de pagină ca marcajul discret din editor („Salt de pagină” pe o linie punctată). Blocurile noi au o bară stângă de 2 px `v-corect-fg` la 50 %.
- **Aplicarea:** blocurile noi primesc `segId`-uri noi; paragrafele simple preiau alinierea (dacă nu e centrat / dreapta), indentarea, interlinia, spațierea și fontul paragrafului-ancoră (titlurile, doar fontul); tabelele au atributele implicite ale editorului (lățime întreagă, borduri). Evidențierile analizei de pe paragrafele neatinse rămân valabile.
- **Documentul schimbat:** o înlocuire / ștergere se aplică doar dacă paragrafele sunt încă acolo, consecutive, cu exact textul de la propunere. Altfel: „Paragrafele vizate s-au schimbat de la propunere. Cere din nou modificarea.” O inserare se aplică dacă paragraful-ancoră există („Paragraful lângă care se inserează nu mai există în document. …”).
- **„Anulează”** scoate blocurile noi și readuce paragrafele vechi, dacă blocurile noi n-au fost editate între timp; altfel toast-ul trimite la `⌘Z`.
- **Validarea (în cod, erorile se întorc agentului):** ancora și paragrafele există; cele înlocuite sunt consecutive și acoperă blocuri întregi (un tabel sau o listă se înlocuiește doar întreagă); începutul primului paragraf, citat de agent, se potrivește exact; tabelele au același număr de celule pe rând, cel mult 12 coloane și 200 de rânduri; fără blocuri goale; fără două salturi de pagină la rând (nici lângă unul existent), fără salt la începutul sau la sfârșitul documentului, iar o înlocuire nu pune doar un salt de pagină în locul textului. Propunerile nu se suprapun: același pasaj, aceleași paragrafe înlocuite de două ori, text sau ancoră într-un paragraf înlocuit, două inserări în același loc.
- **Cu text selectat:** o inserare e permisă doar lângă un paragraf din selecție; o înlocuire / ștergere, doar pe paragrafe din selecție (primul și ultimul pot fi selectate parțial: înlocuirea paragrafelor selectate cu un tabel e permisă).
- **Salturi de pagină:** „Pune anexa pe o pagină nouă” → salt de pagină înaintea titlului anexei; „Adaugă la final o pagină nouă cu …” → salt de pagină + blocurile noi după ultimul paragraf.

- **Modificările respinse** au diff-ul la 60 % opacitate. Nu dispar: avocatul vede ce a refuzat, iar AI-ul primește starea lor în tura următoare.
- **Aplicarea** (aceeași regulă ca la analiză: „dacă aplic, nu mai accept în editor”):
  - textul se înlocuiește direct, într-o singură tranzacție, anulabilă cu `⌘Z`;
  - starea devine „aplicată” și se salvează pe server;
  - toast 6 s: „Modificare aplicată în document.” + „Anulează” (readuce textul și starea „în așteptare”).
- **„Aplică toate”:**
  - aplică toate modificările în așteptare ale răspunsului într-o **singură** tranzacție (un singur `⌘Z`);
  - toast: „3 modificări aplicate în document.” + „Anulează”;
  - dacă unele nu se mai potrivesc, se aplică restul, iar cele rămase primesc mesajul de mai jos; toast-ul le numește („Nu s-au aplicat 2: Art. 3, După Art. 4. Documentul s-a schimbat acolo.”).
- **Pasajul s-a schimbat între timp:**
  - Modificarea se aplică dacă textul original e încă la aceeași poziție sau apare o singură dată în paragraf.
  - Altfel nu se aplică nimic. Sub card apare, în `v-eroare-fg`, 13/20: „Textul din document s-a schimbat de la propunere. Cere din nou modificarea.”
- **Nicio modificare nu se aplică automat**, nici la răspunsuri cu o singură modificare.

### Legătura cu documentul (previzualizare)

- **Hover sau focus pe un card** în așteptare (sau respins):
  - ținta primește imediat o decorație (nu mark): pasajul — contur de 1 px `foreground` și fundal `v-corect-bg`; paragrafele înlocuite / șterse — contur și fundal de șters; locul unei inserări — o linie verde de 2 px sub (sau deasupra) blocului vecin, fără să mute textul;
  - restul evidențierilor analizei scad la **50 %** (aceeași regulă ca la constatarea selectată în 08b);
  - **documentul derulează la țintă** (schimbare cerută de utilizator; înainte, hover-ul doar contura): după o intenție de ~250 ms pe card (anulată la ieșire, ca trecerea mouse-ului peste listă să nu sară documentul), centrat dacă încape, altfel de sus. Nu derulează dacă ținta se vede deja întreagă. Cât lista panoului derulează, hover-ul e ignorat. Focusul de la tastatură derulează imediat. Neted, sau instant cu `prefers-reduced-motion`. Pozițiile vin din documentul randat, deci țin cont de paginare. Se aplică tuturor felurilor: text, blocuri inserate, înlocuiri, salturi de pagină.
- **Clic pe locator:** previzualizare + derulare imediată la țintă, chiar dacă se vede.
- Previzualizarea dispare la ieșirea de pe card.

### Selecția și domeniul cererii

- **Cu text selectat în document**, în compozitor apare cipul `▤ Doar textul selectat: „primele ~40 de caractere…” ✕`.
  - Are tooltip cu numărul de caractere și de paragrafe.
  - Placeholder-ul devine „Ce schimb în textul selectat?”.
- **Selecția rămâne evidențiată în document** cât timp focusul e în chat. Decorația are fundalul selecției (`--selection` / `color-mix(foreground 12 %)`), ca utilizatorul să vadă ce trimite.
- **✕ scoate cipul** pentru selecția curentă: cererea se referă atunci la tot documentul. O selecție nouă îl readuce. Clic în document fără selecție îl face să dispară.
- **Cererea trimisă cu selecție** poartă domeniul: paragrafele (segId) și pozițiile de început și de sfârșit din fiecare.
  - Agentul primește tot documentul pentru context, plus selecția marcată separat.
  - Instrucțiunea: modifică **doar** textul selectat.
  - Codul respinge orice modificare din afara selecției și trimite eroarea înapoi agentului (ca la `raporteaza_constatare`).

### Progres, oprire, erori

- **În curs:** în locul răspunsului apare un rând cu `Spinner`, ultimul pas al agentului și timpul scurs (cifre tabulare, „12 s”). Primul pas e „Citesc documentul”, apoi pașii instrumentelor (ex. „Citesc art. 1.553 din Codul civil”).
  - Nu avem streaming de text: răspunsul vine complet, odată cu modificările validate. Așa nu afișăm propuneri pe care validarea le-ar respinge.
- **Stop:** butonul de trimitere devine `■` „Oprește” (Tooltip). Răspunsul oprit rămâne în conversație ca „Oprit.” (13 `fg-3`), cu „Reîncearcă”.
- **Eroare:** rând inline, `v-eroare-fg` 13/20: „Nu am putut răspunde.” + motivul scurt + „Reîncearcă”. Reîncercarea folosește aceeași cerere (același mesaj, același domeniu).
- **Conversația continuă și dacă închizi panoul sau pagina.** Jobul rulează în worker, iar la redeschidere progresul se reia (SSE cu `after`).
- **Un singur răspuns în curs pe document.** Cât rulează, compozitorul rămâne editabil, dar trimiterea e înlocuită de Stop.

### Starea goală

```
│                                                            │
│   ✦  Cere o modificare sau pune o întrebare                │ 15/22 semibold
│   Modificările propuse apar ca diferențe. Documentul nu    │ 14/22 fg-2
│   se schimbă până nu le aplici.                            │
│                                                            │
│   ▸ Reformulează clauza de reziliere ca pact comisoriu.    │ butoane ghost, 14 px, stânga, pe toată lățimea
│   ▸ Uniformizează denumirea părților în tot documentul.    │
│   ▸ Verifică dacă termenul de preaviz respectă legea.      │
│   ▸ Corectează diacriticele și punctuația.                 │
│                                                            │
│   Răspunsurile pot conține erori; verifică înainte să      │ 13 fg-3
│   aplici.                                                  │
```

Clic pe o sugestie o pune în compozitor (nu o trimite), ca utilizatorul să o poată adapta.

## Tastatură

| Tastă | Acțiune |
|---|---|
| `⌘J` | Deschide panoul pe fila Chat și pune focusul în compozitor. Dacă în document e selectat text, cipul apare deja. (`⌘J` e liber în editor; Notion folosește aceeași tastă pentru AI.) |
| `Enter` | Trimite. Nu trimite în timpul compunerii IME. |
| `⇧Enter` | Rând nou |
| `Esc` în compozitor | Readuce focusul în document, cu selecția intactă |
| `Tab` | compozitor → carduri (Aplică / Respinge) în ordinea conversației |

`⌘J` se adaugă în lista de scurtături (`shortcuts-dialog.tsx`, grupul „Document”).

## Ecran îngust

- **< 1280 px:** panoul e foaie din dreapta, de `min(30rem, 100vw)`. `⌘J` o deschide pe fila Chat. Clic pe locator închide foaia și derulează la pasaj.
- **< 768 px:** foaia de jos (85 % din înălțime). Compozitorul rămâne lipit jos (`pb-(--bleed)`). Cipul de selecție se trunchiază la o linie.
- Cardurile nu au layout pe coloane, deci încap fără derulare orizontală de la 320 px.

## Componente HextaUI

| Nevoie | Componentă |
|---|---|
| Fila | `Tabs` existente (`TabsTrigger value="chat"`) |
| Lista mesajelor | `div` cu `overflow-y-auto`; derulare automată la ultimul mesaj când apare unul nou |
| Compozitorul | `Textarea` (`autoResize`, 2–8 rânduri), `Button size="icon-sm"` pentru trimitere / oprire, `Tooltip` + `Kbd` |
| Cipul de selecție | `span` 13 px cu `Button variant="ghost" size="icon-xs"` pentru ✕ |
| Modificările | `Diff` + `suggestionDiff` din analiză; `Button` sm / ghost sm |
| Meniul conversației | `DropdownMenu` + `AlertDialog` („Ștergi conversația?”) |
| Progres | `Spinner` |
| Notificări | `toast` cu `action` „Anulează”, 6 s, una singură activă |

Nu folosim `Badge` și nici `text-xs` în panou (08b).

## Microcopy (RO)

| Loc | Text |
|---|---|
| Filă | „Chat” |
| Antet | „Conversația documentului” · meniul `⋯`: „Șterge conversația” |
| Confirmare ștergere | „Ștergi conversația?” · „Mesajele și modificările propuse dispar din acest document. Textul documentului rămâne cum e.” · „Renunță” / „Șterge” |
| Gol | „Cere o modificare sau pune o întrebare” · „Modificările propuse apar ca diferențe. Documentul nu se schimbă până nu le aplici.” · „Răspunsurile pot conține erori; verifică înainte să aplici.” |
| Sugestii | „Reformulează clauza de reziliere ca pact comisoriu de gradul IV.” · „Uniformizează denumirea părților în tot documentul.” · „Verifică dacă termenul de preaviz respectă legea.” · „Corectează diacriticele și punctuația.” |
| Compozitor | placeholder „Cere o modificare sau pune o întrebare…” / „Ce schimb în textul selectat?” · „Enter trimite · Shift+Enter rând nou” · tooltip „Trimite” / „Oprește” |
| Cip | „Doar textul selectat: „…”” · ✕ aria „Scoate selecția din cerere” · tooltip „{n} caractere din {m} paragrafe” |
| În curs | „Citesc documentul” · „Pregătesc răspunsul” · pașii instrumentelor |
| Modificări | „n modificări propuse” · „Formatare: îngroșat” / „fără cursiv” · „Cu formatare:” · „Aplică toate (n)” · „După Art. 4” / „Înainte de Art. 4” · „Adaugă un paragraf” · „Înlocuiește 3 paragrafe cu un tabel” · „Șterge 2 paragrafe” · „Tot textul înlocuit” / „Restrânge textul înlocuit” · „Încă n rânduri” · „Salt de pagină” · „Aplică” · „Respinge” · „Anulează” · „Reconsideră” · stări „în așteptare” / „Aplicată” / „Respinsă” |
| Toast | „Modificare aplicată în document.” · „n modificări aplicate în document.” · „Modificare respinsă.” · acțiune „Anulează” |
| Erori | „Textul din document s-a schimbat de la propunere. Cere din nou modificarea.” · „Paragrafele vizate s-au schimbat de la propunere. Cere din nou modificarea.” · „Paragraful lângă care se inserează nu mai există în document. Cere din nou modificarea.” · „Nu s-au aplicat n: … Documentul s-a schimbat acolo.” · „Nu am putut răspunde.” · „Oprit.” · „Reîncearcă” · „Nu am putut readuce textul original; folosește ⌘Z în document.” |

## Model de date și flux (pentru implementare)

- **Tabela `chat_messages`:** `id`, `document_id` (FK cu ștergere în cascadă), `role` (`utilizator` / `asistent`), `content`, `scope` (JSON), `proposals` (JSON, cu starea fiecăreia: `propusa` / `aplicata` / `respinsa`), `job_id`, `created_at`.
- **Jobul `chat`:** worker-ul citește forma de lucru a documentului (ciorna sau versiunea curentă). Clientul salvează întâi ciorna, ca textul să fie cel de pe ecran.
- **Contextul agentului:** documentul pe segmente (cu „(listă)”, „(tabel)”, „(titlu)” și salturile de pagină marcate), selecția și ultimele 12 mesaje (scurtate). Primește și instrumentele surselor legislative, plus `propune_modificari { raspuns, modificari[] }`; fiecare modificare are `tip` (`text` / `inserare` / `inlocuire_blocuri` / `stergere_blocuri`).
- **Propunerile salvate** (`packages/core/src/chat`): `kind` lipsă sau `text` = `{ segmentId, start, textOriginal, textNou }` (propunerile vechi rămân valabile); `formatare` = `{ segmentId, start, textOriginal, stiluri: { bold?, italic?, underline?, strike? } }`; `inserare` = `{ segmentId (ancora), pozitie, blocuri }`; `inlocuire_blocuri` / `stergere_blocuri` = `{ segmentId, segmentIds, textOriginal: string[], blocuri }`. Toate au `id`, `explicatie`, `status`.
- **Validarea, în cod:**
  - `text_original` apare exact în segment și o singură dată în domeniu;
  - modificarea e în interiorul selecției;
  - modificările nu se suprapun;
  - `text_nou` nu conține rânduri noi;
  - pentru modificările structurale, regulile din „Modificări structurale”;
  - un răspuns care anunță o modificare („propun să înlocuiesc…”) are și modificarea în listă.

  Erorile se întorc agentului cu `isError`, ca să le corecteze.
- **Modelul:** cel din Setări, cu `effort: low`. Consumul se înregistrează pe etapa „chat”.

## Decizii pentru întrebările deschise

| Întrebare | Decizie |
|---|---|
| Aplicare automată când e o singură modificare? | Nu. Orice modificare se aprobă explicit. |
| Text nou cu paragrafe noi? | Da (v2, cerut de utilizator: „Fă-l ca pe un tabel” → „Da, extinde-l”): inserări, înlocuiri și ștergeri de blocuri — paragrafe, titluri, liste, tabele, salturi de pagină — tot cu aprobare pe fiecare. Vezi „Modificări structurale”. |
| Răspuns care anunță o modificare fără s-o propună? | Nu se acceptă: codul cere agentului modificările concrete (o formulare prin trimitere la lege sau un câmp „[● …]” când valoarea e incertă). |
| Streaming de text? | Nu. Pașii agentului + răspunsul complet, validat. |
| Previzualizare la hover cu derulare? | Da (schimbare cerută de utilizator): derulare după ~250 ms de hover, doar dacă ținta nu se vede; clic pe locator derulează imediat. |
| Chipul 5h/7z în panou? | Nu (cerut explicit). |
