# Verificare tehnică a accesului automat: surse de jurisprudență și registre publice (România, 1 noiembrie 2026)

> **Metodă.** Toate testele au fost făcute din terminalul acestui Mac, pe 1.11.2026, cu `curl`. User-Agent-ul folosit a fost `LexAI/1.0 (verificare surse; uz personal)`. Un User-Agent de browser (Chrome 130, macOS) a fost încercat doar acolo unde prima cerere a fost blocată. Au fost cel mult 5 cereri HTTP pe host, la cel puțin 2 secunde una de alta, fără cereri în paralel. Nu am încercat să ocolesc vreo provocare anti-bot sau CAPTCHA. Latențiile sunt `time_total` din curl. Nicio cerere nu a primit 429 și nu am observat throttling. Nu am trecut în aceste note nume de părți, CNP-uri sau date despre persoane fizice. Abaterile de la protocol sunt descrise în ultima secțiune.
>
> **Legendă verdict.** **DA**: accesul automat funcționează și e permis. **CONDIȚIONAT**: funcționează, dar există o restricție de respectat (robots.txt, termeni, acord, cont, cost, rată). **NU**: e blocat de CAPTCHA/WAF/anti-bot, e interzis prin robots.txt sau termeni, ori serviciul nu funcționează.

## Tabel sinteză

| Sursă | robots.txt | Test HTTP | Anti-bot | Format | Acces/cost | Verdict |
|---|---|---|---|---|---|---|
| ccr.ro – „Decizii de admitere” + PDF | `*`: doar `/wp-admin/` interzis; nicio regulă AI | 200 HTML 1,27 MB (0,23 s); PDF 200, 636 KB (0,21 s) | niciunul (reCAPTCHA v3 doar pentru formulare) | HTML WordPress + PDF cu strat text | gratuit, fără cont | **DA** |
| ccrsearch.ccr.ro | HTTPS: 404 (nu există); HTTP: timeout | HTTP :80 timeout 30 s; HTTPS 200, 2,2 KB (shell AngularJS „CCR Acces Parti”) | F5 BIG-IP ASM: UA de browser → „Request Rejected” | SPA AngularJS, autentificare `UserName` | neclar; pare portal pentru părți | **NU** |
| dosare.ccr.ro | ilizibil (robots.txt întoarce provocarea F5) | 200, dar pagină de provocare TSPD (42 KB) | F5 ASM TSPD; UA de browser → „Request Rejected” | SPA | — | **NU** |
| scj.ro /736 + /1093 (+ PDF) | `*`: interzise `/home/downloadpdfrequest`, `/home/getpartiesfordocket` etc.; nicio regulă AI | GET cu `customQuery` parțial → 500; formular 200 (546 KB); POST 200 (564 KB, 9 RIL/2026) | niciunul | HTML (IIS/ASP.NET MVC 5.1) | gratuit | **CONDIȚIONAT** (fără PDF-uri, robots) |
| rejust.ro | 404 (inexistent) | 200, 14,8 KB shell Blazor fără date | Cloudflare Turnstile + token anti-falsificare + `encryption.js` | Blazor WASM | gratuit pentru oameni | **NU** |
| rolii.ro | — | `www` HTTPS: certificat `*.csm1909.ro` (nepotrivit); HTTP :80 refuzat; apex servește altă aplicație | — | — | portalul nu mai există | **NU** |
| portalquery.just.ro (SOAP) | Cloudflare gestionat: `*` Allow, `ai-train=no, use=reference`; ClaudeBot, GPTBot etc. interzise | WSDL 200, 90,6 KB (0,14 s); `CautareDosare` 200, 5,8 KB (0,15 s); HTTPS → 525 | Cloudflare (fără provocare pe HTTP) | SOAP 1.1/1.2 XML | gratuit, fără cont | **CONDIȚIONAT** |
| portal.just.ro | ca mai sus, plus `*`: `Disallow: /*?` | 403 „Just a moment…” (ambele UA) | Cloudflare managed challenge | SharePoint | — | **NU** |
| csm1909.ro | blochează explicit ClaudeBot, Claude-User, GPTBot și alți ~30 agenți AI | doar robots.txt (200) | `/verify-human` | — | — | **NU** (pentru agenți AI) |
| inm-lex.ro – Repertoriu | `*`: doar căi administrative interzise | 200, 166 KB (0,79 s); PDF 200, 3,7 MB, 382 p. (0,39 s) | niciunul | HTML + PDF cu strat text | reutilizarea cere acordul scris INM | **CONDIȚIONAT** |
| cab1864.eu (CA București) | `*`: doar `/wp-admin/` | 200, 207 KB (1,07 s); PDF 200, 1,5 MB, 210 p. (0,24 s) | niciunul (reCAPTCHA v3 doar pentru formulare) | HTML WordPress + PDF cu strat text | gratuit | **DA** |
| cnsc.ro | `*`: doar `/wp-admin/` | HTTP 200, 49,6 KB; HTTPS timeout 30 s | niciunul | HTML + PDF | gratuit; doar arhiva 2015 | **DA** (valoare redusă) |
| portal.cnsc.ro | 404 (inexistent) | 200; căutarea face postback, rezultatele vin prin JS (`callWebMethod`) | niciunul observat | ASP.NET WebForms + AJAX | gratuit; termenii necitiți | **CONDIȚIONAT** (neconcludent) |
| curteadeconturi.ro | Cloudflare gestionat (ca portalquery) | 403 „Just a moment…” (ambele UA) | Cloudflare managed challenge | — | — | **NU** |
| data.gov.ro (CKAN, ONRC) | `*`: **`Disallow: /api/`**, `Crawl-Delay: 10` | API 200 JSON 45,9 KB (0,17 s); CSV 200 (Range ignorat; 696 MB) | niciunul | JSON (API) + CSV separat cu `^` | gratuit, CC-BY-4.0 | **CONDIȚIONAT** |
| ONRC (portal.onrc.ro / RECOM / myportal) | myportal: lipsă (SPA întoarce index) | portal.onrc.ro și recom.onrc.ro: NXDOMAIN; myportal 200, shell Angular 2,2 KB | F5 (cookie TS); SSO Keycloak | SPA + API intern nedocumentat | cont; date complete cu plată | **NU** (fără acord ONRC) |
| bpi.ro / BPI | `*`: doar căi WordPress | 200, 124 KB (0,75 s); doar informații generale | F5 (cookie TS) | HTML informativ | căutările sunt doar în myportal, cu cont; textul integral pe abonament | **NU** (automat) |
| epay.ancpi.ro | — | NXDOMAIN (resolver local, 1.1.1.1, 8.8.8.8) | — | — | serviciu indisponibil | **NU** |
| rnpm.ro / co.rnpm.ro | lipsă (SPA întoarce index) | 200, 6,3 KB (0,11 s); bundle JS 415 KB | **reCAPTCHA v2 obligatoriu la fiecare căutare** | SPA + API JSON | termenii interzic explicit roboții | **NU** |
| UNBR → Tabloul avocaților (ifep.ro) | `*`: interzise `/LawyersQuery.aspx`, `/*.pdf$` etc.; `/Justice/Lawyers/` permis | 200, 124 KB (0,90 s) | Cloudflare, fără provocare | ASP.NET WebForms | gratuit; termenii interzic copierea și reproducerea | **CONDIȚIONAT** (doar consultare punctuală) |
| cautavocat.ro (UNBR) | `*`: `Allow: /` | 200, 53,6 KB (0,13 s) | captcha doar la formularul de contact | HTML, căutare GET | gratuit; doar avocații înscriși pe platformă | **CONDIȚIONAT** (termenii necitiți) |
| avocatura.com | `*` Allow; **ClaudeBot interzis** | 200, 80 KB | — | HTML | director comercial privat | **NU** (nu e sursă oficială) |
| Registrul Național ONG (rnong.just.ro) | Cloudflare gestionat: ClaudeBot interzis, `ai-train=no` | 403 „Just a moment…” (ambele UA) | Cloudflare managed challenge | SPA Angular („Portalul RNONG”) | public pentru oameni | **NU** |
| ANAF `PlatitorTvaRest/v9/tva` | 404 (inexistent) | POST 200 JSON, 1,9 KB (2,1 s) | niciunul (cookie F5 TS, fără provocare) | REST JSON | gratuit, fără cont; max. 100 CUI/cerere, 1 cerere/s | **DA** |

