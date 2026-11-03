# 08 — Rezultatele analizei

**Rută / context:** editorul de document (`/proiecte/[id]/documente/[docId]`), foaia A4 continuă în stânga, fila „Rezultate” a panoului lateral în dreapta · **Scop:** să facă vizibile, în document și în listă, toate constatările analizei, cu dovada din textul oficial, și să permită corectarea rapidă · **Ce face utilizatorul aici:** parcurge constatările (`j` / `k`), filtrează după stare, citește explicația și fragmentul oficial, deschide sursa, aplică o corectură ca sugestie urmărită sau o ignoră, marchează o constatare ca verificată, reverifică paragrafele modificate.

## Referințe analizate (≥10)
| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Grammarly | [ecran](https://mobbin.com/screens/0caaf95f-3f96-4030-baca-9ff2431c0464) | Panou „Review suggestions” cu numărător; carduri strânse pe o linie (categorie mică + text) și un singur card deschis cu contextul, textul tăiat → înlocuire și „Accept / Dismiss / ⋯”; sublinierea din document are culoarea categoriei; filele de categorii au o bară colorată deasupra. Modelul principal al listei. | Scorul „Overall score” (nu are sens juridic); emoji-urile; categoriile ca file cu text minuscul. |
| 2 | Grammarly | [ecran](https://mobbin.com/screens/b092ad71-b236-451c-b28b-b0893f3ff6e2) | Card de sursă: „This text matches …”, titlul sursei ca link, caseta gri „Detected reference” cu citatul și URL-ul, acțiuni „Copy reference / Dismiss”; pasajul din document e evidențiat cu fundal turcoaz. Forma blocului „Dovadă”. | URL-ul complet afișat pe trei rânduri, greu de citit. |
| 3 | Grammarly | [ecran](https://mobbin.com/screens/352b524f-4bb8-44a4-84a7-b58f5556cf1b) | Starea goală a panoului, centrată, cu un titlu scurt și o linie de explicație. | Ilustrația jucăușă — tonul trebuie să fie sobru. |
| 4 | WRITER | [ecran](https://mobbin.com/screens/65eaa501-c59e-47e8-8feb-82715829ec9e) | Coloană de categorii cu punct colorat și numărător (Spelling 3, Style 14) lângă lista de carduri; cardul deschis arată textul vechi tăiat, săgeată și textul nou pe fundal verde; statistici mici jos (cuvinte, timp de citire). | Trei coloane înghesuite în panou; scorul rotund „87”. |
| 5 | Contractbook | [ecran](https://mobbin.com/screens/a0a20f88-7e38-42cf-9aa3-353e14088b01) | Sugestie urmărită direct în contract: text vechi tăiat roșu + text nou albastru; bulină numerotată în marginea paragrafului; panou „Comments and suggestions” cu „Replace: … with: …”; toast „Thread successfully resolved”. Exact cum trebuie să arate „Aplică sugestia”. | Bara verticală de iconițe fără etichete din dreapta. |
| 6 | Searchable | [ecran](https://mobbin.com/screens/2f0fbd3a-a396-4545-90c4-10da4ccba41c) | „All issues (31)” cu badge de severitate (Critical / High) aliniat dreapta, sortare „Severity”, buton „Re-run”; contor „0 of 31 fixed”; carduri de detaliu cu „Mark Fixed” și navigare „21 / 31 ‹ ›”. Modelul pentru acoperire + reverificare. | Două zone separate (listă + carduri) care repetă aceleași probleme. |
| 7 | Linear | [ecran](https://mobbin.com/screens/2579f037-4e90-4330-ac35-19323ca9828a) | Listă grupată pe stare cu antet de grup + numărător („In Progress 5”, „Todo 7”); meniu de filtrare cu submeniu și numărătoare pe valoare („High 14 issues”). | Etichetele colorate multiple pe fiecare rând. |
| 8 | incident.io | [ecran](https://mobbin.com/screens/58cf61e8-ef30-48f7-9e6d-cc3114595778) | Filtru de stare ca popover cu bife multiple, valorile grupate (Active / Post-incident / Closed), chip pentru valoarea aleasă și „Done”. Bun pentru „Arată: greșeli + discutabile”. | Prea mulți pași pentru un filtru folosit des — la noi filtrul principal stă la vedere. |
| 9 | Sentry | [ecran](https://mobbin.com/screens/92525937-e703-4e62-bd8a-2b6bcb7ca627) | Filtrele active ca jetoane în bara de căutare („priority is high or medium ×”), ușor de șters unul câte unul; vederi salvate. | Coloanele de tip „Trend / Events / Users”, irelevante. |
| 10 | Quo | [ecran](https://mobbin.com/screens/333f2c13-59f8-4cb3-ac17-a1ec72d89837) | Panou de detaliu cu „1 / 2” și săgeți sus/jos în antet pentru elementul anterior/următor, plus acțiunea principală („Mark as complete”) chiar sub titlu. Modelul pentru `j` / `k`. | Badge-ul roșu „Past due” folosit și pentru informații neurgente. |
| 11 | Devin | [ecran](https://mobbin.com/screens/943c5aac-94ad-4e06-bbab-70d3a88e3fa1) | Steguleț ancorat pe linia vizată + card „Investigate” cu titlu-concluzie, explicație și trimiteri clicabile la fișier:linie; „Copy flag”. Model pentru explicație + legătura cu textul. | Codul în două coloane care consumă tot ecranul. |
| 12 | Gemini Notebook | [ecran](https://mobbin.com/screens/e5ced159-147b-4772-bb7b-78d83dba09ef) | Citări numerotate inline (bulină mică cu cifră) care trimit la sursele din stânga; carduri de răspuns cu verdict colorat („Not quite” roșu cu ×, „Right answer” verde cu ✓) și explicație sub verdict. | Fundalurile pline roșu/verde pe tot cardul, prea apăsate pentru o listă lungă. |
| 13 | Peec AI | [ecran](https://mobbin.com/screens/45e6e39e-88e7-414c-a9db-169d95c614ec) | Panou „Details” cu secțiunea „Sources”: favicon + titlu + URL scurt pe două rânduri, „View all…”. Forma listei de surse oficiale. | Evidențierea galbenă a mărcilor în text, fără legătură cu vreo stare. |
| 14 | Confluence | [ecran](https://mobbin.com/screens/048344a5-3f3c-4740-b41f-c8ca1e34b23f) | Ordinea acțiunilor pe un rezultat AI: „Discard” (text), „Refine ▾”, „Insert below”, „Replace” (primar, dreapta); notă „Uses AI. Verify results.” | Panoul plutitor peste text, care ascunde paragraful corectat. |
| 15 | Dropbox Dash | [ecran](https://mobbin.com/screens/fc54be30-29ff-430c-9554-7858c47373e8) | Chip discret de sursă după fiecare afirmație (iconiță fișier + nume), plus „1 source” sub răspuns. Model pentru eticheta de sursă din cardul de dovadă. | Chip-urile repetate identic după fiecare rând, zgomot vizual. |

## Tipare comune
- **Document + panou sincronizate**: fiecare problemă are un highlight în text în culoarea categoriei și un card în panou; clic pe oricare îl selectează pe celălalt (Grammarly, WRITER, Contractbook, Devin).
- **Un singur card deschis**: lista arată rânduri compacte, cardul selectat se extinde pe loc cu context, explicație și acțiuni (Grammarly, WRITER).
- **Diferența ca text tăiat → text nou**, nu ca două paragrafe (Grammarly, WRITER, Contractbook).
- **Acțiunea principală în dreapta, renunțarea ca text în stânga** („Accept / Dismiss”, „Discard … Replace”) (Grammarly, Confluence).
- **Severitate ca badge cu text + culoare, sortare implicită după severitate**, numărătoare pe filtru (Searchable, Linear, incident.io).
- **Navigare secvențială** „21 / 31 ‹ ›” sau „1 / 2 ↑ ↓” în antetul detaliului (Searchable, Quo).
- **Progres de rezolvare** („0 of 31 fixed”) și **„Re-run”** lângă listă (Searchable).
- **Dovada ca citat într-o casetă separată**, cu titlul sursei și link (Grammarly, Peec AI, Gemini Notebook).

## Decizia de layout
Editorul ocupă stânga (foaia A4 centrată, max 816 px), panoul „Rezultate” dreapta (Resizable, 380–480 px, implicit 420 px).

```
┌──────────────── Editor (foaie A4) ─────────────────┬────────── Panou „Rezultate” (420px) ──────────┐
│  ▍                                                 │ Rezultate · legislația la 01.03.2025   [⟳ 3] │ ← antet; „Reverifică 3 paragrafe modificate”
│  ▍ ART. 4. Prețul                                  │ ▰▰▰▰▰▰▰▰▰▰▱▱▱▱▱▱▱▱ 47 trimiteri, toate verif. │ ← bară de acoperire segmentată pe stări
│ 2│ Prețul se plătește conform art. 1.350 alin. (3) │ 18 corecte · 3 greșeli · 2 discutabile …      │
│  ▍ C. civ.  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌ (roșu)      │                                              │
│  ▍                                                 │ [Toate 47][✕ 3][△ 2][◎ 1][? 2][✓ 18]  Act ▾  │ ← Toggle group + filtru pe act normativ
│  ▍ ART. 5. Durata                                  │ ─────────────────────────────────────────── │
│ 1│ … potrivit art. 1.777 C. civ. ~~~~~~ (chihlimbar)│ Greșeli de citare (3)                        │ ← grupare implicită pe stare, sortat după gravitate
│  ▍                                                 │ ✕ art. 1.350 alin. (3) C. civ.     Art. 4  ›│
│ ▲ paragraf modificat după analiză                  │ ┌──────────────────────────────── 1 / 47 ↑↓ ┐│ ← card deschis (inline)
│                                                    │ │ ✕ Greșeală de citare · Alineat inexistent ││
│                                                    │ │ Art. 1.350 are doar două alineate în forma││
│                                                    │ │ în vigoare la 01.03.2025.                 ││ ← Explicație
│                                                    │ │ ┌ Dovadă ─────────────────────────────── ┐││
│                                                    │ │ │ „(2) Atunci când, fără justificare, …” │││ ← citat exact
│                                                    │ │ │ Codul civil, art. 1.350 · Portal       │││
│                                                    │ │ │ Legislativ · forma la 01.03.2025 ↗     │││
│                                                    │ │ └────────────────────────────────────────┘││
│                                                    │ │ Sugestie: art. 1.350 ~~alin. (3)~~ alin. (2)│
│                                                    │ │ Ignoră   Marchează verificat  [Aplică ca  ││ ← acțiuni
│                                                    │ │                               sugestie]   ││
│                                                    │ └───────────────────────────────────────────┘│
│                                                    │ ✕ art. 41 alin. (5) C. muncii       Art. 9  ›│
│                                                    │ Interpretări discutabile (2)                 │
│                                                    │ △ art. 1.777 C. civ.                Art. 5  ›│
│                                                    │ ──────────────────────────────────────────── │
│                                                    │ j / k navighează · Enter aplică · Esc închide│ ← subsol cu scurtături (Kbd)
└────────────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

**Primar:** cardul constatării selectate (explicație, dovadă, sugestie, acțiune) și highlight-ul corespunzător din document. **Secundar:** lista filtrată, grupată pe stare (implicit) sau pe act normativ (comutator „Grupează după: stare / act / ordinea din document”). **Terțiar:** bara de acoperire, statisticile, jurnalul (în fila „Analiză”).

Detalii:
- **Highlight-uri în document:** fundal tentat (≈ 15–20% opacitate) + subliniere de 2 px cu stil diferit pe stare (vezi „Culori pe stări”). Constatările „corect” nu sunt evidențiate implicit (Switch „Arată și trimiterile corecte”), ca să nu inunde documentul cu verde. Highlight-ul selectat primește contur de 1 px și fundal mai intens; restul scad la 60%.
- **Marcaje în margine** (stil Contractbook): în marginea stângă a foii, o bară verticală subțire colorată după cea mai gravă stare din paragraf + numărul de constatări; clic → selectează prima. Paragrafele modificate după analiză au o bară gri punctată și eticheta „modificat” la hover.
- **Navigare:** `j` / `k` = următoarea / anterioara în lista filtrată, `Enter` = aplică sugestia, `i` = ignoră, `v` = marchează verificat, `o` = deschide sursa, `Esc` = închide cardul. Navigarea derulează documentul și pune focus pe highlight. „1 / 47” se actualizează după filtru.
- **Aplică sugestia:** inserează o modificare urmărită (text vechi tăiat, text nou subliniat) atribuită „LexAI”; constatarea trece în „Rezolvată — sugestie în așteptare” și rămâne în listă cu opacitate redusă până la acceptarea modificării în editor. Undo cu `⌘Z` și din Toast.
- **Reverificare:** antetul arată „Reverifică 3 paragrafe modificate” doar când există modificări după analiză; rulează un job mic (aceeași componentă de progres din 07, varianta compactă în antetul panoului), apoi înlocuiește doar constatările acelor paragrafe.
- **Bara de acoperire:** segmente proporționale pe stări, în ordinea gravității (greșeală → discutabilă → analiză umană → neverificat → corect); sub ea un rând text cu cifrele. Hover pe segment → Tooltip; clic → aplică filtrul.

## Componente HextaUI
- **Resizable** — editor / panou.
- **Marker** — highlight-urile din document (fundal + subliniere pe stare, stare selectată).
- **Tabs** — filele panoului („Analiză”, „Rezultate”).
- **Toggle group** — filtrul pe stări, cu iconiță + numărător în fiecare buton; selecție multiplă.
- **Combobox** — filtrul pe act normativ („Codul civil”, „Codul muncii”…), cu căutare.
- **Select** — „Grupează după”.
- **Item** — rândul compact al constatării (iconiță stare, citare, articolul din document la dreapta).
- **Accordion** — grupurile (pe stare sau pe act), cu numărător în antet.
- **Card** — cardul deschis al constatării.
- **Badge** — eticheta de stare și categoria („Alineat inexistent”, „Act abrogat”, „Text modificat”, „Valoare greșită”, „Decizie obligatorie ignorată”).
- **Progress** — bara de acoperire segmentată (variantă cu mai multe segmente, construită din Progress sau ca bară simplă cu `div`-uri în tokeni).
- **Hover card** — previzualizarea dovezii la hover pe un highlight din document (citat + sursă), fără să schimbe selecția.
- **Tooltip** — pe segmentele barei, pe iconițele din margine, pe butoanele cu scurtături.
- **Kbd** + **Hotkey** — scurtăturile `j`, `k`, `Enter`, `i`, `v`, `o`, `Esc`.
- **Button** / **Button group** — „Aplică ca sugestie” (primar), „Marchează verificat” (secundar), „Ignoră” (ghost); „Reverifică”.
- **Dropdown menu** — „⋯” pe card: „Copiază citatul”, „Copiază trimiterea corectă”, „Deschide în Portal Legislativ”, „Raportează o eroare a analizei”.
- **Switch** — „Arată și trimiterile corecte”, „Ascunde rezolvatele”.
- **Toast** — „Sugestie aplicată” + „Anulează”.
- **Empty** — starea fără rezultate / fără constatări pentru filtrul curent.
- **Scroll area** + **Scroll fade** — lista.
- **Command** — `⌘K` „Mergi la constatare…” (căutare după articol sau act).
- **Skeleton** — la reîncărcarea rezultatelor după reverificare.

## Stări
- **Gol (document neanalizat):** Empty: „Încă nu există rezultate pentru acest document.” + „Pornește analiza” (trimite la fila „Analiză”, 07).
- **Încărcare:** Skeleton pentru antet și 6 rânduri; highlight-urile apar după ce lista e gata, nu înainte.
- **În curs (analiza încă rulează):** fila „Rezultate” e utilizabilă — constatările sosite apar în listă cu o bulină „nou”; bara de acoperire are un segment gri hașurat „în verificare”. Antetul arată pastila compactă din 07.
- **Fără constatări problematice:** card succes discret: „Toate cele 47 de trimiteri sunt corecte în forma în vigoare la 01.03.2025.” + lista corectelor strânsă.
- **Filtru fără rezultate:** „Nicio constatare cu aceste filtre.” + „Șterge filtrele”.
- **Paragrafe modificate:** banner subțire în antet „3 paragrafe modificate după analiză — rezultatele lor pot fi depășite.” + „Reverifică”.
- **Reverificare în curs:** antetul arată Spinner + „Reverific 3 paragrafe…”; constatările vizate au opacitate redusă și eticheta „se reverifică”.
- **Eroare la aplicarea sugestiei** (textul s-a schimbat între timp): Alert în card „Textul din document nu mai corespunde. Reverifică paragraful.” + „Reverifică”.
- **Sursă indisponibilă:** în blocul „Dovadă”, citatul rămâne (e salvat), linkul primește iconiță de avertizare și Tooltip „Pagina sursei nu răspunde acum”.
- **Limită atinsă la reverificare:** același Alert ca în 07, în antetul panoului, cu ora resetării.

## Culori pe stări
Principiu: culoarea nu poartă singură sensul. Fiecare stare are **iconiță + etichetă text + stil de subliniere** distincte, astfel încât documentul rămâne lizibil în alb-negru, pentru daltoniști și la imprimare. Tokenii sunt definiți o singură dată (CSS variables în tema Tailwind 4) și au valori separate pentru tema deschisă și cea închisă.

| Stare (cod) | Rol de culoare | Iconiță (Lucide) | Etichetă | Highlight în document | Badge (deschis) | Badge (închis) |
|---|---|---|---|---|---|---|
| `eroare_citare` — greșeală | `--status-error` (roșu) | `CircleX` | „Greșeală de citare” | fundal roșu 15% + subliniere **continuă** 2 px | text red-700 pe red-50, bordură red-200 | text red-300 pe red-500/15, bordură red-500/30 |
| `interpretare_discutabila` | `--status-warning` (chihlimbar) | `TriangleAlert` | „Interpretare discutabilă” | fundal amber 18% + subliniere **ondulată** | text amber-800 pe amber-50, bordură amber-200 | text amber-300 pe amber-500/15, bordură amber-500/30 |
| `necesita_analiza_umana` | `--status-review` (violet / indigo) | `UserRoundSearch` | „Necesită analiză umană” | fundal violet 15% + subliniere **dublă** | text violet-700 pe violet-50, bordură violet-200 | text violet-300 pe violet-500/15, bordură violet-500/30 |
| `neverificat` | `--status-unknown` (neutru) | `CircleDashed` | „Neverificat” | fără fundal + subliniere **punctată** gri | text zinc-600 pe zinc-100, bordură zinc-200 | text zinc-400 pe zinc-500/15, bordură zinc-500/30 |
| `corect` | `--status-ok` (verde / smarald) | `CircleCheck` | „Corect” | ascuns implicit; la cerere: subliniere **subțire** 1 px verde, fără fundal | text emerald-700 pe emerald-50, bordură emerald-200 | text emerald-300 pe emerald-500/15, bordură emerald-500/30 |
| (rezolvată — sugestie aplicată) | neutru + bifă | `CheckCheck` | „Sugestie aplicată” | highlight-ul dispare; rămâne modificarea urmărită | text zinc-500, tăiat subtil | text zinc-500 |

Reguli:
- **Contrast:** textul badge-urilor trebuie să aibă ≥ 4,5:1 față de fundalul badge-ului; iconițele și sublinierile ≥ 3:1 față de foaie (WCAG 1.4.11). Textul documentului peste highlight rămâne în culoarea de bază (`--foreground`), niciodată colorat.
- **Tema închisă:** foaia A4 nu devine negru pur (folosim `--sheet` ≈ zinc-900, cu text zinc-100); fundalurile de highlight cresc la ≈ 22% opacitate și folosesc nuanțele 400 în loc de 600, ca să nu pară „neon”. Sublinierile folosesc nuanța 400.
- **Selectat:** highlight-ul activ primește contur 1 px în culoarea stării și fundal +10% opacitate; în listă, rândul activ are bară verticală de 2 px în culoarea stării.
- **Imprimare / export:** highlight-urile nu se exportă; dacă utilizatorul cere raport adnotat, se folosesc doar sublinierile și o notă de subsol cu eticheta text.
- **Ordinea gravității** (folosită la sortare, bara de acoperire și bara din margine): greșeală → discutabilă → analiză umană → neverificat → corect.
- **Folosirea culorii accent (AI):** violetul de „analiză umană” trebuie să rămână diferit de accentul de brand / AI. Dacă accentul aplicației e tot violet, „Necesită analiză umană” trece pe albastru-cer (`sky`) cu aceleași reguli.

## Ecran îngust
- Sub 1024 px panoul devine **Sheet** din dreapta, deschis dintr-un buton „Rezultate (8)” din bara editorului; selecția unui highlight din document deschide direct cardul lui.
- Sub 640 px: **Drawer** de jos cu două trepte: treapta mică arată doar cardul curent cu „‹ 3 / 47 ›” și acțiunea principală; treapta mare arată lista și filtrele.
- Toggle group-ul de filtre devine un rând derulant orizontal cu iconiță + cifră; eticheta completă apare în Tooltip și în meniul „Filtre”.
- Marcajele din margine rămân (sunt mai utile decât lista pe ecran mic); highlight-urile își păstrează stilurile de subliniere.
- Scurtăturile `j` / `k` rămân active cu tastatură externă; pe touch, swipe orizontal pe cardul curent = următoarea / anterioara.

## Microcopy (RO)
- Antet: „Rezultate”, „Legislația în vigoare la 01.03.2025”, „47 de trimiteri · toate verificate”, „3 rezolvate din 6”.
- Filtre: „Toate”, „Greșeli”, „Discutabile”, „Analiză umană”, „Neverificate”, „Corecte”; „Act normativ”; „Grupează după: stare / act normativ / ordinea din document”.
- Categorii (badge): „Alineat inexistent”, „Articol inexistent”, „Act abrogat”, „Text modificat”, „Valoare sau termen greșit”, „Decizie obligatorie ignorată”, „Denumire greșită a actului”.
- Secțiuni card: „Explicație”, „Dovadă”, „Sugestie”.
- Sursă: „Codul civil, art. 1.350 · Portal Legislativ · forma în vigoare la 01.03.2025”, „Decizia CCR nr. 1/2014 · ccr.ro”, „Decizia ÎCCJ (RIL) nr. 2/2020 · scj.ro”.
- Butoane: „Aplică ca sugestie”, „Marchează verificat”, „Ignoră”, „Deschide sursa”, „Copiază citatul”, „Reverifică 3 paragrafe”, „Șterge filtrele”.
- Toast: „Sugestia a fost adăugată ca modificare urmărită.” + „Anulează”.
- Paragrafe modificate: „3 paragrafe modificate după analiză — rezultatele lor pot fi depășite.”
- Gol: „Încă nu există rezultate pentru acest document.”; filtru gol: „Nicio constatare cu aceste filtre.”
- Toate corecte: „Toate cele 47 de trimiteri sunt corecte în forma în vigoare la 01.03.2025.”
- Subsol: „j / k navighează · Enter aplică · Esc închide”.
- Notă de responsabilitate (o singură dată, în subsolul panoului): „Verificare automată pe textul oficial. Decizia finală îți aparține.”

## Întrebări deschise
- „Ignoră” e definitiv pentru această versiune a documentului sau reapare la o reverificare completă? Păstrăm motivul ignorării (opțional, un câmp scurt)?
- Pentru constatările „necesită analiză umană”, utilizatorul trebuie să poată adăuga o notă proprie care devine parte din raport?
- Grupare implicită: pe stare (gravitate) sau în ordinea din document? Grammarly și Searchable aleg gravitatea, editorii de contracte ordinea textului.
- Bara de acoperire numără trimiterile sau articolele distincte (aceeași trimitere repetată de 5 ori)?
- Sugestiile aplicate trebuie acceptate și în editor (dublă confirmare) sau „Aplică” le acceptă direct, cu posibilitate de undo?
- Hover card pe highlight sau doar clic? Pe documente dense hover-ul poate deveni agasant.
