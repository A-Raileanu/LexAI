# 17 — Shell fără sidebar (bară de sus)

**Rută / context:** shell-ul global al grupului `(app)`. Se aplică pe `/`, `/proiecte/[id]`, `/proiecte/[id]/nou`, `/utilizare`, `/setari` și `/setari/terminal`. Editorul (`/proiecte/[id]/documente/[docId]`) nu are bara globală, ci doar antetul propriu. · **Scop:** renunțăm complet la sidebarul din stânga. Conținutul ocupă toată lățimea, iar navigarea, căutarea, consumul și sesiunea trec într-o bară de sus subțire. · **Ce face utilizatorul aici:** schimbă secțiunea (Proiecte / Utilizare / Setări), deschide ⌘K, vede dintr-o privire limitele abonamentului, schimbă tema, blochează aplicația și sare între proiecte.

> Documentul **înlocuiește** secțiunea „Structura aplicației” din `00-directie.md`, sidebarul din `03-acasa-proiecte.md` (zona 1) și mențiunile „Fixate în sidebar” din `04`, `05` și `16`. Restul direcției vizuale rămâne valabil.

## Referințe analizate (≥10)

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | fal | [ecran](https://mobbin.com/screens/3786699a-7b92-4f81-9545-737fd5edfcff) | Dreapta barei: căutare-buton „Search anything ⌘K”, chip „Credits: $6.64”, apoi avatar. Meniul contului are tema ca segment cu trei iconițe și „Sign Out” la final. | Două rânduri (breadcrumb + tab-uri) și banda de anunț de deasupra. Pierd ~90 px. |
| 2 | fal (Setări) | [ecran](https://mobbin.com/screens/dffa91ed-9478-41ab-a199-2c9dd7a2741c) | Variantă pe un singur rând: logo, linkuri cu iconiță, iar în dreapta lupă, sold și avatar. Activul e subliniat pe marginea de jos a barei. | Dropdown-uri pe aproape toate linkurile principale. |
| 3 | Laravel Cloud | [ecran](https://mobbin.com/screens/a7e6e8fb-309d-4fdd-b3c3-8658be5a7f52) | Tab-uri text sobre (Overview / Applications / Usage / Settings) cu subliniere neagră de 2 px. Căutare cu `⌘K` în dreapta și meniu de cont scurt (Account, Docs, Help, Sign out). | Rândul separat doar pentru tab-uri. La noi, trei destinații încap lângă logo. |
| 4 | Modal | [ecran](https://mobbin.com/screens/8f4d4987-11b0-48e7-a7b7-1924f6533c33) | Consumul în bară ca text discret („Credits Remaining: $5.00 ▾”). Titlul paginii stă în conținut, nu în bară. | Banda verde de promovare de sus. |
| 5 | Webflow | [ecran](https://mobbin.com/screens/e6ef30e7-d8d2-450f-b039-1fd1ccc0bdd3) | Logo + 2–3 linkuri principale în stânga, contul în dreapta. Bara e albă, cu hairline jos și fără umbră. | Al doilea meniu vertical în pagină (sidebar mascat). |
| 6 | Aboard | [ecran](https://mobbin.com/screens/661dc73d-197b-4b9a-b201-426e54f271b1) | Bară de 48 px cu toată navigarea pe un rând. Meniul de cont are „Sign out” separat, în roșu. | Emoji, culorile vii ale cardurilor, linkurile prea multe (7 + ☰). |
| 7 | Aboard (editor contract) | [ecran](https://mobbin.com/screens/75473881-1d30-480d-a0a1-c0dc55227989) | Un contract editat pe toată lățimea, cu titlul în stânga și ieșirea (✕) în dreapta. | Bara globală păstrată deasupra antetului editorului: două bări, spațiu pierdut. De aceea editorul nostru n-o are. |
| 8 | Preply | [ecran](https://mobbin.com/screens/337a34eb-8727-45f0-9625-5337db9527e7) | Meniul contului repetă navigarea principală. Același conținut îl folosim în foaia de pe ecran îngust. | Butoanele comerciale („Subscribe”, „Get $50 credit”) în bară. |
| 9 | Deel | [ecran](https://mobbin.com/screens/6bd4989c-7a50-413e-be7e-e955b2394a29) | Comutator de context lângă logo, cu listă, bifă pe elementul curent și acțiuni de creare la final. Modelul comutatorului nostru de proiect. | Gradientul de fundal, linkurile-pastilă cu iconițe colorate, „More ▾”. |
| 10 | Xero | [ecran](https://mobbin.com/screens/67bcb863-a3d4-4cf1-acab-c702e4c57129) | Secțiunea „Favorite reports ★” în dropdown: elementele fixate trăiesc într-un meniu, nu într-o coloană permanentă. | Bara albastră plină și mega-meniul. |
| 11 | Vercel | [ecran](https://mobbin.com/screens/63496168-dbae-470d-9039-6883d8d1e479) | „All Projects ⇅” deschide un Popover cu câmpul „Find Project… Esc”, lista de proiecte și „+ Create Project”. Exact comutatorul de proiect. | Sidebarul lung din stânga. |
| 12 | Hume AI | [ecran](https://mobbin.com/screens/2863076b-5a75-441b-93b5-1dbce3f4b788) | Indicatori de consum compacți, cu cifre tabulare și iconiță mică („10k”, „5.0”), aliniați dreapta lângă clopoțel. | Indicatorii fără etichetă: noi scriem mereu „5h” / „7z”. |
| 13 | Evernote | [ecran](https://mobbin.com/screens/4e834bda-1722-4d13-b772-84732cb5a868) | Editorul fără sidebar: antetul începe cu un control mic, apoi „My Notebook › Meeting Notes”, iar foaia ocupă tot restul. | Butonul albastru „Share” prea dominant. |
| 14 | Microsoft Copilot (Pages) | [ecran](https://mobbin.com/screens/d1bd2a08-9870-43fe-b306-95f06379dd19) | Antet de document minimal: control de ieșire, titlu, apoi acțiunile text-plus-iconiță în dreapta. | Șina de iconițe din stânga, care rămâne un sidebar. |
| 15 | Dovetail | [ecran](https://mobbin.com/screens/edb33f71-f658-437a-a451-891efdfdcd17) | Un singur rând: context stânga, tab-uri centrate, acțiuni (Share, +, ⋯) dreapta. Documentul are tot ecranul. | ☰ în stânga, care sugerează un sertar ascuns (sidebarul revine pe ușa din spate). |
| 16 | Plane | [ecran](https://mobbin.com/screens/a9bf6376-1b3b-4efe-99f2-c9deb2db1462) | Breadcrumb-ul din antetul documentului are `⌄` pe ultimul segment pentru comutare rapidă. | Sidebarul dublu (șină + arbore). |
| 17 | Cloudflare | [ecran](https://mobbin.com/screens/e1e2c36e-8f06-43d9-a5ff-25e8f3014ce1) | Ierarhia („Workers & Pages › asm”) stă deasupra conținutului, cu tab-urile paginii sub ea. Bara globală rămâne aceeași pe toate paginile. | Sidebarul cu 30 de intrări. |
| 18 | ClickUp (Docs) | [ecran](https://mobbin.com/screens/976fedf7-a4b8-48b8-8188-107392be95d3) | Căutarea `⌘K` ca buton-câmp discret, iar documentul are breadcrumb scurt („Docs / Project Overview”). | Șina neagră de iconițe și a doua bară globală deasupra editorului. |

## Tipare comune

- **Un singur rând, 44–52 px, alb, cu hairline jos și fără umbră** (fal Setări, Aboard, Webflow, Dovetail). Al doilea rând de tab-uri apare doar când sunt peste 4 destinații (Laravel, fal).
- **Stânga = unde ești, dreapta = unelte.** Logo, apoi navigarea sau contextul în stânga. Căutare, consum și cont în dreapta (fal, Modal, Laravel, Hume).
- **Activul e subliniat pe marginea de jos a barei** (2 px, culoarea textului), nu pastilă colorată (Laravel, fal, Preply).
- **Căutarea e un buton care arată ca un câmp, cu `⌘K` afișat** (fal, Laravel, ClickUp).
- **Consumul e un chip mic, numeric, clicabil** (fal „Credits”, Modal, Hume, Whop).
- **Contul e un singur meniu** cu setările, tema și ieșirea (separată, la final) (fal, Laravel, Aboard, Webflow).
- **Elementele fixate și comutarea de context stau într-un Popover/Dropdown cu căutare**, nu într-o coloană permanentă (Vercel, Deel, Xero).
- **Editorul de document nu are bara globală.** Antetul lui începe cu un mic control de ieșire/acasă și cu breadcrumb-ul scurt (Evernote, Copilot, Plane, Aboard ca anti-model).
- **Titlul paginii stă în conținut**, iar bara globală nu se schimbă de la o pagină la alta (Modal, Cloudflare, Laravel).

## Decizia de layout

### Bara globală (toate paginile în afară de editor)

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ LexAI    Proiecte   Utilizare   Setări          [⌕ Caută…        ⌘K]  [● 5h 11% · 7z 18%]  (◎) │ 48 px
│            ════════                                                                         │ ← activ: bară 2 px
└────────────────────────────────────────────────────────────────────────────────────────────┘
   ┌─ max-w-6xl, centrat ───────────────────────────────────────────────┐
   │ Proiecte ›                                     ← PageCrumbs (13 px) │
   │ Litigiu recuperare creanță ⇅            [Încarcă] [Document nou]    │ ← PageTitle
   │ …                                                                   │
```

- **Container:** `<header>` sticky `top-0 z-30 h-12` (48 px, aceeași înălțime ca antetul editorului), `bg-background`, `border-b` hairline, fără umbră și fără blur. Conținutul barei ocupă toată lățimea ferestrei (`px-3 sm:px-4`), nu `max-w-6xl`. Variabila `--app-bar-h: 3rem` se definește în layout. Orice element sticky din pagini (de ex. `SettingsNav`) folosește `top-[calc(var(--app-bar-h)+1rem)]`, iar pragul de detectare din `SettingsNav` (140 px) se recalculează față de ea.
- **Fundal:** dispare „panoul alb pe gri” al `SidebarInset`. Bara și pagina folosesc amândouă `bg-background`, separate doar de hairline.
- **Stânga.**
  - `Brand` (romb + „LexAI”) este un link spre `/`. Are `aria-label="LexAI — Proiecte"` și hover discret (`rounded-md hover:bg-muted px-1.5`).
  - La `ms-6` urmează **navigarea principală**: **Proiecte**, **Utilizare**, **Setări**. Sunt trei linkuri text de 14 px, cu înălțime `h-12` și padding `px-2.5`.
    - Starea normală e `text-muted-foreground`, cu `hover:text-foreground`.
    - Activul are `text-foreground font-medium` și o bară de 2 px `bg-foreground` lipită de marginea de jos (peste hairline).
    - Regulile de activ rămân ca în `NAV` de azi: Proiecte = `/` sau `/proiecte/*`; Utilizare = `/utilizare`; Setări = `/setari` și `/setari/*` (Terminalul e o subpagină a Setărilor).
    - Fără iconițe în linkuri: trei cuvinte se citesc mai repede.
- **Dreapta** (`ms-auto flex items-center gap-2`), în ordine:
  1. **Căutare.** Un Button `variant="outline" size="sm"` care arată ca un câmp: `w-60 justify-start text-muted-foreground`, `IconSearch`, „Caută…”, `Kbd` „⌘K” la capăt. Click → `openCommandPalette()`.
  2. **Chipul de consum.** `●  5h 11% · 7z 18%`. Detalii la „Chipul de consum”.
  3. **Meniul sesiunii.** Button ghost `icon-sm` cu `IconUserCircle` și Tooltip „Sesiune și temă”. Deschide `DropdownMenu` (`align="end"`, `w-56`):
     ```
     Terminal Claude          >_      → /setari/terminal
     ──────────────
     TEMĂ
     ○ Ca sistemul
     ● Luminoasă
     ○ Întunecată
     ──────────────
     ⊘ Blochează aplicația           (text-destructive)
     ```
     Setările nu se repetă aici, fiindcă sunt în navigare. Terminalul rămâne aici ca scurtătură, fiind folosit rar.
- **Fără titlu de pagină și fără breadcrumb în bară.** Bara e identică pe toate paginile. Locația se citește din linkul activ și din `PageCrumbs`.

### `PageCrumbs` (înlocuiește `TopBar`)

`TopBar` și `SidebarTrigger` dispar. Paginile primesc `PageCrumbs`, randat în containerul paginii, deasupra `PageTitle`, cu `mb-1.5 text-[13px] text-muted-foreground`. Arată **doar strămoșii**, ca linkuri, cu separator `›`. Pagina curentă intră în listă ca `BreadcrumbPage` vizibil doar pentru cititoarele de ecran (`sr-only`), fiindcă titlul `h1` e chiar dedesubt.

| Rută | PageCrumbs | Titlu (`h1`) |
|---|---|---|
| `/` | — (nimic) | Proiecte |
| `/proiecte/[id]` | Proiecte › | {proiect} + comutator ⇅ |
| `/proiecte/[id]/nou` | Proiecte › {proiect} › | Document nou |
| `/utilizare` | — | Utilizare |
| `/setari` | — | Setări |
| `/setari/terminal` | Setări › | Terminal Claude |

### Proiectele fixate și comutatorul de proiect

Sidebarul dispare, deci și grupul „Fixate”. Proiectele fixate apar în patru locuri:

1. **Comutatorul de proiect.** Lângă `h1` pe `/proiecte/[id]` stă un Button ghost `icon-xs` cu `IconSelector` (⇅) și `aria-label="Schimbă proiectul"`. Deschide un `Popover` (`align="start"`, `w-80`) care conține un `Command` (după modelul Vercel):
   ```
   ⌕ Caută proiect…                         Esc
   FIXATE
   ⚲ Litigiu recuperare creanță              ✓
   ⚲ Divorț — partaj
   RECENTE
   ▣ Contract închiriere Popescu
   ▣ …                                   (max. 7, după ultima activitate)
   ─────────────────────────────────────────
   ▦ Toate proiectele
   + Proiect nou                           N P
   ```
   Elementul curent are `IconCheck`. Enter navighează și închide popover-ul.
2. **Paleta ⌘K, starea fără interogare.** Grupul **Fixate** stă deasupra „Recente”, cu maximum 5 elemente și `IconPin` (completare la `16-command-palette.md`).
3. **Pagina `/`.** Proiectele fixate sunt primele în listă, marcate cu `IconPin`.
4. **Foaia de pe ecran îngust** (mai jos).

### Chipul de consum

- Este un `HoverCardTrigger` randat ca `Link` spre `/utilizare`: `h-7 rounded-full px-2.5 text-xs tabular-nums inset-ring-(length:--hairline) inset-ring-border hover:bg-muted`.
- Conținut: punct de 6 px colorat după **cel mai rău** ton dintre cele două ferestre (`limitTone`: verde < 70 %, chihlimbar 70–90 %, roșu ≥ 90 % sau „respins”), apoi `5h 11% · 7z 18%`. Procentul unei ferestre de peste 70 % ia culoarea tonului (`text-v-discutabil` / `text-v-eroare`).
- La hover sau focus apare conținutul existent al `HoverCardContent` din `SidebarLimits`, cu `side="bottom" align="end"`: ferestrele, ora resetării și „Actualizat la…”.
- **Limită atinsă (`rejected`):** chipul devine `● Limită atinsă · reset 14:30`, cu text și punct roșu.
- **Fără date** (înainte de primul job AI): chipul nu se afișează. Linkul „Utilizare” rămâne.
- Implementare: `SidebarLimits` se redenumește `UsageChip`. Componenta `Bar` rămâne și e folosită în foaia de pe ecran îngust.

### Editorul (`/proiecte/[id]/documente/[docId]`)

Editorul **nu are bara globală**. Antetul propriu (48 px, `features/editor/header.tsx`) rămâne singura bară, ca editorul să ocupe maximum de spațiu.

```
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ │ Litigiu creanță / Contract de închiriere ✎   ● Ciornă salvată 14:32    [⟲ Versiuni] [✦ Analizează] [Export ▾] [⋯] │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Ce dispare:** `SidebarTrigger`, butonul `‹` (dublează segmentul proiectului) și segmentul „Proiecte” din breadcrumb.
- **Ce îl înlocuiește:**
  - **`◆`** este `Brand compact`, un link spre `/` în Button ghost `icon-sm`, cu Tooltip „Proiecte · G P” și `aria-label="LexAI — Proiecte"`.
  - Urmează un `Separator orientation="vertical" h-5`.
  - Breadcrumb-ul are două segmente: **{proiect}** (link spre `/proiecte/[id]`, `max-w-48 truncate`) / **titlul editabil** (comportamentul din `05-editor.md` rămâne).
  - Editorul nu are comutator de proiect. Schimbarea contextului se face cu ⌘K, ca să nu aglomerăm antetul.
- **Meniul `⋯` primește la final grupul „Aplicație”:**
  - `Caută…  ⌘K`;
  - `Temă ▸`, un `DropdownMenuSub` cu `RadioGroup`-ul celor trei teme;
  - `Blochează aplicația` (text destructiv).

  Astfel, nimic din fostul sidebar nu cere ieșirea din editor.
- Consumul nu apare în editor. Când o analiză e respinsă din cauza limitei, starea apare în pagină, ca până acum (`00`, principiul 4).
- `⌘B` se eliberează: era scurtătura sidebarului și intra în conflict cu **Bold** din editor.

### Ecran îngust

| Lățime | Bara globală |
|---|---|
| ≥ 1024 px | Totul ca mai sus. |
| 768–1023 px | Căutarea devine Button ghost `icon-sm` (`IconSearch`, Tooltip „Caută · ⌘K”). Chipul se compactează la `● 18%`, adică maximul celor două ferestre; HoverCard-ul rămâne. |
| < 768 px | `◆ LexAI` … `[⌕]` `[☰]`. Linkurile, chipul și meniul sesiunii se ascund. `☰` (`IconMenu2`, `aria-label="Meniu"`) deschide un **Sheet** pe dreapta. |

**Sheet-ul „Meniu”** (`side="right"`, `w-72`). Se închide la navigare și conține, în ordine:

1. Navigarea: Proiecte, Utilizare, Setări, Terminal Claude. Sunt `Item`-uri cu iconițe `IconFolder`, `IconChartBar`, `IconSettings`, `IconTerminal2` și `aria-current="page"` pe cel activ.
2. **FIXATE**: maximum 5 proiecte cu `IconPin`.
3. **LIMITE**: cele două `Bar` (5 h / 7 z), cu link spre `/utilizare`.
4. **TEMĂ**: `ToggleGroup` cu trei butoane, fiecare cu iconiță și etichetă (Sistem / Luminoasă / Întunecată).
5. `Blochează aplicația`: Button ghost cu text destructiv, lipit jos (`SheetFooter`).

**Editorul sub 640 px:**
- `◆` și segmentul proiectului se ascund. În locul lor apare un link `IconChevronLeft` spre proiect (`aria-label="Înapoi la {proiect}"`), urmat de titlu.
- Butoanele Versiuni / Analizează trec în `⋯`, ca în `05-editor.md`.

## Componente HextaUI (`apps/web/src/components/ui`)

| Componentă | Unde |
|---|---|
| `Button` (`ghost`, `outline`, `icon-sm`, `icon-xs`) + `buttonVariants` | căutare, meniul sesiunii, ☰, ◆ în editor, ⇅ |
| `Kbd` | „⌘K” în căutare; scurtăturile din Tooltip-uri și meniuri |
| `Tooltip` | toate butoanele doar-iconiță |
| `DropdownMenu` (+ `RadioGroup`, `RadioItem`, `Label`, `Separator`, `Sub`) | meniul sesiunii; grupul „Aplicație” din `⋯` în editor |
| `HoverCard` | detaliile chipului de consum |
| `Popover` + `Command` (`CommandInput`, `CommandGroup`, `CommandItem`) | comutatorul de proiect |
| `Breadcrumb` | `PageCrumbs`; antetul editorului |
| `Sheet` (`SheetContent`, `SheetHeader`, `SheetTitle`, `SheetBody`, `SheetFooter`) | meniul de pe ecran îngust |
| `Item` | rândurile de navigare din Sheet |
| `ToggleGroup` | tema în Sheet |
| `Separator` | separatorul vertical din antetul editorului |
| `Skeleton` | scheletul shell-ului |

**Nu folosim:**
- `Tabs`: au `role="tablist"` și sunt pentru panouri din pagină, nu pentru rute.
- `NavigationMenu`: nu avem submeniuri.
- `Menubar`.
- `Sidebar` / `SidebarProvider`: `components/ui/sidebar.tsx` și `app-sidebar.tsx` se șterg când nu mai au importuri.

**Iconuri Tabler (outline, 16 px):** `IconSearch`, `IconUserCircle`, `IconTerminal2`, `IconLock` (Blochează), `IconDeviceDesktop` / `IconSun` / `IconMoon`, `IconMenu2`, `IconSelector`, `IconPin`, `IconCheck`, `IconLayoutGrid`, `IconPlus`, `IconFolder`, `IconChartBar`, `IconSettings`, `IconChevronLeft`.

## Structura rutelor

Bara apare pe toate rutele în afară de editor. Excepția se rezolvă cu grupuri de rute, fără verificări de `pathname`, deci fără „flash”:

```
app/(app)/layout.tsx                    requireSession + CommandPalette + --app-bar-h (fără bară)
app/(app)/(pagini)/layout.tsx           <SkipLink/> <AppBar/> <main id="continut">{children}</main>
app/(app)/(pagini)/page.tsx, proiecte/[id]/page.tsx, proiecte/[id]/nou/, utilizare/, setari/…
app/(app)/(editor)/proiecte/[id]/documente/[docId]/page.tsx
app/(app)/(editor)/documente/[docId]/page.tsx   (redirecționarea scurtă)
```

`AppBar` (`components/app-shell/app-bar.tsx`, client) primește `pinned` și `limite` din layout-ul `(pagini)`, la fel ca `AppSidebar` azi.

## Tastatură

- **`⌘K` / `Ctrl K`** rămâne (paleta).
- **`G P` / `G U` / `G S`**: secvențe care duc la Proiecte / Utilizare / Setări. Sunt deja promise în `16-command-palette.md`, dar nu sunt implementate. Le implementăm acum, pentru că înlocuiesc accesul dintr-un clic al sidebarului și rămân valabile și în editor, unde bara lipsește.
  - Se ignoră când focusul e într-un `input`, `textarea` sau `contenteditable`.
  - Fereastra dintre taste e de 1 s.
  - Se afișează în Tooltip-uri și în paletă.
- **`⌘B` nu mai e folosit de shell.**
- Nu adăugăm alte scurtături.

## Accesibilitate

- **Repere:**
  - `<header>` (banner) conține `<nav aria-label="Principal">` cu lista celor trei linkuri.
  - Conținutul paginii e `<main id="continut" tabIndex={-1}>`.
  - `PageCrumbs` e `<nav aria-label="Locație">`.
  - În editor, antetul e `<header>`, iar zona de lucru e `<main id="continut">`.
- **`aria-current="page"`:**
  - pe linkul activ din navigare;
  - pe elementul activ din Sheet;
  - pe `BreadcrumbPage`.
  - În comutatorul de proiect, proiectul curent are `aria-selected` (implicit în `Command`) și textul „(curent)” `sr-only`.
- **Skip link:** primul element focusabil e „Sari la conținut” (`sr-only focus:not-sr-only`, poziționat peste bară, stânga sus) și duce la `#continut`. Există și în editor.
- **Ordinea focusului:**
  - Pagini: skip link → ◆ LexAI → Proiecte → Utilizare → Setări → Caută → chip consum → meniul sesiunii → `main`.
  - Editor: skip link → ◆ → proiect → titlu → salvare → Versiuni → Analizează → Export → ⋯ → bara de formatare.
- **Nume accesibile:**
  - Butoanele doar-iconiță au `aria-label` și Tooltip.
  - Chipul are `aria-label="Limite abonament: 5 ore 11%, 7 zile 18%. Deschide Utilizare"`.
  - Culoarea punctului e mereu dublată de cifre sau de textul „Limită atinsă”.
- **Focus vizibil:** inel standard HextaUI (`focus-visible:ring`). Pe linkurile de navigare inelul e în interior (`ring-inset`), ca să nu fie tăiat de marginea barei.
- **Sheet:** focusul e prins în foaie, iar `Esc` o închide. La închidere focusul revine pe `☰` (comportament Base UI).

## Stări

- **Încărcare (scheletul shell-ului).** Înlocuiește `ShellSkeleton` din `app/(app)/layout.tsx` și se mută în layout-ul `(pagini)`.
  ```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ ◇▭▭▭   ▭▭▭  ▭▭▭  ▭▭▭                        ▭▭▭▭▭▭▭▭▭▭   ▭▭▭▭▭   ◯   │ h-12 border-b
  └──────────────────────────────────────────────────────────────────────────┘
       ▭▭▭▭▭▭▭▭  (h-7 w-48)
       ▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭▭  (h-64, max-w-6xl centrat)
  ```
  - Skeleton-uri: `size-5` + `h-4 w-16` (brand), trei `h-4 w-14` (navigare), `h-8 w-60` (căutare, `hidden lg:block`), `h-7 w-28 rounded-full` (chip), `size-8 rounded-full` (meniu).
  - Sub 768 px, după brand rămân doar două `size-8`.
  - Pentru grupul `(editor)`, fallback-ul este `EditorSkeleton`. Antetul lui începe acum cu `◆` în locul iconiței de sidebar.
- **Navigare în curs:** linkul apăsat devine activ imediat (activul se calculează din `usePathname`). Fără bară de progres globală.
- **Limită atinsă:** chipul roșu „Limită atinsă · reset HH:MM”. Nu adăugăm bandă globală.
- **Fără proiecte fixate:** grupul „Fixate” lipsește din comutator, din paletă și din Sheet. Nu are stare goală.
- **Fără date de consum:** chipul lipsește. Sheet-ul afișează textul actual „Limitele abonamentului apar după primul job AI.”.

## Microcopy (RO)

| Loc | Text |
|---|---|
| Navigare | Proiecte · Utilizare · Setări |
| Căutare | „Caută…” + `⌘K`; Tooltip (icon): „Caută · ⌘K” |
| Meniul sesiunii | Tooltip „Sesiune și temă”; „Terminal Claude”; eticheta „Temă”; „Ca sistemul” / „Luminoasă” / „Întunecată”; „Blochează aplicația” |
| Chip consum | „5h 11% · 7z 18%”; „Limită atinsă · reset 14:30” |
| Comutator proiect | `aria-label` „Schimbă proiectul”; placeholder „Caută proiect…”; grupuri „Fixate”, „Recente”; „Toate proiectele”; „Proiect nou”; gol: „Niciun proiect găsit.” |
| Ecran îngust | `aria-label` „Meniu”; titlul foii „Meniu”; secțiuni „Fixate”, „Limite”, „Temă” |
| Editor | Tooltip `◆`: „Proiecte · G P”; grup `⋯`: „Aplicație” |
| Skip link | „Sari la conținut” |

## Ce se schimbă în cod (pentru implementare)

1. `app/(app)/layout.tsx`: scoate `SidebarProvider`, `AppSidebar` și `SidebarInset`; păstrează `requireSession` și `CommandPalette`. Creează grupurile `(pagini)` și `(editor)` și mută rutele.
2. Componente noi: `components/app-shell/app-bar.tsx` (bară + Sheet + meniul sesiunii), `project-switcher.tsx`, `skip-link.tsx`. `limits.tsx`: `SidebarLimits` devine `UsageChip`, iar `Bar` și `limitTone` se păstrează.
3. `components/page-header.tsx`: `TopBar` devine `PageCrumbs` (fără `SidebarTrigger`). Se actualizează cele 6 pagini care îl folosesc.
4. `features/editor/header.tsx`: înlocuiește `SidebarTrigger` și `‹` cu `◆` + separator, scoate segmentul „Proiecte” și adaugă grupul „Aplicație” în `⋯`. Același lucru pentru `editor-skeleton`.
5. `command-palette.tsx`: adaugă grupul „Fixate” în starea goală și secvențele `G P/U/S`.
6. `features/settings/settings-nav.tsx`: offset-ul sticky și pragul se raportează la `--app-bar-h`.
7. Șterge `app-sidebar.tsx` și, dacă nu mai are importuri, `components/ui/sidebar.tsx`.
