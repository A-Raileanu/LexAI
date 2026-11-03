# 03 — Acasă / Proiecte

**Rută / context:** `/` · prima pagină după autentificarea cu PIN. Shell-ul aplicației (descris inițial aici ca sidebar + zona principală) e înlocuit de bara de sus din `17-shell-fara-sidebar.md`. · **Scop:** punctul de pornire zilnic: vezi toate dosarele clienților (proiectele), reiei rapid lucrul și pornești un proiect nou. · **Ce face utilizatorul aici:** caută și filtrează proiecte, deschide un proiect, redeschide un document recent, creează / redenumește / arhivează proiecte, urmărește dintr-o privire consumul abonamentului Claude.

## Referințe analizate (≥10)

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Jasper | [ecran](https://mobbin.com/screens/df7e838c-7b55-42bd-bc44-937643112f63) | Tabel simplu de proiecte (Nume, Ultima modificare, meniu ⋯), căutarea și „Create project” pe același rând, titlu + subtitlu scurt, breadcrumb discret. | Tab-urile „Shared with me / All” (aplicația are un singur utilizator); cardurile promoționale din sidebar. |
| 2 | Vercel | [ecran](https://mobbin.com/screens/a2712ef7-4a59-4778-9f85-12a6abb7a008) | Căutare + filtru + comutator grilă/listă + buton primar cu dropdown („Add New…”); un mic panou „Usage” cu bară de progres lângă lista de proiecte. | Grila densă de carduri cu multe metadate tehnice; sidebarul foarte lung. |
| 3 | Height | [ecran](https://mobbin.com/screens/63a8a72a-c47e-4f1d-90b4-5cd7b99ec799) | Crearea inline a unui rând nou („New project”) direct în tabel; tabel minimal, fără chenare grele. | Sidebarul întunecat contrastant și panoul de chat gol din dreapta. |
| 4 | User Interviews | [ecran](https://mobbin.com/screens/3c4bbda7-7ca2-4447-bf1b-9c8bd267adb7) | Tab-uri de stare cu numărători în etichetă („All (4)”, „Draft (2)”), folosite la noi pentru „Active / Arhivate”. | Carduri mari per proiect, cu butoanele Edit / Duplicate / Delete mereu vizibile. |
| 5 | Coda | [ecran](https://mobbin.com/screens/ba6f5461-ff84-4795-b8f6-a11d5a7526a9) | Antet cu două acțiuni clare (secundară + primară „Blank doc”); listă „Recent” cu context („Last viewed by you today at 6:16 PM”) și sortare. | Bannerul ilustrat cu resurse de marketing deasupra listei. |
| 6 | Clay | [ecran](https://mobbin.com/screens/d4de1240-1399-4a2a-8599-bc6f4719c500) | Căutarea și „+ New” grupate în dreapta listei; filtre compacte („Owner: All”, „Resource type”); stea pentru favorite. | Prompt AI și patru carduri de acțiuni pe pagina principală: zgomot pentru un utilizator care știe ce vrea. |
| 7 | Descript | [ecran](https://mobbin.com/screens/ea11b53d-998a-4a3d-b750-f5f289253833) | Fundal cald, aproape alb; tabel cu coloana „Last viewed” sortabilă; butoanele primare în dreapta-sus; comutator grilă/listă. | Coloanele „Owner” și „Workspace”, redundante pentru un singur utilizator. |
| 8 | Elicit | [ecran](https://mobbin.com/screens/85bf0252-6812-4038-bb56-3071de96b776) | Conținut centrat, cu lățime maximă; rândul de „creare” deasupra listei recente; listă foarte compactă (titlu · tip · oră). | Cardurile dezactivate cu „UPGRADE”/„PRO”. |
| 9 | Confluence | [ecran](https://mobbin.com/screens/7f6ed960-bd61-4542-9b88-526400627094) | Text relativ de activitate pe fiecare rând („You visited 10 minutes ago”), filtrare după titlu, chips „All / Worked on”. | Iconițele emoji colorate și densitatea vizuală a sidebarului. |
| 10 | GitBook | [ecran](https://mobbin.com/screens/494fd951-b2fc-46c6-8fae-b243a0e44c54) | Dark mode reușit (gri închis, borduri fine); lista „Recents” cu cale „spațiu / pagină” și „Last edited 8m ago”. | Secțiunile „Dive deeper” / integrări, adică marketing în aplicație. |
| 11 | Linear | [ecran](https://mobbin.com/screens/3af45bee-f669-4dc7-afaf-e3fb099161f9) | Stare goală sobră: ilustrație monocromă mică, o frază care explică ce e un proiect, buton primar cu scurtătura afișată (`N` apoi `P`). | Nimic major; este stilul-țintă. |
| 12 | Plane | [ecran](https://mobbin.com/screens/784636a9-ff00-4a9b-a9b7-3c95a9169ab5) | „Start your first project” ca CTA unic; toast de confirmare discret în colț („Project deleted successfully”). | Textul explicativ prea lung din starea goală. |
| 13 | Obvious | [ecran](https://mobbin.com/screens/bbc85fe0-d486-459d-b838-e79e1ce3d4a3) | Butonul „Show Archived” lângă filtru (arhivarea ca vizualizare, nu ca ștergere); „New Project” persistent în antet. | Ilustrația colorată foarte mare. |
| 14 | Hume AI | [ecran](https://mobbin.com/screens/0d3d06a9-19fd-4bff-abf1-a6ec26788d1d) | Primul proiect pornit din trei carduri („Blank project”, „Import document”, „Generate…”), adaptate la noi ca: proiect gol / încarcă un document / redactează un document. | Containerul mare gol de sub carduri, care dublează CTA-ul. |
| 15 | Framer | [ecran](https://mobbin.com/screens/b80913d6-8c26-41dd-a04d-9ead34de9c47) | Sidebar minimal cu „All” și „Archive”; stare goală cu un singur buton. | Contrastul prea slab al textului de ajutor. |
| 16 | Airtable | [ecran](https://mobbin.com/screens/6919dfed-6a2f-4b74-9bd4-35a566829f82) | Gruparea elementelor recente pe intervale („Today”, „Past 7 days”). | Iconițele mari colorate pe fiecare card. |

## Tipare comune

- **Shell cu sidebar deschis la culoare și zonă de conținut albă**, adesea „inset” (panou cu colțuri rotunjite pe fundal gri): Linear, Obvious, Plane, Descript, Hume AI, Strut. Sidebarul conține 3–6 destinații, căutarea (⌘K) și, jos, contul și consumul.
- **Lista de proiecte ca tabel compact**, nu ca grilă de carduri: Jasper, Height, Descript, Clay, Confluence. Rânduri de ~40 px, borduri de 1 px, meniu ⋯ la final de rând.
- **Bara de control deasupra tabelului:** căutare + filtre/tab-uri de stare + sortare la stânga, acțiunea primară la dreapta (Jasper, Vercel, Clay, Obvious).
- **Timp relativ** („acum 5 min”, „ieri”) în loc de date absolute pentru activitate (Confluence, GitBook, Coda, Jasper).
- **Elementele recente** fie ca bandă separată deasupra listei (Coda, GitBook, Elicit), fie ca vizualizare dedicată (Zoom, Loop, Figma).
- **Arhivarea ca filtru sau vizualizare** („Show Archived”, „Archive” în sidebar), nu ca ștergere (Obvious, Framer, User Interviews).
- **Starea goală** are o ilustrație mică monocromă, un titlu de 3–5 cuvinte, o frază și un singur CTA (Linear, Plane, Framer, Obvious), uneori 2–3 moduri de pornire (Hume AI).
- **Consumul planului afișat discret în sidebar** (Vercel, Gumloop, Asana, Braintrust), cu link către pagina detaliată.

## Decizia de layout

```
┌────────────────────┬─────────────────────────────────────────────────────────────────┐
│ ◆ LexAI            │  Proiecte                                       [ + Proiect nou ] │
│ [⌕ Caută…     ⌘K]  │  12 proiecte active                                              │
│                    │                                                                  │
│ ▣ Proiecte         │  Continuă de unde ai rămas                                        │
│ ◔ Utilizare        │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐ │
│ ⚙ Setări           │  │ ▤ Cerere de   │ │ ▤ Notificare │ │ ▤ Act adițio-│ │ ▤ …     │ │
│                    │  │   chemare…    │ │   reziliere  │ │   nal nr. 2  │ │         │ │
│ FIXATE             │  │ Ionescu SRL   │ │ Pop c. Stan  │ │ Alfa Constr. │ │         │ │
│ · Ionescu SRL      │  │ acum 5 min    │ │ acum 2 h     │ │ ieri         │ │         │ │
│ · Pop c. Stan      │  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘ │
│                    │                                                                  │
│                    │  [Active 12 | Arhivate 3]  [⌕ Caută proiect sau client]  [Sortare ▾]│
│                    │  ┌──────────────────────────────────────────────────────────────┐│
│                    │  │ Nume                   Client        Activitate   Doc.  Analize ⋯││
│                    │  │ Litigiu creanță        Ionescu SRL   acum 5 min    8   ● 2    ⋯ ││
│                    │  │ Divorț — partaj        Pop Maria     acum 2 h      5   —      ⋯ ││
│                    │  │ Contract furnizare     Alfa Constr.  ieri         12   ● 1    ⋯ ││
│                    │  │ + Proiect nou                                                ││
│ ────────────────── │  └──────────────────────────────────────────────────────────────┘│
│ Limită 5 h  ▓▓░ 34%│                                                                  │
│ Limită 7 z  ▓░░ 12%│                                                                  │
│ >_ Terminal        │                                                                  │
└────────────────────┴─────────────────────────────────────────────────────────────────┘
```

**Zone și ierarhie**

1. ~~**Sidebar**~~ — *înlocuit de bara globală din `17-shell-fara-sidebar.md` (navigare, căutare, chip de consum, meniul sesiunii; fixatele trec în comutatorul de proiect, în ⌘K și primele în listă).* Varianta inițială: **Sidebar (240 px, se poate restrânge la iconițe de 56 px).** Sus: logo + butonul de căutare care deschide paleta ⌘K (vezi `16-command-palette.md`). Navigare principală: **Proiecte, Utilizare, Setări**. Secțiunea „Fixate”, cu maximum 5 proiecte fixate manual. Jos: două micro-bare de consum (5 h / 7 zile), cu detalii în Hover card și link către `/utilizare`, apoi butonul „Terminal”, care deschide panoul CLI în partea de jos a shell-ului.
2. **Antetul paginii.** Titlul „Proiecte” (20–24 px, semibold), un subtitlu cu numărul de proiecte active și, în dreapta, butonul primar **„Proiect nou”**. Este singurul buton plin de pe pagină.
3. **„Continuă de unde ai rămas”** (secundar): 4–6 documente recente ca Item-uri compacte (titlu document, proiect/client, timp relativ), pe un singur rând cu scroll orizontal. Un click deschide documentul direct în editor. Banda dispare dacă nu există documente.
4. **Lista de proiecte** (primar): Data table cu coloanele *Nume*, *Client*, *Ultima activitate*, *Documente*, *Analize deschise* (Badge cu număr; „—” dacă nu există) și ⋯. Un click pe rând deschide `/proiecte/[id]`. Meniul ⋯ și click-dreapta (Context menu) oferă: Deschide, Redenumește, Fixează (proiectele fixate stau primele în listă, cu `IconPin`), Arhivează. Ultimul rând, „+ Proiect nou”, permite crearea inline (model Height).
5. **Bara de control:** Toggle group „Active / Arhivate” cu numărători, căutare după nume sau client (instant, fără diacritice obligatorii: „ses” găsește „șes”) și sortare (Ultima activitate ↓ implicit, Nume A–Z, Client, Data creării).

**Creare / redenumire.** „Proiect nou” deschide un Dialog mic cu *Nume proiect* (obligatoriu), *Client* (Combobox cu clienții existenți plus opțiunea de a crea unul nou) și *Descriere* (opțională). După creare, utilizatorul ajunge direct pe pagina proiectului. Redenumirea se face inline în celula Nume (Enter salvează, Esc anulează). Arhivarea cere confirmare printr-un Alert dialog și oferă „Anulează” în toast timp de 5 s.

## Componente HextaUI

- **Sidebar**: shell-ul global (navigare, fixate, consum, terminal); se restrânge.
- **Kbd + Hotkey**: `⌘K` pe butonul de căutare și scurtătura pentru „Proiect nou”.
- **Button**: „Proiect nou” (primar), acțiuni secundare (ghost).
- **Data table**: lista de proiecte cu sortare pe coloane și rânduri clicabile.
- **Toggle group**: „Active / Arhivate” cu numărători.
- **Input group**: căutare cu iconiță și buton de golire.
- **Select**: sortarea.
- **Dropdown menu** și **Context menu**: acțiunile pe rând (⋯ și click dreapta).
- **Badge**: numărul de analize deschise (culoarea după cea mai gravă constatare: roșu = erori, chihlimbar = discutabile / de verificat).
- **Item**: cardurile din „Continuă de unde ai rămas”.
- **Scroll fade**: marginile benzii de documente recente când aceasta are scroll orizontal.
- **Dialog** + **Field** + **Label** + **Input** + **Combobox** + **Textarea**: crearea unui proiect.
- **Alert dialog**: confirmarea arhivării.
- **Toast**: „Proiect creat”, „Proiect arhivat · Anulează”.
- **Empty**: starea fără proiecte și starea „nicio potrivire”.
- **Skeleton**: încărcarea tabelului și a benzii de recente.
- **Progress** + **Hover card**: micro-barele de consum din sidebar, cu detalii (procent, ora resetării).
- **Tooltip**: iconițele din sidebarul restrâns.
- **Hairline**: separatoarele fine dintre zonele sidebarului.

## Stări

- **Gol (primul proiect):** fără banda de recente și fără tabel. Centrat: iconiță monocromă (dosar), titlul „Creează primul proiect”, o frază, apoi trei carduri de pornire (model Hume AI): **Proiect gol**, **Pornește de la un document** (creează proiectul și deschide încărcarea) și **Redactează un document nou** (creează proiectul și deschide wizardul). Sub carduri apare un link discret „Ce este un proiect?” (Popover).
- **Gol (Arhivate):** „Niciun proiect arhivat” + o frază care explică faptul că proiectele arhivate rămân căutabile.
- **Nicio potrivire la căutare:** „Niciun proiect pentru „{termen}”” + butonul „Golește căutarea” + link „Caută în documente (⌘K)”.
- **Încărcare:** 6 rânduri Skeleton cu aceeași înălțime ca rândurile reale; banda de recente cu 4 Skeleton-uri. Fără spinner pe toată pagina.
- **Eroare (baza de date nu răspunde):** Alert inline deasupra tabelului, „Nu am putut încărca proiectele.”, cu butonul „Reîncearcă”; sidebarul rămâne funcțional.
- **Limită (abonament):** micro-barele din sidebar devin chihlimbar la ≥ 80 % și roșii la ≥ 95 %. Pe această pagină nu apare banner, decât dacă limita este atinsă (atunci apare un Alert subțire în antet, cu ora resetării).

## Ecran îngust

- **< 1024 px:** sidebarul se restrânge la iconițe (cu Tooltip-uri), iar micro-barele de consum devin un singur indicator circular.
- **< 768 px:** sidebarul devine Sheet deschis din butonul ☰ din antet; „Proiect nou” devine buton-iconiță „+”.
- Tabelul devine o listă de Item-uri pe două rânduri: **Nume** (semibold) / *Client · acum 5 min · 8 doc.*, cu Badge-ul de analize aliniat la dreapta.
- Toggle group, căutarea și sortarea se pun pe două rânduri: căutarea pe toată lățimea, iar dedesubt „Active / Arhivate” și sortarea.
- Banda „Continuă de unde ai rămas” păstrează scrollul orizontal cu Scroll fade; cardurile au 75 % din lățime.

## Microcopy (RO)

- Titlu pagină: **Proiecte** · subtitlu: „12 proiecte active”.
- Buton primar: **Proiect nou** · rând inline: „+ Proiect nou”.
- Secțiune: **Continuă de unde ai rămas**.
- Coloane: **Nume · Client · Ultima activitate · Documente · Analize deschise**.
- Filtre: **Active** · **Arhivate** · placeholder căutare: „Caută proiect sau client…”.
- Sortare: „Ultima activitate” · „Nume (A–Z)” · „Client” · „Data creării”.
- Meniu rând: **Deschide** · **Redenumește** · **Fixează în bară** / **Anulează fixarea** · **Arhivează** · (în Arhivate) **Restaurează**.
- Dialog creare: titlu „Proiect nou”; câmpuri „Nume proiect” (ex.: „Litigiu recuperare creanță”), „Client”, „Descriere (opțional)”; butoane **Creează proiectul** / **Renunță**.
- Confirmare arhivare: „Arhivezi proiectul „{nume}”?” · „Documentele și analizele rămân salvate. Îl poți restaura oricând din Arhivate.” · **Arhivează** / **Renunță**.
- Toast: „Proiect creat.” · „Proiect arhivat.” [**Anulează**] · „Proiect redenumit.”
- Stare goală: **Creează primul proiect** · „Un proiect grupează documentele, analizele și versiunile unui client sau ale unei cauze.” · carduri: „Proiect gol”, „Pornește de la un document”, „Redactează un document nou”.
- Nicio potrivire: „Niciun proiect pentru „{termen}”.” · **Golește căutarea**.
- Eroare: „Nu am putut încărca proiectele.” · **Reîncearcă**.
- Sidebar consum: „Limită 5 h · 34 %” · Hover card: „Se resetează la 17:40 (în 2 h 13 min)”.
- Timp relativ: „acum câteva secunde”, „acum 5 min”, „acum 2 h”, „ieri, 14:32”, „3 nov.”

## Întrebări deschise

- Clientul este o entitate separată (cu date de contact, CUI/CNP) sau doar un text pe proiect? Răspunsul decide între un Combobox simplu și o pagină „Clienți” separată.
- Avem nevoie de o vizualizare grilă, sau tabelul este suficient? Recomandarea este doar tabel; grila nu aduce informație în plus pentru dosare juridice.
- Ștergerea definitivă a unui proiect este necesară, sau ajunge arhivarea? Dacă este necesară, o propunem doar din Arhivate, cu confirmare tastată.
- „Analize deschise” înseamnă analize cu constatări nerezolvate (erori / discutabile / de verificat) sau analize încă în curs? Propunerea: constatări nerezolvate, iar analizele în curs primesc un Spinner separat.
- Câte documente recente afișăm și de unde (doar deschise, sau și generate de agent)?
- Ce scurtătură folosim pentru „Proiect nou” fără conflict cu browserul (⌘N este rezervat)? Propunerea: secvența `N` apoi `P`, ca în Linear.
