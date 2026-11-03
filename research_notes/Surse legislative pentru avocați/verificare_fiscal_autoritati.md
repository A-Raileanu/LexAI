# Verificare tehnică: surse fiscale, autorități de reglementare, Consiliul Europei, date deschise și baze comerciale (LexAI)

> **Metodă.** Toate testele s-au făcut de pe această mașină, la **01.11.2026, între 19:34 și 19:48** (ora locală), cu `curl`. User-Agent implicit: `LexAI/1.0 (verificare surse; uz personal)`. Am încercat un UA de browser (Chrome 130/macOS) doar acolo unde am fost blocat. Cererile au fost secvențiale, la minimum 2 s una de alta, cu cel mult 5 cereri pe gazdă. Am făcut 116 cereri HTTP în total. Nu am primit niciun `429` și n-am observat throttling. N-am ocolit nicio provocare (challenge).
>
> **robots.txt:** l-am respectat strict. Din acest motiv **nu** am apelat `curs.bnr.ro/*.xml` (are `Disallow: /`), `data.gov.ro/api/` (are `Disallow: /api/`) și `lege5.ro/Terms` (are `Disallow: /` pentru `*`). Acolo raportez ce scrie în robots.txt și ce constatase cercetarea anterioară din aceeași zi.
>
> **Notații:** „L” = UA LexAI, „B” = UA browser. „Latență” = `time_total` din curl.

## Tabel sintetic

| Sursă | robots.txt | Test HTTP | Anti-bot | Format | Termeni | Verdict |
|---|---|---|---|---|---|---|
| **static.anaf.ro** (Codul fiscal + norme, Codul de procedură fiscală) | 404, nu există | 200 (L). CF: 4,67 MB, 1,6 s. CPF: 1,88 MB, 0,9 s | niciunul | HTML unic, UTF-8. CF are ancore `#A1`. CPF are ancore `__RefHeading__…` | doar mențiunea „nu reprezintă o republicare”. Pe gazdă există un PDF cu Licența OGL-RO v1.0 | **DA** |
| **www.anaf.ro** | 403 la L și la B (pagina „Acces interzis”) | acasă 200 (145 KB). Pagina CPF 200 | WebSEAL (cookie `PD_STATEFUL`) + F5 (`TS01…`, `f5avr…`). Fără CAPTCHA la pagini | HTML portal WebSphere, URL-uri `!ut/p/…` instabile | „Conținutul … este proprietatea ANAF” | **CONDIȚIONAT** |
| **chat.anaf.ro** (contestații, bază Domino) | 404 | vizualizare 200 (28 KB). PDF 200 (315 KB). `ReadViewEntries` JSON 200 | niciunul | PDF cu text (LibreOffice). Index HTML și **JSON Domino** | negăsiți | **DA** (arhivă oprită la ~2019) |
| **webservicesp.anaf.ro** (bilanț, TVA v9, RO e-Factura) | 404 | bilanț GET 200 JSON. TVA POST 200 JSON. e-Factura POST 404 + JSON valid | niciunul | JSON | pagina oficială nu dă limite | **DA** |
| **mfinante.gov.ro** (Comisia fiscală centrală, contestații, SFIA) | `Disallow:` gol, permite tot | 200 la toate (0,3–0,6 s) | niciunul | HTML + PDF în `/static/10/Mfp/…` | negăsiți | **DA**, dar conținut sărac. SFIA nu sunt publicate |
| **curs.bnr.ro** (XML curs) | **`Disallow: /`** pentru `*` | neapelat (am respectat robots) | — | XML (verificat anterior) | termenii BNR nu au putut fi citiți | **NU** fără acord scris BNR (vezi nuanța) |
| **bnr.ro** (dobânda de politică/referință) | `Disallow:` gol | pagina 200, dar conținutul e gol. Conținutul vine din `POST /blocks` (200) | niciunul (Cookiebot) | HTML încărcat din JS. Blocurile se iau prin POST nedocumentat | pagina de termeni se încarcă tot din JS și nu a fost citită | **CONDIȚIONAT** |
| **dataprotection.ro** (ANSPDCP) | interzice doar `/?page=money_declarations*` | 200 (0,15 s) | niciunul | HTML JSP + PDF (`servlet/ViewDocument?id=`) | negăsiți | **DA** |
| **asfromania.ro** | `Disallow:` gol | 200 | niciunul | HTML + PDF (`uploads/articole/attachments/{hash}.pdf`) | reproducere permisă „numai cu indicarea sursei” | **DA** (cu citarea sursei) |
| **consiliulconcurentei.ro** | `Disallow:` gol + sitemap | 200 (0,12 s). PDF 200 | niciunul | WordPress. Listă paginată (244 pagini × 10). PDF-uri Word cu text | cl. 7 permite reproducerea cu sursa. **Cl. 8 interzice „copierea… arhivarea sau păstrarea, prin orice mijloace… computerizate”** | **CONDIȚIONAT** |
| **anap.gov.ro** | 404 | 200 (1,1–1,3 s) | scripturi reCAPTCHA pe pagină (pentru formulare), conținutul se servește | WordPress HTML. `wp-json` 404 | pagina „Condiții de utilizare” = politica de cookie | **DA** |
| **e-licitatie.ro** (SICAP) | 404 | `/pub` 200 = doar cadrul SPA. API intern `POST` → **403 „Referrer cannot be null”** | verificare Referer + CAPTCHA în cod (`checkBotCaptcha`) | SPA Angular. API `api-pub` nedocumentat. Rută `/pub/ocds` în cod | negăsiți | **NU** |
| **anre.ro** + **spv.anre.ro** | WordPress implicit (interzice `/wp-admin/`) | anre.ro 200. `wp-json` 200 JSON. Registrul de decizii = iframe cu aplicație JS | reCAPTCHA pe formulare. Registrul folosește token anonim + `getCaptchaKey` | WP REST JSON. Registrul e o aplicație DMSWS | negăsiți | **CONDIȚIONAT** (site DA, registru NU) |
| **ancom.ro** | WordPress implicit | 200. `wp-json` 200 | niciunul | WP HTML + REST JSON. Tip de conținut `decizie` | negăsiți | **DA** |
| **anpc.ro** | interzice `/admin` | 200 | niciunul | HTML + PDF/DOCX | negăsiți | **DA** |
| **inspectiamuncii.ro** | interzice `/zona-privata-angajator*` | 200 (1,4 s acasă) | niciunul | Liferay HTML + PDF (doar listă de acte, nu texte) | doar termenii aplicației REGES | **DA** (conținut limitat) |
| **avp.ro** (Avocatul Poporului) | 404 | 200. `wp-json` 200 | niciunul | WordPress (`/index.php/…`) + REST JSON | negăsiți | **DA** |
| **ancpi.ro** | Cloudflare gestionat: `Content-Signal: search=yes,ai-train=no,use=reference`. ClaudeBot/GPTBot: `Disallow: /` | 200, dar e doar o pagină-anunț de 7,5 KB (identică la L și B). `/legislatie/` 404 | Cloudflare (fără challenge) | — | rezerva TDM din robots (art. 4 Dir. 2019/790) | **NU** (azi nu funcționează) |
| **uniuneanotarilor.ro** | WordPress implicit | 200. `wp-json` 200 | niciunul | WP. **Textele actelor trimit spre lege6.ro (Indaco)** | negăsiți | **CONDIȚIONAT** |
| **unbr.ro** | interzice `/fisiere/file/aegrm/`, `/aegrm-old/`, `/docs/` | 200 (0,3–2 s) | Cloudflare (doar beacon JS, fără challenge) | WP HTML. Statutul în HTML + DOCX/PDF | negăsiți | **DA** (cu respectarea Disallow) |
| **venice.coe.int** | **502** (de două ori, una în 18 s) | site → redirect la coe.int → 403. **PDF prin `docs-venice.coe.int/api/Document?pdffile=` → 200** | Cloudflare „Sorry, you have been blocked” pe coe.int | PDF cu text (Word) | neciti (blocat) | **CONDIȚIONAT** (doar PDF după cod) |
| **coe.int/greco** + **rm.coe.int** | 403 (blocat Cloudflare) | 403 la L **și la B** | Cloudflare block (nu challenge) | — | neciti | **NU** |
| **data.gov.ro** | **interzice `/api/`**, `Crawl-Delay: 10` | HTML `/dataset?q=` 200. API neapelat | niciunul | CKAN. Resursele sunt fișiere (CSV/XLS etc.) | portal fără restricții de acces automat. Seturile au licența OGL-RO v1.0 | **CONDIȚIONAT** |
| **lege5.ro** | **două grupuri `User-agent: *`, al doilea cu `Disallow: /`**. Doar Googlebot/Semrush au `Allow` | doar robots | — | — | interzice „crawlere, boti, scrappere” (verificat anterior) | **NU** |
| **sintact.ro** | `*`: Allow doar pe secțiunile publice (legislatie, document, jurisprudenta…), apoi `Disallow: /`. bingbot și meta blocați | doar robots | termenii WK de pe wolterskluwer.com: 403 Cloudflare „Enable JavaScript” | — | termenii WK interzic scraping-ul (din rezultatul căutării, neverificat direct) | **NU** |
| **legalis.ro** | Cloudflare: `ai-train=no, use=reference`. ClaudeBot/GPTBot `Disallow: /`. Restul permis (`www.legalis.ro` nu are DNS) | 200 | Cloudflare | site de prezentare WP. Biblioteca e cu abonament | **„strict interzise preluarea sistematizată sau automată”** | **NU** |
| **idrept.ro** | 404 | 200: meta-refresh „iDrept.ro este acum Sintact.ro” | — | — | vezi Sintact | **NU** (produs absorbit) |
| **juridice.ro** | `*` permis (în afară de `/wp-admin/`). **~95 de boți AI (GPTBot, ClaudeBot, Claude-User, PerplexityBot…) cu `Disallow: /`** | termeni 200 | Cloudflare (beacon) | WP HTML | reproducerea „doar cu acordul nostru” (excepție: presă și scop academic) | **NU** (fără acord) |

