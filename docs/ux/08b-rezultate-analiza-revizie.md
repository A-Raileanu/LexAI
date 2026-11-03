# 08b — Rezultatele analizei: revizia panoului

**Înlocuiește** secțiunile „Decizia de layout”, „Culori pe stări” și „Microcopy” din `08-rezultate-analiza.md` pentru panoul din dreapta. Rămân valabile din 08: highlight-urile din document și stilurile lor de subliniere, marcajele din margine, reverificarea, stările de încărcare și eroare, comportamentul pe ecran îngust. Direcția comună (`00-directie.md`) rămâne valabilă, cu o abatere asumată: în panou nu folosim 12 px pentru meta (minimum 13 px).

**Context:** panoul „Rezultate” are 360–420 px (implicit 420 px). Lângă el se află foaia A4. Utilizatorul (avocat) parcurge constatările, decide pentru fiecare și trece mai departe. Panoul e o **listă de triaj**, nu un raport.

---

## 1. Ce n-a mers

| Plângerea | Cauza în panoul actual |
|---|---|
| **„foarte greoaie, greu de citit, cu spațieri greșite”** | Cardul deschis stivuiește ~11 blocuri cu aceeași greutate vizuală (badge, categorie, titlu, act, explicație, ipoteze, excepții, verdict, dovadă, text document, acțiuni). Sunt trei niveluri de casete imbricate (card → „Verdict” → „Dovadă”), fiecare cu propriul padding (`p-3`, `gap-1`, `gap-2`, `bg-muted/30`), deci marginile nu se aliniază pe nicio coloană. Înălțimile de rând sunt cele implicite, nedefinite pentru 11 px. |
| **„elemente de separare greu de identificat”** | Același hairline `--border` (oklch 0.922, **1,26:1** față de alb) desparte grupuri, carduri și casete interioare. Fundalurile `bg-muted/30` și `bg-muted/60` abia se văd. Nu există o ierarhie clară între granițele grup / rând / card. |
| **„fonturi prea mici în unele cazuri”** | În tema noastră `--text-xs` este **0.6875rem = 11 px** (`globals.css`), nu 12 px. `text-xs` apare în „Ipoteze”, „Excepții și condiții”, „Afirmația verificată”, chip-ul de categorie, sursă și „Textul citit”. Badge-ul `size="sm"` are tot 11 px. Textul secundar e gri deschis la 11–13 px. |
| **„culori non-accesibile”** | `--v-discutabil` folosit ca text are **3,18:1** pe alb și **2,86:1** pe propriul fundal de 10 % (portocaliu pe piersică). `--v-corect` folosit ca text are **3,67:1**. `--muted-foreground` pe `--muted` are **4,34:1**. Inelul de focus `--color-focus-ring` (foreground 40 %) are **2,71:1** pe alb. Toate sunt sub prag. |
| **„cantitate mare de informații și uneori repetitive”** | Numele actului apare de 3 ori. Starea apare de 3 ori (badge, caseta „Verdict”, grupul și iconița). Rezumatul verdictului repetă explicația. Linia de acoperire repetă numerele din chip-uri, iar chip-urile repetă numerele din grupuri. Data legislației apare în antet și în fiecare sursă. Textul din document e citat în panou deși e evidențiat chiar alături, pe foaie. |
| **„trebuie să o regândim complet”** | Modelul greșit: un „raport complet” mutat într-o bară laterală. Noul model e **lista de triaj** (Grammarly, Linear, Lovable): rânduri de o linie, un singur element deschis, care arată doar ce trebuie pentru o decizie, iar restul stă în „Detalii”. |

---

## 2. Referințe (Mobbin, web)

18 ecrane și fluxuri din 15 aplicații. Toate au fost văzute.

