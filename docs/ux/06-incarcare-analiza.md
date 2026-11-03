# 06 — Încărcare document pentru analiză

**Rută / context:** dialog modal, deschis din pagina proiectului (`/proiecte/[id]`, butonul „Încarcă pentru analiză”) sau din editor (meniul `⋯` → „Încarcă un document pentru analiză”) · **Scop:** aduce în aplicație un document existent (DOCX, DOC, PDF) și pornește analiza juridică ca job în fundal, la o dată de referință · **Ce face utilizatorul aici:** alege sau trage fișierul, verifică data de referință (implicit azi), confirmă, urmărește încărcarea și importul, apoi închide dialogul și continuă lucrul cât analiza rulează.

## Referințe analizate (≥10)

Toate ecranele au fost citite din imagine. Sunt 14 aplicații distincte (Dropbox și Dropbox Dash sunt numărate o singură dată).

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Chatbase | [flux](https://mobbin.com/flows/4109b561-4e00-4a12-925f-3e0b6316c352) | Avertisment galben deasupra zonei de drop: „If you are uploading a PDF, make sure you can select/highlight the text”. E exact problema OCR, spusă pe înțeles. Formatele acceptate sunt scrise în zona de drop („pdf, doc, docx, txt”). | Avertismentul afișat permanent, înainte să știm dacă PDF-ul chiar are nevoie de OCR. |
| 2 | Intercom | [flux](https://mobbin.com/flows/4004e49b-b6d0-4911-9c27-041d2d70b14e) | Cerințele sunt listate ca buline lângă fișiere (format PDF/DOCX, limită de MB). După încărcare apare un banner persistent: „Your content is currently being ingested. You will be notified once the ingestion is complete”. E modelul nostru de job în fundal. | Pasul intermediar de alegere a sursei (Zendesk, Notion…), inutil pentru o aplicație locală. |
| 3 | Elicit | [ecran](https://mobbin.com/screens/b4ecf955-9b87-4bd6-916c-c6e1ca74c6d9) | Progresul apare chiar în zona de drop, cu o etichetă de etapă: „1 of 2. Uploading & Processing”. Încărcarea și procesarea sunt numite separat, iar lista de fișiere are bifă la cele terminate. | Butonul „Next” dezactivat fără explicație. |
| 4 | Whop | [ecran](https://mobbin.com/screens/80459def-95d4-4909-9e7b-8d47d7807147) | Are o bară totală „Uploading 4 files · 80%” și rânduri per fișier cu stare („Uploading 76%”, „Uploaded” cu fundal verde-pal și bifă). În timpul încărcării subsolul e dezactivat. | Zona „Add more files” rămasă activă în timpul încărcării. |
| 5 | AirOps | [ecran](https://mobbin.com/screens/3c80b45c-6d21-4bd7-9e60-41ab67ef25e5) | Rândul de fișier are icoană, nume, mărime („13.8 kB”), bară subțire de progres și procent. Zona de drop rămâne deasupra, iar butonul primar „Continue” se activează la final. | Lista lungă de extensii acceptate, înșirată în text mic. |
| 6 | Lindy | [ecran](https://mobbin.com/screens/3e300add-51ee-481a-8a85-bff87d284f64) | „**Click to upload** or drag and drop” (acțiunea e îngroșată) și dedesubt limitele („20MB maximum”). Starea goală a listei: „Nothing uploaded yet”. Subsol Cancel / Save. | Butonul „Save” activ fără niciun fișier. |
| 7 | Mistral AI | [ecran](https://mobbin.com/screens/77f399e9-65be-4bf0-9ae9-462c63a5f547) | Zona de drop e compactă, cu icoană mică de nor. Limitele sunt într-un singur rând („Up to 100 files, 100 MB per file”), iar fișierul ales apare cu icoana PDF roșie. Dialogul e mic și aerisit. | Dialogul fără subsol și fără buton explicit de confirmare. |
| 8 | Perplexity | [ecran](https://mobbin.com/screens/f912c96a-3884-44b4-b412-34ad4cc8a1d9) | Secțiunea „File requirements” e deasupra zonei de drop. Rândul de fișier arată bifă + nume + `MD · 5 KB` + `×`, iar contorul „1 of 5 files” e în zonă. Colțurile sunt mari și moi. | Link-ul „Learn more” care scoate utilizatorul din flux. |
| 9 | Workable | [ecran](https://mobbin.com/screens/6fcd6830-feba-44eb-a41d-c8deb16e793e) | Câmpul de formular („Name”) e deasupra zonei de upload, în același dialog. E echivalentul câmpului nostru „Data de referință”. Subsolul are acțiunea primară explicită „Upload”. | Contorul de caractere 19/70, inutil la noi. |
| 10 | Contractbook | [ecran](https://mobbin.com/screens/90d29b96-b22f-46b9-a8d5-85f8d7de2946) | Aplicație juridică. După încărcare apar câmpuri de metadate (titlul documentului, data, părțile), iar bara de progres se termină cu „Uploaded – PREVIEW”. | Ilustrațiile decorative din zona de drop și chenarul verde punctat strident. |
| 11 | Zoom | [ecran](https://mobbin.com/screens/42268236-8e19-4709-8369-88695d6ab52a) | Progresul are cantitatea concretă („4.4 MB / 7.4 MB”) și procentul, plus `×` pentru anularea fișierului. | Tabelul cu antet de coloane pentru un singur fișier. |
| 12 | Salesforce | [ecran](https://mobbin.com/screens/dedd4c88-1a17-420f-9aa4-5a0bc9c45377) | Rezumat în subsol: „1 of 1 file uploaded” + bifă verde + buton „Done”. Starea finală e clară. | Dialogul suprapus peste alt dialog. |
| 13 | Dropbox / Dropbox Dash | [ecran Dash](https://mobbin.com/screens/8b485a3e-0485-4e98-ba32-965ac42d5fec) · [ecran Dropbox](https://mobbin.com/screens/dfe639b5-dfce-4e47-bf79-29e9bf2daec6) | Dash: zona de drop mare și un callout galben cu un avertisment contextual în același dialog. Dropbox: „Adding file to track… It'll be ready in a moment” cu progres nedeterminat, panou „Uploads” cu stări (Completed / Failed) și toast „Upload successful”. | Câmpul de căutare deasupra zonei de drop (Dash), care încarcă dialogul. |
| 14 | Navattic | [ecran](https://mobbin.com/screens/c77355ca-de06-4ac6-adce-3a88a00b5e51) | Zona are titlu („Upload files”), sub el „Drag & drop or click to browse”, apoi formatele și limita într-un rând mic („Up to 1.8GB”). Butonul primar din subsol se activează doar după alegerea fișierului. | Tab-urile de sursă alternativă din capul dialogului, care la noi nu există. |

## Tipare comune

- **Dialogul are un singur scop**, titlu scurt, `×` în dreapta sus și subsol cu Anulează + o acțiune primară (Lindy, Workable, AirOps, Navattic).
- **Zona de drop** are chenar punctat sau fundal ușor, icoană mică și textul „Trage aici sau alege”. Acțiunea e marcată ca link sau buton (Lindy, Mistral, Perplexity, Workable).
- **Limitele (format, mărime) se scriu dinainte**, într-un rând sub textul principal (Lindy, Mistral, Navattic, AirOps, Chatbase).
- **Fișierul ales devine un rând:** icoana tipului, nume, tip · mărime, `×` (Mistral, Perplexity, AirOps, Whop).
- **Progresul se arată per fișier, cu procent sau cantitate** (AirOps, Whop, Zoom), iar încărcarea e separată de procesare (Elicit: „Uploading & Processing”).
- **Procesarea lungă continuă după închiderea dialogului:** banner sau notificare când e gata (Intercom, Dropbox).
- **Avertismentele contextuale apar în dialog**, ca callout galben, nu ca eroare (Chatbase, Dropbox Dash).
- **Starea finală are confirmare explicită:** bifă, „Uploaded”, „1 of 1 file uploaded” (Salesforce, Whop, Perplexity).

## Decizia de layout

**Pasul 1: alegere** (dialog 520 px)

```
┌ Încarcă document pentru analiză ─────────────────────────── ✕ ┐
│ Analiza rulează în fundal. Poți continua lucrul cât timp e gata. │
│                                                                  │
│ ┌┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┐ │
│ ┆                         ⤒                                ┆ │
│ ┆        Trage fișierul aici sau  [Alege fișierul]         ┆ │
│ ┆           DOCX, DOC sau PDF · maximum 50 MB               ┆ │
│ └┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘ │
│                                                                  │
│ Data de referință                                                │
│ [ 01.11.2026                                   📅 ]  [Azi]       │
│ Legea se verifică în forma în vigoare la această dată.           │
│                                                                  │
│ Proiect   [ Închiriere Popescu                       ▾ ]         │  ← doar dacă dialogul e deschis fără proiect
├──────────────────────────────────────────────────────────────────┤
│                                   [Anulează]  [Încarcă și analizează] │  ← primar dezactivat fără fișier
└──────────────────────────────────────────────────────────────────┘
```

**Pasul 1b: fișier ales.** Zona de drop se restrânge la o bandă de 56 px („Înlocuiește fișierul”), iar dedesubt apare rândul de fișier (Attachment):

```
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [PDF]  Contract_inchiriere_scanat.pdf        PDF · 4,2 MB  ✕ │ │
│ └──────────────────────────────────────────────────────────────┘ │
```

**Pasul 2: progres.** Același dialog, cu conținutul înlocuit. Câmpurile devin un rezumat read-only.

```
┌ Încarcă document pentru analiză ─────────────────────────── ✕ ┐
│ [PDF] Contract_inchiriere_scanat.pdf · 4,2 MB                    │
│ Data de referință: 1 noiembrie 2026                              │
│                                                                  │
│  ✓  Încărcare                                    4,2 / 4,2 MB    │
│  ◌  Import și extragere text                     ▓▓▓▓▓░░░  62 %  │
│     Recunoaștem textul din paginile scanate (OCR): pagina 5 din 8│
│  ○  Analiză juridică                       pornește în fundal    │
│                                                                  │
│ ┌ ⚠ PDF scanat ─────────────────────────────────────────────────┐ │
│ │ Documentul nu conține text selectabil. Folosim recunoașterea  │ │
│ │ optică a textului (OCR), care poate introduce greșeli. Verifică│ │
│ │ textul importat înainte să te bazezi pe analiză.              │ │
│ └──────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│ [Anulează importul]                     [Continuă în fundal]     │
└──────────────────────────────────────────────────────────────────┘
```

**Pasul 3: predare către job.** După import, dialogul se închide singur, după 600 ms cu bifă verde. Utilizatorul ajunge în editorul documentului importat. Tab-ul Constatări arată progresul analizei (vezi 05-editor.md), iar un Toast spune „Analiza a pornit. Te anunțăm când e gata.”

**Ierarhie**

- **Primar:** zona de drop, apoi butonul „Încarcă și analizează”.
- **Secundar:** data de referință. E vizibilă și pre-completată, deci nu trebuie atinsă, dar nu e ascunsă sub „Opțiuni avansate”, pentru că schimbă rezultatul juridic.
- **Terțiar:** proiectul. Apare doar dacă dialogul e deschis dintr-un context fără proiect.
- **Progresul e o listă verticală de etape** (Încărcare → Import → Analiză), fiecare cu stare (`○` în așteptare, `◌` în curs cu Spinner, `✓` gata, `!` eroare). Doar etapa curentă are Progress cu procent și o linie de detaliu.
- **Avertismentul OCR** apare doar când importul detectează pagini fără strat de text. E un Alert de tip warning sub etape, nu înainte de încărcare.
- **Închiderea în timpul procesului nu anulează nimic.** „Continuă în fundal” închide dialogul, iar progresul continuă într-un Toast persistent cu Progress. „Anulează importul” e acțiune separată, cu confirmare.

## Componente HextaUI

- **Dialog**: containerul (520 px, titlu, descriere, subsol).
- **Attachment**: zona de drop (stările idle / drag-over / respins) și rândul de fișier ales (icoană tip, nume, tip · mărime, `×`).
- **Button**: „Alege fișierul” (secundar, în zona de drop), „Încarcă și analizează” (primar), „Anulează”, „Continuă în fundal”, „Azi”.
- **Field** + **Label**: grupurile „Data de referință” și „Proiect”, cu text ajutător și mesaj de eroare.
- **Date picker** (pe **Calendar** + **Popover**): data de referință. Acceptă tastare în format `zz.ll.aaaa`.
- **Select**: proiectul (doar fără context).
- **Progress**: progresul etapei curente; varianta subțire în Toast.
- **Spinner**: etapa în curs.
- **Item**: rândurile de etape (icoană de stare · titlu · detaliu · valoare în dreapta).
- **Alert**: avertismentul OCR (warning), erorile (destructive) și informarea despre DOC vechi (info).
- **Alert dialog**: confirmarea „Anulezi importul?”.
- **Toast**: „Analiza a pornit”, „Analiza este gata” (cu acțiunea „Deschide”), progresul în fundal după închiderea dialogului.
- **Badge**: tipul fișierului (DOCX / DOC / PDF) în rând.
- **Motion**: tranziția zonă de drop → rând de fișier și pasul 1 → pasul 2.

## Stări

- **Gol:** zona de drop e activă, iar „Încarcă și analizează” e dezactivat, cu Tooltip „Alege mai întâi un fișier”.
- **Drag-over:** zona primește chenar continuu în culoarea de accent, fundal ușor colorat și textul „Eliberează pentru a încărca”. Dacă utilizatorul trage peste tot dialogul, zona activă e tot dialogul.
- **Fișier respins (tip):** rândul nu apare. Sub zonă apare eroarea: „Fișierul „poza.jpg” nu poate fi analizat. Acceptăm DOCX, DOC și PDF.”
- **Fișier respins (mărime):** „Fișierul are 72 MB. Limita este 50 MB.”
- **Mai multe fișiere trase:** „Poți încărca un singur document o dată. Am păstrat primul: Contract.docx.”
- **Dată de referință în viitor:** e permisă (Field cu text ajutător neutru): „Data este în viitor; analiza va folosi forma legii cunoscută azi pentru acea dată.”
- **Dată invalidă:** „Introdu o dată validă, de forma 01.11.2026.”
- **Încărcare:** etapa „Încărcare” are progres în MB și procent. Câmpurile sunt blocate.
- **Import DOCX:** de obicei e aproape instant. Etapa se bifează fără progres vizibil dacă durează sub 500 ms.
- **Import DOC:** primește un Alert info: „Fișierele .doc (Word 97–2003) se convertesc în DOCX. Formatarea complexă poate arăta ușor diferit.”
- **Import PDF cu text:** „Extragem textul din PDF: pagina 3 din 12”.
- **Import PDF scanat (OCR):** apare avertismentul OCR, iar detaliul etapei devine „Recunoaștem textul din paginile scanate (OCR): pagina 5 din 8”. Durata estimată se afișează doar dacă depășește 30 s.
- **PDF mixt:** „3 din 12 pagini sunt scanate și trec prin OCR.”
- **Eroare la import:** etapa primește `!` roșu și mesajul în locul detaliului („PDF-ul este protejat cu parolă. Deschide-l, salvează o copie fără parolă și încearcă din nou.”). În subsol apar „Alege alt fișier” și „Închide”.
- **Eroare OCR (text ilizibil):** „Nu am putut recunoaște suficient text (sub 20 % din pagini). Încearcă o scanare mai clară.”
- **Fundal:** după „Continuă în fundal”, un Toast persistent arată „Se importă Contract_scanat.pdf · 62 %” cu link „Afișează”. La final, Toast-ul devine „Documentul a fost importat. Analiza a pornit.” cu „Deschide”.
- **Analiză gata:** Toast „Analiza pentru Contract_scanat.pdf este gata: 7 constatări” cu „Deschide”. În lista proiectului, documentul primește Badge „Analizat”.

## Ecran îngust

- **≥ 640 px:** dialog centrat de 520 px.
- **< 640 px:** dialogul devine Drawer de jos, pe 90% din înălțime. Zona de drop devine un buton mare „Alege fișierul”, fără text despre tras, pentru că drag-and-drop nu există pe telefon. Limitele rămân sub buton.
- **Date picker:** pe telefon se deschide ca Drawer, cu Calendar pe toată lățimea.
- **Etapele de progres** rămân listă verticală, iar valorile din dreapta trec sub titlu.
- **Subsolul e lipit de jos:** butonul primar pe toată lățimea, „Anulează” ca text dedesubt.

## Microcopy (RO)

- **Titlu:** „Încarcă document pentru analiză”.
- **Descriere:** „Analiza rulează în fundal. Poți continua lucrul cât timp e gata.”
- **Zona de drop:** „Trage fișierul aici sau” + buton „Alege fișierul”. Limite: „DOCX, DOC sau PDF · maximum 50 MB”. Drag-over: „Eliberează pentru a încărca”. După alegere, banda restrânsă: „Înlocuiește fișierul”.
- **Data de referință:** etichetă „Data de referință”; ajutor: „Legea se verifică în forma în vigoare la această dată.”; buton „Azi”.
- **Proiect:** etichetă „Proiect”, placeholder „Alege proiectul”.
- **Butoane:** „Anulează”, „Încarcă și analizează”, „Continuă în fundal”, „Anulează importul”, „Alege alt fișier”, „Închide”.
- **Etape:** „Încărcare”, „Import și extragere text”, „Analiză juridică”; detalii: „4,2 / 4,2 MB”, „Extragem textul din PDF: pagina 3 din 12”, „Recunoaștem textul din paginile scanate (OCR): pagina 5 din 8”, „pornește în fundal”.
- **Avertisment OCR:** titlu „PDF scanat”; text „Documentul nu conține text selectabil. Folosim recunoașterea optică a textului (OCR), care poate introduce greșeli. Verifică textul importat înainte să te bazezi pe analiză.”
- **Confirmare anulare:** „Anulezi importul?” / „Fișierul nu va fi adăugat în proiect.” / „Anulează importul” · „Continuă importul”.
- **Erori:** „Fișierul „{nume}” nu poate fi analizat. Acceptăm DOCX, DOC și PDF.” · „Fișierul are {n} MB. Limita este 50 MB.” · „PDF-ul este protejat cu parolă…” · „Nu am putut citi fișierul. Poate fi deteriorat.”
- **Toast-uri:** „Analiza a pornit. Te anunțăm când e gata.” · „Analiza pentru {nume} este gata: {n} constatări” + „Deschide”.

## Întrebări deschise

- Care e limita reală de mărime? 50 MB e o propunere și depinde de OCR și de memoria locală.
- Din editor, documentul încărcat devine document nou în proiect sau poate deveni și o versiune nouă a documentului curent (origine „import” în istoric)? Varianta a doua ar cere o alegere în dialog: „Ca document nou” / „Ca versiune nouă a acestui document”.
- Permitem încărcarea mai multor fișiere deodată, cu câte un job de analiză per fișier? Pentru o aplicație personală, un singur fișier pare suficient la început.
- Detectăm nevoia de OCR înainte de încărcare (în browser, cu pdf.js) ca să avertizăm mai devreme, sau doar în etapa de import?
- Data de referință se reține per proiect (ultima folosită) sau e mereu „azi”?
- Notificarea „Analiza este gata” rămâne doar Toast în aplicație, sau folosim și notificări de sistem din browser?