## 1. Curtea Constituțională și ÎCCJ: ccr.ro, ccrsearch.ccr.ro, dosare.ccr.ro, scj.ro

### Takeaway
Pagina „Decizii de admitere” și PDF-urile CCR se pot prelua automat fără restricții (**DA**). ccrsearch.ccr.ro și dosare.ccr.ro sunt în spatele unui F5 BIG-IP ASM care respinge clienții ne-browser (**NU**). scj.ro funcționează prin POST pe formularul /736 și are URL-uri de detaliu stabile. robots.txt interzice însă endpoint-ul de PDF, deci un adaptor trebuie să rămână pe HTML (**CONDIȚIONAT**).

### Cited Findings

**ccr.ro: „Decizii de admitere” și PDF**
- robots.txt (200, 111 B, 0,15–0,22 s) conține doar `User-agent: *`, `Disallow: /wp-admin/`, `Allow: /wp-admin/admin-ajax.php` și sitemap-ul `wp-sitemap.xml`. Nu are reguli pentru ClaudeBot, GPTBot sau alți boți AI și nu are directive `Content-Signal` sau `Crawl-delay` — [ccr.ro/robots.txt](https://www.ccr.ro/robots.txt)
- Pagina de listă: HTTP 200, `text/html`, 1.265.265 B, 0,23 s, server nginx. Conține conținut real, nu o provocare. Lista folosește pluginul WordPress „Content Views” (clase `pt-cv-*`) și are un filtru radio `anul_postului` pe ani. Pagina include un script Google reCAPTCHA v3 (`render=…`), folosit de formulare, care nu blochează conținutul. Am găsit 40 de link-uri PDF cu tiparul `https://www.ccr.ro/wp-content/uploads/{AAAA}/{LL}/Decizie_{nr}_{AAAA}.pdf`. Tiparul nu e perfect regulat; exemplu: `2026/07/Decizie_114_-2026.pdf`. Rezumatul fiecărei intrări este titlul standard („referitoare la excepţia/obiecția de neconstituţionalitate a …”) — [ccr.ro – Decizii de admitere](https://www.ccr.ro/jurisprudenta/jurisprudenta-decizii-de-admitere/)
- PDF-ul `Decizie_883_2026.pdf`: HTTP 200, `application/pdf`, 635.923 B, 0,21 s, 35 de pagini. Producătorul este Microsoft Word 2021, deci PDF-ul e nativ digital, cu fonturi și ToUnicode, fără imagini scanate. Extragerea cu PDFKit dă 4.222 de caractere pe pagina 1: „DECIZIA nr.883 din 17 august 2026 referitoare la obiecția de neconstituționalitate a dispozițiilor art.II pct.2 … Publicată în Monitorul Oficial nr.696 din …” — [PDF DCC 883/2026](https://www.ccr.ro/wp-content/uploads/2026/08/Decizie_883_2026.pdf)
- Termeni de utilizare: nu am găsit o pagină de termeni legată din lista de admiteri (am căutat link-uri cu „termeni”, „condiții”, „politica”, „disclaimer”). Am văzut doar link-uri către „Baza legală” — [ccr.ro – Decizii de admitere](https://www.ccr.ro/jurisprudenta/jurisprudenta-decizii-de-admitere/)
- **Verdict DA.** robots.txt permite tot ce contează, nu există anti-bot, iar conținutul e HTML static plus PDF cu text. Cereri care funcționează:
  ```
  curl -A 'LexAI/1.0 (verificare surse; uz personal)' https://www.ccr.ro/jurisprudenta/jurisprudenta-decizii-de-admitere/
  curl -A 'LexAI/1.0 (verificare surse; uz personal)' -O https://www.ccr.ro/wp-content/uploads/2026/08/Decizie_883_2026.pdf
  ```

**ccrsearch.ccr.ro**
- DNS: 213.177.9.214. Pe HTTP (portul 80), `/robots.txt` și `/` au expirat după 30 s. Pe HTTPS, `/robots.txt` întoarce 404 (pagină IIS) — [ccrsearch.ccr.ro](https://ccrsearch.ccr.ro/)
- Pe HTTPS, cu UA-ul LexAI: 200, 2.202 B, 0,13 s. Pagina e un shell AngularJS (`data-ng-app="VisionCMS"`) cu titlul **„CCR Acces Parti”**, meta `data-auth-mode="UserName"` și textul „Internet Explorer 11+, Chrome or Mozilla required”. Nu conține nicio dată. Cu UA de browser: 200, dar doar 244 B, pagina F5 „The requested URL was rejected. Please consult with your administrator.”, plus cookie `TS721cbac7027`. Diferența arată un WAF F5 ASM care verifică amprenta clientului — [ccrsearch.ccr.ro](https://ccrsearch.ccr.ro/)
- **Verdict NU.** Accesul trece prin F5 ASM, conținutul e o aplicație JS care cere autentificare și nu există robots.txt sau termeni.

**dosare.ccr.ro**
- DNS: 213.177.9.212. `/robots.txt` nu întoarce un fișier text, ci pagina de provocare F5 (200, `text/html`, 47.366 B, `window["bobcmn"]`, `/TSPD/`, cookie `TSbf9df5dd029` cu `Max-Age=30`). Pagina principală cu UA LexAI: aceeași provocare TSPD (200, 42.362 B). Cu UA de browser: „Request Rejected” (244 B) — [dosare.ccr.ro](https://dosare.ccr.ro/)
- **Verdict NU.** Protecția anti-bot F5 cere execuție JavaScript, iar robots.txt nu se poate citi.

**scj.ro (ÎCCJ)**
- robots.txt (200, 1.356 B, 0,17 s, IIS 10) interzice pentru `*`: `/home/downloadpdfrequest`, `/home/getsessionsforyear`, `/home/getwebpartfull`, `/CMS/0/publicmedia/getincludedfile`, `/CMS/0/publicmedia/getimage`, `/home/getpartiesfordocket`, `/home/getpage`, `/home/getnewspage` (plus variantele `/en` și `/fr`) și `/*/scripts$`. Nu are reguli AI, `Content-Signal` sau `Crawl-delay`. `/736/…` și `/1093/…` nu sunt interzise — [scj.ro/robots.txt](https://www.scj.ro/robots.txt)
- GET pe `/736/Cautare-jurisprudenta` cu doar doi parametri `customQuery` (DecisionYear plus DocumentType, fie `RIL`, fie `3`) a dat **HTTP 500** de două ori („Eroare de server … RenderPage, controler-ul Home”, 0,29–0,31 s). Afirmația din notele anterioare, că se poate interoga prin GET cu `customQuery[i].Key/Value`, e deci valabilă doar parțial — [scj.ro/736](https://www.scj.ro/736/Cautare-jurisprudenta)
- Formularul gol (200, 546.359 B, 0,36 s) face POST la `/736/Căutare jurisprudență` cu `formTypeId=6`, `websiteId=0` și 16 perechi `CustomQuery[0..15].Key/Value`. Ordinea cheilor este: `Keywords`, `Department`, `DecisionNumber`, `DecisionDate`, `DecisionYear`, `DocketNumber`, `DocketYear`, `UniqueDocketNumber`, `PublishedInMofNr`, `PublishedInMofDate`, `Language`, `SolutionType`, `DocumentType`, `MatterType`, `Keyword`, `AndOr`.
  - Valori `DocumentType`: 1 Decizie, 2 Decizie rezumată, 3 Recurs în interesul legii, 5 Minută, 6 Hotărâre CEDO, 7 Încheiere, 9 Sentință.
  - Valori `Department`: 154 Secția I civilă, 155 Secția a II-a civilă, 157 Penală, 158 SCAF, 163 Secțiile Unite, 182/183 Completul de 9, 190 Completurile de 5, 202 Completul HP, 210 Completul RIL.
  - Tezaurul `Keyword` are 4.473 de valori, iar `MatterType` are 476 — [scj.ro/736](https://www.scj.ro/736/Cautare-jurisprudenta)
- POST cu `DecisionYear=2026` și `DocumentType=3`: **200**, 563.955 B, 0,44 s. Pagina conține 9 rezultate, fiecare cu link de detaliu de forma `/1093/Detalii-jurisprudenta?customQuery%5B0%5D.Key=id&customQuery%5B0%5D.Value={id}` (de exemplu id 232842…239651). Tabelul afișează completul, numărul și data (RIL 9/2026 din 21.09.2026, despre art. 193 alin. (3) raportat la art. 192 alin. (1) din Legea nr. 31/1990; RIL 8/2026 din 18.05.2026) și obiectul. Rezultatele vin în seturi de 50, sortate după data pronunțării. Pagina de rezultate nu conține niciun link `downloadpdfrequest`. Link-urile de sortare din pagină folosesc GET cu **toate** cele 16 chei plus `sortType` și `sortDirection`, deci un GET complet probabil funcționează (netestat) — [scj.ro/736](https://www.scj.ro/736/Cautare-jurisprudenta)
- **Verdict CONDIȚIONAT.** Căutarea HTML funcționează și nu are anti-bot. robots.txt interzice însă descărcarea PDF (`/home/downloadpdfrequest`) și lista de părți (`/home/getpartiesfordocket`), deci adaptorul trebuie să lucreze doar pe paginile HTML /736 și /1093. Cerere care funcționează (POST; câmpurile goale trebuie trimise toate):
  ```
  curl -A 'LexAI/1.0 (verificare surse; uz personal)' https://www.scj.ro/736/Cautare-jurisprudenta \
    --data-urlencode formTypeId=6 --data-urlencode websiteId=0 \
    --data-urlencode 'CustomQuery[0].Key=Keywords' --data-urlencode 'CustomQuery[0].Value=' \
    … (indicii 1–15 în ordinea de mai sus) …
    --data-urlencode 'CustomQuery[4].Key=DecisionYear' --data-urlencode 'CustomQuery[4].Value=2026' \
    --data-urlencode 'CustomQuery[12].Key=DocumentType' --data-urlencode 'CustomQuery[12].Value=3'
  ```
  Detaliu (tipar observat, netestat din cauza bugetului de 5 cereri): `https://www.scj.ro/1093/Detalii-jurisprudenta?customQuery%5B0%5D.Key=id&customQuery%5B0%5D.Value=239651`

### Inferences
- Pentru CCR, un crawler incremental pe pagina de admiteri (1,27 MB pe fetch, deci de rulat rar, de exemplu zilnic) plus PDF-urile cu text este simplu și legitim. Numele fișierelor nu sunt perfect normalizate (`Decizie_114_-2026.pdf`), așa că identificatorul se extrage din titlul PDF, nu din URL.
- ccrsearch pare să fi devenit un portal pentru părți („Acces Parti”), nu motorul public de căutare descris în notele vechi. Acest lucru nu e confirmat, pentru că aplicația nu se poate încărca fără JS.
- La scj.ro, `id`-ul numeric din `/1093` este identificatorul stabil. Tabelul de rezultate dă direct numărul și data deciziei. Fără PDF, textul integral trebuie extras din pagina de detaliu, al cărei conținut nu l-am verificat.

### Gaps
- Pagina de detaliu `/1093` nu a fost descărcată (bugetul de 5 cereri pe scj.ro a fost consumat de cele două GET-uri eșuate). Rămâne de verificat dacă afișează textul integral în HTML.
- Nu am găsit termeni de utilizare pentru ccr.ro sau scj.ro.

## 2. Instanțe, ReJust, ROLII, CSM, INM, CA București

### Takeaway
Singurul canal automat funcțional pentru instanțe este serviciul SOAP PortalWS. Merge doar pe HTTP necriptat (HTTPS dă 525), este acum în spatele Cloudflare și are semnalele `ai-train=no, use=reference` (**CONDIȚIONAT**). portal.just.ro, ReJust și ROLII sunt **NU**. INM e accesibil tehnic, dar cere acord scris pentru reutilizare (**CONDIȚIONAT**). CA București publică buletine PDF fără restricții (**DA**).

### Cited Findings

**rejust.ro**
- `/robots.txt` → 404 (0,11 s, nginx). Pagina principală: 200, 14.809 B, 0,10 s. Conține doar spinnerul „Loading...” și încarcă `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit`, `/js/encryption.js?v2`, `_framework/blazor.webassembly.js` și `antiForgeryToken.js`. Setează cookie-ul `__Host-X-XSRF-TOKEN` — [rejust.ro](https://www.rejust.ro/)
- **Verdict NU.** Accesul trece prin Cloudflare Turnstile (CAPTCHA) și o aplicație Blazor WASM, fără API public. Confirmă notele anterioare. Nu am testat UA-ul de browser, pentru că provocarea e în aplicație, nu la nivel HTTP.

**rolii.ro**
- DNS: 85.120.166.210 (rolii.ro și www). `https://www.rolii.ro/` dă eroare TLS, pentru că certificatul servit este **`CN=*.csm1909.ro`** (Sectigo, valabil 7.08.2026–21.02.2027). `http://www.rolii.ro/` refuză conexiunea după 6 s. `https://rolii.ro/` (cu verificarea certificatului dezactivată, doar ca diagnostic) întoarce 200, 874 B: o aplicație SPA fără legătură cu jurisprudența (resurse `/yms/fileserver/…`) — [rolii.ro](https://rolii.ro/)
- **Verdict NU.** Portalul ROLII nu mai există, iar IP-ul pare să fie acum pe infrastructura CSM. Asta corectează nota anterioară („serverul nu răspunde”).

**portalquery.just.ro (PortalWS SOAP)**
- DNS: 104.18.30.134 și 104.18.31.134 (**Cloudflare**). Toate răspunsurile au `Server: cloudflare` și `CF-RAY`. Notele anterioare spuneau „fără Cloudflare”, ceea ce nu mai e adevărat — [portalquery.just.ro](http://portalquery.just.ro/query.asmx)
- robots.txt (200, 2.676 B) e varianta gestionată de Cloudflare:
  - pentru `*`: `Content-Signal: search=yes,ai-train=no,use=reference` și `Allow: /`;
  - `Disallow: /` pentru ClaudeBot, anthropic-ai, Claude-Web, GPTBot, CCBot, Google-Extended, Amazonbot, Bytespider, meta-externalagent, cohere-ai, MistralAI-Training etc.;
  - antetul spune: „ANY RESTRICTIONS EXPRESSED VIA CONTENT SIGNALS ARE EXPRESS RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF THE EUROPEAN UNION DIRECTIVE 2019/790”. — [portalquery.just.ro/robots.txt](http://portalquery.just.ro/robots.txt)
- WSDL: 200, `text/xml`, 90.660 B, 0,14 s. Operații: `HelloWorld`, `CautareDosare`, `CautareDosare2`, `CautareSedinte`. Enumerarea `Institutie` are **246 de valori și nicio valoare pentru ÎCCJ** (am căutat „Inalt”, „Suprem”, „Casa”). Celelalte enumerări sunt `DocumentSedinta`, `CategorieCaz` și `StadiuProcesual` — [WSDL](http://portalquery.just.ro/query.asmx?WSDL)
- SOAP `CautareDosare` cu `numarDosar=1/2/2026` (primul dosar al CA București din 2026) și `institutie=CurteadeApelBUCURESTI`: **200**, `text/xml`, 5.799 B, 0,15 s. Rezultatul: 1 dosar (Secția I penală, categoria Penal, stadiul Fond, obiect „mandat european de arestare”), 1 parte (numele nu e redat aici), 3 ședințe, soluția ultimei ședințe „Termen preschimbat”, `dataModificare` 2026-01-25T13:01 — [PortalWS](http://portalquery.just.ro/query.asmx)
- `https://portalquery.just.ro/query.asmx?WSDL` → **HTTP 525** („error code: 525”, eșec SSL între Cloudflare și origine). Rezultă că serviciul merge **doar pe HTTP necriptat**. Asta explică ambele constatări contradictorii din notele vechi (525 într-o notă, WSDL funcțional în cealaltă) — [portalquery.just.ro](https://portalquery.just.ro/query.asmx?WSDL)
- **Verdict CONDIȚIONAT.** Serviciul funcționează fără cont, iar un UA propriu (`LexAI/…`) intră în grupul `*`, unde accesul e permis. Restricțiile de respectat:
  - nu se folosește pentru antrenare (`ai-train=no`);
  - doar `use=reference`, adică citare cu link, nu reproducere integrală;
  - nu se folosesc UA-uri de crawler AI;
  - traficul e în clar, pe HTTP;
  - fiind în spatele Cloudflare, o provocare poate fi activată oricând.
  
  Cerere care funcționează:
  ```
  curl -A 'LexAI/1.0 (verificare surse; uz personal)' http://portalquery.just.ro/query.asmx \
    -H 'Content-Type: text/xml; charset=utf-8' -H 'SOAPAction: "portalquery.just.ro/CautareDosare"' \
    --data '<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><CautareDosare xmlns="portalquery.just.ro"><numarDosar>1/2/2026</numarDosar><institutie>CurteadeApelBUCURESTI</institutie></CautareDosare></soap:Body></soap:Envelope>'
  ```

**portal.just.ro**
- robots.txt (200, 2.706 B) e identic cu cel de la portalquery în secțiunea Cloudflare și are în plus, la final, `User-agent: *` cu `Disallow: /*?`. Asta interzice orice URL cu parametri, deci și `jurisprudenta.aspx?id_inst=…` — [portal.just.ro/robots.txt](https://portal.just.ro/robots.txt)
- `/2/SitePages/acasa.aspx` → **403**, „Just a moment...” (`challenge-platform`), atât cu UA LexAI (5.502 B), cât și cu UA de browser (5.695 B) — [portal.just.ro](https://portal.just.ro/2/SitePages/acasa.aspx)
- **Verdict NU.** Cloudflare aplică o provocare managed, robots.txt blochează agenții AI și URL-urile cu parametri.

**csm1909.ro**
- robots.txt (200, 1.014 B) are `Disallow: /` pentru GPTBot, ChatGPT-User, OAI-SearchBot, **ClaudeBot, Claude-Web, Claude-User, Claude-SearchBot, anthropic-ai**, CCBot, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, meta-externalagent, Meta-ExternalFetcher, Amazonbot, cohere-ai, Diffbot, DuckAssistBot, MistralAI-User, GoogleOther, Google-CloudVertexBot și alții. Pentru `*` sunt interzise doar `/Admin`, `/Profil`, `/login`, `/logout`, `/verify-human` și `/access-denied`. Nu există `Crawl-delay`. Conform instrucțiunii, n-am citit altceva de pe site — [csm1909.ro/robots.txt](https://www.csm1909.ro/robots.txt)
- **Verdict NU** pentru o aplicație bazată pe AI: operatorul exclude explicit agenții AI, inclusiv pe cei care acționează în numele unui utilizator (`Claude-User`, `Perplexity-User`, `MistralAI-User`).

**inm-lex.ro (Repertoriul practicii neunitare)**
- robots.txt (200, 255 B) interzice pentru `*` doar `/homepage/`, `/form/`, `/live/`, `/livepw/`, `/chat/`, `/DOC/`, `/wp-admin`, `/temafi/` și `*blackhole`. Nu are reguli AI și nici `Crawl-delay` — [inm-lex.ro/robots.txt](https://inm-lex.ro/robots.txt)
- Pagina repertoriului: 200, 166.140 B, 0,79 s, fără anti-bot. Conține 7 fișiere (6 PDF și 1 ZIP), aceleași ca în notele anterioare — [inm-lex.ro – Repertoriu](https://inm-lex.ro/repertoriu-probleme-de-practica-neunitara/)
- PDF-ul „drept penal, actualizat ianuarie 2026”: 200, 3.678.128 B, 0,39 s, 382 de pagini, cu strat text (3.898 de caractere pe pagina 1, începe cu „DREPT PENAL / CUPRINS”) — [PDF](https://inm-lex.ro/wp-content/uploads/2026/01/Repertoriu-drept-penal-actualizat-ianuarie-2026.pdf)
- Termeni pe aceeași pagină: „Orice formă de utilizare, în sensul art. 12 și 13 din Legea nr. 8/1996 […], îndeosebi reproducerea, totală sau parțială, comunicarea publică în orice formă, inclusiv prin preluarea de extrase din materialele publicate în secțiunea dedicată unificării practicii judiciare se pot realiza numai cu acordul scris și exprimat în prealabil al Institutului Național al Magistraturii.” — [inm-lex.ro – Repertoriu](https://inm-lex.ro/repertoriu-probleme-de-practica-neunitara/)
- **Verdict CONDIȚIONAT.** Tehnic funcționează, dar reproducerea și preluarea de extrase cer acordul scris al INM. Cerere care funcționează: `curl -A 'LexAI/1.0 (verificare surse; uz personal)' -O https://inm-lex.ro/wp-content/uploads/2026/01/Repertoriu-drept-penal-actualizat-ianuarie-2026.pdf`

**cab1864.eu (Curtea de Apel București)**
- robots.txt (200, 193 B, 0,97 s) interzice pentru `*` doar `/wp-admin/` și `/wp-content/uploads/wpo/wpo-plugins-tables-list.json`. Nu are reguli AI — [cab1864.eu/robots.txt](https://www.cab1864.eu/robots.txt)
- „Decizii relevante”: 200, 206.667 B, 1,07 s. Conține 40 de PDF-uri sub `/wp-content/uploads/AAAA/LL/`, cu nume neuniforme, de exemplu `LEAFLET-CENTRALIZAT-TRIMESTRUL-III-2025-.pdf` și `LEAFLET-TRIMESTRUL-IV-2025.pdf`. reCAPTCHA v3 apare doar pentru Contact Form 7 — [cab1864.eu – Decizii relevante](https://www.cab1864.eu/jurisprudenta/decizii-relevante/)
- `LEAFLET-TRIMESTRUL-IV-2025.pdf`: 200, 1.549.704 B, 0,24 s, 210 pagini, cu strat text („LEAFLET – DECIZII RELEVANTE ALE CURŢII DE APEL BUCUREŞTI – TRIMESTRUL IV - 2025”). Ultimul buletin publicat (în august 2026) e pentru trimestrul IV 2025, deci cu o întârziere de circa 8 luni — [PDF](https://www.cab1864.eu/wp-content/uploads/2026/08/LEAFLET-TRIMESTRUL-IV-2025.pdf)
- **Verdict DA.** Cerere care funcționează: `curl -A 'LexAI/1.0 (verificare surse; uz personal)' https://www.cab1864.eu/jurisprudenta/decizii-relevante/`

### Inferences
- PortalWS rămâne util pentru `urmareste_dosar`, dar trebuie tratat ca un serviciu fragil: HTTP în clar (numerele de dosar ale clienților circulă necriptat), Cloudflare în față, fără documentație sau SLA. Recomandat: cache, o cerere la câteva secunde, UA propriu, fără date despre părți în log-uri.
- Dosarele ÎCCJ nu se pot urmări prin PortalWS (nu există valoare `Institutie` pentru ÎCCJ), deci rămâne modulul /738 de pe scj.ro, care nu a fost testat aici.
- CA București are un singur document mare pe trimestru, deci e suficientă o indexare locală a PDF-urilor la câteva luni.

### Gaps
- Termenii de utilizare pentru PortalWS și cab1864.eu nu au fost găsiți.
- Nu am testat `CautareDosare2` și `CautareSedinte` și nici plafonul de 1.000 de rezultate.
- Nu am citit termenii ReJust, deoarece aplicația nu se încarcă fără JS.

## 3. Jurisdicții administrative: CNSC și Curtea de Conturi

### Takeaway
cnsc.ro e accesibil, dar lista publică are doar decizii din 2015 (**DA**, valoare redusă). portal.cnsc.ro nu are anti-bot, însă rezultatele căutării vin printr-un apel JavaScript separat, pe care nu l-am putut testa în bugetul de cereri (**CONDIȚIONAT**, neconcludent). curteadeconturi.ro e blocat de o provocare Cloudflare (**NU**).

### Cited Findings
- cnsc.ro: robots.txt (HTTP 200, 111 B) interzice doar `/wp-admin/`. `http://www.cnsc.ro/decizii/`: 200, 49.590 B, 0,21 s, cu 30 de PDF-uri, **toate din 2015** (`/wp-content/uploads/decizii/decizii-2015/decizie-2208.pdf` … `decizie-2237.pdf`). `https://www.cnsc.ro/` a expirat după 30 s, deci HTTPS tot nu funcționează — [cnsc.ro/decizii](http://www.cnsc.ro/decizii/)
- portal.cnsc.ro: `/robots.txt` → 404 (IIS). `/`: 200, 12.874 B. Meniul are `decizii.html`, `deciziisuspendare.html`, `buletinoficial.html`, `istoricdosare.html`, `autentificare.html` și **`termenisiconditii.html`** — [portal.cnsc.ro](http://portal.cnsc.ro/)
- `decizii.html`: 200, 16.716 B. Formular ASP.NET WebForms (`__VIEWSTATE`, `__EVENTVALIDATION`) cu filtrele: număr decizie, nume contestator, nr. înregistrare, interval de date, denumire AC, CUI AC, CUI contestator. Postback-ul „Caută” (interval 01–02.10.2026) a redirecționat la `decizii.html?a=search&reg:registrationDate=01.10.2026-02.10.2026` (200, 16.934 B, 0,45 s). HTML-ul nu conține rezultate: ele se încarcă prin `callWebMethod('67fb8141-…','get','')` (ASP.NET AJAX). Nu există CAPTCHA — [portal.cnsc.ro/decizii.html](http://portal.cnsc.ro/decizii.html)
- curteadeconturi.ro: DNS 104.18.0.74 și 104.18.1.74 (Cloudflare). robots.txt (200, 2.676 B) este identic cu cel de la portalquery: `*` Allow, `ai-train=no, use=reference`, ClaudeBot și GPTBot interzise. Pagina principală → **403** „Just a moment...”, atât cu UA LexAI (5.338 B), cât și cu UA de browser (5.530 B) — [curteadeconturi.ro](https://www.curteadeconturi.ro/)
- **Verdicte.**
  - cnsc.ro: **DA**, dar doar ca arhivă 2015. Cerere care funcționează: `curl -A 'LexAI/1.0 (verificare surse; uz personal)' http://www.cnsc.ro/decizii/`
  - portal.cnsc.ro: **CONDIȚIONAT** (neconcludent). Interogarea parametrizată trece prin URL-ul `http://portal.cnsc.ro/decizii.html?a=search&reg:registrationDate=01.10.2026-02.10.2026`, dar rezultatele cer reproducerea apelului AJAX `callWebMethod`. Termenii nu au fost citiți.
  - curteadeconturi.ro: **NU**.

### Inferences
- Pentru CNSC, un adaptor ar trebui să inverseze `callWebMethod` din `/ui/js/javascript.js`, ceea ce e fragil. Înainte de asta trebuie citit `termenisiconditii.html`.

### Gaps
- Nu am verificat endpoint-ul AJAX al portal.cnsc.ro, formatul rezultatelor, link-urile PDF ale deciziilor recente și termenii (bugetul de 5 cereri a fost consumat).

## 4. Registre publice: data.gov.ro/ONRC, RECOM, BPI, ANCPI, RNPM, avocați, ONG, ANAF

### Takeaway
- Doar ANAF v9 este **DA** curat.
- data.gov.ro funcționează, dar robots.txt interzice `/api/` și cere `Crawl-Delay: 10`. Descărcarea CSV-urilor (CC-BY-4.0) e permisă (**CONDIȚIONAT**).
- ONRC (myportal, RECOM, BPI) nu are un canal automat public: portal.onrc.ro nu mai există, iar myportal are un API intern sub SSO Keycloak.
- epay.ancpi.ro nu mai are DNS.
- RNPM cere reCAPTCHA și interzice explicit roboții.
- Portalul ONG (`rnong.just.ro`) e în spatele unei provocări Cloudflare.

### Cited Findings

**data.gov.ro (CKAN, seturile ONRC)**
- robots.txt (200, 122 B): `User-agent: *` cu `Disallow: /dataset/rate/`, `/revision/`, `/dataset/*/history`, **`/api/`** și **`Crawl-Delay: 10`**. Nu are reguli AI — [data.gov.ro/robots.txt](https://data.gov.ro/robots.txt)
- API: `package_search?fq=organization:onrc` → 200, JSON, 45.858 B, 0,17 s, `count: 80`. Cel mai recent set este `firme-19-10-2026` (licență **CC-BY-4.0**, modificat pe 2026-10-20). Resursele CSV sunt:
  - `od_firme.csv` (695.782.068 B);
  - `od_caen_autorizat.csv` (437 MB);
  - `od_reprezentanti_legali.csv` (336.565.573 B);
  - `od_stare_firma.csv` (92 MB);
  - `od_reprezentanti_if.csv` (13 MB);
  - `od_sucursale_alte_state_membre.csv` (19 KB).
  
  Setul `nomenclatoare-19-10-2026` conține `n_caen`, `n_stare_firma` și `n_versiune_caen` — [API data.gov.ro](https://data.gov.ro/api/3/action/package_search?fq=organization:onrc&sort=metadata_created%20desc&rows=4) (cale interzisă de robots, vezi secțiunea 5)
- Descărcarea directă: 200, `text/csv`. Serverul **ignoră antetul Range** și trimite tot fișierul (~9 MB/s). Separatorul este `^`, iar fișierul are BOM UTF-8.
  - Coloanele `od_firme.csv`: `DENUMIRE^CUI^COD_INMATRICULARE^DATA_INMATRICULARE^EUID^FORMA_JURIDICA^ADR_TARA^ADR_JUDET^ADR_LOCALITATE^ADR_DEN_STRADA^ADR_NR_STRADA^ADR_BLOC^ADR_SCARA^ADR_ETAJ^ADR_APARTAMENT^ADR_COD_POSTAL^ADR_SECTOR^ADR_COMPLETARE^WEB^TARA_FIRMA_MAMA`.
  - Coloanele `od_reprezentanti_legali.csv`: `COD_INMATRICULARE^PERSOANA_IMPUTERNICITA^CALITATE^DATA_NASTERE^LOCALITATE_NASTERE^JUDET_NASTERE^TARA_NASTERE^LOCALITATE^JUDET^TARA`. Fișierul conține **date personale**: numele, data și locul nașterii reprezentanților.
  
  — [od_firme.csv (19.10.2026)](https://data.gov.ro/dataset/1962670f-acda-41b5-b52c-c430d7a1ef5e/resource/361e52e3-4590-40af-ae0f-8a15089fc927/download/od_firme.csv)
- **Verdict CONDIȚIONAT.** Licența CC-BY-4.0 permite reutilizarea, iar căile `/dataset/…/download/` sunt permise. robots.txt interzice însă `/api/` și cere 10 s între cereri. Fișierul de reprezentanți intră sub GDPR. Cerere care funcționează (cu robots respectat): `curl -A 'LexAI/1.0 (verificare surse; uz personal)' -O https://data.gov.ro/dataset/1962670f-acda-41b5-b52c-c430d7a1ef5e/resource/361e52e3-4590-40af-ae0f-8a15089fc927/download/od_firme.csv`. URL-urile noilor seturi lunare se află din pagina HTML a organizației (`/organization/onrc`), nu din API.

**ONRC: portal.onrc.ro, RECOM, myportal.onrc.ro**
- DNS: `portal.onrc.ro` → **NXDOMAIN**; `recom.onrc.ro` → CNAME către `portal.onrc.ro`, deci nu funcționează nici el; `myportal.onrc.ro` → 136.255.220.157 — test DNS propriu
- myportal: `/robots.txt` întoarce index-ul SPA (200, `text/html`, 2.229 B), deci nu există robots.txt. Pagina principală e un shell Angular „Portal ONRC” (0,10 s), cu cookie F5 `TS01629457`. Chunk-ul principal `575.d8c1fa9524898f6c.js` are 9.233.769 B (3,9 s). Am găsit în el:
  - configurarea `keycloak:{issuer:"https://sso.onrc.ro",realm:"onrc",clientId:"frontoffice-app"}`;
  - endpoint-urile interne `/api/v1/portal-core/interf/rc-core/companies/search/v2/complete?cui={cui}&page=0&size=10&active=true` și `/interf/rc-core/companies/recom/search/office-address`, cu jurnalizare `RECOM_SEARCH`.
  
  Nu le-am apelat: sunt API-uri interne nedocumentate, iar bugetul de cereri era consumat — [myportal.onrc.ro](https://myportal.onrc.ro/)
- **Verdict NU** (fără acord ONRC). Vechile adrese nu mai există, accesul trece prin SSO, API-ul e intern și nedocumentat, iar datele complete RECOM sunt cu plată. Ruta legitimă rămâne snapshot-ul de pe data.gov.ro, plus o cerere de API în baza Legii 179/2022 și a Regulamentului (UE) 2023/138.

**BPI (bpi.ro)**
- DNS: 136.255.220.168. robots.txt (200, 91 B) interzice doar `/wp-admin/` și `/wp-login.php`. Pagina principală: 200, 124.021 B, 0,75 s, cookie F5 `TS01fe9264`. Textul spune că serviciile „Buletinul Insolvenţei online”, „Sumar număr BPI” şi „Persoane publicate în BPI” sunt disponibile doar în portalul ONRC myportal, pentru care e nevoie de un cont de utilizator. Crearea contului e gratuită. Pagina „Tarife BPI” (`?page_id=487`, 200, 112.766 B) trimite la subpagini de tarife, pe care nu le-am citit — [bpi.ro](https://www.bpi.ro/)
- `bpipf.onrc.ro` este CNAME către `myportal.onrc.ro` — test DNS propriu
- **Verdict NU** pentru acces automat: căutările sunt doar în myportal, cu cont (SSO Keycloak), textul integral e pe abonament și nu există API.

**ANCPI ePay**
- `epay.ancpi.ro` și `myeterra.ancpi.ro` → **NXDOMAIN** pe resolverul local, pe 1.1.1.1 și pe 8.8.8.8. Zona `ancpi.ro` e pe Cloudflare (SOA `iris.ns.cloudflare.com`) — test DNS propriu
- www.ancpi.ro: robots.txt gestionat de Cloudflare (`ai-train=no, use=reference`, ClaudeBot interzis). Pagina principală (200, 7.552 B) este un anunț static:
  - din 20 august 2026 au fost reactivate e-Terra și funcția „Link de plată”;
  - „Celelalte platforme online gestionate de ANCPI – Registrul de Transcripțiuni și Inscripțiuni (RTI), MyEterra, Registrul proprietarilor, Titluri de proprietate și Geoportal – vor fi repuse în funcțiune etapizat”;
  - ePay nu e menționat.
  
  — [ancpi.ro](https://www.ancpi.ro/)
- **Verdict NU.** Serviciul este indisponibil (fără DNS). Cauza indisponibilității nu e precizată pe pagină.

**RNPM (co.rnpm.ro)**
- DNS: rnpm.ro → 176.126.201.10 (netestat HTTP); co.rnpm.ro → 185.18.227.246 (Apache 2.2.31/CentOS 7). `/robots.txt` întoarce index-ul SPA (200, `text/html`), deci nu există robots.txt. Pagina principală: 200, 6.339 B, 0,11 s. Încarcă `https://www.google.com/recaptcha/api.js` — [co.rnpm.ro](https://co.rnpm.ro/)
- `dist/bundle.js` (200, 415.249 B) conține `grecaptcha.render("gRecaptcha",{sitekey:System.GCODE_SITE_KEY,callback:…$("#buttonSearch").removeAttr("disabled")…})` pentru fiecare tip de căutare (AS, CS, IM, FI, OI). Endpoint-urile sunt `search/ipoteci/`, `search/fiducii/`, `search/specifice/`, `search/creante/` și `search/obligatiuni/`. Butonul de căutare rămâne dezactivat până la rezolvarea reCAPTCHA v2 — [bundle.js](https://co.rnpm.ro/dist/bundle.js)
- Termeni („SUNT STRICT INTERZISE”): „Utilizarea unui robot, spider sau alt dispozitiv automat, pentru a accesa, procesa sau prelua orice conţinut al site-ului”, „Copierea cu ajutorul unor dispozitive sau programe automate a conţinutului Site-ului” și faptul că „Baza de date a R.N.P.M. […] nu poate fi exportată către terți” — [Termeni RNPM](https://co.rnpm.ro/partials/termeni/viewTermeniSiConditii.html)
- **Verdict NU.** Căutarea cere CAPTCHA, iar termenii interzic explicit accesul automat.

**Tabloul avocaților (UNBR → ifep.ro, cautavocat.ro) și avocatura.com**
- unbr.ro (Cloudflare): robots.txt (99 B) interzice `/fisiere/file/aegrm/`, `/fisiere/file/aegrm-old/` și `/docs/`. Pagina principală (200, 186.552 B, 1,17 s) are meniul „Tabloul avocatilor”, care trimite la „Caut avocat” (`https://www.cautavocat.ro/`) și la „Tablou IFEP” (`https://www.ifep.ro/Justice/Lawyers/LawyersPanel.aspx`). Domeniile `tablou.unbr.ro` și `tabloul.unbr.ro` nu există — [unbr.ro](https://unbr.ro/)
- ifep.ro: robots.txt (2.388 B) are o listă lungă de interdicții pentru `*`: `/Ecris/`, `/OpenRegisters/`, `/Registry/`, `/*.pdf$`, `/*.asmx$`, `/LawyersQuery.aspx` etc. `/Justice/Lawyers/LawyersPanel.aspx` nu e interzis. Pagina „Tabloul avocatilor din România” răspunde 200, 124.410 B, 0,90 s, prin Cloudflare, fără provocare. E o aplicație ASP.NET WebForms, cu filtre pe barou, status și formă de exercitare. Fișele au forma `LawyerFile.aspx?RecordId={id}&Signature={…}` — [ifep.ro – Tablou](https://www.ifep.ro/Justice/Lawyers/LawyersPanel.aspx)
- Termenii IFEP: „Este interzisă în mod expres orice încălcare […] incluzând fără a se limita la reproducerea, distribuirea, comercializarea […], copierea, modificarea, afișarea, transmiterea, publicarea, în orice formă a conținutului”. Operatorul declară că deține drepturile asupra „bazelor de date prezentate pe portal” — [ifep.ro – Termeni](https://www.ifep.ro/TermsAndConditions.aspx)
- cautavocat.ro: robots.txt are `User-agent: *` și `Allow: /`. Pagina principală răspunde 200, 53.589 B, 0,13 s. Căutarea e un formular GET (`avocati.php`), cu pagini pe județ `/avocati/{judet}`. CAPTCHA-ul imagine apare doar la formularul de contact. Platforma conține doar avocații înscriși pe ea, nu tot tabloul — [cautavocat.ro](https://www.cautavocat.ro/)
- avocatura.com: robots.txt are `*` Allow, dar **`User-agent: ClaudeBot` / `Disallow: /`** (la fel pentru Amazonbot, PetalBot, MJ12bot etc.). Este un director comercial („Consultă un avocat online”), nu o sursă oficială — [avocatura.com/robots.txt](https://www.avocatura.com/robots.txt)
- **Verdicte.**
  - ifep.ro: **CONDIȚIONAT**, doar pentru verificare punctuală a unui avocat, cu link către fișă, fără stocare sau indexare, conform termenilor. Cerere care funcționează: `curl -A 'LexAI/1.0 (verificare surse; uz personal)' https://www.ifep.ro/Justice/Lawyers/LawyersPanel.aspx`. Filtrarea cere postback WebForms și nu a fost testată.
  - cautavocat.ro: **CONDIȚIONAT** (termenii necitiți, acoperire parțială).
  - avocatura.com: **NU**.

**Registrul Național ONG (Ministerul Justiției)**
- Lansarea portalului pe 11.09.2026 este confirmată de presă, dar articolele găsite nu dau URL-ul — [Agerpres EN, 11.09.2026](https://agerpres.ro/english/2026/09/11/justice-ministry-launches-ngo-national-register-portal-with-online-establishment-or-administrative-p--1592670); [InfoCons](https://infocons.ro/1-infocons-te-informeaza-ministerul-justitiei-a-lansat-portalul-registrului-national-al-ong-urilor/)
- Am găsit adresa prin DNS: `rnong.just.ro` → 104.18.30.134 și 104.18.31.134 (Cloudflare). `/robots.txt` (200, 20.549 B) conține regulile Cloudflare (`*` Allow, `ai-train=no, use=reference`, ClaudeBot interzis), urmate de index-ul SPA. Acesta are titlul **„Portalul RNONG”** și rădăcina `<rnong-portal-root>` (Angular, Kendo UI), ceea ce confirmă că este portalul registrului. Pagina principală → **403** „Just a moment...”, atât cu UA LexAI (5.414 B), cât și cu UA de browser (5.585 B) — [rnong.just.ro](https://rnong.just.ro/)
- **Verdict NU.** Accesul e blocat de o provocare Cloudflare managed, iar robots.txt exclude agenții AI. Nu am găsit un API sau un set de date pe data.gov.ro.

**ANAF `PlatitorTvaRest/v9/tva`**
- `https://webservicesp.anaf.ro/robots.txt` → 404 (pagina redirecționează prin JS la anaf.ro), deci nu există robots.txt. Răspunsurile au cookie F5 `TS01a203a4`, dar nu există provocare — [webservicesp.anaf.ro](https://webservicesp.anaf.ro/robots.txt)
- POST cu `[{"cui":14399840,"data":"2026-11-01"}]`: **200**, `application/json`, 1.896 B, 2,1 s.
  - Rezultat: `found` = 1 (DANTE INTERNATIONAL SA, J2002000372404, „INREGISTRAT din data 29.08.2006”, `scpTVA: true`, `statusInactivi: false`, `statusRO_e_Factura: false`), `notFound` = [].
  - Cheile răspunsului sunt `date_generale`, `inregistrare_scop_Tva`, `inregistrare_RTVAI`, `stare_inactiv`, `inregistrare_SplitTVA`, `adresa_sediu_social` și `adresa_domiciliu_fiscal`.
  - **Răspunsul real nu are câmpurile `cod` și `message`** pe care le arată documentația.
  
  — [ANAF v9](https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva)
- Regulile din documentație: „a) Un request poate contine maxim 100 de CUI-uri. Un client poate executa maxim 1 request pe secunda.” și „b) Orice tentativa de suprasolicitare a serverului va fi pedepsita conform reglementarilor in vigoare.” — [doc_WS_V9.txt](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt)
- **Verdict DA.** Este un API public destinat acestui scop. Limita de 1 cerere/s nu e o constrângere practică pentru un singur avocat. Cerere care funcționează:
  ```
  curl -A 'LexAI/1.0 (verificare surse; uz personal)' -X POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva \
    -H 'Content-Type: application/json' --data '[{"cui":14399840,"data":"2026-11-01"}]'
  ```

### Inferences
- Pentru `info_firma`: ANAF v9 live plus snapshotul lunar ONRC descărcat de pe data.gov.ro. ID-ul seturilor se ia din pagina HTML a organizației, cu cel puțin 10 s între cereri. Fișierul `od_reprezentanti_legali` nu ar trebui importat (date personale: data și locul nașterii). Parserul nu trebuie să depindă de `cod`/`message` în răspunsul ANAF.
- Insolvență, RECOM, RNPM, ANCPI și ONG: niciuna nu are acum un canal automat legitim. Rămân fluxuri „human-in-the-loop” (avocatul încarcă extrasul sau documentul) sau acorduri instituționale.

### Gaps
- Nu am verificat termenii myportal.onrc.ro, cautavocat.ro și ai portalului RNONG, nici tarifele BPI curente (subpaginile nu au fost citite) și nici dacă API-ul intern RECOM răspunde anonim.
- Nu am testat `rnpm.ro` (apex) și serviciul ANAF `bilant`.

## 5. Diferențe față de notele anterioare și abateri de la protocol

### Takeaway
Mai multe afirmații din notele vechi nu mai sunt valabile: PortalWS e acum după Cloudflare și merge doar pe HTTP, ROLII a dispărut, portal.onrc.ro și epay.ancpi.ro nu mai au DNS, iar GET-ul pe /736 de pe scj.ro dă 500. Am avut o abatere de la robots.txt pe data.gov.ro și două descărcări mari involuntare, descrise mai jos.

### Cited Findings
- **Corecturi față de `jurisprudenta_ro.md` și `registre_comerciale.md`:**
  - PortalWS „fără Cloudflare” → acum e pe Cloudflare. „HTTP 525” → apare doar pe HTTPS, iar HTTP funcționează — [WSDL](http://portalquery.just.ro/query.asmx?WSDL)
  - ROLII „nu răspunde” → certificatul `*.csm1909.ro` e servit pe IP-ul ROLII, iar apex-ul servește altă aplicație — [rolii.ro](https://rolii.ro/)
  - ccrsearch „nu răspunde” → HTTP nu răspunde, dar HTTPS răspunde, ca „CCR Acces Parti” în spatele F5 — [ccrsearch.ccr.ro](https://ccrsearch.ccr.ro/)
  - scj.ro „se interoghează prin GET cu `customQuery`” → GET-ul parțial dă 500; funcționează POST-ul cu toate cele 16 chei — [scj.ro/736](https://www.scj.ro/736/Cautare-jurisprudenta)
  - „portal.onrc.ro (InfoCert, formulare)” → NXDOMAIN; doar myportal.onrc.ro există — test DNS
  - „epay.ancpi.ro, 20 lei/extras” → NXDOMAIN la 1.11.2026 — test DNS; [ancpi.ro](https://www.ancpi.ro/)
  - Registrul ONG „URL negăsit” → `rnong.just.ro`, în spatele unei provocări Cloudflare — [rnong.just.ro](https://rnong.just.ro/)
  - data.gov.ro: notele vechi nu menționau `Disallow: /api/` și `Crawl-Delay: 10` — [robots.txt](https://data.gov.ro/robots.txt)
- **Abateri de la protocol (asumate):**
  1. **data.gov.ro `/api/`.** Am făcut o cerere `package_search` pe `/api/` în aceeași comandă cu citirea robots.txt, înainte de a vedea că `/api/` e interzis. Intervalul a fost de 2 s, nu de 10 s cât cere `Crawl-Delay`. Cererile următoare au respectat cele 10 s.
  2. **Descărcări CSV mari.** Pentru a citi doar antetul CSV-urilor am trimis cereri cu `Range: bytes=0-1500`. Serverul a ignorat Range-ul și a trimis fișierele întregi. Descărcările s-au oprit la timeout-ul de 30 s, după ~270 MB și ~300 MB. Fișierele au fost șterse imediat, iar din ele am păstrat doar rândul de antet.
  3. **ccr.ro.** Din cauza unui bug în scriptul de test, robots.txt și pagina de admiteri au fost cerute de câte două ori, plus PDF-ul: în total 5 cereri, în limită.
  4. **scj.ro.** Pagina de detaliu `/1093` nu a fost testată, ca să nu depășesc 5 cereri.
  5. **Diagnostic TLS ROLII.** Pentru ROLII am folosit o dată `curl -k` (fără verificarea certificatului), doar ca să văd ce servește IP-ul. Nu a fost ocolită nicio protecție.
  6. **Fără date personale.** Nicio dată personală (părți, avocați, reprezentanți) nu a fost păstrată în aceste note.

### Inferences
- Peisajul s-a schimbat față de cercetarea anterioară: mai multe site-uri .ro guvernamentale au trecut pe Cloudflare cu semnale anti-AI (just.ro, ancpi.ro, curteadeconturi.ro). Orice adaptor trebuie să aibă un health-check care detectează pagina „Just a moment…” (HTTP 403) și o tratează ca „sursă indisponibilă”, fără reîncercări agresive.

### Gaps
- Testele reflectă starea dintr-o singură zi și de la un singur IP (conexiunea locală, servită de PoP-urile Cloudflare VIE/SOF). Regulile WAF pot fi diferite pentru alte IP-uri, de exemplu de cloud.
