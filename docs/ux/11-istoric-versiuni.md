# 11 — Istoric versiuni și comparare

**Rută / context:** tab-ul „Istoric” din panoul lateral al editorului (`/proiecte/[id]/documente/[docId]`). Se deschide din butonul „Versiuni” din antet, cu `⇧⌘Y` sau din linkul „Vezi în istoric” al Toast-ului de salvare. Nu are rută proprie; starea de previzualizare și comparare poate fi reflectată în query (`?versiune=…&compara=…`) ca să se poată reveni. · **Scop:** arată de unde vine fiecare stare a documentului (import, salvare manuală, sugestie AI acceptată, generare), permite întoarcerea sigură la o versiune și arată exact ce s-a schimbat între două versiuni · **Ce face utilizatorul aici:** parcurge lista, filtrează după origine, deschide o versiune în citire, o compară cu cea curentă sau cu alta, o restaurează, adaugă sau editează nota unei versiuni.

## Referințe analizate (≥10)

Toate ecranele au fost citite din imagine. 15 aplicații distincte.

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Plane | [istoric în panou](https://mobbin.com/screens/afc55a5a-4236-4f12-859d-9d38a55bd06d) · [comparare](https://mobbin.com/screens/a18b90f3-07df-4255-b09e-75e5c78021a5) | Istoricul e în panoul din dreapta al editorului, nu în modal. Deasupra documentului apare o bandă cu data versiunii, badge „View only”, „Compare versions” și „Restore this version”. În modul comparare: „Comparing [Aug 25, 5:02 PM] ⇄ [Current version]”, două versiuni bifate în listă, textul șters tăiat cu hașură și „Back to version history”. E modelul principal. | Evidențierea întregului document în roz când e „Highlight changes”, care nu mai lasă vizibil ce e nou. |
| 2 | Linear | [previzualizare](https://mobbin.com/screens/68d3a291-4609-4664-b9f1-09a9c6b5f4fe) · [diferențe](https://mobbin.com/screens/6c14e085-9ff5-4e61-9a21-b04f1b0a3433) | Diff inline: textul șters gri tăiat, inserat cu fundal accent, bară verticală în marginea paragrafelor modificate. Bara flotantă jos are comutator „Highlight changes” și navigare „1 of 3 ↑ ↓”. Lista e grupată pe „Today / 1 week ago”, cu eticheta „Latest”. | Modalul mare peste editor, care ascunde contextul. |
| 3 | Fibery | [ecran](https://mobbin.com/screens/714aa790-1b39-4ef7-ab48-9402ebeb7aea) | Panoul „Version History” e grupat pe „TODAY” (pliabil), are switch „Show changes” sus și badge `CURRENT`. Jos are „Restore version” (primar) și „Cancel”. Textul șters e tăiat pe fundal galben. | Galbenul pentru ștergeri, care seamănă cu o evidențiere obișnuită. |
| 4 | Sana | [ecran](https://mobbin.com/screens/0d1c373e-876d-48f2-b460-54aa375f8b35) | Elementul din listă arată originea: „Alex Smith **via Sana**”, adică modificare făcută de AI. Asta corespunde direct originii „sugestie AI”. „Restore this version” e buton închis la culoare deasupra documentului, iar „Highlight changes” e switch în subsolul panoului. | Butonul „înapoi” din stânga sus, singura cale de ieșire. |
| 5 | Manus | [ecran](https://mobbin.com/screens/4142fbf7-14e2-4841-aad7-70e51ddf2dfe) | Fiecare versiune e un card cu timp relativ („19 minutes ago”), o **notă** descriptivă (ce s-a schimbat) și acțiunile „Preview” / „Rollback” direct pe card. Modelul pentru nota versiunii. | Miniaturile de pagină, ilizibile la mărimea asta. |
| 6 | GitBook | [ecran](https://mobbin.com/screens/d8307789-31af-4bdd-b7cf-dab69a87dd95) | Marcaje în marginea stângă per bloc (minus roșu pentru șters, creion pentru modificat). Evenimentele din istoric au icoană după tip („merged 7 changes”, „created this space”). Comutator „Show only changed pages”. | Diff-ul la nivel de caracter („DevWelcopmer”), ilizibil. Pentru text juridic diff-ul se face la nivel de cuvânt. |
| 7 | Semrush | [ecran](https://mobbin.com/screens/ed82aafc-c4dc-442d-87fc-359f7347f940) | Comparare alăturată „Original” / „New”, cu numere de paragraf, paragrafe modificate pe roz sau verde și cuvintele schimbate mai intens. Subsolul are cele două decizii explicite („Keep original version” / „Continue with new version”). | Scorul de conținut din antet. |
| 8 | Mistral AI | [ecran](https://mobbin.com/screens/e3ea7439-9dac-441f-95a9-25a7f03aebd3) | Banner deasupra documentului: „You are currently looking at an earlier version. To make changes, restore this version.” + „Restore”. E cea mai clară formulare a stării de citire. Diff verde/roșu pe blocuri. | Roșul și verdele saturate, obositoare pe un document lung. |
| 9 | Notion | [ecran](https://mobbin.com/screens/780626a3-20f5-4795-ac3b-bdbaef325210) | Listă densă, ușor de parcurs: „Today · 4:27 PM” + autor pe rândul doi, element selectat cu fundal gri. Un singur buton „Restore”, jos în dreapta. | Lipsa oricărei indicații despre ce s-a schimbat în fiecare versiune. |
| 10 | WRITER | [ecran](https://mobbin.com/screens/af061c6c-6447-41c6-b22b-002773515742) | Cronologie verticală cu linie între puncte, antet de dată („JANUARY 9, 2026”), ora în stânga și un fragment din text în dreapta. Filtru de perioadă („Last 30 days”). | Panoul în stânga, opus locului unde e panoul nostru. |
| 11 | Substack | [ecran](https://mobbin.com/screens/d1d0d099-5452-4842-bbb7-681486136291) | Badge portocaliu „Current version” pe primul element. Timp scurt îngroșat + dată completă cu secunde dedesubt. „Restore draft” dezactivat până la selectarea altei versiuni. | Zeci de versiuni la câteva secunde distanță, fără grupare (la noi ciorna automată nu creează versiuni). |
| 12 | Microsoft Loop | [ecran](https://mobbin.com/screens/dae495e5-721e-408f-b8f3-a3357fd08d4c) | Panou lateral drept cu „Current Version” marcat de o bară verticală în culoarea de accent la stânga. „Restore” e jos, dezactivat pentru versiunea curentă. | Repetarea „Jon Smith modified” pe fiecare rând, inutilă într-o aplicație cu un singur utilizator. |
| 13 | Snowflake | [ecran](https://mobbin.com/screens/87a5cccb-7753-4fa7-9055-5dc353f26380) | Checkbox „Compare with current version” în subsol, alăturat cu „Current version” vs. versiunea aleasă, plus listă în dreapta. „Restore this version” e primar. | Numerotarea liniilor ca în cod, nepotrivită pentru text juridic. |
| 14 | Jasper | [ecran](https://mobbin.com/screens/8fd7a550-99c0-4e65-abe1-04d9a0973ad5) | Data absolută („Jul 23, 2:08pm”) și cea relativă („1 minute ago”, gri) apar pe același rând. | Previzualizarea micșorată într-un modal. |
| 15 | Ferndesk | [ecran](https://mobbin.com/screens/5a0a9d00-4005-41b2-93e7-59ed3bc6a2ab) | Navigare între modificări („Reviewing 1 of 1 change” cu săgeți), banner „Viewing changes. Click here to edit”, diff inline verde/roșu pe text de documentație. | Coșul de gunoi (ștergere) lângă navigare. |

## Tipare comune

- **Istoricul stă lângă document, nu peste el.** Panoul drept apare la Plane, Fibery, Loop, Sana și GitBook. Modalele (Linear, Substack, Jasper, Snowflake) ascund editorul și cer încă un pas de închidere.
- **Elementul de listă are trei rânduri:** dată/oră (îngroșat) · autor sau origine · opțional o notă sau un fragment. Versiunea curentă e marcată cu badge (Substack „Current version”, Fibery `CURRENT`, Linear „Latest”, Profound `v2 Current` în 05).
- **Gruparea e pe zile** („Azi”, „Ieri”, data), uneori pliabilă (Fibery, Linear, WRITER, GitBook).
- **Selecția unei versiuni o deschide în locul documentului, read-only**, cu un banner explicit despre stare și acțiunea de restaurare în banner (Plane, Mistral, Sana, Ferndesk).
- **„Highlight changes” e un comutator, nu un mod separat** (Fibery, Plane, Sana, Linear). Diff-ul e inline în mod implicit, iar varianta alăturată e rezervată ecranelor late (Semrush, Snowflake).
- **Diff-ul folosește culori semantice:** inserat cu fundal verde sau accent, șters roșu tăiat, plus un marcaj în margine pe blocurile modificate (Linear, GitBook, Semrush, Mistral).
- **Navigarea între modificări are contor:** „1 of 3 ↑ ↓” (Linear, Ferndesk).
- **Restaurarea e un singur buton primar, dezactivat pe versiunea curentă** (Loop, Substack, Notion).
- **Originea modificării** apare ca „via Sana” sau ca icoană de tip eveniment (GitBook). La noi devine Badge de origine.

## Decizia de layout

**A. Lista (tab-ul Istoric, panou 360 px)**

```
┌ Constatări │ Temeiuri │ Istoric ─────────────── ✕ ┐
│ [Toate ▾ origini]                  [+ Salvează]     │  ← filtru + „Salvează versiunea”
│ ─────────────────────────────────────────────────── │
│ Ciornă curentă                           nesalvată  │  ← mereu sus, dacă diferă de ultima versiune
│ Modificări de la 14:02 · [Compară] [Salvează]       │
│ ─────────────────────────────────────────────────── │
│ AZI                                                 │
│ ▌ 14:02  [Manual]                       ● Curentă   │
│ ▌ După discuția cu clientul                         │
│   11:47  [Sugestie AI]                              │
│   Acceptate 3 sugestii: art. 5, 7, 9                │
│ IERI                                                │
│   16:20  [Manual]                                   │
│   fără notă · Adaugă notă                           │
│ 28 OCT. 2026                                        │
│   09:15  [Import]                                   │
│   Contract_inchiriere_scanat.pdf · OCR              │
│                                                     │
├─────────────────────────────────────────────────────┤
│ 4 versiuni                                          │
└─────────────────────────────────────────────────────┘
```

- Fiecare element e un Item cu ora (îngroșat), Badge de origine (culori diferite, dar discrete), nota pe max. 2 rânduri și, la hover, `⋯` (Compară cu curenta, Restaurează, Editează nota, Copiază ca document nou).
- Badge-urile de origine:
  - **Import:** neutru, icoană săgeată în jos.
  - **Manual:** neutru, icoană dischetă.
  - **Sugestie AI:** accent, icoană ✦.
  - **Generare:** accent secundar, icoană baghetă.
- Filtrul de origine e un Select cu checkbox-uri: „Toate”, „Manual”, „Import”, „Sugestie AI”, „Generare”.
- **Ciorna curentă nu e o versiune.** Apare ca rând special, sus, doar dacă diferă de ultima versiune salvată, cu acțiunile „Compară” și „Salvează”. Așa se vede clar ce s-ar pierde.

**B. Previzualizare (click pe o versiune)**

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ⓘ Vizualizezi versiunea din 28 oct. 2026, 09:15 [Import]. Documentul nu poate fi    │  ← Alert info, lipit sus
│   editat aici.          [Compară cu actuala]  [Restaurează această versiune]  [✕]    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│  bara de formatare: dezactivată (opacitate 40%)                                      │
│        ┌──────── foaie A4 (read-only) ────────┐                ┃ Istoric          │
│        │ …                                    │                ┃ ▌ 09:15 [Import]  │ ← selectat
│        └──────────────────────────────────────┘                ┃                   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**C. Comparare**

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ Compari  [28 oct., 09:15 · Import ▾]  ⇄  [Ciorna curentă ▾]     [Inline | Alăturat]   │
│          + 42 cuvinte  − 17 cuvinte · 6 modificări         [Restaurează versiunea veche] [✕] │
├──────────────────────────────────────────────────────────────────────────────────────┤
│        ┌──────── foaie A4 (read-only, diff inline) ───────┐                           │
│      ▌ │ Chiria lunară este de ~~1.000~~ 1.200 lei, plătibilă │                           │
│        │ …                                                │                           │
│      ▌ │ ~~Art. 9. Preavizul este de 15 zile.~~           │                           │
│        └──────────────────────────────────────────────────┘                           │
│                         ┌──────────────────────────────┐                              │
│                         │ Modificarea 2 din 6   ↑  ↓   │  ← bară flotantă (ca Linear) │
│                         └──────────────────────────────┘                              │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- Comparația pornește din „Compară cu actuala” (banner sau `⋯`) ori din bifarea a două versiuni în listă (checkbox la hover, ca la Plane). Cele două Select-uri din bandă permit schimbarea oricărei părți fără să revii la listă.
- **Inline e implicit:** paragrafele se păstrează, cuvintele inserate au fundal verde-pal subliniat, cele șterse sunt roșu-pal tăiate, iar blocurile modificate au marcaj de 3 px în marginea stângă a foii.
- **Alăturat** apare doar peste 1440 px. Panoul lateral se pliază automat, iar cele două foi au scroll sincronizat și stânga = versiunea veche.
- **Diff-ul e la nivel de cuvânt**, nu de caracter (vezi GitBook la „Ce evităm”). Schimbările de formatare (aldin, aliniere) apar ca marcaj în margine cu Tooltip „Formatare modificată”, nu ca text colorat.
- Navigarea `↑ ↓` (sau `⌥⌘]` / `⌥⌘[`) duce la modificarea următoare sau anterioară.

**D. Restaurare**

- Alert dialog: „Restaurezi versiunea din 28 oct. 2026, 09:15?”, cu textul „Documentul va reveni la această versiune. Starea actuală se salvează automat ca versiune nouă, deci o poți recupera oricând.”
- Restaurarea **creează o versiune nouă**, cu origine „Manual” și nota automată „Restaurat din versiunea din 28 oct., 09:15”. Nu se șterge nimic din istoric.
- Dacă există o ciornă nesalvată, aceasta se salvează mai întâi ca versiune („Ciornă salvată automat înainte de restaurare”).

**Ierarhie:** lista e secundară (panou). Foaia rămâne locul unde se citește. Bannerul de stare e primar cât timp ești în previzualizare sau comparare. „Restaurează” e singura acțiune primară, iar „Compară” e secundară.

## Componente HextaUI

- **Tabs**: tab-ul „Istoric” din panoul editorului.
- **Resizable**: panoul (comun cu editorul).
- **Scroll area** + **Scroll fade**: lista de versiuni.
- **Item**: elementul de versiune (oră, badge, notă, acțiuni).
- **Badge**: originea (Import, Manual, Sugestie AI, Generare), „Curentă”, „nesalvată”.
- **Separator** + etichete de grup: „Azi”, „Ieri”, dată.
- **Select** (cu checkbox items) sau **Dropdown menu**: filtrul de origine.
- **Checkbox**: selecția a două versiuni pentru comparare.
- **Dropdown menu**: `⋯` pe element (Compară, Restaurează, Editează nota, Copiază ca document nou).
- **Popover** + **Textarea**: „Salvează versiunea” cu notă; editarea notei.
- **Alert**: bannerul de previzualizare (info) și de comparare.
- **Alert dialog**: confirmarea restaurării.
- **Button** / **Button group**: „Compară cu actuala”, „Restaurează această versiune”, închidere.
- **Toggle group**: „Inline / Alăturat”.
- **Combobox** sau **Select**: alegerea celor două versiuni din banda de comparare.
- **Kbd** + **Tooltip**: navigarea între modificări.
- **Marker**: evidențierea inserărilor și ștergerilor în foaie.
- **Number flow**: contoarele „+42 / −17 cuvinte” la schimbarea perechii.
- **Toast**: „Versiunea a fost restaurată” cu „Anulează” (restaurează versiunea creată automat).
- **Empty**: istoric gol.
- **Skeleton**: încărcarea listei și a diff-ului.
- **Hover card**: la hover pe badge-ul „Sugestie AI”, lista sugestiilor acceptate în acea versiune.

## Stări

- **Gol:** document nou, fără versiuni salvate. Empty: „Nicio versiune salvată încă” / „Ciorna se salvează automat. Salvează o versiune când vrei un punct la care să te poți întoarce.” + „Salvează versiunea”.
- **Încărcare:** 5 rânduri Skeleton în listă. La deschiderea unei versiuni, foaia arată Skeleton până se încarcă textul.
- **Ciornă = ultima versiune:** rândul „Ciornă curentă” nu apare, iar ultima versiune are badge „Curentă”.
- **Ciornă nesalvată:** rândul „Ciornă curentă · nesalvată” apare sus, cu „Compară” și „Salvează”.
- **Previzualizare:** banner info. Bara de formatare și scurtăturile de editare sunt dezactivate. Tastarea în foaie arată un Tooltip: „Restaurează versiunea pentru a o edita.”
- **Comparare fără diferențe:** „Versiunile sunt identice.” în banda de comparare, iar navigarea e ascunsă.
- **Comparare mare** (peste 500 de modificări): avertisment „Multe modificări: afișăm doar paragrafele schimbate.” + comutator „Arată tot documentul”.
- **Restaurare în curs:** butonul are Spinner. La final, Toast „Am restaurat versiunea din 28 oct., 09:15.” + „Anulează”.
- **Eroare la restaurare:** Alert destructive în banner: „Nu am putut restaura versiunea. Documentul a rămas neschimbat.” + „Încearcă din nou”.
- **Eroare la diff:** „Nu am putut compara aceste versiuni.” + „Deschide doar versiunea”.
- **Conflict:** restaurare pornită cât documentul se modifică în altă fereastră. Același Alert dialog de conflict ca în 05-editor.md.
- **Versiune de import cu OCR:** badge suplimentar „OCR” și Tooltip „Text obținut prin recunoaștere optică; poate conține greșeli.”

## Ecran îngust

- **≥ 1440 px:** totul e disponibil, inclusiv comparația alăturată.
- **1024–1439 px:** doar diff inline. Toggle-ul „Alăturat” e ascuns.
- **< 1024 px:** lista e în Sheet (dreapta) peste foaie. La selectarea unei versiuni, Sheet-ul se închide, iar bannerul are „Înapoi la istoric”.
- **< 768 px:** lista e Drawer de jos. Banda de comparare se strânge pe două rânduri (Select-urile unul sub altul), iar contoarele trec în bara de navigare flotantă. Restaurarea rămâne în banner, ca buton pe toată lățimea.

## Microcopy (RO)

- **Tab:** „Istoric”. **Filtru:** „Toate originile”, „Manual”, „Import”, „Sugestie AI”, „Generare”.
- **Ciornă:** „Ciornă curentă” · „nesalvată” · „Modificări de la 14:02”.
- **Grupuri:** „Azi”, „Ieri”, „28 oct. 2026”.
- **Badge-uri:** „Curentă”, „Import”, „Manual”, „Sugestie AI”, „Generare”, „OCR”.
- **Note automate:** „Importat din {fișier}”, „Acceptate {n} sugestii AI”, „Generat din șablonul {nume}”, „Restaurat din versiunea din {dată}”, „Salvată automat înainte de restaurare”.
- **Fără notă:** „fără notă · Adaugă notă”.
- **Acțiuni:** „Salvează versiunea”, „Compară cu actuala”, „Compară”, „Restaurează această versiune”, „Editează nota”, „Copiază ca document nou”, „Înapoi la istoric”.
- **Banner previzualizare:** „Vizualizezi versiunea din {dată}, {oră}. Documentul nu poate fi editat aici.”
- **Banda de comparare:** „Compari”, „+{n} cuvinte”, „−{n} cuvinte”, „{n} modificări”, „Modificarea {i} din {n}”, „Inline”, „Alăturat”, „Versiunile sunt identice.”
- **Confirmare restaurare:** titlu „Restaurezi versiunea din {dată}, {oră}?”; text „Documentul va reveni la această versiune. Starea actuală se salvează automat ca versiune nouă, deci o poți recupera oricând.”; butoane „Restaurează” / „Renunță”.
- **Toast:** „Am restaurat versiunea din {dată}, {oră}.” + „Anulează”.
- **Gol:** „Nicio versiune salvată încă” / „Ciorna se salvează automat. Salvează o versiune când vrei un punct la care să te poți întoarce.”
- **Tooltip în previzualizare:** „Restaurează versiunea pentru a o edita.”

## Întrebări deschise

- Acceptarea unei sugestii AI creează automat o versiune (origine „Sugestie AI”) la fiecare acceptare, sau una singură la final („Acceptă toate”) ori la următoarea salvare? Recomandarea: o versiune la prima acceptare dintr-o sesiune de revizuire, actualizată până la salvarea manuală.
- Păstrăm versiunile la infinit sau introducem o curățare (de ex. comasarea versiunilor AI mai vechi de 90 de zile)?
- Comparația alăturată merită efortul pentru V1, sau ajunge diff-ul inline?
- Diff-ul trebuie să arate și schimbările din tabele celulă cu celulă, sau ajunge marcarea tabelului ca „modificat”?
- „Copiază ca document nou” e util (ramificare) sau complică modelul?
- Afișăm la fiecare versiune și data de referință a analizei asociate, dacă există?
