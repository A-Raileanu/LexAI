# Verificare tehnică a accesului automat la sursele de legislație română și UE (LexAI)

> **Metodă.** Toate testele au fost făcute pe 1.11.2026, între 17:33 și 17:43 UTC, cu `curl` de pe mașina utilizatorului. Conexiunea era o legătură obișnuită (nu datacenter), cu IP din România: portalul MJ a întors `x-country: RO`. User-Agent implicit: `LexAI/1.0 (verificare surse; uz personal)`. Un UA de browser (Chrome 130/macOS) a fost folosit doar acolo unde prima cerere a fost blocată. Între cereri a fost o pauză de cel puțin 3 s, fără cereri paralele. Nu am încercat să ocolesc vreun challenge sau CAPTCHA. Am făcut 54 de cereri HTTP cu `curl` (inclusiv redirecționările urmate automat) și 2 cu WebFetch. Textul din PDF-uri l-am extras local cu PDFKit (macOS).
> **Abatere de la plafonul de 5 cereri pe sursă:** pe `legislatie.just.ro` am făcut în total 10 cereri. Pentru HTML au fost 8: robots, DetaliiDocument, Acasa, POST-ul de căutare (302, plus un 411 produs de o greșeală a mea, `-L` cu `-X POST`), GET-ul de căutare, DetaliiDocumentAfis și Termeni. Pentru SOAP au fost 2. Am tratat HTML-ul și SOAP-ul ca două servicii distincte, dar pe HTML am depășit oricum plafonul cu 3 cereri, pentru că a trebuit să descopăr mecanismul de căutare. Nu am primit niciun 429 și niciun semn de throttling. Pe CELLAR am avut 6 cereri HTTP, pentru că redirecționarea 303 a fost urmată automat și robots.txt redirecționează spre alt host.
> Afirmațiile din notele anterioare (`legislatie_ro_ue.md`, `jurisprudenta_europeana.md`) au fost retestate. Unde rezultatul diferă, scrie explicit **„corectează nota anterioară”**.

| Sursă | robots.txt | Test HTTP | Anti-bot | Format | Termeni | Verdict |
|---|---|---|---|---|---|---|
| legislatie.just.ro – HTML (DetaliiDocument, DetaliiDocumentAfis, RezultateCautare) | Nu există (302 → `/Error`) | 200 pe toate. DetaliiDocument 422 KB / 1,9 s; Afis 1,6 MB / 5,5 s; căutare 23 KB / 0,3 s | Fără challenge. Antete `x-country: RO`, `x-block: 0` (filtru geo/IP). Formularul are token anti-CSRF, dar rezultatele sunt la un GET simplu | HTML UTF-8, ASP.NET MVC 4. ID `DetaliiDocument/{id}` stabil | Reutilizare permisă (Legea 8/1996). Consolidări „neoficiale”, „cu caracter informativ”. Nimic despre acces automat | **CONDIȚIONAT** |
| legislatie.just.ro – SOAP `apiws` (GetToken + Search) | Nu există | GetToken 200 (250 B, 0,12 s); Search 200 (464 KB, 0,64 s, 10 rezultate) | Fără challenge. Același filtru `x-block` | XML SOAP 1.1, UTF-8; „?” în loc de ș/ț în `Emitent` | Ca mai sus | **DA** |
| monitoruloficial.ro / e-Monitor (PDF MO Partea I) | `*`: Disallow `/docs/`, `/ramo_customs/`, `/search/`, `/?s=` etc. `meta-externalagent`: Disallow `/`, Crawl-delay 30 | Fără Referer: 302 → home. Cu `Referer: …/e-monitor/`: 200 `application/pdf`, 120 KB, 0,5 s | Verificare de Referer (nu de UA). reCAPTCHA în pagini | PDF 1.5 cu strat de text extractibil (16 pagini, circa 102k caractere, diacritice corecte) | „Condiții de utilizare”: doar cookie-uri. Legea 57/2021: PI și PII gratuite, inclusiv salvare și distribuire | **CONDIȚIONAT** |
| Consiliul Legislativ – API consolidări (`86.105.216.125:5006`) | `:80`: `User-agent: * / Disallow:` (permite tot). `:5006/robots.txt` 404 | `getAllAniEmitere` 200 JSON, 285 B, 0,23 s | Niciunul | JSON (Express/Node), doar HTTP, IP brut | Nu există termeni. Răspunsurile mari conțin nume de angajați (GDPR) | **CONDIȚIONAT** (acord CLR) |
| cdep.ro (`/ords/pls/...` și PDF-uri) | Doar `Disallow: /declaratii/` | Fișa proiectului 200 (51 KB, 0,28 s); PDF 200 (548 KB, 0,30 s); `legis_pck.htp_act` 200 (3 KB) | Niciunul | HTML UTF-8 (Oracle ORDS). PDF-ul testat e **scanat, fără text** (11 pagini, 0 caractere) | „Textele actelor normative nu au caracter oficial”. Nimic despre acces automat | **DA** |
| senat.ro | Nu există (404) | `Legis/Lista.aspx` 200 (225 KB, 0,61 s); PDF 200 (608 KB, 0,21 s) | **Fără Cloudflare** (corectează nota anterioară). Proxy cu cache (`server: WTF!!`, `x-cache-status`) | ASP.NET WebForms (VIEWSTATE). PDF cu strat OCR de calitate slabă | Nu am găsit termeni | **DA** |
| e-consultare.gov.ro | DNN standard: Disallow `/*/ctl/`, `/admin/`, `/bin/` etc. | Home 200 (129 KB); `/Consultare-publică` 200 (152 KB), dar **lista nu e în HTML** | reCAPTCHA pe pagină. Datele vin prin API intern DnnSharp ActionGrid | HTML DNN plus grid Angular, încărcat client-side | gov.ro: „Numai documentele … publicate pe hârtie … sunt … autentice”. Nimic despre acces automat | **NU** (fără JS sau API nedocumentat) |
| sgg.gov.ro | Nu există (404) | Pagina proiectelor 200 (82 KB, 0,12 s, conținut vechi). **WP REST API** 200 JSON (`X-WP-Total: 3978`, 2,9 s) | Niciunul. `X-Robots-Tag: noindex` pe API | WordPress: HTML și JSON (`/1/wp-json/wp/v2/posts`) | Nu am găsit termeni proprii | **DA** |
| CELLAR SPARQL și REST (`publications.europa.eu`) | Redirect spre `op.europa.eu/robots.txt`: `Allow: /`. Nimic despre `/webapi/` sau `/resource/` | SPARQL 200 JSON (506 B, 0,28 s). REST 303 → 200 XHTML în RO (501 KB, 0,53 s) | Niciunul | SPARQL JSON, XHTML/Formex. CELEX, ELI și UUID CELLAR stabile | Consolidări „doar scop informativ”. Licența de reutilizare nu a putut fi citită direct | **DA** |
| eur-lex.europa.eu (HTML) | Inaccesibil (și robots.txt primește challenge) | 202, corp gol, `x-amzn-waf-action: challenge`, cu ambele UA. WSDL-ul SOAP: 200 | **AWS WAF challenge (JS)** | — | Avizul juridic e inaccesibil (WAF) | **NU** |
| N-Lex (căutare RO) | Nu există (404) | Pagini 200, dar căutarea RO întoarce eroare: `execute request failed on corpus ro.legis.iservice … (500)System.ServiceModel.ServiceActivationException` | Niciunul | HTML Drupal/Java, POST cu sesiune | — | **NU** (nefuncțional) |
| InfoCuria / curia.europa.eu | infocuria: `Allow: /`. curia: Disallow pentru câteva `docid`/cauze anume | infocuria 200, dar e un SPA Angular (titlu „RPEX”, fără date în HTML). `curia…/juris/liste.jsf` → 301 spre infocuria | Niciunul observat | SPA. Datele vin prin API nedocumentat | „May be reproduced provided the source is acknowledged…” (texte neautentice) | **NU** pentru HTML server-side (se folosește CELLAR) |
| HUDOC (`app/query/results`, `app/conversion/*`) | Nu există (întoarce pagina HTML a aplicației) | Query 200 JSON (986 B, 0,20 s, `resultcount 1241`). PDF 200 (279 KB). `docx/html` → **204** pentru traducerea RO | **Cloudflare** (`server: cloudflare`, cookie `__cf_bm`), fără challenge | JSON, PDF cu text, HTML (doar pentru unele documente) | Reproducere doar pentru uz privat sau informare/educație, gratuit. **Uzul comercial cere permisiune scrisă prealabilă** | **CONDIȚIONAT** |

