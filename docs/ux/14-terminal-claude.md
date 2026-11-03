# 14 — Terminal Claude
**Rută / context:** `/setari/terminal`, deschisă din Setări → „Cont Claude” → „Deschide terminalul” (sau din alerta „Claude nu e conectat”). Terminalul e încorporat cu xterm.js și rulează **doar** Claude CLI în patru moduri: `claude` (interactiv), `claude auth login`, `claude auth logout`, `claude auth status`. · **Scop:** schimbarea sau verificarea contului Claude folosit de LexAI, fără a părăsi aplicația · **Ce face utilizatorul aici:** își confirmă PIN-ul, vede starea contului, alege un mod, urmează pașii de autentificare (link + cod) și închide sau repornește procesul.

## Referințe analizate (≥10)
| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | PlanetScale | [ecran](https://mobbin.com/screens/a1fa1590-52b6-4554-b83c-03e998fe6537) | Consola e un panou închis, cu colțuri rotunjite, *în interiorul* aplicației luminoase (sidebar-ul rămâne). Bara de sus a panoului are un selector („Branch ▾”): echivalentul selectorului nostru de mod. | Panoul complet gol, fără niciun indiciu despre ce poți tasta. |
| 2 | Stripe | [ecran](https://mobbin.com/screens/ade97309-f185-43e4-bc8a-0cad42b649d0) | Mesaj de bun venit care listează **comenzile permise** ca legături clicabile, plus badge „Read only” în bara de prompt. Exact modelul pentru un terminal restricționat. | Bannerul ASCII mare și panoul lateral „API Explorer”. |
| 3 | Modal | [ecran](https://mobbin.com/screens/14a3f6c5-417c-41bf-9333-ade7121de304) | Pastilă de stare în header („● Kernel running – T4”) lângă un buton „Restart”: modelul pentru starea procesului CLI. Bara de jos cu resurse (CPU, RAM) e discretă. | Densitatea mare a panoului de fișiere. |
| 4 | Browserbase | [ecran](https://mobbin.com/screens/65443ac8-7a11-4cc8-9b42-4cdc64b12f13) | Bandă de stare deasupra log-ului („Building function… 0:20”) cu timp scurs și o frază de context. O folosim pentru „Aștept autentificarea în browser… 0:42”. | Fundalul vișiniu al terminalului (folosim neutru). |
| 5 | Replit | [ecran](https://mobbin.com/screens/8327a792-fe66-45fd-b10d-6647ce812d71) | Tab „Shell” cu calea afișată și acțiuni mici, doar pictograme (curăță, închide), aliniate la dreapta. | Interfața cu 4 panouri simultane. |
| 6 | Bolt.new | [ecran](https://mobbin.com/screens/38707e43-1f98-49b6-9d21-7c607db610d3) | Terminalul e un tab al unui panou inferior pliabil, cu marcaje de timp pe linii („12:34:25 PM”). | — (relevant doar ca pattern de panou) |
| 7 | Amazon Web Services (AWS) | [ecran](https://mobbin.com/screens/2b4fc3bf-6981-45d5-bba3-0b318f3c35c9) | Bara de context sub terminal (instanța, IP-urile) care poate fi închisă; terminalul ocupă tot spațiul rămas. | Negrul pur pe tot ecranul și ASCII art-ul de întâmpinare. |
| 8 | Supabase | [ecran](https://mobbin.com/screens/1b16094b-7311-4dd9-ae6b-f57f4dd4a3ae) | Indiciu gri în zona goală („Hit CMD+SHIFT+K…”) și butonul „Run” cu scurtătura vizibilă (Kbd). Model pentru „Pornește” + `⌘↵`. | Arborele lateral de interogări. |
| 9 | Surfshark | [ecran](https://mobbin.com/screens/3a74cec1-d7f4-4f63-995e-8207688066aa) | Codul de autentificare afișat în căsuțe separate, cu buton „Copy” și „Code refreshes in 05:00”. Model pentru cardul-ajutor care extrage linkul și codul din ieșirea CLI. | Codul QR mare și ilustrația decorativă. |
| 10 | Telegram | [ecran](https://mobbin.com/screens/cdb015f5-7378-4513-acd8-72f51c2cf9c0) | Pași numerotați (1, 2, 3) cu căile de meniu îngroșate („Settings › Devices”). Ghidul pentru `auth login` va fi scris la fel. | Fundalul ilustrat. |
| 11 | Modal | [ecran](https://mobbin.com/screens/504afcbc-978f-4abe-9472-4e82b69611ae) | Textul spune explicit *ce client* cere acces („Client … running on macOS…”). Noi afișăm „Acest Mac · Claude CLI {versiune}”. | Stilizarea monocromă verde-pe-negru. |
| 12 | Cloaked | [ecran](https://mobbin.com/screens/2e1aaf8f-a6e2-4f58-830c-4a0c66be4ce3) | Re-autentificarea apare **inline**, în zona de conținut a setărilor, nu ca modal: „For security purposes, please re-enter your password.” Aici folosim același tipar. | Butonul „Continue” gri, greu de distins ca activ. |
| 13 | Sentry | [ecran](https://mobbin.com/screens/62d6f0ba-8a9a-4afa-a657-51c5bbf3e26d) | Titlu scurt „Confirm Password to Continue” + o frază cu motivul; breadcrumb-ul (Settings › Account › Security) rămâne vizibil, deci contextul nu se pierde. | Modal peste o pagină goală. |
| 14 | GitBook | [ecran](https://mobbin.com/screens/032ac492-4e3c-4eb4-9adc-c1a1b0bec143) | Formulare clară a motivului: „to perform this sensitive action”; acțiuni compacte „Cancel / Sign in”. | — |
| 15 | Dropbox Dash | [ecran](https://mobbin.com/screens/497016ca-e25e-44b3-a72b-cd1a45cc1944) | Etichetă mică „Confirm identity” cu indicator de pas deasupra titlului și „Forgot password?” în stânga jos, separat de acțiunile principale. | Pagina de fundal estompată, care distrage. |
| 16 | YNAB | [ecran](https://mobbin.com/screens/3bed1148-e7cf-4f70-8ff3-eb60de7cc0c8) | Avertizează că un cod nu va mai fi afișat. | Codul e afișat ca text brut, fără buton de copiere și fără formatare monospace: anti-tipar. |

## Tipare comune
- **Terminalul e un panou în aplicație**, nu o pagină complet neagră (PlanetScale, Replit, Bolt); are bara lui proprie cu selector și acțiuni-pictogramă.
- **Terminal restricționat = comenzi permise vizibile** (Stripe: listă clicabilă + badge „Read only”).
- **Starea procesului** e o pastilă cu punct colorat și un buton „Restart” alături (Modal); operațiile lungi au o bandă cu timpul scurs (Browserbase).
- **Re-autentificarea pentru acțiuni sensibile** e un pas scurt, cu titlu și o frază de motiv (Sentry, GitBook, Cloaked, Dropbox). Varianta inline (Cloaked) păstrează contextul mai bine decât modalul.
- **Codurile și linkurile de autorizare** sunt afișate mare, monospace, cu „Copiază” și, dacă e cazul, cu durata de valabilitate (Surfshark); pașii sunt numerotați (Telegram).
- **Scurtături vizibile** pe butoane (Supabase).

## Decizia de layout
```
Stare 1 — Blocat (înainte de PIN)
┌────────┬────────────────────────────────────────────────────────────────────┐
│Sidebar │ Setări / Terminal Claude                                           │
│        │ Terminal Claude                      ● Conectat · andrei@… · Max   │
│        │ ┌────────────────────────────────────────────────────────────────┐ │
│        │ │                                                                │ │
│        │ │                   🔒 Confirmă PIN-ul                           │ │
│        │ │   Terminalul poate schimba contul Claude folosit de LexAI.     │ │
│        │ │                                                                │ │
│        │ │              [ ][ ][ ] – [ ][ ][ ]                             │ │
│        │ │                                                                │ │
│        │ │          Ai uitat PIN-ul?   ·   ← Înapoi la Setări             │ │
│        │ └────────────────────────────────────────────────────────────────┘ │
└────────┴────────────────────────────────────────────────────────────────────┘

Stare 2 — Deblocat
┌────────┬────────────────────────────────────────────────────────────────────┐
│Sidebar │ Setări / Terminal Claude                                           │
│        │ Terminal Claude                                      🔓 expiră 9:41│
│        │ ┌ Cont Claude ──────────────────────────────────────────────────┐  │
│        │ │ (AN) andrei@…  ● Conectat · plan Max · verificat acum 1 min    │  │
│        │ │                                    [Verifică] [Deconectează…]  │  │
│        │ └───────────────────────────────────────────────────────────────┘  │
│        │ ┌───────────────────────────────────────────────────────────────┐  │
│        │ │[Interactiv|Autentificare|Stare|Deconectare]  ● Rulează  ⟳ ⌫ ⧉ ■│  │ ← bara panoului
│        │ ├───────────────────────────────────────────────────────────────┤  │
│        │ │ ⏱ Aștept autentificarea în browser…  0:42                       │  │ ← doar la auth login
│        │ │ 1 Deschide linkul  [https://claude.ai/oauth/…]  [Copiază] [↗]  │  │
│        │ │ 2 Autorizează LexAI în browser                                  │  │
│        │ │ 3 Lipește codul aici, în terminal                               │  │
│        │ ├───────────────────────────────────────────────────────────────┤  │
│        │ │ $ claude auth login                                            │  │
│        │ │ Opening browser…                                               │  │
│        │ │ Paste code here if prompted > █                                │  │ ← xterm.js
│        │ │                                                                │  │
│        │ └───────────────────────────────────────────────────────────────┘  │
│        │  Doar Claude CLI · nu sunt permise alte comenzi        ⌘K Ctrl+C   │
└────────┴────────────────────────────────────────────────────────────────────┘
```
- **Pagină în shell-ul aplicației** (sidebar + breadcrumb `Setări / Terminal Claude`), lățime maximă ~1100 px; terminalul umple înălțimea rămasă (minim 420 px).
- **Blocarea cu PIN e inline** (tiparul Cloaked / Sentry): cardul de PIN ocupă locul terminalului. Header-ul și starea contului rămân vizibile, chiar înainte de deblocare, ca utilizatorul să vadă dacă mai are nevoie de terminal. Sesiunea de terminal deblocat expiră după inactivitate, cu un indicator discret în header („🔓 expiră în 9:41”, Tooltip cu explicația).
- **Cardul „Cont Claude”** stă deasupra terminalului: Avatar cu inițiale, email, plan, stare, ultima verificare. „Verifică” rulează `auth status` în fundal (fără să ocupe terminalul). „Deconectează…” cere confirmare și apoi pornește modul `auth logout`.
- **Selectorul de mod** e un Toggle group segmentat în bara panoului: *Interactiv* (`claude`), *Autentificare* (`auth login`), *Stare* (`auth status`), *Deconectare* (`auth logout`). Schimbarea modului cât timp un proces rulează cere confirmare („Oprești procesul curent?”). Comanda exactă apare ca text monospace gri lângă pastila de stare.
- **Bara panoului, dreapta:** pastila de stare (Pornit / Rulează / Încheiat cu codul 0 / Eroare), apoi pictograme cu Tooltip: Repornește, Curăță ecranul, Copiază ieșirea, Oprește (■, trimite Ctrl+C).
- **Banda-ajutor `auth login`** apare doar în acest mod, între bară și xterm. LexAI detectează URL-ul în ieșire și îl afișează cu „Copiază” și „Deschide ↗”, plus pașii numerotați. Dispare automat când `auth status` confirmă conectarea, iar în locul ei apare un toast „Conectat ca {email}”.
- **Linia de subsol** reamintește restricția („Doar Claude CLI”) și scurtăturile.
- Tema terminalului: fundal neutru închis (nu negru pur), atât în tema luminoasă, cât și în cea întunecată; font monospace al sistemului; cursor bloc; ANSI cu paleta HextaUI.

## Componente HextaUI
- **Sidebar** + **Breadcrumb**: contextul `Setări / Terminal Claude`.
- **Card** + **Item** + **Avatar** + **Badge**: cardul „Cont Claude” (stare, plan).
- **Input OTP** + **Field** + **Alert** (warning, pentru blocare): deblocarea cu PIN, aceeași logică de rate limit ca la `/login`.
- **Toggle group**: selectorul de mod (4 segmente). Pe ecran îngust devine **Select** / **Native select**.
- **Badge** cu punct + **Spinner**: pastila de stare a procesului.
- **Button** (icon, ghost) + **Tooltip** + **Kbd**: Repornește, Curăță, Copiază, Oprește (`Ctrl C`).
- **Alert dialog**: confirmarea pentru „Deconectează contul Claude” și pentru schimbarea modului cu proces activ.
- **Alert** (info): banda „Aștept autentificarea…”, cu pașii numerotați.
- **Input group** (input read-only monospace + Button „Copiază” + Button „Deschide”): linkul extras din ieșire.
- **Number flow**: timpul scurs în bandă și cronometrul de expirare a deblocării.
- **Hover card**: pe Avatar, cu detaliile contului (email, organizație, plan, sursa: `auth status`).
- **Toast**: „Conectat ca {email}”, „Deconectat”, „Ieșire copiată”.
- **Empty**: starea „Claude CLI nu este instalat”.
- **Skeleton**: cardul de cont până răspunde `auth status`.
- **Resizable** (opțional): înălțimea panoului terminalului față de cardul de cont, pe ecrane mari.
- **Hotkey**: `⌘K` curăță, `Ctrl C` oprește, `⌘⇧C` copiază ieșirea.

## Stări
- **Blocat:** card PIN inline; restul paginii e vizibil, dar terminalul nu e montat (niciun proces pornit). Greșelile se contorizează la fel ca la login; blocarea afișează cronometrul (vezi `02-login-pin.md`).
- **Deblocare reușită:** cardul PIN dispare cu o tranziție scurtă, terminalul se montează în modul implicit (*Stare*, ca utilizatorul să vadă imediat situația contului) și primește focus.
- **Deblocare expirată (inactivitate):** procesul activ e oprit, ieșirea rămâne vizibilă, dar estompată, iar peste ea revine cardul PIN cu mesajul „Sesiunea terminalului a expirat”.
- **Se încarcă starea contului:** Skeleton în cardul de cont; pastila „Se verifică…”.
- **Conectat:** Badge verde „Conectat”, email, plan.
- **Neconectat:** Badge gri „Neconectat” + CTA primar în card: „Conectează-te” (comută pe modul *Autentificare* și pornește procesul).
- **Autentificare în curs:** banda-ajutor cu timpul scurs; dacă trec peste 5 minute fără confirmare, textul se schimbă în „Durează mai mult decât de obicei. Poți reporni autentificarea.” + „Repornește”.
- **Proces încheiat:** linie de sistem în xterm, `— proces încheiat (cod 0) —`, plus pastila „Încheiat”; butonul „Repornește” devine primar.
- **Proces încheiat cu eroare:** pastilă roșie „Eroare (cod {n})” și Alert scurt deasupra terminalului cu ultima linie de eroare și „Repornește”.
- **CLI lipsă:** Empty în locul terminalului: titlu „Claude CLI nu a fost găsit”, text cu comanda de instalare (copiabilă) și „Verifică din nou”.
- **Conexiune WebSocket pierdută:** bandă warning „Conexiunea cu terminalul s-a întrerupt. Se reconectează…” + Spinner; după 3 eșecuri apare „Reîncarcă”.
- **Comandă nepermisă tastată în modul interactiv:** gestionată de CLI; LexAI nu oferă un shell, deci nu există prompt de sistem.

## Ecran îngust
- Sidebar-ul aplicației devine Sheet; breadcrumb-ul se reduce la „← Setări”.
- Cardul de cont se compactează pe un singur rând (Avatar + Badge + „Verifică”); detaliile intră în Hover card / Popover.
- Selectorul de mod devine Select; pictogramele din bara panoului intră într-un Dropdown menu „⋯”, cu excepția „Oprește”.
- Banda-ajutor `auth login` rămâne vizibilă (e esențială): linkul se trunchiază la mijloc, iar butoanele „Copiază” și „Deschide” trec pe rândul următor.
- xterm își recalculează coloanele (fit addon) și folosește un font cu 1 px mai mic; minim 60 de coloane, altfel apare scroll orizontal *doar* în panou.
- Sub 480 px apare o notă: „Terminalul e mai comod pe un ecran mai lat.” (nu blocăm utilizarea).

## Microcopy (RO)
- `<title>`: „Terminal Claude — LexAI” · Breadcrumb: „Setări / Terminal Claude”
- Titlu: **„Terminal Claude”** · subtitlu: „Conectează, verifică sau schimbă contul Claude folosit de LexAI.”
- Blocare — titlu: **„Confirmă PIN-ul”** · text: „Terminalul poate schimba contul Claude folosit pentru analize. Introdu PIN-ul ca să continui.” · legături: „Ai uitat PIN-ul?” · „← Înapoi la Setări”
- Expirare: „Sesiunea terminalului a expirat după {10} minute de inactivitate. Introdu din nou PIN-ul.” · Indicator: „Deblocat · expiră în {9:41}”
- Cont — stări: „Conectat”, „Neconectat”, „Se verifică…”, „Nu am putut verifica” · meta: „Plan {Max} · verificat acum {1 min}” · butoane: „Verifică”, „Conectează-te”, „Deconectează…”
- Moduri (Toggle group): „Interactiv”, „Autentificare”, „Stare”, „Deconectare” · Tooltip-uri: „Pornește `claude` în mod interactiv”, „Rulează `claude auth login`”, „Rulează `claude auth status`”, „Rulează `claude auth logout`”
- Stare proces: „Pornit”, „Rulează”, „Încheiat”, „Eroare (cod {n})”
- Acțiuni: „Repornește”, „Curăță ecranul”, „Copiază ieșirea”, „Oprește (Ctrl C)”
- Bandă login: „Aștept autentificarea în browser… {0:42}” · Pași: „1. Deschide linkul de mai jos în browser.” „2. Autorizează accesul pentru Claude Code.” „3. Dacă ți se cere, lipește codul în terminal și apasă Enter.” · Butoane: „Copiază linkul”, „Deschide ↗”
- Login lent: „Durează mai mult decât de obicei. Poți reporni autentificarea.”
- Succes: Toast „Conectat ca {email}.”
- Confirmare deconectare — titlu: **„Deconectezi contul Claude?”** · text: „Analizele și generarea de documente nu vor mai funcționa până te conectezi din nou.” · butoane: „Deconectează” / „Anulează”
- Confirmare schimbare mod: „Un proces rulează încă. Îl oprești și pornești modul {Autentificare}?” · „Oprește și continuă” / „Anulează”
- CLI lipsă: **„Claude CLI nu a fost găsit”** · „Instalează Claude Code pe acest Mac, apoi apasă Verifică din nou.” · „Verifică din nou”
- Reconectare: „Conexiunea cu terminalul s-a întrerupt. Se reconectează…” · „Reîncarcă pagina”
- Subsol: „Doar Claude CLI. Alte comenzi nu sunt disponibile.”

## Întrebări deschise
- Cât durează deblocarea terminalului (10 minute de inactivitate? până la închiderea tab-ului?) și se partajează cu alte acțiuni sensibile, ca schimbarea PIN-ului (tip „sudo mode”)?
- PIN-ul greșit aici contorizează în *aceeași* limită ca la `/login` (recomandat) sau într-una separată?
- Modul implicit la deschidere: *Stare* (recomandat, e inofensiv) sau ultimul mod folosit?
- Putem detecta fiabil URL-ul și codul din ieșirea `claude auth login` (format stabil între versiuni)? Dacă nu, banda-ajutor rămâne doar cu pașii generici.
- `claude auth status` poate rula în fundal (fără PIN) ca să alimenteze cardul de cont și Setările? Recomandat: da, e doar citire.
- Modul *Interactiv* (`claude`) e chiar necesar în LexAI sau ajung cele trei comenzi `auth`? Dacă rămâne, ce director de lucru folosește (unul gol, izolat)?
- Păstrăm istoricul ieșirii între vizite (scrollback persistent) sau pornim mereu cu ecranul curat? Din motive de confidențialitate, recomandăm ecranul curat.
- Afișăm versiunea CLI și calea binarului în subsol (utile pentru depanare)?
