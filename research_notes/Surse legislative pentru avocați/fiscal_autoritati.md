# Surse fiscale și ale autorităților de reglementare din România (pentru LexAI)

> Stare: cercetare făcută la 01.11.2026, cu WebSearch/WebFetch și câteva verificări directe prin `curl` (marcate „verificat direct”). Bugetul de apeluri a fost limitat, așa că multe autorități din listă au rămas **neverificate**; ele apar la „Gaps”, nu ca fapte. Ce vine din memoria modelului și nu a fost verificat acum este marcat explicit „NEVERIFICAT”.

---

## 1. ANAF și Ministerul Finanțelor: Codul fiscal și Codul de procedură fiscală cu norme, ordine, CFC, SFIA, DGSC, API-uri publice

### Takeaway
ANAF are cea mai bogată ofertă tehnică dintre instituțiile verificate. Codul fiscal cu norme este un singur fișier HTML, actualizat informatic și cu ancore stabile pe articol. Există API-uri REST publice fără autentificare (TVA, bilanț, Registrul RO e-Factura, registrul agricol, registrul cultelor). Deciziile de soluționare a contestațiilor au fost publicate istoric ca PDF-uri într-o bază Lotus Domino (`chat.anaf.ro/ContestatiiSite.nsf`). Textul consolidat ANAF este însă explicit **neoficial** („nu reprezintă o republicare”). Valoarea normativă o au doar Legea 227/2015, HG 1/2016 și ordinele publicate în MO.

### Cited Findings

