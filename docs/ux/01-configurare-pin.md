# 01 — Configurare PIN (prima rulare)
**Rută / context:** `/setup`, afișată o singură dată, la prima pornire, când în baza de date nu există încă un PIN · **Scop:** utilizatorul își alege PIN-ul de 6 cifre care va fi singura cale de acces în LexAI · **Ce face utilizatorul aici:** citește o explicație scurtă, introduce PIN-ul, îl confirmă, apoi intră direct în aplicație.

## Referințe analizate (≥10)
| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | X | [ecran](https://mobbin.com/screens/7ffbb0e1-870d-480b-a31f-c62c3de3da8d) · [flux](https://mobbin.com/flows/a73abe9d-74c6-47d3-a227-c17c8050f00b) | Bloc centrat foarte sobru: pictogramă mică, titlu, o singură frază de subtitlu, sloturile codului dedesubt. Trecerea automată la „Confirm Passcode” ([ecran](https://mobbin.com/screens/d600ca78-b325-4e4e-82b5-fa2476233072)) imediat după ultima cifră, fără buton. | Cifrele rămân vizibile în clar în cercuri; sloturile rotunde arată ca niște butoane radio. |
| 2 | Revolut | [ecran](https://mobbin.com/screens/a21878a7-9135-4da3-8928-4a4b3e6da589) | 6 sloturi grupate 3 + 3 cu un separator mic între grupuri, ușor de citit; confirmarea ([ecran](https://mobbin.com/screens/ca8cbd00-9abf-4641-a61d-670eb790aaf2)) maschează cifrele cu puncte. | Totul e lipit de colțul din stânga-sus, iar restul paginii e gol; nicio explicație despre rolul codului. |
| 3 | Revolut Business | [ecran](https://mobbin.com/screens/17b5e0da-12ff-41c9-a866-e8534b9f5745) · [flux](https://mobbin.com/flows/812fc6a2-1d57-4a98-ade4-74de8fcea85b) | Varianta întunecată a aceluiași tipar; la final apare un toast centrat „Passcode updated” cu bifă, scurt și clar. | Gradientul albastru decorativ nu aduce nimic într-o aplicație de lucru. |
| 4 | Apple Music | [ecran](https://mobbin.com/screens/0da4882b-707f-4cbd-aba1-034f3e9f2a90) | Subtitlul spune exact *când* va fi cerut codul. Butonul „Continue” e dezactivat până la completare; pasul doi are titlul „Re-enter your passcode” ([ecran](https://mobbin.com/screens/8b9e8598-7025-46c7-91ef-d1b9b1d3af55)). | Dialogul e mult prea înalt pentru 4 sloturi și lasă un spațiu alb mare și inutil. |
| 5 | 1Password | [ecran](https://mobbin.com/screens/27b44aba-4511-4f34-8ab3-eb036c4767b8) | Cea mai apropiată situație de a noastră: „This is the one password you need to remember” și un Alert informativ albastru, „we can't reset forgotten passwords”. Explicația stă în card, chiar lângă câmp. | Ilustrația mare cu chei și fundalul ondulat; câmpurile de parolă clasice (la noi e un PIN). |
| 6 | HBO Max | [ecran](https://mobbin.com/screens/4d814198-264e-4c8f-b6cc-f352934f7892) | Nota scurtă cu titlu îngroșat sub cod („Keep it handy.” + o frază): bun model pentru avertismentul despre `pnpm pin:reset`. | Footer-ul cu linkuri sociale și juridice; butoanele Save / Cancel puse la egalitate vizuală. |
| 7 | Proton | [ecran](https://mobbin.com/screens/2feb6504-6020-435a-a6d1-edfe29197655) · [flux](https://mobbin.com/flows/a55c3bac-0d74-4827-8aed-6ca20bb7ce73) | 6 sloturi 3 + 3 cu cursor vizibil în primul slot, o casetă explicativă deasupra și un toast de succes la final care repetă la ce folosește PIN-ul. | Caseta explicativă e mai proeminentă decât titlul; contrastul sloturilor e slab în modul întunecat. |
| 8 | Cloaked | [ecran](https://mobbin.com/screens/8abd4dde-9b3a-4332-a531-61e518b01f4a) | Confirmarea pozitivă inline sub câmpul de confirmare („It's a match”, bifă verde), înainte de trimitere. | Lista lungă de cerințe verzi, care la un PIN nu are rost. |
| 9 | Binance | [flux](https://mobbin.com/flows/9ea31ff8-d307-40ff-a72f-3569e4363712) | Regulă de PIN slab spusă clar sub sloturi (fără secvențe crescătoare sau descrescătoare, nicio cifră de mai mult de 2 ori); ochiul pentru afișare sau ascundere stă lângă titlu. | Galbenul saturat al butonului; validarea apare doar după „Confirm”, nu în timp real. |
| 10 | Hulu | [ecran](https://mobbin.com/screens/4909a0d2-5162-4a27-a6ff-8baf2995d3e6) | Pictogramă-ochi la capătul rândului de sloturi; spinner în butonul primar cât timp se salvează. | Butonul dezactivat e gri plin și pare activ; etichetele scrise numai cu majuscule. |
| 11 | Paramount+ | [flux](https://mobbin.com/flows/75d4aaf9-2016-4dfb-b04a-c16e9e4c7841) | Titlu care spune lungimea codului („Create a 4-digit PIN…”) și un subtitlu care spune unde se poate schimba ulterior. | Sloturi uriașe cu cifrele în clar; butoanele sunt lipite de partea de jos a ecranului, departe de câmp. |
| 12 | Chatbase | [ecran](https://mobbin.com/screens/50896e7e-1c87-4ea8-b2cb-cdd6e92c53d4) | Separator „—” între grupele de câte 3 cifre, sloturi compacte și un buton „Confirm” mic, aliniat la dreapta. Densitate bună pentru desktop. | Codul QR și secretul nu au echivalent la noi. |
| 13 | Luma | [ecran](https://mobbin.com/screens/f63f6e3f-ed6d-4e86-b54e-b5216b43fc93) | Card mic, cu colțuri generoase și umbră discretă; butonul de întoarcere sub formă de pictogramă în colțul cardului. | Fundalul cu gradient pastel. |
| 14 | ExpressVPN | [ecran](https://mobbin.com/screens/c404939a-422f-4051-a1a5-a643c11ce469) | Fraza „You'll use this single password to access…” transmite foarte bine ideea de „singura cale de acces”. | Layout-ul pe două coloane (text la stânga, formular la dreapta) e prea larg pentru 6 cifre; footer-ul de marketing. |

## Tipare comune
- **Doi pași distincți, același ecran:** „Creează” → „Confirmă / Reintrodu” (X, Revolut, Apple Music, Proton). Pasul doi doar schimbă titlul; layout-ul rămâne identic.
- **Avansare automată** după ultima cifră (X, Revolut). Butonul primar există doar ca rezervă și pentru tastatură (Apple Music, Hulu).
- **6 sloturi grupate 3 + 3** cu separator (Revolut, Proton, Chatbase) pentru coduri de 6 cifre.
- **Mascare implicită** cu puncte, plus un comutator „ochi” (Binance, Hulu, Revolut).
- **O singură frază care explică miza**, pusă lângă câmp: 1Password („the one password”, „can't reset”), HBO Max („Keep it handy”), ExpressVPN.
- **Feedback de succes** printr-un toast scurt (Revolut Business, Proton, Binance), urmat de redirecționare.
- **Bloc centrat, lățime mică** (~360–420 px), pe fundal neutru; fără navigație.

## Decizia de layout
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                         ◆ LexAI                              │
│                                                              │
│            ┌───────────────────────────────────┐             │
│            │  Pasul 1 din 2                    │             │
│            │  Creează PIN-ul                   │             │
│            │  Alege 6 cifre. Le vei folosi la  │             │
│            │  fiecare deschidere a aplicației. │             │
│            │                                   │             │
│            │  [ ][ ][ ] – [ ][ ][ ]   (ochi)   │             │
│            │  ⚠ evită 123456, 000000 …          │ (inline,  │
│            │                                   │  doar la   │
│            │  ┌ ⓘ ───────────────────────────┐ │  nevoie)   │
│            │  │ PIN-ul e singura cale de     │ │             │
│            │  │ acces. Dacă îl uiți, îl poți │ │             │
│            │  │ reseta doar pe acest Mac:    │ │             │
│            │  │ `pnpm pin:reset`             │ │             │
│            │  └──────────────────────────────┘ │             │
│            │                                   │             │
│            │                    [ Continuă → ] │             │
│            └───────────────────────────────────┘             │
│                                                              │
│                 Rulează local · 127.0.0.1                    │
└──────────────────────────────────────────────────────────────┘
```
- **Primar:** sloturile InputOTP (focus automat la încărcare) și titlul pasului.
- **Secundar:** Alert-ul informativ despre resetare, vizibil la *ambii* pași (în pasul 2 se poate restrânge la o singură linie).
- **Terțiar:** indicatorul „Pasul 1 din 2”, wordmark-ul, nota „Rulează local”.
- Pasul 2 („Confirmă PIN-ul”) reutilizează cardul: titlul se schimbă, sloturile se golesc, apare legătura „← Schimbă PIN-ul” (înapoi la pasul 1). Tranziția dintre pași e o glisare orizontală scurtă (Motion, ~150 ms), iar înălțimea cardului rămâne constantă.
- După confirmare: spinner în buton → toast „PIN salvat” → redirecționare la `/` (sesiunea pornește imediat, fără să ceară din nou PIN-ul).

## Componente HextaUI
- **Card**: containerul centrat (max-w ~400 px), cu Hairline ca bordură.
- **Input OTP**: 6 sloturi, `InputOTPGroup` 3 + 3 cu `InputOTPSeparator`; `inputMode="numeric"`, `autoComplete="off"` (la pasul 1 nu folosim `one-time-code`), mascat implicit.
- **Toggle**: ochiul pentru afișare/ascundere cifre (cu `aria-pressed`).
- **Alert** (varianta info): explicația despre accesul unic și `pnpm pin:reset`.
- **Kbd** sau `<code>` stilizat: pentru `pnpm pin:reset` în Alert, cu un **Button** mic (ghost, icon) „Copiază”.
- **Button**: „Continuă” / „Salvează PIN-ul” (primar, cu **Spinner** în starea de încărcare) și „← Schimbă PIN-ul” (link / ghost).
- **Field** + **Label**: eticheta accesibilă a grupului OTP și mesajele de eroare legate prin `aria-describedby`.
- **Toast**: „PIN salvat. Bine ai venit în LexAI.”
- **Motion**: tranziția între pași și „shake”-ul scurt la nepotrivire (respectă `prefers-reduced-motion`).
- **Progress** (opțional, 2 segmente) în loc de textul „Pasul 1 din 2”.

## Stări
- **Inițial:** focus în primul slot, butonul „Continuă” dezactivat.
- **PIN slab (pasul 1):** mesaj inline de avertizare sub sloturi (Field description în ton „warning”) pentru secvențe (123456, 654321) sau cifre repetate (000000, 111111). Recomandare: blocăm doar secvențele și repetițiile totale, restul e avertisment.
- **Nepotrivire (pasul 2):** sloturile tremură scurt, se golesc, iar dedesubt apare mesajul de eroare „PIN-urile nu coincid. Introdu-l din nou.” Focus în primul slot. După 2 nepotriviri consecutive afișăm butonul „Începe din nou” (revenire la pasul 1).
- **Potrivire:** bifă verde inline („PIN-urile coincid”, ca la Cloaked) timp de ~300 ms, apoi se trimite automat.
- **Încărcare (salvare):** Spinner în buton, sloturi dezactivate.
- **Eroare server:** Alert destructive deasupra butonului: „Nu am putut salva PIN-ul. Verifică dacă serverul local rulează și încearcă din nou.” PIN-ul introdus se păstrează.
- **PIN deja configurat:** ruta `/setup` redirecționează la `/login` (nu se afișează niciodată formularul a doua oară).

## Ecran îngust
- Cardul devine full-width cu gutter de 16 px; dispar bordura și umbra (fundal continuu).
- Sloturile OTP: minim 44 × 44 px; grupul 3 + 3 încape pe 320 px (6 × 44 + separator + spații ≈ 300 px).
- Butonul primar devine full-width, sub Alert.
- Alert-ul rămâne vizibil (nu se ascunde într-un tooltip): e informația cea mai importantă după câmp.

## Microcopy (RO)
- Titlu pagină (`<title>`): „Configurare PIN — LexAI”
- Pas 1 — titlu: **„Creează PIN-ul”** · subtitlu: „Alege 6 cifre. Le vei introduce de fiecare dată când deschizi LexAI.”
- Pas 2 — titlu: **„Confirmă PIN-ul”** · subtitlu: „Introdu încă o dată aceleași 6 cifre.”
- Indicator: „Pasul 1 din 2” / „Pasul 2 din 2”
- Alert (info) — titlu: **„Singura cale de acces”** · text: „Nu există utilizator sau parolă. Dacă uiți PIN-ul, îl poți reseta doar pe acest Mac, din terminal, în folderul proiectului:” + `pnpm pin:reset`
- Buton copiere: „Copiază” → „Copiat”
- Avertisment PIN slab: „Acest PIN e ușor de ghicit. Evită secvențele (123456) și cifrele repetate (000000).”
- Eroare nepotrivire: „PIN-urile nu coincid. Introdu-l din nou.”
- Succes inline: „PIN-urile coincid”
- Butoane: „Continuă”, „Salvează PIN-ul”, „← Schimbă PIN-ul”, „Începe din nou”
- Toggle ochi (aria-label): „Arată PIN-ul” / „Ascunde PIN-ul”
- Toast: „PIN salvat. Bine ai venit în LexAI.”
- Eroare server: „Nu am putut salva PIN-ul. Verifică dacă serverul local rulează și încearcă din nou.”
- Notă subsol: „Rulează local pe acest Mac”

## Întrebări deschise
- Blocăm complet PIN-urile slabe (secvențe, repetiții) sau doar avertizăm? Recomandare: blocăm doar cele 20 cele mai comune, restul e avertisment.
- Trecem automat la pasul 2 după a 6-a cifră (ca X/Revolut) sau cerem clic pe „Continuă”? Recomandare: automat, cu butonul păstrat pentru Enter și pentru cititoarele de ecran.
- Afișăm o bifă de tip „Am înțeles că PIN-ul se resetează doar local” înainte de salvare? Ar adăuga fricțiune; probabil e suficient Alert-ul.
- După salvare intrăm direct în aplicație sau trecem prin `/login` ca să exersăm PIN-ul o dată? Recomandare: direct, cu sesiune nouă.
- Cât durează sesiunea creată la setup (aceeași politică ca la login)?