| # | Aplicație | Link | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Grammarly | [ecran](https://mobbin.com/screens/82d0d01f-8aa2-4fe4-a658-1498c92fb1ae) | Rânduri închise de o linie (categorie + text), un singur card deschis. Două variante ca opțiuni alăturate, apoi „Accept” (primar) și „Dismiss” (text) pe același rând. | Filele de categorie cu bară colorată și text minuscul; scorul general. |
| 2 | Grammarly | [ecran](https://mobbin.com/screens/b727d76e-6475-4a20-a8bd-d0ad05569b30) | Meniul „⋯” lângă acțiuni ascunde opțiunile rare („Incorrect suggestion”, „Turn off…”), iar cardul rămâne curat. | — |
| 3 | WRITER | [ecran](https://mobbin.com/screens/6865de54-3229-4b76-9e85-fc4a3499dd15) | Lista: punct colorat + termen + categorie gri, pe o linie. Cardul deschis: text vechi tăiat → text nou pe fundal verde, explicația sub el. | Cardurile cu umbră pentru fiecare rând; coloana a treia de categorii. |
| 4 | WRITER | [ecran](https://mobbin.com/screens/86221de5-38b0-48df-965e-9adbd7b302ac) | Variante multiple ca rânduri distincte, cu cuvintele schimbate evidențiate, acțiune pe rând și „Show more” după primele două. | Popover-ul plutitor peste text. |
| 5 | Adobe Express | [ecran](https://mobbin.com/screens/9ae8ffda-7033-48ea-a787-6c17c73c562d) | „Results”: listă de variante cu selecție vizibilă (chenar pe cea aleasă) și **un singur** buton „Replace” pentru varianta selectată. | Credite și titlu cu iconiță „info” fără rost. |
| 6 | Lovable | [ecran](https://mobbin.com/screens/249b76a6-5a99-48a3-823a-1158adade0d6) | Problema închisă e un rând „nivel + titlu”. Deschisă: titlul tehnic, explicația în paragraf lizibil și „Ignore Issue” în dreapta. Fără alte casete. | Badge-ul „LLM Database Check” lângă titlu (zgomot). |
| 7 | Base44 | [ecran](https://mobbin.com/screens/89946769-4d5e-4396-8667-e4523690e0ce) | „Key Issues”: rânduri de o linie cu iconiță de severitate. Detaliile stau după un „Full report” pliabil, iar severitatea e text („Warnings”, „Blocking issues”), nu doar culoare. | Caseta roșie mare de rezumat deasupra listei. |
| 8 | Semrush | [ecran](https://mobbin.com/screens/0f5eb2f2-aa33-4170-998c-0754c86f0b82) | Grupare „Errors (1) / Warnings (1) / Notices (1)”: antet de grup cu numărul, rânduri sub el, iar explicația lungă stă după „How to fix”. | Linia colorată groasă sub fiecare antet. |
| 9 | Semrush | [ecran](https://mobbin.com/screens/ed82aafc-c4dc-442d-87fc-359f7347f940) | Diff la nivel de cuvânt: doar porțiunea schimbată e colorată (roșu șters / verde nou), nu tot paragraful. | Două coloane „Original / New” pe tot ecranul — nu încap în 360 px. |
| 10 | Graphite | [ecran](https://mobbin.com/screens/b4ac89ad-1ac3-4b85-a94d-71b22d6dede8) | Secțiuni pliabile cu numărul în față („4 Drafts”), cele goale închise. Granițele dintre secțiuni sunt clare, iar rândurile din interior sunt simple. | Coloanele de iconițe fără etichete. |
| 11 | Miro | [ecran](https://mobbin.com/screens/96b4bf05-95bb-4dd3-a26d-1209ed32a626) | Panoul de probleme e grupat pe tip, cu eticheta de gravitate în text („SERIOUS”) lângă titlul grupului, o singură dată. Elementul selectat are chenar clar. | Exemplele mari gri care ocupă jumătate de panou. |
| 12 | Coda | [ecran](https://mobbin.com/screens/fce42576-5c93-45c8-9083-c8fa1c4c2c69) | Elementele rezolvate stau separat („Resolved · 1 resolved comment”) și au „Re-open” direct pe card. Modelul pentru „Ignorate” + „Restaurează”. | Panou complet separat doar pentru rezolvate. |
| 13 | Rows | [ecran](https://mobbin.com/screens/7e5bcb17-43cd-48d4-b534-8ca397486fd2) | Firul rezolvat rămâne în listă comprimat, cu „Resolved” + „Reopen to reply”. Comutatorul „Show resolved comments” e ascuns în meniu, nu stă la vedere. | Comutatorul în meniu de filtrare — la noi devine un grup închis. |
| 14 | Fibery | [ecran](https://mobbin.com/screens/aec022d4-9b58-4a3d-8bc2-1475467913ca) | „Open 1 / Resolved 0”: contoare mici, tabulare, lângă etichetă. Acțiunea „Resolve” e în antetul firului. | Popover-ul de comentariu peste conținut. |
| 15 | Plane | [ecran](https://mobbin.com/screens/8fc2f1e4-16c1-414b-9cfd-abe902a74c9d) | Antetul detaliului are săgeți ↑ ↓ (anterior / următor) și „Accept / Decline” sus. Lista „Open / Closed” are contorul lângă etichetă. | Cardul de listă cu 4 rânduri de meta. |
| 16 | Trello (flux) | [flux](https://mobbin.com/flows/30202091-8ed3-4791-9aed-935bc16efd4b) | „Dismiss” scoate imediat cardul din listă; toast jos „Dismissed to … · **Undo** · ×”. | Toast-ul cu link spre altă pagină. |
| 17 | Google Drive (flux) | [flux](https://mobbin.com/flows/0bd3b041-639f-4e58-803e-af08675d0dc7) | Sugestia respinsă dispare fără confirmare, iar toast-ul scurt „Suggestion dismissed” spune ce s-a întâmplat. | Lipsa butonului de anulare în toast. |
| 18 | Shopify (flux) | [flux](https://mobbin.com/flows/3387fbad-f7ca-4c81-8c80-eff6a5f973fb) | Starea finală „All caught up”, cu o bifă și o linie, după ce toate cardurile au fost închise. | Cardurile promoționale de după. |

---

## 3. Principii (7)

1. **O linie pe constatare închisă.** Rândul are 40 px: iconița de stare, trimiterea, locul în document. Nimic altceva.
2. **Un singur semnal de stare.** Starea se vede prin forma și culoarea iconiței. Numele stării apare o singură dată, în antetul grupului. Fără badge de stare, fără chip de categorie, fără caseta „Verdict”.
3. **Fiecare informație apare o singură dată.**
   - Actul apare doar în trimitere.
   - Data legislației apare doar în antetul panoului.
   - Textul din document rămâne pe foaie, unde e deja evidențiat.
4. **Dezvăluire în trei trepte:**
   - **rândul;**
   - **decizia:** concluzia, explicația, dovada, corectura, acțiunile;
   - **„Detalii”:** ipoteze, excepții, afirmația verificată, metadatele dovezii.

   Ce nu ajută la decizie nu apare în treapta a doua.
5. **Serif pentru textul citat, sans pentru interfață.** Textul legii, al documentului și corecturile sunt în serif 15 px. Restul e în sans. Minimum 13 px; `text-xs` (11 px) și `Badge size="sm"` sunt interzise în panou.
6. **Culoarea de stare apare doar ca marcaj.** Se folosește pentru iconițe și diff. Textul colorat folosește numai tokenii `-fg`, cu ≥ 4,5:1 pe orice suprafață a panoului. Nu punem text colorat pe fundal colorat sub acest prag.
7. **Lista se golește pe măsură ce lucrezi.**
   - Constatările aplicate și ignorate pleacă imediat în grupuri închise, cu „Anulează” în toast și „Restaurează” în grup.
   - Următoarea constatare se deschide singură.

---

## 4. Arhitectura informației

### 4.1 Structura panoului (de sus în jos)
1. **Antet (64 px):**
   - „Rezultate” și, la dreapta, „2 din 6 rezolvate” (cifre tabulare);
   - meniul `⋯`;
   - dedesubt, „Legislația în vigoare la 01.03.2025”.
2. **Banner condiționat (40 px):** „3 paragrafe modificate după analiză” + „Reverifică”. Apare doar când e cazul.
3. **Lista, grupată pe stare** în ordinea gravității:
   - Greșeli
   - Discutabile
   - De verificat
   - Neverificate
   - Corecte (închis implicit)

   Grupurile goale nu se afișează. În fiecare grup, constatările urmează ordinea din document.
4. **Separator, apoi grupurile de lucru terminat** (ambele închise implicit):
   - „Rezolvate · n” (aplicate sau marcate verificate);
   - „Ignorate · n”.
5. **Nota de responsabilitate**, o singură dată, la capătul listei.

### 4.2 Rândul închis
| Zonă | Conținut | Regulă |
|---|---|---|
| Stânga | Iconița de stare, 16 px | Culoarea `--v-*` (marcaj). Numele stării e în `aria-label`, nu vizibil. |
| Centru | **Trimiterea scurtă**, normalizată: „art. 1.350 alin. (3) C. civ.” | Se construiește din `unitate` + abrevierea actului (`C. civ.`, `C. proc. civ.`, `C. muncii`, `L. 31/1990`, `OUG 195/2002`). Fallback: `citat` trunchiat. Pe o linie, cu ellipsis. Când rândul e deschis, textul se poate rupe pe mai multe linii. |
| Dreapta | Locul în document: „Art. 4” (secțiunea din document) sau „§ 12” dacă documentul nu are articole | 13 px, `--fg-3`, tabular. Clic pe rând = deschide constatarea și derulează documentul la highlight. |

Nu apar în rând: titlul, categoria, numele stării, numărul de surse.

### 4.3 Constatarea deschisă — ordinea fixă
Se deschide **în loc**, sub rândul ei (accordion cu un singur element deschis). Rândul rămâne vizibil ca antet.

| # | Bloc | Când apare | Note |
|---|---|---|---|
| 1 | **Concluzia** (`titlu`) | Doar dacă nu e generic | Se ascunde dacă e identic cu numele stării sau e „Trimitere neverificată”. Fallback: eticheta categoriei („Alineat inexistent”). |
| 2 | **Explicația** (`explicatie`) | Mereu | Un paragraf. Dacă depășește 6 rânduri, se trunchiază, cu „Mai mult”. Pentru „Neverificat”, explicația e `motivNeverificare`. |
| 3 | **„Ce lipsește”** (`informatiiLipsa`) | Doar pentru „De verificat” | Maximum 3 puncte. Aici e motivul pentru care decide omul, deci nu se ascunde. |
| 4 | **Atenționare „Astăzi diferă”** | Doar dacă `verdictAstazi.status ≠ verdictLaData.status` | Un singur rând: iconița stării de azi + „Astăzi: Corect — textul a fost modificat după 01.03.2025.” Înlocuiește caseta „Verdict”. |
| 5 | **Textul legii** (dovada) | Dacă există o dovadă cu `validare = "confirmata"` | Citat serif cu bară stângă neutră. Dedesubt, linia sursei (vezi 4.5). Dacă dovada e respinsă, în locul citatului apare un rând: „Citatul nu a fost regăsit în textul oficial.” + „Deschide sursa”. |
| 6 | **Corectura** sau **variantele** | Dacă există `sugestie` | Vezi 4.6. |
| 7 | **Rândul de acțiuni** | Mereu | Primar · secundar · `Detalii ˅` (la dreapta) · `⋯`. |
| 8 | **Detalii** (pliabil, închis implicit) | Doar dacă are conținut | Se deschide sub acțiuni, ca butoanele să nu se miște. |

**Mută în „Detalii”** (în această ordine, fiecare sub o etichetă de 13 px):
- „Ipoteze”;
- „Excepții și condiții”;
- „Evenimente legislative” (`evenimente`);
- „Afirmația verificată” (`afirmatie`);
- „Textul complet al articolului” (fostul „Textul citit”);
- „Alte surse (n)”, dacă sunt mai multe dovezi;
- „Verificare automată”: „Citatul a fost regăsit în textul oficial.” / „Verdict retrogradat: …” (`retrogradat.motiv`);
- „Categorie: Alineat inexistent”;
- „Preluat de la o trimitere identică” (`preluatDin`).

**Se scot de tot din panou:**
- textul din document în serif gri (e pe foaie, evidențiat, iar diff-ul îl arată când contează);
- repetările numelui actului;
- `verdictLaData.rezumat` (dublează explicația; se folosește doar ca fallback când `explicatie` lipsește);
- subsolul permanent cu scurtături (scurtăturile trec în tooltip-uri).

### 4.4 Deciziile cerute explicit
| Element actual | Decizie | De ce |
|---|---|---|
| **Caseta „Verdict”** | **Eliminată.** Starea e dată de grup și iconiță, iar rezumatul dublează explicația. Singura informație proprie, verdictul de azi când diferă, devine atenționarea de un rând (blocul 4). | Starea apărea de 3 ori. |
| **Chip-ul de categorie** | **Eliminat din vedere.** Categoria e fallback pentru concluzie și apare în „Detalii” și în raport. | Al doilea semnal colorat lângă stare; jargon de clasificare, nu ajută la decizie. |
| **Linia „10 trimiteri · 10 verificate cu sursă · 0 rezolvate din 2”** și bara de acoperire | **Scoase din panou.** Antetul păstrează doar progresul de lucru („2 din 6 rezolvate”). Acoperirea trece în fila „Analiză”, în raport și în meniul `⋯` → „Acoperirea analizei”. Trimiterile neverificate apar oricum ca grup. | Statistica nu e o acțiune; repeta contoarele grupurilor. |
| **Chip-urile de filtru pe stare** | **Eliminate.** Grupurile pliabile, cu contor, fac aceeași treabă. | Dublau contoarele grupurilor. |
| **Comutatorul „Arată și trimiterile corecte”** | **Înlocuit de grupul „Corecte · n”**, închis implicit. Deschiderea lui afișează rândurile și pornește sublinierile verzi în document. La închidere, sublinierile dispar. | Un control în minus; legătura dintre ce vezi în listă și ce vezi în document devine directă. |
| **Linia sursei** | **Scurtată:** „Portal Legislativ · Deschide textul ↗”. Numele actului apare doar dacă sursa e alt act decât cel din trimitere (ex.: „Decizia CCR nr. 1/2014 · ccr.ro ↗”). Data apare doar dacă diferă de data din antet. „Citat regăsit în textul oficial” trece în „Detalii”. | Actul și data erau repetate. |
| **„Ipoteze” / „Excepții și condiții”** | În „Detalii”. Pentru „Discutabil”, situațiile din variante le acoperă pe cele relevante. | Utile pentru verificare, nu pentru decizia rapidă. |
| **„Afirmația verificată”** | În „Detalii”. | Metadată a analizei. |

### 4.5 Dovada (textul legii)
- Un singur citat vizibil: prima dovadă confirmată, trunchiată la ~280 de caractere, cu „…”. Textul complet e în „Detalii”.
- Prezentare: fără casetă. Doar bara stângă de 2 px `--divider` și text serif. Linia sursei e imediat sub citat.

### 4.6 Corectura și variantele
**O singură corectură** (cazul tipic la „Greșeală”):
- eticheta „Corectură” (13 px, semibold, `--fg-2`);
- dedesubt, diff-ul inline: maximum 60 de caractere de context de fiecare parte, cu „…”;
- textul șters e tăiat, textul nou e subliniat (vezi 5.8);
- `sugestie.impact` nevid → un rând de 13 px: „Afectează și: Art. 7, Art. 12.”, cu link-uri care derulează documentul.

**Mai multe variante, fiecare cu situația ei** (cazul tipic la „Discutabil”):
- Eticheta devine „Alege varianta potrivită (3)”.
- Variantele sunt un **`RadioGroup variant="card"`**. Fiecare card are:
  - punctul radio;
  - **eticheta situației** (13 px, medium, `--fg-2`), ex.: „Dacă prețul se plătește la livrare”;
  - diff-ul (serif 15 px).
- **Nicio variantă nu e preselectată** când sunt 2 sau mai multe. Alegerea situației e decizia juridică, deci nu o lăsăm implicită.
- Butonul primar e „Aplică varianta”. Rămâne dezactivat până la alegere, iar dedesubt apare textul „Alege situația care se potrivește documentului.”
- Peste 3 variante: primele 3 sunt vizibile, apoi rândul „Încă 2 variante”.
- O variantă poate fi „Păstrează textul”, fără diff, cu nota „Textul rămâne neschimbat”. Aplicarea ei marchează constatarea ca rezolvată, fără modificare în document.
- Respingem alternativa „Aplică + Alte variante”: ar ascunde exact decizia pe care trebuie s-o ia avocatul.

### 4.7 Acțiuni pe stare
| Stare | Primar | Secundar | În `⋯` |
|---|---|---|---|
| Greșeală, cu corectură | „Aplică” | „Ignoră” | Copiază citatul · Deschide sursa · Marchează verificat · Raportează o eroare a analizei |
| Discutabil, cu variante | „Aplică varianta” | „Ignoră” | idem |
| Discutabil / De verificat, fără corectură | „Am verificat” | „Ignoră” | Copiază citatul · Deschide sursa · Raportează… |
| Neverificat | „Am verificat” | „Ignoră” | Deschide Portal Legislativ · Raportează… |
| Corect | — (fără rând de acțiuni) | — | Copiază citatul · Deschide sursa |

Acțiunile sunt mereu pe **un singur rând**, cu primarul în stânga. Ordinea e cea de citire: decizia vine după dovadă.

### 4.8 „Ignoră”, anularea și grupul „Ignorate”
1. Clic pe „Ignoră” (sau tasta `i`):
   - rândul se strânge (150 ms, `ease-out`) și pleacă din grupul lui;
   - contorul grupului scade, iar contorul „Ignorate” crește;
   - highlight-ul din document dispare;
   - **următoarea constatare din listă se deschide** și primește focus.
2. Apare un toast, 6 s: „Constatare ignorată.” + „Anulează”. „Anulează” readuce constatarea în locul ei, deschisă, cu focus pe ea.
3. Grupul „Ignorate · n”, închis implicit, sub separator. Fiecare rând are:
   - iconița stării, în `--fg-3`;
   - trimiterea, în `--fg-2`;
   - butonul „Restaurează” (`ghost`, `sm`), **mereu vizibil**, nu doar la hover.

   „Restaurează” mută constatarea înapoi în grupul ei, fără s-o deschidă. Toast: „Constatare restaurată.”
4. Nu cerem motiv la ignorare. Opțional, în `⋯` → „Ignoră cu motiv…”. O reverificare completă **nu** readuce constatările ignorate dacă trimiterea și textul nu s-au schimbat.

### 4.9 Constatările rezolvate (aplicate sau verificate)
- „Aplică” face trei lucruri:
  - inserează o modificare urmărită atribuită „LexAI” (ca în 08);
  - mută constatarea în „Rezolvate · n”;
  - deschide următoarea constatare.

  Toast: „Corectură aplicată ca modificare urmărită.” + „Anulează”.
- „Am verificat” mută constatarea în „Rezolvate”, fără modificare. Toast: „Marcată ca verificată.” + „Anulează”.
- Rândurile din „Rezolvate” au la dreapta, în loc de locator, eticheta 13 px „aplicată” sau „verificată” și meniul `⋯`, cu „Anulează” cât timp modificarea urmărită nu e acceptată în editor.
- Contorul din antet („2 din 6 rezolvate”) numără rezolvatele și ignoratele din totalul constatărilor care nu sunt corecte.

### 4.10 Tastatura
| Tastă | Acțiune |
|---|---|
| `j` / `k` | Următoarea / anterioara constatare (o deschide și derulează documentul) |
| `Enter` / `Spațiu` pe rând | Deschide / închide |
| `a` | Aplică (sau „Aplică varianta”, dacă e aleasă una) |
| `1`–`9` | Alege varianta n |
| `i` | Ignoră |
| `v` | Am verificat |
| `d` | Detalii |
| `o` | Deschide sursa |
| `Esc` | Închide constatarea; focusul revine pe rând |

Schimbare față de 08: `Enter` nu mai aplică. Pe un buton de dezvăluire, `Enter` deschide și închide (comportament standard), iar aplicarea are tasta ei.

---

## 5. Specificație vizuală

### 5.1 Tokeni noi (în `globals.css`, blocul LexAI)
`--v-*` existenți rămân **culori de marcaj**: iconițe, bare, highlight-uri. Toate au ≥ 3:1 (vezi 5.6). Se adaugă tokeni pentru text (`-fg`) și pentru fundal (`-bg`). Text colorat se scrie **numai** cu `-fg`. Utilizările actuale `text-v-corect`, `text-v-discutabil` și celelalte `text-v-*` pentru text se înlocuiesc cu `text-v-*-fg`.

```css
:root {
  --text-md: 0.875rem;              /* 14 px — nou, între sm (13) și base (15) */
  --text-md--line-height: 1.375rem; /* 22 px */
  --fg-2: oklch(0.45 0 0);          /* text secundar */
  --fg-3: oklch(0.53 0 0);          /* meta, locator, contoare */
  --divider: oklch(0.88 0 0);       /* granițe de grup */
  --focus-strong: oklch(0.45 0 0);

  --v-eroare-fg: oklch(0.505 0.19 27);      --v-eroare-bg: oklch(0.971 0.013 17);
  --v-discutabil-fg: oklch(0.473 0.137 46); --v-discutabil-bg: oklch(0.987 0.022 95);
  --v-uman-fg: oklch(0.48 0.2 300);         --v-uman-bg: oklch(0.977 0.014 308);
  --v-neverificat-fg: oklch(0.446 0.03 257);--v-neverificat-bg: oklch(0.968 0.007 248);
  --v-corect-fg: oklch(0.48 0.11 165);      --v-corect-bg: oklch(0.979 0.021 166);
}
.dark {
  --fg-2: oklch(0.78 0 0);
  --fg-3: oklch(0.72 0 0);
  --divider: oklch(1 0 0 / 16%);
  --focus-strong: oklch(0.78 0 0);

  --v-eroare-fg: oklch(0.808 0.114 19.6);   --v-eroare-bg: oklch(0.704 0.191 22 / 14%);
  --v-discutabil-fg: oklch(0.879 0.169 91.6);--v-discutabil-bg: oklch(0.769 0.188 70 / 14%);
  --v-uman-fg: oklch(0.827 0.108 306);      --v-uman-bg: oklch(0.714 0.17 300 / 16%);
  --v-neverificat-fg: oklch(0.869 0.022 252);--v-neverificat-bg: oklch(0.707 0.015 260 / 16%);
  --v-corect-fg: oklch(0.845 0.143 165);    --v-corect-bg: oklch(0.696 0.17 162 / 14%);
}
@theme inline {
  --color-fg-2: var(--fg-2);  --color-fg-3: var(--fg-3);  --color-divider: var(--divider);
  --color-v-eroare-fg: var(--v-eroare-fg);  --color-v-eroare-bg: var(--v-eroare-bg);
  /* … la fel pentru discutabil, uman, neverificat, corect */
}
```
`--text-md` trebuie pus în primul bloc `@theme inline`, lângă `--text-sm` și `--text-base`, ca să existe utilitarul `text-md`.

### 5.2 Scara tipografică
| Rol | Mărime / înălțime rând | Greutate | Font | Culoare | Tailwind |
|---|---|---|---|---|---|
| Titlul panoului | 15 / 22 | 600 | sans | `foreground` | `text-base/[22px] font-semibold` |
| Subtitlul antetului, progres | 13 / 18 | 400 | sans | `fg-2` | `text-sm/[18px] text-fg-2 tabular-nums` |
| Antet de grup | 13 / 20 | 600 | sans | `foreground`; contor `fg-3` | `text-sm/5 font-semibold` + `text-fg-3 tabular-nums` |
| Trimiterea (rând) | 14 / 20 | 500 | sans | `foreground` | `text-md/5 font-medium` |
| Locatorul (rând) | 13 / 20 | 400 | sans | `fg-3` | `text-sm/5 text-fg-3 tabular-nums` |
| Concluzia (deschis) | 15 / 22 | 600 | sans | `foreground` | `text-base/[22px] font-semibold` |
| Explicația, „Ce lipsește” | 14 / 22 | 400 | sans | `foreground` | `text-md` (are 22 px implicit) |
| Textul legii (citat) | 15 / 24 | 400 | serif | `foreground` | `font-serif text-base/6` |
| Diff (corectură, variante) | 15 / 24 | 400 | serif | vezi 5.8 | `font-serif text-base/6` |
| Eticheta situației / „Corectură” | 13 / 20 | 500 / 600 | sans | `fg-2` | `text-sm/5 font-medium text-fg-2` |
| Linia sursei, meta, note | 13 / 20 | 400 | sans | `fg-2` (link: `foreground`, subliniat la hover) | `text-sm/5 text-fg-2` |
| Etichete în „Detalii” | 13 / 20 | 600 | sans | `fg-2` | `text-sm/5 font-semibold text-fg-2` |
| Conținut „Detalii” | 14 / 22 | 400 | sans | `foreground` | `text-md` |
| Butoane | 13 / — | 500 | sans | — | implicit în `Button` (`text-sm`) |

Reguli:
- Fără uppercase.
- Fără `text-xs` și fără `Badge size="sm"` în panou.
- `font-serif` = stiva implicită Tailwind (Georgia / Times), aleasă pentru x-height mai mare la 15 px.
- Lungimea liniei la 420 px: ~52 de caractere la 14 px. La 360 px: ~44 de caractere.

### 5.3 Spațiere (grilă 4 px; folosim doar 4 · 6 · 8 · 12 · 16 · 24)
| Unde | Valoare | Tailwind |
|---|---|---|
| Padding orizontal panou | 16 | `px-4` |
| Antet | sus 12, jos 12; titlu–subtitlu 0 | `py-3` |
| Între grupuri | 8 deasupra antetului de grup (nu la primul) | `mt-2` |
| Iconiță → text (rând) | 12 | `gap-3` |
| Trimitere → locator | 12 | `gap-3` |
| Conținutul deschis | stânga 44 (aliniat cu textul rândului: 16 + 16 + 12), dreapta 16, sus 4, jos 16 | `pl-11 pr-4 pt-1 pb-4` |
| Între blocurile deschise (1–8) | 16 | `flex flex-col gap-4` |
| Citat → linia sursei | 6 | `gap-1.5` |
| Etichetă → conținut (Corectură, Detalii) | 6 | `gap-1.5` |
| Între cardurile de variantă | 8 | `gap-2` |
| Interiorul cardului de variantă | 12; radio → text 8; situație → diff 4 | `p-3 gap-2` / `gap-1` |
| Între butoanele de acțiune | 8 | `gap-2` |
| Între secțiunile din „Detalii” | 12 | `gap-3` |
| Nota de responsabilitate | 24 deasupra, 16 dedesubt | `mt-6 mb-4` |

### 5.4 Separatoare
Trei niveluri, fiecare cu alt mijloc. Nu mai folosim același hairline peste tot.

| Nivel | Mijloc | Valoare |
|---|---|---|
| Antet ↔ listă, între grupuri, înainte de „Rezolvate” | linie 1 px, pe toată lățimea | `border-t border-divider` (luminos #d7d7d7, 1,44:1; întunecat alb 16 %, 1,53:1) |
| Între rânduri în același grup | **fără linie**; ritmul de 40 px + hover `bg-muted/60` | — |
| Constatarea deschisă ↔ restul | bandă de fundal + bară stângă de 2 px | `bg-muted dark:bg-accent shadow-[inset_2px_0_0_var(--foreground)]` |

În interiorul constatării deschise **nu există chenare**. Excepții:
- bara stângă a citatului (2 px `--divider`);
- cardurile de variantă (`inset-ring` 1 px `border`; selectat: 1,5 px `foreground`).

### 5.5 Înălțimi
| Element | Înălțime |
|---|---|
| Antet panou | 64 px (`h-16`) |
| Banner „paragrafe modificate” | 40 px (`h-10`), `bg-muted`, 13/20 |
| Antet de grup | 36 px (`h-9`), lipicios (`sticky top-0 z-10 bg-background`) |
| Rând de constatare | 40 px (`h-10`), toată lățimea e țintă de clic |
| Rând în „Ignorate” / „Rezolvate” | 40 px |
| Butoane de acțiune | 32 px (`Button size="sm"`); `⋯` este `size="icon-sm"` (32 px) |
| Card de variantă | auto, minimum 56 px |

### 5.6 Culorile stărilor — valori și contrast (calculat, WCAG 2.x)
Suprafețe:
- **luminos:**
  - panou `--background` alb;
  - bandă activă `--muted`, oklch 0.97 (#f5f5f5);
- **întunecat:**
  - panou `--background`, oklch 0.145 (#0a0a0a);
  - `--card`, oklch 0.205 (#171717);
  - bandă activă `--accent`, oklch 0.269 (#262626).

Fundalurile din tema întunecată sunt calculate compuse peste suprafață. Peste `--card` contrastul e cel din a doua cifră.

**Tema luminoasă**
| Stare | Text `-fg` | pe alb | pe `-bg` | pe `muted` | Fundal `-bg` | Marcaj `--v-*` (iconiță, bară), pe alb |
|---|---|---|---|---|---|---|
| Greșeală | `oklch(0.505 0.19 27)` #b91c1e | **6,48** | **5,93** | **5,94** | #fef2f2 | actual #dc2627 — 4,83 ✓ |
| Discutabil | `oklch(0.473 0.137 46)` #973c00 | **7,13** | **6,88** | **6,54** | #fffbeb | actual #d9770a — 3,18 ✓ (doar marcaj; ca text **picat**) |
| De verificat | `oklch(0.48 0.2 300)` #7233bb | **7,25** | **6,76** | **6,65** | #faf5ff | actual #8347cf — 5,55 ✓ |
| Neverificat | `oklch(0.446 0.03 257)` #4a5565 | **7,56** | **6,90** | **6,93** | #f1f5f9 | actual #6e747c — 4,73 ✓ |
| Corect | `oklch(0.48 0.11 165)` #00704e | **6,10** | **5,78** | **5,59** | #ecfdf5 | actual #009965 — 3,67 ✓ (doar marcaj; ca text **picat**) |

**Tema întunecată** (prima cifră pe `background`, a doua pe `card`)
| Stare | Text `-fg` | pe suprafață | pe `-bg` | pe `accent` | Fundal `-bg` (compus) | Marcaj `--v-*` |
|---|---|---|---|---|---|---|
| Greșeală | `oklch(0.808 0.114 19.6)` #ffa2a2 | **10,30 / 9,33** | **8,81 / 7,72** | **7,87** | #2c1717 / #382222 | #ff6468 — 6,84 / 6,19 |
| Discutabil | `oklch(0.879 0.169 91.6)` #ffd230 | **13,69 / 12,39** | **11,18 / 9,70** | **10,45** | #2c1e09 / #372914 | #ffb745 — 11,42 / 10,33 |
| De verificat | `oklch(0.827 0.108 306)` #d8b4fe | **11,21 / 10,14** | **9,09 / 7,89** | **8,56** | #251e31 / #30293c | #b486fc — 7,33 / 6,64 |
| Neverificat | `oklch(0.869 0.022 252)` #cad5e2 | **13,34 / 12,07** | **10,71 / 9,27** | **10,18** | #212224 / #2c2d2f | #9ba1aa — 7,61 / 6,88 |
| Corect | `oklch(0.845 0.143 165)` #5ee9b5 | **13,04 / 11,81** | **10,93 / 9,54** | **9,96** | #09231a / #142e25 | #38d097 — 10,00 / 9,05 |

**Neutre**
| Token | Luminos | Contrast | Întunecat | Contrast |
|---|---|---|---|---|
| `--fg-2` | `oklch(0.45 0 0)` #555555 | 7,44 alb · 6,82 muted | `oklch(0.78 0 0)` #b7b7b7 | 9,89 bg · 8,95 card · 7,55 accent |
| `--fg-3` | `oklch(0.53 0 0)` #6c6c6c | 5,28 alb · 4,84 muted | `oklch(0.72 0 0)` #a4a4a4 | 7,98 bg · 7,22 card · 6,09 accent |
| `--muted-foreground` (actual) | #737373 | 4,73 alb · **4,34 muted ✗** | #a1a1a1 | 7,63 / 6,91 |
| `--focus-strong` | #555555 | 7,44 | #b7b7b7 | 9,89 |
| `--color-focus-ring` (actual) | foreground 40 % | **2,71 ✗** | foreground 40 % | 3,66 |

Regulă: în panou nu se folosește `text-muted-foreground`, ci `text-fg-2` sau `text-fg-3`. Restul aplicației poate rămâne neschimbat. Inelul global de focus trebuie revizuit separat (2,71:1).

Accentul AI (indigo 277°) nu apare în panou. „Aplică” e butonul primar neutru, așa că violetul de „De verificat” (300°) nu se confundă cu el.

### 5.7 Iconițe
Tabler outline, **16 px** (`size-4`), stroke 2, aliniate pe primul rând al textului (`mt-0.5` când textul se rupe). Textul alternativ din tabel e eticheta folosită în `aria-label`.

| Stare | Iconiță | Text alternativ |
|---|---|---|
| Greșeală | `IconCircleX` | „Greșeală” |
| Discutabil | `IconAlertTriangle` | „Discutabil” |
| De verificat | `IconUserSearch` | „De verificat” |
| Neverificat | `IconCircleDashed` | „Neverificat” |
| Corect | `IconCircleCheck` | „Corect” |

Alte iconițe:
- chevron de grup: `IconChevronDown`, 16 px, `fg-3`, rotit −90° când grupul e închis;
- link extern: `IconExternalLink`, 14 px (`size-3.5`).

În „Ignorate”, iconița de stare devine `text-fg-3`: forma rămâne, culoarea dispare.

### 5.8 Diff
- **Șters:**
  - stil: `bg-v-eroare-bg text-v-eroare-fg line-through decoration-1 rounded-[2px] px-0.5`;
  - markup: `<del>`, cu `<span class="sr-only">șters: </span>` înainte.
- **Adăugat:**
  - stil: `bg-v-corect-bg text-v-corect-fg underline decoration-1 underline-offset-2 rounded-[2px] px-0.5`;
  - markup: `<ins>`, cu `<span class="sr-only">adăugat: </span>` înainte.
- Contextul rămâne în `foreground`. Contrastele sunt cele din 5.6 (5,93 și 5,78 în tema luminoasă). Diferența nu e purtată doar de culoare: textul șters e tăiat, cel adăugat e subliniat.

### 5.9 Constatarea activă
- **În listă:** rândul și conținutul deschis formează o singură bandă `bg-muted` (`dark:bg-accent`), cu bară stângă de 2 px în `foreground` (neutră, nu în culoarea stării, ca să nu adauge un semnal de stare). Pe rând: `aria-expanded="true"` și `aria-current="true"`.
- **În document:** highlight-ul activ primește contur de 1 px în `--v-*` și fundal +10 %, iar celelalte highlight-uri scad la 60 % (ca în 08).
- Hover pe un rând inactiv: `bg-muted/60`. Hover nu schimbă selecția și nu pornește tooltip-uri.

### 5.10 Focus
- Rânduri și antete de grup (elemente pe toată lățimea, în `ScrollArea`): `focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--focus-strong)`. Conturul e în interior, ca să nu fie tăiat de marginile listei.
- Butoane, radio, link-uri din panou: se adaugă `focus-visible:ring-2 focus-visible:ring-(--focus-strong)`. Inelul implicit HextaUI are 2,71:1 și nu ajunge.
- Focusul **nu** se pierde după acțiuni:
  - după „Aplică” / „Ignoră” trece pe rândul următor, deja deschis;
  - după „Restaurează” rămâne în grupul „Ignorate”, pe rândul următor sau pe antet;
  - `Esc` îl întoarce pe rând.

### 5.11 Componente HextaUI
| Nevoie | Componentă | Note |
|---|---|---|
| Lista derulantă | `ScrollArea` | Antetul panoului rămâne fix în afara ei. |
| Grupurile | `Accordion` (`multiple`) | Trigger = antetul de grup (36 px) cu contor; deschise implicit: grupurile cu probleme. |
| Constatările dintr-un grup | `Accordion` (`single`, `collapsible`), cu trigger = rândul | Nu folosim `Item`: stilurile lui (padding 16, radius) contrazic rândul de 40 px fără radius. |
| „Detalii” | `Collapsible` | Trigger: `Button variant="ghost" size="sm"`. |
| Variante | `RadioGroup variant="card"` | Fără valoare implicită când sunt ≥ 2 variante. |
| Acțiuni | `Button` (`default` / `ghost`, `size="sm"`), `DropdownMenu` pentru `⋯` | `⋯` are `Tooltip` „Mai multe acțiuni”. |
| Meniul antetului | `DropdownMenu` | „Reverifică documentul”, „Exportă raportul”, „Acoperirea analizei”, „Ordonează: gravitate / ordinea din document”. |
| Anulare | `Toast` cu `action` | 6 s; o singură notificare activă, cea nouă o înlocuiește pe cea veche. |
| Stări goale | `Empty` | Vezi 6.4–6.5. |
| Scurtături | `Tooltip` + `Kbd` | Pe „Aplică” (`A`), „Ignoră” (`I`), „Detalii” (`D`). |
| Separatoare | `Separator` | Cu `className="bg-divider"`. |
| Încărcare | `Skeleton` | 1 antet + 6 rânduri de 40 px. |

**Nu se folosesc în panou:** `Badge`, `Card`, `Progress`, `ToggleGroup` (filtre), `Switch` („Arată corectele”), `Combobox` pe act.

---

## 6. Wireframe-uri (panou la 360 px)

### 6.1 Lista închisă
```
┌──────────────────────────────────────────┐
│ Rezultate                 2 din 6 rez. ⋯ │ 64 px · 15/22 semibold · 13 fg-2
│ Legislația în vigoare la 01.03.2025      │ 13/18 fg-2
├──────────────────────────────────────────┤ border-divider
│ Greșeli 2                              ˅ │ 36 px · 13 semibold, contor fg-3
│ ⊗  art. 1.350 alin. (3) C. civ.    Art. 4│ 40 px · icon 16 · 14 medium · 13 fg-3
│ ⊗  art. 41 alin. (5) C. muncii     Art. 9│
│                                          │ 8 px
├──────────────────────────────────────────┤
│ Discutabile 2                          ˅ │
│ △  art. 1.777 C. civ.              Art. 5│
│ △  art. 1.270 alin. (1) C. civ.   Art. 11│
├──────────────────────────────────────────┤
│ De verificat 1                         ˅ │
│ ⌕  Decizia ÎCCJ (RIL) nr. 2/2020   Art. 6│
├──────────────────────────────────────────┤
│ Neverificate 1                         ˅ │
│ ◌  L. 31/1990, art. 197           Art. 12│
├──────────────────────────────────────────┤
│ Corecte 8                              › │ închis implicit
├──────────────────────────────────────────┤
│ Rezolvate 1                            › │
│ Ignorate 1                             › │
│                                          │ 24 px
│ Verificare automată pe textul oficial.   │ 13/20 fg-3
│ Decizia finală îți aparține.             │
└──────────────────────────────────────────┘
```

### 6.2 „Greșeală” deschisă, cu o corectură
```
│ Greșeli 2                              ˅ │
│▌⊗  art. 1.350 alin. (3) C. civ.    Art. 4│ bandă bg-muted + bară 2 px foreground
│▌                                         │ 4 px
│▌   Art. 1.350 are doar două alineate     │ concluzie 15/22 semibold
│▌                                         │ 16 px
│▌   În forma în vigoare, articolul are    │ explicație 14/22
│▌   alin. (1) și (2). Situația descrisă   │
│▌   în document corespunde alin. (2).     │
│▌                                         │
│▌   ┃ „(2) Atunci când, fără justificare, │ serif 15/24, bară 2 px divider
│▌   ┃ una dintre părți nu își execută     │
│▌   ┃ obligația…”                         │
│▌   Portal Legislativ · Deschide textul ↗ │ 13/20 fg-2 · 6 px deasupra
│▌                                         │
│▌   Corectură                             │ 13 semibold fg-2
│▌   … conform art. 1.350 ░alin. (3)░      │ serif 15/24: șters (tăiat, roșu)
│▌   ▒alin. (2)▒ C. civ. …                 │ adăugat (subliniat, verde)
│▌                                         │
│▌   [ Aplică ]  Ignoră       Detalii ˅  ⋯ │ 32 px · primar · ghost · ghost · icon-sm
│▌                                         │ 16 px
│ ⊗  art. 41 alin. (5) C. muncii     Art. 9│
```
Cu „Detalii” deschis (sub acțiuni):
```
│▌   [ Aplică ]  Ignoră       Detalii ˄  ⋯ │
│▌                                         │
│▌   Afirmația verificată                  │ 13 semibold fg-2
│▌   Prețul se plătește în condițiile      │ 14/22
│▌   art. 1.350 alin. (3).                 │
│▌   Textul complet al articolului    ˅    │
│▌   Verificare automată                   │
│▌   ✓ Citatul a fost regăsit în textul    │
│▌     oficial.                            │
│▌   Categorie: Alineat inexistent         │
```

### 6.3 „Discutabil” deschis, cu trei variante pe situații
```
│▌△  art. 1.777 C. civ.              Art. 5│
│▌                                         │
│▌   Trimiterea depinde de tipul           │ concluzie
│▌   contractului                          │
│▌                                         │
│▌   Art. 1.777 privește locațiunea.       │ explicație
│▌   Dacă documentul e un contract de      │
│▌   prestări servicii, temeiul e altul.   │
│▌                                         │
│▌   ┃ „Locațiunea este contractul prin    │
│▌   ┃ care o parte…”                      │
│▌   Portal Legislativ · Deschide textul ↗ │
│▌                                         │
│▌   Alege varianta potrivită (3)          │ 13 semibold fg-2
│▌   ┌───────────────────────────────────┐ │ RadioGroup card · p-3
│▌   │ ○ Dacă e contract de locațiune    │ │ 13/20 medium fg-2
│▌   │   Textul rămâne neschimbat        │ │ 14/22 fg-2
│▌   └───────────────────────────────────┘ │ 8 px
│▌   ┌───────────────────────────────────┐ │ selectat: inset-ring 1,5 px foreground
│▌   │ ● Dacă e contract de servicii     │ │
│▌   │   … potrivit art. ░1.777░ ▒2.278▒ │ │ serif 15/24
│▌   │   C. civ. …                       │ │
│▌   └───────────────────────────────────┘ │
│▌   ┌───────────────────────────────────┐ │
│▌   │ ○ Dacă e contract de antrepriză   │ │
│▌   │   … potrivit art. ░1.777░ ▒1.851▒ │ │
│▌   │   C. civ. …                       │ │
│▌   └───────────────────────────────────┘ │
│▌                                         │
│▌   [ Aplică varianta ]  Ignoră  Detalii ˅│
```
Înainte de alegere, „Aplică varianta” e dezactivat, iar deasupra rândului de acțiuni apare: „Alege situația care se potrivește documentului.” (13/20, `fg-2`).

### 6.4 Gol (nicio problemă)
```
┌──────────────────────────────────────────┐
│ Rezultate                              ⋯ │
│ Legislația în vigoare la 01.03.2025      │
├──────────────────────────────────────────┤
│                                          │
│                   ✓                      │ IconCircleCheck 24 px, --v-corect
│        Nicio problemă găsită             │ 15/22 semibold
│   Toate cele 10 trimiteri sunt corecte   │ 14/22 fg-2, centrat
│   în forma în vigoare la 01.03.2025.     │
│                                          │
├──────────────────────────────────────────┤
│ Corecte 10                             › │
└──────────────────────────────────────────┘
```

### 6.5 Totul rezolvat
```
├──────────────────────────────────────────┤
│                                          │
│                   ✓                      │
│        Ai parcurs toate constatările     │ 15/22 semibold
│   2 aplicate · 1 verificată · 1 ignorată │ 14/22 fg-2, tabular
│   Modificările sunt urmărite în document;│
│   le poți accepta din editor.            │
│                                          │
├──────────────────────────────────────────┤
│ Corecte 6                              › │
├──────────────────────────────────────────┤
│ Rezolvate 3                            › │
│ Ignorate 1                             › │
```

### 6.6 Grupul „Ignorate”, deschis
```
├──────────────────────────────────────────┤
│ Ignorate 2                             ˅ │
│ ⊗  art. 41 alin. (5) C. m…  [Restaurează]│ iconiță fg-3 · text fg-2 · ghost sm, mereu vizibil
│ △  art. 1.270 alin. (1) C…  [Restaurează]│
└──────────────────────────────────────────┘

                 ┌────────────────────────────────────┐
                 │ Constatare ignorată.     Anulează  │ Toast, 6 s
                 └────────────────────────────────────┘
```

---

## 7. Microcopy

| Loc | Text |
|---|---|
| Antet | „Rezultate” · „Legislația în vigoare la 01.03.2025” · „2 din 6 rezolvate” |
| Meniul antetului | „Reverifică documentul” · „Exportă raportul” · „Acoperirea analizei” · „Ordonează după gravitate” / „Ordonează ca în document” |
| Banner | „3 paragrafe modificate după analiză.” · „Reverifică” |
| Grupuri | „Greșeli” · „Discutabile” · „De verificat” · „Neverificate” · „Corecte” · „Rezolvate” · „Ignorate” |
| Stări (aria / tooltip) | „Greșeală” · „Discutabil” · „De verificat” · „Neverificat” · „Corect” |
| Sursa | „Portal Legislativ · Deschide textul” · „ccr.ro · Deschide decizia” · „scj.ro · Deschide decizia” |
| Dovadă respinsă | „Citatul nu a fost regăsit în textul oficial.” |
| Verdict diferit azi | „Astăzi: Corect — textul s-a modificat după 01.03.2025.” |
| Secțiuni | „Corectură” · „Alege varianta potrivită (3)” · „Ce lipsește” · „Afectează și: Art. 7, Art. 12.” |
| Variantă fără modificare | „Textul rămâne neschimbat” |
| Indiciu variante | „Alege situația care se potrivește documentului.” |
| Butoane | „Aplică” · „Aplică varianta” · „Am verificat” · „Ignoră” · „Detalii” · „Restaurează” · „Mai mult” · „Încă 2 variante” |
| Meniul `⋯` | „Copiază citatul” · „Deschide sursa” · „Marchează verificat” · „Ignoră cu motiv…” · „Raportează o eroare a analizei” |
| Detalii | „Ipoteze” · „Excepții și condiții” · „Evenimente legislative” · „Afirmația verificată” · „Textul complet al articolului” · „Alte surse (2)” · „Verificare automată” · „Citatul a fost regăsit în textul oficial.” · „Categorie: …” |
| Toast | „Corectură aplicată ca modificare urmărită.” · „Marcată ca verificată.” · „Constatare ignorată.” · „Constatare restaurată.” · acțiune: „Anulează” |
| Gol | „Nicio problemă găsită” · „Toate cele 10 trimiteri sunt corecte în forma în vigoare la 01.03.2025.” |
| Totul rezolvat | „Ai parcurs toate constatările” · „2 aplicate · 1 verificată · 1 ignorată” · „Modificările sunt urmărite în document; le poți accepta din editor.” |
| Nedeschis | „Încă nu există rezultate pentru acest document.” · „Pornește analiza” |
| Notă | „Verificare automată pe textul oficial. Decizia finală îți aparține.” |
| Etichete rezolvate | „aplicată” · „verificată” |

---

## 8. Checklist pentru implementare

**Contrast și culoare**
- [ ] Niciun `text-v-*` fără sufixul `-fg` pentru text. Căutare: `text-v-(eroare|discutabil|uman|neverificat|corect)(?!-fg)`.
- [ ] Niciun `text-muted-foreground`, `text-xs` sau `Badge size="sm"` în `features/analysis/`.
- [ ] Contrastele din 5.6 verificate în ambele teme, pe alb, `muted`, `card`, `accent` și pe fundalurile `-bg` (DevTools → Contrast sau axe).
- [ ] Iconițele de stare au ≥ 3:1 pe suprafața lor, inclusiv pe banda activă.
- [ ] Diff-ul se înțelege în tonuri de gri: textul șters e tăiat, textul adăugat e subliniat.
- [ ] Mod `forced-colors`: rândul activ și cardul de variantă selectat rămân vizibile (`forced-colors:outline`).

**Tipografie și spațiere**
- [ ] Tot textul pe care trebuie să-l citească avocatul are ≥ 13 px. Explicațiile au 14 px, citatele și diff-ul 15 px serif.
- [ ] Doar valorile de spațiere 4 / 6 / 8 / 12 / 16 / 24. Textul conținutului deschis e aliniat pe coloana de 44 px.
- [ ] Rândurile au exact 40 px, antetele de grup 36 px, antetul panoului 64 px.
- [ ] Nu există chenar în interiorul constatării deschise, în afara cardurilor de variantă.

**Conținut**
- [ ] Actul apare o singură dată pe constatare.
- [ ] Data legislației nu se repetă în linia sursei (decât dacă diferă).
- [ ] Fără caseta „Verdict”, fără chip de categorie, fără textul din document în panou.
- [ ] Când `verdictAstazi` diferă de `verdictLaData`, apare atenționarea de un rând.
- [ ] Cu ≥ 2 variante nu e nimic preselectat, iar „Aplică varianta” e dezactivat până la alegere.

**Tastatură și focus**
- [ ] `j` / `k` / `a` / `i` / `v` / `d` / `o` / `1`–`9` / `Esc` funcționează doar când focusul e în panou sau pe un highlight, niciodată în timp ce se scrie în editor.
- [ ] Focusul e vizibil peste tot (`--focus-strong`, ≥ 3:1) și nu e tăiat de `ScrollArea`.
- [ ] După „Aplică”, „Ignoră” sau „Am verificat”, focusul ajunge pe constatarea următoare, deschisă. După „Anulează” din toast, revine pe constatarea readusă.
- [ ] Ordinea tab-ului: antet → grupuri → rând → conținut deschis (link sursă → variante → acțiuni → Detalii) → rândul următor.

**Cititor de ecran**
- [ ] Antetul de grup: `<button aria-expanded>` cu numele „Greșeli, 2 constatări”.
- [ ] Rândul are numele accesibil „Greșeală: art. 1.350 alin. (3) C. civ., în Art. 4” și `aria-expanded`. Rândul activ are și `aria-current="true"`.
- [ ] Iconițele de stare sunt `aria-hidden`; starea e citită din numele rândului.
- [ ] Diff-ul folosește `<del>` / `<ins>` cu prefixele `sr-only` „șters:” / „adăugat:”.
- [ ] Variantele sunt `radiogroup` cu eticheta „Alege varianta potrivită”, iar numele fiecărei opțiuni e eticheta situației.
- [ ] Toast-urile sunt anunțate (`role="status"`), iar „Anulează” e accesibil din tastatură înainte să expire (6 s, pauză la hover/focus).
- [ ] „Restaurează” are numele complet: „Restaurează art. 41 alin. (5) C. muncii”.
- [ ] „2 din 6 rezolvate” e o regiune `aria-live="polite"`.

**Lățime și comportament**
- [ ] La 360 px: fără derulare orizontală. Trimiterea se trunchiază cu ellipsis în rând și se rupe pe mai multe linii când e deschisă. Butoanele de acțiune încap pe un rând (`Detalii` poate deveni `icon-sm` cu tooltip sub 360 px).
- [ ] La 420 px: același layout, fără elemente noi.
- [ ] Antetele de grup rămân lipite sus la derulare și nu acoperă rândul focalizat (`scroll-margin-top: 36px` pe rânduri).
- [ ] Deschiderea grupului „Corecte” pornește sublinierile verzi din document, iar închiderea le oprește.
- [ ] `prefers-reduced-motion`: strângerea rândului la ignorare se face fără animație.
