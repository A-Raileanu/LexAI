# 13 — Setări
**Rută / context:** `/setari`, accesibilă din sidebar-ul principal (jos, lângă „Utilizare”). Subpagina `/setari/terminal` e descrisă în `14-terminal-claude.md`. · **Scop:** un singur loc pentru securitate (PIN, sesiuni), sursele legale folosite la verificare, comportamentul AI, data de referință implicită și starea contului Claude · **Ce face utilizatorul aici:** schimbă PIN-ul, închide sesiuni, activează, dezactivează sau reordonează surse legale și verifică starea cache-ului lor, alege modelul și paralelismul, fixează data de referință și verifică dacă e conectat la Claude.

## Referințe analizate (≥10)
| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Linear | [ecran](https://mobbin.com/screens/13e6c6f5-0ec6-49d8-83e4-921de2120ae1) | Modelul principal al paginii: o coloană îngustă centrată, fiecare secțiune cu titlu și o frază de descriere, conținutul în carduri cu Hairline. Sesiunea curentă e separată, cu punct verde și eticheta „Current session”; celelalte au antetul „1 other session” și acțiunea „Revoke all”. Stările goale stau inline („No passkeys registered” + acțiune la dreapta). | Sidebar-ul de setări foarte lung (nu avem atâtea secțiuni). |
| 2 | Cloudflare | [ecran](https://mobbin.com/screens/3dd1919f-1f08-4a41-a36b-79ce7ed144ba) | Card per sesiune cu titlu „Macintosh · macOS”, iar dedesubt meta pe rânduri cu pictograme (browser, IP, login, last seen). Badge-ul închis „Current Session” înlocuiește butonul „Revoke”. | Spațiul gol mare din dreapta; footer-ul de marketing. |
| 3 | Airtable | [ecran](https://mobbin.com/screens/d055c852-3894-4756-a84e-c739457a0b9c) | Tabel minimal (client, IP, ultima activitate) cu eticheta „current session” mică, inline. Textul explică *când* merită închise celelalte sesiuni, înaintea butonului „Sign out of all other sessions”. | IP-urile ascunse cu bară gri (la noi sunt locale și pot fi afișate). |
| 4 | Pipedrive | [ecran](https://mobbin.com/screens/7ed47d98-c70b-4186-ac34-5a9b8bf02028) | Badge „THIS DEVICE” verde pe rândul curent, „Log out” pe celelalte, plus un sfat de securitate sub listă cu legătură spre schimbarea parolei (la noi, spre „Schimbă PIN-ul”). | Istoricul complet de dispozitive pe 60 de zile; ar umfla pagina. |
| 5 | GitLab | [ecran](https://mobbin.com/screens/38670cce-dc00-46bb-ad31-f080206dd25d) | Rândul de sesiune pe 3 linii (IP, „Last accessed”, „Chrome on Mac”) și mesajul „This is your current session” în locul acțiunii. | Butonul „Revoke” roșu plin pe fiecare rând (prea agresiv pentru o acțiune de rutină). |
| 6 | Figma | [ecran](https://mobbin.com/screens/5bdc7ccd-b307-47ec-b466-bbfafc17dc23) | „Password” și „Sessions” stau în aceeași zonă de securitate, cu acțiuni-text („Change password”) și coloana „Manage” care arată „Current” dezactivat pentru sesiunea proprie. | Afișarea în modal; setările noastre sunt o pagină. |
| 7 | Mistral AI | [ecran](https://mobbin.com/screens/a67d96bf-8814-4126-affd-05710bb60af6) | Tabel de servicii cu coloane de stare (Storage, Indexing) și Switch „Enabled” la capăt; toast „Integration disabled successfully” la schimbare. Modelul direct pentru sursele legale cu cache. | Coloanele „N/A” repetate; când nu există valoare, coloana se ascunde. |
| 8 | Customer.io | [ecran](https://mobbin.com/screens/e95bd92b-7d41-4dff-aa5d-3eef55514906) | Badge-uri de stare cu punct colorat („Error”, „No recent data”) și coloana „Last activity”. Le folosim pentru starea cache-ului (Actualizat / Vechi / Eroare). | Banner-ul de feedback de deasupra. |
| 9 | folk | [ecran](https://mobbin.com/screens/1561b38d-f238-4f5f-99ba-2ee4638b96fa) | Listă densă cu un rând per integrare: pictogramă, nume, descriere de o linie, badge „Connected” la dreapta. Densitate potrivită pentru 4–8 surse. | Lista lungă fără grupare. |
| 10 | Qatalog | [ecran](https://mobbin.com/screens/bf24e755-2a66-4aa1-b64b-ad156bbd0641) | Eticheta text „Enabled” stă lângă Switch, deci starea nu depinde doar de culoare. | Fundalul verde plin al rândurilor active (prea zgomotos). |
| 11 | incident.io | [ecran](https://mobbin.com/screens/2f54654e-82b2-4664-b483-65fa66ebf0ef) | Mânere de tragere (⋮⋮) la stânga rândurilor pentru reordonare, cu acțiunile pe pictograme la dreapta. Model pentru prioritatea surselor. | Previzualizarea cu bare colorate, irelevantă pentru noi. |
| 12 | Cofounder | [ecran](https://mobbin.com/screens/37801342-be92-4580-a24e-81e6c9f35b3a) | Card „Agent Configuration” cu rânduri etichetă + descriere la stânga și control la dreapta (Switch, Select). Selectorul de model are indicatori de capacitate și bifă pe opțiunea curentă. | Prea multe opțiuni AI într-un singur card. |
| 13 | Langdock | [ecran](https://mobbin.com/screens/a09b8052-cb20-4b94-a72e-e91a95a4b602) | Rândul „Default model — Will be preselected whenever…” (descrierea spune efectul), cu Select compact aliniat la dreapta; secțiunile sunt separate prin Hairline, nu prin carduri grele. | Alegerea temei cu trei miniaturi mari (nu e prioritară). |
| 14 | Retool | [ecran](https://mobbin.com/screens/fb50d9b9-96bc-4f79-ad46-c19672f1552c) | Casetă „How it works” scurtă deasupra configurației AI și starea „Enabled” ca text colorat lângă furnizor. | Lista de furnizori „Disabled” cu „Set up” (noi avem doar Claude). |
| 15 | Hume AI | [ecran](https://mobbin.com/screens/f4e18c6b-e945-4cef-a1e1-3948ab8bf125) | Slider cu câmp numeric alăturat (Temperature → 1,0), editabil în ambele locuri. Model pentru concurența worker-ilor. | Layout-ul pe două coloane etichetă / control, prea larg pentru rânduri simple. |
| 16 | Delphi | [ecran](https://mobbin.com/screens/cd875ea2-c870-475a-92cd-1a4b12474e02) | Etichete de grup mici, cu majuscule („PREFERENCES”, „CONFIGURATION”) și rânduri cu valoarea curentă + chevron („Visibility · Public ›”). | Avatarul suspendat deasupra conținutului. |
| 17 | Podia | [ecran](https://mobbin.com/screens/4ab27657-e4b0-45cf-b3a5-8bf64bdf75bf) | Politica de sesiuni e explicată în clar (câte sesiuni, când expiră) chiar deasupra listei. | Tab-urile orizontale pentru 4 secțiuni mici. |

## Tipare comune
- **O coloană de conținut îngustă** (~640–760 px), secțiuni verticale cu titlu și o frază de descriere (Linear, Langdock, Cofounder, Delphi).
- **Rând de setare standard:** etichetă + descriere scurtă la stânga, control la dreapta (Switch / Select / Button). Descrierea spune *efectul* setării (Langdock, Cofounder).
- **Sesiuni:** sesiunea curentă marcată cu badge și fără acțiune de revocare (Cloudflare, Pipedrive, GitLab, Figma), plus acțiune globală „închide celelalte sesiuni” (Linear, Airtable). Meta: dispozitiv / browser, IP, ultima activitate.
- **Integrări / surse:** listă densă cu pictogramă, nume, descriere, badge de stare și Switch (folk, Mistral, Qatalog); starea are și text, nu doar culoare (Qatalog, Customer.io).
- **Reordonare** prin mâner de tragere (incident.io).
- **Salvare imediată** pe fiecare control, cu toast de confirmare (Mistral); fără buton global „Salvează”.
- **Stări goale inline**, nu ecrane separate (Linear: „No passkeys registered” + acțiune).

## Decizia de layout
```
┌────────┬──────────────────────────────────────────────────────────────────────┐
│ Sidebar│  Setări                                                              │
│ app    │  Securitate, surse legale și AI                                      │
│        │ ─────────────────────────────────────────────────────────────────────│
│ Proiecte│  ┌ Pe pagină ┐   ┌──────────────────────────────────────────────┐   │
│ Analiză │  │Securitate │   │ SECURITATE                                    │   │
│ Generare│  │Sesiuni    │   │ PIN de acces                    [Schimbă PIN] │   │
│ …       │  │Surse leg. │   │ Modificat acum 12 zile                         │   │
│         │  │AI         │   ├──────────────────────────────────────────────┤   │
│ Utilizare│ │Analiză    │   │ SESIUNI ACTIVE        [Închide celelalte (2)] │   │
│ Setări ●│  │Cont Claude│   │ 🖥 Safari · macOS  ● Sesiunea curentă           │   │
│         │  └───────────┘   │    127.0.0.1 · activă acum                     │   │
│         │   (sticky,       │ 🖥 Chrome · macOS                    [Revocă]  │   │
│         │    ≥1280px)      │    127.0.0.1 · acum 3 h · creată 28 oct.       │   │
│         │                  ├──────────────────────────────────────────────┤   │
│         │                  │ SURSE LEGALE                    [Reîmprospătează toate]│
│         │                  │ ⋮⋮ 1 Portal Legislativ  ● Actualizat · 3 h  [⏻]│   │
│         │                  │ ⋮⋮ 2 CCR — decizii      ● Vechi · 9 zile    [⏻]│   │
│         │                  │ ⋮⋮ 3 ÎCCJ — RIL/HP      ● Eroare            [⏻]│   │
│         │                  ├──────────────────────────────────────────────┤   │
│         │                  │ AI ȘI PROCESARE                                │   │
│         │                  │ Model Claude          [Sonnet ▾]               │   │
│         │                  │ Analize în paralel    ──●────── [3]             │   │
│         │                  ├──────────────────────────────────────────────┤   │
│         │                  │ ANALIZĂ                                        │   │
│         │                  │ Data de referință   (•) Ziua curentă  ( ) Fixă [📅]│
│         │                  ├──────────────────────────────────────────────┤   │
│         │                  │ CONT CLAUDE                                    │   │
│         │                  │ ● Conectat · andrei@… · plan Max               │   │
│         │                  │ Verificat acum 2 min     [Deschide terminalul →]│  │
│         │                  │                          Vezi limitele de utilizare│
│         │                  └──────────────────────────────────────────────┘   │
└────────┴──────────────────────────────────────────────────────────────────────┘
```
- **O singură pagină derulabilă**, cu ancore (`/setari#surse`), nu sub-rute: sunt 6 secțiuni scurte, iar utilizatorul unic vrea să vadă totul dintr-o privire. Doar terminalul are rută proprie.
- **Navigația secundară** „Pe pagină” (scoasă la cererea utilizatorului, 2026-11-03: pagina e destul de scurtă fără ea) e o listă de ancore sticky în stânga coloanei (scroll-spy), afișată doar de la ≥1280 px. Sub acest prag, ancorele devin un rând de Tabs sticky sus.
- **Ordinea secțiunilor** urmează frecvența și riscul: Securitate → Sesiuni → Surse legale → AI → Analiză → Cont Claude. Contul Claude e ultimul, dar are un indicator de stare dublat în header-ul paginii când e deconectat (Alert sus: „Claude nu e conectat. Analizele nu pot rula.” + „Deschide terminalul”).
- **Primar:** controalele din fiecare rând. **Secundar:** descrierile și meta (ora, IP, mărimea cache-ului). **Acțiuni distructive** (revocare, golire cache) stau în varianta ghost / outline și cer confirmare în Alert dialog.
- **Schimbarea PIN-ului** se face într-un **Dialog** cu 3 pași în același cadru (PIN curent → PIN nou → confirmare), cu Input OTP, aceeași mecanică ca `/setup`. Greșelile la PIN-ul curent se contorizează în aceeași limită de rată ca la login.
- **Prioritatea surselor**: tragere cu mânerul și, pentru tastatură, butoane ↑ ↓ în meniul rândului. Numărul de ordine e afișat explicit (1, 2, 3).
- **Rândul de sursă** se expandează (Collapsible) și arată detalii despre cache: număr de acte, mărime pe disc, ultima sincronizare, ultima eroare, plus acțiunile „Reîmprospătează” și „Golește cache”.

## Componente HextaUI
- **Sidebar**: navigația aplicației (elementul „Setări” activ).
- **Breadcrumb**: `Setări` (iar pe subpagina terminalului `Setări / Terminal Claude`).
- **Tabs** (ecran îngust) / listă de ancore cu **Scroll area**: navigația „Pe pagină”.
- **Card** + **Hairline** + **Separator**: secțiunile și separatoarele dintre rânduri.
- **Item**: rândul standard de setare (media / titlu / descriere / acțiuni). Folosit pentru PIN, sesiuni, surse și contul Claude.
- **Dialog** + **Input OTP** + **Progress** (3 segmente): schimbarea PIN-ului.
- **Badge**: „Sesiunea curentă”, starea cache-ului („Actualizat”, „Vechi”, „Eroare”, „Se sincronizează”), starea contului Claude, planul.
- **Button**: „Schimbă PIN-ul”, „Revocă”, „Închide celelalte sesiuni”, „Reîmprospătează”, „Deschide terminalul”.
- **Alert dialog**: confirmarea revocării, a închiderii tuturor celorlalte sesiuni și a golirii cache-ului.
- **Switch**: activare / dezactivare sursă legală (cu text „Activă” / „Inactivă” lângă).
- **Dropdown menu**: meniul „⋯” al rândului de sursă (Mută mai sus / mai jos, Reîmprospătează, Golește cache).
- **Collapsible**: detaliile de cache ale sursei.
- **Select** (sau **Combobox** dacă lista crește): modelul Claude, cu descriere pe opțiune.
- **Slider** + **Input** numeric (sau **Number flow** pentru afișare): concurența worker-ilor (1–8).
- **Radio group** + **Date picker** (**Calendar** în **Popover**): data de referință implicită.
- **Avatar** (inițiale) + **Badge** + **Hover card**: contul Claude (email, plan, ultima verificare).
- **Tooltip**: explicații scurte la IP sau la „Vechi” (pragul de vechime).
- **Skeleton**: încărcarea fiecărei secțiuni.
- **Toast**: „Salvat”, „Sesiune revocată”, „Sursă dezactivată”, „Cache golit”.
- **Alert**: avertismentul global „Claude nu e conectat”, „Nicio sursă activă”.
- **Spinner**: în Badge-ul „Se sincronizează” și în butoane în timpul acțiunii.
- **Kbd**: în textul de ajutor pentru `pnpm pin:reset`.

## Stări
- **Încărcare:** Skeleton per secțiune (rânduri gri cu înălțimea finală). Secțiunile se încarcă independent, iar starea contului Claude poate întârzia (apel CLI), deci are propriul Skeleton.
- **Salvare:** controlul arată imediat noua valoare (optimist), apoi apare toast-ul „Salvat”. La eroare, valoarea revine și toast-ul arată eroarea cu „Reîncearcă”.
- **Sesiuni, gol (doar cea curentă):** rând unic + text „Nu există alte sesiuni active.”; butonul „Închide celelalte” e ascuns.
- **Sesiuni, revocare:** Alert dialog → rândul dispare cu animație scurtă → toast „Sesiune revocată”. Revocarea sesiunii curente nu e posibilă din listă (pentru asta există „Ieși din cont” în meniul utilizatorului).
- **Surse, toate dezactivate:** Alert warning în secțiune: „Nicio sursă legală activă. Analizele nu pot verifica trimiterile la lege.” Ultima sursă activă nu poate fi oprită fără confirmare.
- **Sursă: cache vechi / eroare:** Badge „Vechi” (galben) sau „Eroare” (roșu) + Tooltip cu detaliul; rândul expandat arată mesajul și „Reîmprospătează”.
- **Sursă: sincronizare în curs:** Badge cu Spinner „Se sincronizează… 42 %” (Progress subțire în rândul expandat); Switch-ul rămâne utilizabil.
- **Schimbare PIN:** PIN curent greșit → eroare inline + încercări rămase; blocare → Dialog-ul arată cronometrul (vezi `02-login-pin.md`). Succes → Dialog-ul se închide, apare toast-ul „PIN schimbat. Celelalte sesiuni au fost închise.” (dacă așa decidem).
- **Model indisponibil pentru planul curent:** opțiunea apare dezactivată în Select, cu motivul („Necesită plan Max”).
- **Concurență:** valori peste 4 afișează textul de ajutor „Poate atinge mai repede limita de 5 ore.”, cu legătură spre `/utilizare`.
- **Cont Claude:** „Conectat” (verde), „Neconectat” (gri, + CTA primar „Conectează în terminal”), „CLI negăsit” (roșu, + instrucțiuni de instalare), „Se verifică…” (Spinner).

## Ecran îngust
- Sidebar-ul aplicației se transformă în Sheet (meniu hamburger); navigația „Pe pagină” devine Tabs orizontale sticky, cu scroll orizontal.
- Rândurile Item trec de la „etichetă stânga / control dreapta” la stivă (control sub descriere) sub ~560 px; Switch-urile rămân la dreapta, pe același rând cu titlul.
- Sesiunile: meta pe două linii, iar „Revocă” devine pictogramă cu Tooltip / aria-label.
- Sursele legale: mânerul de tragere se ascunde, reordonarea se face din meniul „⋯” (Mută mai sus / jos).
- Dialog-ul de schimbare PIN devine **Drawer** de jos.
- Slider-ul ocupă toată lățimea, cu Input-ul numeric dedesubt.

## Microcopy (RO)
- Titlu: **„Setări”** · subtitlu: „Securitate, surse legale și comportamentul AI.”
- **Securitate** — „PIN de acces” · „Modificat acum {n} zile” · buton „Schimbă PIN-ul”
  - Dialog: „Schimbă PIN-ul” · Pas 1 „Introdu PIN-ul actual” · Pas 2 „Alege un PIN nou” · Pas 3 „Confirmă PIN-ul nou” · Buton „Salvează PIN-ul” · Toast „PIN schimbat.”
  - Ajutor: „Ai uitat PIN-ul actual? Îl poți reseta doar pe acest Mac: `pnpm pin:reset`.”
- **Sesiuni active** — descriere: „Browserele în care ești autentificat acum. Închide sesiunile pe care nu le mai folosești.”
  - Badge: „Sesiunea curentă” · Meta: „{Browser} pe {OS} · {IP} · activă {acum 3 h} · creată {28 oct. 2026}”
  - Buton: „Revocă” · „Închide celelalte sesiuni ({n})”
  - Confirmare: titlu „Revoci această sesiune?” · text „Browserul respectiv va cere din nou PIN-ul.” · butoane „Revocă” / „Anulează”
  - Gol: „Nu există alte sesiuni active.”
- **Surse legale** — descriere: „Sursele în care LexAI verifică trimiterile la lege, în ordinea priorității. Prima sursă care răspunde e folosită ca referință.”
  - Stări: „Actualizat · acum {3 h}”, „Vechi · {9 zile}”, „Eroare la ultima sincronizare”, „Se sincronizează… {42 %}”
  - Switch: „Activă” / „Inactivă” · Meniu: „Mută mai sus”, „Mută mai jos”, „Reîmprospătează acum”, „Golește cache-ul”
  - Detalii: „{1.248} acte în cache · {312 MB} · ultima sincronizare {1 nov. 2026, 09:14}”
  - Confirmare golire: „Golești cache-ul pentru {sursă}? Următoarea analiză va descărca din nou textele, deci va dura mai mult.”
  - Avertisment: „Nicio sursă legală activă. Analizele nu pot verifica trimiterile la lege.”
- **AI și procesare**
  - „Model Claude” · descriere: „Folosit pentru analiză și generare. Modelele mai mari sunt mai atente, dar consumă limita mai repede.”
  - „Analize în paralel” · descriere: „Câte documente sau verificări rulează simultan.” · ajutor la valori mari: „Peste 4 poți atinge mai repede limita de 5 ore. Vezi Utilizare.”
- **Analiză**
  - „Data de referință implicită” · descriere: „Data la care se verifică forma legii, dacă nu alegi alta pentru un document.”
  - Opțiuni: „Ziua curentă” / „O dată fixă” · placeholder „Alege data”
- **Cont Claude**
  - „Conectat ca {email} · plan {Max}” · „Verificat acum {2 min}” · buton „Verifică din nou”
  - „Neconectat” · text „Analizele și generarea nu pot rula fără un cont Claude.” · buton „Conectează în terminal”
  - „Claude CLI nu a fost găsit pe acest Mac.” · „Instalează-l, apoi apasă Verifică din nou.”
  - Legături: „Deschide terminalul →”, „Vezi limitele de utilizare”
- Toast-uri: „Salvat”, „Sesiune revocată”, „{n} sesiuni închise”, „Sursă dezactivată”, „Cache golit”, „Nu am putut salva. Reîncearcă.”

## Întrebări deschise
- La schimbarea PIN-ului închidem automat celelalte sesiuni? Recomandare: da, cu mențiune în Dialog.
- Avem „blocare automată după inactivitate” (de ex. 15 / 30 / 60 min)? Dacă da, intră în secțiunea Securitate, ca Select.
- Ce surse legale exacte avem la lansare (Portal Legislativ, CCR, ÎCCJ RIL/HP, Monitorul Oficial?) și care sunt obligatorii, deci fără Switch?
- Prioritatea surselor contează la *toate* tipurile de verificare sau doar la textul de lege? Formularea din descriere depinde de asta.
- Pragul „Vechi” pentru cache: 7 zile? Configurabil?
- Lista modelelor vine din CLI (dinamic) sau e fixă în aplicație? Afișăm costul relativ (indicatori ca la Cofounder)?
- Limita maximă de concurență (8?) depinde de plan sau de nucleele CPU?
- Data de referință „fixă” rămâne fixă pentru totdeauna sau expiră? Avertizăm dacă e mai veche de 1 an?
- Ieșirea din cont (logout) stă aici, în Securitate, sau doar în meniul utilizatorului din sidebar?
