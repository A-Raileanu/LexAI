# 07 — Progresul analizei

**Rută / context:** panoul lateral din dreapta al editorului (`/proiecte/[id]/documente/[docId]`, fila „Analiză”), plus un indicator compact de stare în bara editorului, în lista de documente a proiectului și în bara laterală a aplicației · **Scop:** să arate, în timp real și după un reload, ce face jobul de analiză (etape, acte normative verificate, constatări care sosesc), cât a durat și cât mai poate rula în limitele abonamentului · **Ce face utilizatorul aici:** urmărește progresul, citește ce verifică agentul acum, vede primele constatări apărând în document, anulează, reia o analiză întreruptă sau așteaptă resetarea limitei.

## Referințe analizate (≥10)
| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Elicit | [ecran](https://mobbin.com/screens/232b3136-ccbb-42e7-a45c-412ea436f330) | Panou „Status” în dreapta cu etape verticale (bifă / spinner / gol), fiecare cu un rezultat numeric sub titlu („50 papers found”); rând „Generate report · 0:27 elapsed (5 minutes estimated)”; jurnal de activitate cu iconițe pe tip de acțiune. Modelul direct pentru lista de etape. | Textul de stare repetat în trei locuri (titlu, panou, centru); „Show less” ascunde explicația importantă. |
| 2 | ChatGPT | [ecran](https://mobbin.com/screens/b045e2cd-4f54-424a-97f6-4c5954f0c1e1) | Panou lateral „Activity / N Sources” cu linii scurte la persoana I („Searched for…”, „Read reuters.com”) și sursa ca link; butoane fixe jos „Stop” + „Update”; card inline compact („Examining… · 2 sources” + bară + buton stop) pentru starea din afara panoului. | Linii lungi de „gândire” la persoana I, prea vorbărețe pentru un jurist; fără timp scurs. |
| 3 | Rox | [ecran](https://mobbin.com/screens/107c729c-a68d-48e3-8ece-51d43eff4215) | „Step 1 of 7” + bară segmentată + „3 min left” pe un singur rând; sub pasul curent, chip-uri gri pentru fiecare acțiune a agentului („Searching the web for …”). Foarte bun pentru grupurile pe act normativ. | Culoarea aurie a barei care nu codifică nimic; pașii viitori invizibili. |
| 4 | Browserbase | [ecran](https://mobbin.com/screens/38e3e1bc-2a5c-4f7b-aa64-00ab6f736224) | Antet de rulare: chip „Running” cu spinner, durată (15.0s), dată; buton „Stop” roșu-text în dreapta sus; jurnal cu marcaj de timp (0:03, 0:12) aliniat la dreapta și etichete de tip (Prompt / Reason / Tool). | Timeline-ul colorat de sus, care nu înseamnă nimic pentru utilizator non-tehnic; ID-urile hash. |
| 5 | Emergent | [ecran](https://mobbin.com/screens/dff53201-0975-445f-b0e1-75aa0353d9ba) | Listă de etape în card, etapa curentă evidențiată cu fundal și cronometru propriu (04:29), etapele viitoare cu cerc gol; „It takes around 5–7 mins. We'll notify you once done.” | Font monospace pe tot cardul; titlu triumfalist („Your app will be live soon!”). |
| 6 | Emergent | [ecran](https://mobbin.com/screens/821ee5aa-8dbc-4885-ac84-265a17a7cc9b) | Limita atinsă afișată chiar în firul de activitate (separator „Credit Exhausted” cu oră), cu acțiuni lângă mesaj; starea „Agent is waiting…” deasupra compozitorului. | Ton de upsell („Buy credits”), butoane galbene țipătoare. |
| 7 | Gamma | [ecran](https://mobbin.com/screens/523d6c4f-ac58-44f7-9d7a-a9881cba40f7) | Stepper vertical cu cercuri numerotate și linie de legătură, spinner lângă etapa curentă; buton „Cancel” lat sub etape, cu text roșu. | „Please keep this tab open” — la noi jobul supraviețuiește reload-ului, deci mesajul trebuie să fie opusul. |
| 8 | Klaviyo | [ecran](https://mobbin.com/screens/a6302778-7cdc-4f61-96a8-8e4bf83aeeff) | Bară de progres + listă scurtă cu bifă verde pentru gata și cerc punctat pentru curent; verbe la gerunziu („Syncing…”, „Creating…”). | Jumătatea de ecran cu imagine decorativă. |
| 9 | Relevance AI | [ecran](https://mobbin.com/screens/4366a3ad-efe2-464b-99e7-2ff4202948a5) | Stare „Paused” în detaliile jobului (Status, Actions used, Credits used, Run time) + buton „Resume Task” sus; banner întunecat care explică ce înseamnă pauza. | Bannerul negru lipit de compozitor, greu de citit; textul tehnic. |
| 10 | Fabric | [ecran](https://mobbin.com/screens/58ba36a5-6547-4bfd-bc9f-66c8dae33e12) | Mesajul explicit „You can leave this page. Your import will continue in the background.” — exact promisiunea noastră. | Ecran gol cu un singur spinner, fără nicio informație despre progres. |
| 11 | PandaDoc | [ecran](https://mobbin.com/screens/6e7783c1-2ce2-4ba2-832d-bab89ec45f67) | „Imported 0 of 4 files” + câte un rând pe element cu spinner și procent propriu; „Cancel import” ca buton secundar discret. Model pentru rândurile pe act normativ. | Modalul pe tot ecranul care blochează lucrul. |
| 12 | Claude | [ecran](https://mobbin.com/screens/ea02c392-d84c-4ce0-81bb-66d7bda183b3) | Limite pe două ferestre („Current session”, „Weekly limits”) cu bară, procent și „Resets Tue 5:00 AM”; „Last updated: just now” + reîmprospătare. Conținutul popover-ului din chip-ul de limită. | Pagina de setări separată; la noi informația trebuie la un clic de job. |
| 13 | Sprig | [ecran](https://mobbin.com/screens/83f67504-08a2-499e-823d-03a52c3f28a3) | Card „You've hit one of your limits” cu iconiță + „Resets on Aug 1”; utilizare afișată ca „31 / 25” cu cifra depășită în roșu. | Banner galben pe toată lățimea + card, dublă alarmă. |
| 14 | Apollo | [ecran](https://mobbin.com/screens/d4008cfb-808c-4949-8da8-3ff95a9994aa) | Chip minuscul „4 CHATS LEFT” în colțul compozitorului: limita vizibilă fără să ocupe spațiu. Forma chip-ului nostru de limită. | Butonul galben „Upgrade” permanent din bara laterală. |
| 15 | n8n | [ecran](https://mobbin.com/screens/1562fe41-4f0a-48b9-b6da-ed9ebf8b9ec5) | Panou „Logs” cu „Running for 1s”, arbore de pași, fiecare cu „Success in 0s” / spinner „Running for 1s” și oră de start la dreapta. | Densitatea de unealtă de dezvoltatori; prea multe coloane. |
| 16 | Vercel | [ecran](https://mobbin.com/screens/1a1ee0e1-21dd-4f53-a95d-f4edac3317b7) | Etapele terminate se strâng în rânduri gri cu bifă, etapa curentă se deschide ca un card mai mare cu „Provisioning in progress…”, subtext și bară proprie; buton „Processing” dezactivat jos. | Contrastul foarte slab al etapelor terminate. |

## Tipare comune
- **Etape vizibile de la început**, toate, cu trei stări grafice clare: gata (bifă), în curs (spinner sau cerc punctat), urmează (cerc gol). Etapa curentă e singura „deschisă” (Elicit, Gamma, Emergent, Vercel, Klaviyo).
- **Un rezultat numeric sub fiecare etapă terminată** („50 papers found”, „10 papers included”) transformă progresul în informație utilă (Elicit, PandaDoc „0 of 4”).
- **Timp scurs + estimare**, nu procente inventate: „0:27 elapsed (5 minutes estimated)”, „3 min left”, cronometru pe etapa curentă (Elicit, Rox, Emergent, Browserbase).
- **Flux de activitate cu verbe scurte și sursa ca link sau chip** („Read reuters.com”, „Searching the web for …”) (ChatGPT, Rox, Browserbase, n8n).
- **Oprire mereu la vedere**, ca acțiune secundară cu text roșu sau buton cu pătrat (ChatGPT, Browserbase, Gamma).
- **Promisiunea de fundal**: „You can leave this page”, „We'll notify you once done” (Fabric, Emergent).
- **Limitele ca chip mic, cu detalii la cerere**: procent + ora resetării (Apollo, Claude, Sprig); când limita e atinsă, mesajul apare în fluxul jobului, cu acțiunea alături (Emergent).
- **Pauza / întreruperea e o stare de prim rang**, cu buton „Resume” și explicație (Relevance AI).

## Decizia de layout
Panoul lateral (Resizable, 360–440 px, implicit 400 px) are trei zone fixe, de sus în jos. Antetul se vede mereu, lista pe acte derulează, subsolul e lipit jos.

```
┌──────────────────────── Panou „Analiză” (400px) ────────────────────────┐
│ Analiză în curs                         ⏱ 03:12   [◔ 41% · 5h] [Oprește]│  ← antet: titlu, timp scurs, chip limită, oprire
│ Referință: legislația în vigoare la 01.03.2025 · 3 documente             │
│                                                                          │
│ ● Identificare trimiteri ─ 47 găsite                                     │  ← etape (stepper compact, 4 rânduri)
│ ● Grupare pe acte ─ 9 acte normative                                     │
│ ◌ Verificare la sursă ─ 5 din 9 acte · ~4 min rămase                     │
│ ○ Consolidare                                                            │
│                                                                          │
│ Constatări până acum                                                     │  ← contoare care cresc (Number flow)
│ [✓ Corect 18] [✕ Greșeli 3] [△ Discutabile 2] [◎ Analiză umană 1] [? 0]  │
├──────────────────────────────────────────────────────────────────────────┤
│ ▾ Codul civil (Legea 287/2009)                     ◌ 9 / 14  ▰▰▰▰▱▱      │  ← grup pe act, deschis dacă e activ
│    00:41  Caut art. 1.270 în forma de la 01.03.2025 · Portal Legislativ ↗│     linii de activitate (max 5 vizibile)
│    00:38  Citesc Decizia CCR nr. 1/2014 · ccr.ro ↗                       │
│    00:35  ✕ art. 1.350 alin. (3) — alineat inexistent                    │     constatare sosită = linie colorată, clic → document
│    + încă 12 pași                                                        │
│ ▸ Codul muncii (Legea 53/2003)                     ✓ 6 / 6   2 greșeli   │  ← grup terminat, strâns, cu rezumat
│ ▸ Legea 31/1990 a societăților                     ○ în așteptare        │
│ …                                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│ Poți închide pagina — analiza continuă în fundal și o regăsești aici.    │  ← subsol fix
└──────────────────────────────────────────────────────────────────────────┘
```

**Primar:** etapa curentă, timpul și contoarele pe stări (răspund la „cât mai durează?” și „e grav?”). **Secundar:** grupurile pe act normativ cu linii de activitate (pentru cine vrea să vadă *ce* verifică agentul). **Terțiar:** detaliile limitei (în popover), jurnalul complet (într-un Collapsible „Toți pașii”).

Comportament:
- Grupul activ se deschide automat; grupurile terminate se strâng cu un rezumat („6 / 6 · 2 greșeli”). Utilizatorul poate fixa un grup deschis; atunci nu se mai strânge singur.
- O constatare nouă apare ca linie colorată în grupul ei, crește contorul cu animație Number flow, iar în document apare highlight-ul în culoarea stării (vezi 08). Clic pe linie → derulare la paragraf.
- Fluxul de activitate nu sare: dacă utilizatorul a derulat în sus, se afișează un buton „↓ 3 pași noi” (Message scroller), ca în chat-uri.
- **Starea compactă în altă parte** (aceeași componentă `JobStatusPill`):
  - în bara editorului: `◌ Analiză · 3/4 · 03:12` (clic → deschide panoul pe fila „Analiză”);
  - în lista de documente: Badge cu spinner „Analiză 3/4”;
  - în bara laterală a aplicației: un punct animat lângă proiect + Tooltip cu documentul și etapa.
  Toate citesc aceeași stare din server (job persistent), deci după reload se reconectează la stream și afișează imediat ultima stare cunoscută, apoi continuă.

## Componente HextaUI
- **Resizable** — împărțirea editor / panou; dimensiunea panoului se memorează local.
- **Tabs** — filele panoului („Analiză”, „Rezultate”, „Temeiuri”); fila „Analiză” primește un Spinner mic în etichetă cât timp rulează jobul.
- **Progress** — bara pe grup de act și bara totală, varianta subțire (4 px); fără procent afișat, doar „9 / 14”.
- **Spinner** — etapa curentă, grupul activ, pastila compactă.
- **Item** — rândurile de etapă și de grup (iconiță de stare + titlu + meta la dreapta).
- **Accordion** — grupurile pe act normativ (`type="multiple"`).
- **Collapsible** — „+ încă 12 pași” și „Toți pașii” (jurnalul complet).
- **Message scroller** — fluxul de activitate cu ancorare jos și butonul „pași noi”.
- **Number flow** — contoarele pe stări și „9 / 14”, animate la fiecare sosire.
- **Badge** — contoarele pe stări (variantă outline cu iconiță), pastila „Analiză 3/4” din listă.
- **Popover** — detaliile limitei abonamentului (fereastra de 5 h și cea de 7 zile, ora resetării).
- **Tooltip** — pe chip-ul de limită și pe timpul scurs („Pornită la 14:02”).
- **Button** / **Button group** — „Oprește” (ghost, text destructive), „Reia analiza” (primar), „Reîncearcă grupul”.
- **Alert dialog** — confirmarea opririi.
- **Alert** — stările „Întreruptă”, „Limită atinsă”, „Eroare”.
- **Switch** — „Reia automat după resetarea limitei”.
- **Toast** — „Analiza s-a încheiat: 3 greșeli, 2 interpretări discutabile” când utilizatorul e în altă parte a aplicației.
- **Shimmer** — pe textul etapei curente („Verificare la sursă…”), o singură dată în pagină.
- **Skeleton** — la reconectare, pentru grupuri încă necunoscute.
- **Scroll area** + **Scroll fade** — zona derulantă a grupurilor.
- **Kbd** — scurtătura `Esc` pentru închiderea popover-ului, `⌘.` pentru oprire (opțional).

## Stări
- **Gol (fără analiză):** Empty în panou: „Documentul nu a fost încă analizat.” + câmp Date picker „Legislația în vigoare la” (implicit azi) + buton „Pornește analiza”. Sub buton: cost estimat în abonament („≈ 15–25 min din fereastra de 5 h”).
- **Încărcare (reconectare după reload):** antetul apare imediat cu ultima stare salvată și eticheta „Se reconectează…” în locul timpului; grupurile necunoscute ca Skeleton; nicio animație de „pornire de la zero”.
- **În curs:** layoutul de mai sus. Butonul „Oprește” e activ; contoarele cresc; highlight-urile apar în document.
- **Oprită de utilizator:** Alert neutru „Ai oprit analiza la etapa Verificare la sursă (5 din 9 acte). Constatările de până acum rămân în document.” + „Reia de unde a rămas” (primar) + „Pornește din nou” (secundar).
- **Întreruptă (crash, repornire server, rețea):** Alert warning cu iconiță de pauză: „Analiza s-a întrerupt la 14:27, la Codul muncii (4 din 6 trimiteri).” + „Reia analiza” (primar). Grupurile terminate rămân bifate; grupul întrerupt are iconiță de pauză, nu de eroare.
- **Limită atinsă:** chip-ul de limită devine warning; în fluxul grupului activ apare un separator „Limita de 5 h a fost atinsă · 15:40”; Alert în antet: „Limita abonamentului a fost atinsă. Analiza va continua după 18:02, când se resetează fereastra de 5 ore.” + Switch „Reia automat la resetare” (implicit pornit) + buton „Reia acum” dezactivat până la resetare, cu Tooltip pe oră. Dacă e limita de 7 zile, textul indică ziua („joi, 05:00”).
- **Eroare pe un act normativ:** rândul grupului are iconiță de eroare și text scurt („Portal Legislativ nu a răspuns”); acțiune „Reîncearcă” doar pe acel grup; restul analizei continuă. Trimiterile rămân „neverificat”.
- **Eroare a jobului:** Alert destructive: „Analiza nu a putut continua.” + detaliu restrâns (Collapsible „Detalii tehnice”) + „Reia analiza”.
- **Finalizată:** antetul devine „Analiză finalizată în 11:48” cu bifă; contoarele rămân; un buton primar „Vezi rezultatele” comută pe fila „Rezultate” (08). Jurnalul rămâne accesibil sub „Toți pașii”.

## Ecran îngust
- Sub 1024 px panoul devine **Sheet** din dreapta (lățime 90 vw), deschis din pastila de stare din bara editorului.
- Sub 640 px: **Drawer** de jos, cu două trepte: înălțime mică (antet + etape + contoare) și înălțime mare (grupurile). Pastila din bara de sus rămâne singurul indicator permanent.
- Contoarele pe stări trec pe un rând derulant orizontal (Scroll fade la margini) și păstrează iconița + cifra; eticheta completă intră în Tooltip.
- Liniile de activitate se scurtează la o singură linie cu trunchiere; marcajul de timp se ascunde sub 400 px.
- „Oprește” rămâne în antet (iconiță + text), niciodată ascuns într-un meniu.

## Microcopy (RO)
- Titluri panou: „Analiză în curs”, „Analiză oprită”, „Analiză întreruptă”, „Analiză finalizată în 11:48”.
- Etape: „Identificare trimiteri”, „Grupare pe acte normative”, „Verificare la sursă”, „Consolidare”.
- Rezultat sub etapă: „47 de trimiteri găsite”, „9 acte normative”, „5 din 9 acte · ~4 min rămase”, „Pregătesc raportul”.
- Linii de activitate: „Caut art. 1.270 în forma în vigoare la 01.03.2025”, „Citesc Decizia CCR nr. 1/2014”, „Compar textul citat cu textul oficial”, „Verific dacă alineatul a fost modificat după 2020”, „Caut jurisprudență ÎCCJ (RIL / HP)”.
- Linii de constatare: „✕ art. 1.350 alin. (3) — alineatul nu există”, „△ art. 41 C. muncii — interpretare discutabilă”, „◎ art. 6 Legea 31/1990 — necesită analiză umană”.
- Contoare: „Corect”, „Greșeli”, „Discutabile”, „Analiză umană”, „Neverificate”.
- Chip limită: „41% din 5 h”; popover: „Fereastra de 5 ore: 41% folosit · se resetează la 18:02”, „Fereastra de 7 zile: 18% folosit · se resetează joi, 05:00”.
- Butoane: „Pornește analiza”, „Oprește”, „Reia de unde a rămas”, „Pornește din nou”, „Reîncearcă”, „Vezi rezultatele”, „Toți pașii”.
- Confirmare oprire: titlu „Oprești analiza?”; text „Constatările găsite până acum rămân în document. Poți relua mai târziu de la etapa curentă.”; butoane „Oprește analiza” / „Continuă”.
- Subsol: „Poți închide pagina — analiza continuă în fundal și o regăsești aici.”
- Toast final: „Analiza s-a încheiat: 3 greșeli de citare, 2 interpretări discutabile.” + „Deschide”.
- Limită: „Limita abonamentului a fost atinsă. Analiza va continua după 18:02.”; Switch: „Reia automat la resetare”.

## Întrebări deschise
- Estimarea timpului rămas: o calculăm din numărul de trimiteri rămase × durata medie pe trimitere din jobul curent, sau afișăm doar timpul scurs până avem destule date (primele 2–3 acte)?
- Câte linii de activitate păstrăm pe grup în interfață (5 vizibile + restul în „Toți pașii”)? Jurnalul complet se salvează pe server pentru audit?
- La „Reia de unde a rămas”, reverificăm grupul întrerupt de la zero sau de la ultima trimitere confirmată?
- Notificăm în afara aplicației (notificare de sistem a browserului) când jobul se termină sau când reia după limită?
- Pornim analiza automat după încărcare sau cerem mereu confirmare cu data de referință?
- Mai multe documente în același proiect: o coadă vizibilă (rânduri „în așteptare”) sau rulare în paralel?