**Codul fiscal cu norme (static.anaf.ro)**
- Pagina `https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm` conține Codul fiscal (Legea 227/2015) adnotat cu Normele metodologice aprobate prin HG 1/2016. Legea este actualizată până la **Legea nr. 204/2026**, iar normele până la **HG nr. 602/2025**. Numele fișierului („_2023”) nu reflectă data actualizării. — [static.anaf.ro Cod fiscal + norme](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm)
- Structura are Titlurile I–XI, cu capitole și secțiuni. Ancorele articolelor au forma `#A1`, `#A8_1` (pentru art. 8¹), iar cele ale secțiunilor forma `#T5C2S1` (Titlul 5, Capitolul 2, Secțiunea 1). — [static.anaf.ro](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm)
- Singurul disclaimer: textul este „actualizat prin mijloace informatice” și „nu reprezintă o republicare”. — [static.anaf.ro](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm)
- Fișierul are aproximativ 865.000 de caractere de text: o singură pagină HTML uriașă, nu o pagină per articol. — [static.anaf.ro](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm) (observat la fetch)
- Normele metodologice ale Codului fiscal se aprobă prin hotărâre a Guvernului și se publică în MO Partea I. Exemplu: HG 39/2026 modifică Titlul VIII „Accize” din normele aprobate prin HG 1/2016. — [ANAF, sinteză MO februarie 2026](https://static.anaf.ro/static/10/Brasov/Brasov/MO_FEB_2026.pdf)

**Buletine de noutăți legislative (feed informal pentru acte noi)**
- ANAF publică PDF-uri numerotate „Noutăți legislative nr. X/AAAA”. Nr. 32/2026 (28.10.2026) menționează **OPANAF 1.227/2026** (modifică OPANAF 63/2017 privind formularele de colectare), precum și Legea 204/2026 și Legea 22/2025 de modificare a Codului fiscal. Tiparul URL este `static.anaf.ro/static/10/Anaf/legislatie/Noutati_legislative_{nr}_{an}.pdf`. — [Noutăți legislative 32/2026](https://static.anaf.ro/static/10/Anaf/legislatie/Noutati_legislative_32_2026.pdf)
- Direcțiile regionale publică sinteze lunare ale actelor din MO cu impact fiscal, de exemplu `static.anaf.ro/static/10/Brasov/Brasov/MO_FEB_2026.pdf`. — [MO FEB 2026](https://static.anaf.ro/static/10/Brasov/Brasov/MO_FEB_2026.pdf)

**API-uri publice ANAF (webservicesp.anaf.ro)**
- Serviciul sincron de consultare a registrelor TVA (plătitori TVA, TVA la încasare, split TVA, inactivi/reactivați) este la `https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva`, cu instrucțiuni publicate la 04.02.2025. — [ANAF, servicii sincron](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/servicii_sincron.html)
- Registrul persoanelor care aplică regimul special pentru agricultori: `https://webservicesp.anaf.ro/RegAgric/api/v2/ws/agric`. Registrul entităților/unităților de cult: `https://webservicesp.anaf.ro/RegCult/api/v2/ws/cult`. — [ANAF, servicii sincron](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/servicii_sincron.html)
- Situațiile financiare anuale (bilanț) sunt la `https://webservicesp.anaf.ro/bilant`, cu instrucțiuni din 20.01.2021. — [ANAF, servicii sincron](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/servicii_sincron.html)
- Interogarea Registrului RO e-Factura: `https://webservicesp.anaf.ro/api/registruroefactura/v1/interogare`, cu instrucțiuni din 05.11.2024. — [ANAF, servicii sincron](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/servicii_sincron.html)
- Pagina oficială nu indică limite de CUI per cerere sau de rată. O sursă terță (biblioteca anafpy) afirmă maximum 100 de CUI per cerere și 1 cerere pe secundă per client pentru v9. — [anafpy docs](https://anafpy.readthedocs.io/en/latest/anaf-reference/public/api/) (terță parte, de confirmat cu documentația oficială)
- Versiunile vechi sunt documentate în fișiere TXT: v3 (01.11.2017, `https://webservicesp.anaf.ro/PlatitorTvaRest/api/v3/ws/tva`) și doc_WS_V5. — [documentație SW 01.11.2017](https://static.anaf.ro/static/10/Anaf/Informatii_R/documentatie_SW_01112017.txt); [doc WS V5](https://static.anaf.ro/static/10/Anaf/Informatii_R/doc_WS_V5.txt)
- Pentru e-Factura există SDK-uri comunitare (de exemplu anaf-ts-sdk). Fluxurile e-Factura de trimitere/descărcare necesită OAuth cu certificat digital, spre deosebire de serviciile publice de mai sus. — [anaf-ts-sdk README](https://unpkg.com/anaf-ts-sdk@1.1.0/README.md) (terță parte)

**Decizii de soluționare a contestațiilor (DGSC) și SFIA**
- Deciziile de soluționare a contestațiilor apar ca PDF-uri într-o bază Lotus Domino, cu tiparul `https://chat.anaf.ro/ContestatiiSite.nsf/{viewUNID}/{docUNID}/$FILE/{nume}.pdf`. Rezultatele indexate acoperă 2008–2019, inclusiv decizii DGSC (de exemplu D 410/2019) și decizii DGRFP București (de exemplu 799/27.12.2016). — [exemplu DGSC 2019](https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d/fdc276eab287bf24c22584ba0035ce3c/$FILE/D%20410%202019.pdf); [decizia 799/2016](https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d/a01fd563e078904bc22580a300301cd2/$FILE/decizia%20799%20din%202016.pdf); [DEC648/2015](https://chat.anaf.ro/ContestatiiSite.nsf/be5587a89489fd8bc2256ba30027e64d/37181d8050a2f081c2257ec3002f84be/$FILE/DEC648_2015.pdf)
- Activitatea de soluționare a contestațiilor și cea privind **soluțiile fiscale individuale anticipate (SFIA)** urmau să treacă de la ANAF la Ministerul Finanțelor. Presa raportează amânări succesive ale transferului (de exemplu, la 1 octombrie, prin HG). — [Profit.ro, preluare de către MF](https://profit.ro/taxe-si-consultanta/finantele-preiau-de-la-anaf-activitatea-de-solutionare-a-contestatiilor-masura-a-fost-ceruta-de-mediul-de-afaceri-18817109); [Profit.ro, amânare](https://profit.ro/taxe-si-consultanta/solutionarea-contestatiilor-ramane-perioada-anaf-ministerul-finantelor-amana-preluarea-acestei-activitati-fisc-guvernul-adoptat-deciziile-schimba-structura-celor-doua-institutii-20409131)
- Statistică EY/ANAF: ponderea contestațiilor admise a crescut la 21% în S1 2021, de la 15% în 2020 și 9% în 2016. — [Profit.ro, webinar EY](https://profit.ro/taxe-si-consultanta/webinar-ey-in-dialog-cu-anaf-contestatiile-depuse-de-companii-la-fisc-primesc-tot-mai-multe-decizii-favorabile-au-urcat-la-21-in-prima-jumatate-a-anului-de-la-15-in-2020-si-doar-9-in-2016-20420983)

**Acces tehnic**
- `https://www.anaf.ro/robots.txt` răspunde cu o pagină de eroare WebSEAL „Forbidden” (cod 0x38cf0427), deci anaf.ro are un reverse proxy care blochează unele cereri automate. `https://static.anaf.ro/robots.txt` întoarce 404, adică nu există robots.txt pe static. — verificat direct cu `curl` la 01.11.2026 ([anaf.ro/robots.txt](https://www.anaf.ro/robots.txt), [static.anaf.ro/robots.txt](https://static.anaf.ro/robots.txt))
- data.gov.ro listează 48 de seturi pentru „anaf”. Cele găsite sunt administrative (bugetul de cheltuieli ANAF 2024–2026, raport de performanță 2024, strategia 2021–2024), nu legislație sau decizii. — verificat direct prin [CKAN API data.gov.ro](https://data.gov.ro/api/3/action/package_search?q=anaf&rows=5)

### Inferences
- **Adapter `anaf_codfiscal`**: `cauta_act`/`info_act` mapate pe două acte fixe (CF și CPF). `citeste_articol(art)` descarcă o singură dată fișierul de ~0,9 MB, îl cachează (de exemplu 24 h) și extrage fragmentul dintre ancora `#A{n}` și următoarea ancoră `#A*`, separând „Norme metodologice” de textul legii. `cauta_in_act` lucrează pe textul cachat. Fiecare răspuns trebuie etichetat „text consolidat neoficial ANAF”, cu trimitere la legislatie.just.ro pentru forma oficială.
- **Adapter `anaf_ws`** (instrument, nu sursă de lege): `verifica_cui(cui, data)` prin POST JSON `[{"cui":..., "data":"AAAA-MM-DD"}]` la v9, plus bilanț și Registrul RO e-Factura. Util avocatului pentru due diligence: statut TVA, inactiv, TVA la încasare. Recomand batch, throttling la ≤1 cerere/s și cache pe (CUI, dată).
- **Deciziile DGSC** se potrivesc cu `cauta_decizii`/`citeste_decizie`, dar baza Domino nu are API. Lista se face din vizualizările .nsf (HTML), iar textul se extrage din PDF. Au valoare de interpretare administrativă, nu de jurisprudență obligatorie: obligă doar în speța respectivă.
- „Noutăți legislative” poate servi ca feed de acte noi: se sondează URL-ul cu numărul incrementat.
- Valoare juridică: CF, CPF, HG 1/2016 și OPANAF publicate în MO sunt normative. Deciziile Comisiei fiscale centrale sunt obligatorii pentru organele fiscale după aprobarea prin ordin (cunoștință generală, NEVERIFICAT în această sesiune). SFIA, deciziile DGSC, „puncte de vedere” și „îndrumări” au valoare individuală sau informativă.

### Gaps
- Nu am găsit în această sesiune pagina-index curentă a deciziilor Comisiei fiscale centrale, nici versiunea consolidată a Codului de procedură fiscală pe static.anaf.ro. Tiparul plauzibil `Cod_procedura_fiscala_*.htm` este NEVERIFICAT.
- Nu am putut stabili dacă SFIA se publică în prezent. Din memorie (NEVERIFICAT): art. 52 CPF prevede publicarea pe site a soluțiilor emise, în formă anonimizată/rezumată. Locul publicării (ANAF sau MF) după transfer este neclar.
- Nu știu dacă baza `chat.anaf.ro/ContestatiiSite.nsf` este încă alimentată după 2019, nici dacă deciziile s-au mutat pe mfinante.gov.ro după preluarea de către MF.
- Documentația oficială v9 (doc_WS_V9) nu a fost citită. Limitele de 100 de CUI și 1 cerere/s provin doar dintr-o sursă terță.
- Lista „îndrumărilor” și „punctelor de vedere” ANAF (de exemplu, secțiunea „Legislație → Puncte de vedere”) nu a fost verificată.
- Termenii de reutilizare ai anaf.ro/static.anaf.ro nu au fost găsiți. Nu există robots.txt pe static.anaf.ro.

---

## 2. Autoritățile de reglementare: ce publică, cum se accesează, valoare juridică

### Takeaway
Dintre autoritățile verificate: **BNR** are singurul feed de date cu adevărat mașină-lizibil (XML cu cursurile, mutat pe `curs.bnr.ro`). **ANSPDCP** are un site JSP cu tipare URL predictibile (`?page=...`, `servlet/ViewDocument?id=`), cu comunicate de sancțiuni frecvente (5 în octombrie 2026). **ASF** publică regulamentele și normele ca PDF-uri, pe căi opace (`uploads/articole/attachments/{hash}.pdf`). Pentru Consiliul Concurenței, CNSC, ANAP/SICAP, ANRE, ANCOM, ANPC, ITM, ANCPI, UNNPR, UNBR, Avocatul Poporului și Curtea de Conturi nu am obținut în această sesiune pagini primare utile (vezi Gaps).

### Cited Findings

**BNR: cursul de schimb XML și dobânda de referință**
- **Schimbare importantă:** URL-urile istorice `https://www.bnr.ro/nbrfxrates.xml`, `https://www.bnr.ro/nbrfxrates10days.xml` și `https://www.bnr.ro/files/xml/years/nbrfxrates2025.xml` întorc acum HTML-ul site-ului nou (status 404 pentru `nbrfxrates.xml`). Feedul XML funcționează la **`https://curs.bnr.ro/nbrfxrates.xml`**, **`https://curs.bnr.ro/nbrfxrates10days.xml`** și **`https://curs.bnr.ro/files/xml/years/nbrfxrates{AN}.xml`**. — verificat direct cu `curl` la 01.11.2026 ([curs.bnr.ro/nbrfxrates.xml](https://curs.bnr.ro/nbrfxrates.xml))
- Structura feedului: `<DataSet xmlns="https://www.bnr.ro/xsd">`, cu schema la `https://curs.bnr.ro/xsd/nbrfxrates.xsd`. Antetul (`Header`) conține `Publisher` = „National Bank of Romania”, `PublishingDate` și `MessageType` = „DR”. Corpul (`Body`) conține `Subject` = „Reference rates”, `OrigCurrency` = „RON” și `Cube date="AAAA-MM-DD"` cu elemente `<Rate currency="EUR">`. Unele monede au atributul `multiplier="100"` (HUF, JPY, KRW, ISK, IDR). Exemplu din 30.10.2026: EUR = 5,3426, GBP = 6,4052, CHF = 5,8059. — [curs.bnr.ro/nbrfxrates.xml](https://curs.bnr.ro/nbrfxrates.xml) (verificat direct)
- Fișierele anuale vechi folosesc namespace `http://` (nu `https://`), iar parserul trebuie să le accepte pe amândouă. — [nbrfxrates2025.xml](https://curs.bnr.ro/files/xml/years/nbrfxrates2025.xml) (verificat direct)
- `https://curs.bnr.ro/robots.txt` conține `Disallow: /` pentru toți agenții, iar `https://www.bnr.ro/robots.txt` nu interzice nimic. — verificat direct ([curs.bnr.ro/robots.txt](https://curs.bnr.ro/robots.txt), [bnr.ro/robots.txt](https://www.bnr.ro/robots.txt))
- Pagina BNR despre XML este `https://www.bnr.ro/23988-cursurile-pietei-valutare-in-format-xml` (EN: `/en/24006-exchange-rate-list-in-xml-format`). Termenii de utilizare sunt la `/2281-termeni-si-conditii`, al căror conținut nu a putut fi extras. — [bnr.ro, pagina XML](https://www.bnr.ro/23988-cursurile-pietei-valutare-in-format-xml)
- Rata dobânzii de politică monetară a fost menținută la **6,50%** prin decizia CA BNR din mai 2026 și, potrivit presei, și la 10.08.2026. — [Economica.net, 15.05.2026](https://www.economica.net/decizie-bnr-dobanda-cheie-ramane-inghetata-la-650-de-aproape-doi-ani-anunt-de-la-banca-nationala-15-mai-2026_941681.html); [Newsweek.ro](https://newsweek.ro/economie/bnr-mentine-dobanda-cheie-la-650-si-avertizeaza-ca-inflatia-va-creste-in-trimestrul-ii-din-2026)
- Potrivit OG 13/2011, dobânda legală remuneratorie este egală cu rata dobânzii de referință BNR. Dobânda penalizatoare este referința + 4 pp, iar între profesioniști referința + 8 pp. — [e-Justice, dobânzi RO](https://e-justice.europa.eu/topics/taking-legal-action/where-and-how/interest-rates/ro_ro)
- Calcul derivat, nu publicat de o sursă: la referința de 6,50%, dobânda remuneratorie este 6,50%, iar cea penalizatoare 10,50% (14,50% între profesioniști). — calcul pe baza [e-Justice](https://e-justice.europa.eu/topics/taking-legal-action/where-and-how/interest-rates/ro_ro)
- Pagina BNR cu rata dobânzii de politică monetară: `https://www.bnr.ro/1970-rata-dobanzii-de-politica-monetara`. — [bnr.ro (meniu)](https://www.bnr.ro/Cursul-de-schimb-524.aspx)

**ANSPDCP (dataprotection.ro)**
- Site JSP cu tiparul `https://www.dataprotection.ro/index.jsp?page={nume}&lang=ro|en|fr`. Documentele sunt la `servlet/ViewDocument?id={n}`. Exemple: id=1650 (ghid întrebări RGPD), id=2122 (ghid Legea 363/2018), id=2203 (ghid asociații de proprietari). Comunicatele au forma `?page=Comunicat_Presa_DD_MM_AAAA` (formatul datei e inconsecvent: uneori cu „_”, alteori cu „.”). — [dataprotection.ro, comunicate](https://www.dataprotection.ro/index.jsp?page=Comunicate&lang=ro)
- Comunicate recente: 30.10.2026 „Sancţiune pentru încălcarea RGPD”, 28.10.2026 „Amenzi pentru încălcarea RGPD”, 19.10.2026 „Plenara EDPB 13–14 octombrie 2026”, 16.10.2026 și 07.10.2026 (sancțiuni). Lista completă este la `?page=allnews`. — [dataprotection.ro](https://www.dataprotection.ro/index.jsp?page=Comunicate&lang=ro)
- Meniul „Decizii ANSPDCP” are link placeholder (`#`), deci nu există un URL public direct către o bază de decizii. Secțiunile disponibile: legislație primară (`?page=legislatie_primara`), legislație comunitară (`?page=legislatie_comunitara`), EDPB (`?page=EDPB`), întrebări frecvente și materiale informative. — [dataprotection.ro](https://www.dataprotection.ro/index.jsp?page=Comunicate&lang=ro)
- `robots.txt` interzice doar `/?page=money_declarations*`. — verificat direct ([dataprotection.ro/robots.txt](https://www.dataprotection.ro/robots.txt))
- Statistici: în 2024, 83 de amenzi în total (1.855.807 lei), din care 80 în baza RGPD (raportul anual 2024). În 2025, 105 amenzi (2.565.020 lei). — [Profit.ro, retrospectiva 2025](https://profit.ro/legal/retrospectiva-anului-2025-din-prisma-sanctiunilor-aplicate-pentru-incalcarea-legislatiei-privind-protectia-datelor-22372249)

**ASF (asfromania.ro)**
- Paginile „General regulation” și „Primary legislation” listează regulamente și norme ASF (de exemplu Regulamentul 8/2019, Regulamentul 1/2019, Norma 13/2019). Textele sunt PDF-uri cu tiparul `asfromania.ro/uploads/articole/attachments/{hash}.pdf`, de exemplu Norma 25/2022 privind autorizarea asigurătorilor. — [ASF General regulation](https://www.asfromania.ro/en/a/946/general-regulation); [Norma 25/2022 PDF](https://asfromania.ro/uploads/articole/attachments/658452ef3a93b869725027.pdf)
- Paginile de articol au tiparul `asfromania.ro/{ro|en}/a/{id}/{slug}`. În unele URL-uri indexate apar placeholder-e de template nerandate (`{{path('site_pages',...)}}`), deci linkurile sunt fragile. — [ASF](https://asfromania.ro/app.php/en/a/104/law-no.-113/2013-for-the-approval-of-the-government-emergency-ordinance-no.-93/{{path('site_pages',{'slug':'disclaimer', 'id':2})}})
- Proiectele de reglementare ASF sunt puse în consultare publică aproximativ 10 zile. — [Puterea.ro](https://www.puterea.ro/?p=514462)

**Consiliul Concurenței**
- Deciziile de sancționare sunt executorii și se pot contesta la Curtea de Apel București în 30 de zile de la comunicare. Motivarea trebuie comunicată în 120 de zile (cazul ROBOR, conform presei). — [financialintelligence.ro](https://financialintelligence.ro/consiliul-concurentei-respinge-acuzatiile-bancilor-si-apara-sanctiunile-din-dosarul-robor-decizia-poate-fi-contestata-in-instanta-consiliul-concurentei-isi-va-exercita-in-continuare-atributiile-cu/)
- Istoric: 3.646 de decizii în 1997–2012, din care 444 de sancționare. — [euroavocatura.ro](https://www.euroavocatura.ro/stiri/9685/Consiliul_Concurentei:_15_ani_de_activitate_in_cifre) (date vechi)

**CNSC (Consiliul Național de Soluționare a Contestațiilor)**
- CNSC decide în 11 complete specializate, de câte trei consilieri. — [Economica.net](https://www.economica.net/?p=151962)
- Wolters Kluwer Sintact (comercial) indexează peste 16.000 de decizii CNSC in extenso, cu motivare. Aceasta arată că deciziile sunt publice și agregabile. — [Wolters Kluwer, decizii CNSC](https://www.wolterskluwer.com/ro-ro/solutions/sintact/jurisprudenta-hotarari-judecatoresti/decizii-cnsc)
- Volum istoric: 5.782 de decizii emise într-un an (raportul din 2012). — [HotNews](https://hotnews.ro/?p=604502)

**SEAP/SICAP (e-licitatie.ro)**
- SICAP a fost lansat în aprilie 2018. OGP a raportat că modulul de export nu funcționa, așa că datele în bloc nu mai ajungeau pe data.gov.ro după tranziția de la SEAP. — [OGP RO0046 Open Contracting](https://opengovpartnership.org/members/romania/commitments/RO0046)
- Există scrapere comerciale terțe (Apify `apnoda/seap-sicap-tenders`), ceea ce sugerează absența unui API public oficial. — [Apify](https://apify.com/apnoda/seap-sicap-tenders.md) (terță parte)
- `https://www.e-licitatie.ro/robots.txt` întoarce eroarea IIS „resource removed”, adică nu există robots.txt. — verificat direct

### Inferences
- **Adapter `bnr_curs`** (instrument de calcul, nu sursă de lege): `curs(moneda, data)` citește `curs.bnr.ro/nbrfxrates.xml` (ziua curentă), `nbrfxrates10days.xml` (ultimele 10 zile) sau `files/xml/years/nbrfxrates{AN}.xml` (istoric). Trebuie să aplice `multiplier` și să tolereze ambele namespace-uri. Pentru dobânda legală se recomandă un tabel intern de perioade cu rata de referință BNR (rata se schimbă rar), cu sursă și dată de verificare. Robots.txt pe `curs.bnr.ro` interzice tot. Feedul este totuși documentat public pentru consum automat, dar e prudent să facem 1–2 cereri pe zi cu cache și să citim termenii BNR.
- **Adapter `anspdcp`**: `cauta_decizii` ar parcurge `?page=allnews` și comunicatele `Comunicat_Presa_*`. Comunicatele rezumă sancțiunea (operator, articol RGPD, amendă). Nu este jurisprudență, ci practică administrativă, iar procesele-verbale/deciziile de sancționare individuale nu sunt publicate integral. Ghidurile se obțin prin `servlet/ViewDocument?id=` (PDF). Valoare juridică: Legea 190/2018 și deciziile normative ale ANSPDCP publicate în MO sunt obligatorii, ghidurile au valoare informativă.
- **Adapter `asf`**: listare din paginile „legislație”, apoi `citeste_pagina` pe PDF. Regulamentele și normele ASF se publică în MO și sunt normative. Deciziile individuale (sancțiuni) au caracter individual.
- **CNSC**: ar fi o sursă valoroasă pentru `cauta_decizii`, cu volum mare. Deciziile nu sunt obligatorii pentru instanțe, dar sunt foarte relevante în practica achizițiilor. Integrarea depinde de portalul CNSC, neverificat aici.
- Pentru autoritățile fără API, cititorul generic pe domenii oficiale aflate pe whitelist acoperă `citeste_pagina` pentru PDF/HTML. Adaptoare dedicate merită doar acolo unde există liste paginabile (ANAF, ANSPDCP, BNR).

### Gaps
- **Consiliul Concurenței**: URL-ul și structura bazei de decizii și a ghidurilor de pe consiliulconcurentei.ro nu au fost verificate.
- **CNSC**: portalul oficial (din memorie, NEVERIFICAT: `portal.cnsc.ro` sau `cnsc.ro`, cu buletin de decizii și „Practica CNSC”) nu a apărut în căutări, iar căutarea a fost poluată de Canadian Nuclear Safety Commission. Nu știu dacă există filtru sau API.
- **ANAP**: legislația, instrucțiunile, punctele de vedere și notificările de pe anap.gov.ro nu au fost verificate. **SICAP**: nu știu dacă exportul de date deschise a fost reparat după 2018. Pe data.gov.ro, căutarea „sicap” dă 0 rezultate (verificat direct prin [CKAN API](https://data.gov.ro/api/3/action/package_search?q=sicap)).
- **ANRE, ANCOM, ANPC, Inspecția Muncii/ITM (REVISAL), ANCPI (eTerra), UNNPR, UNBR (statut, decizii), Avocatul Poporului, Curtea de Conturi, ministerele**: nu au fost cercetate în această sesiune din cauza bugetului de apeluri. Fără date verificate.
- **BNR**: conținutul paginii de termeni (`/2281-termeni-si-conditii`) și regulamentele/normele BNR (secțiunea legislație) nu au fost extrase. Lipsește un tabel istoric oficial al ratei de referință, iar data exactă a ultimei decizii (10.08.2026) provine din presă.
- **EDPB în limba română**: pagina `?page=EDPB` nu a fost deschisă. Ghidurile EDPB traduse sunt, cel mai probabil, pe edpb.europa.eu (NEVERIFICAT).

---

## 3. Date deschise (data.gov.ro) și fluxuri mașină-lizibile pentru acte noi

### Takeaway
data.gov.ro este o instanță CKAN cu API public (`/api/3/action/package_search`). Datasetele instituțiilor verificate (ANAF) sunt însă administrative (bugete, rapoarte), nu legislație sau decizii. BNR, ANSPDCP și SICAP nu apar ca furnizori relevanți. Fluxurile utile reale sunt **BNR XML** și **API-urile ANAF webservicesp**. Pentru acte noi nu am găsit RSS oficiale la aceste instituții. Singurele substitute sunt PDF-urile ANAF „Noutăți legislative” și comunicatele ANSPDCP.

### Cited Findings
- data.gov.ro este coordonat de Secretariatul General al Guvernului ca punct central de acces la seturile de date deschise. — [CKAN ecosystem, data.gov.ro](https://ecosystem.ckan.org/site/data-gov-ro-data-gov-ro)
- API-ul CKAN `https://data.gov.ro/api/3/action/package_search?q=...` funcționează. „anaf” dă 48 de seturi (bugete 2024–2026, raport de performanță 2024, strategie). „bnr” dă 0, „ansp” dă 0, „sicap” dă 0. „achizitii” dă 174 de seturi, majoritatea rapoarte izolate ale unor ministere sau instituții (de exemplu Ministerul Transporturilor 2016), cu licențe `uk-ogl` sau `CC-BY-4.0`. — verificat direct prin [CKAN API](https://data.gov.ro/api/3/action/package_search?q=anaf&rows=5)
- `https://data.gov.ro/robots.txt` interzice `/api/`, `/revision/`, `/dataset/*/history` și `/dataset/rate/`, cu `Crawl-Delay: 10`. — verificat direct ([data.gov.ro/robots.txt](https://data.gov.ro/robots.txt))
- Istoric, contractele de achiziții 2007–2015 au fost publicate în XLS/CSV. După trecerea la SICAP (2018), exportul în bloc a încetat. — [OKFN index 2015](https://2015.index.okfn.org/place/romania); [OGP RO0046](https://opengovpartnership.org/members/romania/commitments/RO0046)
- BNR XML (zilnic, 10 zile, anual) este singurul feed oficial verificat care se actualizează zilnic. — [curs.bnr.ro](https://curs.bnr.ro/nbrfxrates.xml) (verificat direct)

### Inferences
- Pentru LexAI, data.gov.ro nu este o sursă de legislație secundară. Nu merită un adapter dedicat, cel mult o sondare ocazională. Interdicția din robots.txt pentru `/api/` contrazice existența unui API CKAN public. API-ul e destinat consumului programatic, dar trebuie folosit cu moderație (Crawl-Delay 10 s) și fără crawling.
- Pentru „acte noi”, strategia realistă este să monitorizăm Monitorul Oficial / legislatie.just.ro (acoperite de alt cercetător) și să filtrăm după emitent (ANAF, ASF, BNR, ANSPDCP, ANRE etc.). Asta e mai robust decât site-urile fiecărei autorități.

### Gaps
- Nu am verificat dacă ANAP, ANRE, ANCOM, Consiliul Concurenței sau Curtea de Conturi publică seturi pe data.gov.ro.
- Nu am verificat existența RSS-urilor pe site-urile autorităților (de exemplu ANRE, ANCOM). Nu există dovezi în nicio direcție.
- Nu am verificat dacă SICAP/e-licitatie.ro are în 2026 un modul de date deschise sau un API.

---

## 4. Prioritizare: ce contează pentru avocatul generalist vs. practica specializată

### Takeaway
Pentru practica generală sunt esențiale **dobânda legală (OG 13/2011 + rata de referință BNR)**, **cursul BNR** (conversii în litigii și contracte), **verificarea CUI/TVA/inactivi prin ANAF** și **Codul fiscal/Codul de procedură fiscală** (executare silită fiscală, contestații). Restul (ANSPDCP, ASF, Consiliul Concurenței, CNSC/ANAP, ANRE, ANCOM) servesc practici specializate.

### Cited Findings
- Dobânda legală se calculează direct din rata de referință BNR (OG 13/2011), deci intră în orice litigiu de recuperare de creanțe. — [e-Justice](https://e-justice.europa.eu/topics/taking-legal-action/where-and-how/interest-rates/ro_ro)
- API-ul ANAF v9 dă statutul TVA, TVA la încasare, split TVA și inactiv/reactivat pentru orice CUI, la o dată dată. — [ANAF servicii sincron](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/servicii_sincron.html)
- Codul fiscal se modifică frecvent: Legea 204/2026, Legea 22/2025, HG 39/2026 și HG 602/2025 la norme, OPANAF 1.227/2026. Asta face indispensabilă o sursă cu dată de actualizare explicită. — [static.anaf.ro](https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm); [Noutăți legislative 32/2026](https://static.anaf.ro/static/10/Anaf/legislatie/Noutati_legislative_32_2026.pdf); [MO FEB 2026](https://static.anaf.ro/static/10/Brasov/Brasov/MO_FEB_2026.pdf)
- ANSPDCP aplică frecvent sancțiuni: 105 amenzi în 2025 și 5 comunicate în octombrie 2026. — [Profit.ro](https://profit.ro/legal/retrospectiva-anului-2025-din-prisma-sanctiunilor-aplicate-pentru-incalcarea-legislatiei-privind-protectia-datelor-22372249); [dataprotection.ro](https://www.dataprotection.ro/index.jsp?page=Comunicate&lang=ro)

### Inferences
- **Prioritatea 1 (generalist, de implementat întâi):** `bnr_curs` + tabel cu dobânda de referință, pentru calculatorul de dobândă legală. `anaf_ws` pentru verificarea CUI. `anaf_codfiscal` pentru CF cu norme, ca text neoficial, cu link spre forma oficială.
- **Prioritatea 2 (specializare frecventă):** ANSPDCP (GDPR, prezent în aproape orice firmă), deciziile DGSC (fiscal), CNSC și ANAP (achiziții), Inspecția Muncii (dreptul muncii este foarte frecvent la generaliști, dar sursele ITM nu au fost verificate).
- **Prioritatea 3 (nișă):** ASF (financiar/asigurări), Consiliul Concurenței (concurență), ANRE (energie), ANCOM (telecom), Curtea de Conturi (sector public).
- Pentru toate autoritățile fără API, cititorul generic (whitelist de domenii: `static.anaf.ro`, `anaf.ro`, `mfinante.gov.ro`, `bnr.ro`, `curs.bnr.ro`, `dataprotection.ro`, `asfromania.ro`, `consiliulconcurentei.ro`, `anap.gov.ro`, `e-licitatie.ro`, `cnsc.ro`, `anre.ro`, `ancom.ro`, `anpc.ro`, `inspectiamuncii.ro`, `ancpi.ro`, `uniuneanotarilor.ro`, `unbr.ro`, `avp.ro`, `curteadeconturi.ro`, `data.gov.ro`) acoperă cererile ad-hoc. NOTĂ: domeniile din afara celor verificate mai sus sunt din memorie și NEVERIFICATE.

### Gaps
- Nu există date empirice despre frecvența cu care avocații generaliști consultă fiecare autoritate. Prioritizarea este o inferență.
- Nu am verificat sursele ITM/Inspecția Muncii (ghiduri pentru Codul muncii, REVISAL), deși dreptul muncii este probabil a doua arie ca relevanță pentru generaliști.