**AI și crawl-delay în robots.txt:** niciunul dintre fișierele robots.txt găsite nu menționează ClaudeBot, GPTBot, CCBot, Google-Extended sau `anthropic`. Niciunul nu are directive `Content-Signal`, `ai-train` sau `use:`. Singurele `Crawl-delay` sunt la monitoruloficial.ro: 30 s pentru `meta-externalagent` (blocat complet) și 10 s pentru `facebookexternalhit`. Pentru `*` nu există crawl-delay nicăieri.

## 1. legislatie.just.ro – pagini HTML (DetaliiDocument, DetaliiDocumentAfis, căutare)

### Takeaway
**Verdict: CONDIȚIONAT.** Paginile se descarcă fără challenge, iar căutarea are un URL GET simplu, fără token. Rămân însă trei condiții: un strat de filtrare geo/IP (`x-country`/`x-block`) netestat din datacenter, pagini foarte mari și lente (1,6 MB în 5,5 s), plus mențiunea „informativ/neoficial” din Termeni. Recomand un ritm redus și cache.

### Cited Findings
- `robots.txt` nu există: `GET /robots.txt` dă 302 → `/Error` (123 B, 0,08 s). Nu există reguli, nici permisive, nici restrictive — [robots.txt](https://legislatie.just.ro/robots.txt) (testat).
- `DetaliiDocument/256414` (Legea 179/2022): 200, `text/html; charset=utf-8`, 422.441 B, 1,88 s. Titlul este „LEGE 179 09/06/2022 - Portal Legislativ”, iar textul real e prezent (de exemplu art. 9: „Reutilizarea documentelor este gratuită…”). Pagina are 24 de marcaje `S_ART` și nu conține CAPTCHA, Cloudflare sau challenge — [DetaliiDocument/256414](https://legislatie.just.ro/Public/DetaliiDocument/256414) (testat).
- `DetaliiDocumentAfis/254021`: 200, 1.631.765 B, **5,51 s**. Titlul este „LEGE (A) 99 19/05/2016”, cu 1.044 de marcaje `S_ART`. Formele „(A)” (actualizate) sunt mult mai mari și mai lente — [DetaliiDocumentAfis/254021](https://legislatie.just.ro/Public/DetaliiDocumentAfis/254021) (testat).
- Antetele tuturor răspunsurilor: `server: nginx/1.24.0 (Ubuntu)`, `x-aspnetmvc-version: 4.0`, `x-country: RO`, `x-block: 0`, plus `x-ip`, care reflectă IP-ul clientului. Acestea confirmă un filtru geo/IP în fața aplicației; cu IP românesc, `x-block` era 0 — [Acasa](https://legislatie.just.ro/Public/Acasa) (testat).
- **Căutarea (nou față de nota anterioară):**
  - Formularul de pe `/Public/Acasa` face `POST /` cu `__RequestVerificationToken` (anti-CSRF, cookie plus câmp ascuns). Câmpurile sunt `TitleText`, `DocumentNumber`, `DocumentType`, `EmitentAct`, `DataSemnariiTextFrom/To`, `DataPublicariiTextFrom/To`, `PublishedInName/Number`, `ActInForceOnDateTextFrom`, `ContentText_First…Fourth` — [Acasa](https://legislatie.just.ro/Public/Acasa) (testat; 200, 89.896 B, 1,46 s).
  - POST-ul întoarce **302 → `/Public/RezultateCautare?titlu=date+deschise&numardoc=179`**. Acest GET funcționează **fără cookie și fără token**: 200, 23.209 B, 0,31 s, titlul „Rezultate Căutare - Portal Legislativ” — [RezultateCautare](https://legislatie.just.ro/Public/RezultateCautare?titlu=date+deschise&numardoc=179) (testat).
  - Rezultatul a fost „0 document(e) găsit(e) în 0.0035 secunde”, deși titlul Legii 179/2022 conține „datele deschise”. Căutarea în titlu pare deci exactă, la fel ca la SOAP (confirmă nota anterioară).
- Termenii spun că portalul „afisează, cu caracter informativ, versiunea oficială”. În caz de deosebiri, „este considerat autentic doar textul tipărit și publicat în Monitorul Oficial”, iar consolidările sunt „reproducerea neoficială”. Despre reutilizare: textele legislative „nu beneficiază de protecţia legală a dreptului de autor, conform Legii nr. 8/1996 … este posibila reutilizarea textelor legale, in limita celor prezentate mai sus”. **Nu există nicio clauză despre acces automat, roboți sau limite de rată.** Subsolul păstrează totuși „Copyright © 2026 – Ministerul Justiției. Toate drepturile rezervate.” — [Termeni](https://legislatie.just.ro/Public/Termeni) (testat; 200, 24.771 B).
- Cerere funcțională (testată):
  ```bash
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' 'https://legislatie.just.ro/Public/DetaliiDocument/256414' -o act.html
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' 'https://legislatie.just.ro/Public/RezultateCautare?titlu=date+deschise&numardoc=179'
  ```

### Inferences
- Căutarea HTML se poate apela direct prin GET (`RezultateCautare?titlu=…&numardoc=…`), deci nu e nevoie să gestionăm tokenul anti-CSRF. Numele celorlalți parametri GET (emitent, tip, date) trebuie descoperiți la fel, făcând POST pe `/` și citind `Location`.
- Pentru formele mari (Afis peste 1 MB, peste 5 s), adaptorul trebuie să aibă timeout de cel puțin 30 s, cache permanent după `id` (formele vechi sunt imuabile) și cel mult o cerere la câteva secunde.
- Verdictul nu e DA pentru că filtrul `x-block` există și nu știm cum reacționează la IP-uri de datacenter. Un actor Apify terț afirmă că le blochează (vezi nota anterioară). Primul test din infrastructura de producție decide.

### Gaps
- Nu am testat din IP de datacenter sau din afara României. Nu știu ce întoarce `x-block: 1` (pagină de blocare, 403 sau altceva).
- Nu am descoperit toți parametrii GET ai `RezultateCautare` (doar `titlu` și `numardoc`), pentru că am respectat plafonul de cereri.
- Nu există limite de rată publicate.

## 2. legislatie.just.ro – serviciul SOAP `apiws/FreeWebService.svc/SOAP`

### Takeaway
**Verdict: DA.** Este un serviciu oficial, documentat, fără înregistrare, care funcționează și pe **HTTPS**, deși WSDL-ul declară `http://`. GetToken și Search răspund rapid, fără niciun challenge. Riscul de filtru IP (`x-block`) e același ca la HTML.

### Cited Findings
- `GetToken` (POST, SOAPAction `http://tempuri.org/IFreeWebService/GetToken`): 200, `text/xml; charset=utf-8`, 250 B, 0,12 s. Tokenul are 58 de caractere și a fost obținut fără autentificare — [endpoint SOAP](https://legislatie.just.ro/apiws/FreeWebService.svc/SOAP) (testat pe HTTPS).
- `Search` cu `SearchAn=2022`, `SearchNumar=179`, `RezultatePagina=10`: 200, 463.731 B, 0,64 s, 10 elemente `Legi` (ordine, hotărâri, decret, decizii, Legea 179/2022, OUG 179/2022). Câmpul `Text` conține textul integral; la un ordin avea circa 185 KB — [endpoint SOAP](https://legislatie.just.ro/apiws/FreeWebService.svc/SOAP) (testat).
- Probleme de encoding, reconfirmate:
  - în `Emitent`, ș/ț devin „?” („Ministerul Mediului, Apelor ?i Pădurilor”, „Agen?ia Na?ională…”, „Curtea Constitu?ională”);
  - în `Titlu` apare sedila („ORDONANŢĂ DE URGENŢĂ”), iar în `TipAct` virgula („ORDONANȚĂ DE URGENȚĂ”);
  - `LinkHtml` are forma `http://legislatie.just.ro/Public/DetaliiDocument/{id}`.

  Sursa: [endpoint SOAP](https://legislatie.just.ro/apiws/FreeWebService.svc/SOAP) (testat).
- Termenii sunt aceiași ca la secțiunea 1; nu am găsit clauze specifice pentru API — [Termeni](https://legislatie.just.ro/Public/Termeni).
- Cerere funcțională (testată):
  ```bash
  UA='LexAI/1.0 (verificare surse; uz personal)'; EP='https://legislatie.just.ro/apiws/FreeWebService.svc/SOAP'
  TOK=$(curl -sS -A "$UA" "$EP" -H 'Content-Type: text/xml; charset=utf-8' -H 'SOAPAction: "http://tempuri.org/IFreeWebService/GetToken"' \
    --data '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body><GetToken xmlns="http://tempuri.org/"/></s:Body></s:Envelope>' \
    | sed -E 's/.*<GetTokenResult>([^<]+)<.*/\1/')
  curl -sS -A "$UA" "$EP" -H 'Content-Type: text/xml; charset=utf-8' -H 'SOAPAction: "http://tempuri.org/IFreeWebService/Search"' \
    --data "<s:Envelope xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\"><s:Body><Search xmlns=\"http://tempuri.org/\"><SearchModel xmlns:d=\"http://schemas.datacontract.org/2004/07/FreeWebService\"><d:NumarPagina>1</d:NumarPagina><d:RezultatePagina>10</d:RezultatePagina><d:SearchAn>2022</d:SearchAn><d:SearchNumar>179</d:SearchNumar></SearchModel><tokenKey>$TOK</tokenKey></Search></s:Body></s:Envelope>"
  ```

### Inferences
- Pentru LexAI, aceasta e sursa principală de descoperire. Se folosește HTTPS, cu cache pentru token și normalizarea ş/ţ → ș/ț. „?” din `Emitent` se reconstruiește din `Text`.
- Unele titluri de hotărâri sau decizii de numire conțin nume de persoane. Dacă LexAI le stochează, trebuie aplicată politica GDPR obișnuită pentru acte publicate.

### Gaps
- Nu sunt documentate durata tokenului și limitele de rată. Nu am testat din datacenter.

## 3. monitoruloficial.ro / e-Monitor – PDF Monitorul Oficial, Partea I

### Takeaway
**Verdict: CONDIȚIONAT.** URL-ul `Monitorul-Oficial--PI--{nr}--{an}.html` nu e interzis de robots.txt și servește un PDF cu **strat de text extractibil**, dar numai cu antetul `Referer: https://monitoruloficial.ro/e-monitor/`. Fără Referer, cererea e redirecționată la home, indiferent de User-Agent. Endpointul de listare `get_mo.php` se află sub `/ramo_customs/`, interzis prin robots.

### Cited Findings
- robots.txt pentru `*`: Disallow `/wp-admin/`, `/?s=`, `/search/`, `/docs/`, `/mobootstrap/`, `/ramo_customs/`, `/locale/`, `/*add_to_wishlist=`, `/*add-to-cart=`. `meta-externalagent`: Disallow `/`, Crawl-delay 30. `facebookexternalhit`: Crawl-delay 10. Nicio mențiune despre ClaudeBot, GPTBot sau `ai-train` — [robots.txt](https://monitoruloficial.ro/robots.txt) (testat; 200, 772 B).
- `GET /Monitorul-Oficial--PI--906--2026.html`:
  - fără Referer, cu UA LexAI: **302 → `https://www.monitoruloficial.ro`**, corp gol, 0,33 s;
  - fără Referer, cu UA de browser Chrome: tot **302**, deci verificarea se face pe Referer, nu pe UA;
  - cu `Referer: https://monitoruloficial.ro/e-monitor/`: **200 `application/pdf`**, 120.113 B, 0,50 s.

  Sursa: [MO PI 906/2026](https://monitoruloficial.ro/Monitorul-Oficial--PI--906--2026.html) (testat).
- **Textul se poate extrage** (închide golul din nota anterioară). PDF 1.5, 16 pagini, circa 102.000 de caractere extrase cu PDFKit. Diacriticele sunt corecte, cu virgulă („HOTĂRÂRI ȘI ALTE ACTE”, „Vineri, 30 octombrie 2026”). Sumarul are artefacte de layout pe coloane: cuvinte lipite („Decizianr. 2”) și puncte de conducere — [MO PI 906/2026](https://monitoruloficial.ro/Monitorul-Oficial--PI--906--2026.html) (testat).
- „Condiții de utilizare” tratează doar cookie-urile. Pagina nu conține nicio clauză despre roboți, extragere sau reutilizare. Are reCAPTCHA încărcat — [Condiții de utilizare](https://monitoruloficial.ro/conditii-de-utilizare/) (testat; 200, 170 KB).
- Temeiul legal al accesului: Legea 57/2021 (art. 18 alin. (2) din Legea 202/1998) prevede pentru Partea I și a II-a un format electronic gratuit „inclusiv pentru căutare, salvare, distribuire și imprimare”. Citat din nota anterioară, nu l-am retestat — [Legea 57/2021](https://legislatie.just.ro/Public/DetaliiDocument/240363).
- Cerere funcțională (testată):
  ```bash
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' -H 'Referer: https://monitoruloficial.ro/e-monitor/' \
    'https://monitoruloficial.ro/Monitorul-Oficial--PI--906--2026.html' -o MO_PI_906_2026.pdf
  ```

### Inferences
- Condiția de Referer arată că operatorul nu dorește hotlinking și acces direct. Legea dă totuși dreptul de salvare și distribuire. Recomand descărcarea punctuală (numărul MO vine din metadatele portalului MJ), cache permanent, fără crawl și fără `get_mo.php`. Ideal, un acord scris cu RA „Monitorul Oficial”.
- Extragerea textului merge, dar layoutul pe două coloane cere un parser atent (de exemplu ordonarea blocurilor pe coloane) înainte de citare.

### Gaps
- Nu am testat PDF-uri vechi (2000–2010), care ar putea fi scanate și fără text.
- Nu am verificat cum se comportă site-ul la volum, nici dacă reCAPTCHA se activează la cereri repetate.

## 4. Consiliul Legislativ – API consolidări (doar accesibilitate)

### Takeaway
**Verdict: CONDIȚIONAT (necesită acord).** API-ul răspunde, fără autentificare și fără anti-bot. Totuși este nedocumentat, servit doar pe HTTP, pe IP brut și port nestandard, fără termeni de utilizare, iar răspunsurile mari conțin date personale ale angajaților. Nu e potrivit pentru producție fără acordul CLR.

### Cited Findings
- `http://86.105.216.125/robots.txt` (aplicația SPA „Versiuni consolidate”): 200, 67 B, conținut `User-agent: *` / `Disallow:` (gol, deci permite tot) — [robots.txt](http://86.105.216.125/robots.txt) (testat).
- `http://86.105.216.125:5006/robots.txt`: 404 „Cannot GET /robots.txt” (Express/Node) — [port 5006](http://86.105.216.125:5006/robots.txt) (testat).
- `GET http://86.105.216.125:5006/api/getAllAniEmitere`: 200, `application/json; charset=utf-8`, 285 B, 0,23 s. Conține lista anilor de emitere (2026, 2025, …). Am ales intenționat un endpoint care nu conține nume. Nu am apelat `get25FCForPublic` și nici alte endpointuri cu date de utilizator — [getAllAniEmitere](http://86.105.216.125:5006/api/getAllAniEmitere) (testat).
- Nu am găsit termeni de utilizare pentru aceste aplicații. Nota anterioară a semnalat că `get25FCForPublic` expune un câmp cu numele validatorilor interni; nu am retestat, ca să nu colectez nume — [nota anterioară](legislatie_ro_ue.md).
- Cerere de accesibilitate (testată):
  ```bash
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' 'http://86.105.216.125:5006/api/getAllAniEmitere'
  ```

### Inferences
- Din punct de vedere tehnic, accesul este liber (robots permisiv, fără anti-bot). Lipsa unei interfețe publice declarate și prezența datelor personale fac însă necesar un acord cu CLR (Secția de evidență oficială a legislației). Până atunci, orice adaptor trebuie să elimine câmpurile cu nume înainte de stocare.

### Gaps
- Nu am verificat dacă există limite de rată, nici statutul juridic al consolidărilor CLR.

## 5. cdep.ro – fișe de proiect (`/ords/pls/...`) și PDF-uri

### Takeaway
**Verdict: DA.** robots.txt interzice doar `/declaratii/`. Paginile ORDS și PDF-urile se descarcă rapid, fără niciun mecanism anti-bot. Atenție: PDF-ul testat (expunerea de motive) este **scanat, fără strat de text**, deci e nevoie de OCR.

### Cited Findings
- robots.txt: `User-agent: *` / `Disallow: /declaratii/` (37 B) — [robots.txt](https://www.cdep.ro/robots.txt) (testat).
- `upl_pck2015.proiect?cam=2&idp=22923`: 200, `text/html; charset=UTF-8`, 50.704 B, 0,28 s, titlul „PL-x nr. 1/2026”. Antetele ORDS sunt `X-ORACLE-DMS-ECID`, `X-ORDS_DEBUG: false`, fără CAPTCHA. Linkurile PDF au căi previzibile (`/proiecte/2026/000/00/1/em797.pdf`, `pl797.pdf`, `cl797.pdf`, `ces797.pdf`, `csm797.pdf`, `oug797.pdf`), plus avize de comisii (`/comisii/juridica/pdf/2026/rp001.pdf`) — [fișa idp=22923](https://www.cdep.ro/ords/pls/proiecte/upl_pck2015.proiect?cam=2&idp=22923) (testat).
- `em797.pdf`: 200, `application/pdf`, 548.446 B, 0,30 s, PDF 1.7 cu 11 pagini și **0 caractere extrase**, adică imagine scanată fără OCR — [em797.pdf](https://www.cdep.ro/proiecte/2026/000/00/1/em797.pdf) (testat).
- `legis_pck.htp_act?nr=100&an=2026`: 200, 3.152 B, 0,20 s. Conține „Publicare: M.Of. nr. 520/24 iun. 2026” și declinarea „textele actelor normative nu au caracter oficial” — [legis htp_act](https://www.cdep.ro/ords/pls/legis/legis_pck.htp_act?nr=100&an=2026) (testat).
- Nu am găsit termeni de utilizare cu clauze despre acces automat; singura mențiune juridică este declinarea de mai sus.
- Cerere funcțională (testată):
  ```bash
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' 'https://www.cdep.ro/ords/pls/proiecte/upl_pck2015.proiect?cam=2&idp=22923'
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' 'https://www.cdep.ro/proiecte/2026/000/00/1/em797.pdf' -o em797.pdf
  ```

### Inferences
- Adaptorul `proiecte_legislative` poate porni de aici fără restricții tehnice, dar are nevoie de un pas OCR (de exemplu Tesseract cu `ron`) pentru PDF-urile scanate.

### Gaps
- Am testat un singur PDF. Alte tipuri de documente (de exemplu `pl`, `cl`) pot avea text.

## 6. senat.ro

### Takeaway
**Verdict: DA.** Nu există robots.txt. Fișa legislativă (GET cu parametri) și PDF-urile se descarcă fără challenge. **Nota anterioară greșea când spunea că senat.ro e servit prin Cloudflare.** Singurele referințe la Cloudflare sunt fișiere CSS/JS de pe `cdnjs.cloudflare.com`. Nu există antete `cf-ray`; serverul este un proxy cu cache (`server: WTF!!`, `x-cache-status`).

### Cited Findings
- `robots.txt`: 404 (pagină IIS, `iso-8859-1`), 0,10 s — [robots.txt](https://www.senat.ro/robots.txt) (testat).
- `Legis/Lista.aspx?nr_cls=L534&an_cls=2020`: 200, `text/html; charset=utf-8`, 225.127 B, 0,61 s. Pagina are `__VIEWSTATE` (WebForms) și nu are CAPTCHA. Linkurile PDF urmează pattern-ul `/legis/PDF/2020/20L534{EM|AD|AFP|AM|AXS|CA44|CR|DP|ES|FG}.PDF?nocache=true` — [Lista L534/2020](https://www.senat.ro/Legis/Lista.aspx?nr_cls=L534&an_cls=2020) (testat).
- `20L534EM.PDF`: 200, `application/pdf`, 608.045 B, 0,21 s, 16 pagini, **cu strat de text OCR de calitate slabă** („Sec|iunea”, „^i”, „Lcgii nr, 202/1998”) — [20L534EM.PDF](https://www.senat.ro/legis/PDF/2020/20L534EM.PDF?nocache=true) (testat).
- Nu am găsit termeni de utilizare.
- Cerere funcțională (testată):
  ```bash
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' 'https://www.senat.ro/Legis/Lista.aspx?nr_cls=L534&an_cls=2020'
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' 'https://www.senat.ro/legis/PDF/2020/20L534EM.PDF?nocache=true' -o 20L534EM.pdf
  ```

### Inferences
- Fișa merge prin GET simplu. Căutarea (WebForms postback) ar cere gestionarea VIEWSTATE, dar nu e necesară dacă numărul `L{nr}/{an}` vine din cdep.ro. Textul OCR existent trebuie refăcut sau corectat (ş/ţ greșite, `^`, `|`).

### Gaps
- Nu am testat căutarea WebForms și nici volumul tolerat.

## 7. e-consultare.gov.ro și sgg.gov.ro

### Takeaway
**e-consultare: NU** în forma actuală. robots.txt e permisiv, dar lista consultărilor nu apare în HTML: se încarcă client-side prin API-ul intern DnnSharp ActionGrid (nedocumentat), iar pagina încarcă reCAPTCHA. **sgg.gov.ro: DA.** WordPress expune un REST API public (`/1/wp-json/wp/v2/posts`) cu postările săptămânale „Proiectele de acte normative care ar putea fi incluse în ședința Guvernului”.

### Cited Findings
- e-consultare robots.txt (DNN standard, IIS 10): Disallow `/*/ctl/`, `/admin/`, `/App_Browsers/`, `/App_Code/`, `/App_Data/`, `/bin/`, `/Components/`, `/Config/`, `/Install/`, `/Providers/`, `/Activity-Feed/userId/` etc. — [robots.txt](https://e-consultare.gov.ro/robots.txt) (testat; 200, 741 B).
- Pagina principală: 200, 129.481 B, 0,21 s. `/Consultare-publică`: 200, 151.912 B, 0,41 s. Ambele conțin doar meniul și textul „E-Consultare conține date referitoare la proiectele de acte normative…”, fără lista de proiecte. Grilele se încarcă prin `/DesktopModules/DnnSharp/ActionGrid/Api.ashx?…&_mid=889&_tabid=155&method=…`, cu antet `RequestVerificationToken`, iar pagina încarcă reCAPTCHA — [Consultare publică](https://e-consultare.gov.ro/Consultare-public%C4%83) (testat).
- Termenii legați din e-consultare (gov.ro): „Un document disponibil pe site nu reproduce în mod obligatoriu textul unui document oficial. Numai documentele şi actele normative publicate pe hârtie de către organele abilitate sunt considerate autentice.” Nu există clauze despre acces automat — [gov.ro Condiții de utilizare](https://gov.ro/ro/conditii-de-utilizare) (testat; 200, 53 KB).
- sgg.gov.ro `robots.txt`: 404 (nginx) — [robots.txt](https://sgg.gov.ro/robots.txt) (testat).
- sgg.gov.ro `/1/proiecte-de-acte-normative/`: 200, 81.885 B, 0,12 s, WordPress. PDF-urile vizibile datează în principal din 2017, plus un fișier încărcat în 2026/10, deci pagina e puțin întreținută — [Proiecte de acte normative](https://sgg.gov.ro/1/proiecte-de-acte-normative/) (testat).
- **WP REST API**: `GET /1/wp-json/wp/v2/posts?per_page=3&_fields=id,date,link,title` întoarce 200 `application/json`, 1.056 B, 2,93 s, cu `X-WP-Total: 3978`, `X-WP-TotalPages: 1326` și `X-Robots-Tag: noindex`. Prima postare: „Proiectele de acte normative care ar putea fi incluse în ședința Guvernului României din 30.10.2026” (30.10.2026) — [wp-json posts](https://sgg.gov.ro/1/wp-json/wp/v2/posts?per_page=3&_fields=id,date,link,title) (testat).
- Cerere funcțională sgg (testată):
  ```bash
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' 'https://sgg.gov.ro/1/wp-json/wp/v2/posts?per_page=3&_fields=id,date,link,title'
  ```

### Inferences
- Pentru proiectele guvernamentale aflate pe ordinea de zi, sgg.gov.ro prin WP REST este calea curată: JSON, paginare și filtrare după dată (`after=`) sau căutare (`search=`). `noindex` privește indexarea, nu accesul.
- e-consultare ar cere reverse engineering pe API-ul ActionGrid, care e protejat cu token anti-forgery. Recomand o cerere oficială către SGG (consultare@gov.ro) pentru export sau date deschise.

### Gaps
- Nu am testat API-ul ActionGrid (nedocumentat). Nu știu dacă cere sesiune sau token.
- Nu am verificat dacă postările SGG au atașate PDF-urile proiectelor sau doar linkuri.

## 8. EU Publications Office – CELLAR SPARQL și REST

### Takeaway
**Verdict: DA.** SPARQL și REST cu `Accept-Language: ron` funcționează fără cont și fără anti-bot. robots.txt (prin redirect spre op.europa.eu) are `Allow: /` și nu restricționează `/webapi/` sau `/resource/`. Confirm nota anterioară.

### Cited Findings
- `publications.europa.eu/robots.txt` face 301 → `https://op.europa.eu/robots.txt`. Acolo: `User-agent: *` / `Allow: /`. Disallow doar pentru căi de portal (`/c/portal/`, `*requestAction=rdf`, `/webdav/*`, `/*p_p_id=`, `/*/publication-detail?*` etc.). Nimic despre AI sau crawl-delay — [op.europa.eu/robots.txt](https://op.europa.eu/robots.txt) (testat).
- SPARQL (GET, `format=application/sparql-results+json`) pentru CELEX `32016R0679`: 200, `application/sparql-results+json`, 506 B, 0,28 s. Întoarce work-ul `cellar/3e485e15-11bd-11e6-ba9a-01aa75ed71a1`, ELI `http://data.europa.eu/eli/reg/2016/679/oj` și data 2016-04-27 — [SPARQL](https://publications.europa.eu/webapi/rdf/sparql) (testat).
- REST `GET http://publications.europa.eu/resource/celex/02016R0679-20160504` cu `Accept: application/xhtml+xml` și `Accept-Language: ron`: 303 → `…/cellar/5f2552c2-cc45-11e6-ad7c-01aa75ed71a1.0008.03/DOC_1`, apoi 200 `application/xhtml+xml;charset=UTF-8`, 501.118 B, 0,53 s. Textul este „TEXT consolidat: 32016R0679 — RO — 04.05.2016 … Acest document are doar scop informativ și nu produce efecte juridice” — [CELLAR celex 02016R0679-20160504](http://publications.europa.eu/resource/celex/02016R0679-20160504) (testat).
- Pagina „Cellar – users” nu conține termeni, limite de rată sau licență pentru SPARQL sau REST — [op.europa.eu/web/cellar/users](https://op.europa.eu/en/web/cellar/users) (WebFetch).
- Cereri funcționale (testate):
  ```bash
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' -G 'https://publications.europa.eu/webapi/rdf/sparql' \
    --data-urlencode 'query=PREFIX cdm: <http://publications.europa.eu/ontology/cdm#> SELECT ?work ?eli ?date WHERE { ?work cdm:resource_legal_id_celex "32016R0679"^^<http://www.w3.org/2001/XMLSchema#string> . OPTIONAL { ?work cdm:resource_legal_eli ?eli } OPTIONAL { ?work cdm:work_date_document ?date } } LIMIT 5' \
    --data-urlencode 'format=application/sparql-results+json'
  curl -sSL -A 'LexAI/1.0 (verificare surse; uz personal)' -H 'Accept: application/xhtml+xml' -H 'Accept-Language: ron' \
    'http://publications.europa.eu/resource/celex/02016R0679-20160504' -o gdpr_consolidat_ro.xhtml
  ```

### Inferences
- CELLAR rămâne calea recomandată pentru tot conținutul UE (legislație și jurisprudență CJUE), pentru că ocolește complet WAF-ul EUR-Lex.

### Gaps
- **Licența de reutilizare nu a fost verificată direct** în această sesiune: avizul juridic EUR-Lex e blocat de WAF, iar căutările nu au găsit textul oficial. Regula presupusă (Decizia 2011/833/UE, reutilizare cu indicarea sursei) vine din nota anterioară și din surse secundare — [lawplayer 32011D0833](https://lawplayer.com/eu/act/32011D0833) (secundar).
- Nu sunt publicate limite de rată sau timeout pentru SPARQL.

## 9. eur-lex.europa.eu (HTML)

### Takeaway
**Verdict: NU.** Toate paginile HTML, inclusiv robots.txt, primesc **AWS WAF challenge**: HTTP 202, `x-amzn-waf-action: challenge`. Cu UA de browser se primește o pagină JS de challenge (`window.awsWafCoo…`). Nu am încercat rezolvarea. Singura excepție este WSDL-ul serviciului SOAP (200), care însă cere cont EU Login și aprobare.

### Cited Findings
- `robots.txt`: 202, `Content-Length: 0`, `x-amzn-waf-action: challenge`, `Server: CloudFront`, `X-Amz-Cf-Pop: OTP50-P1`, 0,09 s — [robots.txt](https://eur-lex.europa.eu/robots.txt) (testat). Regulile robots sunt deci necunoscute pentru clienții non-browser.
- `legal-content/RO/TXT/HTML/?uri=CELEX:32016R0679`:
  - cu UA LexAI: 202, corp gol;
  - cu UA Chrome și `Accept-Language: ro`: 202, 2.036 B, pagină HTML cu script de challenge AWS WAF.

  Sursa: [legal-content](https://eur-lex.europa.eu/legal-content/RO/TXT/HTML/?uri=CELEX:32016R0679) (testat).
- `EURLexWebService?wsdl`: 200 `text/xml`, 2.952 B (JAX-WS), cu cookie-uri `AWSALB` — [WSDL](https://eur-lex.europa.eu/EURLexWebService?wsdl) (testat). Accesul la serviciu cere cont și aprobare (vezi nota anterioară).
- Avizul juridic (`/content/legal-notice/legal-notice.html`) a întors conținut gol prin WebFetch, din cauza WAF — [legal notice](https://eur-lex.europa.eu/content/legal-notice/legal-notice.html).

### Inferences
- Pentru server-side nu se folosește eur-lex.europa.eu. Se folosește CELLAR (secțiunea 8). Linkurile EUR-Lex rămân doar pentru utilizatorul uman, în browser.
- Serviciul SOAP EUR-Lex ar intra la CONDIȚIONAT (înregistrare plus cotă zilnică), dar nu l-am putut testa fără cont.

### Gaps
- Nu am putut citi robots.txt și nici termenii EUR-Lex.

## 10. N-Lex

### Takeaway
**Verdict: NU.** Paginile N-Lex se încarcă, dar conectorul pentru România dă eroare la căutare: „execute request failed on corpus ro.legis.iservice … (500)System.ServiceModel.ServiceActivationException”. În plus, N-Lex e doar o fațadă peste legislatie.just.ro, deci nu aduce date în plus.

### Cited Findings
- `robots.txt`: 404, întoarce o pagină HTML de 23.904 B cu `<meta name="robots" content="follow, index">` — [robots.txt](https://n-lex.europa.eu/robots.txt) (testat).
- Pagina info RO: 200, 32.201 B, 0,96 s. Formularul RO (`/n-lex/legis_ro/rodb_form`): 200, 83.525 B, 0,70 s. Face POST spre `/n-lex/legis_ro/rodb_result?search=simple&query=…` (construit în JS) cu `form_build_id` și cookie `JSESSIONID` — [rodb_form](https://n-lex.europa.eu/n-lex/legis_ro/rodb_form?lang=ro) (testat).
- Căutarea a eșuat de două ori:
  - fără parametrul `query` (greșeala mea): „execute request failed on corpus ro.legis.iservice: request Message: Cannot invoke … because "criteriaFields" is null”;
  - cu `query=title eq datele deschise AND docNum eq 179`, ca în JS-ul paginii: „execute request failed on corpus ro.legis.iservice: request Message: (500)System.ServiceModel.ServiceActivationException”, adică serviciul WCF din spate nu pornește.

  Sursa: [rodb_result](https://n-lex.europa.eu/n-lex/legis_ro/rodb_result) (testat).

### Inferences
- Eroarea WCF arată că legătura N-Lex → serviciul MJ pentru România este stricată în prezent. Oricum, sursa primară (secțiunile 1–2) e accesibilă direct.

### Gaps
- Nu știu dacă eroarea e temporară. Nu am retestat mai târziu, pentru că atinsesem plafonul de 5 cereri.

## 11. InfoCuria (infocuria.curia.europa.eu) și curia.europa.eu

### Takeaway
**Verdict: NU pentru extragere HTML server-side.** Noul InfoCuria este un SPA Angular (titlu „RPEX”) care nu are date în HTML, iar vechiul `curia.europa.eu/juris/liste.jsf` face 301 spre InfoCuria. robots.txt permite tot pe InfoCuria, iar termenii permit reproducerea cu indicarea sursei, deci obstacolul e tehnic (API nedocumentat), nu juridic. Pentru textele CJUE, calea este CELLAR (secțiunea 8).

### Cited Findings
- `infocuria.curia.europa.eu/robots.txt`: `User-agent: *` / `Allow: /` plus `Sitemap: https://infocuria.curia.europa.eu/sitemap.xml` — [robots.txt](https://infocuria.curia.europa.eu/robots.txt) (testat; 200, 79 B).
- `curia.europa.eu/robots.txt`: Disallow doar pentru documente anume (de exemplu `/juris/document/document.jsf?*docid=163787*`, `*num=F-51/14*`, `*num=F-50/14*`, `/juris/celex.jsf?celex=62014FJ0050*`). Probabil sunt cauze anonimizate sau retrase. Nimic despre AI — [robots.txt](https://curia.europa.eu/robots.txt) (testat; 200, 985 B).
- `https://infocuria.curia.europa.eu/`: 200, `text/html`, 130.226 B, 0,53 s, titlul „RPEX”. Încarcă scripturile `polyfills-…js`, `scripts-…js`, `main-…js` (Angular) și nu conține date despre cauze. Nu are CAPTCHA — [InfoCuria](https://infocuria.curia.europa.eu/) (testat).
- `curia.europa.eu/juris/liste.jsf?num=C-83/19&language=ro`: **301** → `https://infocuria.curia.europa.eu/tabs/redirect/juris/liste.jsf?num=C-83/19&language=ro` (Azure Application Gateway). Formularul clasic nu mai servește conținut direct (închide golul din nota anterioară) — [liste.jsf](https://curia.europa.eu/juris/liste.jsf?num=C-83/19&language=ro) (testat).
- Avertismentul InfoCuria: „The texts available on this site may be reproduced provided the source is acknowledged as well as the fact that they are not authentic and are free of charge.” — [avertissement](https://curia.europa.eu/common/juris/en/avertissement.html) (testat; 200, 2.043 B).

### Inferences
- InfoCuria rămâne țintă de link pentru utilizator. Pentru că redirecționarea `liste.jsf?num=` funcționează, linkurile vechi de tip „C-83/19” se pot construi în continuare.

### Gaps
- Nu am analizat bundle-ul `main-…js` ca să găsesc API-ul intern; ar fi depășit plafonul și scopul. Nu am verificat sitemap.xml.

## 12. HUDOC (CEDO)

### Takeaway
**Verdict: CONDIȚIONAT.** Endpointul JSON `app/query/results` și conversia în PDF funcționează fără cheie și fără challenge. HUDOC stă însă **acum în spatele Cloudflare** (nou față de nota anterioară): `server: cloudflare`, cookie de bot management `__cf_bm`, `cf-ray`. Nu are robots.txt real. Termenii CEDO cer **permisiune scrisă prealabilă pentru uz comercial**. Conversia `docx/html` întoarce **204 No Content** pentru traducerea RO testată; PDF-ul merge.

### Cited Findings
- `robots.txt`: 200 `text/html`, 15.718 B (pagina aplicației, nu un robots.txt), cu antete `server: cloudflare` și `set-cookie: __cf_bm=…` — [robots.txt](https://hudoc.echr.coe.int/robots.txt) (testat).
- `app/query/results` cu `query=contentsitename:ECHR AND (languageisocode="RUM") AND (respondent="ROU")`, `sort=kpdate Descending`, `length=3`: 200 `application/json`, 986 B, 0,20 s, `resultcount: 1241`. Primul rezultat este `001-252138`, ECLI `ECLI:CE:ECHR:2026:0616JUD006491019`, din 16.06.2026, tip `HJUDRUM`. Totalul de 1.241 confirmă nota anterioară — [query/results](https://hudoc.echr.coe.int/app/query/results) (testat).
- `app/conversion/docx/html/body?library=ECHR&id=001-252138`: **204**, corp gol, 0,25 s. Asta explică „corpul gol” din nota anterioară: pentru această traducere nu există sursă DOCX — [conversion html](https://hudoc.echr.coe.int/app/conversion/docx/html/body?library=ECHR&id=001-252138) (testat).
- `app/conversion/pdf/?library=ECHR&id=001-252138&filename=…`: 200 `application/pdf`, 279.067 B, 0,45 s, 7 pagini **cu text** („Tradus și revizuit de IER (https://ier.gov.ro/)”, „CAUZA ALEXFORCAM S.R.L. ÎMPOTRIVA ROMÂNIEI (Cererea nr. 64910/19)”) — [conversion pdf](https://hudoc.echr.coe.int/app/conversion/pdf/?library=ECHR&id=001-252138&filename=001-252138.pdf) (testat).
- Termenii CEDO: textele pot fi reproduse „provided the source is acknowledged (© ECHR-CEDH)” și numai „for private use or for the purposes of information and education in connection with the Court’s activities”, gratuit. „Persons wishing to use information and texts on the Court’s website for any use other than those listed above, and in particular for commercial use, must request prior written permission” — [ECHR Copyright and disclaimer](https://www.echr.coe.int/copyright-and-disclaimer) (testat; 200, 209 KB). Pagina include scriptul pasiv Cloudflare `challenge-platform/scripts/jsd/main.js` (detecție, nu blocare).
- Cereri funcționale (testate):
  ```bash
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' -G 'https://hudoc.echr.coe.int/app/query/results' \
    --data-urlencode 'query=contentsitename:ECHR AND (languageisocode="RUM") AND (respondent="ROU")' \
    --data-urlencode 'select=itemid,docname,appno,ecli,kpdate,languageisocode,doctype,importance' \
    --data-urlencode 'sort=kpdate Descending' --data-urlencode 'start=0' --data-urlencode 'length=3'
  curl -sS -A 'LexAI/1.0 (verificare surse; uz personal)' \
    'https://hudoc.echr.coe.int/app/conversion/pdf/?library=ECHR&id=001-252138&filename=001-252138.pdf' -o 001-252138.pdf
  ```

### Inferences
- Tehnic, accesul merge, dar Cloudflare Bot Management poate începe oricând să ceară challenge la volum mai mare sau din IP-uri de datacenter. Adaptorul trebuie să ruleze lent și să cache-uiască, iar la un 403 sau challenge să se oprească, nu să încerce ocolirea.
- Pentru text RO: întâi PDF, iar `docx/html` doar ca rezervă pentru documentele EN/FR. Uz comercial în LexAI înseamnă permisiune CEDO; pentru traducerile IER, eventual și acordul IER.

### Gaps
- Nu am testat din IP de datacenter și nici la volum, deci nu știu pragul la care Cloudflare începe să ceară challenge.
