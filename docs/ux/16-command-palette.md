# 16 — Paleta de comenzi (⌘K)

**Rută / context:** globală, fără rută proprie. Se deschide cu `⌘K` (sau `Ctrl K`) de oriunde din aplicație, din butonul „Caută… ⌘K” din bara globală (`17-shell-fara-sidebar.md`), din `⋯` → „Caută…” în editor și din `/` când nu este activ niciun câmp de text. · **Scop:** cel mai rapid drum către orice proiect, document sau acțiune, fără mouse. · **Ce face utilizatorul aici:** sare la un proiect sau document (după nume, client sau tip), reia elemente recente, pornește acțiuni (proiect nou, încărcare, document nou, setări, terminal, utilizare) și, opțional, caută în conținutul documentelor.

## Referințe analizate (≥10)

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Supabase | [ecran](https://mobbin.com/screens/9b4725f5-e038-4fc7-98ad-64a59f74b4d7) | Secțiuni cu titluri mici uppercase (Shortcuts / Queries / Actions), scurtătura afișată ca Kbd în dreapta rândului, placeholder „Run a command or search…”, acțiunile cu „…” deschid un pas următor. | Fontul monospațiat pe titlurile de secțiune. |
| 2 | Vapi | [ecran](https://mobbin.com/screens/593d7acd-2e16-4365-bcd6-02ce52f48f3b) | Ordinea Acțiuni → Recente → Toate paginile; contextul afișat lângă titlu („Metrics — Observe”); footer cu „↑↓ to navigate · ↵ to select” și numărul de rezultate. | Contrastul scăzut din tema întunecată. |
| 3 | v0 | [ecran](https://mobbin.com/screens/5f353fc3-d9ce-4d1c-be9b-cc1b4ad07578) | Starea fără interogare: „Quick Actions” (New Chat, Upload from Computer, New Project, New Folder) + „Navigation”; iconițe outline de 16 px, rânduri aerisite. | Acțiunile comerciale („Buy More Credits”) în paleta principală. |
| 4 | v0 | [ecran](https://mobbin.com/screens/29db691c-e7fb-4ee3-9f4b-e16c4970b92a) | Cu interogare: comenzile potrivite sus, apoi entitățile cu timp relativ în dreapta, apoi acțiunea de rezervă „Start new chat with „website””. Modelul nostru pentru „Document nou numit „…””. | Lipsa titlului de secțiune pentru entități. |
| 5 | Bonsai | [ecran](https://mobbin.com/screens/71409a31-a14b-4202-8cf3-6534833cd4a1) | Rezultate mixte cu tipul entității aliniat în dreapta (Invoice / Project / Contract / Task), subrând cu clientul și data; sugestia „Go To → Contracts”. Cel mai relevant pentru proiecte + documente juridice. | Tipurile colorate în verde intens. |
| 6 | Mistral AI | [ecran](https://mobbin.com/screens/8450c1c7-7c10-40a3-9af3-c9c234ac4b53) | Acțiunile grupate pe domeniu (Agents, Batches, Settings) și o secțiune „Navigation” cu „Go to …” consecvent. | Lista lungă de „Go to” fără căutare fuzzy vizibilă. |
| 7 | Devin | [ecran](https://mobbin.com/screens/e37a4e69-9a61-4f36-803d-edbd89c1229d) | Rezultate cu cale tip breadcrumb („Settings › Review › …”); footer complet: Navigate · esc Close · ⌘↵ Open in new tab · ↵ Open. | Repetarea „Settings” pe fiecare rând (poate fi titlu de secțiune). |
| 8 | Magnific | [ecran](https://mobbin.com/screens/14ceb943-f04a-460f-b4f5-2ebd78d74aff) | Secțiuni „RECENTS” + „QUICK ACTIONS” cu scurtătură pe fiecare acțiune; rândul activ are fundal gri și iconița ↵. | Intrarea vocală (microfon) în câmpul de căutare. |
| 9 | Juicebox | [ecran](https://mobbin.com/screens/2af813bf-0129-45d1-81ed-069edee76e16) | Indicatorul de selecție cu bară verticală în stânga; footer cu „Tab to jump sections” și „⌘K to toggle”; săgeată ↗ pentru navigare. | Iconițele colorate diferit pe secțiuni. |
| 10 | Gumloop | [ecran](https://mobbin.com/screens/e9e0911a-09a4-4c72-bb98-6ac9357fa590) | Pe rândul activ apare indicația „Open ↵”; acțiunile de creare sus, apoi entitățile grupate (Agents, Teams); ⌘K afișat în input. | Bara de scroll vizibilă permanent. |
| 11 | Mintlify | [ecran](https://mobbin.com/screens/7c7ad31f-9dfe-4be7-83d7-6002fe31d4d0) | Rezultat cu titlu + secțiune + fragment de conținut (snippet), util pentru căutarea în textul documentelor; chip „ESC” în input. | Paleta foarte îngustă pentru snippet-uri lungi. |
| 12 | Confluence | [ecran](https://mobbin.com/screens/011a7330-6662-4621-9729-cb0e1b65be41) | „Recently viewed” deasupra rezultatelor, metadate „Updated on…”, acțiunea de rezervă „Search across products ↵” la final. | Căutarea ancorată în bara de sus în loc de dialog centrat. |
| 13 | Evernote | [ecran](https://mobbin.com/screens/3120a6eb-313c-492d-96f2-63b5656c80be) | Gruparea pe „Today / Yesterday” cu locația (caietul) în gri lângă titlu; comutatorul „Standard / AI-Powered”; footer cu Select / Open / Copy link / Open in new window. | Lățimea foarte mare a dialogului. |
| 14 | Fibery | [ecran](https://mobbin.com/screens/9c826c0d-8a63-42ca-a85f-573fe10104aa) | „Recent items” cu calea pe al doilea rând („Product Design › Clients”) și filtrul de domeniu „Anything ▾” sub input. | Ecranul complet (nu modal), care rupe contextul. |
| 15 | Dovetail | [ecran](https://mobbin.com/screens/d79a343f-5038-41ab-8304-1252a30f02f5) | Panou de previzualizare în dreapta pentru elementul selectat (titlu, context, fragment, dată). | Amestecul de acțiuni și fișiere fără titluri de secțiune. |
| 16 | Slite | [ecran](https://mobbin.com/screens/0198e487-5699-486c-8052-9ebe4a153ab4) | Filtre-chip sub input (All types, In: sources, Date range, Edited by) pentru căutarea în conținut; termenul evidențiat în snippet. | Snippet-urile pe 2 rânduri pentru fiecare rezultat (prea dens). |
| 17 | Gamma | [ecran](https://mobbin.com/screens/c6ae8918-d163-4b0e-9d35-c4c25674e9cb) | Sfatul din footer „You can open this anywhere by pressing ⌘K”, util pentru descoperire. | Miniaturile mari, care reduc numărul de rezultate vizibile. |
| 18 | Superhuman Mail | [ecran](https://mobbin.com/screens/85dc5994-9360-428d-9092-7425e070ed7f) | Paleta ca instrument de învățare a scurtăturilor: fiecare comandă își arată tasta. | Fontul monospațiat pe tot dialogul. |

## Tipare comune

- **Dialog modal centrat în treimea de sus** (≈ 15–20 % din înălțime), lățime 560–680 px, fundalul estompat sau blurat (Supabase, v0, Mistral, Devin, Gumloop, Navattic).
- **Input mare fără chenar** în capul dialogului, cu iconiță lupă, placeholder care spune ce se poate căuta și chip „Esc” / „⌘K” în dreapta (Mintlify, Gumloop, Supabase).
- **Fără interogare: Recente + Acțiuni rapide + Navigare** (v0, Magnific, Vapi, Supabase).
- **Cu interogare: rezultate grupate pe tip**, cu tipul sau calea pe rândul secundar ori aliniată dreapta (Bonsai, Base44, Fibery, Devin).
- **Acțiune de rezervă la final:** „Caută „X” peste tot” / „Creează cu „X”” (v0, Confluence).
- **Footer cu legenda tastelor:** ↑↓ navighează · ↵ deschide · Esc închide · (opțional) Tab între secțiuni, ⌘↵ tab nou (Vapi, Devin, Magnific, Juicebox, Evernote).
- **Scurtăturile ca Kbd aliniate dreapta** pe acțiuni (Supabase, Magnific, Replit, Superhuman).
- **Acțiuni în pași:** „…” după etichetă indică un sub-pas (alegi proiectul, apoi fișierul) (Supabase „Switch project…”, Replit chevron ›).
- Rândul activ are un fundal gri subtil și, uneori, o bară de accent sau indicația „↵” (Gumloop, Juicebox, Magnific).

## Decizia de layout

**Starea inițială (fără interogare)**

```
            ┌────────────────────────────────────────────────────────────┐
            │ ⌕  Caută proiecte, documente sau comenzi…            [Esc] │
            ├────────────────────────────────────────────────────────────┤
            │ RECENTE                                                    │
            │ ▌▤ Cerere de chemare în judecată               acum 5 min  │
            │    Litigiu creanță · Ionescu SRL · v3                       │
            │  ▣ Litigiu recuperare creanță                  acum 5 min  │
            │    Proiect · Ionescu SRL                                    │
            │  ▤ Notificare punere în întârziere             ieri        │
            │    Divorț — partaj · Pop Maria                              │
            │                                                            │
            │ ACȚIUNI                                                    │
            │  +  Proiect nou                                     N  P   │
            │  ⤒  Încarcă document…                               U      │
            │  ✎  Document nou…                                   D      │
            │  >_ Deschide terminalul                            ⌃ `    │
            │                                                            │
            │ NAVIGARE                                                   │
            │  →  Proiecte                                        G  P   │
            │  →  Utilizare                                       G  U   │
            │  →  Setări                                          G  S   │
            ├────────────────────────────────────────────────────────────┤
            │ ↑↓ navighează   ↵ deschide   Tab secțiune   Esc închide    │
            └────────────────────────────────────────────────────────────┘
```

**Cu interogare („ionescu”)**

```
            ┌────────────────────────────────────────────────────────────┐
            │ ⌕  ionescu                                           [Esc] │
            ├────────────────────────────────────────────────────────────┤
            │ PROIECTE                                                   │
            │ ▌▣ Litigiu recuperare creanță           Ionescu SRL  Proiect│
            │ DOCUMENTE                                                  │
            │  ▤ Cerere de chemare în judecată   Litigiu creanță  Încărcat│
            │  ▤ Notificare plată                Litigiu creanță  Generat │
            │ ACȚIUNI                                                    │
            │  +  Proiect nou pentru „ionescu”                           │
            │  ⌕  Caută „ionescu” în conținutul documentelor        ⌘ ↵  │
            ├────────────────────────────────────────────────────────────┤
            │ ↑↓ navighează   ↵ deschide   ⌘↵ caută în conținut   Esc    │
            └────────────────────────────────────────────────────────────┘
```

**Acțiune în pași („Încarcă document…”)**

```
            │ ⌕ [Încarcă în ›]  Caută proiectul…                   [Esc] │
            │ PROIECTE RECENTE                                           │
            │ ▌▣ Litigiu recuperare creanță                  Ionescu SRL │
            │  ▣ Divorț — partaj                              Pop Maria  │
            │  +  Proiect nou…                                           │
            │ ⌫ înapoi   ↵ alege   Esc închide                          │
```

**Decizii**

1. **Dialog modal**, lățime 640 px, plasat la 18 % din înălțimea ferestrei; fundal estompat, fără blur greu. Înălțimea maximă este de 60 % din viewport, iar lista are scroll intern.
2. **Input** de 48 px, text 15–16 px, fără bordură. Placeholderul se schimbă după context („Caută în Litigiu recuperare creanță sau oriunde…” pe pagina unui proiect).
3. **Fără interogare:** *Recente* (maximum 5, proiecte și documente amestecate, ordonate după ultima deschidere), *Acțiuni* (Proiect nou, Încarcă document…, Document nou…, Deschide terminalul), *Navigare* (Proiecte, Utilizare, Setări).
   - Pe pagina unui proiect sau a unui document apare **deasupra** o secțiune contextuală „În acest proiect”: Încarcă aici, Document nou aici, Analizează documentul curent.
4. **Cu interogare:** căutare fuzzy, insensibilă la diacritice și la majuscule („sotie” găsește „soție”, „sc” găsește „șc”), pe numele proiectelor, numele clienților și titlurile documentelor.
   - Ordinea secțiunilor: Proiecte → Documente → Acțiuni → Navigare.
   - Fiecare secțiune afișează cel mult 5 rezultate, plus „Vezi toate (12)”.
   - Potrivirea este evidențiată cu bold în titlu.
5. **Rândul de rezultat:** iconiță outline de 16 px · titlu (o linie, trunchiat) · rând secundar gri (proiect › client · versiune) · în dreapta tipul (Proiect / Încărcat / Generat) sau timpul relativ ori Kbd.
6. **Căutarea în conținut** nu rulează automat la fiecare tastă. Este o acțiune explicită („Caută „X” în conținutul documentelor”, ⌘↵), care afișează rezultatele cu fragment și termenul evidențiat (model Mintlify / Slite).
7. **Acțiunile cu „…”** deschid un sub-pas în aceeași paletă. Un chip-breadcrumb în input arată pasul („Încarcă în ›”), iar Backspace pe un input gol revine la pasul anterior. După alegerea proiectului, „Încarcă document…” deschide selectorul de fișiere al sistemului, iar „Document nou…” deschide wizardul în proiectul ales.
8. **Footerul** este o legendă de taste mereu vizibilă. La primele 5 deschideri apare și sfatul „Poți deschide paleta de oriunde cu ⌘K” (model Gamma), care apoi dispare.
9. **Previzualizare** (opțional, ≥ 1280 px): un panou de 280 px în dreapta, pentru documentul selectat (model Dovetail): proiect, client, versiune, status ultima analiză (Badge), ultima modificare.

## Componente HextaUI

- **Command**: nucleul paletei (input, listă, grupuri, elemente, filtrare, navigare cu tastatura).
- **Dialog**: containerul modal, cu focus trap și închidere la Esc / click în afară.
- **Hotkey**: înregistrarea globală pentru `⌘K` / `Ctrl K` și `/`, plus secvențele `G P`, `G U`, `G S`, `N P`.
- **Kbd**: scurtăturile pe rânduri, chip-ul „Esc” și legenda din footer.
- **Badge**: tipul rezultatului (Proiect / Încărcat / Generat), chip-ul de pas („Încarcă în ›”), statusul analizei în previzualizare.
- **Scroll area** + **Scroll fade**: lista de rezultate, cu estompare sus/jos când există mai mult conținut.
- **Separator** / **Hairline**: între input, listă și footer.
- **Spinner**: la căutarea în conținut sau la încărcarea rezultatelor din baza de date.
- **Empty**: „Niciun rezultat”.
- **Skeleton**: rândurile de rezultate cât timp sosesc rezultatele din conținut.
- **Item**: rândurile din panoul de previzualizare.
- **Tooltip**: scurtătura de pe butonul-lupă „Caută · ⌘K” din bara globală (sub 1024 px).
- **Drawer**: varianta pe ecran îngust.
- **Toast**: confirmarea acțiunilor executate direct din paletă („Proiect creat”).

## Stări

- **Fixate** (completare din `17-shell-fara-sidebar.md`): fără interogare, grupul „Fixate” (max. 5, `IconPin`) stă deasupra „Recente”; lipsește dacă nu e niciun proiect fixat.
- **Gol (instalare nouă, fără proiecte):** fără „Recente”; prima secțiune este „Începe”, cu *Proiect nou* și *Încarcă un document* (care creează și proiectul), apoi Navigare.
- **Niciun rezultat:** Empty compact în listă, „Niciun rezultat pentru „{termen}””, urmat de două acțiuni de rezervă: **Caută în conținutul documentelor** și **Proiect nou „{termen}””.
- **Încărcare:** rezultatele locale (nume) apar instant. Căutarea în conținut afișează Spinner în dreapta inputului și 3 rânduri Skeleton sub secțiunea „În conținut”.
- **Eroare:** dacă baza de date nu răspunde, apare un singur rând de eroare în listă, „Nu am putut căuta acum. Reîncearcă (↵)”. Acțiunile și navigarea rămân disponibile, pentru că sunt statice.
- **Limită (abonament atins):** acțiunile care pornesc AI („Document nou…”, „Analizează documentul curent”) rămân în listă cu un subrând chihlimbar „Limita de 5 h e atinsă · pornește la 17:40” și intră în coadă la confirmare.
- **Context de editare:** când focusul este într-un câmp de text sau în editorul de document, `/` nu deschide paleta; doar `⌘K` o deschide.

## Ecran îngust

- **< 768 px:** paleta devine un **Drawer** de jos, pe toată lățimea, cu înălțime de 85 %, inputul fixat sus și tastatura virtuală deschisă automat.
- Footerul cu legenda tastelor se ascunde pe touch, iar Kbd-urile de pe rânduri dispar.
- Rândurile cresc la 48 px (țintă de atingere), iar tipul / timpul trece pe rândul secundar.
- Panoul de previzualizare nu este disponibil.
- Declanșare: butonul lupă din bara globală (pe mobil, restul navigării e în foaia „Meniu”, vezi `17-shell-fara-sidebar.md`).

## Microcopy (RO)

- Placeholder: „Caută proiecte, documente sau comenzi…” · în proiect: „Caută în {proiect} sau oriunde…” · în sub-pas: „Caută proiectul…”.
- Secțiuni: **Recente** · **În acest proiect** · **Acțiuni** · **Navigare** · **Proiecte** · **Documente** · **În conținut** · **Începe**.
- Acțiuni: „Proiect nou” · „Încarcă document…” · „Document nou…” · „Deschide terminalul” · „Analizează documentul curent” · „Mergi la Proiecte” · „Mergi la Utilizare” · „Mergi la Setări”.
- Rezervă: „Caută „{termen}” în conținutul documentelor” · „Proiect nou „{termen}””.
- Tipuri: „Proiect” · „Încărcat” · „Generat” · „Ciornă”.
- Rând secundar: „{proiect} · {client} · v3” · „Proiect · {client}”.
- Chip pas: „Încarcă în ›” · „Document nou în ›”.
- Footer: „↑↓ navighează” · „↵ deschide” · „⌘↵ caută în conținut” · „Tab secțiune” · „⌫ înapoi” · „Esc închide”.
- Sfat: „Poți deschide paleta de oriunde cu ⌘K.”
- Niciun rezultat: „Niciun rezultat pentru „{termen}”.”
- Eroare: „Nu am putut căuta acum. Apasă ↵ pentru a reîncerca.”
- Limită: „Limita de 5 h e atinsă · pornește la 17:40”.
- Buton în bara globală: „Caută…” + Kbd „⌘K” · Tooltip (lupă): „Caută · ⌘K”.

## Întrebări deschise

- Căutarea în conținutul documentelor este în v1? Necesită indexare full-text în baza de date (de exemplu FTS) și normalizarea diacriticelor la indexare.
- Ce scurtături globale sunt sigure într-un browser (⌘N, ⌘T, ⌘W sunt rezervate)? Propunerea: doar `⌘K` + secvențe de două litere (`G P`, `N P`), ca în Linear, active doar în afara câmpurilor de text.
- Paleta include și comenzi de editor (formatare, inserare tabel) când suntem în editor, sau acelea rămân în bara de instrumente a editorului? Recomandarea: doar câteva acțiuni la nivel de document (Analizează, Exportă .docx, Versiuni), nu formatare.
- „Deschide terminalul” deschide un panou în shell sau o pagină separată? Primește directorul proiectului curent?
- Includem în rezultate și analizele (ex.: „Analiză · Cerere de chemare · 3 nov.”) sau doar proiecte și documente?
- Panoul de previzualizare merită complexitatea în v1, sau ajunge rândul secundar?
- Proiectele arhivate apar în rezultate? Propunerea: da, la final, cu Badge „Arhivat”.
