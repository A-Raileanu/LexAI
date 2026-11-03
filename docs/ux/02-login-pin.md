# 02 — Autentificare cu PIN
**Rută / context:** `/login`, ecranul afișat la fiecare deschidere a aplicației sau după expirarea ori revocarea sesiunii. Nu există nume de utilizator. · **Scop:** deblocarea aplicației cu PIN-ul de 6 cifre, cu protecție la încercări repetate (blocări progresive de 1, 5, 15 și 60 de minute) · **Ce face utilizatorul aici:** tastează 6 cifre; dacă greșește, vede câte încercări îi mai rămân; dacă e blocat, vede cât mai are de așteptat.

## Referințe analizate (≥10)
| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Revolut | [ecran](https://mobbin.com/screens/12f5496a-14e8-46b5-924a-53a75c64eab8) | Exact cazul nostru: doar titlul „Enter passcode”, 6 sloturi grupate 3 + 3 și legătura „Forgot your passcode?” imediat sub ele. Fără buton: trimiterea se face automat. | Ilustrația 3D cu lacătul din dreapta. |
| 2 | Hulu | [ecran](https://mobbin.com/screens/6af17ce8-8b44-4cbe-b08b-81d4953b59d3) | După ultima cifră, sub sloturi apare un spinner mic: e clar că verificarea a pornit și nu mai e nevoie de buton. | Header-ul cardului cu săgeată de întoarcere (la noi nu există „înapoi”). |
| 3 | Netflix | [ecran](https://mobbin.com/screens/f8bba7e1-53ea-4637-b4e0-9e00c911d178) | O linie de context mică deasupra titlului („Profile Lock is currently on.”); eroarea de validare apare inline, roșu, direct sub sloturi. | Titlul foarte mare și contrastul extrem alb pe negru pe tot ecranul. |
| 4 | DoorDash | [ecran](https://mobbin.com/screens/3faa93fa-8417-49fd-a620-dc433441100c) | Eroarea spune și ce urmează: „Try again. You have 3 more tries”, cu pictogramă și sloturi conturate cu roșu. Modelul direct pentru „încercări rămase”. | Modalul aglomerat (Google, tab-uri Sign in / Sign up, linkuri multe). |
| 5 | Slack | [ecran](https://mobbin.com/screens/019a80c4-e062-4992-a5ac-a085c7277e1c) | Sloturi mari, două grupuri de câte 3 lipite; eroarea stă într-o bandă roșie discretă, cu pictogramă, sub cod. Tonul e prietenos, fără vină. | Scrisul foarte mare din titlu pe desktop. |
| 6 | WorkOS | [ecran](https://mobbin.com/screens/497367cd-6ba5-4c4b-a8e6-35ff160c9d12) | Sloturile se colorează în roz deschis la eroare, iar mesajul e de 3 cuvinte, aliniat la stânga sub cod. Card mic, cu bordură fină. | Nimic notabil; e foarte aproape de direcția dorită. |
| 7 | Databricks | [ecran](https://mobbin.com/screens/64cebb0a-3add-4a5d-9cea-3f7cd0029b26) | Buton secundar dezactivat cu numărătoare inversă inclusă în etichetă („Resend code in **16**”). Îl adaptăm pentru blocare: „Reîncearcă în 04:59”. | Pictograma de eroare foarte mică, ușor de ratat. |
| 8 | Copy.ai | [ecran](https://mobbin.com/screens/fc081ca5-8e4b-4e9f-ac19-e679d12dcddf) | Numărătoare discretă în paranteză („Resend (17)”), în gri, pe aceeași linie cu textul explicativ. | — |
| 9 | Posh | [ecran](https://mobbin.com/screens/ec76ebae-11e4-4aba-843b-44eae5453bf0) | Buton primar dezactivat și text „Resend code in 29s” sub el; variantă întunecată curată, cu sloturi conturate subțire. | Toast-ul informativ din colț, care dublează mesajul. |
| 10 | Surfshark | [ecran](https://mobbin.com/screens/a216f75b-1823-4834-820d-c15b5a3e1685) | Mesajul de blocare („too many attempts”) e formulat scurt și oferă o alternativă. | Modal peste formular: blocarea trebuie să fie o *stare a paginii*, nu un dialog care se închide cu „Ok”. |
| 11 | Binance | [ecran](https://mobbin.com/screens/649d8c32-0f98-4912-800e-90f3f962b170) | Eroarea de limitare a ratei stă sub câmp, legată de el. | Mesajul e dublat într-un toast; codul tehnic de eroare „(015002)” e afișat utilizatorului. |
| 12 | Wise | [flux](https://mobbin.com/flows/411c07ae-8a65-4216-8cee-5b2e9673719c) | Regula se spune explicit, dinainte: „If you enter the wrong PIN 3 times, your PIN gets blocked”. O afișăm la cerere (popover „Cum funcționează blocarea?”). | Ecranul final „ALL DONE” cu bifă 3D, mult prea teatral. |
| 13 | Family | [ecran](https://mobbin.com/screens/588df407-0e4e-4f4a-91e8-2d75bcb3f572) | După eroare, focusul revine în primul slot (evidențiat cu roșu), restul rămân goi; grupare 3 – 3. | Placeholder-ele „0” din sloturi pot fi confundate cu cifre introduse. |
| 14 | Disney+ | [ecran](https://mobbin.com/screens/d3722484-f59b-4643-8174-4bb82a3d2366) | Cifrele sunt mascate cu puncte, iar sub slotul activ apare un cursor subliniat; o pictogramă-lacăt mică deasupra titlului. | Avatarul mare de profil (aplicația noastră are un singur utilizator). |
| 15 | Deputy | [ecran](https://mobbin.com/screens/970f0196-1e1c-479b-aba0-c1017e14980e) | Tastatură numerică pe ecran: o reținem doar ca idee pentru ecran tactil îngust. | Pe desktop, tastatura pe ecran e inutilă și încetinește. |

## Tipare comune
- **Formular minim:** titlu + sloturi + o legătură „Ai uitat?”. Fără buton primar, trimitere automată la a 6-a cifră (Revolut, Hulu, Disney+).
- **Eroare inline sub sloturi**, scurtă, în roșu, cu sloturile colorate sau conturate cu roșu (WorkOS, Netflix, DoorDash, Slack). După eroare, sloturile se golesc și focusul revine în primul.
- **Încercări rămase spuse explicit** în mesajul de eroare (DoorDash) și regula anunțată dinainte (Wise).
- **Numărătoare inversă integrată într-un control dezactivat** (Databricks, Copy.ai, Posh), nu într-un dialog separat.
- **Blocarea în modal (Surfshark)** e un anti-tipar: utilizatorul închide dialogul și nu mai știe cât are de așteptat.
- **Gruparea 3 + 3** pentru 6 cifre (Revolut, Slack, Family, Databricks).

## Decizia de layout
```
Stare normală                           Stare de eroare (încercări rămase)
┌──────────────────────────────┐        ┌──────────────────────────────┐
│           ◆ LexAI            │        │           ◆ LexAI            │
│                              │        │                              │
│     🔒 Aplicația e blocată    │        │     🔒 Aplicația e blocată    │
│     Introdu PIN-ul           │        │     Introdu PIN-ul           │
│                              │        │                              │
│  [•][•][ ] – [ ][ ][ ]       │        │  [ ][ ][ ] – [ ][ ][ ]  (roșu)│
│        ◌ (verificare…)       │        │  ⓘ PIN greșit. Mai ai 2      │
│                              │        │    încercări înainte de o    │
│   Ai uitat PIN-ul?           │        │    pauză de 1 minut.         │
└──────────────────────────────┘        │   Ai uitat PIN-ul?           │
                                        └──────────────────────────────┘
Stare de blocare (lockout)
┌──────────────────────────────────────┐
│              ◆ LexAI                 │
│                                      │
│   Prea multe încercări greșite       │
│                                      │
│  [ ][ ][ ] – [ ][ ][ ]  (dezactivat)  │
│                                      │
│  ┌ ⏱ ─────────────────────────────┐  │
│  │ Poți încerca din nou în         │  │
│  │          04:37                  │  │ ← Number flow, cifre tabulare
│  │ ▓▓▓▓▓▓▓▓▓░░░░░░  (Progress)     │  │
│  │ Următoarea blocare: 15 minute.  │  │
│  └─────────────────────────────────┘  │
│   Cum funcționează blocarea?         │
│   Ai uitat PIN-ul?                   │
└──────────────────────────────────────┘
```
- **Un singur bloc centrat**, lățime ~360 px, aceeași „coajă” ca `/setup`. Fără sidebar și fără navigație.
- **Primar:** sloturile (focus automat la încărcare și după fiecare eroare). **Secundar:** mesajul de stare de sub sloturi, al cărui conținut se schimbă (verificare, eroare, blocare). **Terțiar:** legăturile de ajutor.
- Mesajul de stare ocupă **o zonă de înălțime rezervată**, ca pagina să nu „sară” între stări.
- La blocare, sloturile rămân vizibile, dar dezactivate (opacitate ~50 %), ca utilizatorul să vadă unde va tasta. Cronometrul e elementul cel mai mare din card. La expirare, sloturile se reactivează singure, primesc focus și apare mesajul „Poți încerca din nou”.
- Legătura „Ai uitat PIN-ul?” deschide un **Popover** (nu o pagină) cu instrucțiunea `pnpm pin:reset` și butonul de copiere.
- După succes: bifă scurtă (~200 ms) în locul spinner-ului, apoi redirecționare la ruta cerută inițial (`?next=`) sau la `/`.

## Componente HextaUI
- **Card**: containerul centrat; Hairline ca bordură.
- **Input OTP**: 6 sloturi, `InputOTPGroup` 3 + 3 + `InputOTPSeparator`; `onComplete` → trimitere automată; `disabled` în timpul verificării și al blocării; `aria-invalid` la eroare.
- **Spinner**: indicator de verificare sub sloturi.
- **Field** (description / error): mesajul inline de eroare cu încercările rămase, legat prin `aria-describedby`; anunțat cu `aria-live="polite"`.
- **Alert** (varianta warning): blocul de blocare cu cronometru.
- **Number flow**: cronometrul `mm:ss` (cifre tabulare, tranziție lină la fiecare secundă).
- **Progress**: bara care se golește pe durata blocării (opțional; `aria-hidden`, informația e deja în text).
- **Popover**: „Ai uitat PIN-ul?” și „Cum funcționează blocarea?”.
- **Kbd** / cod inline + **Button** (ghost, icon) „Copiază” pentru `pnpm pin:reset`.
- **Motion**: „shake” scurt pe grupul de sloturi la PIN greșit (dezactivat la `prefers-reduced-motion`).
- **Tooltip**: pe pictograma lacăt (opțional), cu textul „Sesiunea a expirat” când venim dintr-o sesiune revocată.

## Stări
- **Inițial:** focus în primul slot; sub sloturi stă doar legătura de ajutor.
- **Verificare:** sloturi dezactivate, Spinner sub ele (fără text, `aria-label="Se verifică PIN-ul"`).
- **PIN greșit, încercări rămase:** shake, sloturile se golesc, mesaj roșu inline cu numărul de încercări rămase *și* durata următoarei blocări („Mai ai 2 încercări înainte de o pauză de 1 minut.”). La ultima încercare tonul devine mai ferm („Ultima încercare înainte de blocare.”).
- **Blocare activă (1 / 5 / 15 / 60 min):** sloturi dezactivate, Alert warning cu cronometru și cu durata următoarei trepte. Valoarea `lockedUntil` vine de la server, deci reîncărcarea paginii nu resetează cronometrul. La 60 de minute adăugăm sugestia de resetare locală.
- **Blocare încheiată:** Alert-ul dispare, sloturile se reactivează, focus automat; mesaj neutru „Poți încerca din nou.” (anunțat `aria-live`).
- **Sesiune expirată / revocată (venit din altă pagină):** linie de context deasupra titlului: „Sesiunea s-a încheiat. Introdu PIN-ul ca să continui.”
- **Eroare de rețea / server oprit:** Alert destructive: „Serverul local nu răspunde.” + buton „Reîncearcă”. Încercarea *nu* se contorizează.
- **Niciun PIN configurat:** redirecționare automată la `/setup`.

## Ecran îngust
- Cardul se transformă în pagină completă, cu gutter de 16 px, fără bordură; conținutul e plasat în treimea superioară, ca tastatura virtuală să nu acopere sloturile.
- Sloturi de minim 44 × 44 px, `inputMode="numeric"` (pe mobil apare tastatura numerică; nu desenăm keypad propriu).
- Cronometrul rămâne pe un singur rând; textul explicativ se rupe sub el.
- Legăturile de ajutor se stivuiesc vertical.

## Microcopy (RO)
- `<title>`: „Autentificare — LexAI”
- Context: „Aplicația e blocată” · Titlu: **„Introdu PIN-ul”**
- Verificare (aria): „Se verifică PIN-ul…”
- Eroare, mai multe încercări: „PIN greșit. Mai ai {n} încercări înainte de o pauză de {durată}.”
- Eroare, o încercare: „PIN greșit. Mai ai o singură încercare înainte de o pauză de {durată}.”
- Blocare, titlu: **„Prea multe încercări greșite”**
- Blocare, corp: „Poți încerca din nou în” + **{mm:ss}** · „Următoarea pauză, dacă greșești din nou: {15 minute}.”
- Blocare de 60 min: „Dacă nu-ți mai amintești PIN-ul, îl poți reseta pe acest Mac cu `pnpm pin:reset`.”
- Deblocare: „Poți încerca din nou.”
- Legături: „Ai uitat PIN-ul?” · „Cum funcționează blocarea?”
- Popover „Ai uitat PIN-ul?”: „PIN-ul nu poate fi recuperat din aplicație. Deschide Terminal în folderul LexAI și rulează:” `pnpm pin:reset` · „Apoi alegi un PIN nou.”
- Popover „Cum funcționează blocarea?”: „După mai multe încercări greșite, accesul se suspendă temporar: 1 minut, apoi 5, 15 și 60 de minute. Contorul se resetează după o autentificare reușită.”
- Sesiune încheiată: „Sesiunea s-a încheiat. Introdu PIN-ul ca să continui.”
- Server oprit: „Serverul local nu răspunde. Verifică dacă LexAI rulează și încearcă din nou.” · Buton: „Reîncearcă”

## Întrebări deschise
- Câte încercări greșite declanșează fiecare treaptă (de ex. 5 → 1 min, apoi 3 → 5 min…)? Microcopy-ul cu „încercări rămase” depinde de această politică, care trebuie expusă de API (`attemptsLeft`, `nextLockoutSeconds`, `lockedUntil`).
- După 60 de minute urmează tot 60 sau o blocare permanentă până la `pnpm pin:reset`?
- Afișăm numărul de încercări rămase de la prima greșeală sau doar când rămân ≤ 2 (ca să nu sugerăm câte încercări are un atacator)? Fiind o aplicație locală, recomandăm afișarea de la prima greșeală.
- Păstrăm `?next=` în URL pentru revenirea după autentificare? Recomandat, doar pentru rute interne.
- Durata sesiunii și „blocarea automată după inactivitate” se configurează în Setări? (vezi `13-setari.md`)