---

## 1. Surse fiscale (ANAF, MF, BNR): funcționează accesul automat și este permis?

### Takeaway
ANAF rămâne cea mai bună sursă tehnică. Codul fiscal și Codul de procedură fiscală sunt fișiere HTML statice, actualizate și fără robots.txt. API-urile publice (bilanț, TVA v9, RO e-Factura) răspund JSON fără autentificare. Arhiva de contestații Domino are chiar un **endpoint JSON nativ** (`ReadViewEntries`), dar conține doar decizii până în jurul anului 2019. MF publică pe site doar două decizii ale Comisiei fiscale centrale (1/2019 și 1/2021) și nicio SFIA. BNR este problematică: `curs.bnr.ro` interzice tot prin robots.txt, iar site-ul nou `bnr.ro` își încarcă tot conținutul prin JS (`POST /blocks`).

### Cited Findings

**static.anaf.ro: Codul fiscal cu norme**
- `robots.txt` → 404 (Apache, 327 B), deci nu există restricții. — [static.anaf.ro/robots.txt](https://static.anaf.ro/robots.txt) (test L, 19:34)
- `GET Cod_fiscal_norme_2023.htm` → **200 `text/html`, 4.673.382 B, 1,59 s**. Răspunsul are `Last-Modified: Wed, 28 Oct 2026 11:49:21 GMT` și `ETag: "474f66-65ee5275b10ab"`, deci se pretează la cache și la cereri condiționale (n-am testat un 304). — [Cod fiscal + norme](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm)
- Ștampila de actualizare din pagină: „Legea nr. 227/2015 privind Codul fiscal ultima actualizare: LEGEA nr. 204/2026”. Normele sunt „ultima actualizare: Hotărârea Guvernului nr. 602/2025”. Disclaimerul: „actualizat prin mijloace informatice și nu reprezintă o republicare”. — [Cod fiscal + norme](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm)
- Ancorele sunt stabile și semantice: 641 de ancore `name="A…"` (de exemplu `A1`, `A8_1`) și ancore de secțiune `T5C2S1`. Confirmă nota anterioară. — idem
- **Codul de procedură fiscală (lipsea din notele anterioare):** `https://static.anaf.ro/static/10/Anaf/cod_procedura/Cod_Procedura_Fiscala_2023.htm` → **200, 1.884.454 B, 0,91 s**, cu `Last-Modified: Thu, 08 Oct 2026`. Ștampila: „Legea nr. 207/2015 privind Codul de procedură fiscală ultima actualizare: Legea nr. 170/2026”. Arhiva versiunilor este la `CP_arhiva.htm`. URL-ul a fost găsit în pagina ANAF „Codul de procedură fiscală”. — [CPF](https://static.anaf.ro/static/10/Anaf/cod_procedura/Cod_Procedura_Fiscala_2023.htm); [arhivă](https://static.anaf.ro/static/10/Anaf/cod_procedura/CP_arhiva.htm)
- **Diferență față de CF:** CPF **nu** are ancore `#A{n}`. Cuprinsul trimite la ancore generate de LibreOffice, de forma `#__RefHeading__3155_1651101228` („ART. 1 Definiții”). Am numărat 934 de elemente `<a name=…>` și 856 de etichete `class="stilArticol"`. — [CPF](https://static.anaf.ro/static/10/Anaf/cod_procedura/Cod_Procedura_Fiscala_2023.htm)
- Pe aceeași gazdă se află un PDF intitulat „Licența pentru o Guvernare Deschisă v1.0” (SGG, pentru data.gov.ro). Licența permite copierea, adaptarea și reutilizarea comercială, cu menționarea sursei și fără denaturare. Nu am găsit vreo trimitere care să lege explicit această licență de conținutul anaf.ro. — [OGLROU10_14032016.pdf](https://static.anaf.ro/static/copyright/OGLROU10_14032016.pdf)

**www.anaf.ro**
- `robots.txt` → **403** atât cu UA LexAI, cât și cu UA de browser, cu pagina „Pagina acces interzis / Acces interzis!”. Antetele includ cookie-uri F5 BIG-IP (`f5avr…_session_`, `TS01f4a1fb`). Pagina de start setează și `PD_STATEFUL_…`, cookie specific IBM WebSEAL. Codul `0x38cf0427` raportat anterior **nu** a mai apărut. — [anaf.ro/robots.txt](https://www.anaf.ro/robots.txt)
- Pagina de start → 200, 145 KB, 0,35 s, după redirect la un URL de portal WebSphere (`…/acasa/!ut/p/a1/04_Sj9…`). Pagina „Codul de procedură fiscală” (`?uri=nm:oid:Z6_H1H6H282J0HQ00Q5BIR5GP0GC3`) → 200, 94 KB. Legăturile spre documente indică static.anaf.ro. — [anaf.ro](https://www.anaf.ro/anaf/internet/ANAF/)
- Subsolul paginii de blocare spune: „Conținutul acestui site este proprietatea Agenției Naționale de Administrare Fiscală”. — [anaf.ro/robots.txt](https://www.anaf.ro/robots.txt)

**chat.anaf.ro: deciziile de soluționare a contestațiilor (Lotus Domino)**
- `robots.txt` → 404. Serverul este `Lotus-Domino`. — [chat.anaf.ro/robots.txt](https://chat.anaf.ro/robots.txt)
- PDF-ul DGSC D 410/2019 → **200 `application/pdf`, 314.702 B, 0,14 s**, cu `Last-Modified: 20 May 2020`. Are strat de text (Creator „Writer”, Producer „LibreOffice 6.1”, 16 fonturi, ~1.800 de operatori de text). — [D 410 2019.pdf](https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d/fdc276eab287bf24c22584ba0035ce3c/$FILE/D%20410%202019.pdf)
- Vizualizarea `?OpenView` → 200 HTML, cu categorii pe organul emitent. Categoria „Directia Generala de Solutionare a Contestatiilor” are **8.812 documente**, împărțite pe materii (TVA 2.346, Impozit pe profit 1.547, Accesorii 1.038, Procedura 2.346 etc.). — [vizualizare](https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d?OpenView); [categoria DGSC](https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d?OpenView&Start=33&Count=30&Expand=33)
- **Endpoint JSON nativ Domino:** `?ReadViewEntries&Start=33&Count=5&Expand=33&OutputFormat=JSON` → **200 `application/json`, 1.583 B, 0,14 s**. Întoarce `@position`, `@noteid`, `@descendants` și `entrydata` pentru fiecare categorie. — [ReadViewEntries JSON](https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d?ReadViewEntries&Start=33&Count=5&Expand=33&OutputFormat=JSON)
- Cele mai recente decizii găsite prin căutare sunt din noiembrie 2019 (D.892 din 18.11.2019, Decizia 10540 din 07.11.2019). Nu am găsit decizii din 2020–2026. — [D.892 18.11.2019](https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d/72943fb09b38d6fac22584f700352fd1/$FILE/D.892_18.11.2019.pdf); [Decizia 10540/2019](https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d/cb328d96e3419545c2258766002a34f6/$FILE/Decizia%2010540%20din%20data%2007.11.2019.pdf)

**webservicesp.anaf.ro: API-uri publice**
- `robots.txt` → 404 (corp de 679 B). — [webservicesp.anaf.ro/robots.txt](https://webservicesp.anaf.ro/robots.txt)
- `GET /bilant?an=2024&cui=14399840` → **200 `application/json`, 1.879 B, 0,14 s**. Exemplu de răspuns: `"deni":"Dante International SA","caen":4754`, indicatorii `I1`… cu `val_indicator`. — [bilant](https://webservicesp.anaf.ro/bilant?an=2024&cui=14399840)
- `POST /api/PlatitorTvaRest/v9/tva`, corp `[{"cui":14399840,"data":"2026-10-30"}]` → **200 JSON, 1.896 B, 0,11 s**. Răspunsul conține `date_generale` (denumire, adresă, `nrRegCom`, `stare_inregistrare`, `statusRO_e_Factura`), `inregistrare_scop_Tva` etc. — [TVA v9](https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva)
- `POST /api/registruroefactura/v1/interogare`, același corp → **404 `application/json`, `{"found":[],"notFound":[14399840]}`**. Endpoint-ul funcționează. Pentru un CUI care nu e în Registrul RO e-Factura, codul HTTP este 404, deși corpul JSON e valid. — [e-Factura](https://webservicesp.anaf.ro/api/registruroefactura/v1/interogare)
- Pagina oficială listează endpoint-urile și documentația TXT (`doc_WS_V9.txt`, `doc_WS_Bilant_V1.txt`, `docV1.txt`), dar nu menționează limite de rată. — [servicii_sincron.html](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/servicii_sincron.html)

**mfinante.gov.ro: Comisia fiscală centrală, contestații, SFIA**
- `robots.txt`: `User-Agent: * / Disallow:` (gol), cu `Sitemap: http://mfinante.gov.ro:80/sitemap.xml`. — [mfinante.gov.ro/robots.txt](https://mfinante.gov.ro/robots.txt)
- **Pagina Comisiei fiscale centrale** (`/ro/domenii/fiscalitate/comisia-fiscala-centrala`, 200, 177 KB) conține doar trei PDF-uri:
  - Ordinul nr. 1948/2019 privind aprobarea Deciziei CFC nr. 1/2019 (`/static/10/Mfp/comisia-fiscala-centrala/omfp1948_4042019.pdf`);
  - Ordinul nr. 1518/2021 privind aprobarea Deciziei CFC nr. 1/2021 (`OMF1518_MO_1203.pdf`);
  - Ordinul nr. 1059/2021 privind componența și funcționarea CFC (`OMF1059_MO883.pdf`).
  
  — [MF, Comisia fiscală centrală](https://mfinante.gov.ro/ro/domenii/fiscalitate/comisia-fiscala-centrala)
- Pagina „Contestații fiscale” (200, 228 KB) descrie DGSC ca structură a **Ministerului Finanțelor**, cu e-mailul `contestatii.mf@mfinante.gov.ro`, și listează doar baza legală (PDF-uri cu legi și HG). **Nu publică decizii de soluționare.** — [MF, contestații fiscale](https://mfinante.gov.ro/ro/contestatii-fiscale)
- **SFIA:** nu am găsit pe mfinante.gov.ro nicio listă de soluții fiscale individuale anticipate. Pagina „Procedură fiscală / legislație” are doar PDF-uri cu legi. — [MF, procedură fiscală](https://mfinante.gov.ro/ro/domenii/fiscalitate/procedura-fiscala/legislatie)
- Potrivit unei surse secundare, procedura SFIA a fost înlocuită prin **Ordinul MF nr. 1128 (MO nr. 757 din 07.09.2026)**. Soluțiile pot fi publicate anonimizat **numai cu acordul scris al contribuabilului**. — [Contzilla](https://www.contzilla.ro/procedura-de-emitere-a-solutiei-fiscale-individuale-anticipate-o-1128-07-09-2026/) (secundar, neverificat în MO)

**curs.bnr.ro și bnr.ro**
- `curs.bnr.ro/robots.txt` → `User-agent: *` / `Disallow: /` (26 B). Confirmă nota anterioară. **Feedul XML nu a fost reapelat**, din respect pentru robots.txt. Funcționarea feedului (`nbrfxrates.xml`, `nbrfxrates10days.xml`, `files/xml/years/nbrfxrates{AN}.xml`) rămâne cea constatată de cercetarea anterioară din aceeași zi. — [curs.bnr.ro/robots.txt](https://curs.bnr.ro/robots.txt)
- `bnr.ro/robots.txt` → `Disallow:` gol (25 B). — [bnr.ro/robots.txt](https://www.bnr.ro/robots.txt)
- Pagina `https://www.bnr.ro/1970-rata-dobanzii-de-politica-monetara` → 200, 113 KB, dar `<main>` conține doar `div`-uri goale (`block-wrapper id="10106"`, `"25479"` etc.). Conținutul se încarcă din `assets/js/main.js` (1,1 MB), prin `jquery.ajax({url: baseUrl+"/blocks", type:"post", data:{bid, currentSlug, cat_id}})`. — [pagina BNR](https://www.bnr.ro/1970-rata-dobanzii-de-politica-monetara); [main.js](https://www.bnr.ro/assets/js/main.js)
- `POST /blocks` cu `bid=25479&currentSlug=1970-rata-dobanzii-de-politica-monetara` → 200, 1.006 B. Blocul conține doar definiția („Rata dobânzii de politică monetară reprezintă rata dobânzii utilizată pentru principalele operaţiuni de piaţă monetară…”), **nu și valoarea curentă**. — [bnr.ro/blocks](https://www.bnr.ro/blocks)
- Potrivit paginii BNR găsite prin căutare (nedeschisă), de la 1 septembrie 2011 rata dobânzii de referință este rata dobânzii de politică monetară, conform OG 13/2011. — [BNR, Rata dobânzii de referință (mobile)](https://www.bnr.ro/Rata-dobanzii-de-referinta-a-BNR-1746-Mobile.aspx?pid=1746)
- Pagina de termeni `2281-termeni-si-conditii` folosește același mecanism JS, așa că nu am citit-o (bugetul de 5 cereri s-a epuizat). — [bnr.ro termeni](https://www.bnr.ro/2281-termeni-si-conditii)

### Inferences
- **Adapter `anaf_codfiscal` (DA):** descarcă CF și CPF cu `If-None-Match`/`If-Modified-Since` cel mult o dată pe zi, apoi le parsează local.
  - CF: fragmentul se extrage pe ancorele `A{n}`.
  - CPF: trebuie construit un index „ART. n → `__RefHeading__…`” din cuprins, la fiecare versiune nouă. Ancorele LibreOffice se pot schimba la regenerarea fișierului.
- **Adapter `anaf_ws` (DA):** throttling conservator (≤1 cerere/s, din prudență, limită neconfirmată oficial). Codul 404 de la e-Factura trebuie tratat ca „negăsit”, nu ca eroare.
- **DGSC (DA, dar istoric):** listarea se face prin `ReadViewEntries&OutputFormat=JSON` (paginare `Start`/`Count`, `Expand`), iar textul se extrage din PDF. Baza trebuie etichetată „arhivă ANAF 2008–2019”. Deciziile mai noi (după preluarea de către MF) nu au fost găsite publicate nicăieri.
- **CFC:** sursa practică sunt ordinele MF din Monitorul Oficial. Pagina MF are doar două decizii. Nu merită un adapter dedicat.
- **BNR:** pentru calculatorul de dobândă legală recomand un tabel intern, cu valorile ratei de politică monetară și sursa (comunicatele BNR). Feedul XML de curs nu trebuie integrat până nu există acordul BNR, fiindcă robots.txt interzice tot. Endpoint-ul `POST /blocks` e intern și nedocumentat, deci fragil.

### Gaps
- Nu am citit `doc_WS_V9.txt`, deci limitele oficiale de rată și de CUI per cerere rămân neconfirmate.
- Nu am testat dacă static.anaf.ro răspunde `304` la cereri condiționale.
- Nu știu unde (sau dacă) MF publică deciziile DGSC de după 2019, nici SFIA emise după Ordinul MF 1128/2026.
- Termenii BNR (`2281-termeni-si-conditii`) și valorile ratei de dobândă nu au fost extrase. Ar fi nevoie de o cerere suplimentară, cu `bid`-ul corect al blocului.

---

## 2. Autoritățile de reglementare: acces automat, ce publică, unde și în ce format

### Takeaway
Cele mai multe autorități folosesc WordPress, cu robots.txt implicit și **API REST WordPress (`/wp-json/wp/v2/posts`) funcțional**: ANRE, ANCOM, UNNPR și AVP au răspuns JSON 200. Asta oferă o cale mașină-lizibilă și curată pentru noutăți. Restricții reale:
- Consiliul Concurenței interzice în termeni „arhivarea sau păstrarea … computerizate”;
- registrul de decizii ANRE este o aplicație cu token și CAPTCHA;
- SICAP blochează API-ul intern (verificare Referer, CAPTCHA în cod);
- ANCPI are azi doar o pagină-anunț;
- UNNPR trimite textele normative spre lege6.ro (Indaco), a cărui politică interzice boții.

### Cited Findings

**ANSPDCP (dataprotection.ro)**
- `robots.txt`: `Disallow: /?page=money_declarations*`, atât. — [robots](https://www.dataprotection.ro/robots.txt)
- `index.jsp?page=Comunicate` → 200, 32 KB, 0,15 s. Comunicatele 30.10, 28.10, 19.10, 16.10 și 07.10.2026 sunt prezente, ceea ce confirmă nota anterioară. — [Comunicate](https://www.dataprotection.ro/index.jsp?page=Comunicate&lang=ro)
- **Nou:** `?page=Sanctiuni_RGPD` este un index anual al tuturor comunicatelor de sancționare (de exemplu „Sancțiune pentru încălcarea RGPD – 30.10.2026”, „Amendă … – 02.10.2026”). — [Sancțiuni RGPD](https://www.dataprotection.ro/index.jsp?page=Sanctiuni_RGPD&lang=ro)
- Un comunicat conține operatorul, articolul încălcat și amenda. Exemplu: Auchan România S.A., art. 32 alin. (1) lit. b) și alin. (2) RGPD, amendă de 41.908 lei (8.000 EUR). — [Comunicat 30.10.2026](https://www.dataprotection.ro/?page=Comunicat_Presa_30_10_2026&lang=ro)
- Ghidul Legii 363/2018 (`servlet/ViewDocument?id=2122`) → 200 `application/pdf`, 173 KB, cu strat de text. — [ViewDocument 2122](https://www.dataprotection.ro/servlet/ViewDocument?id=2122)

**ASF (asfromania.ro)**
- `robots.txt`: `Disallow:` gol. — [robots](https://asfromania.ro/robots.txt)
- **Ce publică:**
  - legislație (`/ro/c/21/legislatie`) și sancțiuni (`/ro/c/48/sanctiuni`);
  - rezumate lunare de sancțiuni, de exemplu „Decizii de sancționare … septembrie 2026”, cu amenzi nominale (inclusiv persoane fizice, cum ar fi 11.500 lei aplicați unui director general);
  - proiecte de norme în consultare;
  - ghiduri.
  
  Formatul este HTML, cu PDF-uri atașate pe căi opace `uploads/articole/attachments/{hash}.pdf`. — [ASF sancțiuni sept. 2026](https://asfromania.ro/ro/a/3579/decizii-de-sanctionare-si-alte-masuri-adoptate-de-consiliul-asf-in-luna-septembrie-2026)
- Disclaimer: „Reproducerea parţială sau integrală a paginilor acestui website … este permisă numai cu indicarea sursei.” — [ASF Disclaimer](https://asfromania.ro/ro/a/26/disclaimer)

**Consiliul Concurenței (consiliulconcurentei.ro)**
- `robots.txt` (Yoast): `Disallow:` gol, plus `Sitemap: …/sitemap_index.xml`. — [robots](https://www.consiliulconcurentei.ro/robots.txt)
- **Baza de decizii:** `/documente-oficiale/concurenta/decizii/` → 200, 94 KB, 0,12 s.
  - Are 10 decizii pe pagină, paginare până la `/page/244/`, deci aproximativ 2.400 de intrări (estimare).
  - Există subcategorii: carteluri, servicii, industrie-energie, bunuri de consum, investiții străine etc.
  - Fiecare intrare are titlu descriptiv și dată de publicare, de exemplu „decizii 213/2026 … Bau Holding … asupra Bawi Construction SRL (publicată în data de 05.10.2026)”.
  - PDF-urile sunt în `wp-content/uploads/AAAA/LL/Decizia-NNN-din-AAAA.pdf`. Numele nu sunt uniforme (de exemplu `Decizia-201-din-18.08.2026-publicare.pdf`).
  
  — [CC decizii](https://www.consiliulconcurentei.ro/documente-oficiale/concurenta/decizii/)
- PDF-ul Deciziei 213/2026 → 200, 247 KB, generat din Word, cu text. — [Decizia 213/2026](https://www.consiliulconcurentei.ro/wp-content/uploads/2026/10/Decizia-213-din-2026.pdf)
- Alte secțiuni: avize și puncte de vedere, regulamente și instrucțiuni (`/cadrul-legislativ/regulamente-si-instructiuni/`), ordine, ghiduri. — [CC acasă](https://www.consiliulconcurentei.ro/)
- **Termeni contradictorii:**
  - cl. 7: „Reproducerea materialelor de pe site este autorizată, cu menţionarea sursei”;
  - cl. 8: „Nu sunt permise: copierea, multiplicarea, distribuirea, arhivarea sau pastrarea, prin orice mijloace, inclusiv electronice, magnetice sau computerizate, a materialelor si informatiilor existente pe acest site”.
  
  — [CC termeni](https://www.consiliulconcurentei.ro/termeni-si-conditii-de-utilizare/)

**ANAP (anap.gov.ro)**
- `robots.txt` → 404. Pagina de start (200, 240 KB, 1,24 s) include scripturi reCAPTCHA, folosite la formulare. Conținutul se servește normal. — [ANAP](https://anap.gov.ro/ro/)
- **Ce publică:** legislație primară, secundară, **terțiară** (ordine ANAP, de exemplu „Ordin privind revizuirea ratei de actualizare … 2026”, documentații standard, liste de verificare), legislație europeană, jurisprudență CJUE, notificări, ghiduri, îndrumări, rapoarte statistice. Format HTML WordPress, cu paginare `/page/N/`. — [Legislație terțiară](https://anap.gov.ro/ro/legislatie/legislatie-tertiara/)
- `/wp-json/wp/v2/posts` → 404 (REST dezactivat sau mutat). — [test](https://anap.gov.ro/wp-json/wp/v2/posts?per_page=2)
- „Condiții de utilizare” conține doar politica de cookie și trimite la condițiile legale gov.ro. — [ANAP condiții](https://anap.gov.ro/ro/conditii-de-utilizare/)

**SICAP (e-licitatie.ro)**
- `robots.txt` → 404 (nota anterioară descria o eroare IIS; acum e un 404 HTML de 103 B). — [robots](https://www.e-licitatie.ro/robots.txt)
- `/pub` → 200, 23 KB, doar cadrul SPA (Angular și Kendo). Bundle-ul `app-pub` (868 KB) folosește controlere `api-pub/*` nedocumentate (`NoticeCommon/GetCNoticeList`, `GetExportDocument` etc.). Codul conține și o rută publică OCDS (`/pub/ocds`, `/pub/ocds/view/:id`), precum și o verificare CAPTCHA (`checkBotCaptcha` → `ComboApi.checkCaptcha`). — [app-pub](https://www.e-licitatie.ro/app-pub?v=KEofz3XYcPN18N6ksFkq2x81KaIcnF96CAXAvkV4EBs1)
- `POST api-pub/NoticeCommon/GetCNoticeList/` fără Referer → **403 `{"message":"Access Denied: Referrer cannot be null."}`**. Nu am încercat să falsific Referer-ul. — [api-pub](https://www.e-licitatie.ro/api-pub/NoticeCommon/GetCNoticeList/)
- data.gov.ro: căutarea „sicap” → „Niciun set de date corespunzător”. — [data.gov.ro?q=sicap](https://data.gov.ro/dataset?q=sicap)

**ANRE (anre.ro, spv.anre.ro)**
- `robots.txt`: WordPress implicit, atât pe anre.ro, cât și pe spv.anre.ro. — [anre robots](https://anre.ro/robots.txt); [spv robots](https://spv.anre.ro/robots.txt)
- `wp-json/wp/v2/posts` → **200 JSON** (de exemplu „Ședința Comitetului de Reglementare din 03.11.2026”, „Proiect de Ordin … nr. 127/2021”). — [ANRE REST](https://anre.ro/wp-json/wp/v2/posts?per_page=2&_fields=id,date,link,title)
- **Decizii și ordine:** pagina `spv.anre.ro/decizii/` încarcă un iframe `PISC/PORTAL/registru_decizii.html`. Acesta este un șablon Mustache (coloanele „Număr decizie”, „Data decizie”, „Operator Economic”, „Conținut pe scurt”) care cere datele de la un backend `/dmsws/…`. Backend-ul folosește `/dmsws/utilizator/getAnonymousToken` și `/dmsws/api/getCaptchaKey`. Selectorul de an oferă doar 2020–2025. — [registru decizii](https://spv.anre.ro/PISC/PORTAL/registru_decizii.html); [documentaPortal-util.js](https://spv.anre.ro/PISC/website/assets/js/documentaPortal-util.js)

**ANCOM (ancom.ro)**
- WordPress. Legislația are subcategoriile Decizii ANCOM (`/category/legislatie/decizii-ancom/`), Consultare, Legislație națională, europeană și internațională. Deciziile au URL-uri `/decizie/decizia-ancom-nr-396-2026-…`. — [ANCOM decizii](https://www.ancom.ro/category/legislatie/decizii-ancom/)
- `wp-json/wp/v2/posts` → **200 JSON**. Tipul de conținut `decizie` nu a fost testat prin REST. — [ANCOM REST](https://www.ancom.ro/wp-json/wp/v2/posts?per_page=2&_fields=id,date,link,title)

**ANPC (anpc.ro)**
- `robots.txt`: `Allow: /`, `Disallow: /admin`. — [robots](https://www.anpc.ro/robots.txt)
- `/legislatie` → 200, 178 KB. Conține legislație, proceduri (de exemplu „Procedura-cadru privind activitatea de supraveghere și control”), plăcuțe obligatorii (Ordinele 330/2025 și 331/2025) și ghiduri, ca PDF/DOCX în `/uploads/page-attachments/` și `/download/`. — [ANPC legislație](https://www.anpc.ro/legislatie)

**Inspecția Muncii (inspectiamuncii.ro)**
- `robots.txt`: interzice `/zona-privata-angajator*`. — [robots](https://www.inspectiamuncii.ro/robots.txt)
- Pagina de legislație (Liferay) are doar trimiteri: un PDF cu **lista** actelor aplicabile în relațiile de muncă (`Legislatie_2019_actualizat24062025.pdf`, cu text), link-uri la cdep.ro și legislatie.just.ro, și ghiduri REGES-ONLINE. Nu publică textele actelor. — [ITM legislație](https://www.inspectiamuncii.ro/legislatie); [PDF listă](https://www.inspectiamuncii.ro/documents/66402/123111/Legislatie_2019_actualizat24062025.pdf/2f442519-596d-4c61-9ddf-a7978235a36b)

**Avocatul Poporului (avp.ro)**
- `robots.txt` → 404. WordPress cu permalink-uri `/index.php/AAAA/LL/ZZ/slug/`. — [robots](https://avp.ro/robots.txt)
- **Ce publică:** recomandări, rapoarte speciale și anuale, „Acte normative adoptate cu incidență în materia drepturilor cetățenilor”, recursuri în interesul legii formulate (de exemplu RIL privind malpraxisul, admis de ÎCCJ), răspunsuri colective la petiții privind excepții de neconstituționalitate. — [AVP recomandări](https://avp.ro/index.php/activitatea-avp/recomandari/)
- `index.php/wp-json/wp/v2/posts` → **200 JSON**. — [AVP REST](https://avp.ro/index.php/wp-json/wp/v2/posts?per_page=2&_fields=id,date,link,title)
- Anunț relevant pentru produse AI (29.10.2026): „Evitarea prelucrării unor petiții transmise de entități «non-umane»”. AVP cere ca petițiile să conțină numele și domiciliul persoanei fizice lezate și dovezi. Anunțul privește trimiterea de petiții, nu citirea site-ului. — [AVP anunț](https://avp.ro/index.php/2026/10/29/evitarea-prelucrarii-unor-petitii-transmise-de-entitati-non-umane-si-asigurarea-accesului-persoanelor-fizice-la-institutia-avocatul-poporului/)

**ANCPI (ancpi.ro)**
- `robots.txt` este gestionat de Cloudflare:
  - `User-agent: * / Content-Signal: search=yes,ai-train=no,use=reference / Allow: /`;
  - `Disallow: /` pentru ClaudeBot, Claude-Web, anthropic-ai, GPTBot, Google-Extended, CCBot etc.;
  - clauza declară restricțiile drept „EXPRESS RESERVATIONS OF RIGHTS UNDER ARTICLE 4 OF … DIRECTIVE 2019/790”.
  
  — [ANCPI robots](https://www.ancpi.ro/robots.txt)
- Pagina de start → 200, doar 7,5 KB, identică la UA LexAI și la UA de browser. Este un singur anunț („Funcționalitatea «Link de plată» în aplicația e-Terra, reactivată … 20 august 2026”; 329.476 de cereri înregistrate în 11–19 august 2026). `/legislatie/` → 404. — [ANCPI](https://www.ancpi.ro/); [/legislatie/](https://www.ancpi.ro/legislatie/)

**UNNPR (uniuneanotarilor.ro)**
- WordPress, cu robots implicit. `wp-json` → **200 JSON** (de exemplu comunicatul din 24.10.2026). — [UNNPR REST](https://uniuneanotarilor.ro/wp-json/wp/v2/posts?per_page=2&_fields=id,date,link,title)
- „Cadru legislativ” trimite pentru texte la **lege6.ro (Indaco)**: Legea 36/1995, Regulamentul de aplicare, Statutul UNNPR, Codul deontologic și Ordinul 177/C/2024 privind onorariile minimale. — [UNNPR cadru legislativ](https://uniuneanotarilor.ro/cadru-legislativ/)

**UNBR (unbr.ro)**
- `robots.txt`: `Disallow: /fisiere/file/aegrm/`, `/fisiere/file/aegrm-old/`, `/docs/`. Site-ul e în spatele Cloudflare, dar paginile s-au servit fără provocare. — [UNBR robots](https://unbr.ro/robots.txt)
- **Statutul profesiei de avocat:** HTML integral, cu „Versiune actualizată” și descărcare DOCX/PDF, 418 KB. — [UNBR Statut](https://unbr.ro/statutul-profesiei-de-avocat-cu-modificari-si-completari-actualizat/)
- **Decizii interpretative** ale Consiliului UNBR (de exemplu Decizia 125 din 13/14.12.2024, Decizia 119/2021, Decizia 459/2019), ca pagini HTML. — [UNBR decizii interpretative](https://unbr.ro/actele-organelor-profesiei/decizii-interpretative/)
- Alte texte: Legea 51/1995, Codul deontologic (HCUNBR 268/2017), ROF-ul UNBR (PDF), hotărâri recente (de exemplu HCUNBR 343/2026 privind controlul în materia Legii 129/2019). — [UNBR legislație](https://unbr.ro/legislatie/legislatie-romana/); [UNBR acasă](https://www.unbr.ro/)

### Inferences
- **Model comun de adapter „WordPress”:** `GET /wp-json/wp/v2/posts?per_page=N&_fields=id,date,link,title` (plus `?after=` pentru noutăți) funcționează la ANRE, ANCOM, UNNPR și AVP. Probabil funcționează și la alte site-uri WP (CC, UNBR), dar acolo nu e testat. E preferabil scraping-ului HTML. Tipurile de conținut personalizate (de exemplu `decizie` la ANCOM) trebuie descoperite prin `/wp-json/wp/v2/types`.
- **ANSPDCP:** `?page=Sanctiuni_RGPD` e indexul ideal pentru `cauta_decizii`. Fiecare comunicat se parsează pentru operator, articol și amendă.
- **ASF:** de citat sursa. Rezumatele lunare conțin nume de persoane fizice (GDPR: minimizare, fără indexare nominală inutilă).
- **CC:** clauza 8 („arhivarea sau păstrarea … computerizate”) intră în conflict cu un cache sau un index local. Recomand doar citire la cerere, cu link și citat scurt, fără arhivare în masă. Alternativ, o cerere de acord scrisă către CC.
- **SICAP:** fără API documentat, cu Referer obligatoriu și CAPTCHA. Calea legitimă este o cerere către ADR/ANAP pentru exportul OCDS.
- **ANCPI și UNNPR:** pentru textele normative (Legea 7/1996, Legea 36/1995, ordinele ANCPI) sursa trebuie să fie legislatie.just.ro sau Monitorul Oficial, nu site-urile lor.

### Gaps
- Nu am verificat termenii de utilizare pentru ANSPDCP, ANCOM, ANRE, ANPC, AVP, UNNPR și UNBR. Nu au apărut în paginile testate.
- Nu am testat REST WP la CC și UNBR (bugetul de 5 cereri epuizat), nici tipul `decizie` la ANCOM.
- Nu am testat ruta OCDS a SICAP (`/pub/ocds`): este o rută SPA, iar serviciul de date nu a fost identificat.
- Pentru ANCPI nu știu dacă site-ul complet (legislație, ordine) e mutat pe alt domeniu sau e temporar redus.
- Nu știu dacă registrul ANRE cere efectiv CAPTCHA la interogare (am văzut doar endpoint-ul `getCaptchaKey`), nici de ce selectorul de an se oprește la 2025.

---

## 3. Consiliul Europei: Comisia de la Veneția și GRECO

### Takeaway
coe.int și rm.coe.int sunt în spatele Cloudflare și **blochează** (403 „Sorry, you have been blocked”) cererile de pe această mașină, atât cu UA LexAI, cât și cu UA de browser. Excepție: PDF-urile Comisiei de la Veneția se descarcă după codul documentului prin `docs-venice.coe.int/api/Document?pdffile=…`, care a răspuns 200.

### Cited Findings
- `www.venice.coe.int/robots.txt` → **502** (de două ori; una în 18 s). — [venice robots](https://www.venice.coe.int/robots.txt)
- `www.venice.coe.int/` → redirect la `www.coe.int/web/venice-commission` → **403 Cloudflare**. Pagina opiniei (`coe.int/en/web/venice-commission/-/cdl-ad-2022-045-e`) → **403**. — [venice](https://www.venice.coe.int/); [CDL-AD(2022)045 pe coe.int](https://www.coe.int/en/web/venice-commission/-/cdl-ad-2022-045-e)
- **Calea care funcționează:** `www.venice.coe.int/webforms/documents/default.aspx?pdffile=CDL-AD(2022)045-e` → 302 la `dispatch.coe.int` → 301 la `https://docs-venice.coe.int/api/Document?pdffile=CDL-AD(2022)045-e` → **200 `application/pdf`, 368 KB, 1,14 s**. Este PDF cu text: „ROMANIA – URGENT OPINION ON THREE LAWS CONCERNING THE JUSTICE SYSTEM … CDL-AD(2022)045”. `docs-venice.coe.int/robots.txt` → 404. — [PDF CDL-AD(2022)045](https://docs-venice.coe.int/api/Document?pdffile=CDL-AD(2022)045-e)
- **Ce publică Comisia de la Veneția despre România:** opinii CDL-AD, de exemplu:
  - CDL-AD(2018)017 (legile justiției);
  - CDL-AD(2018)021 (Codul penal și Codul de procedură penală);
  - CDL-AD(2019)014 (OUG 7 și 12/2019);
  - CDL-AD(2022)045 (trei legi ale justiției);
  - CDL-AD(2002)012 (revizuirea Constituției).
  
  — [coe.int, CDL-AD(2018)017](https://www.coe.int/en/web/venice-commission/-/cdl-ad-2018-017-e); [CDL-AD(2002)012](https://www.venice.coe.int/webforms/documents/CDL-AD(2002)012-E.aspx) (din căutare)
- `coe.int/robots.txt`, `coe.int/en/web/greco` (L și B), `rm.coe.int/robots.txt` și raportul GRECO → toate **403 Cloudflare „Sorry, you have been blocked”** (Ray ID `a53ca7075bb68ef3`, `a53cbafbd9a1d100` etc.). — [GRECO](https://www.coe.int/en/web/greco); [raport GRECO RO runda a 5-a](https://rm.coe.int/grecoeval5rep-2022-4-final-eng-evaluation-report-romania-public/1680ac7782)
- GRECO publică rapoarte de evaluare și de conformitate (PDF pe rm.coe.int). Raportul de evaluare din runda a 5-a privind România a fost publicat la 7.09.2023. Raportul de conformitate din august 2025 constată că doar 2 din 26 de recomandări au fost implementate integral. — [eucrim](https://eucrim.eu/news/greco-fifth-round-evaluation-report-on-romania/); [Romania Insider](https://www.romania-insider.com/romania-greco-report-august-2025) (secundare)

### Inferences
- **Veneția:** CONDIȚIONAT. Accesul merge doar dacă LexAI cunoaște codul CDL. Lista se întreține manual sau semi-automat (de exemplu din căutări), iar PDF-ul se aduce prin `docs-venice`. Termenii coe.int nu au putut fi citiți, așa că recomand doar link și citat scurt.
- **GRECO:** NU de pe această rețea. Blocarea pare la nivel de IP sau reputație (și UA-ul de browser e blocat), nu de UA. Rezultatul poate diferi de pe alt IP sau server.

### Gaps
- Robots.txt și termenii coe.int sunt necunoscuți (403/502).
- Nu am putut testa căutarea opiniilor pe țară (pagini coe.int blocate).

---

## 4. Date deschise (data.gov.ro)

### Takeaway
data.gov.ro își promovează API-ul CKAN în subsol („You can also access this registry using the API”), dar robots.txt îl interzice (`Disallow: /api/`, `Crawl-Delay: 10`). Paginile HTML de căutare sunt permise și funcționează. Termenii portalului nu restricționează accesul automat. Seturile au licența OGL-RO v1.0.

### Cited Findings
- `robots.txt`: `Disallow: /dataset/rate/`, `/revision/`, `/dataset/*/history`, `/api/`, plus `Crawl-Delay: 10`. Confirmă nota anterioară. — [data.gov.ro robots](https://data.gov.ro/robots.txt)
- `/dataset?q=legislatie` → 200, 34 KB, 0,57 s: 5 seturi (standarde, buletine de achiziții ale Departamentului pentru Armamente 2013–2015). — [căutare legislatie](https://data.gov.ro/dataset?q=legislatie)
- `/dataset?q=sicap` → „Niciun set de date corespunzător pentru «sicap»”. Subsolul spune: „You can also access this registry using the API (see Documentație API)”. — [căutare sicap](https://data.gov.ro/dataset?q=sicap)
- Termenii portalului (`/termeni.html`) conțin doar exonerări de răspundere. Nu există clauze despre acces automat. — [data.gov.ro termeni](https://data.gov.ro/termeni.html)
- Licența OGL-RO v1.0 permite: „Copiați, publicați, distribuiți informația … re-folosiți informația în scop comercial sau necomercial”. Condiții: declararea sursei („Conține informații publice în baza Licenței pentru Guvernare Deschisă v1.0”), fără sugerarea unui statut oficial și fără denaturare. — [OGL-RO v1.0 (copie pe static.anaf.ro)](https://static.anaf.ro/static/copyright/OGLROU10_14032016.pdf)

### Inferences
- Nu am apelat `/api/3/action/package_search`, ca să respect robots.txt. Rezultatul de API din nota anterioară (48 de seturi „anaf”) nu a fost re-testat.
- Pentru LexAI, data.gov.ro rămâne marginal: nu are legislație sau decizii, iar SICAP lipsește. Dacă e nevoie de API, recomand o cerere de permisiune la SGG (robots vs. documentația API) și respectarea `Crawl-Delay: 10`.

### Gaps
- Nu știu dacă interdicția `/api/` din robots este intenționată (anti-crawler) sau o politică de acces. Portalul nu clarifică.

---

## 5. Baze comerciale (doar robots.txt și termeni, fără login și fără scraping)

### Takeaway
Toate bazele comerciale semnalează explicit **refuzul accesului automat** sau al utilizării AI:
- Lege5: `Disallow: /` pentru `*` și interdicție contractuală;
- Sintact: allowlist îngust și termeni WK anti-scraping;
- Legalis: `ai-train=no` și interdicția „preluării sistematizate sau automate”;
- JURIDICE.ro: ~95 de boți AI blocați și reproducere doar cu acord;
- iDrept: absorbit în Sintact.

Verdict NU pentru toate, în absența unei licențe B2B.

### Cited Findings
- **lege5.ro:**
  - robots.txt are un prim grup `User-agent: *` cu interdicții punctuale (`/Search/`, `/api/`, `*/Ajax`…), apoi un al doilea grup `User-agent: *` / `Disallow: /`. Potrivit RFC 9309, grupurile pentru același agent se combină, deci tot site-ul e interzis pentru agenți nelistați.
  - `Allow: /` există doar pentru Googlebot, Mediapartners-Google, Googlebot-Mobile, Adsbot-Google și SemrushBot-SA/SI.
  - Nu am citit `/Terms`, din cauza robots. Cercetarea anterioară din aceeași zi citează: „este strict interzisă utilizarea oricărui sistem automat de accesare … crawlere, boti, scrappere”.
  
  — [lege5 robots](https://lege5.ro/robots.txt); [lege5 Terms (citat anterior)](https://lege5.ro/Terms)
- **sintact.ro:**
  - `User-agent: meta-externalagent`, `bingbot` și `facebookexternalhit` au `Disallow: /`;
  - `User-agent: *` are `Allow` doar pentru `/legislatie`, `/document`, `/jurisprudenta`, `/hotarari-judecatoresti`, `/monitorul-oficial`, `/modele`, `/stiri`, `/comentarii`, `/monografii` etc., apoi `Disallow: /`;
  - nu există directive specifice AI.
  
  — [sintact robots](https://sintact.ro/robots.txt)
- **Termenii WK:** `wolterskluwer.com/robots.txt` și `/ro-ro/terms-of-use` → 403 Cloudflare („Enable JavaScript and cookies to continue”). Potrivit rezumatului din căutare, termenii WK interzic „scraping the screen or web page, crawling access, extraction or collection of site content”. Nu am verificat textul direct. — [WK terms of use](https://www.wolterskluwer.com/ro-ro/terms-of-use)
- **idrept.ro:** robots → 404. `/` → 200, cu `<title>iDrept.ro este acum Sintact.ro</title>` și meta-refresh spre sintact.ro. — [idrept.ro](https://idrept.ro/)
- **legalis.ro:**
  - `www.legalis.ro` nu există în DNS (NXDOMAIN); `legalis.ro` este în spatele Cloudflare;
  - robots: `User-agent: * / Content-Signal: search=yes,ai-train=no,use=reference / Allow: /`, cu rezervă expresă conform art. 4 din Directiva 2019/790;
  - `Disallow: /` pentru ClaudeBot, GPTBot, anthropic-ai, CCBot, Google-Extended etc.
  
  — [legalis robots](https://legalis.ro/robots.txt)
- **Condițiile contractuale Legalis:**
  - utilizatorul poate „descărca o singură dată documentul … și … tipări o singură dată”;
  - „Sunt strict interzise preluarea sistematizată sau automată a documentelor ori a altor elemente ale bazei de date … crearea de colecții sistematizate”;
  - documentele se păstrează „numai pe durata abonamentului”;
  - furnizorul poate introduce „mecanisme de protecț[ie]” pentru detectarea utilizării abuzive.
  
  — [Legalis, condiții contractuale](https://legalis.ro/abonamente/conditii-contractuale-legalis-ro/)
- **juridice.ro:**
  - `User-agent: *` interzice doar `/patricia-pricop` și `/wp-admin/`;
  - un bloc cu ~95 de agenți AI (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Google-Extended, CCBot, Scrapy, FirecrawlAgent etc.) are `Disallow: /`.
  
  — [juridice robots](https://www.juridice.ro/robots.txt)
- **Termenii juridice.ro** (200, 85 KB): „Reproducerea şi difuzarea oricăror texte și/sau înregistrări video, în orice formă, din cadrul acestui site se pot face doar cu acordul nostru, cu excepţia reproducerii şi difuzării în scop de informaţie de presă şi în scop academic.” Confirmă nota anterioară. — [juridice condiții](https://www.juridice.ro/conditii-de-utilizare)

### Inferences
- JURIDICE.ro blochează chiar și agenții de tip „user-initiated fetch” (Claude-User, ChatGPT-User, Perplexity-User), deci intenția este să excludă orice consum prin AI. UA-ul LexAI ar intra tehnic sub `*`, dar folosirea lui ca ocolire a intenției declarate ar fi neloială. Verdict NU.
- Pentru toate bazele comerciale, singura cale rămâne „bring your own document” (utilizatorul încarcă textul) sau o licență negociată. Concluzia notei anterioare se confirmă.

### Gaps
- Termenii proprii sintact.ro (pagina „Condiții de utilizare” din zona de login) și textul exact al termenilor WK nu au fost citiți (403 Cloudflare, plus allowlist-ul din robots).
- Termenii Lege5 nu au fost re-citiți (robots `Disallow: /`).

---

## 6. Ce afirmații din notele anterioare se confirmă și ce se corectează

### Takeaway
Majoritatea afirmațiilor tehnice din `fiscal_autoritati.md` și `registre_comerciale.md` se confirmă. Corecturile importante:
- dimensiunea Codului fiscal;
- tipul de blocare de pe anaf.ro;
- găsirea URL-ului CPF;
- endpoint-ul JSON Domino;
- lipsa deciziilor DGSC după 2019 și a SFIA pe MF;
- mutarea conținutului BNR în JS;
- blocarea coe.int.

### Cited Findings
- **Confirmat:**
  - CF actualizat până la Legea 204/2026 și HG 602/2025, cu ancorele `#A1`, `#A8_1`, `#T5C2S1`;
  - static.anaf.ro fără robots.txt;
  - API-urile ANAF (bilanț, TVA v9, e-Factura) funcționale;
  - tiparul PDF Domino;
  - robots `curs.bnr.ro` = `Disallow: /`, bnr.ro permisiv;
  - robots ANSPDCP;
  - tiparele ASF;
  - robots data.gov.ro;
  - termenii JURIDICE.ro.
  
  — [CF](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm); [curs.bnr robots](https://curs.bnr.ro/robots.txt); [data.gov.ro robots](https://data.gov.ro/robots.txt); [juridice condiții](https://www.juridice.ro/conditii-de-utilizare)
- **Corectat:** nota anterioară dădea pentru CF „aproximativ 865.000 de caractere”. Fișierul are **4.673.382 B** (~4,0 MB de text după eliminarea tag-urilor). Cifra anterioară provenea probabil dintr-un fetch trunchiat. — [CF](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm)
- **Corectat:** blocarea `anaf.ro/robots.txt` nu mai afișează codul WebSEAL `0x38cf0427`. Apare pagina „Acces interzis”, cu cookie-uri F5 și WebSEAL (`PD_STATEFUL`). Blocarea e identică și cu UA de browser. — [anaf robots](https://www.anaf.ro/robots.txt)
- **Gol completat:** URL-ul CPF (`/cod_procedura/Cod_Procedura_Fiscala_2023.htm`, actualizat prin Legea 170/2026) și pagina CFC de pe MF, care are doar deciziile 1/2019 și 1/2021. — [CPF](https://static.anaf.ro/static/10/Anaf/cod_procedura/Cod_Procedura_Fiscala_2023.htm); [CFC](https://mfinante.gov.ro/ro/domenii/fiscalitate/comisia-fiscala-centrala)
- **Nou:** `ReadViewEntries&OutputFormat=JSON` pe baza Domino; indexul `Sanctiuni_RGPD` al ANSPDCP; API-ul REST WordPress la ANRE, ANCOM, UNNPR și AVP; calea PDF `docs-venice.coe.int`. — linkurile din secțiunile 1–3

### Inferences
- Pentru sursele cu verdict DA pot fi construite adaptoare fără acord prealabil, cu throttling, cache și citarea sursei. Pentru cele CONDIȚIONAT e nevoie de decizie de produs sau de cerere scrisă: BNR (feed XML), CC (clauza 8), data.gov.ro (`/api/`), Veneția (doar PDF).

### Gaps
- Feedul XML BNR nu a fost re-testat (robots). Valabilitatea lui se bazează pe testul anterior din aceeași zi.
- Verdictul „NU” pentru coe.int/rm.coe.int poate fi specific IP-ului acestei mașini (IP rezidențial RO). Ar trebui re-testat de pe serverul de producție.

---

### Anexă: cereri exacte care au funcționat (sursele DA și CONDIȚIONAT)

```bash
UA='LexAI/1.0 (verificare surse; uz personal)'
# ANAF: Codul fiscal și Codul de procedură fiscală (DA)
curl -A "$UA" https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm
curl -A "$UA" https://static.anaf.ro/static/10/Anaf/cod_procedura/Cod_Procedura_Fiscala_2023.htm
# ANAF: pagina portal (CONDIȚIONAT: robots ilizibil, URL-uri instabile)
curl -A "$UA" -L 'https://www.anaf.ro/anaf/internet/ANAF/?uri=nm:oid:Z6_H1H6H282J0HQ00Q5BIR5GP0GC3'
# ANAF: contestații Domino (DA)
curl -A "$UA" 'https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d?ReadViewEntries&Start=33&Count=5&Expand=33&OutputFormat=JSON'
curl -A "$UA" 'https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d/fdc276eab287bf24c22584ba0035ce3c/$FILE/D%20410%202019.pdf'
# ANAF: API-uri publice (DA)
curl -A "$UA" 'https://webservicesp.anaf.ro/bilant?an=2024&cui=14399840'
curl -A "$UA" -X POST -H 'Content-Type: application/json' --data '[{"cui":14399840,"data":"2026-10-30"}]' https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva
curl -A "$UA" -X POST -H 'Content-Type: application/json' --data '[{"cui":14399840,"data":"2026-10-30"}]' https://webservicesp.anaf.ro/api/registruroefactura/v1/interogare   # 404 + JSON {"found":[],"notFound":[...]}
# MF: Comisia fiscală centrală (DA)
curl -A "$UA" https://mfinante.gov.ro/ro/domenii/fiscalitate/comisia-fiscala-centrala
# BNR: bloc de pagină (CONDIȚIONAT: endpoint intern)
curl -A "$UA" -X POST --data 'bid=25479&currentSlug=1970-rata-dobanzii-de-politica-monetara' https://www.bnr.ro/blocks
# ANSPDCP (DA)
curl -A "$UA" 'https://www.dataprotection.ro/index.jsp?page=Sanctiuni_RGPD&lang=ro'
curl -A "$UA" 'https://www.dataprotection.ro/servlet/ViewDocument?id=2122'
# ASF (DA)
curl -A "$UA" https://asfromania.ro/ro/a/3579/decizii-de-sanctionare-si-alte-masuri-adoptate-de-consiliul-asf-in-luna-septembrie-2026
# Consiliul Concurenței (CONDIȚIONAT: clauza 8)
curl -A "$UA" https://www.consiliulconcurentei.ro/documente-oficiale/concurenta/decizii/page/2/
curl -A "$UA" https://www.consiliulconcurentei.ro/wp-content/uploads/2026/10/Decizia-213-din-2026.pdf
# ANAP (DA)
curl -A "$UA" https://anap.gov.ro/ro/legislatie/legislatie-tertiara/
# REST WordPress: ANRE (CONDIȚIONAT), ANCOM, AVP (DA), UNNPR (CONDIȚIONAT)
curl -A "$UA" 'https://anre.ro/wp-json/wp/v2/posts?per_page=2&_fields=id,date,link,title'
curl -A "$UA" 'https://www.ancom.ro/wp-json/wp/v2/posts?per_page=2&_fields=id,date,link,title'
curl -A "$UA" 'https://avp.ro/index.php/wp-json/wp/v2/posts?per_page=2&_fields=id,date,link,title'
curl -A "$UA" 'https://uniuneanotarilor.ro/wp-json/wp/v2/posts?per_page=2&_fields=id,date,link,title'
# ANPC, Inspecția Muncii (DA)
curl -A "$UA" https://www.anpc.ro/legislatie
curl -A "$UA" https://www.inspectiamuncii.ro/legislatie
# UNBR (DA)
curl -A "$UA" -L https://unbr.ro/statutul-profesiei-de-avocat-cu-modificari-si-completari-actualizat/
# Comisia de la Veneția: PDF după cod (CONDIȚIONAT)
curl -A "$UA" -L 'https://docs-venice.coe.int/api/Document?pdffile=CDL-AD(2022)045-e'
# data.gov.ro: HTML (CONDIȚIONAT; /api/ interzis în robots, Crawl-Delay 10)
curl -A "$UA" 'https://data.gov.ro/dataset?q=legislatie'
```
