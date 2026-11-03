# 09 — Document nou: catalog și asistent

**Rută / context:** `/proiecte/[id]/nou` — pagină întreagă în interiorul proiectului (nu modal), cu două faze pe aceeași rută: catalogul de tipuri (`?pas=tip`) și asistentul pe pași (`?tip=contract-inchiriere&pas=parti`) · **Scop:** să adune, fără efort și fără ambiguitate, datele de care agentul are nevoie pentru a redacta un document conform legii la data aleasă · **Ce face utilizatorul aici:** alege tipul de document (sau „Alt document”), descrie scopul, adaugă părțile și calitatea lor, completează elementele esențiale, alege data și poziția, opțional încarcă un model, verifică rezumatul și pornește generarea.

## Referințe analizate (≥10)
| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Contractbook | [ecran](https://mobbin.com/screens/ff6ceb9c-9514-43ad-81dc-e4b45f69aa0c) | Catalog juridic: coloană stângă cu categorii (Commercial & Business, HR & Employment, Rental…), fiecare cu punct colorat; grilă de carduri albe cu iconiță de document, titlu, etichetă de categorie și ochi de previzualizare; căutare sus; „Create a draft by choosing a template or start from scratch”. Cel mai apropiat model de domeniu. | Cardurile foarte înalte și goale; etichetele „Startup +2” fără sens pentru utilizator. |
| 2 | PandaDoc | [ecran](https://mobbin.com/screens/2de411fa-b1ca-4fd2-9dc7-34c50a97c15a) | Zonă de drag & drop pentru import („PDF, Word…”) deasupra galeriei; prima carte „Blank document”; comutator listă / grilă; categorii în stânga. Model pentru „Pornește de la un model propriu”. | Previzualizările colorate de marketing; prea multe surse de import. |
| 3 | Craft | [ecran](https://mobbin.com/screens/5a1d0a8c-4320-462f-834f-fb3c4a6e0046) | „What do you want to start with?”: 6 dale egale cu iconiță + nume, plus un câmp „Describe what you want to create…” și buton „Create”. Model pentru „Alt document” descris liber. | Ilustrația mare de sus care împinge conținutul în jos. |
| 4 | Dovetail | [ecran](https://mobbin.com/screens/23bc287e-f753-4296-8c04-aa6e5027a43a) | Carduri mari cu iconiță liniară albastră, titlu, „By Dovetail”; cardul selectat are contur albastru gros; acțiune jos „Create in [folder]”. Stilul de iconițe și de selecție. | Prea puține informații pe card (nu spune ce conține șablonul). |
| 5 | Todoist | [ecran](https://mobbin.com/screens/9ad9ac6e-cf53-4eb3-85ae-04cc62f956e9) | Categorii în stânga cu iconițe; carduri cu titlu, o descriere de două rânduri și tipul („Board”, „List”) jos; căutare „Search all templates”. Descrierea scurtă pe card. | Ilustrațiile colorate pe fiecare card. |
| 6 | Pitch | [ecran](https://mobbin.com/screens/f182eb14-b5cd-4498-9bb2-dd7d65ecb329) | Două dale mari deasupra galeriei: „Start from blank” și „Import file”; dedesubt galeria pe secțiuni. Ierarhia: acțiunile de pornire înaintea șabloanelor. | Bannerul promoțional din mijloc. |
| 7 | GitLab | [ecran](https://mobbin.com/screens/f78cd32e-8912-4017-beac-5eb6aaad3c08) | Varianta listă: rând cu iconiță, nume, descriere și două butoane „Preview” / „Use template”. Bună pentru ecran îngust. | Butoanele albastre repetate pe fiecare rând. |
| 8 | Bonsai | [flux](https://mobbin.com/flows/f5fa6076-e320-4d0c-b0c5-87bc3ff50cdf) | Asistent de contract „1 OF 4” cu fraze completabile („I am a contractor and I'm in … California”), casetă de ajutor în dreapta cu explicații juridice, validare inline („Please fill in your deposit amount”), date de început/sfârșit în frază. Ideea de previzualizare în limbaj natural a clauzei. | Formularul integral „mad-lib”: greu de accesat cu tastatura și de citit pe ecran mic. |
| 9 | Square | [flux](https://mobbin.com/flows/4f25e161-a07e-4154-86c2-4d98db4e0150) | „New contract”: titlu centrat, pașii ca breadcrumb sub titlu („Details › Add information › Review & share”), „Save as draft” + „Next” sus dreapta; clauze bifabile cu „Clone & edit”; previzualizarea contractului la final. | Mesajul de eroare global roșu („Invalid request”) fără indicarea câmpului. |
| 10 | HubSpot | [flux](https://mobbin.com/flows/da528cf9-aed1-4c09-992d-7642e79cbb2d) | Generare cu AI în 4 pași cu stepper orizontal etichetat („Define idea”, „Select title”, „Optional Add documents”, „Review outline”), „Step 1 of 4” în dreapta, pas opțional marcat ca atare, ultimul pas = verificarea planului, CTA final „Generate blog post”; notă „Do not include sensitive information”. | Câmpurile cu fundal gri și etichete cu albastru, contrast slab. |
| 11 | Workable | [ecran](https://mobbin.com/screens/41e79574-116d-49ed-a7ca-a1756dd9271c) | Stepper vertical cu bife verzi; pasul „Summary” cu câte un card pe secțiune și creion de editare; „Save as draft / Previous / Done” sus dreapta. Modelul pasului „Verificare”. | Bara de acțiuni sus, departe de conținut, pe ecrane mari. |
| 12 | ElevenLabs | [ecran](https://mobbin.com/screens/105df36a-e6fe-400f-9b09-6109ee5091ee) | Stepper vertical cu titlu + o propoziție de descriere pe fiecare pas; câmpuri cu asterisc și text de ajutor sub etichetă; „Back / Continue” sub formular și „Save & exit” sus. | Selectul cu căutare suprapus peste alte câmpuri. |
| 13 | Gusto | [flux](https://mobbin.com/flows/e3963d96-3867-477a-bd28-9753a53e9fe1) | „Step 2 of 5” cu bară subțire și numele pasului; text de ajutor sub fiecare etichetă („You can edit this later”); „(optional)” scris lângă etichetă; „Save and continue” + „Save and exit”. | Linkurile „Learn more” repetate. |
| 14 | Mercury | [ecran](https://mobbin.com/screens/71e3c196-6990-4d56-987b-3835647a272e) | Contor mare „6 / 6” + lista pașilor cu bife; alegeri multiple ca butoane-chip cu checkbox („Customers”, „Suppliers”); exemple sub câmp („Paid marketing? Direct sales?”). | Câmpurile lungi fără grupare vizuală. |
| 15 | 15Five | [ecran](https://mobbin.com/screens/b15499c2-0d36-47a0-a758-073e309e1a60) | Card de bun venit care explică procesul și că draftul se salvează; o întrebare pe card, cu „Pro Tips”; pașii următori vizibili estompat dedesubt. | Paleta portocaliu-mov saturată; prea mulți pași (9). |

## Tipare comune
- **Pornirea are trei uși**: din șablon/tip, din fișier propriu, din descriere liberă (PandaDoc, Pitch, Craft, Contractbook).
- **Categorii în stânga, carduri în dreapta**, cu căutare sus; cardul are iconiță, nume și o descriere scurtă (Contractbook, Todoist, PandaDoc).
- **Asistent cu pași numiți și număr explicit** („Step 2 of 5”, „1 OF 4”, „6 / 6”), pași opționali marcați (HubSpot, Gusto, Bonsai, Mercury).
- **Stepper vertical pe desktop** cu bife pentru pașii gata și descriere sub pas (Workable, ElevenLabs, Mercury).
- **Ultimul pas e un rezumat editabil pe secțiuni**, cu creion pe fiecare (Workable, Square „Review & share”, HubSpot „Review outline”).
- **Salvarea ca draft și ieșirea sunt mereu disponibile** (Square, Workable, Gusto, ElevenLabs).
- **Ajutor contextual lângă câmp**, nu într-o pagină separată (Bonsai, Gusto, Mercury).
- **CTA final cu verbul acțiunii AI** („Generate blog post”) și o notă despre verificarea rezultatului (HubSpot).

## Decizia de layout
**Faza 1 — Catalog** (pagină întreagă, conținut max 1120 px):

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ Proiecte › Litigiu Ionescu › Document nou                                     │
│ Document nou                                              [Caută tip…   ⌘K]  │
│                                                                               │
│ ┌──────────────────────────────┐ ┌──────────────────────────────┐             │
│ │ ⇪ Pornește de la un model    │ │ ✎ Alt document               │             │  ← două uși mari
│ │   Încarcă .docx sau .pdf     │ │   Descrie ce ai nevoie       │             │
│ └──────────────────────────────┘ └──────────────────────────────┘             │
│                                                                               │
│ Contracte                                                                     │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐                                  │
│ │ ▤ Contract │ │ ▤ Contract │ │ ▤ Contract │                                  │  ← carduri tip
│ │ (general)  │ │ de închiri-│ │ individual │                                  │
│ │ Vânzare,   │ │ ere        │ │ de muncă   │                                  │
│ │ prestări…  │ │ Locuință,  │ │ + act adi- │                                  │
│ │ ~6 întreb. │ │ spațiu…    │ │ țional     │                                  │
│ └────────────┘ └────────────┘ └────────────┘                                  │
│ Muncă și societăți                                                            │
│ [Decizie de sancționare disciplinară] [Act constitutiv]                       │
│ Litigii și notificări                                                         │
│ [Notificare / punere în întârziere] [Cerere de chemare în judecată]           │
│ Protecția datelor                                                             │
│ [Notă de informare GDPR]                                                      │
└───────────────────────────────────────────────────────────────────────────────┘
```

Catalogul are doar 9 tipuri, așa că nu folosim coloana de categorii (Contractbook), ci secțiuni cu titlu în aceeași pagină; căutarea (`⌘K`) filtrează și acceptă sinonime („chirie” → contract de închiriere, „somație” → notificare). Fiecare card arată: iconiță liniară, nume, o propoziție cu variantele acoperite și durata estimată a asistentului. Clic pe card → faza 2 cu tipul preselectat. „Alt document” deschide asistentul cu pasul 1 transformat în câmp de descriere liberă (Craft).

**Faza 2 — Asistent** (trei coloane pe ≥ 1280 px, două pe 1024–1279 px):

```
┌──────────────────┬──────────────────────────────────────────┬─────────────────────────┐
│ Contract de      │ Pasul 3 din 6 · Elemente esențiale       │ Rezumat                 │
│ închiriere       │                                          │ ─────────────────────── │
│                  │ Obiectul contractului *                  │ Contract de închiriere  │
│ ✓ Tip și scop    │ [Apartament, str. …, Cluj-Napoca      ]  │ pentru locuință         │
│ ✓ Părți          │ Descrie bunul suficient cât să poată fi  │                         │
│ ● Elemente       │ identificat.                             │ Locator: Ion Popescu    │  ← rezumat viu, în limbaj
│   esențiale      │                                          │ (persoană fizică)       │    juridic, ca un antet
│ ○ Dată și poziție│ Chiria *            Moneda   Plata       │ Locatar: Alfa SRL       │    de contract
│ ○ Model (opț.)   │ [2.500  ] [lei ▾]  [lunar, până la 5 ▾]  │                         │
│ ○ Verificare     │                                          │ Chiria: 2.500 lei/lună  │
│                  │ Durata                                   │ Durata: 12 luni de la   │
│                  │ (●) Determinată [12] [luni ▾]            │ 01.04.2025              │
│                  │ ( ) Nedeterminată                        │                         │
│ Salvat automat   │                                          │ Lipsește: garanția      │  ← ce va deveni „[● …]”
│ acum 3 s         │ + Adaugă un termen (garanție, penalități)│                         │
│                  │                                          │                         │
│ [Ieși]           │ ─────────────────────────────────────── │                         │
│                  │ [Înapoi]                    [Continuă →] │                         │
└──────────────────┴──────────────────────────────────────────┴─────────────────────────┘
```

- **Stânga (220 px):** numele tipului, stepper vertical cu cele 6 pași (bifă / punct plin / cerc gol), „Salvat automat acum 3 s”, „Ieși” (păstrează draftul). Clic pe un pas terminat → navighează direct.
- **Centru (max 640 px):** un pas pe ecran, titlu + propoziție de context, câmpuri grupate în blocuri, „Înapoi” / „Continuă” sub formular (nu lipite jos, ca în ElevenLabs/Gusto). Câmpurile opționale scriu „(opțional)” lângă etichetă; cele lăsate goale devin automat `[● …]` în draft și apar în „De completat” (10).
- **Dreapta (300 px):** rezumat viu scris ca antetul unui contract (inspirat de previzualizarea în limbaj natural din Bonsai, dar fără să fie el formularul), plus lista „Lipsește” — ce va rămâne de completat. Sub 1280 px rezumatul se mută într-un Collapsible deasupra butoanelor.

Pașii:
1. **Tip și scop** — tipul (preselectat, schimbabil cu Select), subtipul (Radio group: locuință / spațiu comercial / teren…), scopul în 1–3 fraze (Textarea cu exemple dedesubt, ca Mercury).
2. **Părți** — câte un Card pe parte: tip (Toggle group „Persoană fizică / Persoană juridică”), nume / denumire, identificare (CNP / CUI, opțional), sediu / domiciliu (opțional), reprezentant (pentru PJ), **calitatea** (Combobox cu valori pe tipul de document: locator, locatar, vânzător, cumpărător, angajator, salariat, creditor, debitor, reclamant, pârât…). „+ Adaugă o parte”. Validare: cel puțin două părți cu calități diferite (unde e cazul).
3. **Elemente esențiale** — câmpuri specifice tipului (obiect, preț/chirie/salariu cu monedă, termene, durată determinată/nedeterminată, loc de executare), cu ajutor contextual juridic scurt sub câmp. „+ Adaugă un termen” pentru clauze opționale (garanție, penalități, confidențialitate).
4. **Dată și poziție** — „Data documentului” (Date picker, implicit azi) și „Legislația aplicabilă la data de” (implicit aceeași, modificabilă, cu explicație); **poziția** ca Radio group pe carduri: „Echilibrat” (recomandat) / „În favoarea: [parte]” (Select cu părțile), cu o propoziție care explică efectul.
5. **Model de pornire (opțional)** — Attachment: încarcă .docx/.pdf sau alege un document din proiect; Switch „Păstrează structura modelului” / „Doar ca inspirație”. Pasul se poate sări cu „Sari peste”.
6. **Verificare** — rezumatul pe secțiuni, fiecare cu „Editează” (Workable); bloc „Ce urmează”: agentul cercetează legislația, scrie draftul, apoi îl deschide în editor cu panoul „Temeiuri”; durata estimată și consumul din abonament (chip de limită din 07); CTA primar „Generează documentul”.

## Componente HextaUI
- **Breadcrumb** — „Proiecte › [proiect] › Document nou”.
- **Input group** + **Command** — căutarea în catalog (`⌘K`), cu sinonime.
- **Card** — dalele „Pornește de la un model” / „Alt document”, cardurile de tip, cardurile de parte, cardurile de poziție.
- **Item** — varianta listă a catalogului (ecran îngust).
- **Separator** / **Hairline** — între secțiunile catalogului și între blocurile de formular.
- **Questionnaire** — scheletul asistentului (pași, navigare, validare pe pas), dacă API-ul permite stepper vertical; altfel stepper propriu din **Item** + iconițe.
- **Field** + **Label** + **Input** / **Textarea** — câmpurile, cu text de ajutor și eroare sub câmp.
- **Native select** / **Select** — monedă, unitate de durată, subtip.
- **Combobox** — calitatea părții, alegerea unui document din proiect.
- **Radio group** — durată, poziție (varianta card).
- **Toggle group** — persoană fizică / juridică.
- **Checkbox** — clauze opționale.
- **Date picker** + **Calendar** — data documentului, data de referință a legii.
- **Number flow** — afișarea sumelor formatate în rezumat (opțional).
- **Attachment** — încărcarea modelului de pornire.
- **Switch** — „Păstrează structura modelului”.
- **Collapsible** — rezumatul pe ecran mediu, „Detalii” la ajutorul contextual.
- **Tooltip** / **Hover card** — explicații juridice scurte la termeni („formă autentică”, „dată certă”).
- **Alert** — avertizări de fond (ex.: „Contractul de vânzare a unui teren cere formă autentică.”).
- **Badge** — „opțional”, „recomandat”.
- **Button** — „Continuă”, „Înapoi”, „Sari peste”, „Generează documentul”.
- **Popover** — chip-ul de limită al abonamentului (aceeași componentă ca în 07).
- **Toast** — „Draft salvat”.
- **Alert dialog** — confirmarea ieșirii când există câmpuri invalide nesalvate (rar, pentru că salvarea e automată).
- **Empty** — rezultat gol la căutarea în catalog.

## Stări
- **Gol (catalog):** nu există; catalogul are mereu cele 9 tipuri. Căutare fără rezultat → Empty „Niciun tip găsit pentru «…».” + „Descrie-l ca «Alt document»”.
- **Draft existent:** la intrarea pe `/nou`, dacă există un asistent neterminat pentru proiect, apare un Card sus: „Ai un contract de închiriere început ieri, la pasul 3.” + „Continuă” / „Renunță”.
- **Încărcare:** Skeleton pentru grila catalogului (rar, e static); în asistent, Skeleton doar pentru Combobox-ul de documente din proiect.
- **Validare:** erori afișate sub câmp, la părăsirea câmpului și la „Continuă”; focus pe primul câmp invalid; stepperul marchează pasul cu un punct de avertizare. Nu blocăm pașii pentru câmpuri opționale.
- **Încărcare model:** Progress în Attachment, apoi „Model citit: 12 pagini, 34 de clauze.”; eroare: „Fișierul nu poate fi citit. Încearcă .docx.”
- **Limită aproape atinsă:** în pasul 6, Alert warning: „Generarea poate dura ~10 min și ai 8% rămas din fereastra de 5 ore. Dacă limita se atinge, generarea continuă după 18:02.” Butonul rămâne activ.
- **Limită atinsă:** CTA devine „Programează generarea” (pornește la resetare) + secundar „Salvează draftul”.
- **Eroare la pornire:** Alert destructive în pasul 6 + „Încearcă din nou”; datele rămân.
- **Pornit:** navigare imediată în editor, unde începe faza de generare (10); asistentul devine read-only, accesibil din „Parametrii generării”.

## Ecran îngust
- Catalogul trece pe o coloană, în varianta listă (GitLab / Item): iconiță, nume, descriere pe un rând; cele două uși mari devin două rânduri evidențiate sus.
- Asistentul: stepperul vertical devine un antet compact „Pasul 3 din 6 · Elemente esențiale” cu Progress subțire și un buton „Pași” care deschide un Drawer cu lista pașilor.
- Rezumatul devine un buton „Rezumat” în antet → Drawer de jos.
- Butoanele „Înapoi” / „Continuă” devin o bară lipită jos (safe area), lățime completă pentru „Continuă”.
- Câmpurile pe două coloane (sumă + monedă + plată) trec una sub alta; Date picker se deschide ca Drawer.
- Cardurile de parte se strâng după completare la un rând („Ion Popescu · locator · PF”) cu „Editează”.

## Microcopy (RO)
- Titlu catalog: „Document nou”; subtitlu: „Alege tipul de document. Asistentul îți pune câteva întrebări, apoi redactează draftul conform legii la data aleasă.”
- Uși: „Pornește de la un model” — „Încarcă un .docx sau .pdf și îl adaptăm”; „Alt document” — „Descrie ce ai nevoie, în câteva fraze”.
- Secțiuni: „Contracte”, „Muncă și societăți”, „Litigii și notificări”, „Protecția datelor”.
- Carduri: „Contract” — „Vânzare, prestări servicii, împrumut și alte contracte civile”; „Contract de închiriere” — „Locuință, spațiu comercial, teren”; „Contract individual de muncă și act adițional”; „Decizie de sancționare disciplinară”; „Act constitutiv” — „SRL, SA, asociere”; „Notificare / punere în întârziere”; „Cerere de chemare în judecată”; „Notă de informare GDPR”. Meta: „~6 întrebări · 3 min”.
- Pași: „Tip și scop”, „Părți”, „Elemente esențiale”, „Dată și poziție”, „Model de pornire”, „Verificare”.
- Ajutor: „Câmpurile lăsate goale apar în document ca [● …], ca să le completezi mai târziu.”
- Părți: „Adaugă o parte”, „Persoană fizică”, „Persoană juridică”, „Calitatea în document”, „Reprezentată prin”.
- Poziție: „Echilibrat — clauze reciproce, fără avantaje pentru vreo parte (recomandat)”; „În favoarea: Alfa SRL — clauzele protejează în primul rând această parte, în limitele legii”.
- Dată: „Data documentului”; „Legislația aplicabilă la data de” — „Verificăm textele de lege în forma în vigoare la această dată.”
- Model: „Model de pornire (opțional)”, „Păstrează structura modelului”, „Folosește-l doar ca inspirație”, „Sari peste”.
- Verificare: titlu „Verifică datele”; „Ce urmează: cercetăm legislația aplicabilă, redactăm draftul și îl deschidem în editor, cu temeiul fiecărei clauze.”; „Durată estimată: 6–10 min”.
- Butoane: „Continuă”, „Înapoi”, „Ieși”, „Editează”, „Generează documentul”, „Programează generarea”.
- Salvare: „Salvat automat acum 3 s”.
- Erori: „Completează obiectul contractului.”, „Adaugă cel puțin două părți.”, „Alege calitatea fiecărei părți.”, „Suma trebuie să fie un număr pozitiv.”

## Întrebări deschise
- Lista de câmpuri esențiale pe tip: o definim static (schemă pe tip) sau o cere agentul la pasul 1, în funcție de scop? Static e mai previzibil; dinamic acoperă „Alt document”.
- Datele părților se pot refolosi din proiect (părți salvate deja în alte documente)? Ar merita un Combobox „Alege o parte existentă”.
- „Poziția” are doar două valori sau și un grad („ușor / ferm în favoarea”)?
- Pentru „Cerere de chemare în judecată” pașii diferă mult (instanță, obiect, valoare, probe). Păstrăm aceiași 6 pași cu conținut diferit sau un set propriu?
- Afișăm durata estimată a generării în catalog sau doar la pasul final?
- Modelul de pornire poate fi un document deja analizat în proiect (cu rezultatele lui) — îl marcăm ca atare?
