# 10 — Generare și temeiuri

**Rută / context:** editorul documentului nou creat (`/proiecte/[id]/documente/[docId]`), deschis imediat după „Generează documentul” din asistent (09). Faza A: generarea rulează (job de fundal, supraviețuiește reload-ului). Faza B: draftul e gata, panoul lateral are filele „Temeiuri” și „De completat” · **Scop:** să arate cum se construiește documentul (ce legi au fost cercetate, ce secțiuni sunt scrise), apoi să permită verificarea fiecărei clauze față de norma care o susține și completarea câmpurilor rămase · **Ce face utilizatorul aici:** urmărește generarea sau pleacă și revine, citește draftul, deschide temeiul fiecărei clauze cu dovada din textul oficial, marchează ce a verificat, completează `[● …]` direct din panou, exportă când nu mai rămâne nimic de completat.

## Referințe analizate (≥10)
| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Jasper | [ecran](https://mobbin.com/screens/7fd33dc4-7902-46dd-844d-5bf712a738ce) | În stânga, planul agentului ca listă de pași cu sub-pași și chip-uri („Optimizing for: Authenticity…”, „Creating Brand story”); în dreapta, documentul care se scrie live, cu un cursor etichetat „Jasper” la capătul textului. Exact relația panou ↔ foaie pe care o vrem. | Chenarul gradient mov în jurul documentului; textul „Jasper is making magic…”. |
| 2 | Perplexity | [flux](https://mobbin.com/flows/690c4fa0-ac8a-4805-a536-51c685917a6d) | Raport generat: în stânga „Reviewed 20 sources ›” + cardul documentului; în dreapta documentul paginat („1 / 10”), cu font serif și referințe numerotate [4] în text; fila „Links” cu sursele. Model pentru „Acte cercetate” + foaia A4 serif. | Rezumatul lung în chat care repetă documentul. |
| 3 | ChatGPT | [flux](https://mobbin.com/flows/a5de6a0c-30a2-4246-a291-aa6453a2b410) | Cercetare lungă: panou cu comutator „Activity / 23 Sources”, linii de activitate în timp real, la final „Research completed in 5m · 23 sources · 63 searches” lipit de răspuns; posibilitatea de a lucra în altă parte între timp („Multitasking”). | Toast-ul „Multitasking” care acoperă conținutul. |
| 4 | ChatGPT | [ecran](https://mobbin.com/screens/73833b79-1dd5-4354-8fc4-a2e99c33a75e) | Fila „Citations”: favicon + domeniu, titlu bold pe două rânduri, fragment gri dedesubt; în text, chip-uri mici cu domeniul sursei. Forma listei de surse pentru temeiuri. | Chip-urile de sursă puse în mijlocul frazelor, care rup lectura. |
| 5 | WRITER | [ecran](https://mobbin.com/screens/4a222df9-9ae9-40a0-972f-b0be9bfaa12f) | Panou „Sources” cu carduri (domeniu, titlu, extras de 2–3 rânduri); chip „Plan: complete task”; blocul rezultatului cu badge „Complete” și secțiunile numerotate 1–6. Model pentru „Secțiuni scrise”. | Bannerul de trial; butoanele de feedback „Nailed it / Missed the mark”. |
| 6 | Microsoft Copilot | [ecran](https://mobbin.com/screens/1237f093-16a3-4de7-b4db-8872a4d2481c) | Pagină editabilă cu note de tip [^1] la finalul afirmațiilor și buton „Sources” în bara de sus; panou de conversație separat. Varianta discretă de a lega textul de surse. | Notele brute „[^1]” afișate ca text — la noi trebuie să fie marcaje reale, clicabile. |
| 7 | HubSpot | [flux](https://mobbin.com/flows/1a932f05-d002-46ec-b9a9-22cf5c33f57b) | Ecran de generare simplu: stepperul rămâne sus (ultimul pas activ), centru „Generating website” + o linie, notă jos „Check AI-generated content for bias and inaccuracy”. Nota de responsabilitate pusă la momentul potrivit. | Steluța magenta și copy-ul „Preparing a symphony of words…”. |
| 8 | PandaDoc | [ecran](https://mobbin.com/screens/8a2b1de4-2a08-4bf7-8bc7-97819cb9d41b) | Mod de completare: bară sus „9 fields required” + „Finish”; etichetă galbenă „Next” în marginea stângă care indică următorul câmp; câmpurile obligatorii goale au fundal roșu pal. Modelul pentru `[● …]` în document. | Roșul pe câmpurile încă necompletate (nu sunt erori, sunt de făcut). |
| 9 | Whop | [ecran](https://mobbin.com/screens/11c1db5a-5a81-4f39-8722-de70adf6a925) | „You're missing a few things”: listă scurtă cu cerc gol / bifă, elementele gata tăiate și estompate. Stilul listei „De completat”. | Modalul care blochează; aici lista stă în panou. |
| 10 | Vanta | [ecran](https://mobbin.com/screens/81eef2c5-a55a-481a-adb0-f6f0ab257226) | Controale grupate pe secțiuni (CC 1.0 › CC 1.1), fiecare rând: titlu + descriere de o frază + „Evidence readiness 2/2” cu inel de progres + responsabil. Modelul notei de conformitate pe clauze. | Coloanele de responsabil și iconițele de link fără etichetă (aplicația e cu un singur utilizator). |
| 11 | Lovable | [ecran](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6) | „Detected Issues” cu filtre „1 Warning / All”, rând cu badge „Warning” + titlu, extindere pe loc cu cod scurt, explicație și „Ignore Issue”; „Try to Fix All”. Model pentru extinderea unei clauze „de verificat”. | Butonul „Try to Fix All” — corecturile în masă pe un act juridic sunt riscante. |
| 12 | Turo | [ecran](https://mobbin.com/screens/1da7e13a-881d-4843-b2f4-ccce79fa25c7) | Carduri de cerință cu titlu + iconiță info, o frază de explicație, badge de stare în dreapta sus („Up to date”, „Need 10 more trips”) și acțiune jos („View trip ratings”). Cardul de temei deschis. | Spațiul alb foarte mare între carduri. |
| 13 | Base44 | [ecran](https://mobbin.com/screens/89946769-4d5e-4396-8667-e4523690e0ce) | Rezumat de pregătire pe o scală („Not Ready → Needs Improvement → Almost Ready → Ready”), apoi „Key Issues” și „Full report” cu badge-uri „Warnings / Blocking issues”. Idee pentru antetul notei de conformitate. | Caseta roșie mare de text din mijloc. |
| 14 | Ferndesk | [ecran](https://mobbin.com/screens/0e5b2b12-24bf-47c6-af07-3c1029a165ad) | „Missing essentials”: listă cu bifă verde și text tăiat pentru cele rezolvate, chevron pentru navigare la fiecare. | Contrastul slab al elementelor tăiate. |
| 15 | Mistral AI | [ecran](https://mobbin.com/screens/003684d5-a229-4cff-a2a4-25dcbe87ad32) | Tab-uri cu numărătoare pe stare („All (11) · Pending (0) · Fetched (5) · Failed (0) · Skipped (6)”) și, pe rând, badge de stare + motivul în gri. Model pentru lista „Acte cercetate”. | Tabelul lat cu URL-uri lungi. |
| 16 | Revolut Business | [ecran](https://mobbin.com/screens/874b18b7-720b-45eb-aeee-3ad124804e1f) | Rânduri „Requires action” cu insignă de avertizare pe colțul iconiței și chevron; titlu clar + stare pe două rânduri. Rândul compact pentru „de completat”. | Fundalul aproape negru cu contrast scăzut pentru textul secundar. |

## Tipare comune
- **Documentul se construiește la vedere**: textul apare în foaie, cu un cursor sau marcaj „aici scrie agentul”, iar panoul arată planul și pasul curent (Jasper, Perplexity).
- **Sursele sunt o listă separată, cu numărătoare**, comutabilă cu activitatea („Activity / 23 Sources”, „Reviewed 20 sources”) (ChatGPT, Perplexity, WRITER).
- **Rezumatul final al cercetării** stă lipit de rezultat: durată, număr de surse (ChatGPT).
- **Legătura text ↔ sursă** prin marcaje mici numerotate sau chip-uri (Perplexity, Copilot, ChatGPT).
- **Liste de conformitate pe secțiuni**, fiecare element cu stare și „dovezi n/m” (Vanta, Turo, Base44).
- **Lista „lipsește”** cu bifă și text tăiat pe măsură ce se rezolvă, plus un „următorul” care te duce la câmp (Whop, Ferndesk, PandaDoc).
- **Câmpurile de completat sunt marcate în document** și numărate într-o bară („9 fields required”) (PandaDoc).
- **Nota de responsabilitate apare exact la generare**, nu în setări (HubSpot).

## Decizia de layout
**Faza A — Generare în curs.** Foaia A4 din stânga afișează scheletul documentului din planul agentului: titlul, apoi secțiunile ca titluri reale urmate de Skeleton; secțiunea în lucru are textul care curge (streaming) și un marcaj discret „LexAI scrie…” la capăt; secțiunile terminate devin text normal. Foaia e read-only până la final (cursorul utilizatorului nu concurează cu streamingul). Panoul din dreapta, fila „Generare”, refolosește structura din 07:

```
┌────────────── Foaie A4 (read-only) ──────────────┬──────── Panou „Generare” (400px) ─────────┐
│        CONTRACT DE ÎNCHIRIERE                    │ Generare în curs        ⏱ 04:18  [◔ 46%] [Oprește]│
│        nr. [● număr] din 01.04.2025              │                                           │
│ ART. 1. Părțile                         ✓        │ ● Cercetare legislativă ─ 7 acte           │ ← etape
│ Ion Popescu, în calitate de locator, …           │ ● Plan ─ 9 secțiuni                        │
│ ART. 2. Obiectul                        ✓        │ ◌ Redactare ─ 4 din 9 secțiuni             │
│ Locatorul transmite locatarului folosința …      │ ○ Notă de conformitate                     │
│ ART. 3. Durata                          ◌        │                                           │
│ Contractul se încheie pe o perioadă de 12 luni,  │ [Activitate] [Acte cercetate 7]            │ ← comutator (Tabs mici)
│ începând cu ▍ LexAI scrie…                       │ ✓ Codul civil, art. 1.777–1.850 ↗          │
│ ART. 4. Chiria                                   │ ✓ Legea 114/1996 a locuinței ↗             │
│ ░░░░░░░░░░░░░░░░░░░░░░░░                         │ ✓ Codul de procedură fiscală, art. … ↗     │
│ ART. 5. Obligațiile locatorului                  │ ◌ Decizia ÎCCJ (HP) nr. … · în curs        │
│ ░░░░░░░░░░░░░░░░░░                               │ ─────────────────────────────────────────  │
│ …                                                │ Secțiuni: ✓1 ✓2 ◌3 ○4 ○5 ○6 ○7 ○8 ○9         │
│                                                  │ Poți închide pagina — generarea continuă. │
└──────────────────────────────────────────────────┴───────────────────────────────────────────┘
```

**Faza B — Draft gata (revizuire).** Foaia devine editabilă. Panoul trece automat pe fila „Temeiuri”; fila „Generare” rămâne, strânsă, cu rezumatul („Generat în 8:42 · 7 acte cercetate · 9 secțiuni”).

```
┌────────────── Foaie A4 (editabilă) ──────────────┬────── Panou (420px) ─────────────────────────┐
│ ▍ ART. 4. Chiria                                 │ [Temeiuri] [De completat 5] [Generare]        │
│ ▍ Chiria lunară este de 2.500 lei, plătibilă     │ Notă de conformitate · lege la 01.04.2025    │
│ ▍ până la data de 5 a fiecărei luni, în contul   │ ▰▰▰▰▰▰▰▰▰▰▰▰▰▱▱▱▱░ 14 respectat · 5 de        │ ← bară pe stări (aceeași ca în 08)
│ ▍ [● IBAN locator].                              │                    completat · 2 de verificat │
│   ↑ jeton chihlimbar, clic → fila „De completat” │ [Toate][✓ 14][● 5][△ 2]                       │
│                                                  │ ▾ Art. 4. Chiria                     ● 1  △ 1 │ ← grup = clauză din document
│ ▍ ART. 5. Obligațiile locatorului                │   △ Indexarea chiriei — de verificat          │
│ ▍ …                                              │   ┌───────────────────────────────────────┐   │
│                                                  │   │ Normă: art. 1.797 C. civ.             │   │
│ marginea: bară verde/chihlimbar/violet pe        │   │ „Locatarul este obligat să plătească  │   │ ← dovadă: citat exact + sursă
│ clauză, după cea mai slabă stare                 │   │ chiria în cuantumul și la termenele…” │   │
│                                                  │   │ Portal Legislativ · forma la 01.04.25↗│   │
│                                                  │   │ De ce „de verificat”: clauza de       │   │
│                                                  │   │ indexare nu are temei expres; e       │   │
│                                                  │   │ permisă, dar verifică formula.        │   │
│                                                  │   │ [Marchează verificat] [Mergi la text] │   │
│                                                  │   └───────────────────────────────────────┘   │
│                                                  │   ✓ Termenul de plată — respectat             │
│                                                  │ ▸ Art. 5. Obligațiile locatorului    ✓ 4      │
└──────────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

Fila **„De completat”** (inspirată de PandaDoc + Whop):

```
│ De completat · 2 din 7 gata                ▰▰▰▱▱▱▱ │
│ ○ IBAN locator                Art. 4      [ Completează ] │  ← Input inline; Enter → următorul
│ ○ Număr contract              Antet       [           ]   │
│ ○ Suprafața utilă (mp)        Art. 2      [           ]   │
│ ✓ ~~Data predării~~           Art. 3   15.04.2025         │  ← completate: tăiate, estompate
│ [Următorul câmp ↓]                         n / p           │
```

**Primar:** foaia (în faza A pentru încredere, în faza B pentru revizuire) și cardul temeiului deschis. **Secundar:** lista clauzelor grupate în ordinea documentului cu starea fiecăreia; lista „De completat”. **Terțiar:** activitatea și actele cercetate (fila „Generare”).

Detalii:
- **Gruparea „Temeiuri” e în ordinea documentului** (nu pe stare): juristul revizuiește clauză cu clauză. Filtrul pe stare (Toggle group) restrânge lista, sortarea rămâne cea a documentului.
- **Fiecare clauză are una sau mai multe norme**; starea clauzei = cea mai slabă stare a normelor ei. Normele „respectat” sunt strânse implicit pe un rând.
- **Dovada** e același bloc ca în 08 (citat exact, act + articol, sursă, data formei, link), ca utilizatorul să recunoască instantaneu forma.
- **Sincronizare:** clic pe clauză în panou → derulare și highlight pe clauză în foaie; cursorul în foaie pe o clauză → panoul deschide clauza respectivă (Switch „Urmează cursorul”, implicit pornit).
- **Jetoanele `[● …]`** în document: pastilă chihlimbar cu textul descriptiv; clic → focus pe câmpul din „De completat”; tastând în câmp, toate aparițiile identice se actualizează. Se poate scrie și direct în document (jetonul dispare când e înlocuit).
- **Export:** butonul „Exportă” rămâne activ; dacă mai există jetoane, Alert dialog: „Mai sunt 5 câmpuri de completat. Exportăm cu marcajele [● …] vizibile?”.
- **Editări după generare:** dacă utilizatorul modifică o clauză, starea ei devine „modificată după generare” (bară gri punctată în margine) și apare „Reverifică temeiurile pentru 2 clauze” în antet (același mecanism ca reverificarea din 08).

## Componente HextaUI
- **Resizable** — foaie / panou.
- **Tabs** — „Temeiuri”, „De completat” (cu numărător), „Generare”; în fila „Generare”, sub-Tabs „Activitate / Acte cercetate”.
- **Skeleton** — secțiunile neîncepute din foaie în faza A.
- **Shimmer** — titlul secțiunii în lucru și eticheta „LexAI scrie…”.
- **Spinner**, **Progress**, **Number flow** — etapele, „4 din 9 secțiuni”, „2 din 7 gata”, bara notei de conformitate.
- **Message scroller** — fluxul „Activitate”.
- **Item** — rândurile de act cercetat, de clauză, de normă, de câmp de completat.
- **Accordion** — clauzele din „Temeiuri”.
- **Card** — cardul normei deschise (normă, dovadă, explicație, acțiuni).
- **Badge** — „Respectat”, „De completat”, „De verificat”, „Modificată după generare”.
- **Marker** — highlight-ul clauzei selectate și jetoanele `[● …]` din foaie.
- **Toggle group** — filtrul pe stări.
- **Input** / **Input group** / **Date picker** — completarea inline a câmpurilor (tipul câmpului dedus din placeholder: dată, sumă, text).
- **Hover card** — previzualizarea normei la hover pe marcajul de margine al clauzei.
- **Tooltip** — pe jetoane („Completează în panoul «De completat»”), pe segmentele barei.
- **Kbd** + **Hotkey** — `j` / `k` între clauze, `n` / `p` între câmpurile de completat, `Enter` = salvează și treci la următorul.
- **Button** — „Oprește”, „Marchează verificat”, „Mergi la text”, „Următorul câmp”, „Exportă”, „Reverifică temeiurile”.
- **Dropdown menu** — „⋯” pe normă: „Copiază citatul”, „Deschide sursa”, „Raportează o eroare”.
- **Alert** — întrerupere, limită, eroare (aceleași ca în 07).
- **Alert dialog** — export cu câmpuri necompletate; oprirea generării.
- **Toast** — „Draftul este gata” (dacă utilizatorul e în altă pagină) + „Deschide”.
- **Popover** — chip-ul de limită al abonamentului.
- **Switch** — „Urmează cursorul”, „Ascunde normele respectate”.
- **Empty** — „Nimic de completat” cu bifă.
- **Scroll area** + **Scroll fade** — panoul.

## Stări
- **Încărcare (reconectare după reload în faza A):** foaia arată ce s-a scris deja (salvat pe server pe secțiuni) + Skeleton pentru rest; panoul arată ultima etapă cunoscută cu „Se reconectează…”.
- **În curs (faza A):** layoutul de mai sus; foaia read-only; „Oprește” vizibil.
- **Oprită de utilizator:** Alert: „Ai oprit generarea după 4 din 9 secțiuni.” + „Continuă generarea” (primar) + „Păstrează doar ce s-a scris” (secundar, transformă draftul parțial în document editabil; secțiunile lipsă apar ca jetoane `[● secțiune nescrisă: Obligațiile locatarului]`).
- **Întreruptă:** Alert warning: „Generarea s-a întrerupt la secțiunea «Durata».” + „Reia generarea”; secțiunile gata rămân.
- **Limită atinsă:** Alert: „Limita abonamentului a fost atinsă. Generarea continuă după 18:02.” + Switch „Reia automat”; foaia rămâne cu secțiunile scrise.
- **Eroare la cercetare pe un act:** în „Acte cercetate”, rândul are badge „Indisponibil” și motivul („Portal Legislativ nu a răspuns”); normele care depindeau de el ajung „de verificat”, cu explicația „Textul oficial nu a putut fi consultat”.
- **Gata (faza B):** panoul pe „Temeiuri”; Toast dacă utilizatorul nu e pe pagină; rezumatul în fila „Generare”.
- **Toate respectate și nimic de completat:** card succes în antetul „Temeiuri”: „Toate clauzele au temei verificat. Nu mai e nimic de completat.” + „Exportă”.
- **Clauze modificate după generare:** banner subțire în antet + „Reverifică temeiurile pentru 2 clauze”.
- **De completat gol:** Empty: „Nimic de completat.”

## Ecran îngust
- Sub 1024 px panoul devine **Sheet**; în bara editorului apar două butoane cu numărător: „Temeiuri (2)” (de verificat) și „De completat (5)”.
- Sub 640 px: **Drawer** de jos; „De completat” devine un mod pas-cu-pas: un câmp pe ecran, cu contextul frazei deasupra și „Următorul” lat jos (ca PandaDoc „Next”).
- În faza A pe mobil, panoul de generare se reduce la o bară lipită jos: „Redactare · 4 din 9 · 04:18 · Oprește”; atingerea o extinde.
- Marcajele din margine rămân; jetoanele `[● …]` devin pastile pe toată lățimea rândului dacă textul lor e lung.

## Microcopy (RO)
- Faza A: titlu „Generare în curs”; etape „Cercetare legislativă”, „Plan”, „Redactare”, „Notă de conformitate”; meta „7 acte cercetate”, „9 secțiuni”, „4 din 9 secțiuni”.
- Activitate: „Caut regimul contractului de locațiune în Codul civil, forma la 01.04.2025”, „Citesc Legea 114/1996, art. 21–34”, „Verific jurisprudența ÎCCJ (HP) privind indexarea chiriei”, „Scriu Art. 3 — Durata”.
- Marcaj în foaie: „LexAI scrie…”.
- Notă la generare: „Draftul e redactat automat pe baza textelor oficiale. Verifică fiecare clauză înainte de semnare.”
- Final: „Generat în 8:42 · 7 acte cercetate · 9 secțiuni”; Toast: „Draftul contractului de închiriere este gata.” + „Deschide”.
- Temeiuri: antet „Notă de conformitate”, „Legislația în vigoare la 01.04.2025”; stări „Respectat”, „De completat”, „De verificat”; etichete card „Normă”, „Dovadă”, „De ce «de verificat»”.
- Butoane: „Marchează verificat”, „Mergi la text”, „Deschide sursa”, „Copiază citatul”, „Reverifică temeiurile”, „Exportă”.
- De completat: antet „De completat · 2 din 7 gata”; buton „Următorul câmp”; placeholder input „Completează…”; gol „Nimic de completat.”
- Export cu goluri: titlu „Mai sunt 5 câmpuri de completat”; text „Documentul va fi exportat cu marcajele [● …] vizibile.”; butoane „Exportă oricum” / „Completează acum”.
- Oprire: „Oprești generarea?”; „Secțiunile scrise rămân. Poți continua mai târziu.”; „Oprește” / „Continuă”.
- Parțial: „Păstrează doar ce s-a scris”; jeton „[● secțiune nescrisă: …]”.

## Întrebări deschise
- În faza A permitem editarea secțiunilor deja terminate sau blocăm toată foaia până la final? Blocarea e mai sigură (fără conflicte cu streamingul), editarea e mai rapidă.
- Nota de conformitate se exportă ca anexă (PDF separat) sau ca note de subsol în document? Ce vede destinatarul documentului?
- Stările „de completat” din „Temeiuri” și lista „De completat” se suprapun parțial (o clauză e „de completat” pentru că are un `[● …]`). Le unificăm într-o singură listă cu două secțiuni sau păstrăm două file?
- Câmpurile cu aceeași etichetă (ex. „IBAN locator”) apar de mai multe ori: le tratăm mereu ca un singur câmp sau permitem valori diferite?
- Planul de secțiuni îl arătăm utilizatorului spre aprobare înainte de redactare (ca HubSpot „Review outline”) sau mergem direct? Aprobarea adaugă un pas, dar evită regenerări.
- Ce se întâmplă cu temeiurile dacă utilizatorul schimbă data de referință a legii după generare — reverificare completă automată sau la cerere?
