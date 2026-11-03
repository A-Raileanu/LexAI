# 04 — Pagina proiectului

**Rută / context:** `/proiecte/[id]` · se deschide din lista de proiecte, din paleta ⌘K sau din comutatorul de proiect ⇅ (fostul „Fixate” din sidebar, vezi `17-shell-fara-sidebar.md`). · **Scop:** spațiul de lucru al unui dosar: toate documentele clientului, starea verificărilor juridice și activitatea AI într-un singur loc. · **Ce face utilizatorul aici:** încarcă documente, pornește un document nou (wizard / agent), vede ce e încărcat și ce e generat, la ce versiune a ajuns fiecare document și care e rezultatul ultimei analize, urmărește joburile în curs, editează detaliile proiectului.

## Referințe analizate (≥10)

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | HoneyBook | [ecran](https://mobbin.com/screens/4b0ac13d-c100-4b86-8389-13da8755c87b) | Antetul proiectului cu acțiunile grupate în dreapta („Attach”, „AI actions”, „Create file” primar), tab-uri Activity / Files / Notes / Details, coloana dreaptă „About this project” cu câmpuri. | Bannerul foto mare și miniaturile uriașe ale fișierelor. |
| 2 | Bonsai | [ecran](https://mobbin.com/screens/4d1fe7c1-6f13-4b9f-8b0e-aaf99a4713ab) | Titlul editabil, clientul sub titlu, tab-uri sub antet; cardul „Documents & Links” cu stare goală proprie; „Recent Activity” ca listă temporală. | Prea multe tab-uri (Invoices, Time Tracking, Team…) și cardurile financiare. |
| 3 | Origin | [ecran](https://mobbin.com/screens/d52a81bd-1009-4ca3-852b-175a33d8c772) | Documente juridice grupate pe secțiuni, Badge de stare („Not signed”), meniu ⋯ cu acțiuni specifice („Upload signed copy”, „Download original”). | Etichetele uppercase monospațiate pe fiecare subsecțiune, prea „tehnice” pentru un avocat. |
| 4 | Origin | [ecran](https://mobbin.com/screens/6a8614a5-1611-4a27-986c-ecc8a9c80319) | Alertă de proiect deasupra documentelor („Pending changes…”, cu un singur buton de acțiune), utilă pentru „3 documente au constatări nerezolvate”. | Butonul negru mare din alertă, care concurează cu acțiunile principale. |
| 5 | PandaDoc | [ecran](https://mobbin.com/screens/48cc7028-bab5-4d91-9154-97b63fe12ef3) | Tabel de documente cu filtre-chip (Date, Status, Owner), stare cu punct colorat + text („Completed”, „Draft”), subrând sub titlu, buton „+ Document” cu split-dropdown. | Sidebarul secundar cu foldere și tag-uri (proiectul este deja „folderul”). |
| 6 | Vanta | [ecran](https://mobbin.com/screens/7604dc30-f8bd-4e4a-9d84-bf4b870eb967) | Badge-uri de stare cu iconiță + culoare semantică („Needs document”, „Needs update”, „OK”), un model direct pentru rezultatul analizei; „Add document” ca buton primar cu meniu. | Numărul mare de coloane și filtre pentru un singur dosar. |
| 7 | Slite | [ecran](https://mobbin.com/screens/784fd37d-3429-4f47-b58c-0b6fc0ffed07) | Carduri de „quick filters” cu numărători („0 Outdated”, „0 Verification expired”) și bara de acțiuni în masă jos, la selecție. | Titlul gigant de pagină. |
| 8 | Gusto | [ecran](https://mobbin.com/screens/2a4319d4-c9f9-40df-84ee-3a9023c180bd) | Subrândul sub numele documentului („Uploaded document” / „Employer provided document”) diferențiază sursa fără o coloană în plus; punct de stare + dată; toast „Document added”. | Linkurile subliniate pe fiecare nume. |
| 9 | Google Drive | [ecran](https://mobbin.com/screens/22c4dcc5-772b-4649-a31a-fab8bcca163f) | Dialogul „Manage versions”: „Current version” + versiuni anterioare cu autor și dată + „Upload new version”. | Textul juridic lung despre retenție în capul dialogului. |
| 10 | Twenty | [ecran](https://mobbin.com/screens/18f1f96e-ff54-4199-ae71-86fd65ddd0f2) | Detaliile entității ca listă de câmpuri etichetă–valoare grupate („General”, „System”), plus tab-ul Files cu numărătoare și „+ Add file”. | Plasarea detaliilor în stânga, care împinge documentele (conținutul primar) spre dreapta. |
| 11 | Linear | [ecran](https://mobbin.com/screens/00bd911e-49f4-4e9c-998b-5f6ac25c0dfb) | Panoul dreapta „Properties” compact (Status, Lead, Dates), editabil la click; „Activity” sub el cu „See all”. | Zona mare de descriere / imagine în centru. |
| 12 | StackAI | [ecran](https://mobbin.com/screens/5837c6b8-913b-4a7b-945f-fefd878b88ba) | Tabelul de documente cu iconiță de stare procesare, footer cu totaluri („Files: 1 · Indexed: 1 · Errors: 0”), „Upload” primar în dreapta. | Iconițele-unelte fără etichetă din bara de deasupra. |
| 13 | Databricks | [ecran](https://mobbin.com/screens/c2906fac-d2b5-461d-a72a-0d01d690e233) | Lista de rulări (job runs) cu ora de start, durată, stare „Failed / Succeeded” cu iconiță, cod de eroare; filtre pe stare. | Graficul de rulări (nu e nevoie la nivel de proiect) și tema albastră saturată. |
| 14 | Gumloop | [ecran](https://mobbin.com/screens/e65b28c5-8cb8-4932-9218-c9ecc10f0a83) | Tabel de joburi cu tab-uri „All / Completed / Failed”, coloană de credite/consum, Badge-uri pastel „Completed” / „Failed”. | Avatarurile negre identice pe fiecare rând. |
| 15 | Braintrust | [ecran](https://mobbin.com/screens/ebbc86f3-e1ab-4bf4-8eb2-93923dacdfba) | Secțiuni „Recent …” cu „+ Create” și „View all” în antetul fiecărei secțiuni; metrici scurte pe 7 zile (cost LLM, tokeni). | Culorile pastel diferite pe fiecare secțiune. |
| 16 | Outseta | [ecran](https://mobbin.com/screens/4e466d74-cc1d-42e1-9f7f-51f19e679f40) | Activitate cronologică grupată pe zi, coloana dreaptă „Information” + „Attachments” cu stare goală și „+ Add”. | Banda galbenă de trial deasupra paginii. |
| 17 | WRITER | [ecran](https://mobbin.com/screens/14376189-cb82-493e-a565-210ba39adad2) | Descrierea proiectului deasupra listei, „Upload files” primar, stare per fișier („Live in graph” cu bifă verde). | Titlul uppercase cu spațiere mare. |
| 18 | Browserbase | [ecran](https://mobbin.com/screens/654392d0-9063-4db4-8987-6b7fc6742537) | Tabelul „Recent sessions” scurt (4 rânduri) + „View all →”: un model pentru „Joburi recente”. | Cardurile de onboarding de deasupra. |

## Tipare comune

- **Antet de entitate:** breadcrumb → titlu mare editabil → linie de meta (client, număr de elemente, ultima activitate) → acțiuni în dreapta, cu una singură plină (HoneyBook, Bonsai, Linear, Upwork).
- **Tab-uri sub antet** pentru vizualizările principale (Fișiere / Activitate / Detalii), de obicei 3–5 (HoneyBook, Bonsai, Twenty, Origin).
- **Două coloane:** conținutul primar (fișierele) la stânga, flexibil, și o coloană dreaptă de ~300 px cu proprietăți editabile și liste scurte „recent” (HoneyBook, Linear, Outseta, Neon).
- **Tabel de documente** cu nume + subrând (sursă / tip), stare cu punct sau Badge colorat, dată de modificare, meniu ⋯ (PandaDoc, Gusto, Vanta, Writer, StackAI).
- **Starea ca semantică de culoare limitată:** verde = în regulă, chihlimbar = de revăzut, roșu = problemă, gri = neprocesat (Vanta, Gumloop, Databricks, Slite).
- **Filtre rapide cu numărători** deasupra tabelului (Slite, PandaDoc, Gumloop).
- **Versiunile** se gestionează într-un dialog sau panou lateral, nu în tabel; tabelul arată doar versiunea curentă (Google Drive, Hashnode „Default version v1.0”).
- **Joburile / rulările** apar ca listă scurtă cu stare, durată și consum, plus link „Vezi toate” (Databricks, Gumloop, Browserbase, Braintrust).

## Decizia de layout

> Fără sidebar: bara globală stă deasupra, „Proiecte ›” e `PageCrumbs` deasupra titlului, iar lângă titlu stă comutatorul ⇅ (`17-shell-fara-sidebar.md`).

```
┌ sidebar ┬──────────────────────────────────────────────────────────────────────────────┐
│         │ Proiecte / Litigiu recuperare creanță                                         │
│         │                                                                              │
│         │ Litigiu recuperare creanță                [ Document nou ] [⤒ Încarcă document] ⋯│
│         │ Ionescu SRL · 8 documente · activ acum 5 min                                 │
│         │ ┌──────────────────────────────────────────────────────────────────────────┐ │
│         │ │ ⚠ 2 documente au erori de temei legal nerezolvate.          Vezi analizele │ │
│         │ └──────────────────────────────────────────────────────────────────────────┘ │
│         │  Documente 8   Analize 5   Joburi 12   Activitate                            │
│         │ ─────────────────────────────────────────────────────┬────────────────────── │
│         │ [Toate 8][Încărcate 5][Generate 3][Cu probleme 2]  ⌕ │ Detalii proiect    ✎ │
│         │                                                      │ Client   Ionescu SRL │
│         │  Nume                    Versiune  Ultima analiză  Modificat ⋯│ Descriere  Recupe- │
│         │  ▤ Cerere de chemare      v3   ● 2 erori        acum 5 min ⋯│   rare creanță… │
│         │    Încărcat · DOCX                                          │ Creat    12 oct.  │
│         │  ▤ Notificare punere      v1   ✓ Corect         ieri       ⋯│ ──────────────────│
│         │    în întârziere                                            │ Joburi recente    │
│         │    Generat · agent                                          │ ◌ Analiză · Cerere│
│         │  ▤ Contract cesiune       v2   ◐ De verificat   3 nov.     ⋯│   rulează · 1m 40s│
│         │    Încărcat · PDF                                           │ ✓ Generare · Notif.│
│         │  ▤ Întâmpinare (ciornă)   v1   ○ Neanalizat     3 nov.     ⋯│   2m 14s · 48k tok│
│         │    Generat · wizard                                         │ ✕ Analiză · Contr.│
│         │                                                      │   eșuat · Reîncearcă│
│         │  ⤒ Trage fișiere aici sau încarcă (PDF, DOCX, DOC)    │ Vezi toate →       │
│         │                                                      │                    │
└─────────┴──────────────────────────────────────────────────────┴────────────────────┘
```

**Zone și ierarhie**

1. **Antet (primar pentru orientare):** Breadcrumb „Proiecte / {nume}”; titlul editabil inline (click → Input); linia de meta: client (link spre filtrul de client pe Acasă), număr de documente, ultima activitate. În dreapta, un Button group: **„Încarcă document”** (primar, plin), **„Document nou”** (secundar, contur; deschide wizardul de generare) și ⋯ (Redenumește, Arhivează proiectul, Deschide terminalul în contextul proiectului).
2. **Alertă de proiect (condiționată):** apare doar când există constatări nerezolvate de tip *eroare* sau *necesită verificare umană*. Are un singur link de acțiune și nu are buton plin (model Origin, dar mai discret).
3. **Tab-uri:** **Documente** (implicit), **Analize**, **Joburi**, **Activitate**, fiecare cu numărătoare.
4. **Tab-ul Documente, zona principală (stânga, flexibilă):**
   - Toggle group de filtre rapide cu numărători: *Toate · Încărcate · Generate · Cu probleme*, plus căutare în nume.
   - Data table: **Nume** (iconiță tip fișier + subrând „Încărcat · DOCX” / „Generat · agent” / „Generat · wizard”), **Versiune** (`v3`; click → Sheet „Versiuni”), **Ultima analiză** (Badge semantic: *Corect* verde, *N erori* roșu, *Discutabil* chihlimbar, *De verificat* albastru-violet, *Neverificat / Neanalizat* gri, *În curs* cu Spinner), **Modificat** (timp relativ), ⋯.
   - Hover card pe Badge-ul de analiză: rezumatul constatărilor (ex.: „12 corecte · 2 erori · 1 discutabil · 1 de verificat”) + „Deschide analiza”.
   - Meniul ⋯ al documentului: Deschide în editor, Analizează din nou, Versiuni, Redenumește, Descarcă (.docx / .pdf), Șterge.
   - Drop zone (Attachment) permanentă și discretă sub tabel; toată pagina acceptă drag & drop, cu un overlay „Eliberează pentru a încărca în {proiect}”.
   - Selecția multiplă afișează o bară de acțiuni jos (model Slite): *Analizează (n)*, *Descarcă*, *Șterge*.
5. **Coloana dreaptă (320 px, secundară):**
   - **Detalii proiect**: Client, Descriere, Creat, Ultima activitate, editabile inline cu creionul ✎.
   - **Joburi recente**: maximum 5 Item-uri cu iconiță de stare (Spinner / ✓ / ✕), tip + document, durată, tokeni; joburile eșuate au „Reîncearcă”; „Vezi toate →” deschide tab-ul Joburi.
   - Coloana nu conține acțiuni primare.
6. **Tab-ul Analize:** tabel cu Document · Versiune analizată · Data · rezumat constatări (bare mici stivuite pe cele 5 categorii) · Stare. Click → pagina de analiză.
7. **Tab-ul Joburi:** tabel complet (Data, Tip, Document, Etapă curentă, Durată, Tokeni, Cost echivalent API, Stare), filtrabil după stare; un rând deschide un Sheet cu etapele jobului. Tabelul folosește aceeași structură ca `/utilizare`, filtrată pe proiect.
8. **Tab-ul Activitate:** cronologie grupată pe zile (model Outseta / Wrike): „Ai încărcat…”, „Agentul a generat v2…”, „Analiză finalizată: 2 erori”.

**Versiuni:** un Sheet lateral (model Google Drive) cu *Versiunea curentă* sus, apoi versiunile anterioare (vN · sursă: încărcare / editare / generare AI · dată), cu acțiunile Deschide, Compară cu curenta, Restaurează și butonul „Încarcă versiune nouă”.

## Componente HextaUI

- **Breadcrumb**: „Proiecte / {nume}”.
- **Input**: redenumirea inline a titlului și editarea câmpurilor din Detalii.
- **Button group** + **Button** + **Dropdown menu**: „Încarcă document” / „Document nou” / ⋯.
- **Alert**: alerta de proiect pentru constatări nerezolvate și erorile de încărcare.
- **Tabs**: Documente / Analize / Joburi / Activitate, cu numărători.
- **Toggle group**: filtrele rapide (Toate / Încărcate / Generate / Cu probleme).
- **Input group**: căutarea în documente.
- **Data table**: documentele, analizele, joburile; selecție multiplă cu **Checkbox**.
- **Badge**: rezultatul ultimei analize, versiunea, starea jobului.
- **Hover card**: rezumatul constatărilor la hover pe Badge.
- **Attachment**: drop zone, chip-urile de fișiere în curs de încărcare.
- **Progress**: progresul încărcării per fișier.
- **Spinner**: analiză / job în curs.
- **Sheet**: versiunile unui document; detaliile unui job (etape, tokeni, cost).
- **Card** + **Item**: coloana dreaptă (Detalii proiect, Joburi recente).
- **Textarea**: descrierea proiectului.
- **Context menu**: click dreapta pe un rând de document.
- **Alert dialog**: ștergerea unui document sau a unei versiuni; arhivarea proiectului.
- **Toast**: „Document încărcat”, „Analiză pornită”, „Job eșuat · Reîncearcă”.
- **Empty**: proiect fără documente; tab-uri goale.
- **Skeleton**: încărcarea tabelului și a coloanei dreapta.
- **Tooltip**: iconițele de tip de fișier, versiunea, timpul absolut la hover pe timpul relativ.
- **Resizable** (opțional): lățimea coloanei dreapta pe ecrane mari.
- **Scroll area**: lista de versiuni din Sheet.

## Stări

- **Gol (proiect nou, fără documente):** tab-ul Documente afișează o zonă Empty mare, care este și drop zone: iconiță document, „Adaugă primul document”, „Trage aici un PDF, DOCX sau DOC ori pornește un document nou.” și două butoane: **Încarcă document** / **Document nou**. Coloana dreaptă arată doar Detaliile.
- **Încărcare pagină:** Skeleton pentru antet (titlu + meta), 5 rânduri de tabel, cardurile din dreapta.
- **Încărcare fișiere:** fiecare fișier apare imediat ca rând cu Progress inline și subrândul „Se încarcă… 45 %”, apoi „Se extrage textul…”; la final, toast „Document încărcat · Analizează acum”.
- **Analiză / job în curs:** Badge cu Spinner, „Se analizează… (etapa 2/4)”; jobul apare în „Joburi recente”.
- **Eroare la încărcare:** rândul devine roșu-pal, „Nu am putut citi fișierul (format neacceptat / fișier protejat)”, cu acțiunile **Reîncearcă** · **Elimină**.
- **Eroare la job:** ✕ în „Joburi recente” + toast cu „Detalii” (deschide Sheet-ul cu etapa eșuată și mesajul).
- **Eroare la încărcarea proiectului / proiect inexistent:** Empty cu „Proiectul nu există sau a fost arhivat.” + „Înapoi la proiecte”.
- **Proiect arhivat:** banner Alert neutru „Proiect arhivat — doar citire.” + **Restaurează**; acțiunile de încărcare și generare sunt dezactivate.
- **Limită (abonament Claude atins):** „Document nou” și „Analizează” rămân active, dar joburile intră în coadă: Badge „În așteptare · reia la 17:40”, Tooltip pe butoane „Limita de 5 h e atinsă; jobul va porni automat la resetare.”

## Ecran îngust

- **< 1280 px:** coloana dreaptă coboară sub tab-uri ca o secțiune pliabilă („Detalii și joburi”, Collapsible), iar tabelul ocupă toată lățimea.
- **< 1024 px:** coloana *Modificat* intră în subrândul numelui („Încărcat · DOCX · acum 5 min”).
- **< 768 px:**
  - Antetul se stivuiește: titlul, apoi meta, apoi butoanele pe toată lățimea („Încarcă document” plin, „Document nou” contur, ⋯ iconiță).
  - Tab-urile devin derulabile orizontal.
  - Tabelul devine o listă de Item-uri: nume + subrând sursă, iar dreapta Badge-ul de analiză și `v3`.
  - Filtrele rapide devin un Select.
  - Sheet-ul de versiuni devine Drawer jos.
- Drag & drop nu este disponibil pe touch; butonul „Încarcă document” rămâne singura cale.

## Microcopy (RO)

- Breadcrumb: „Proiecte / Litigiu recuperare creanță”.
- Meta: „Ionescu SRL · 8 documente · activ acum 5 min”.
- Butoane: **Încarcă document** · **Document nou** · ⋯ → „Redenumește proiectul”, „Arhivează proiectul”, „Deschide terminalul aici”.
- Tab-uri: **Documente** · **Analize** · **Joburi** · **Activitate**.
- Filtre: **Toate** · **Încărcate** · **Generate** · **Cu probleme** · placeholder: „Caută în documente…”.
- Coloane: **Nume** · **Versiune** · **Ultima analiză** · **Modificat**.
- Subrânduri sursă: „Încărcat · DOCX”, „Încărcat · PDF”, „Generat · agent”, „Generat · wizard”, „Editat manual”.
- Badge-uri analiză: **Corect** · **2 erori** · **Discutabil** · **De verificat** · **Neverificat** · **Neanalizat** · **Se analizează…** · **În așteptare**.
- Hover card: „Ultima analiză: 3 nov., 14:20 · v3” · „12 corecte · 2 erori · 1 discutabil · 1 de verificat” · **Deschide analiza**.
- Meniu document: **Deschide** · **Analizează din nou** · **Versiuni** · **Redenumește** · **Descarcă .docx** · **Descarcă .pdf** · **Șterge**.
- Alertă proiect: „2 documente au erori de temei legal nerezolvate.” · **Vezi analizele**.
- Detalii: titlu **Detalii proiect** · „Client”, „Descriere”, „Creat”, „Ultima activitate”.
- Joburi recente: titlu **Joburi recente** · „Analiză · Cerere de chemare · rulează · 1 min 40 s” · „Generare · Notificare · 2 min 14 s · 48 mii tokeni” · „Eșuat · **Reîncearcă**” · **Vezi toate**.
- Versiuni (Sheet): titlu „Versiuni — {document}” · „Versiunea curentă” · „v2 · editat manual · 2 nov., 10:05” · **Deschide** · **Compară cu versiunea curentă** · **Restaurează** · **Încarcă versiune nouă**.
- Gol: **Adaugă primul document** · „Trage aici un PDF, DOCX sau DOC ori pornește un document nou.”
- Drop overlay: „Eliberează pentru a încărca în „{proiect}””.
- Toast: „Document încărcat.” [**Analizează acum**] · „Analiză pornită.” · „Jobul a eșuat.” [**Detalii**].
- Confirmare ștergere: „Ștergi „{document}”?” · „Se șterg și versiunile și analizele lui. Acțiunea nu poate fi anulată.” · **Șterge definitiv** / **Renunță**.
- Arhivat: „Proiect arhivat — doar citire.” · **Restaurează**.

## Întrebări deschise

- Analiza pornește automat după încărcare sau doar la cerere? Recomandarea: o setare, cu „automat” implicit, pentru că verificarea temeiurilor este valoarea principală.
- Ce status afișăm când ultima analiză este pe o versiune mai veche decât cea curentă? Propunerea: Badge gri „Neanalizat (v3)” + Tooltip „Ultima analiză: v2”.
- Documentele generate pornesc ca „Corect”, deoarece temeiurile sunt verificate la generare, sau ca „Neanalizat” până la o analiză separată?
- Avem nevoie de foldere sau etichete în cadrul unui proiect (ex.: „Acte procedurale”, „Probe”), cum face Origin cu secțiunile? Recomandarea: nu în v1, doar filtre.
- Tab-ul „Activitate” aduce valoare unui singur utilizator, sau ajunge „Joburi” + istoricul de versiuni?
- Comparația de versiuni (diff) este în scopul v1?
- Unde se deschide terminalul „în contextul proiectului” (panou jos în shell sau pagină separată) și ce director de lucru primește?
