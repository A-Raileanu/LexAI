# 15 — Utilizare și limite

**Rută / context:** `/utilizare` · destinație din sidebar („Utilizare”), din micro-barele de consum din sidebar și din alertele de limită. · **Scop:** arată cât din abonamentul Claude a fost consumat în ferestrele de 5 ore și de 7 zile, când se resetează fiecare și unde s-au dus tokenii (pe joburi și pe etape), cu un cost estimat echivalent API. · **Ce face utilizatorul aici:** verifică dacă își permite acum un job mare, află ora resetării, vede evoluția consumului în timp, identifică joburile și etapele costisitoare, exportă istoricul.

## Referințe analizate (≥10)

| # | Aplicație | Ecran | Ce preluăm | Ce evităm |
|---|---|---|---|---|
| 1 | Google Gemini | [ecran](https://mobbin.com/screens/1cb3c785-d4df-4a3a-992d-e887d1129667) | Exact modelul nostru: „Current usage” (bară + „Resets at 3:22 PM” + „6% used”) și „Weekly limit” („Resets Jun 15 at 1:22 PM”), plus „Updated just now”. Sobru, fără cifre absolute. | Cardul de upsell „Get 5x more usage”. |
| 2 | Mintlify | [ecran](https://mobbin.com/screens/bace818b-24f4-4136-9a81-b3d176d1556a) | Cardul „Usage overview”: procent + valoare („4% (399 of 10,000)”), bară, „Next reset Jul 20” aliniat în dreapta. | Secțiunile de pachete de credite și overage. |
| 3 | Unify | [ecran](https://mobbin.com/screens/34bc05a5-e664-4772-9308-462fde6a7c01) | Carduri stivuite, fiecare cu bară + „385 / 500 used” + „Ends Aug 18”; tabel cu bară inline per rând. | Accentul portocaliu saturat pe toate barele (culoarea trebuie să semnaleze pragul, nu decorul). |
| 4 | Supabase | [ecran](https://mobbin.com/screens/85ee2458-092c-4d14-8007-1dcdabc74c03) | Layout cu text explicativ în stânga („Usage Summary…”) și grila de metrici în dreapta; indicatori circulari mici; mesajul de stare „You have not exceeded your quota”. | Grila cu 12 metrici (noi avem 2 limite). |
| 5 | Cursor | [ecran](https://mobbin.com/screens/2e1143a1-9301-4d5c-8caf-1426c7ef4501) | Grafic cumulativ pe model + intervale rapide „1d / 7d / 30d” + tabel Date / Type / Model / Tokens / Cost + „Export CSV”. Cel mai apropiat de secțiunea „Joburi”. | Etichetele „MAX” și culorile de serie greu de distins. |
| 6 | OpenAI Platform | [ecran](https://mobbin.com/screens/fe36ec31-b25c-4cf1-9932-85bf66cd89fc) | Total spend + grafic cu bare + coloana dreaptă cu buget („Resets in 28 days”), „Total tokens” și „Total requests” cu sparkline. | Selectorul de interval cu „brush” sub grafic, prea tehnic. |
| 7 | Cofounder | [ecran](https://mobbin.com/screens/e9c05b3d-54e8-44db-9995-15ab9a95078a) | „Billing Receipt” itemizat pe agent, cu „% of period usage” și tokeni pe rând: un model pentru defalcarea pe etape. | Semnele +/- contabile (noi nu facturăm). |
| 8 | Cofounder | [ecran](https://mobbin.com/screens/c60ae2a8-05c4-425a-b74b-157cc9238fb5) | „Token Usage”: total + defalcare Input / Output / Reasoning, fiecare cu bară subțire colorată și procent. | Curba netezită (spline) care sugerează valori inexistente între puncte. |
| 9 | Devin | [ecran](https://mobbin.com/screens/95edc3db-d090-4ab1-9aac-26b3fe90684b) | Pagina „Usage & Limits” cu tab-uri (Overview / Sessions), tabel de sesiuni cu cost și „View session →” pe fiecare rând. | Tab-ul „Reviews”, specific produsului lor. |
| 10 | Grok | [ecran](https://mobbin.com/screens/3712e4c5-f433-484b-bedc-5d3037e75217) | Rândul de sumar „Total · Average · Peak” deasupra graficului, tooltip pe bară, tabel „Usage breakdown” sub grafic. | Tabelul pe zile cu scroll orizontal. |
| 11 | ElevenLabs | [ecran](https://mobbin.com/screens/e7f2ccad-19e6-422a-aecc-a2f2b5608d87) | Tab-uri-KPI deasupra graficului (Credit Usage, Total Cost, Avg. Cost per Request…): un click pe un KPI schimbă metrica graficului. | Graficul cu 10 serii suprapuse. |
| 12 | Krea AI | [ecran](https://mobbin.com/screens/2d00c79e-2813-4ffe-b392-8dab28a0028b) | Plăci KPI (Total Jobs, Compute Units) + „Usage by Tool” cu bară și „% of total usage”. | Donut-ul mare multicolor. |
| 13 | Base44 | [ecran](https://mobbin.com/screens/214cd277-2b79-4f21-917f-1f4e225f07ed) | Antet cu „renew on Sep 12 at 10:59 AM” în subtitlu, bară „86.78 of 100 available”, secțiunea „Daily usage” pliabilă. | Butonul portocaliu „Upgrade plan”. |
| 14 | Braintrust | [ecran](https://mobbin.com/screens/eeca0b54-0262-4eef-8a76-f548fe84a384) | Panoul de detalii al unei rulări: Duration, Total tokens, Prompt / Completion tokens, „Estimated cost <$0.001”, pentru Sheet-ul de job. | Densitatea tabelului de trace-uri (JSON brut în celule). |
| 15 | Sprig | [ecran](https://mobbin.com/screens/83f67504-08a2-499e-823d-03a52c3f28a3) | Starea de limită: banner „You’ve hit one of your limits”, „Resets on Aug 1”, valoarea depășită în roșu în tabel. | Banda galbenă globală + bannerul din pagină (dublură). |
| 16 | StackAI | [ecran](https://mobbin.com/screens/a2976bbf-d4f1-407f-8c56-88779215f037) | Rânduri „Runs usage / Tokens usage” cu text explicativ în stânga și contorul în dreapta („10/1,000 runs in a day”). | Barele segmentate „cod de bare”, greu de citit la valori mici. |
| 17 | Databricks | [ecran](https://mobbin.com/screens/37ec2f4f-8f17-419e-81c3-9fa875cd9cc8) | Chip-ul „Usage last updated: …” care arată prospețimea datelor; comutatorul de unitate „$ USD / DBU”, util pentru „Tokeni / Cost”. | Alerta mare „Legacy” cu text lung. |
| 18 | Firecrawl | [ecran](https://mobbin.com/screens/50c80a42-d8f0-4a23-9f87-76f8a307ccf8) | Skeleton de tabel care păstrează coloanele reale în timpul încărcării. | Decorul ASCII din antet. |

## Tipare comune

- **Limitele ca bare orizontale simple**, cu procent mare și „se resetează la …” imediat sub bară (Gemini, Mintlify, Unify, Base44). Procentul este informația principală; valorile absolute sunt secundare sau lipsesc.
- **Ora resetării exprimată uman:** „Resets at 3:22 PM”, „Resets in 28 days”, „Next reset Jul 20” (Gemini, OpenAI, Mintlify).
- **Indicator de prospețime:** „Updated just now” / „Usage last updated …” (Gemini, Databricks, Stripe).
- **Istoric = un singur grafic** cu interval rapid (1z / 7z / 30z) și sumar Total / Medie / Vârf (Cursor, Grok, OpenAI, Exa). Tab-urile-KPI comută metrica graficului (ElevenLabs).
- **Defalcare „unde s-a dus consumul”** ca listă cu bară proporțională și procent din total (Cofounder, Krea, Writer „Token usage by model”).
- **Tabel de rulări / joburi** sub grafic, cu tokeni, cost și link către detaliu, plus Export CSV (Cursor, Devin, Krea, Gumloop).
- **Starea de limită** este un banner contextual + culoare de prag pe bară/valoare, nu un ecran blocant (Sprig, Rox).
- Paginile sunt **centrate, cu lățime maximă ~960–1100 px**, mult spațiu alb și carduri cu bordură fină (Gemini, Mintlify, Unify, Cofounder).

## Decizia de layout

```
┌ sidebar ┬──────────────────────────────────────────────────────────────────────────┐
│         │  Utilizare                                  Actualizat acum 2 min  [⟳]    │
│         │  Limitele abonamentului Claude și consumul joburilor LexAI               │
│         │                                                                          │
│         │  ┌───────────────────────────────────┐ ┌───────────────────────────────┐ │
│         │  │ Fereastra de 5 ore                 │ │ Fereastra de 7 zile           │ │
│         │  │ 34 %  utilizat                     │ │ 12 %  utilizat                │ │
│         │  │ ███████░░░░░░░░░░░░░░              │ │ ██░░░░░░░░░░░░░░░░░░          │ │
│         │  │ Se resetează la 17:40 · în 2 h 13 min│ │ Se resetează joi, 6 nov., 09:00│ │
│         │  └───────────────────────────────────┘ └───────────────────────────────┘ │
│         │                                                                          │
│         │  Istoric                                      [24 h | 7 zile | 30 zile]  │
│         │  ┌────────────┬────────────┬──────────────┬───────────────────────────┐  │
│         │  │ Limita 5 h │ Limita 7 z │ Tokeni 2,4 M │ Cost echiv. API ≈ 18,40 $ │  │
│         │  ├────────────┴────────────┴──────────────┴───────────────────────────┤  │
│         │  │   grafic (arie pentru % limită / bare pentru tokeni și cost)       │  │
│         │  │   ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄ 100 % ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │  │
│         │  └────────────────────────────────────────────────────────────────────┘  │
│         │                                                                          │
│         │  Pe etape                                    (aceeași perioadă)          │
│         │  Verificare temeiuri  ████████████░░░  52 %   1,2 M tok   ≈ 9,60 $        │
│         │  Redactare (agent)    █████░░░░░░░░░░  24 %   580 k tok   ≈ 4,40 $        │
│         │  Extragere text       ███░░░░░░░░░░░░  14 %   340 k tok   ≈ 2,60 $        │
│         │  Raport / export      ██░░░░░░░░░░░░░  10 %   240 k tok   ≈ 1,80 $        │
│         │                                                                          │
│         │  Joburi                         [⌕ Caută] [Tip ▾] [Stare ▾] [Exportă CSV] │
│         │  Data        Job                    Proiect       Durată  Tokeni   Cost  ●│
│         │  azi 14:20   Analiză · Cerere…      Ionescu SRL   1m 40s  182 k  ≈1,40 $ ✓│
│         │  azi 11:02   Generare · Notificare  Pop c. Stan   2m 14s   48 k  ≈0,38 $ ✓│
│         │  ieri 17:45  Analiză · Contract…    Alfa Constr.  0m 32s   12 k  ≈0,09 $ ✕│
└─────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Zone și ierarhie**

1. **Antet:** titlul „Utilizare”, subtitlul explicativ și, în dreapta, indicatorul de prospețime „Actualizat acum 2 min” + butonul de reîmprospătare (Spinner în timpul citirii). Conținutul este centrat, cu lățime maximă de ~1100 px.
2. **Cele două limite (primar, deasupra liniei de pliere):** două Card-uri egale, unul lângă altul.
   - Titlu („Fereastra de 5 ore” / „Fereastra de 7 zile”), procent mare (Number flow, 32–40 px, cifre tabulare), Progress gros de 8 px și ora resetării în format absolut + relativ.
   - Praguri de culoare: neutru < 70 %; chihlimbar 70–89 %; roșu ≥ 90 %. Culoarea se aplică doar barei și procentului.
   - Un Tooltip „ⓘ” explică faptul că limitele aparțin abonamentului Claude și includ orice altă utilizare a contului (de exemplu, Claude.ai), nu doar LexAI.
3. **Istoric (secundar):** Tabs folosite ca plăci KPI (model ElevenLabs), fiecare cu valoarea pe perioada aleasă; tab-ul activ decide graficul.
   - *Limita 5 h* și *Limita 7 z*: grafic de arie cu % utilizat în timp, cu o linie punctată la 100 % și marcaje verticale la resetări.
   - *Tokeni*: bare pe oră sau zi, stivuite input / output / cache.
   - *Cost echivalent API*: bare pe zi.
   - Toggle group pentru interval (24 h / 7 zile / 30 zile) și Date picker pentru un interval personalizat (în meniu).
4. **Pe etape (secundar):** listă ordonată descrescător, cu bară proporțională, procent din total, tokeni și cost estimat (model Cofounder / Krea). Un click pe o etapă filtrează tabelul de joburi.
5. **Joburi (terțiar, analitic):** Data table cu Data, Job (tip + document), Proiect, Durată, Tokeni (total; Tooltip cu input / output / cache), Cost echivalent API, Stare. Are căutare, filtre Tip / Stare, Pagination și „Exportă CSV”.
   - Un click pe rând deschide un **Sheet** cu: etapele jobului (cronologie: etapă, model, durată, tokeni in/out, cost), totalurile, procentul din fereastra 5 h consumat de job (dacă îl putem calcula) și link spre documentul / analiza rezultată.
6. **Notă de subsol permanentă (mică, gri):** „Costul echivalent API este o estimare pe baza prețurilor publice per token. Abonamentul nu se facturează per token.”

## Componente HextaUI

- **Card**: cele două limite; containerele secțiunilor.
- **Number flow**: procentele mari și totalurile KPI (animație la reîmprospătare).
- **Progress**: barele de limită și barele din „Pe etape”.
- **Chart**: istoricul (arie pentru %, bare pentru tokeni / cost), cu tooltip și linie de referință la 100 %.
- **Tabs**: plăcile KPI care comută metrica graficului.
- **Toggle group**: intervalul (24 h / 7 zile / 30 zile).
- **Date picker** + **Popover**: intervalul personalizat.
- **Data table** + **Pagination**: lista de joburi.
- **Input group**, **Select**: căutare și filtre în tabelul de joburi.
- **Sheet**: detaliul unui job pe etape.
- **Badge**: starea jobului (Finalizat / Eșuat / Anulat / În așteptare), eticheta „estimare”.
- **Tooltip** / **Hover card**: explicațiile „echivalent API”, defalcarea tokenilor, ora exactă a resetării.
- **Button** + **Spinner**: „Reîmprospătează” și „Exportă CSV”.
- **Alert**: limită atinsă / aproape atinsă; citirea limitelor a eșuat.
- **Skeleton**: cardurile de limită, graficul, tabelul.
- **Empty**: istoric gol / fără joburi.
- **Separator** / **Hairline**: separarea secțiunilor.
- **Toast**: „Export CSV pregătit”.

## Stări

- **Gol (niciun job încă):** cardurile de limită se afișează normal, pentru că valorile vin din abonament. Istoricul și „Pe etape” arată Empty: „Încă nu există joburi LexAI. Consumul apare aici după prima analiză sau generare.” Tabelul de joburi este ascuns.
- **Încărcare:** Skeleton în forma cardurilor (procent + bară + linie), Skeleton pentru grafic, 6 rânduri Skeleton pentru tabel (model Firecrawl). Limitele și istoricul se încarcă independent.
- **Reîmprospătare:** valorile vechi rămân vizibile, iar butonul ⟳ afișează Spinner. Number flow animă tranziția.
- **Eroare la citirea limitelor** (CLI nelogat, offline, format necunoscut): Alert chihlimbar deasupra cardurilor, „Nu am putut citi limitele abonamentului.”, cu motivul pe scurt și acțiunile **Reîncearcă** · **Deschide terminalul**. Cardurile arată ultima valoare cunoscută, estompată, cu „ultima citire acum 3 h”. Istoricul local (joburi, tokeni) funcționează în continuare.
- **Date învechite (> 15 min):** chip-ul „Actualizat acum 22 min” devine chihlimbar.
- **Aproape de limită (≥ 90 % pe oricare fereastră):** bara și procentul devin roșii, iar sub card apare textul „Joburile mari pot fi întrerupte. Resetare la 17:40.”
- **Limită atinsă (100 %):** Alert roșu sus, „Ai atins limita de 5 ore. Joburile noi așteaptă până la 17:40 (în 48 min).”, cu link **Vezi joburile în așteptare**. Joburile afectate au Badge „În așteptare” în tabel. Aceeași stare se reflectă în micro-barele din sidebar.
- **Job eșuat din cauza limitei:** Badge „Eșuat · limită” + Tooltip cu ora la care poate fi reluat; în Sheet apare butonul **Reia la resetare**.

## Ecran îngust

- **< 1024 px:** cardurile de limită rămân două pe rând dacă au ≥ 300 px fiecare; altfel se stivuiesc. Plăcile KPI devin derulabile orizontal.
- **< 768 px:**
  - Cardurile de limită se stivuiesc pe toată lățimea; procentul și ora resetării rămân primele elemente vizibile.
  - Graficul își păstrează înălțimea (~200 px); axa X afișează mai puține etichete.
  - Toggle group-ul de interval devine Select.
  - „Pe etape” se reduce la nume + bară + procent; tokenii și costul apar în Tooltip.
  - Tabelul de joburi devine o listă de Item-uri: „Analiză · Cerere de chemare”, sub el „Ionescu SRL · azi 14:20 · 182 k tok · ≈ 1,40 $”, iar dreapta iconița de stare. Detaliul se deschide în Drawer.
- „Exportă CSV” intră în meniul ⋯ din antet.

## Microcopy (RO)

- Titlu: **Utilizare** · subtitlu: „Limitele abonamentului Claude și consumul joburilor LexAI”.
- Prospețime: „Actualizat acum 2 min” · Tooltip ⟳: „Citește din nou limitele”.
- Carduri: **Fereastra de 5 ore** / **Fereastra de 7 zile** · „34 % utilizat” · „Se resetează la 17:40 · în 2 h 13 min” · „Se resetează joi, 6 nov., 09:00”.
- Tooltip ⓘ: „Limitele aparțin abonamentului tău Claude și includ și utilizarea din alte aplicații Claude, nu doar din LexAI.”
- Secțiuni: **Istoric** · **Pe etape** · **Joburi**.
- Interval: **24 h** · **7 zile** · **30 zile** · **Interval personalizat…**
- KPI: „Limita 5 h” · „Limita 7 z” · „Tokeni” · „Cost echivalent API”.
- Sumar grafic: „Total · Medie pe zi · Vârf”.
- Etape: „Extragere text” · „Identificare trimiteri” · „Verificare temeiuri” · „Redactare (agent)” · „Raport / export”.
- Coloane joburi: **Data** · **Job** · **Proiect** · **Durată** · **Tokeni** · **Cost echiv. API** · **Stare**.
- Stări job: **Finalizat** · **Eșuat** · **Anulat** · **În curs** · **În așteptare**.
- Sheet job: titlu „Analiză · Cerere de chemare în judecată” · „Etape” · „Total: 182 mii tokeni (in 150 k · out 32 k) · ≈ 1,40 $ echivalent API” · **Deschide analiza**.
- Butoane: **Exportă CSV** · **Reîncearcă** · **Deschide terminalul**.
- Notă: „Costul echivalent API este o estimare pe baza prețurilor publice per token. Abonamentul nu se facturează per token.”
- Aproape de limită: „Aproape de limită. Joburile mari pot fi întrerupte. Resetare la 17:40.”
- Limită atinsă: „Ai atins limita de 5 ore. Joburile noi așteaptă până la 17:40 (în 48 min).” · **Vezi joburile în așteptare**.
- Eroare: „Nu am putut citi limitele abonamentului. Verifică dacă Claude CLI este autentificat.” · „Ultima citire: acum 3 h”.
- Gol: „Încă nu există joburi LexAI. Consumul apare aici după prima analiză sau generare.”
- Formatare numere: separator zecimal virgulă („1,40”), mii cu spațiu sau „k / M” în tabel („182 k”), procent cu spațiu („34 %”).

## Întrebări deschise

- De unde citim limitele 5 h / 7 z (comandă CLI, endpoint, fișier local) și cât de des putem interoga fără să consumăm? Răspunsul stabilește intervalul de reîmprospătare automată.
- Istoricul procentelor există la sursă, sau trebuie să-l eșantionăm noi (ex.: la fiecare 10 min când aplicația e deschisă)? Dacă îl eșantionăm noi, pot exista goluri, care trebuie marcate în grafic.
- Afișăm costul în USD (prețul public) sau convertit în RON? Recomandarea: USD cu simbolul „$” și eticheta „estimare”, cu conversie opțională în Setări.
- Putem atribui unui job procentul consumat din fereastra de 5 h (diferența înainte/după), sau doar tokenii?
- Ce etape fixe are pipeline-ul (lista din „Pe etape”), și sunt aceleași pentru analiză și pentru generare?
- Includem în tabel și sesiunile din terminalul Claude CLI, sau doar joburile LexAI?
- Este nevoie de o alertă proactivă (toast) la 80 % / 90 %, pe lângă culoarea barelor din sidebar?
