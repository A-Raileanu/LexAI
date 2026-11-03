# Surse oficiale de legislație română și UE (acte normative și forme consolidate) pentru integrare programatică în LexAI

> Note de cercetare, stare la 1 noiembrie 2026. Unde scrie „verificat direct”, am apelat eu endpointul sau am descărcat pagina (curl) pe 1.11.2026, iar URL-ul citat este cel testat. Restul afirmațiilor vin din paginile citate. Sursele terțe (bloguri, GitHub, Apify) sunt marcate ca atare.

## 1. Portal Legislativ (legislatie.just.ro, Ministerul Justiției): API, forme consolidate, datare, termeni de reutilizare

### Takeaway
Portalul are un serviciu web SOAP **oficial, documentat și fără înregistrare** (`/apiws/FreeWebService.svc`). Acesta are însă doar două metode, `GetToken` și `Search`, întoarce maximum 10 rezultate pe pagină și dă textul de bază al actului, nu consolidările la o dată. Pentru `info_act`, `citeste_articol` la dată și istoric, scrapingul HTML (`/Public/DetaliiDocument/{id}`) rămâne necesar. Termenii portalului declară consolidările **neoficiale, cu caracter informativ**. Reutilizarea textelor este permisă, pentru că textele oficiale nu sunt protejate de dreptul de autor (Legea 8/1996).

