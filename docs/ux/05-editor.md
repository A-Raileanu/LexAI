# 05 — Editorul de document

**Rută / context:** `/proiecte/[id]/documente/[docId]` · **Scop:** spațiul principal de lucru: redactarea și revizuirea unui document juridic pe o foaie A4 continuă, cu analiza juridică, temeiurile și istoricul alături · **Ce face utilizatorul aici:** scrie și formatează textul, completează câmpurile `[● …]`, acceptă sau respinge sugestiile AI, citește constatările analizei, salvează versiuni, pornește analiza și exportă.

## Referințe analizate (≥10)

Toate ecranele de mai jos au fost deschise și citite din imagine, nu din metadate. 17 aplicații distincte.

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | PandaDoc | [ecran](https://mobbin.com/screens/17a30f2b-9532-4c05-afba-37e7abf27f7e) · [meniu descărcare](https://mobbin.com/screens/790fa2ea-60f0-46e5-af46-00caa41c1ed5) | Bara de formatare pe toată lățimea, sub antet, cu pagina pe fundal gri. Panou lateral drept cu șină de icoane și titlu de secțiune. Starea documentului („Draft”, „Updated less than a minute ago”) stă lângă titlu. | Prea multe CTA-uri colorate în antet (Invite, Send, Need help). Starea și metadatele se înghesuie pe un singur rând mic. |
| 2 | Canva | [ecran](https://mobbin.com/screens/e1c3ad63-6b95-4415-b2d4-7cd2ce2e4766) | Dimensiunea fontului ca pas `− 32 +` lângă selectorul de font. Butonul de culoare are o bară colorată sub „A”. Bara de jos are zoom 100% și „Pagini 1/1”. | Antetul cu gradient violet. Bara flotantă care acoperă marginea paginii. |
| 3 | Confluence | [bara + stiluri](https://mobbin.com/screens/622c0046-0e05-4564-9ab2-347221d928cc) · [meniu tabel](https://mobbin.com/screens/af8d2b31-832d-4674-809d-0b49b8e01cac) | Bară fixă cu Undo/Redo la stânga. Meniul de stiluri `Tt ▾` arată scurtăturile (⌘⌥1…) direct în listă. „Saved” stă discret lângă acțiuni, iar restul merge în overflow `⋯` și `+ ▾`. Meniul contextual de celulă are Merge/Split și scurtături. | Coperta și emoji-ul de document. Sidebar-ul aplicației, care ia spațiu din pagină. |
| 4 | Plane | [ecran](https://mobbin.com/screens/56b7d0e4-f453-41c7-9815-155ce8a0b71a) · [meniu rând tabel](https://mobbin.com/screens/bcb8b5a2-4da7-4f08-b68b-24439b8e5d68) | Breadcrumb în antet. Grupurile barei sunt despărțite prin separatoare: `Text ▾ · Color ▾ \| B I U S \| aliniere \| liste \| tabel`. Comutatorul de panou lateral e la capătul drept al barei. Meniul de rând are „Header row” ca switch. | Două sidebar-uri plus panoul. Prea puțin spațiu pentru foaie. |
| 5 | WRITER | [ecran](https://mobbin.com/screens/70d563bc-e75b-4790-93b1-70d9559fa101) | Panoul de sugestii afișează textul vechi tăiat și textul nou evidențiat, cu săgeată între ele. Are categorii cu contoare (Spelling 3, Style 14…) și statistici (cuvinte, caractere). | Bara de formatare jos și evidențierea agresivă a unui paragraf întreg. |
| 6 | Grammarly | [ecran](https://mobbin.com/screens/59508691-835e-43bb-8dca-f4f6c8b08bc0) | Tab-uri în capul panoului și filtre pe categorii cu o linie colorată sub fiecare. Cardul de sugestie are „Accept” (primar) și „Dismiss” (text). Numărul de cuvinte stă în subsol. | Bara de formatare minimală, ascunsă jos, nepotrivită pentru un editor de tip Word. |
| 7 | Contractbook | [ecran](https://mobbin.com/screens/c6054632-91f3-4049-94cc-282c19be6fc6) | Document juridic. Sugestia apare inline (șters roșu tăiat + inserat albastru), iar în panou ca „Replace: … with: …”. Ecranul are badge „Draft” lângă titlu, buton „Save changes” dezactivat când nu sunt modificări și șină verticală de icoane în dreapta panoului. | Tab-urile „Create / Preview” deasupra documentului (un mod separat de previzualizare nu ne trebuie). |
| 8 | Dropbox | [ecran](https://mobbin.com/screens/65a4c267-6cce-4345-8a5e-daa45ce84c35) | Pagina e un document real pe fundal crem. Zoom-ul e un select (`175% ▾`), iar butonul „ecran complet” stă în dreapta barei. Panoul de comentarii are sortare. | Unelte cu etichete text pe toată bara (Edit PDF, Draw, Highlight…), care ocupă prea mult loc. |
| 9 | Squarespace | [ecran](https://mobbin.com/screens/4766af0e-ad98-4071-ae95-7f94a9a9dc02) | Contract cu antet minimal (Done · Save · titlu centrat cu „Draft” dedesubt · Send). Panoul din dreapta are controale segmentate (S / M / L). | Bara flotantă care apare peste conținut doar la selecție. |
| 10 | Profound | [ecran](https://mobbin.com/screens/dcbb5264-a8df-4249-b98d-f6970819dddf) | Badge verde „Document saved” în antet. Panoul drept are tab-uri (Workflow · History · AEO), iar istoricul e în carduri cu `v2 Current`. Export ca buton cu meniu. | Bara de formatare flotantă jos, departe de text. |
| 11 | Asana | [ecran](https://mobbin.com/screens/9d9c52cf-1f06-4f3b-a73a-38b10717e30d) | „Saved · Just now” scris discret, gri, în dreapta antetului. Panoul lateral se pliază dintr-o icoană `→\|` și are fundal ușor diferit de pagină. | Bara de formatare neagră, flotantă, de tip „bubble”. |
| 12 | Craft | [salt de pagină + format celulă](https://mobbin.com/screens/3a948536-9dee-41e1-9e1d-7caaafc2f83d) · [meniu tabel](https://mobbin.com/screens/edc2a439-eaf1-468c-81db-909f5ce95fd8) | Paginile sunt carduri cu umbră pe fundal gri, iar saltul de pagină e un marcaj punctat. Meniul „Edit Table” are scurtături și acțiunile distructive în roșu, separate. | Panoul de inserare blocuri (Card, Whiteboard), care nu e pentru documente juridice. |
| 13 | Zendesk | [ecran](https://mobbin.com/screens/8d7afc5d-74d2-4b0a-b513-3d30a1aa1dd2) | Meniul de tabel e organizat pe coloane: TABEL (grilă de inserare) · RÂND · COLOANĂ · CELULĂ (Merge cells, Split cell). E cea mai clară structură pentru operațiile pe tabel. | Opțiunile dezactivate fără explicație și butonul „Save” split jos. |
| 14 | Kit | [ecran](https://mobbin.com/screens/78b338b4-951e-433f-84db-aacc9594a452) | Bara de formatare stă chiar deasupra zonei de pagină, nu în antet. Foaia albă e pe fundal cald, iar „Saved” apare cu icoană de nor. Separatoarele dintre grupuri sunt fine. | Slider-ul pentru mărimea fontului, nepotrivit pentru valori exacte în pt. |
| 15 | SchoolAI | [ecran](https://mobbin.com/screens/a4f9f56d-ddec-4451-a1fe-c24f3195b413) | Fontul (`Inter ▾`) și greutatea apar în bară, iar foaia e un card pe gri. Popover-ul de culoare are câmp hex și mostre recente. Export e butonul primar din antet. | Selectorul de culoare cu gradient complet. Pentru documente juridice ajung câteva mostre. |
| 16 | Searchable | [ecran](https://mobbin.com/screens/d9c0bd92-c20c-42ae-9544-96952b790943) | Lângă titlu apare numărul de cuvinte („0 words”), iar Export e buton cu meniu. Cuprinsul e în stânga, asistentul în dreapta, cu mâner de redimensionare vizibil. | Cuprinsul permanent în stânga, care strâmtează foaia A4. |
| 17 | Microsoft Copilot | [ecran](https://mobbin.com/screens/136cfa0a-2377-4520-90b2-961497dafb42) | Antetul are titlu + `Share · ⋯ · Sources · Conversation`, adică acțiuni secundare ca text-buton fără chenar. Undo/Redo și „Paragraph ▾” sunt primele în bară. | Bara de formatare săracă (fără font, mărime, culoare). |

## Tipare comune

- **Trei benzi orizontale fixe:** antet (titlu + stare + acțiuni), bară de formatare, apoi zona de lucru. O vedem în PandaDoc, Confluence, Plane, Canva, SchoolAI și Kit. Barele flotante (Asana, [Skiff](https://mobbin.com/screens/4b8d148b-b1b9-4921-aca9-f07e386dc2a0), [Jasper](https://mobbin.com/screens/cb0ed94a-d907-4e6a-a3f0-8a239147e3e9)) apar doar în editoarele de tip „block”, nu în cele de tip Word.
- **Foaia ca obiect fizic:** card alb cu umbră fină pe fundal neutru gri sau crem (PandaDoc, Canva, Craft, Dropbox, Kit, SchoolAI). Utilizatorul înțelege imediat că lucrează la un document tipăribil.
- **Starea salvării e text discret, nu buton:** „Saved” (Confluence), „Saved · Just now” (Asana), „Document saved” ca badge verde (Profound), nor + „Saved” (Kit).
- **Grupuri separate prin separatoare verticale,** în ordinea: istoric → stil → font/mărime → B I U S → culoare → aliniere/paragraf → liste → inserare → overflow `⋯` (Confluence, Plane, Canva, Zendesk).
- **Meniurile cu stiluri și acțiuni își arată scurtăturile** în dreapta (Confluence, Craft).
- **Panoul din dreapta are tab-uri și se poate plia:** Profound (Workflow/History/AEO), Grammarly (Review/Write/Check), Plane (comutator în bară), Asana (`→|`).
- **Sugestia are un format standard:** text vechi tăiat roșu + text nou colorat, inline și în card, cu „Accept” primar și „Dismiss” secundar (Contractbook, WRITER, Grammarly).
- **Tabelele au un meniu dedicat, contextual.** Când cursorul e în tabel apare un meniu cu operații pe rând, coloană și celulă, iar acțiunile distructive sunt la final, în roșu (Zendesk, Confluence, Craft, Plane).
- **Bara de stare de jos** arată cuvinte, pagini și zoom (Canva, Grammarly, [ClickUp](https://mobbin.com/screens/2d3fa052-a772-4751-b078-b776a6d33c5f) „62 words”).

## Decizia de layout

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ │ Închiriere Popescu / Contract de închiriere                      ● Ciornă salvată 14:32 │  ← antet 48px
│                                         [⟲ Versiuni] [✦ Analizează] [Salvează ▾] [⋯]        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ ↶ ↷ │ Normal ▾ │ Times New Roman ▾ │ − 12 + │ B I U S │ A▾ ▌▾ │ ≡▾ ⇤ ⇥ ↕▾ │ •≡ 1≡ │ ⊞▾ ⤓ [●] │ ⋯ │   ⛶  ◧ │ ← bară 40px
├──────────────────────────────────────────────────────────────────┬─────────────────────────┤
│ fundal neutru (gray-100 / dark: gray-900)                        ┃ Constatări 7 │ Temeiuri │ Istoric   ✕ │
│                                                                  ┃ ─────────────────────── │
│        ┌──────────────── foaie A4 · 210 mm ────────────────┐     ┃ [Toate] [Critice 2] [Atenție 5] │
│        │                                                    │     ┃ ┌─────────────────────┐ │
│        │          CONTRACT DE ÎNCHIRIERE                    │     ┃ │ ● Critică            │ │
│        │                                                    │     ┃ │ Termen de preaviz    │ │
│        │ Între [● numele proprietarului], domiciliat…       │     ┃ │ sub minimul legal    │ │
│        │ chiria lunară este de ~~1.000~~ 1.200 lei          │◀───┃ │ art. 1.824 C. civ.   │ │
│        │                           └ sugestie AI [✓][✕]     │     ┃ │ [Mergi la text] [⋯]  │ │
│        │                                                    │     ┃ └─────────────────────┘ │
│        │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄ Salt de pagină ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ │     ┃          …              │
│        │                                                    │     ┃                         │
│        └────────────────────────────────────────────────────┘     ┃ ↔ mâner redimensionare  │
├──────────────────────────────────────────────────────────────────┴─────────────────────────┤
│ 1.240 cuvinte · Pagina 1 din 3 · 3 câmpuri de completat ↓ · 2 sugestii ↓     − 100% +     │  ← stare 28px
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Zone și ierarhie**

1. **Antet (48 px), primar ca orientare.**
   - Stânga: *(actualizat de `17-shell-fara-sidebar.md`: `◆` spre Proiecte + separator + `{proiect} / {titlu}`; `‹` doar sub 640 px; meniul `⋯` are grupul „Aplicație”: Caută, Temă, Blochează)*. Inițial: înapoi `‹` + Breadcrumb (Proiecte / proiect / document). Ultimul segment e titlul editabil inline: click → Input, Enter salvează.
   - Lângă titlu: indicatorul de salvare. E un Button ghost mic cu punct colorat și text: „Ciornă salvată 14:32”. Click deschide un Popover cu „Salvează versiunea…” (câmp de notă + buton), pentru versiunile cu notă. Salvarea fără notă e butonul „Salvează” din dreapta și `⌘S`.
   - Dreapta: `Versiuni` (ghost, deschide panoul pe tab-ul Istoric), `Analizează` (outline, icoană ✦), `Salvează` (singurul buton plin, split: click → versiune nouă, `⌘S`; fără modificări arată „Salvat”, dezactivat; `▾` → export DOCX/PDF/DOCX adnotat, „Printează…” `⌘P` și „Opțiuni de export…”, vezi 12-export.md). Ultimul e `⋯` (redenumește, duplică, mod concentrare, scurtături, șterge).
2. **Bara de formatare (40 px), primară ca unealtă.** E fixă, pe toată lățimea zonei de lucru (nu și a panoului), cu grupuri separate prin Separator vertical. La capătul drept are două comutatoare: `⛶` mod concentrare și `◧` panou lateral. Grupurile care nu încap se mută, de la dreapta la stânga, în `⋯` (detalii la „Toolbar”).
3. **Foaia A4, conținutul primar.**
   - Lățime fixă 210 mm (794 px la 96 dpi), margini Word: 2,5 cm sus/jos, 2,5 cm stânga/dreapta. Font implicit Times New Roman 12 pt, interlinie 1,15.
   - Documentul e împărțit în pagini separate, ca Print Layout din Word: fiecare pagină e un card alb cu umbră fină, cu marginile din document, pe fundal neutru, centrat în spațiul rămas. Textul trece singur pe pagina următoare (rând cu rând, fără rânduri văduve/orfane; titlurile rămân cu paragraful următor; tabelele se rup între rânduri).
   - Saltul de pagină încheie pagina: blocul următor începe pe pagina nouă. Rămâne vizibil un marcaj discret „Salt de pagină” (mai clar la hover și când e selectat).
   - Câmpurile `[● …]` sunt Marker-e cu fundal galben-pal, borduri rotunjite și cursor `pointer`. Click selectează câmpul întreg, iar tastarea îl înlocuiește.
   - Sugestiile AI: textul șters apare tăiat roșu și cel inserat subliniat verde. La hover apare un Popover mic cu `✓ Acceptă` / `✕ Respinge` și explicația scurtă.
4. **Panoul lateral (Resizable), secundar.**
   - Implicit 360 px, minim 300, maxim 560. Se pliază complet (`⌘.`), iar lățimea se reține per utilizator.
   - Tab-urile sunt contextuale:
     - **Constatări**: apare când există o analiză. Badge cu numărul.
     - **Temeiuri**: apare pentru documentele generate.
     - **Istoric**: mereu. Detaliat în 11-istoric-versiuni.md.
   - Fiecare constatare e un card: severitate (Badge), titlu, articol citat, fragment din document, acțiunile „Mergi la text” și „Aplică sugestia” (dacă există), plus `⋯` (Ignoră, Copiază temeiul).
   - Click pe card derulează foaia și evidențiază pasajul. Invers, click pe un pasaj marcat selectează cardul.
5. **Bara de stare (28 px), terțiară.** Cuvinte, „Pagina X din N” (pagina cursorului), „3 câmpuri de completat ↓” (click = următorul câmp), „2 sugestii ↓” (click = următoarea sugestie) și zoom (`− 100% +`, presetări 75/100/125/„Potrivește lățimea”).

**Ce e primar și ce e secundar:** textul e primar, unealta de formatare e la un pas, iar analiza și istoricul sunt alături dar pliabile. Antetul nu are mai mult de un buton plin (Salvează). Analizează e outline, pentru că e o acțiune rară și declanșează un job.

## Toolbar

Ordinea de la stânga la dreapta. Scurtăturile sunt pentru macOS; pe Windows/Linux `⌘` = `Ctrl`, `⌥` = `Alt`. Coloana „Overflow” arată prioritatea de mutare în `⋯` când lățimea scade (1 = prima care se mută).

| Control | Grup | Componentă HextaUI | Scurtătură | Overflow |
|---|---|---|---|---|
| Anulează | Istoric | Button (icon, ghost) + Tooltip + Kbd | `⌘Z` | niciodată |
| Refă | Istoric | Button (icon, ghost) + Tooltip + Kbd | `⇧⌘Z` | niciodată |
| Stil paragraf (Normal, Titlu 1–3, Citat) | Stil | Select (fiecare opțiune afișată în stilul ei, cu Kbd în dreapta) | `⌥⌘0`, `⌥⌘1`, `⌥⌘2`, `⌥⌘3` | 6 |
| Familie de font | Font | Combobox (căutare; secțiuni „Din document” / „Toate”) | — | 5 |
| Mărime font | Font | Input group: Button `−` · Input numeric (pt) · Button `+`; Popover cu presetări 8–72 | `⇧⌘,` micșorează / `⇧⌘.` mărește | 5 |
| Aldin | Formatare | Toggle group (multiple) → Toggle | `⌘B` | niciodată |
| Cursiv | Formatare | Toggle | `⌘I` | niciodată |
| Subliniat | Formatare | Toggle | `⌘U` | niciodată |
| Tăiat | Formatare | Toggle | `⇧⌘X` | 4 |
| Culoare text | Culoare | Popover cu grilă de mostre (10 culori + „Automat”), bară colorată sub „A” | — | 3 |
| Evidențiere | Culoare | Popover cu 6 mostre + „Fără” | `⇧⌘H` | 3 |
| Aliniere (stânga, centru, dreapta, stânga-dreapta) | Paragraf | Dropdown menu cu icoana alinierii curente; elementele cu Kbd | `⇧⌘L`, `⇧⌘E`, `⇧⌘R`, `⇧⌘J` | 2 |
| Micșorează indentarea | Paragraf | Button (icon) | `⌘[` | 1 |
| Mărește indentarea | Paragraf | Button (icon) | `⌘]` | 1 |
| Interlinie (1,0 · 1,15 · 1,5 · 2,0 · Personalizat…) | Paragraf | Dropdown menu (Radio items) | — | 1 |
| Listă cu buline | Liste | Toggle | `⇧⌘8` | 4 |
| Listă numerotată | Liste | Toggle | `⇧⌘7` | 4 |
| Inserează tabel | Inserare | Popover cu grilă 8×8 de selecție + „Inserează…” (Dialog cu rânduri/coloane) | — | 2 |
| Salt de pagină | Inserare | Button (icon) + Tooltip | `⌘↵` | 2 |
| Inserează câmp `[● …]` | Inserare | Button (icon „●”) + Popover cu Input pentru eticheta câmpului | `⌥⌘P` | 3 |
| Șterge formatarea | Overflow | Dropdown menu item | `⌘\` | mereu în `⋯` |
| Caută și înlocuiește | Overflow | Dropdown menu item → bară de căutare deasupra foii (Input group) | `⌘F` / `⌥⌘F` | mereu în `⋯` |
| `⋯` Mai multe | Overflow | Dropdown menu (primește grupurile mutate, cu titluri de secțiune) | — | — |
| Mod concentrare | Vizualizare | Toggle (icon) + Tooltip | `⇧⌘F` | niciodată |
| Panou lateral | Vizualizare | Toggle (icon) + Tooltip | `⌘.` | niciodată |

**Bara contextuală pentru tabel.** Când cursorul e într-un tabel, deasupra tabelului apare o bandă mică ancorată (Popover non-modal), inspirată de „Table options” din Confluence:

| Control | Componentă | Conținut |
|---|---|---|
| Tabel ▾ | Dropdown menu | Rând de antet (Switch), Lățime egală a coloanelor, Șterge tabelul (destructiv, ultimul) |
| Rând ▾ | Dropdown menu | Inserează deasupra `⌥⌘↑`, Inserează dedesubt `⌥⌘↓`, Șterge rândul |
| Coloană ▾ | Dropdown menu | Inserează la stânga `⌥⌘←`, Inserează la dreapta `⌥⌘→`, Șterge coloana |
| Îmbină celulele | Button | activ doar cu mai multe celule selectate |
| Separă celula | Button | activ doar pe o celulă îmbinată |
| Culoare fundal celulă | Popover | mostre |

Aceleași acțiuni apar la click dreapta (Context menu), grupate ca la Zendesk: Rând · Coloană · Celulă · Tabel. Redimensionarea coloanelor se face din mânerul de pe bordura coloanei (cursor `col-resize`). Opțiunile dezactivate au Tooltip cu motivul („Selectează cel puțin două celule”).

**Alte scurtături (în afara barei)**

| Acțiune | Scurtătură |
|---|---|
| Salvează versiunea (direct, fără notă; nimic dacă nu s-a schimbat nimic) | `⌘S` |
| Analizează documentul | `⇧⌘A` |
| Opțiuni de export (dialog) | `⇧⌘E` |
| Printează (PDF-ul documentului) | `⌘P` |
| Deschide Istoric | `⇧⌘Y` |
| Paleta de comenzi (Command) | `⌘K` |
| Câmpul următor / anterior `[● …]` | `⌥⌘↓` / `⌥⌘↑` |
| Sugestia următoare / anterioară | `⌥⌘]` / `⌥⌘[` |
| Acceptă / respinge sugestia curentă | `⌥⌘Y` / `⌥⌘N` |
| Lista de scurtături | `⌘/` |
| Ieșire din modul concentrare | `Esc` |

## Mod concentrare

- Se activează din `⛶`, din `⋯` sau cu `⇧⌘F`.
- Antetul și bara de formatare dispar cu o tranziție Motion de 150 ms. Panoul lateral se pliază, iar bara de stare rămâne, dar cu opacitate 40% (100% la hover).
- Foaia rămâne centrată, iar fundalul devine ceva mai închis, ca foaia să iasă în evidență.
- Dacă duci mouse-ul în primii 8 px de sus, bara de formatare apare temporar. Scurtăturile de formatare funcționează și când e ascunsă.
- Indicatorul de salvare rămâne vizibil în bara de stare. Toast-urile se amână până la ieșirea din mod, cu excepția erorilor.
- La prima intrare apare un Toast: „Mod concentrare. Apasă Esc pentru a ieși.”

## Componente HextaUI

- **Breadcrumb**: calea Proiecte / proiect / document în antet.
- **Input**: titlul editabil inline; mărimea fontului; căutare și înlocuire.
- **Button** / **Button group**: acțiunile din antet; Salvează ca split button (Button + Dropdown menu cu exportul și printarea).
- **Popover**: indicatorul de salvare („Salvează versiunea…”), culorile, grila de tabel, câmpul nou, bara contextuală de tabel, acțiunile pe sugestie.
- **Textarea**: nota versiunii în popover-ul de salvare.
- **Toggle** / **Toggle group**: B I U S, liste, mod concentrare, panou lateral.
- **Select**: stilul de paragraf. **Combobox**: familia de font.
- **Dropdown menu**: aliniere, interlinie, overflow `⋯`, meniurile Tabel/Rând/Coloană, `⋯` din antet.
- **Context menu**: click dreapta în text și în tabel.
- **Separator**: între grupurile barei.
- **Tooltip** + **Kbd** + utilitarul **Hotkey**: nume și scurtătură pe fiecare buton icon; înregistrarea scurtăturilor.
- **Resizable**: împărțirea foaie / panou lateral, cu mâner.
- **Tabs**: Constatări · Temeiuri · Istoric în panou.
- **Scroll area** + **Scroll fade**: zona foii și lista din panou.
- **Card**: carduri de constatări și temeiuri. **Badge**: severitate, contoare pe tab-uri, starea „Ciornă”.
- **Item**: rândurile din listele panoului.
- **Marker**: câmpurile `[● …]` și pasajele legate de constatări.
- **Alert**: banner de eroare sau conflict deasupra foii. **Alert dialog**: conflict de salvare, ștergere.
- **Toast**: „Versiune salvată”, „Analiza a pornit”, erori.
- **Skeleton** / **Shimmer**: încărcarea documentului; constatările în curs de analiză.
- **Spinner**: butonul Analizează în timpul jobului; „Se salvează…”.
- **Command**: paleta `⌘K` (acțiuni, stiluri, salt la câmp).
- **Dialog**: lista de scurtături, „Inserează tabel…”.
- **Sheet** / **Drawer**: panoul lateral pe ecrane înguste.
- **Empty**: tab-ul Constatări înainte de prima analiză.
- **Motion**: intrarea și ieșirea din modul concentrare, deschiderea panoului.

## Stări

- **Încărcare:** antetul are titlul ca Skeleton. Bara de formatare e randată, dar dezactivată. Foaia are 12–15 linii Skeleton de lățimi variate, iar panoul are 3 carduri Skeleton.
- **Gol (document nou):** foaia e goală, cu placeholder gri pe primul paragraf: „Începe să scrii sau apasă ⌘K pentru comenzi.” Tab-ul Constatări arată Empty: „Documentul nu a fost încă analizat” + Button „Analizează”.
- **Salvare automată (ciornă):**
  - Cât tastezi: „● Modificări nesalvate” (punct gri).
  - După 1,5 s de pauză: „Se salvează…” (Spinner mic).
  - Apoi: „Ciornă salvată 14:32” (punct verde).
  - Nu afișăm Toast pentru salvarea automată.
- **Salvează versiunea:** popover cu Textarea „Notă (opțional)” și butonul „Salvează versiunea”. La succes apare Toast-ul „Versiunea a fost salvată” cu link „Vezi în istoric”.
- **Eroare la salvare:** punct roșu și textul „Nesalvat · Reîncearcă”. Click reîncearcă. După 3 eșecuri apare un Alert deasupra foii: „Nu am putut salva ciorna. Modificările sunt păstrate în această filă; nu o închide.”
- **Conflict:** documentul a fost modificat din altă filă sau fereastră. Alert dialog: „Documentul a fost modificat în altă fereastră” cu opțiunile „Încarcă versiunea de acolo” și „Păstrează ce am aici” (păstrează textul curent și îl salvează ca versiune nouă, fără să șteargă nimic).
- **Analiză în curs:**
  - Butonul Analizează devine „Se analizează…” cu Spinner și e dezactivat.
  - Tab-ul Constatări arată un Progress cu etapa (Pregătire text · Identificare trimiteri · Verificare la data de referință) și Shimmer pe carduri.
  - Editarea rămâne permisă. Sub progres apare nota: „Modificările făcute acum nu intră în această analiză.”
- **Analiză terminată:** Toast „Analiza este gata: 7 constatări”. Tab-ul primește un Badge, iar pasajele sunt marcate în text.
- **Eroare de analiză:** în tab apare Alert „Analiza nu a putut fi finalizată.” cu motivul și „Încearcă din nou”.
- **Sugestii AI în așteptare:** în bara de stare apare „2 sugestii ↓”. Exportul avertizează dacă rămân sugestii nerezolvate (vezi 12-export.md).
- **Doar citire (vizualizarea unei versiuni vechi):** e descrisă în 11-istoric-versiuni.md. Bara de formatare e dezactivată, iar deasupra foii apare un banner.

## Ecran îngust

- **≥ 1440 px:** foaia la 100% și panoul de 360 px deschis implicit.
- **1280–1439 px:** panoul e deschis, iar foaia se micșorează automat la „Potrivește lățimea” dacă nu încape. Grupurile 1–2 trec în `⋯`.
- **1024–1279 px:** panoul se deschide peste foaie ca Sheet din dreapta (cu overlay ușor), nu împarte ecranul. Grupurile 1–4 trec în `⋯`. În antet, „Versiuni” și „Analizează” devin butoane icon cu Tooltip.
- **768–1023 px (tabletă):** bara de formatare păstrează Istoric, Stil, B I U, Liste și `⋯`. Foaia e scalată la lățimea ecranului (transform, nu reflow, ca să păstrăm aspectul A4). Bara de stare arată doar câmpuri și sugestii.
- **< 768 px (telefon):** modul e predominant de citire și revizuire. Bara de formatare se ascunde în spatele unui buton „Aa” care deschide un Drawer de jos cu formatarea. Panoul e un Drawer de jos cu tab-uri. Antetul păstrează titlul scurtat, indicatorul de salvare și `⋯`, iar acțiunile intră în `⋯`.

## Microcopy (RO)

- **Antet:** „Versiuni”, „Analizează”, „Salvează” / „Salvat”; în meniul `⋯`: „Redenumește”, „Duplică”, „Mod concentrare”, „Scurtături de tastatură”, „Șterge documentul”.
- **Indicator de salvare:** „Modificări nesalvate” · „Se salvează…” · „Ciornă salvată 14:32” · „Nesalvat · Reîncearcă”.
- **Popover salvare:** titlu „Salvează versiunea”; câmp „Notă (opțional)”, placeholder „Ex.: după discuția cu clientul”; buton „Salvează versiunea”; text ajutător „Ciorna se salvează automat. O versiune rămâne în istoric și poate fi restaurată.”
- **Tooltip-uri bară:** „Aldin ⌘B”, „Cursiv ⌘I”, „Subliniat ⌘U”, „Tăiat ⇧⌘X”, „Culoarea textului”, „Evidențiere ⇧⌘H”, „Aliniere”, „Micșorează indentarea ⌘[”, „Mărește indentarea ⌘]”, „Interlinie”, „Listă cu buline ⇧⌘8”, „Listă numerotată ⇧⌘7”, „Inserează tabel”, „Salt de pagină ⌘↵”, „Inserează câmp de completat ⌥⌘P”, „Mai multe”, „Mod concentrare ⇧⌘F”, „Afișează panoul ⌘.”.
- **Stiluri:** „Normal”, „Titlu 1”, „Titlu 2”, „Titlu 3”, „Citat”.
- **Tabel:** „Tabel”, „Rând”, „Coloană”, „Rând de antet”, „Inserează deasupra”, „Inserează dedesubt”, „Inserează la stânga”, „Inserează la dreapta”, „Îmbină celulele”, „Separă celula”, „Șterge rândul”, „Șterge coloana”, „Șterge tabelul”; tooltip dezactivat: „Selectează cel puțin două celule”.
- **Sugestie:** „Sugestie AI”, „Acceptă”, „Respinge”, „Acceptă toate (2)”, „Respinge toate”.
- **Câmp:** placeholder implicit „[● completează]”; bara de stare: „3 câmpuri de completat”.
- **Panou:** tab-urile „Constatări”, „Temeiuri”, „Istoric”; filtrele „Toate”, „Critice”, „Atenție”, „Informative”; în card: „Mergi la text”, „Aplică sugestia”, „Ignoră”, „Copiază temeiul”.
- **Gol:** „Documentul nu a fost încă analizat.” / „Analiza verifică trimiterile la lege la data de referință aleasă.” / Button „Analizează”.
- **Analiză:** „Se analizează…”, „Modificările făcute acum nu intră în această analiză.”, „Analiza este gata: 7 constatări.”, „Analiza nu a putut fi finalizată.”
- **Conflict:** titlu „Documentul a fost modificat în altă fereastră”; text „Alege ce păstrezi. Cealaltă variantă rămâne în istoric.”; butoane „Încarcă versiunea de acolo” / „Păstrează ce am aici”.
- **Concentrare:** „Mod concentrare. Apasă Esc pentru a ieși.”

## Întrebări deschise

- Foaia rămâne albă în modul întunecat (ca o hârtie reală) sau se inversează? Recomandarea e foaie albă cu luminozitate ușor redusă, ca previzualizarea să fie fidelă exportului DOCX.
- ~~Mai vrem și un buton vizibil „Salvează versiunea” în antet?~~ Da: „Salvează” e acum partea principală a butonului split (12-export.md).
- Câte fonturi oferim? Recomandarea: o listă scurtă (Times New Roman, Arial, Calibri, Cambria, Georgia) plus fonturile găsite în documentele importate.
- Zoom-ul se reține per document sau global?
- Sugestiile AI trebuie grupate (ex.: „Acceptă toate din secțiunea 3”) sau ajung „Acceptă/Respinge toate”?
- Afișăm un cuprins (outline) al titlurilor, de exemplu ca al patrulea tab sau în `⌘K`? Searchable îl ține în stânga, dar asta strâmtează foaia.
- Păstrăm `⇧⌘A` pentru Analizează, deși în unele browsere e deja folosit? Trebuie testat pe Chrome, Safari și Firefox.
