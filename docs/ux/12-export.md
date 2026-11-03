# 12 — Export

**Rută / context:** butonul split din antetul editorului are ca parte principală „Salvează” (o versiune nouă, `⌘S`). Partea `▾` deschide exportul rapid (DOCX, PDF, DOCX adnotat), „Printează…” (`⌘P`) și „Opțiuni de export…”, adică dialogul de mai jos (tot el se deschide cu `⇧⌘E` sau din paleta `⌘K`). · **Scop:** produce fișierul potrivit pentru ce urmează: DOCX curat (de trimis sau de editat în Word), PDF (documentul așa cum arată în editor, de trimis sau de printat) și DOCX adnotat (de lucru, cu constatările în document) · **Ce face utilizatorul aici:** alege ce exportă, ajustează câteva opțiuni, vede ce probleme rămân deschise (câmpuri necompletate, sugestii nerezolvate), descarcă fișierul sau îl printează.

> Actualizare (nov. 2026): raportul de analiză PDF și nota de conformitate nu se mai exportă. Butonul principal din antet e „Salvează”, iar exportul a trecut în meniul `▾`. Secțiunile de mai jos descriu forma actuală.

## Referințe analizate (≥10)

Toate ecranele au fost citite din imagine. 15 aplicații distincte.

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Pitch | [ecran](https://mobbin.com/screens/619bd4ad-6bb2-43fc-9502-7997c78f34f9) | Formatele sunt carduri alăturate, fiecare cu icoana tipului de fișier, titlu și o frază despre când îl folosești („PDF – compressed: best for sharing…”). Callout info cu limitele exportului. Un singur buton primar, cu numele acțiunii („Export presentation”). | Bannerul de upsell („Remove watermark”). |
| 2 | Plane | [ecran](https://mobbin.com/screens/9e13ea5b-72e8-48ae-a506-35da61dbc49e) | Dialog mic și clar: grupuri radio „Format” (PDF / Word (DOCX) / Markdown) și „Content”, apoi „Page format: A4”. Subsol Cancel / Continue. Cel mai apropiat de nevoia noastră. | „Continue” în loc de numele acțiunii reale. |
| 3 | Fireflies | [ecran](https://mobbin.com/screens/64a14fae-d2f5-424f-9975-c71566248355) | Tab-uri pe tipul conținutului (Transcript / Summary / Audio), format ca butoane segmentate (DOCX, PDF, JSON, MD) și checkbox-uri de includere („Include AI Apps”, „Include timestamps”). Același model ca opțiunile pentru DOCX adnotat. | Titlul fix „Download Meeting as PDF”, care nu se schimbă după formatul ales. |
| 4 | Gamma | [în generare](https://mobbin.com/screens/8665be6a-dd30-4335-aca3-589b43ed7760) · [gata](https://mobbin.com/screens/dfe8916d-fe87-475c-8159-9acacbba83f6) | Fiecare format e un rând cu icoană și buton de descărcare. Rândul în curs se transformă în „Your PDF is being generated. It's safe to close the share panel.” La final apare un toast: „Your PDF export is ready. A download should start automatically. If not, click here to download it.” Asta ne dă starea de generare și fallback-ul. | Dialogul care amestecă partajare, embed și export. |
| 5 | Craft | [ecran](https://mobbin.com/screens/4db19b6a-476b-4f67-85c8-c14da1b98baa) | Opțiunile în stânga (Page Size A4, Font Size, switch-uri „Show Document Title”, „Show Page Numbers”) și previzualizarea PDF în dreapta, actualizată live. Butonul primar e jos pe coloana de opțiuni. | Previzualizarea mică, cu fundal fotografic, care nu arată conținutul real. |
| 6 | Coda | [ecran](https://mobbin.com/screens/f5c64d21-bf07-4525-a9b9-c76ecc16943b) | Dialog compact „Export to PDF”: etichete de secțiune cu majuscule mici (PAGES / LAYOUT / SIZE), alegere vizuală Portrait/Landscape cu icoane, Select pentru mărime. | Opțiunea Landscape, irelevantă pentru acte juridice. |
| 7 | ClickUp | [ecran](https://mobbin.com/screens/76d8f7eb-14ed-416e-b0e0-7add15c67b48) | Exportul se deschide în panoul lateral al editorului: radio „This page / Entire Doc” și lista „Export as” (PDF, HTML, Markdown, Print), fiecare cu icoană. | Exportul și importul amestecate în același panou. |
| 8 | PandaDoc | [ecran](https://mobbin.com/screens/790fa2ea-60f0-46e5-af46-00caa41c1ed5) | Calea rapidă: meniul `⋯` → „Download” → submeniul „Download as .pdf / .docx”, fără dialog. E modelul pentru partea `▾` a butonului nostru. | Exportul îngropat într-un meniu cu 12 acțiuni. |
| 9 | Typeform | [ecran](https://mobbin.com/screens/e2f9772f-62e2-49aa-8913-cf0a18bd0292) | Radio cu titlu + descriere pe fiecare opțiune („CSV file · Works with Google Sheets…”). Opțiunile indisponibile sunt dezactivate, dar vizibile, cu motivul în clar („Selected responses (0 responses)”). Grupurile sunt separate prin linii. | Blocul promoțional „Connect to your apps” din dialog. |
| 10 | Square | [ecran](https://mobbin.com/screens/e4539b32-5313-4543-bb60-d95d76565c19) | Rânduri radio mari, cu radio-ul la dreapta și eticheta „(recommended)” pe opțiunea implicită, fiecare cu explicație. Tipografie clară, pe două secțiuni („Items” / „File format”). | Butonul primar „Export” sus, în dreapta, departe de alegeri. |
| 11 | Zoho CRM | [ecran](https://mobbin.com/screens/8600af93-9cc7-4a22-b490-070000002b25) | Opțiunea selectată devine card cu fundal colorat. „Export Preferences” cu checkbox-uri și icoane ⓘ de ajutor. | Paragrafele lungi de explicație sub fiecare opțiune. |
| 12 | Salesforce | [ecran](https://mobbin.com/screens/9401bb45-1cd1-4902-8445-626d4f5efa73) | Două carduri de alegere („Formatted Report” vs. „Details Only”), selecția marcată cu bifă în colț. Formatul dedesubt. Corespunde alegerii DOCX curat vs. adnotat. | Select-ul nativ de sistem pentru format, nealiniat stilistic. |
| 13 | Arcade | [ecran](https://mobbin.com/screens/fe4d0c3b-48e8-434f-af76-d2a1611a1ccd) | Tab-uri „New export / Previous exports” (istoric de exporturi). Presetări ca carduri, apoi „Advanced settings” cu controale segmentate. Butonul primar arată mărimea: „Download GIF (0.17MB)”. | Prea multe setări tehnice (FPS, rezoluție) la vedere. |
| 14 | Notion | [ecran](https://mobbin.com/screens/8aff7e5c-7473-4965-807f-92cb8d55eba2) | Popover foarte compact, cu rânduri „etichetă · valoare ▾” (Export format, Page content) și switch-uri („Include subpages”). Pentru opțiunile secundare e suficient. | Valorile greu de descoperit: arată ca text, nu ca dropdown. |
| 15 | Skiff | [ecran](https://mobbin.com/screens/d413a6a7-3f02-48e4-a5ba-5b758512facc) | Meniu `⋯` închis la culoare, cu submeniul „Export → Export as .pdf / Export as .md”. Confirmă tiparul de export rapid din meniu, cu extensia vizibilă. | Watermark-ul diagonal pe document. |

## Tipare comune

- **Două căi de export:** rapidă, din meniu (PandaDoc, Skiff), și cu opțiuni, din dialog (Plane, Pitch, Coda, Fireflies). Aplicațiile mature le oferă pe amândouă.
- **Alegerea formatului e prima decizie și cea mai vizibilă.** Apare fie ca carduri cu icoană și descriere (Pitch, Salesforce), fie ca radio cu descriere (Typeform, Square, Plane). Lista de format nu e ascunsă într-un Select.
- **Fiecare opțiune are o frază „de ce/când”** („Best for sharing on the web”, „Works with Google Sheets”) (Pitch, Typeform, Square).
- **Opțiunile secundare apar după format și depind de el:** checkbox-uri sau switch-uri de includere (Fireflies, Craft, Notion, Zoho).
- **Opțiunile indisponibile sunt dezactivate, dar vizibile, cu motivul** (Typeform).
- **Butonul primar poartă numele acțiunii reale** („Export presentation”, „Download GIF (0.17MB)”), nu „Continue” sau „OK”.
- **Generarea are stare vizibilă și e sigur să închizi dialogul:** descărcarea pornește automat și există fallback „dacă nu, apasă aici” (Gamma).
- **Previzualizarea e live doar pentru PDF** (Craft). Pentru fișierele de lucru (DOCX) aplicațiile nu arată previzualizare.

## Decizia de layout

**Calea rapidă: butonul split din antet**

```
[ 💾 Salvează | ▾ ]                          (fără modificări de la ultima versiune: [ ✓ Salvat | ▾ ], dezactivat)
               EXPORTĂ CA
               ├─ DOCX
               ├─ PDF
               ├─ DOCX adnotat               (doar după o analiză; altfel nu apare)
               ├──────────────
               ├─ Printează…                  ⌘P
               └─ Opțiuni de export…          ⇧⌘E   (deschide dialogul)
```

- **Salvează** (buton plin, Tooltip „Salvează versiunea ⌘S”) salvează direct o versiune, fără notă. Nota se adaugă din indicatorul de salvare de lângă titlu („Ciornă salvată 14:32” → Popover „Salvează versiunea”). Cât timp conținutul e identic cu ultima versiune, butonul arată „✓ Salvat” și e dezactivat; `⌘S` nu face nimic.
- Elementele de export descarcă imediat conținutul de lucru, cu setările implicite, și afișează starea în Toast.
- **Printează…** generează același PDF ca exportul și deschide dialogul de printare al browserului (vezi „PDF și printare”). `⌘P` în editor face același lucru, în locul printării paginii aplicației.

**Dialogul (600 px)**

```
┌ Export ───────────────────────────────────────────────────────────────── ✕ ┐
│ Contract de închiriere · ciorna curentă                                       │
│                                                                              │
│ Ce exporți                                                                   │
│ ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐         │
│ │ [W] DOCX curat (●) │ │ [PDF] PDF      ( ) │ │ [W] DOCX adnotat( )│         │
│ │ Textul final, fără │ │ Documentul așa cum │ │ Pasajele citate și │         │
│ │ marcaje.           │ │ arată în editor.   │ │ constatările.      │ ← dezactivat fără analiză │
│ └────────────────────┘ └────────────────────┘ └────────────────────┘         │
│                                                                              │
│ ┌ ⚠ Înainte de export ─────────────────────────────────────────────────────┐ │
│ │ 3 câmpuri necompletate [● …] vor apărea în fișier așa cum sunt. Mergi la │ │
│ │ primul ›                                                                 │ │
│ │ 2 sugestii AI nerezolvate nu vor fi incluse.  Revizuiește ›              │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Opțiuni                                                          (depind de alegere) │
│ Versiune        [ Ciorna curentă                                  ▾ ]        │
│ Nume fișier     [ Contract-inchiriere_2026-11-01                ].docx       │
│ ☐ Păstrează evidențierile de culoare din text                                │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                              [Anulează]  [⤓ Descarcă DOCX]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Opțiuni pe format** (secțiunea „Opțiuni” se schimbă cu Motion)

- **DOCX curat:** Versiune (Select), Nume fișier (Input group cu sufix `.docx`), „Păstrează evidențierile de culoare din text” (Checkbox, implicit off).
- **DOCX adnotat:** Versiune, Nume fișier și „Include” (Checkbox-uri):
  - constatările ca comentarii Word (implicit on);
  - evidențierea pasajelor (on);
  - sugestiile AI nerezolvate ca modificări urmărite (track changes) (off);
  - temeiurile ca note de subsol (off).
  - Filtru de severitate: Toggle group „Toate / Critice și atenție / Doar critice”.
- **PDF:** Versiune, Nume fișier (sufix `.pdf`), „Păstrează evidențierile de culoare din text” și „Numerotează paginile („Pagina 2 din 5” în subsol)” (ambele implicit off).
- Opțiunile nefolosite de obicei stau într-un Collapsible „Mai multe opțiuni”. Implicit sunt vizibile cel mult 3 controale.

**Ierarhie**

1. Alegerea a ce exporți (Radio group cu trei carduri pe un rând) e primară.
2. Avertismentul „Înainte de export” apare doar dacă există probleme. E Alert de tip warning, cu linkuri care închid dialogul și duc la problemă în editor. Nu blochează exportul.
3. Opțiunile sunt secundare și compacte, pe rânduri „etichetă · control” (ca la Notion și Plane).
4. Butonul primar își schimbă eticheta după alegere: „Descarcă DOCX”, „Descarcă PDF”, „Descarcă DOCX adnotat”.

**Disponibilitate:** cardurile indisponibile rămân vizibile, dar dezactivate, cu motivul în descriere, ca la Typeform:

- DOCX adnotat: „Rulează mai întâi o analiză.” (în meniul rapid elementul lipsește până la prima analiză).

**PDF și printare**

- PDF-ul se generează pe server (`/api/documente/[docId]/export?format=pdf`), din JSON-ul documentului și `DocumentMeta`, cu pdfmake (`buildPdfDefinition` în `packages/docx/src/pdf.ts`, randarea în `apps/web/src/server/pdf.ts`). Nu depinde de LibreOffice sau Word.
- Fidelitate față de foaia din editor: mărimea și orientarea paginii, marginile, fontul, mărimea și interlinia implicite, spațiul după paragraf, titlurile (16/14/13/12 pt), aldin, cursiv, subliniat, tăiat, indice, exponent, culori și evidențieri, aliniere (inclusiv stânga-dreapta), indentarea stângă și a primului rând, listele numerotate și cu buline pe niveluri, tabelele (borduri de 0,5 pt, lățimi, celule fuzionate, fundal, rândul de antet repetat pe paginile următoare), salturile de pagină, linia orizontală, antetul și subsolul din meta. Marginile verticale dintre paragrafe se comasează ca în CSS, iar titlurile nu rămân singure la capăt de pagină.
- Fonturile: cele ale sistemului (Times New Roman, Arial, Georgia, Courier New, Verdana, Tahoma, Trebuchet MS; Calibri, Cambria, Garamond dacă sunt instalate), cu variantele bold și italic. Familiile lipsă trec pe un echivalent (sans → Arial, serif → Times New Roman, monospace → Courier New), apoi pe Roboto. Caracterele fără glifă în fontul ales se scriu cu Arial Unicode. Diacriticele (ș ț ă î â, și ş ţ vechi) se văd și se pot copia din PDF.
- Câmpurile `[● …]` necompletate apar ca text, pe fundal galben deschis (ca în DOCX), ca să nu treacă neobservate. Sugestiile AI nerezolvate nu se includ (textul rămâne cel original).
- Limite: indentarea negativă (agățată) a primului rând nu se reproduce; tab-urile devin patru spații; legăturile interne (`#…`) rămân doar stilizate; notele de subsol se pun la finalul documentului, ca la DOCX; despărțirea rândurilor poate diferi puțin de editor (alt motor de text).
- **Printează…:** PDF-ul se încarcă într-un iframe ascuns (adresă `blob:`), din care se cheamă `print()`. Toast „Se pregătește documentul pentru printare…” cât se generează. Dacă browserul nu permite printarea din iframe, PDF-ul se deschide într-o filă nouă (și din Toast, „Deschide PDF-ul”). Adresa și iframe-ul se eliberează la printarea următoare sau după 10 minute.

## Componente HextaUI

- **Button group** (Button + Dropdown menu): butonul split „Salvează ▾” din antet.
- **Dropdown menu**: exportul rapid („Exportă ca”), „Printează…” și „Opțiuni de export…”, cu Kbd pentru `⌘P` și `⇧⌘E`.
- **Dialog**: containerul (600 px).
- **Radio group** cu elemente stilizate ca **Card**: cele trei tipuri de export (icoană fișier, titlu, descriere, radio).
- **Alert** (warning): „Înainte de export” (câmpuri necompletate, sugestii nerezolvate, analiză mai veche decât ultimele modificări).
- **Field** + **Label**: rândurile de opțiuni.
- **Select**: versiunea.
- **Input group**: numele fișierului cu sufixul de extensie fix.
- **Checkbox**: ce se include.
- **Toggle group**: filtrul de severitate (DOCX adnotat).
- **Collapsible**: „Mai multe opțiuni”.
- **Spinner**: butonul primar în timpul generării.
- **Toast**: „Fișierul a fost descărcat” cu „Deschide folderul” (aplicație locală) sau „Descarcă din nou”; erori.
- **Tooltip**: „Salvează versiunea ⌘S” pe butonul principal.
- **Badge**: „Recomandat” pe opțiunea implicită; data de referință lângă analiza aleasă.
- **Motion**: tranziția secțiunii „Opțiuni” la schimbarea formatului.

## Stări

- **Implicit:** ultimul format folosit e preselectat (prima dată, DOCX curat). Numele fișierului e pre-completat din titlu + data de azi.
- **Fără analiză:** cardul „DOCX adnotat” e dezactivat cu motiv, iar în meniul rapid nu apare.
- **Analiză învechită:** documentul s-a modificat după ultima analiză. Avertisment: „Analiza este din 28 oct. 2026 și nu include modificările ulterioare.” + link „Analizează din nou”. Exportul DOCX adnotat rămâne permis.
- **Probleme deschise:** Alert-ul „Înainte de export” listează câmpurile necompletate și sugestiile nerezolvate. Fiecare rând are link de salt.
- **Nume fișier invalid:** caractere interzise (`/ \ : * ? " < > |`) dau eroarea de Field „Numele nu poate conține / \ : * ? " < > |”.
- **Generare:** butonul primar devine „Se generează…” cu Spinner. Opțiunile se blochează, iar dialogul se poate închide („Poți închide fereastra; descărcarea pornește automat.”).
- **Gata:** dialogul se închide, descărcarea pornește automat, iar Toast-ul confirmă „Contract-inchiriere_2026-11-01.docx a fost descărcat.” cu „Deschide folderul” și „Descarcă din nou”.
- **Eroare:** Alert destructive în dialog: „Nu am putut genera fișierul.” + motiv scurt + „Încearcă din nou”. Opțiunile alese se păstrează.
- **Export rapid din meniu:** fără dialog. Toast cu Spinner „Se generează DOCX curat…”, apoi starea „Gata” de mai sus.

## Ecran îngust

- **≥ 640 px:** dialog 600 px, cele trei carduri pe un rând.
- **< 640 px:** Drawer de jos. Cardurile devin listă de rânduri radio pe o coloană (ca la Square), cu descrierea pe un rând. Opțiunile sunt sub „Mai multe opțiuni”, pliate implicit. Butonul primar e lipit de jos, pe toată lățimea.
- **Butonul split** se păstrează pe toate lățimile. Sub 640 px, „Salvează” / „Salvat” rămâne doar cu iconița (eticheta e pentru cititoarele de ecran), iar meniul `▾` e același.

## Microcopy (RO)

- **Titlu:** „Export”; subtitlu „{titlu document} · {versiune}”.
- **Secțiune:** „Ce exporți”.
- **Carduri:**
  - „DOCX curat”: „Textul final, fără marcaje. Pentru trimis, semnat sau editat în Word.”
  - „PDF”: „Documentul așa cum arată în editor, gata de trimis sau de printat.”
  - „DOCX adnotat”: „Pasajele citate evidențiate și constatările ca note sub paragrafe. Pentru lucru.”
- **Motive dezactivare:** „Rulează mai întâi o analiză.”
- **Avertisment:** titlu „Înainte de export”; „{n} câmpuri necompletate [● …] vor apărea în fișier așa cum sunt.” + „Mergi la primul”; „{n} sugestii AI nerezolvate nu vor fi incluse.” + „Revizuiește”; „Analiza este din {dată} și nu include modificările ulterioare.” + „Analizează din nou”.
- **Opțiuni:** „Versiune” (valori: „Ciorna curentă”, „{dată}, {oră} · {notă}”), „Nume fișier”, „Păstrează evidențierile de culoare din text”, „Numerotează paginile („Pagina 2 din 5” în subsol)”, „Include”, „Constatările ca comentarii Word”, „Evidențierea pasajelor”, „Sugestiile AI nerezolvate ca modificări urmărite”, „Temeiurile ca note de subsol”, „Severitate: Toate · Critice și atenție · Doar critice”, „Mai multe opțiuni”.
- **Butoane:** „Anulează”, „Descarcă DOCX”, „Descarcă PDF”, „Descarcă DOCX adnotat”, „Se generează…”.
- **Antet:** „Salvează” / „Salvat”; Tooltip „Salvează versiunea ⌘S”.
- **Meniu rapid:** „Exportă ca”: „DOCX”, „PDF”, „DOCX adnotat”; apoi „Printează…”, „Opțiuni de export…”.
- **Printare:** „Se pregătește documentul pentru printare…”; „PDF-ul s-a deschis într-o filă nouă.” + „Printează-l de acolo (⌘P).” + „Deschide PDF-ul”; eroare: „Nu am putut pregăti printarea.” + „Încearcă din nou”.
- **Toast:** „Se generează {tip}…” · „{fișier} a fost descărcat.” + „Deschide folderul” · „Descarcă din nou”; eroare: „Nu am putut genera fișierul.” + „Încearcă din nou”.
- **Eroare nume:** „Numele nu poate conține / \ : * ? " < > |”.

## Întrebări deschise

- La DOCX curat, câmpurile `[● …]` necompletate rămân ca text, se golesc sau blochează exportul? Propunerea: rămân și apare avertismentul, fără blocare.
- Vrem un istoric de exporturi (ca „Previous exports” la Arcade), de exemplu ca versiune marcată „Exportat” în Istoric?
- Exportul salvează automat o versiune („Exportat ca DOCX curat”), ca să știm exact ce s-a trimis? Pentru documente juridice pare valoros.
- Unde se salvează fișierul: în folderul de descărcări al browserului sau într-un folder al proiectului pe disc (aplicația rulează local)?