### Cited Findings
**Conținut și acoperire**
- Portalul se descrie ca „sistem informațional de legislație care permite accesul rapid, liber și neîngrădit” la legislația națională „în formă actualizată și consolidată”. Oferă: peste 150.000 de acte normative (din 1989 la zi, plus acte de interes anterioare), căutare după tip, număr și an, filtrare după emitent, tip și publicație, toate modificările suferite în timp, modificările aduse de un act, cuprinsul actului, dacă mai este în vigoare și „forma consolidată a actului normativ la o anumită dată selectată de către utilizator” — [Funcționalități](https://legislatie.just.ro/Public/Functionalitati) (verificat direct).
- N-Lex descrie portalul ca bază de date națională a României: peste 150.000 de acte din 1989 la zi plus legislație relevantă anterioară, **actualizată zilnic**, cu versiuni consolidate la date alese de utilizator — [N-Lex, info RO](https://n-lex.europa.eu/n-lex/info/info-ro/index?lang=en).
- Portalul a fost dezvoltat în proiectul „Implementarea Portalului N-Lex” (oct. 2012 – feb. 2015, FSE/PODCA) și este interconectat cu N-Lex — [Despre proiect](https://legislatie.just.ro/Public/NLEX) (verificat direct).
- Interfața afișează încă un banner „Versiune Beta” și un avertisment pentru Internet Explorer 8, ceea ce sugerează o platformă veche: ASP.NET MVC 4.0 / .NET 4.0.30319 în spatele nginx/1.24.0 (antete HTTP) — [DetaliiDocument/256414](https://legislatie.just.ro/Public/DetaliiDocument/256414) (verificat direct, antete `x-aspnetmvc-version: 4.0`, `x-aspnet-version: 4.0.30319`).

**Serviciul web oficial (SOAP)**
- Documentația oficială se află pe pagina „Acces programatic la date – Configurări și Documentație”, legată din pagina Funcționalități: „Adresa serviciului este: http://legislatie.just.ro/apiws”, „Tehnologia utilizată … este SOAP” — [ServiciulWebLegislatie.htm](https://legislatie.just.ro/ServiciulWebLegislatie.htm) (verificat direct).
- Fluxul documentat are doi pași. (1) `GetToken` întoarce un token care „are o perioadă de valabilitate”, iar la expirare se regenerează. (2) `Search` cu parametrii obligatorii `tokenKey`, `NumarPagina`, `RezultatePagina` și parametrii opționali `SearchAn`, `SearchNumar`, `SearchTitlu`. Răspunsul este o listă de obiecte „Legi” — [ServiciulWebLegislatie.htm](https://legislatie.just.ro/ServiciulWebLegislatie.htm).
- WSDL-ul are portType `IFreeWebService` cu operațiile `GetToken` și `Search` și binding SOAP 1.1 document/literal. Endpointul este `http://legislatie.just.ro/apiws/FreeWebService.svc/SOAP`, iar SOAPAction este `http://tempuri.org/IFreeWebService/GetToken` sau `.../Search` — [WSDL](http://legislatie.just.ro/apiws/FreeWebService.svc?wsdl) (verificat direct).
- Contractul de date (`CompositeType`) are câmpurile `NumarPagina` (int), `RezultatePagina` (int), `SearchAn`, `SearchNumar`, `SearchText`, `SearchTitlu` (string). Răspunsul `ArrayOfLegi` conține elemente `Legi` cu câmpurile `DataVigoare`, `Emitent`, `LinkHtml`, `Numar`, `Publicatie`, `Text`, `TipAct`, `Titlu` — [XSD xsd2](http://legislatie.just.ro/apiws/FreeWebService.svc?xsd=xsd2), [XSD xsd0](http://legislatie.just.ro/apiws/FreeWebService.svc?xsd=xsd0) (verificat direct). `SearchText` există în XSD, deși documentația nu îl menționează.
- **Nu este necesară înregistrarea**: `GetToken` fără argumente a întors un token (șir de circa 58 de caractere alfanumerice). Un token invalid produce SOAP Fault `InternalServiceFault`, „Padding is invalid and cannot be removed” — [endpoint SOAP](http://legislatie.just.ro/apiws/FreeWebService.svc/SOAP) (verificat direct).
- Comportament observat la testare (verificat direct pe [endpoint](http://legislatie.just.ro/apiws/FreeWebService.svc/SOAP)):
  - `RezultatePagina` este plafonat la **10**: cererile cu 20 sau 50 au întors tot 10 rezultate.
  - Paginarea pare să înceapă de la 1: `NumarPagina` 0 și 1 au întors aceleași rezultate, iar pagina 2 a continuat lista.
  - `SearchAn` **nu este filtru strict**: căutarea „an=2022, nr=179” a întors pe paginile 2–3 acte din 2023–2025, iar „an=2021, nr=57” a întors și Legea 57/2025 și Legea 57/2024. Ordinea pare cronologică.
  - `SearchTitlu="date deschise"` a întors 0 rezultate, deși titlul Legii 179/2022 conține „datele deschise”. Căutarea în titlu pare deci exactă sau fragilă. `SearchText` a funcționat.
  - Câmpul `Text` conține textul integral al actului **în forma publicată** (de exemplu Legea 57/2021 apare ca act modificator, cu textul nou al art. 18), nu o formă consolidată. Un ordin a avut circa 185 KB de text într-un singur răspuns.
  - `LinkHtml` are forma `http://legislatie.just.ro/Public/DetaliiDocument/{id}`, iar `{id}` este identificatorul intern stabil al portalului.
  - Unele câmpuri au caractere corupte: „Ministerul Mediului, Apelor **?**i Pădurilor”, „Agen**?**ia Na**?**ională”. Literele ș/ț cu virgulă devin „?” în `Emitent`, iar textul amestecă diacritice cu sedilă (ş, ţ) și cu virgulă (ș, ț).
- Un exemplu din documentația oficială întoarce o „CIRCULARA nr. 1.481 din 7 decembrie 1837” (Buletinul Oficial), deci baza include și acte istorice — [ServiciulWebLegislatie.htm](https://legislatie.just.ro/ServiciulWebLegislatie.htm).
- Un angajament OGP al României prevedea ca portalul să includă un serviciu web care să permită reutilizarea legislației naționale — [OGP RO0021](https://www.opengovpartnership.org/members/romania/commitments/RO0021) (pagina a întors 403 la fetch, conținut preluat din rezumatul căutării).
- Proiecte terțe care folosesc SOAP-ul: conectorul MCP `ro-eli-mcp` (GetToken fără înregistrare, 10 rezultate pe pagină, parametru `tip_act` pentru dezambiguizare) — [PyPI ro-eli-mcp](https://pypi.org/project/ro-eli-mcp/) (doar din rezumatul căutării, pagina nu s-a încărcat).

**Forme consolidate și datare**
- Fiecare formă (de bază, republicare, actualizare) are propriul `DetaliiDocument/{id}`. Titlul paginii poartă eticheta formei și data, de exemplu `COD CIVIL (A) 04/02/2016`, iar antetul textului spune „(actualizat până la data de 4 februarie 2016*)” — [DetaliiDocument/175630](https://legislatie.just.ro/Public/DetaliiDocument/175630) (verificat direct; pagina are circa 7 MB HTML).
- Pagina unui act conține legături `/Public/DetaliiDocumentAfis/{id}` către actele conexe (modificatoare sau modificate), iar textul are marcaje „+ Capitolul”, „+ Articolul” și linkul „Forma printabilă” — [DetaliiDocument/256414](https://legislatie.just.ro/Public/DetaliiDocument/256414) (verificat direct).

**Termeni, valoare juridică, reutilizare**
- Termenii și condițiile spun că portalul afișează „cu caracter informativ” versiunea oficială publicată în Monitorul Oficial și versiunile consolidate. „Actele oficiale publicate în Monitorul Oficial al României reprezintă singura bază legală…”. În caz de deosebiri, „este considerat autentic doar textul tipărit și publicat în Monitorul Oficial”. Versiunile consolidate sunt „reproducerea neoficială” a actelor modificate dar nerepublicate, iar cine le invocă oficial își asumă răspunderea — [Termeni și Condiții](https://legislatie.just.ro/Public/Termeni) (verificat direct).
- Despre reutilizare, același text spune: întrucât „textele oficiale de natură legislativă nu beneficiază de protecția legală a dreptului de autor, conform Legii nr. 8/1996 … este posibilă reutilizarea textelor legale, în limita celor prezentate mai sus” — [Termeni și Condiții](https://legislatie.just.ro/Public/Termeni). În subsol apare totuși „Copyright © 2026 – Ministerul Justiției. Toate drepturile rezervate.” — [același URL](https://legislatie.just.ro/Public/Termeni). Indexul Open Knowledge a semnalat istoric aceeași ambiguitate — [OKFN Index 2015](https://2015.index.okfn.org/place/romania/legislation/).
- **robots.txt nu există**: `https://legislatie.just.ro/robots.txt` face 302 către `/Error` — [robots.txt](https://legislatie.just.ro/robots.txt) (verificat direct). Nu există deci reguli robots explicite, nici permisive, nici restrictive.
- Legea 179/2022 (datele deschise și reutilizarea informațiilor din sectorul public, MO nr. 577 din 14.06.2022) — [DetaliiDocument/256414](https://legislatie.just.ro/Public/DetaliiDocument/256414):
  - art. 9 alin. (1): „Reutilizarea documentelor este gratuită”, cu posibilă recuperare a costurilor marginale;
  - art. 8 alin. (6) și art. 12 alin. (1): datele dinamice se pun la dispoziție „prin intermediul unor API adecvate și, dacă este cazul, prin descărcare în masă”; API-urile trebuie să aibă „documentație tehnică clară, completă și disponibilă online” și să respecte principiile disponibilitate, stabilitate, întreținere, securitate;
  - art. 12 alin. (2): parametrii API sub formă XML/JSON;
  - art. 11: reutilizarea nu este supusă unor condiții decât dacă acestea sunt obiective și proporționale; licențele standard sunt certificate de ADR;
  - art. 1 alin. (2) lit. c): legea nu se aplică documentelor asupra cărora terții dețin drepturi de proprietate intelectuală.
- Pe data.gov.ro nu există un set de date cu corpusul legislativ. Organizația „Ministerul Justiției” (`mj`) are 81 de seturi, niciunul cu legislație. Căutările „legislatie”, „proiecte legi” și „Consiliul Legislativ” nu au găsit corpusuri normative — [CKAN package_search org mj](https://data.gov.ro/api/3/action/package_search?fq=organization:mj&rows=100), [CKAN q=legislatie](https://data.gov.ro/api/3/action/package_search?q=legislatie) (verificat direct).

**Anti-bot**
- Răspunsurile HTML conțin antetele `x-country: RO` și `x-block: 0`, ceea ce indică un strat de filtrare geo/IP în fața aplicației — [DetaliiDocument/256414](https://legislatie.just.ro/Public/DetaliiDocument/256414) (verificat direct).
- Un actor Apify comercial afirmă că portalul „blochează IP-urile de datacenter” și folosește implicit proxy rezidențial RO, cu retry la 429/5xx — [Apify romanian-legislation-scraper](https://apify.com/ponderable_hydrometer/romanian-legislation-scraper) (sursă terță, neconfirmată oficial).
- Proiectul open-source `scriptogre/romanian-law-data` publică zilnic, prin GitHub Actions, un export Parquet (circa 187k documente, circa 993k articole, circa 1,96M alineate și un tabel de relații de tip abrogă/modifică/suspendă) „scraped via the public HTML” — [GitHub scriptogre/romanian-law-data](https://github.com/scriptogre/romanian-law-data) (sursă terță; licența nu este declarată pe pagină).

### Inferences
- Pentru LexAI, SOAP-ul oficial e util ca **sursă de căutare și descoperire mai stabilă decât HTML-ul**. Poate alimenta `cauta_act` după număr, an și tip (cu filtrare pe client după `TipAct` și an, fiindcă `SearchAn` nu filtrează strict) și poate da textul de bază și `id`-ul `DetaliiDocument`. Nu poate înlocui scrapingul pentru `info_act` (lanțul de forme, modificări, republicări), pentru `citeste_articol` la o dată și nici pentru `cauta_in_act`.
- Strategie de adaptor: cache pentru token cu retry la Fault; plafon de 10 pe pagină; normalizare de diacritice (ş/ţ cu sedilă → ș/ț cu virgulă, iar „?” în `Emitent` se reconstruiește din `Text`); deduplicare după `LinkHtml`. Rate limiting conservator e recomandat, chiar dacă nu există o limită documentată.
- Textul portalului trebuie prezentat cu avertismentul „informativ; autentic este doar textul din MO” (Termeni). Pentru citare oficială, fiecare articol ar trebui legat de numărul de MO al actului de bază și al actelor modificatoare.
- Prin art. 8 alin. (6) și art. 12, Legea 179/2022 dă un argument juridic pentru a cere MJ un API REST/JSON documentat sau descărcare în masă. Legislația nu e „dinamică” în sensul strict al legii, deci obligația nu e clară.

### Gaps
- Nu am găsit limite oficiale de rată, durata de valabilitate a tokenului sau un SLA pentru `apiws`. Nici varianta HTTPS a endpointului SOAP nu a fost testată exhaustiv (WSDL-ul declară `http://`).
- Nu am verificat dacă există o metodă nedocumentată pentru forme consolidate sau versiuni; WSDL-ul public conține doar `GetToken` și `Search`.
- „Ghidul de utilizare portal legislativ” (PDF, [link](http://legislatie.just.ro/ImaginiDinActe/Ghid%20de%20utilizare%20portal%20legislativ.pdf)) nu a fost citit.
- Nu am verificat dacă câmpul `Text` din SOAP este mereu forma de bază sau, uneori, ultima formă consolidată.
- Pagina ELI a României pe N-Lex nu s-a încărcat. Nu am găsit dovezi că portalul expune URI-uri ELI (vezi secțiunea 5).

## 2. Monitorul Oficial al României (monitoruloficial.ro, e-Monitor): acces gratuit, valoare juridică, Părțile I–VII, API

### Takeaway
Din 2021 (Legea 57/2021, care a modificat art. 18 din Legea 202/1998), **Partea I și Partea a II-a** sunt gratuite, permanent, ca PDF fără filigran, cu drept de căutare, salvare, distribuire și imprimare din ziua publicării. Părțile III–VII sunt doar „pentru citire” timp de 10 zile. Nu există API. Accesul programatic se face printr-un endpoint AJAX intern (`get_mo.php`) și URL-uri PDF previzibile, dar robots.txt interzice `/ramo_customs/` și `/docs/`, iar PDF-ul se servește doar cu `Referer` corect.

### Cited Findings
- Legea 57/2021 rescrie art. 18 din Legea 202/1998: „(2) Formatul electronic al Monitorului Oficial al României, Partea I și a II-a, este disponibil în mod gratuit și liber, permanent. Formatul electronic gratuit și liber este de document portabil, fără filigran sau inscripții suplimentare formatului tipărit; acesta devine accesibil tuturor utilizatorilor în aceeași zi cu publicarea, inclusiv pentru căutare, salvare, distribuire și imprimare”. Formatul tipărit rămâne contra cost — [Legea 57/2021 pe Portal Legislativ](https://legislatie.just.ro/Public/DetaliiDocument/240363) (verificat prin SOAP; DataVigoare 2021-04-05).
- Acoperirea declarată de e-Monitor — [monitoruloficial.ro/e-monitor](https://monitoruloficial.ro/e-monitor/) (verificat direct):
  - Partea I în limba română: 2000 – la zi, PDF;
  - Partea I în limba maghiară: 2008 – la zi;
  - Partea a II-a: 2000 – la zi;
  - Părțile III–VII: „în variantă «pentru citire» timp de 10 zile de la publicare”;
  - „E-monitor este în curs de extindere pentru toată perioada 1990 – la zi”;
  - colecțiile anterioare (după 1990, plus Buletinul Oficial 1966–1989) se comandă scanat sau printat cu 2 lei/pagină (2,5 lei/pagină pentru selecții).
- Mecanism tehnic, verificat direct:
  - Pagina e-Monitor face `POST ../ramo_customs/emonitor/get_mo.php` cu `{today: <dată>}` și primește un fragment HTML cu numerele zilei pe părți, de exemplu Partea I nr. 906–916 (inclusiv „907Bis”), Partea a II-a nr. 143, Partea a III-a nr. 310 — [get_mo.php](https://monitoruloficial.ro/ramo_customs/emonitor/get_mo.php).
  - Linkurile au forma `/Monitorul-Oficial--PI--{nr}--{an}.html`, `--PII--`, `--PIII--`. Fără antetul `Referer: https://monitoruloficial.ro/e-monitor/` URL-ul redirecționează la pagina principală. Cu Referer, URL-ul `.html` servește direct `application/pdf` (circa 120 KB pentru MO PI 906/2026) — [MO PI 906/2026](https://monitoruloficial.ro/Monitorul-Oficial--PI--906--2026.html).
  - Site-ul are reCAPTCHA configurat (variabile `captcha_provider` și `recaptcha` în pagină), cel puțin pe formularele de publicare — [monitoruloficial.ro](https://monitoruloficial.ro/).
- robots.txt al monitoruloficial.ro: `Disallow: /?s=`, `/search/`, `/docs/`, `/ramo_customs/`, `/locale/`. Interzice complet `meta-externalagent` (Crawl-delay 30) și are sitemap-uri WordPress — [robots.txt](https://monitoruloficial.ro/robots.txt) (verificat direct). **Endpointul `get_mo.php` se află sub `/ramo_customs/`, deci este exclus prin robots.**
- Pagina „Condiții de utilizare” tratează în principal cookie-urile. Nu am găsit clauze explicite despre extragere automată sau reutilizare — [Condiții de utilizare](https://monitoruloficial.ro/conditii-de-utilizare/) (verificat direct, căutare după „robot”, „automat”, „reproduc”, „comercial”).
- Valoare juridică: termenii Portalului Legislativ spun că „este considerat autentic doar textul tipărit și publicat în Monitorul Oficial” și că actele publicate în MO sunt „singura bază legală” — [Termeni Portal Legislativ](https://legislatie.just.ro/Public/Termeni). Legea 57/2021 reglementează formatul electronic gratuit ca „document portabil, fără filigran sau inscripții suplimentare formatului tipărit”, adică identic cu tiparul, dar nu îi declară expres caracterul autentic — [Legea 57/2021](https://legislatie.just.ro/Public/DetaliiDocument/240363).
- Context istoric: înainte de 2021, versiunea electronică gratuită era disponibilă doar 10 zile, fără căutare, salvare sau imprimare — [economica.net](https://www.economica.net/?p=125991), [avocatnet.ro](https://www.avocatnet.ro/articol_15788/Noi-reglementari-privind-accesarea-gratuita-a-monitoarelor-oficiale.html) (surse de presă, date ca istoric). Presa a semnalat în 2025 o nouă propunere privind publicarea MO gratuit în format PDF — [profit.ro](https://profit.ro/stiri/politic/monitorul-oficial-obligat-sa-publice-gratuit-legile-si-alte-acte-oficiale-in-format-pdf-19468428) (403 la fetch; stadiul nu e verificat).
- O arhivă paralelă de PDF-uri MO se află pe infrastructura Consiliului Legislativ: `http://86.105.216.122:83/MOfsWeb/{an}/{nnnn}.pdf` (de exemplu MO 965/2002, 742 KB, `application/pdf`), referită din API-ul de forme consolidate al CLR — [MOfsWeb 2002/0965](http://86.105.216.122:83/MOfsWeb/2002/0965.pdf) (verificat direct; nedocumentat public).

### Inferences
- Pentru LexAI, PDF-ul MO Partea I este cea mai apropiată sursă de „text oficial” disponibilă gratuit. Un adaptor `monitorul_oficial` ar putea: (a) primi numărul și anul MO din metadatele Portalului Legislativ („Publicat în MONITORUL OFICIAL nr. X din …”), (b) construi URL-ul `/Monitorul-Oficial--PI--{nr}--{an}.html` și (c) descărca PDF-ul cu Referer, pentru citarea autentică sau linkul de verificare. Nu e nevoie de crawl în masă.
- Respectarea robots.txt înseamnă să **nu** folosim `get_mo.php` pentru crawl automat. Linkurile directe `Monitorul-Oficial--…html` nu sunt interzise de robots, dar condiționarea de Referer arată că operatorul nu dorește hotlinking. Recomand volum mic, cache local și, ideal, un acord scris cu RA „Monitorul Oficial”.
- Părțile III–VII (de exemplu Partea a IV-a cu actele societăților, Partea a VI-a cu achizițiile) nu sunt practic utilizabile programatic, fiind disponibile doar 10 zile și „pentru citire”.

### Gaps
- Nu am verificat dacă PDF-urile au text extractibil (fonturi cu ToUnicode) sau sunt imagini; analiza a fost neconcludentă din cauza object streams.
- Nu am găsit vreun act care să declare expres valoarea autentică a PDF-ului e-Monitor (spre deosebire de JO al UE, vezi secțiunea 3).
- Nu am găsit niciun API oficial, feed RSS sau set de date al MO pe data.gov.ro. Căutarea „Monitorul Oficial” pe data.gov.ro a întors doar seturi fără legătură — [CKAN q=Monitorul Oficial](https://data.gov.ro/api/3/action/package_search?q=Monitorul%20Oficial) (verificat direct).

## 3. EUR-Lex și Oficiul pentru Publicații al UE: serviciul web SOAP, CELLAR (SPARQL/REST), limba română, consolidări, ELI, N-Lex

### Takeaway
Pentru integrare programatică, **CELLAR este calea cea mai bună**. Endpointul SPARQL public și REST cu negociere de conținut funcționează fără cont și fără challenge anti-bot, iar `Accept-Language: ron` întoarce textul românesc, inclusiv pentru consolidări (`celex 0…`). Site-ul eur-lex.europa.eu are un **challenge AWS WAF** (HTTP 202 gol) pentru clienți non-browser. Serviciul web SOAP EUR-Lex (`doQuery`, interogare expert) cere cont EU Login, aprobare și WS-Security, cu cotă zilnică stabilită per utilizator.

### Cited Findings
**Serviciul web EUR-Lex (SOAP)**
- Este bazat pe SOAP și gratuit după înregistrare; cererea de acces include utilizarea preconizată, datele dorite și „numărul maxim de apeluri pe zi”. Aprobarea vine pe e-mail, apoi utilizatorul primește un șablon XML de interogare. Limita zilnică se poate modifica din pagina de servicii web. Helpdesk: EURLEX-HELPDESK@publications.europa.eu — [EUR-Lex Help: Webservice](https://eur-lex.europa.eu/content/help/data-reuse/webservice.html?locale=en) (preluat din rezumatul căutării; pagina directă e protejată de WAF). Este necesar cont EU Login („My EUR-Lex”) — [EUR-Lex: create account](https://eur-lex.europa.eu/content/help/my-eurlex/create-account.html).
- WSDL-ul are o singură operație, `doQuery`, cu SOAP 1.2 și SOAPAction `https://eur-lex.europa.eu/ws/doQuery`, endpoint `https://eur-lex.europa.eu/EURLexWebService`, plus o politică WS-Security `UsernameToken` (WssUsernameToken11) obligatorie — [WSDL EUR-Lex](https://eur-lex.europa.eu/EURLexWebService?wsdl) (verificat direct; WSDL-ul nu era blocat de WAF).
- `searchRequest` are câmpurile `expertQuery` (string), `page`, `pageSize`, `searchLanguage`, precum și câmpurile opționale `limitToLatestConsleg`, `excludeAllConsleg`, `showDocumentsAvailableIn` — [XSD EUR-Lex](https://eur-lex.europa.eu/EURLexWebService?xsd=3) (verificat direct). Serviciul poate deci restrânge rezultatele la ultima consolidare.
- Manualul vechi (v2.00) indică o eroare dacă `pageSize` depășește limita, „by default, the maximum value is 100”, și o eroare la depășirea numărului zilnic de apeluri — [Search Web Service User Manual v2.00](https://eur-lex.europa.eu/content/tools/webservices/SearchWebServiceUserManual_v2.00.pdf) (rezumatul căutării; documentul este vechi și poate fi depășit). Un proiect GitHub terț menționează „1000 requests” pe zi pentru contul său — [foodlaw.ai PR #2](https://github.com/tomaszkrawczyk-cmd/foodlaw.ai/pull/2) (terț, nu e cifră oficială).

**CELLAR (SPARQL și REST)**
- Endpointul SPARQL `https://publications.europa.eu/webapi/rdf/sparql` interoghează metadatele CELLAR prin Common Data Model (CDM), cu namespace `http://publications.europa.eu/ontology/cdm#` — [OP: Cellar knowledge graph](https://op.europa.eu/en/web/cellar/cellar-data/metadata/knowledge-graph).
- Test SPARQL verificat direct, fără autentificare, HTTP 200 JSON: pentru CELEX `32016R0679` am obținut work-ul CELLAR, ELI-ul `http://data.europa.eu/eli/reg/2016/679/oj` (`cdm:resource_legal_eli`) și expresia în limba `…/authority/language/RON` (`cdm:expression_uses_language`). Interogarea după prefixul `02016R0679` a întors consolidarea `02016R0679-20160504` — [SPARQL endpoint](https://publications.europa.eu/webapi/rdf/sparql).
- REST, verificat direct:
  - `GET http://publications.europa.eu/resource/celex/32016R0679` cu `Accept: application/xhtml+xml` și `Accept-Language: ron` redirecționează la `…/cellar/3e485e15-…0020.03/DOC_1` și întoarce XHTML în română („REGULAMENTUL (UE) 2016/679 AL PARLAMENTULUI EUROPEAN ȘI AL CONSILIULUI”, JO L 119) — [CELLAR celex 32016R0679](http://publications.europa.eu/resource/celex/32016R0679);
  - același apel pentru `celex/02016R0679-20160504` întoarce **textul consolidat în română** cu mențiunea „Acest document are doar scop informativ și nu produce efecte juridice… Versiunile autentice … sunt cele publicate în Jurnalul Oficial” — [CELLAR celex 02016R0679-20160504](http://publications.europa.eu/resource/celex/02016R0679-20160504);
  - cererea cu `Accept: application/xhtml+xml;notice=object` a dat HTTP 400, deci tipurile MIME trebuie alese exact.
- **ELI** UE: `http://data.europa.eu/eli/reg/2016/679/oj` redirecționează la `https://eur-lex.europa.eu/eli/reg/2016/679/oj`, care întoarce challenge WAF pentru curl — [ELI reg/2016/679](http://data.europa.eu/eli/reg/2016/679/oj) (verificat direct). Prin urmare ELI e bun ca identificator, dar pentru conținut trebuie folosit CELLAR.
- **WAF EUR-Lex**: `https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32016R0679` întoarce `HTTP 202`, `Content-Length: 0`, `x-amzn-waf-action: challenge` (CloudFront). La fel răspund paginile de ajutor, PDF-urile de documentație și robots.txt — [EUR-Lex legal-content](https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32016R0679) (verificat direct).

**Valoare juridică și limba română**
- Din 1 iulie 2013 (Regulamentul 216/2013) doar ediția electronică a JO UE este autentică și produce efecte juridice. Prin Regulamentul 2024/741, din 14 martie 2024 sunt autentice doar edițiile electronice publicate pe EUR-Lex — [EUR-Lex: publicarea JO](https://eur-lex.europa.eu/EN/legal-content/summary/publication-of-the-official-journal.html), [EUR-Lex: auth-direct-access](https://eur-lex.europa.eu/oj/all/auth-direct-access.html) (din rezumatul căutării). Textele consolidate sunt doar informative (mențiunea din documentul consolidat, mai sus).
- Pentru acquis-ul anterior aderării (1.1.2007), traducerea română există în **Ediția specială** a JO, organizată în 20 de capitole, conform repertoriului legislației UE — [EUR-Lex: special editions](https://eur-lex.europa.eu/content/help/oj/special-editions.html?locale=en), [EUR-Lex: enlargement RO](https://eur-lex.europa.eu/eu-enlargement/ro/special.html).
- Reutilizare: conținutul EUR-Lex se reutilizează conform Deciziei Comisiei 2011/833/UE, cu condiția menționării sursei — [LawPlayer, care citează nota EUR-Lex](https://lawplayer.com/eu/act/31989D0579) (sursă secundară). Nu am confirmat direct mențiunea CC BY 4.0 pe nota legală EUR-Lex (WAF).

**N-Lex**
- N-Lex este un punct unic de acces la bazele naționale; nu stochează documente, ci interoghează bazele naționale (pentru România, Portalul Legislativ) și oferă traducere automată — [N-Lex about](https://n-lex.europa.eu/n-lex/about/?lang=en), [N-Lex info RO](https://n-lex.europa.eu/n-lex/info/info-ro/index?lang=en). Fiind o fațadă, nu aduce date suplimentare față de legislatie.just.ro.

### Inferences
- Adaptor UE recomandat: (1) **SPARQL CELLAR** pentru căutare și metadate (CELEX, ELI, date, relații de modificare, lista consolidărilor `0…-YYYYMMDD`); (2) **REST CELLAR** cu `Accept-Language: ron` pentru text, cu XHTML/Formex parsabil; (3) SOAP EUR-Lex doar dacă e nevoie de sintaxa de căutare expert, după înregistrare. Așa se evită complet WAF-ul eur-lex.europa.eu.
- Echivalențe pentru `citeste_articol` la dată: în UE, CELEX-ul consolidat `0{an}{tip}{nr}-{YYYYMMDD}` este cheia de versiune. Se alege consolidarea cu data cea mai mare ≤ data cerută și se adaugă avertismentul „informativ”.
- Pentru legătura cu dreptul românesc (transpuneri): EUR-Lex leagă măsurile naționale de transpunere (NIM) de directive, iar N-Lex trimite la ele [N-Lex info RO](https://n-lex.europa.eu/n-lex/info/info-ro/index?lang=en). Ar merita un câmp „transpus prin” în `info_act`.

### Gaps
- Nu am găsit cota zilnică implicită actuală și nici `pageSize` maxim actual pentru SOAP EUR-Lex. Pagina oficială nu e accesibilă fără browser (WAF).
- Nu am verificat limitele de rată sau timeout-urile endpointului SPARQL CELLAR. Nici politica de „fair use” nu a fost găsită în această sesiune.
- Nu am confirmat licența CC BY 4.0 pe nota legală EUR-Lex.
- Nu am găsit informații actuale (2025–2026) despre schimbări în N-Lex.

## 4. Proiecte legislative: Camera Deputaților, Senat, Guvern (transparență decizională), Consiliul Legislativ (avize)

### Takeaway
Nicio instituție nu oferă API sau date deschise pentru procedura legislativă. Toate expun **HTML scrapabil și PDF-uri cu URL-uri previzibile**. cdep.ro (Oracle ORDS, `/ords/pls/proiecte/upl_pck2015.proiect?cam=2&idp=…`) este cea mai structurată sursă și are robots permisiv. senat.ro (ASP.NET WebForms cu VIEWSTATE, în spatele Cloudflare) are PDF-uri cu cod de document în nume. Guvernul publică proiectele dispersat, pe site-urile ministerelor, pe e-consultare.gov.ro și pe sgg.gov.ro. CLR publică zilnic listele de avize emise.

### Cited Findings
**Camera Deputaților (cdep.ro)**
- Site-ul a migrat la prefixul `/ords/`: vechile URL-uri `https://www.cdep.ro/pls/proiecte/upl_pck2015.home` și `/pls/legis/legis_pck.frame` dau 404, iar cele noi sunt `https://www.cdep.ro/ords/pls/...` — [cdep.ro home](https://www.cdep.ro/) (verificat direct; redirect la `/ords/pls/dic/site2015.home?idl=1`).
- „Urmărirea procesului legislativ” — [upl_pck2015.home](https://www.cdep.ro/ords/pls/proiecte/upl_pck2015.home) (verificat direct, UTF-8). Liste pe an: `upl_pck2015.lista?cam=2&anp=2026` (proiecte după an), `?anl=2026` (legi), `?anb=…`, plus `upl_pck2015.interogare?cam=2` (căutare) și `upl_pck2015.buletine_leg` — [lista anp=2026](https://www.cdep.ro/ords/pls/proiecte/upl_pck2015.lista?cam=2&anp=2026) (verificat direct).
- Fișa unui proiect se află la `/ords/pls/proiecte/upl_pck2015.proiect?cam=2&idp={id}` (de exemplu `idp=22923`). Documentele sunt PDF-uri cu cale previzibilă, de exemplu `/proiecte/2026/000/00/1/em797.pdf` (expunere de motive), `pl797.pdf`, `oug797.pdf`, `ces797.pdf`, `csm797.pdf`, `cl797.pdf` (probabil avizele CES, CSM și Consiliului Legislativ după prefix; neconfirmat) — [proiect idp=22923](https://www.cdep.ro/ords/pls/proiecte/upl_pck2015.proiect?cam=2&idp=22923) (verificat direct).
- Baza „legis” a Camerei: `/ords/pls/legis/legis_pck.htp_act?nr={nr}&an={an}` întoarce fișa actului (Lege nr. 100/2026: emitent, nr. P.L.-x la Cameră, M.Of. nr. 520/24 iun. 2026, decretul de promulgare, „funcție pasivă”), iar `htp_act?ida={id}` dă detaliile. Declinarea de răspundere spune: „textele actelor normative nu au caracter oficial” — [legis htp_act nr=100 an=2026](https://www.cdep.ro/ords/pls/legis/legis_pck.htp_act?nr=100&an=2026) (verificat direct).
- Votul electronic este disponibil la `/ords/pls/steno/evot2015.data` — [cdep.ro home](https://www.cdep.ro/) (link verificat).
- robots.txt cdep.ro: doar `Disallow: /declaratii/` — [robots.txt](https://www.cdep.ro/robots.txt) (verificat direct).

**Senat (senat.ro)**
- Fișa legislativă: `https://www.senat.ro/Legis/Lista.aspx?nr_cls=L534&an_cls=2020`. Documentele sunt PDF-uri cu pattern-ul `/legis/PDF/{an}/{aa}L{nr}{COD}.PDF` (de exemplu `20L534EM.PDF`, `…LG`, `…FG`, `…AD`, `…ES`, `…CR`, `…FS`, `…AM`) — [Senat Lista L534/2020](https://www.senat.ro/Legis/Lista.aspx?nr_cls=L534&an_cls=2020) (verificat direct). Semnificația sufixelor (de exemplu EM = expunere de motive) nu e documentată pe pagină.
- Pagina e ASP.NET WebForms (`__VIEWSTATE` prezent), servită prin Cloudflare (marcaj în HTML), iar `robots.txt` dă 404 (nu există) — [senat.ro/legis/lista.aspx](https://www.senat.ro/legis/lista.aspx), [robots.txt](https://www.senat.ro/robots.txt) (verificat direct).

**Guvern / SGG**
- gov.ro are secțiunea „Procesul legislativ” cu subpaginile „Inițiative legislative” și „Note de fundamentare”, plus „Comunicate și acte ședință de guvern” — [gov.ro procesul legislativ](https://gov.ro/ro/guvernul/procesul-legislativ) (verificat direct). Vechiul URL `/ro/transparenta-decizionala` dă 404. gov.ro are RSS doar pentru știri — [gov.ro RSS](https://gov.ro/ro/rss) (verificat direct). `gov.ro/robots.txt` întoarce pagina HTML principală, adică nu există robots.txt real — [gov.ro/robots.txt](https://gov.ro/robots.txt) (verificat direct).
- SGG publică „Proiecte de acte normative” în temeiul art. 7 alin. (1) din Legea 52/2003, cu PDF-uri atașate și termen de 10 zile pentru propuneri. Pagina văzută avea anunțuri vechi (2017) — [sgg.gov.ro proiecte](https://sgg.gov.ro/1/proiecte-de-acte-normative/) (verificat direct).
- e-consultare.gov.ro (dezvoltat de SGG, Serviciul pentru Guvernare Deschisă) are secțiunile „Consultare publică”, „Acces la informații” și „Tabloul de bord PALG”, platformă DNN cu endpointuri interne `/API/Search/RenderResults` — [e-consultare.gov.ro](https://e-consultare.gov.ro/) (verificat direct). robots.txt este cel DNN standard (interzice `/admin/`, `/bin/` etc. și `/*/ctl/`) — [robots.txt](https://e-consultare.gov.ro/robots.txt).
- Legea 52/2003 (republicată 2013) impune autorităților să informeze și să supună dezbaterii publice proiectele de acte normative — [Legea 52/2003 (copie e-guvernare)](https://edirect.e-guvernare.ro/Uploads/Legi/14832/Legea%2052.htm).
- Pe data.gov.ro, SGG publică doar seturile „Registrul unic al transparenței intereselor” (CC-BY-4.0), nu proiecte de acte — [CKAN SGG](https://data.gov.ro/api/3/action/package_search?fq=organization:secretariatul-general-al-guvernului&rows=100) (verificat direct).

**Consiliul Legislativ (clr.ro)**
- Pagina principală listează zilnic „Avize emise la data de …” (de exemplu 26, 28, 29 și 30 octombrie 2026), cu URL `https://www.clr.ro/events/avize-emise-la-data-de-{zi}-{luna}-{an}/` — [clr.ro](https://www.clr.ro/) (verificat direct).
- Meniul trimite la trei aplicații găzduite pe IP: „Versiuni consolidate” (`http://86.105.216.125/`), „Avizare legislativă” (`http://86.105.216.125:8080`, titlu „RO-Lex”) și „Evidența legislației” (`http://86.105.216.125:81`) — [clr.ro](https://www.clr.ro/) (verificat direct). Aplicația RO-Lex trimite la un host intern `ro-lexext.cons.leg` (`/api/session`, `/api/meta`) — [RO-Lex](http://86.105.216.125:8080/) (verificat direct în bundle-ul JS).
- robots.txt clr.ro e standard WordPress (`Disallow: /wp-admin/`). Site-ul e în spatele Cloudflare și are reCAPTCHA — [robots.txt](https://www.clr.ro/robots.txt) (verificat direct).

### Inferences
- Un adaptor `proiecte_legislative` poate porni de la cdep.ro: listare pe an, apoi fișa `idp`, apoi PDF-urile. Camera este de obicei prima sau a doua cameră și conține și avizele CL/CES/CSM. Senatul se poate adăuga pe baza numărului `L{nr}/{an}` din fișa cdep.
- Legătura proiect → lege → act pe Portalul Legislativ se face prin identificatorii „P.L.-x nr./an”, „Lege nr./an” și „M.Of. nr./data” (vizibili pe `legis_pck.htp_act`).
- Pentru proiecte guvernamentale în consultare, nu există o sursă centrală robustă; ar trebui agregate site-urile ministerelor și e-consultare. Cost mare, valoare medie pentru avocați.

### Gaps
- Nu am găsit date deschise sau API pentru cdep.ro sau senat.ro. Nu am verificat dacă cdep.ro limitează rata cererilor.
- Semnificația exactă a sufixelor PDF de pe senat.ro și cdep.ro nu e documentată oficial.
- Nu am testat motorul de căutare al e-consultare și nici URL-urile individuale ale consultărilor.

## 5. Alte depozite oficiale de legislație consolidată: Consiliul Legislativ (repertoriu și versiuni consolidate), baza „legis” cdep.ro, data.gov.ro, ELI în România

### Takeaway
Consiliul Legislativ, instituția care ține prin lege **evidența oficială a legislației**, are o aplicație publică de „Versiuni consolidate” cu un **API JSON nedocumentat**. API-ul întoarce consolidări în **XML structurat** (paragrafe tipizate), cu metadate de versiune și link spre PDF-ul MO. Este cea mai bogată sursă structurată găsită, dar e neoficială ca interfață (IP brut, HTTP, port 5006, fără termeni). data.gov.ro nu are corpus legislativ. Nu am găsit dovezi că România a implementat ELI.

### Cited Findings
- Aplicația CLR „Versiuni consolidate” (React SPA la `http://86.105.216.125/`) apelează endpointurile `http://86.105.216.125:5006/api/get25FCForPublic`, `/api/searchFC`, `/api/getFCById`, `/api/getMofPrimaraById`, `/api/getAllAniEmitere`, `/api/getAllAniPublicare`, `/api/menu/list` — [bundle JS CLR](http://86.105.216.125/static/js/main.6113589e.js) (verificat direct).
- `GET /api/get25FCForPublic` a întors JSON (circa 10 MB) cu ultimele 25 de consolidări — [get25FCForPublic](http://86.105.216.125:5006/api/get25FCForPublic) (verificat direct):
  - câmpuri: `id`, `denumireFisier`, `denumireFisierConsolidare` (de exemplu `OUG572019_DST_OUG402026_20-10-2026.xml`), `linkMonitorOficial`, `anMonitor`, `nrMonitor`, `denumireAct`, `emitent`, `tipAct`, `dataAct`, `nrAct`, `etichetaAct` (de exemplu `OUG57/2019`), `actModificator`, `versiune` (de exemplu 249 pentru Codul administrativ), `validat`, `dataCreare`, `continutXML`, `modificari`, `titlu`;
  - `continutXML` are structura `<ACT ID Tip Nr Data><P Tip="DEN|RZM|EMT|PUB|PAR" ID=…>`;
  - consolidările au fost create pe 28–30.10.2026, deci baza este actualizată curent;
  - răspunsul expune și numele unor utilizatori interni ai CLR (`utilizatorValidare`).
- Aplicația „Evidența legislației” (`:81`) folosește `http://86.105.216.125:5007` (`/api/v1`), `searchFC` și `http://86.105.216.122:83/MyUploadedDocs/` — [bundle Evidența](http://86.105.216.125:81/assets/index-3c51672e.js) (verificat direct; parcurs automat, neexplorat în detaliu).
- Repertoriile anuale ale legislației (de exemplu „Repertoriul Legislației 2006”) sunt publicate ca pagini sau documente în arhiva CLR — [Repertoriul 2006](https://www.clr.ro/repertoriul-legislatiei-2006/), [arhiva repertoriilor](https://www.clr.ro/repertoriul-legislatiei-romaniei-arhiva/) (verificat direct).
- Baza „legis” a Camerei Deputaților (`/ords/pls/legis/legis_pck.*`) are fișe de act cu legături procedurale și MO, dar declară că textele „nu au caracter oficial” — [legis htp_act](https://www.cdep.ro/ords/pls/legis/legis_pck.htp_act?nr=100&an=2026) (verificat direct).
- data.gov.ro (CKAN, administrat de SGG) — [dataportals.org](https://dataportals.org/portal/data-gov-ro):
  - nu are seturi de legislație; pentru „acte normative” găsește seturi irelevante, de exemplu salarii INA — [CKAN q=acte normative](https://data.gov.ro/api/3/action/package_search?q=acte%20normative) (verificat direct);
  - licențe uzuale: `uk-ogl` (seturi vechi) și `CC-BY-4.0` (seturi noi) — [același API](https://data.gov.ro/api/3/action/package_search?q=acte%20normative);
  - robots.txt: `Disallow: /api/`, `Crawl-Delay: 10` — [data.gov.ro/robots.txt](https://data.gov.ro/robots.txt) (verificat direct).
- ELI: implementarea este voluntară, graduală și pe „piloni” — [EUR-Lex: what is ELI](https://eur-lex.europa.eu/eli-register/what_is_eli.html). O listă terță (posibil depășită) a statelor care au adoptat ELI nu include România — [elidata.es](https://www.elidata.es/ELI_un_proyecto_europeo.php?lang=en). În paginile Portalului Legislativ verificate (Acasă, Funcționalități, DetaliiDocument) nu apare niciun URI ELI și nicio metadată ELI. Identificatorul stabil este `DetaliiDocument/{id}`, intern — [Funcționalități](https://legislatie.just.ro/Public/Functionalitati) (verificat direct, grep „eli/”). Conectorul terț `ro-eli-mcp` poartă „ELI” în nume, dar folosește SOAP-ul MJ — [PyPI ro-eli-mcp](https://pypi.org/project/ro-eli-mcp/).

### Inferences
- API-ul CLR este candidatul tehnic cel mai bun pentru `citeste_articol` la o dată și pentru istoricul versiunilor: XML tipizat în loc de HTML de 7 MB, versiuni numerotate, act modificator, link MO. Lipsa documentației, a HTTPS, a numelui de domeniu și a termenilor de utilizare îl face însă **instabil și juridic incert** pentru producție. Recomand contactarea CLR (Secția de evidență oficială a legislației) pentru un acord sau un endpoint public oficial. Până atunci, poate servi cel mult ca sursă secundară de validare.
- Atenție GDPR: răspunsurile CLR conțin nume de angajați; acestea nu trebuie stocate sau afișate.
- Identificatorul canonic intern LexAI ar trebui să fie un tuplu (tip, număr, an, emitent) mapat la `legislatie.just.ro id`, `cdep ida` și `CLR etichetaAct`, deoarece România nu are ELI.

### Gaps
- Nu am verificat parametrii `searchFC` și `getFCById` (metodă, corp) și nici dacă CLR limitează accesul.
- Nu am găsit statutul juridic al consolidărilor CLR (oficiale sau informative) și nici relația lor exactă cu consolidările de pe legislatie.just.ro. E posibil ca portalul MJ să preia consolidările CLR, dar nu am verificat.
- Nu am găsit o sursă oficială recentă despre planurile României privind ELI.

## 6. Dificultăți practice de integrare (codificări, CAPTCHA, limite de rată, anti-bot, identificatori stabili)

### Takeaway
Principalele riscuri: WAF-ul AWS de pe eur-lex.europa.eu (ocolit prin CELLAR), blocarea IP-urilor de datacenter raportată pentru legislatie.just.ro (de verificat din infrastructura de producție), dependența de Referer și restricțiile robots la monitoruloficial.ro, Cloudflare la senat.ro și clr.ro, amestecul de diacritice cu sedilă și cu virgulă, plus caracterele corupte în SOAP-ul MJ. Niciuna dintre sursele românești nu publică limite de rată.

### Cited Findings
- EUR-Lex: `HTTP 202` cu corp gol și `x-amzn-waf-action: challenge` pentru clienți non-JS. Fac excepție WSDL/XSD-ul SOAP, care au răspuns normal — [EUR-Lex legal-content](https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32016R0679), [WSDL](https://eur-lex.europa.eu/EURLexWebService?wsdl) (verificat direct). CELLAR (publications.europa.eu) nu a avut challenge — [SPARQL](https://publications.europa.eu/webapi/rdf/sparql) (verificat direct).
- legislatie.just.ro: antetele `x-country`/`x-block` — [DetaliiDocument](https://legislatie.just.ro/Public/DetaliiDocument/256414). Blocarea IP-urilor de datacenter e raportată de un terț — [Apify](https://apify.com/ponderable_hydrometer/romanian-legislation-scraper). Paginile de act sunt foarte mari (Codul civil: circa 7 MB HTML) — [DetaliiDocument/175630](https://legislatie.just.ro/Public/DetaliiDocument/175630). Lipsește robots.txt — [robots.txt](https://legislatie.just.ro/robots.txt) (verificat direct).
- Codificări:
  - SOAP-ul MJ întoarce „?” în locul lui ș/ț în `Emitent` și amestecă ş/ţ (sedilă) cu ș/ț (virgulă) în `Titlu`/`Text` — [endpoint SOAP](http://legislatie.just.ro/apiws/FreeWebService.svc/SOAP) (verificat direct);
  - eroarea 404 de pe cdep.ro este în `iso-8859-1`, dar paginile ORDS noi sunt UTF-8 — [cdep upl_pck2015.home](https://www.cdep.ro/ords/pls/proiecte/upl_pck2015.home) (verificat direct);
  - linkurile de partajare cdep conțin octeți în `ISO-8859-2` (de exemplu `DECLARA%BFIE`) — [cdep.ro](https://www.cdep.ro/) (verificat direct);
  - pagina 404 senat.ro e declarată `iso-8859-1`, iar paginile Legis sunt UTF-8 — [senat.ro](https://www.senat.ro/legis/lista.aspx).
- Anti-bot și CAPTCHA:
  - Cloudflare pe senat.ro — [senat.ro](https://www.senat.ro/legis/lista.aspx);
  - Cloudflare și reCAPTCHA pe clr.ro — [clr.ro](https://www.clr.ro/);
  - reCAPTCHA configurat pe monitoruloficial.ro — [monitoruloficial.ro](https://monitoruloficial.ro/);
  - PDF-urile MO cer `Referer` — [MO PI 906/2026](https://monitoruloficial.ro/Monitorul-Oficial--PI--906--2026.html) (toate verificate direct).
- Instabilitatea URL-urilor: cdep.ro a mutat toate aplicațiile de la `/pls/` la `/ords/pls/` (vechile URL-uri dau 404) — [cdep.ro](https://www.cdep.ro/). gov.ro a eliminat `/ro/transparenta-decizionala` (404) — [gov.ro](https://gov.ro/ro/guvernul/procesul-legislativ) (verificat direct). Aplicațiile CLR stau pe IP și porturi nestandard, doar HTTP — [CLR](http://86.105.216.125/).
- Identificatori stabili disponibili:
  - legislatie.just.ro `DetaliiDocument/{id}` (unul per formă) — [SOAP LinkHtml](http://legislatie.just.ro/apiws/FreeWebService.svc/SOAP);
  - MO `{parte}/{nr}/{an}` — [e-monitor](https://monitoruloficial.ro/e-monitor/);
  - cdep `idp`/`ida` — [cdep](https://www.cdep.ro/ords/pls/proiecte/upl_pck2015.proiect?cam=2&idp=22923);
  - Senat `L{nr}/{an}` — [senat](https://www.senat.ro/Legis/Lista.aspx?nr_cls=L534&an_cls=2020);
  - UE CELEX/ELI/CELLAR UUID — [SPARQL](https://publications.europa.eu/webapi/rdf/sparql).

### Inferences
- Rulați adaptoarele românești dintr-o infrastructură cu IP românesc sau rezidențial doar dacă testele confirmă blocarea. Mai întâi trebuie testat din producție, cu un User-Agent descriptiv și un contact.
- Normalizare obligatorie: NFC; ş→ș, ţ→ț, Ş→Ș, Ţ→Ț; spații multiple; marcajele „+ Articolul” ale portalului.
- Cache agresiv: legislația se modifică rar, iar formele consolidate vechi sunt imuabile, deci pot fi cache-uite permanent după `id`. Se reîmprospătează zilnic doar lista de acte noi (SOAP sau MO).
- Pentru juridic și reputație: politică de acces „politicos” (1 cerere/s sau mai puțin), respectarea robots.txt acolo unde există (mai ales `/ramo_customs/` la MO și `/api/` la data.gov.ro pentru crawl), atribuirea sursei și avertismentul de valoare juridică în UI.

### Gaps
- Nu am măsurat praguri reale de rate limiting (nu am făcut teste de încărcare, intenționat).
- Nu am testat accesul din IP-uri de datacenter (Vercel, AWS) către legislatie.just.ro; testele s-au făcut dintr-o conexiune obișnuită.
- Nu am găsit politici scrise despre scraping la cdep.ro, senat.ro, gov.ro sau clr.ro (dincolo de robots.txt).
