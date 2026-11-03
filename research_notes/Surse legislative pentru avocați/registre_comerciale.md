# Registre publice utile în practica avocatului și baze de date juridice comerciale (România, stare la noiembrie 2026)

> Notă metodologică: cercetare făcută la 1 noiembrie 2026 cu WebSearch/WebFetch. Multe site-uri oficiale (portal.just.ro, rnpm.ro, unejr.ro, epay.ancpi.ro, myportal.onrc.ro) sunt aplicații JavaScript sau cer autentificare, deci nu au putut fi citite integral. Unde informația provine din surse secundare sau datate, se spune explicit. Interfața adaptorului aplicației este: `cauta_act`, `info_act`, `citeste_articol`, `cauta_in_act`, `cauta_decizii`, `citeste_decizie`, `citeste_pagina`.

## 1. Registrul comerțului și registrele de firme: ONRC (RECOM, open data, BRIS), API-ul ANAF, Monitorul Oficial Partea a IV-a, beneficiarii reali

### Takeaway
Pentru „lookup de firmă” există trei căi gratuite și solide: (a) **API-ul REST ANAF** (`PlatitorTvaRest/v9`, fără autentificare, 100 CUI/cerere, 1 cerere/secundă); (b) **seturile ONRC de pe data.gov.ro** (CSV „Firme înregistrate…”, actualizate cam lunar, CC-BY-4.0 sau OGL-ROU-1.0); (c) **componenta gratuită RECOM** și BRIS / e-Justice „Find a company” (doar HTML, fără API public documentat). Datele complete (asociați, capital, istoric, certificate constatatoare) sunt **contra cost** (Ordinul MJ 380/C/2024). Registrul beneficiarilor reali nu mai e public: din 2025 se cere dovada unui **interes legitim** (Legea 86/2025). Niciuna din aceste surse nu se potrivește cu interfața actuală (care e orientată spre acte normative și decizii); e nevoie de o capabilitate nouă de tip `cauta_firma` / `info_firma`.

### Cited Findings

**ONRC: cadrul și portalul**
- ONRC este instituție publică în subordinea Ministerului Justiției; administrează registrul central computerizat și oficiile teritoriale (București și cele 41 de județe). Cadrul actual este Legea nr. 265/2022. — [e-Justice, Registrele comerțului, RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro)
- Serviciile online enumerate sunt: InfoCert (certificate online), RECOM online (abonament plus componentă gratuită), verificarea și rezervarea denumirii, înregistrarea online, stadiul dosarului, BERC (Buletinul Electronic al Registrului Comerțului), statistici, declarații și informații despre beneficiarii reali. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro)
- Pagina e-Justice spune: „Accesul în toate secțiunile site-ului web și în portal este gratuit, 24 de ore din 24.” Însă „Pentru informațiile și documentele eliberate se percepe un tarif.” — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro)
- **Componenta gratuită RECOM** conține: denumirea și forma juridică, sediul, numărul de ordine în registru, EUID și codul unic, starea firmei, site-ul, reprezentanții legali și sucursalele din străinătate. **Abonamentul RECOM** (cu plată) adaugă capitalul, codurile CAEN, asociații, administratorii și datele financiare. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro)
- Tarifele sunt stabilite prin Ordinul MJ nr. 380/C din 12 februarie 2024. Ordinul permite plata și printr-un abonament electronic deschis la ONRC, ca alternativă la plata per serviciu. — [ONRC, Ordinul 380/C/2024](https://www.onrc.ro/documente/legislatie/Ordin%20nr.%20380.doc); [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro)
- De la 20 martie 2024, tariful certificatului constatator a scăzut de la 45 la 30 lei (raportare de presă). — [Economedia](https://economedia.ro/?p=174114); [Alba24](https://alba24.ro/noi-tarife-pentru-informatiile-si-documentele-eliberate-de-registrul-comertului-lista-1020218.html)
- Un ghid terț, „verificat în mai 2026”, dă pentru extrasele certificate un interval de 30–90 RON. Nu e sursă oficială. — [companydata.com](https://companydata.com/company-register/romania/)
- Adresele portalului: e-Justice indică myportal.onrc.ro (servicii) și portal.onrc.ro (InfoCert, formulare). Un ghid terț avertizează că vechile adrese portal.onrc.ro / recom.onrc.ro întorc erori și că portalul curent este myportal.onrc.ro. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro); [topograph.co, ghid](https://www.topograph.co/guides/trade-register-in-romania)
- ONRC a schimbat sistemul informatic și portalul de servicii online. În iulie 2025 au existat întreruperi anunțate ale serviciilor. — [Profit.ro](https://profit.ro/taxe-si-consultanta/onrc-si-a-schimbat-portalul-de-servicii-online-si-va-oferi-noi-servicii-21682289); [Economedia](https://economedia.ro/?p=197799)
- Un ghid terț afirmă că nu există un API public pentru registrul ONRC. — [companydata.com](https://companydata.com/company-register/romania/)
- **Date personale:** ONRC nu mai furnizează domiciliul și CNP-ul persoanelor fizice în certificate, rapoarte sau RECOM: „Domiciliul persoanei fizice si codul numeric personal al acesteia nu sunt informatii comerciale pentru care exista obligatia de publicitate legala.” — [Avocatnet](https://www.avocatnet.ro/articol_10120/ONRC-nu-mai-furnizeaza-date-referitoare-la-domiciliu-si-CNP.html)
- Datele din registru se stochează „pe durată nelimitată”. Copiile electronice ale actelor sunt puse la dispoziție „și prin sistemul de interconectare a registrelor comerțului”. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro)

**ONRC open data (data.gov.ro)**
- Organizația ONRC are 80 de seturi de date pe data.gov.ro. Seturile sunt perechi „Firme înregistrate la Registrul Comerțului până la data de DD.MM.YYYY” plus „Nomenclatoare” (starea firmei, CAEN, versiunea CAEN), în format CSV. Cel mai recent set este cel din 19.10.2026; anterioarele sunt din 02.09, 08.07, 03.06, 06.05, 03.04, 02.03, 03.02, 09.01.2026 și 08.12.2025. — [data.gov.ro/organization/onrc](https://data.gov.ro/organization/onrc)
- Tiparul URL: `https://data.gov.ro/dataset/firme-19-10-2026` și `https://data.gov.ro/dataset/nomenclatoare-19-10-2026`. — [data.gov.ro/organization/onrc](https://data.gov.ro/organization/onrc)
- Licențe la nivelul organizației: 51 de seturi CC-BY-4.0 și 29 OGL-ROU-1.0. Pagina nu afișează licența fiecărui set. — [data.gov.ro/organization/onrc](https://data.gov.ro/organization/onrc)
- Setul „firme” conține firmele înregistrate, sediul social și, pentru sucursale, statul membru al societății-mamă. — [data.gov.ro/organization/onrc](https://data.gov.ro/organization/onrc)
- Surse terțe descriu și fișiere cu reprezentanți legali, reprezentanți ai întreprinderilor familiale și sucursale în alte state UE. Frecvența de actualizare apare diferit: „1–3 luni” într-o sursă, „zilnic” în alta. Ritmul observat pe data.gov.ro este aproximativ lunar. Arhivele au câțiva GB. — [companydata.com](https://companydata.com/company-register/romania/); [docs.topograph.co](https://docs.topograph.co/essentials/romania.md); [mcpservers.org, Leadgen MCP](https://mcpservers.org/servers/darksider4all/leadgen-mcp)

**BRIS / e-Justice „Find a company”**
- Serviciul e-Justice „Find a company” acoperă UE, Islanda, Liechtenstein și Norvegia. Informațiile vin în timp real prin BRIS din registrele naționale; e-Justice nu percepe taxe. — [e-Justice, Find a company](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-search-company-eu/general-information-find-company_en)
- Conectarea ONRC la BRIS funcționează din septembrie 2019. — [ONRC, BRIS](https://onrc.ro/index.php/ro/bris); [ONRC, comunicat operaționalizare BRIS (sept. 2019)](https://www.onrc.ro/documente/BRIS/Comunicat%20Operationalizare%20BRIS_sept2019.doc)
- EUID-ul românesc combină codul de țară, identificatorul registrului național și numărul de ordine în registrul comerțului. Se atribuie din 7 iulie 2017. — [Wikipedia, EUID](https://en.wikipedia.org/wiki/European_Unique_Identifier); [undelucram.ro](https://www.undelucram.ro/ro/cumlucram/cod-unic-de-inregistrare-european-valabil-din-7-iulie-1206)

**API-ul ANAF (servicii web publice)**
- Endpoint: `POST https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva`, cu `Content-Type: application/json`. Corpul cererii este `[{"cui": 1234, "data": "YYYY-MM-DD"}, …]`. Limitele sunt **maximum 100 CUI pe cerere** și **1 cerere pe secundă**; supraîncărcarea serverului este sancționată. Nu se cere autentificare. — [ANAF, doc_WS_V9](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt)
- Răspunsul are câmpurile `cod`, `message`, `found[]` și `notFound[]`. Fiecare înregistrare cuprinde:
  - `date_generale`: denumire, adresă, nr. de registru, CAEN, IBAN, stare înregistrare, **statusRO_e_Factura**, organ fiscal competent, formă juridică etc.;
  - `inregistrare_scop_Tva`, `inregistrare_RTVAI` (TVA la încasare), `stare_inactiv`, `inregistrare_SplitTVA`;
  - `adresa_sediu_social` și `adresa_domiciliu_fiscal`.
  
  Exemplul din documentație are erori de sintaxă JSON. — [ANAF, doc_WS_V9](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt)
- Serviciul de bilanț: `GET https://webservicesp.anaf.ro/bilant?an={an}&cui={cui}`, un CUI și un an pe apel. Întoarce indicatori publici din situațiile financiare anuale (JSON: an, CUI, denumire, CAEN, listă de indicatori). Documentația oficială V1 menționează acoperirea 2014–2019, deci e datată. O bibliotecă comunitară raportează un apel funcțional la 2026-07-02, fără autentificare. — [ANAF, doc_WS_Bilant_V1](https://static.anaf.ro/static/10/Anaf/Informatii_R/doc_WS_Bilant_V1.txt); [anafpy docs](https://anafpy.readthedocs.io/en/latest/anaf-reference/public/api/)

**Monitorul Oficial, Partea a IV-a**
- Partea a IV-a este partea în care se publică, potrivit legii, actele privind operatorii economici și alte persoane juridice. — [e-Justice, publicarea anunțurilor oficiale](https://e-justice.europa.eu/topics/legislation-and-case-law/publication-official-announcements/ro_ro)
- Legea privind accesul gratuit și permanent la forma electronică acoperă **Părțile I și II**. Nu s-a găsit nicio sursă care să confirme acces gratuit la Partea a IV-a. — [Economica.net](https://www.economica.net/?p=501962); [Avocatnet](https://www.avocatnet.ro/articol_63249/Tarifele-pentru-publicarea-actelor-in-Monitorul-Oficial-majorate-de-azi.html)
- Tarif de publicare în Partea a IV-a: 152 lei pe pagină de manuscris, conform unei liste Rentrop & Straton posibil datate. — [e-juridic.manager.ro](https://e-juridic.manager.ro/articole/monitorul-oficial-al-romaniei-procedura-si-tarife-de-publicare-30444.html)
- Lege5 (Indaco) include „Monitorul Oficial Partea a IV-a” printre modulele proprii, ca sursă comercială alternativă. — [lege5.ro](https://lege5.ro/)

**Registrul beneficiarilor reali (ONRC)**
- Registrul central al beneficiarilor reali este ținut de ONRC în temeiul Legii nr. 129/2019. e-Justice descrie accesul ca fiind deschis autorităților de supraveghere și judiciare, entităților raportoare și „oricărei persoane, contra cost”. Descrierea e anterioară schimbării din 2025. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/business-registers-eu-countries/ro_ro)
- CJUE (22 noiembrie 2022, cauzele conexate C-37/20 și C-601/20, *Luxembourg Business Registers* și *Sovim*) a constatat că accesul publicului larg la datele despre beneficiarii reali este o ingerință gravă în dreptul la viață privată și la protecția datelor. — [Curia, comunicat](https://curia.europa.eu/jcms/jcms/p1_3865255)
- În România, din mai 2025, **Legea nr. 86/2025** (care modifică Legea 129/2019) limitează accesul la solicitanții care pot dovedi un **interes legitim**. Termenul nu este încă definit în practică. Regulamentul (UE) 2024/1624 va limita accesul similar de la 2027. — [Economedia](https://economedia.ro/?p=305177)
- Documentele ONPCSB despre transpunerea Directivei (UE) 2024/1640 prevăd clarificarea art. 19 din Legea 129/2019: categoriile prezumate a avea interes legitim și procedura de verificare. — [ONPCSB](https://www.onpcsb.ro/uploads/articole/attachments/686774bb25ed9821873090.pdf)

### Inferences
- **Potrivire cu interfața:** ONRC, ANAF și BRIS nu se mapează pe `cauta_act` / `cauta_decizii`. E nevoie de capabilități noi:
  - `cauta_firma(nume|CUI|nr_reg)` → listă de firme;
  - `info_firma(CUI)` → identificare, stare, TVA, inactivitate, e-Factura, sedii (din ANAF v9 + snapshot ONRC);
  - opțional `bilant_firma(CUI, an)`.
  
  Singura punte posibilă cu interfața existentă: `citeste_pagina` pe o pagină publică (de exemplu e-Justice), dar paginile ONRC sunt aplicații JS și nu sunt potrivite pentru citire HTML.
- **Arhitectură recomandată:**
  - snapshot lunar ONRC (CSV de pe data.gov.ro) indexat local pentru căutarea după nume;
  - apeluri live către ANAF v9, în loturi de maximum 100 CUI și cu throttling la 1 cerere/secundă, pentru starea fiscală la o dată anume;
  - link către e-Justice / BRIS pentru firme din alte state UE.
  
  Valoare juridică: **informativă**. Doar certificatul constatator ONRC (cu plată) are valoare probatorie oficială.
- ANAF v9 permite parametrul `data`, deci se poate afla starea TVA sau de inactivitate **la o dată istorică**. Asta e util pentru verificarea unor contracte sau facturi din trecut.
- Datele ONRC open data conțin nume de reprezentanți legali, adică date cu caracter personal. Reutilizarea e permisă de licență, dar GDPR rămâne aplicabil: e nevoie de un temei (interes legitim) și de limitarea scopului. Nu e recomandat să fie indexate nominal persoanele fizice pentru căutare inversă.
- Partea a IV-a a Monitorului Oficial nu pare accesibilă gratuit. Pentru acte de societate, alternativa realistă e ONRC (contra cost) sau un furnizor comercial (Lege5).
- Registrul beneficiarilor reali **nu e candidat** pentru integrare automată: accesul cere dovada interesului legitim, caz cu caz.

### Gaps
- Cuantumul actual al abonamentului RECOM și grila completă din Ordinul 380/C/2024 nu au fost extrase: fișierul .doc nu a fost parsat, iar articolul StartupCafe despre „noile taxe ONRC din 2026” nu a oferit cifre.
- Nu s-a găsit documentație oficială pentru vreun API ONRC sau pentru un serviciu web „furnizare informații” consumabil automat. Nici termenii de utilizare myportal.onrc.ro privind accesul automat nu au fost găsiți.
- Coloanele exacte ale CSV-urilor ONRC (de exemplu dacă includ CUI, adresa completă, reprezentanții) nu au fost verificate pe fișiere.
- Nu s-a putut confirma dacă ONRC furnizează seturile „societăți și structura proprietății” ca seturi de mare valoare via API, așa cum cere Regulamentul (UE) 2023/138 (vezi secțiunea 8).
- Registrul Societăților Agricole (ținut de judecătorii, Legea 36/1991): nu s-a găsit nicio sursă despre acces online. Probabil nu există acces public digitalizat (neverificat).
- Rate limit și termeni pentru `bilant`: nicio sursă oficială nu i-a menționat.

## 2. Insolvență: Buletinul Procedurilor de Insolvență (BPI) și interconectarea europeană (IRI)

### Takeaway
BPI este publicat electronic de ONRC (Legea 85/2014; Legea 151/2015 pentru persoane fizice). Căutările sumare („Sumar număr BPI”, „Persoane publicate în BPI”) sunt **gratuite, cu autentificare**. Textul integral al buletinelor („BPI online”) cere **abonament plătit**, al cărui preț e stabilit prin HG nr. 124/2017. Nu există API public documentat. Publicarea în BPI are rol de **citare și comunicare** a actelor de procedură, deci valoarea juridică e oficială.

### Cited Findings
- BPI este „publicat, în sistem electronic, de Oficiul Național al Registrului Comerțului”. Asigură „derularea serviciului de citare a părților, comunicare, convocare, notificare a actelor de procedură”. A fost înființat în 2006 (Legea 86/2006). Bazele actuale sunt Legea 85/2014 și Legea 151/2015 (secțiunea persoane fizice, în vigoare din 1 ianuarie 2018). — [e-Justice, registre de insolvență RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_ro?member=1)
- Conținut: citații, comunicări, notificări, convocări, hotărâri judecătorești, rapoarte ale administratorilor/lichidatorilor, planuri de reorganizare, anunțuri, plus o secțiune separată pentru debitorii persoane fizice. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_ro?member=1)
- URL-uri: bpi.ro; myportal.onrc.ro/home; secțiunea persoane fizice la bpipf.onrc.ro/bpi_fo/. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_ro?member=1); [ONRC, pagina BPI](https://www.onrc.ro/index.php/ro/acces-rapid-la-informatiile-gratuite-din-registrele-de-insolventa-din-ue?id=280)
- Model de acces: „Sumar număr BPI” este gratuit. Rezultatele cuprind tipul actului, denumirea entității, județul, CIF și nr. de registru. „Persoane publicate în BPI” cere doar autentificare și întoarce entitatea, nr. dosarului, instanța, numerele de BPI, tipul procedurii și primul termen. „BPI online” (text integral): accesul „este acordat după autentificarea utilizatorului și plata unui abonament”. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_ro?member=1)
- Criterii de căutare în BPI online: număr/an buletin, denumire, CIF, nr. de registru, nr. de dosar, interval de publicare. În secțiunea persoane fizice se poate căuta după nume, **CNP**, data și locul nașterii, act de identitate, nr. de dosar. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_ro?member=1)
- Secțiunea persoane fizice este gratuită pentru debitori, creditori, administratori sau lichidatori (pe dosar) și pentru comisiile de insolvență și instanțe (pe toate dosarele). — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_ro?member=1)
- Prețul BPI (exemplar și abonament) este stabilit prin HG nr. 124/2017. Accesul online la secțiunea persoane juridice e gratuit pentru autorități publice, misiuni diplomatice și anumite alte entități (Ordinul ONRC din 2024). — [ONRC, Ordinul 381/C/2024](https://www.onrc.ro/documente/legislatie/Ordin%20nr.%20381.doc); [ONRC, referat proiect tarife BPI PF](https://www.onrc.ro/documente/Proiecte%20legislative/23.06.2017/proiect%20ordin%20tarife%20bpi%20pf-site.docx)
- ONRC publică o notă de informare GDPR dedicată BPI. — [ONRC, Nota informare BPI RGPD](https://www.onrc.ro/documente/date%20cu%20caracter%20personal/3.2.%20NOTA%20INFORMARE%20BPI%20RGPD.docx)
- ONRC are o pagină „Acces rapid la informațiile gratuite din registrele de insolvență din UE”, adică trimitere la interconectarea IRI pe e-Justice. — [ONRC](https://www.onrc.ro/index.php/ro/acces-rapid-la-informatiile-gratuite-din-registrele-de-insolventa-din-ue?id=280)
- Lege5 include BPI ca modul comercial. — [lege5.ro](https://lege5.ro/)

### Inferences
- **Potrivire cu interfața:** BPI nu se potrivește cu interfața existentă. E nevoie de capabilitatea `cauta_insolventa(CUI|denumire|nr_dosar)` → listă de publicări (nr. BPI, tip act, dosar, instanță, procedură). Implementarea minimă gratuită: interogări pe „Persoane publicate în BPI” cu un cont autentificat. Fără API documentat, asta înseamnă automatizarea unei interfețe web, cu risc juridic (termeni) și tehnic. Textul integral cere abonament per utilizator.
- O alternativă practică ar fi o combinație: ANAF v9 (`stare_inactiv`, starea înregistrării), câmpul de stare din open data ONRC (de exemplu „în insolvență” sau „radiată”) și portalul instanțelor (dosarele de insolvență la tribunal, vezi secțiunea 3). Acoperă cazul de utilizare „este firma X în insolvență?” fără BPI.
- Secțiunea persoane fizice (căutare după CNP) are risc GDPR ridicat. Nu se recomandă integrarea.

### Gaps
- Prețul curent al abonamentului BPI online (2026) nu a fost găsit. HG 124/2017 nu a fost citită.
- Nu s-a găsit niciun API sau serviciu web BPI oficial și nici termeni privind accesul automat pe bpi.ro.
- Nu s-a confirmat dacă România este efectiv conectată la IRI 2.0 (Regulamentul (UE) 2015/848) și ce câmpuri expune acolo. Pagina e-Justice citită nu menționa IRI.

## 3. Instanțe: portal.just.ro, căutarea de dosare și serviciul web SOAP

### Takeaway
Portalul instanțelor (portal.just.ro) permite căutarea gratuită a dosarelor după număr, părți, obiect și dată. În spatele lui există un serviciu SOAP public (`portalquery.just.ro/Query.asmx`, cu metode precum `CautareDosare`), folosit de multe aplicații terțe (Lege5, Justya, LexForce, Apify). Nu am găsit documentație oficială nici termeni de utilizare. Endpoint-ul a întors HTTP 525 la testare (1 noiembrie 2026). Datele sunt gestionate de instanțe, nu de MJ.

### Cited Findings
- Un exemplu de cod din 2015 folosește WSDL-ul `http://portalquery.just.ro/Query.asmx?wsdl` și metoda `CautareDosare`, cu parametri de instanță și interval de date. — [GitHub gist](https://gist.github.com/abernix/34c28442b039c55970e6)
- Un actor Apify (terț) descrie serviciul ca SOAP, cu căutare după numele părții și **plafon de 1.000 de rezultate pe interogare**. — [Apify, apnoda/portal-just](https://apify.com/apnoda/portal-just.md)
- Aplicații comerciale (de exemplu Justya) sincronizează automat dosarele de pe portal.just.ro. — [mwm.ai, Justya](https://mwm.ai/apps/justya/6756675002)
- Wolters Kluwer arată că MJ asigură suportul tehnic al portalului, dar „Gestionarea datelor publicate pe portalul instanțelor nu cade în sarcina Ministerului Justiției”. Cererile privind datele personale se adresează instanței care le-a publicat. — [Wolters Kluwer, căutare dosare portal just](https://www.wolterskluwer.com/ro-ro/news/cauta-dosare-portal-just)
- Lege5 oferă „monitorizarea dosarelor” ca serviciu comercial. — [lege5.ro](https://lege5.ro/); [Stanford CodeX TechIndex, Indaco](https://techindex.law.stanford.edu/companies/indaco-systems)
- Testul direct `http://portalquery.just.ro/query.asmx` din 1 noiembrie 2026 a întors HTTP 525 (eroare SSL/handshake prin Cloudflare). Nu știm dacă e o problemă temporară sau o schimbare. — test propriu, fără sursă publicabilă

### Inferences
- **Potrivire cu interfața:** dosarele nu sunt „decizii”. E nevoie de capabilitățile noi `cauta_dosar(nr_dosar|parte|instanta, interval)` și `info_dosar(nr_dosar, instanta)` → părți, stadiu, termene, soluții pe scurt. `cauta_decizii` / `citeste_decizie` rămân pentru jurisprudență (ReJust, ÎCCJ, CCR), pe care o acoperă alt cercetător.
- Valoare: **informativă** (portalul nu înlocuiește citarea sau comunicarea oficială). Datele conțin nume de persoane fizice, deci se aplică GDPR. Pentru dosarele penale apar date din categoria art. 10 GDPR (condamnări și infracțiuni), cu regim restrictiv. Un cache local ar trebui să fie minim și cu termen de expirare.
- Plafonul de 1.000 de rezultate și lipsa termenilor publici recomandă interogări punctuale (după numărul dosarului sau un nume precis plus instanța), nu colectare în masă.

### Gaps
- Nu există documentație oficială MJ pentru WSDL, lista metodelor (de exemplu `CautareDosare2`, `CautareSedinte`), limite sau termeni. Starea actuală a endpoint-ului e incertă (HTTP 525).
- Nu s-a verificat dacă există HTTPS valid sau un endpoint nou după eventualele migrări ale portalului.

## 4. Proprietăți: ANCPI (ePay, extrase de carte funciară, eTerra, MyEterra)

### Takeaway
Extrasul de carte funciară pentru informare se comandă online pe **epay.ancpi.ro** (aproximativ **20 lei** online față de 25 lei la ghișeu; extrasul de plan cadastral costă 15 lei). Documentul vine ca PDF semnat electronic. Din 2 iunie 2025 extrasul e **gratuit pentru proprietari**, prin MyEterra. **Avocații** au prin lege **acces gratuit, direct și permanent** la sistemul integrat de cadastru și carte funciară (eTerra), pentru activitatea profesională (ordinul ANCPI nr. 813/14.07.2022, potrivit surselor de presă). Nu s-a găsit un API public. Căutarea se face după numărul cărții funciare sau cadastral, **nu după proprietar**.

### Cited Findings
- Tarife ePay: extrasul de carte funciară costă 20 lei, extrasul din planul cadastral 15 lei (pentru alți solicitanți decât proprietarii). Online e 20 lei, la ghișeu 25 lei. — [Forbes România](https://www.forbes.ro/?p=479959); [Puterea](https://www.puterea.ro/?p=465551)
- Proprietarii primesc gratuit extrasele online (MyEterra, myeterra.ancpi.ro) sau la ghișeu, din 2 iunie 2025. — [Forbes România](https://www.forbes.ro/?p=479959); [Alba24](https://alba24.ro/extras-carte-funciara-2025-proprietarii-pot-obtine-documentul-gratuit-online-din-2-iunie-procedura-explicata-de-ancpi-1083805.html)
- ANCPI avertizează să se folosească doar platforma oficială epay.ancpi.ro. Plata a 50–100 lei pentru un extras înseamnă că nu s-a folosit site-ul oficial. Extrasul e un PDF semnat electronic. — [Infocontact](https://www.infocontact.ro/contact-ancpi-telefon/); [Alba24](https://alba24.ro/extrasul-de-carte-funciara-este-gratuit-pentru-proprietari-ancpi-atenti-la-intermediarii-care-cer-bani-pentru-acest-document-1098960.html)
- ANCPI a eliberat online aproape 370.000 de documente în 2024. — [Bursa](https://www.bursa.ro/ancpi-a-eliberat-online-aproape-370000-de-documente-in-2024-62801258)
- Legea cadastrului îi include pe avocați printre profesioniștii care colaborează cu ANCPI și care au acces gratuit, direct și permanent la platforma online a sistemului integrat. Legea a fost promulgată. — [Bursa](https://www.bursa.ro/klaus-iohannis-a-promulgat-legea-care-include-avocatii-in-categoria-de-profesionisti-care-colaboreaza-cu-ancpi-02582940)
- Ordinul ANCPI nr. 813/14.07.2022 stabilește condițiile de acces gratuit permanent la cărțile funciare din eTerra pentru primării, consilii județene, avocați și alte entități. — [Alba24 (titlu și rezumat din căutare)](https://alba24.ro/primariile-consiliile-judetene-avocatii-si-alte-entitati-acces-gratuit-in-sistemul-de-cadastru-si-carte-funciara-eterra-931669.html)
- Raportul UNBR pentru 2022–2023 menționează „implementarea măsurilor tehnice pentru accesul gratuit al avocaților la seturile de date din sistemul informatic de cadastru și carte funciară”. — [UNBR, Raport Congres 2023](https://www.unbr.ro/wp-content/uploads/2023/05/RAPORT-CONGRES-2023-080523_FIN.pdf)
- Nu există registru național de bunuri. Cartea funciară dă informații despre un imobil la cerere și contra taxă, dar **nu permite căutarea după debitor**. Informațiile de pagină sunt din 2017. — [e-Justice, licitații judiciare RO](https://e-justice.europa.eu/topics/court-procedures/judicial-auctions/ro_ro)

### Inferences
- **Potrivire cu interfața:** nu se potrivește. Ar fi nevoie de `extras_cf(uat, nr_cf | nr_cadastral)`, dar ePay presupune plată per document și cont, iar accesul gratuit al avocaților e personal (credențiale eTerra ale avocatului). Integrarea realistă: aplicația **ajută la analiza unui extras CF încărcat de utilizator** (PDF), nu îl descarcă singură. Eventual oferă un link către epay.ancpi.ro.
- Extrasul CF cuprinde nume de proprietari și sarcini (date personale). Prelucrarea se face doar în contextul dosarului clientului.
- Valoare juridică: extrasul pentru informare emis de ANCPI e document oficial (opozabilitate prin publicitatea imobiliară). Doar informațiile extrase de aplicație sunt informative.

### Gaps
- Nu s-a găsit niciun API ANCPI sau serviciu web public pentru carte funciară. Nu s-au citit nici termenii ePay privind accesul automat.
- Textul Ordinului 813/2022 și procedura concretă de acces a avocaților (cont, token, limite) nu au fost verificate pe sursa primară.
- Tarifele de pe epay.ancpi.ro la noiembrie 2026 nu au fost confirmate direct. Sursele sunt din 2025 sau mai vechi.

## 5. Avocați, notari, executori și garanții mobiliare: UNBR, registrele notariale, RNPM/AEGRM, UNEJ, popriri

### Takeaway
- **Tabloul avocaților** e ținut de barouri și centralizat de UNBR („Tabloul național al avocaților”). Unele registre electronice UNBR **nu au caracter public**.
- **Registrele notariale** (RNNRM, RNNEPR, RNNEOS etc.) sunt administrate de UNNPR prin CNARNN-INFONOT. RNNRM (regimuri matrimoniale) poate fi consultat de oricine, fără justificarea unui interes, potrivit e-Justice. Celelalte registre sunt accesibile în principal notarilor.
- **AEGRM a fost înlocuită de RNPM** (Legea nr. 297/2018). RNPM are interfață de căutare a avizelor (co.rnpm.ro), administrată sub autoritatea MJ.
- **UNEJ** administrează Registrul electronic de publicitate a vânzării bunurilor supuse executării silite.
- **Nu am găsit** un „registru electronic al popririlor” public: poprirea electronică ANAF este un canal ANAF–bănci, nu un registru consultabil.

### Cited Findings

**UNBR / tabloul avocaților**
- Profesia se exercită numai de avocații înscriși în tabloul întocmit de baroul din care fac parte. — [UNBR, Statutul profesiei (forma din 14 iunie 2022)](https://www.unbr.ro/wp-content/uploads/2022/09/STATUTUL_PROFESIEI_din_03-12-2011_ACTUALIZAT-Forma_din_14-iunie-2022-Fara_anexe.pdf)
- UNBR a dezvoltat baza de date „Tabloul național al avocaților”. — [UNBR, Raportul Consiliului, Congres 2019](https://www.unbr.ro/wp-content/uploads/2019/05/01_RAPORTUL-CONSILIULUI-UNBR-Congresul-avocatilor-2019_v8_CLEAN.pdf)
- O platformă UNBR de intermediere avocat–client are aproximativ 10.000 de avocați înscriși, validați prin Tabloul național (avocați activi, cu drept de exercitare). — [Bursa](https://www.bursa.ro/10000-de-avocati-s-au-inscris-pe-platforma-realizata-de-unbr-62982843)
- Regulamentul registrelor UNBR (Decizia CP 261/23.01.2025, în contextul ONPCSB/AML) prevede că registrele „nu au caracter public”. Datele pot fi comunicate la cerere autorităților îndrituite, barourilor și avocaților. Afirmația se referă la registrele din acel regulament, nu neapărat la tablou. — [UNBR, Decizia CP 261/2025](https://unbr.ro/wp-content/uploads/2025/01/Decizia-CP-261-23-01-2025_aprobare-Regulament-Registre-UNBR-ONPCSB_comunicata.pdf)

**Registrele notariale (UNNPR / CNARNN-INFONOT)**
- RNNRM (Registrul Național Notarial al Regimurilor Matrimoniale) e administrat de UNNPR. Potrivit e-Justice, oricine îl poate consulta și poate cere extrase certificate, fără a justifica un interes. Contact: CNARNN-INFONOT, jurist@infonot.ro. — [notari.pro, RNNRM](https://notari.pro/dictionar-juridic-dex/rnnrm); [e-Justice, autorități emitente CSE, RO](https://e-justice.europa.eu/topics/family-matters-inheritance/inheritance/information-authorities-issuing-ecs/ro_ro)
- RNNEPR este Registrul Național Notarial de Evidență a **Procurilor** și a Revocării acestora (nu de testamente, cum sugera întrebarea). — [notari.pro, RNNEPR](https://notari.pro/dictionar-juridic-dex/rnnepr)
- RNNEOS (opțiuni succesorale): din 1 ianuarie 2014 notarii au acces online la registrele naționale notariale prin CNARNN-INFONOT. Accesul e pentru notari. — [UNNPR, comunicat lansare registre](https://www.uniuneanotarilor.ro/files/ComunicatDePresaLansareRegistreElectroniceCNARNN%20.pdf)
- Organizarea registrelor și procedura de înscriere și consultare se stabilesc prin decizie a Biroului executiv al Consiliului UNNPR (art. 163 din Legea 36/1995). — [avocatcivil.net, art. 163 Legea 36/1995](https://avocatcivil.net/legea-36-1995/art-163)
- Sursele e-Justice în alte limbi descriu RNNEL fie ca registru de testamente și donații, fie ca registru de liberalități. Contradicția nu a fost rezolvată. — [e-Justice HR](https://e-justice.europa.eu/pdf-export/2753_hr); [e-Justice BG](https://e-justice.europa.eu/pdf-export/2753_bg)

**RNPM (fosta AEGRM)**
- Legea nr. 297/2018 privind Registrul Național de Publicitate Mobiliară a abrogat OG 89/2000 (cadrul operatorilor AEGRM). A fost publicată în M. Of. nr. 1040 din 7 decembrie 2018. — [UNBR, text Legea 297/2018](https://www.unbr.ro/wp-content/uploads/2018/12/Legea-nr.-297_2018-privind-Registrul-National-de-Publicitate-Mobiliara.pdf); [euroavocatura.ro](https://www.euroavocatura.ro/legislatie/1329/LEGEA_nr__297_2018_privind_Registrul_National_de_Publicitate_Mobiliara_si_pentru_abrogarea_OG_nr__89_2000_privind_unele_masuri_pentru_autorizarea_operatorilor_si_efectuarea_inscrierilor_in_Arhiva_Electronica_de_Garantii_Reale_Mobiliare)
- Art. 2413 din Codul civil încă numește „Arhiva Electronică de Garanţii Reale Mobiliare”. — [codulcivil.ro, art. 2413](https://www.codulcivil.ro/art-2413-arhiva-electronica-de-garantii-reale-mobiliare/)
- rnpm.ro redirecționează la co.rnpm.ro. „Autoritatea de Supraveghere a R.N.P.M.” e în cadrul Ministerului Justiției (cpm@just.ro). Site-ul are și mj.rnpm.ro. Rutele de căutare a avizelor sunt `#cautare/IM` (ipotecă mobiliară), `#cautare/FI` (fiducie), `#cautare/AS` (aviz specific), `#cautare/CS` (creanțe securitizate) și `#cautare/OI` (obligațiuni ipotecare). Mai există „Instrucțiuni de căutare” (`#informatii/cautare`), „Operatori autorizați”, „Documente TED – specificații tehnice” și „Termeni și condiții”. — [co.rnpm.ro](https://co.rnpm.ro/)
- Formularele RNPM (de exemplu Anexa 1 aviz de ipotecă inițial, Anexa 31 prelungire aviz specific) sunt republicate de terți. — [e-juridic.manager.ro, formular Anexa 1](https://e-juridic.manager.ro/articole/formular-de-aviz-ipoteca-initial-anexa-nr-1-rnpm-25691.html)

**Executori judecătorești (UNEJ)**
- UNEJ a înființat, în temeiul art. 35 alin. (2) din Legea 188/2000, **Registrul electronic de publicitate a vânzării bunurilor supuse executării silite**. Acoperă bunuri mobile de peste 2.000 lei și imobile. Publicarea e obligatorie, sub sancțiune disciplinară. Funcționează din 2012; platforma a fost aprobată prin HCUNEJ nr. 67/05.12.2014. URL indicat: unejr.ro. Pagina e-Justice e din 2017. — [e-Justice, licitații judiciare RO](https://e-justice.europa.eu/topics/court-procedures/judicial-auctions/ro_ro)
- Baza legală a fost introdusă prin Legea 154/2011, care a modificat Legea 188/2000. — [Avocatnet, Legea 154/2011](https://www.avocatnet.ro/articol_25384/Legea-nr-154-2011-completarea-Legii-nr188-2000-privind-executorii-judecatoresti.html)
- e-Justice nu menționează un registru public al executorilor. Spune doar că executorii sunt numiți prin ordin al ministrului justiției. Creditorii află bunurile debitorului doar într-o executare încuviințată, prin executor. — [e-Justice, licitații judiciare RO](https://e-justice.europa.eu/topics/court-procedures/judicial-auctions/ro_ro)

**„Registrul electronic al popririlor” (de verificat)**
- Nu s-a găsit nicio sursă despre un „registru electronic/național al popririlor” în România. Există **poprirea electronică ANAF**: actele de executare se transmit electronic băncilor, pe bază de protocol ANAF–bănci. — [Profit.ro](https://profit.ro/taxe-si-consultanta/anaf-a-implementat-poprirea-electronica-17051180); [Intesa Sanpaolo, protocol ANAF poprire electronică](https://www.intesasanpaolobank.ro/document/documents/ISPROMANIA/Protocoale-ANAF/protocol-ANAF-poprirea-electronica.pdf)

### Inferences
- **Potrivire cu interfața:** niciunul din aceste registre nu se potrivește. Capabilități noi posibile:
  - `verifica_avocat(nume|barou)`, dacă există o căutare publică per barou;
  - `cauta_garantie_mobiliara(debitor)` pe RNPM;
  - `cauta_vanzare_executare(…)` pe registrul UNEJ.
  
  Toate sunt aplicații web fără API documentat. Prioritate scăzută pentru un MVP.
- RNPM este cel mai valoros pentru avocații de business (due diligence pe ipoteci mobiliare), dar are front-end JS, fără API public, iar termenii nu au fost citiți. Integrarea ar presupune parteneriat cu MJ sau cu un operator autorizat. Avizele RNPM au **valoare de opozabilitate** (oficiale).
- Registrele notariale nu sunt candidate de integrare: acces doar pentru notari, iar RNNRM se consultă prin cerere de extras.

### Gaps
- Nu s-a găsit URL-ul unei căutări publice centralizate în Tabloul național al avocaților. Probabil fiecare barou are propriul tablou pe site; neverificat.
- Tarifele și criteriile de căutare RNPM (debitor, CNP sau CUI, număr aviz), dacă e gratuită și ce spun termenii despre accesul automat nu au fost aflate: paginile sunt randate în JS.
- Nu s-a confirmat URL-ul actual al registrului de vânzări UNEJ, nici dacă e gratuit. Nu am găsit nici un „Registru Național al Executorilor Judecătorești” consultabil public (eventual tabloul executorilor pe unejr.ro; neverificat).
- Existența unui registru al popririlor a rămas **neconfirmată**. Probabil nu există ca registru public.

## 6. Alte registre: Registrul Național ONG, Registrul Societăților Agricole, interconectările europene

### Takeaway
MJ a lansat pe **11 septembrie 2026** un portal digital al **Registrului Național al ONG-urilor** (PNRR). Are depunere online și acces public la date de bază: denumire, tip, sediu, județ, stare, utilitate publică. Registrul conține 141.204 entități. Numele fondatorilor și ale membrilor conducerii sunt **anonimizate**. Pentru Registrul Societăților Agricole nu s-a găsit acces online.

### Cited Findings
- Portalul Registrului Național ONG a fost lansat de MJ la 11 septembrie 2026 (PNRR). Asociațiile, fundațiile și federațiile pot depune acte și plăti online. Publicul are acces la datele de bază: denumire, tip, sediu, județ, stare de funcționare, statut de utilitate publică. — [InfoCons (14 septembrie 2026)](https://infocons.ro/infocons-141-204-ong-uri-in-registrul-national-al-ong-urilor-lansat-online-de-ministerul-justitiei/)
- Statistici: 141.204 entități, din care 130.247 active, 6.627 radiate, 2.357 în lichidare și 1.973 dizolvate. Pe forme juridice: 121.281 asociații, 18.084 fundații, 1.559 federații. — [InfoCons](https://infocons.ro/infocons-141-204-ong-uri-in-registrul-national-al-ong-urilor-lansat-online-de-ministerul-justitiei/)
- MJ a anonimizat numele membrilor fondatori și componența organelor de conducere pentru toate asociațiile și fundațiile (articol nedatat în rezultate). — [Europa Liberă](https://romania.europalibera.org/amp/registru-ong-romania/32000825.html)
- Înainte de portal, online era disponibilă doar o versiune tabelară a registrului, cu erori și omisiuni. Statutele nu se puteau consulta online. — [Avocatnet, forum](https://www.avocatnet.ro/forum/discutie_654600/Unde-se-poate-consulta-statutul-unui-ONG.html)
- În 2021 MJ a propus trecerea registrului asociațiilor și fundațiilor la ONRC. Un proiect de lege din noiembrie 2025 propune un registru public, gratuit și online, gestionat de MJ împreună cu ANAF. Statutul celor două inițiative nu e clar. — [Agerpres](https://agerpres.ro/justitie/2021/07/29/ministerul-justitiei-propune-trecerea-registrului-asociatiilor-si-fundatiilor-la-onrc--755742); [Senat, B517/2025](https://www.senat.ro/PAGINI/OPINII/2025/11/16/ca9fef7b-4701-4aa8-a0cc-4fab812485d6/B517-2025.pdf)
- Interconectările UE: BRIS pentru firme (secțiunea 1). Pentru insolvență, ONRC trimite la „informațiile gratuite din registrele de insolvență din UE” (IRI, pe e-Justice). — [ONRC](https://www.onrc.ro/index.php/ro/acces-rapid-la-informatiile-gratuite-din-registrele-de-insolventa-din-ue?id=280)

### Inferences
- Registrul ONG poate alimenta o capabilitate `cauta_entitate(nume|CIF)` comună cu firmele (secțiunea 1). Ar unifica „persoane juridice” într-o singură funcție de lookup.
- Valoare juridică: **informativă** (extrasele certificate vin de la judecătorie sau MJ).

### Gaps
- URL-ul portalului ONG, existența unui export open data sau API și termenii de reutilizare nu au fost găsiți.
- Registrul Societăților Agricole: nicio sursă găsită despre acces online sau digitalizare.
- Nu s-a verificat dacă există seturi MJ pe data.gov.ro pentru registrul ONG.

## 7. Baze de date juridice comerciale și surse de doctrină (Lege5, Sintact/Libra, Legalis, iDrept, Legis/iLegis, JURIDICE.ro, Universul Juridic, UNBR)

### Takeaway
Piața e dominată de **Indaco (Lege5, plus asistentul AI „Cicero” pe lege6.ro)** și **Wolters Kluwer (Sintact.ro, Libra AI, iDrept, biblioteca Universul Juridic)**. **C.H. Beck (Legalis)** are doctrina și comentariile Beck. Niciunul nu publică un API sau un program de parteneriat. Termenii Lege5 **interzic explicit** crawlerele, boții și scraperele, precum și extragerea sistematică (penalitate de 1.000 lei pe zi). JURIDICE.ro e în mare parte gratuit, dar reproducerea cere acordul editorului (excepție: presa și scopul academic). Licențierea conținutului pentru o aplicație AI terță e **puțin realistă**, fiindcă WK și Indaco au propriile asistente AI și deci sunt concurenți direcți. Rămâne posibilă doar prin negociere B2B.

### Cited Findings

**Lege5 (Indaco Systems)**
- Module Lege5:
  - legislație RO și UE, Monitoare Oficiale și Jurnalul Oficial UE;
  - jurisprudență selectată, CEDO, CCR, CJUE;
  - doctrină (C.H. Beck), reviste, teze de doctorat;
  - modele de acte, proceduri, dicționare, Q&A;
  - rapoarte de firmă, BPI, **MO Partea a IV-a**, monitorizare dosare, mărci OSIM;
  - achiziții publice, calendar fiscal.
  
  Unele coduri consolidate sunt gratuite (Codul civil, Codul fiscal). Asistentul AI „Cicero AI” e pe domeniul lege6.ro. Nu se menționează niciun API. Prețurile sunt pe /Buy, iar termenii pe /Terms. — [lege5.ro](https://lege5.ro/)
- Stanford CodeX TechIndex descrie Indaco ca dezvoltatorul platformelor Lege5 și Lege6, cu legislație, jurisprudență, monitorizare dosare, modele și „AI-assisted analysis”. — [Stanford CodeX TechIndex](https://techindex.law.stanford.edu/companies/indaco-systems)
- Preț (**datat, an nespecificat**, probabil în jur de 2015): abonamentul lunar Lege5 costa 15, 23 sau 32 euro fără TVA, după complexitate. Informația vine din articolul despre procesul intentat de Indaco Ministerului Justiției pentru publicarea gratuită a legilor. — [Profit.ro (din snippet de căutare; pagina a întors 403)](https://profit.ro/stiri/social/indaco-da-in-judecata-ministerul-justitiei-pe-motiv-ca-publica-legile-gratuit-14468198)
- Termenii Lege5 (lege5.ro/Terms):
  - cont „exclusiv pentru uz personal”, cu acces simultan de pe o singură stație;
  - informațiile au caracter „pur informativ și nu oficial”;
  - „este strict interzisă utilizarea oricărui sistem automat de accesare sau descărcare a informațiilor … inclusiv, dar fără a se limita la crawlere, boti, scrappere sau aplicații similare” (cl. 5g);
  - utilizatorul se obligă „să nu extragă, copieze, salveze sau reutilizeze în mod sistematic sau automatizat conținutul” (cl. 5c);
  - transmiterea către terți pentru o bază de date similară e interzisă (cl. 5d);
  - republicarea cere acord prealabil și menționarea sursei „Indaco Lege5 Online” (cl. 5f);
  - daune de 1.000 lei pe zi (cl. 7);
  - nu există clauză explicită despre AI sau ML.
  
  — [lege5.ro/Terms](https://lege5.ro/Terms)
- Indaco a raportat venituri de 14.670.855 RON în 2025. — [termene.ro, Indaco Systems](https://termene.ro/en/firma/6410158-INDACO-SYSTEMS-SRL)

**Sintact.ro, Libra, iDrept (Wolters Kluwer România)**
- Wolters Kluwer a lansat **Libra by Wolters Kluwer** în România. Libra folosește conținutul certificat editorial din Sintact.ro și răspunde la întrebări juridice complexe. Ajută și la redactarea documentelor (contracte, opinii juridice). Data exactă nu a putut fi citită: pagina a întors 403. — [Profit.ro (titlu și snippet)](https://www.profit.ro/povesti-cu-profit/libra-se-lanseaza-in-romania-continutul-juridic-de-incredere-din-sintact-ro-este-acum-disponibil-in-libra-by-wolters-kluwer-22389842)
- Sintact.ro găzduiește **Biblioteca Universul Juridic**, cu peste 200 de titluri, „cea mai mare bibliotecă juridică românească disponibilă electronic”. Modulele sunt pentru avocați, magistrați, notari și executori. Prețul se obține la cerere de ofertă. — [Wolters Kluwer, Biblioteca Universul Juridic](https://www.wolterskluwer.com/ro-ro/solutions/sintact/biblioteca-universul-juridic)
- Sintact are și revistele Universul Juridic (arhivă plus numere noi), fluxul premium universuljuridic.ro, Revista „Dreptul”, Revista „Forumul Judecătorilor” și legislație tradusă în engleză. — [WK, reviste Universul Juridic](https://www.wolterskluwer.com/ro-ro/solutions/sintact/reviste-universul-juridic); [WK, Flux Universul Juridic](https://www.wolterskluwer.com/ro-ro/solutions/sintact/Flux-Universul-Juridic); [WK, Revista Dreptul](https://www.wolterskluwer.com/ro-ro/news/revista-dreptul-sintact-ro); [WK, Forumul Judecătorilor](https://www.wolterskluwer.com/ro-ro/news/revista-forumul-judecatorilor-este-disponibila-in-programul-legislativ-sintact-ro); [WK, legislație tradusă](https://www.wolterskluwer.com/ro-ro/news/sintact-legislatie-tradusa-engleza)
- **iDrept.ro** apare acum ca soluție Wolters Kluwer („Cercetare, documentare juridică”): legislație RO și UE, fluxuri civile și fiscale, monografii, comentarii de autor. — [WK, iDrept (rezumat din căutare; pagina a întors 403)](https://www.wolterskluwer.com/ro-ro/solutions/idrept); [incorpo.ro, ghid iDrept](https://www.incorpo.ro/en-us/blog/what-is-idreptro-a-comprehensive-guide)
- Prețul unui abonament anual la o singură revistă Universul Juridic (Revista de Drept Constituțional, BiblioLex) este 136 lei. — [ujmag.ro](https://www.ujmag.ro/produse-electronice/bibliolex-abonament-revista-de-drept-constitutional/)

**Legalis (C.H. Beck)**
- Legalis are secțiunile Legislație, Jurisprudență și Doctrină (pachetul Premium). Include comentariile Beck pe articole (Noul Cod civil, Codul de procedură civilă, Codul penal, Codul muncii) și revista „Curierul Judiciar”, actualizată lunar. Sursele sunt un forum și o bibliotecă universitară. — [Avocatnet, forum](https://www.avocatnet.ro/forum/discutie_20675/Utilizare-soft-legislativ.html); [Biblioteca UGAL, publicații Legalis](https://www.biblioteca.ugal.ro/files/activitati/CDE_publicatii_Legalis.pdf); [Curierul Judiciar](https://www.curieruljudiciar.ro/en/the-magazine/journal-published-and-supported-by/)
- Abonamentul Premium interzice copierea sau reutilizarea conținutului, sub sancțiune civilă sau penală (sursă indirectă, nesigur dacă se referă la Legalis). — [Avocatnet](https://www.avocatnet.ro/articol_31249/Literatura-juridica-la-Targul-de-carte-Gaudeamus-2012.html)

**Legis / iLegis (CTCE Piatra Neamț)**
- CTCE Piatra Neamț e furnizor de servicii legislative pentru Ministerul Finanțelor. Produce Legis (inclusiv Legis Plus Fiscalitate, cu Rentrop & Straton), aplicația iPad „Legis Mobile” și iLegis.ro. Există o extensie Chrome terță pentru utilizatorii cu cont iLegis activ. Nu s-au găsit prețuri. — [Fiscalitatea.ro](https://www.fiscalitatea.ro/legis-plus-fiscalitate-unicul-soft-legislativ-care-ofera-acces-contabililor-la-toate-actele-normative-20339/); [App Store, Legis Mobile](https://apps.apple.com/app/id6444888569); [chromeboard, iLegis Asistent](https://chromeboard.com/extension/ilegis-asistent-mlcfibanbokakdkcephhnlhmcfgikoke)

**JURIDICE.ro**
- JURIDICE.ro e editat de Societatea de Științe Juridice. Are:
  - știri și „Lege 9” (proiecte, Monitorul Oficial, JOUE);
  - „Revista de note și studii juridice” (ISSN 2066-0944);
  - jurisprudență națională (ÎCCJ, CCR, curți de apel) și europeană (CEDO, CJUE);
  - secțiunile Business, Litigii, Protective, plus Membership și produsul **Juridice AI** (juridice.ai).
  
  Pagina principală nu arată un paywall. — [juridice.ro](https://www.juridice.ro/)
- Condițiile de utilizare cer acord pentru „Reproducerea şi difuzarea oricăror texte și/sau înregistrări video, în orice formă”, „cu excepţia reproducerii şi difuzării în scop de informaţie de presă şi în scop academic”. Nu există o clauză explicită despre scraping. Termenii au fost actualizați ultima dată pe 18 august 2021. — [juridice.ro/conditii-de-utilizare](https://www.juridice.ro/conditii-de-utilizare)

**Alte surse și context**
- Alte asistente AI juridice românești: **Lawren.ai** (Buju, Stanciu și Asociații, lansat în iunie 2024). — [Revista Biz](https://www.revistabiz.ro/lawren-ai-primul-chatbot-juridic-romanesc-bazat-pe-inteligenta-artificiala/); [Economedia](https://economedia.ro/buju-stanciu-si-asociatii-lanseaza-un-chatbot-juridic-romanesc-bazat-pe-inteligenta-artificiala.html)
- legeaz.net (LegeAZ) publică gratuit acte din Monitorul Oficial, articole din coduri și „spețe” de jurisprudență. — [legeaz.net, exemplu speță](https://legeaz.net/spete-contencios/anulare-act-administrativ-emis-de-3515-20-2012); [legeaz.net, HG 802/1999](https://legeaz.net/hg-802-1999-regulament-arhiva-electronica-aegrm/)
- UNBR a avut în 2019 un proiect intitulat „Acces gratuit la programe legislative și de informare juridică”. Nu s-a găsit furnizorul și nici dacă mai este activ. — [UNBR, Raport Congres 2019](https://www.unbr.ro/wp-content/uploads/2019/05/01_RAPORTUL-CONSILIULUI-UNBR-Congresul-avocatilor-2019_v8_CLEAN.pdf)

### Inferences
- **Potrivire cu interfața:** bazele comerciale s-ar mapa natural pe toate cele șapte metode (`cauta_act`, `info_act`, `citeste_articol`, `cauta_in_act`, `cauta_decizii`, `citeste_decizie`, `citeste_pagina`). Doctrina și modelele de acte ar cere în plus `cauta_doctrina` / `citeste_doctrina` și `cauta_model_act`. **Nu** există însă o cale legală de acces automat fără contract: termenii Lege5 interzic explicit boții, iar dreptul sui generis protejează bazele de date (secțiunea 8).
- Scenariul realist pentru MVP: legislație din surse oficiale gratuite (legislatie.just.ro) și jurisprudență oficială (acoperite de alt cercetător). Pentru doctrină, „bring your own subscription”: utilizatorul deschide documentul în contul său și lipește sau încarcă textul. Aplicația lucrează pe textul încărcat, fără să acceseze automat furnizorul.
- Pentru o licență B2B, candidații mai plauzibili sunt editorii fără asistent AI propriu: C.H. Beck (Legalis), Universul Juridic (dar biblioteca e deja la WK), CTCE (Legis), eventual JURIDICE.ro (care are deja Juridice AI, deci și el e concurent). WK (Libra) și Indaco (Cicero) au produse AI concurente, deci licențierea către terți e puțin probabilă.
- Valoarea juridică a tuturor bazelor comerciale e **informativă**. Lege5 spune explicit „nu oficial”. Aplicația trebuie să citeze sursa oficială (M. Of.) pentru textul normativ.

### Gaps
- Prețuri curente (2026) pentru avocați individuali la Lege5, Sintact, Legalis, iDrept, iLegis: nicio sursă publică găsită. Pagina /Buy a Lege5 nu a fost citită. WK și Beck oferă prețuri doar la cerere.
- Termenii Sintact/Libra, Legalis și iDrept privind accesul automat și AI nu au fost găsiți: paginile WK au întors 403.
- Nu s-a găsit niciun program public de API sau parteneriat la vreun furnizor român.
- **Juris.ro**: nicio informație găsită. Juris.ro și LegeAZ nu au fost cercetate în profunzime (termeni, conținut).
- **Revista Română de Drept Privat** și **Pandectele Române**: editorii, platformele online și accesul nu au fost verificate.
- „Biblioteca UNBR”: nu s-a confirmat dacă UNBR oferă în 2026 acces gratuit avocaților la vreun program legislativ.
- Data lansării Libra și detaliile Cicero AI (lansare, model, preț) nu au fost confirmate.
- Rezultatul procesului Indaco împotriva MJ (publicarea gratuită a legilor) nu a fost aflat.

## 8. Cadrul juridic al reutilizării: Legea 179/2022 (date deschise), dreptul sui generis (Legea 8/1996), GDPR

### Takeaway
- **Legea nr. 179/2022** transpune Directiva (UE) 2019/1024 și abrogă Legea 109/2007. Permite reutilizarea informațiilor din sectorul public.
- **Regulamentul de punere în aplicare (UE) 2023/138**, aplicabil din **9 iunie 2024**, obligă organismele publice să ofere **gratuit, prin API și descărcare în bloc, sub CC-BY 4.0 sau echivalent**, seturile de mare valoare, inclusiv **„societăți și structura proprietății”**. E temeiul pentru a cere ONRC un API.
- Bazele de date comerciale sunt protejate și prin **dreptul sui generis** (Directiva 96/9/CE transpusă în Legea 8/1996): **15 ani**, interdicția extragerii sau reutilizării unor părți substanțiale.
- GDPR limitează reutilizarea datelor personale din registre (CJUE C-37/20 pentru beneficiarii reali; ONRC a eliminat CNP-ul și domiciliul).

### Cited Findings
- Legea nr. 179 din 9 iunie 2022 privind datele deschise și reutilizarea informațiilor din sectorul public (text pe site-ul ONRC). — [ONRC, Legea 179/2022](https://www.onrc.ro/documente/legislatie/LEGE%20nr.%20179%20din%209%20iunie%202022.docx)
- Proiectul „transpune Directiva 2019/1024/UE” și urma să „abroge Legea nr. 109/2007”. Domeniile de mare valoare includ „societăți și structura de proprietate a acestora”. — [INS, sesiune informare date deschise, 14 aprilie 2022](https://www.insse.ro/cms/files/opendata/Sesiune-informare-date_14aprilie2022.pdf); [Camera Deputaților, open data](https://www.cdep.ro/intranet/docs_dip/13693_opendata.pdf)
- Regulamentul (UE) 2023/138 acoperă șase categorii (geospațiale, observarea Pământului și mediu, meteorologie, statistici, **societăți și proprietatea societăților**, mobilitate). Seturile trebuie oferite gratuit, într-un format citibil automat, prin API și descărcare în bloc. Implementarea e inegală între statele membre. — [data.europa.eu, HVD](https://data.europa.eu/en/news-events/news/high-value-datasets-what-has-changed-and-what-will-come-next)
- Licența cerută este CC BY 4.0 sau una echivalentă sau mai puțin restrictivă. Regulamentul se aplică de la 9 iunie 2024. Unele organisme pot fi scutite de gratuitate cel mult doi ani. — [NIPP Croația](https://www.nipp.hr/print.aspx?id=3751); [forum OpenStreetMap](https://community.openstreetmap.org/t/dgu-spatial-data-under-open-license-compatible-with-odbl/110162/3)
- Dreptul sui generis protejează baza de date automat **15 ani**, dacă există o investiție substanțială (financiară, materială sau umană) în obținerea, verificarea ori prezentarea conținutului. Fabricantul poate interzice extragerea sau reutilizarea totală sau parțială. Fabricantul trebuie să fie cetățean sau rezident UE. — [Your Europe, Protecția bazelor de date](https://europa.eu/youreurope/business/running-business/intellectual-property/database-protection/index_ro.htm); [EUR-Lex, Directiva 96/9/CE](https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:31996L0009)
- În Legea 8/1996, dispozițiile despre baze de date apar ca art. 122^1–122^4 (numerotarea dinaintea republicării). Protecția prin drept de autor și dreptul sui generis pot coexista. — [Revista Dreptul](https://revistadreptul.ro/?p=3129); [Studia UBB, nr. 3/2009](https://arhiva-studia.law.ubbcluj.ro/articol/313)
- Termenii Lege5 invocă explicit protecția bazei de date: „Prin bază de date se înțelege orice structură informatică”, plus interdicția extragerii sistematice. — [lege5.ro/Terms](https://lege5.ro/Terms)
- GDPR și registrele:
  - CJUE C-37/20 și C-601/20 (22 noiembrie 2022): accesul general la datele despre beneficiarii reali e o ingerință gravă. — [Curia](https://curia.europa.eu/jcms/jcms/p1_3865255)
  - România a aplicat filtrul interesului legitim prin Legea 86/2025. — [Economedia](https://economedia.ro/?p=305177)
  - ONRC nu publică CNP-ul și domiciliul. — [Avocatnet](https://www.avocatnet.ro/articol_10120/ONRC-nu-mai-furnizeaza-date-referitoare-la-domiciliu-si-CNP.html)
  - Datele de pe portalul instanțelor sunt gestionate de instanțe, ca operatori. — [Wolters Kluwer](https://www.wolterskluwer.com/ro-ro/news/cauta-dosare-portal-just)
  - MJ a anonimizat fondatorii ONG-urilor. — [Europa Liberă](https://romania.europalibera.org/amp/registru-ong-romania/32000825.html)

### Inferences
- Pentru datele publice de registru (ONRC open data, ANAF), Legea 179/2022 și licențele CC-BY / OGL-ROU permit reutilizarea comercială cu atribuire. Pentru extinderea accesului (de exemplu un API ONRC), Regulamentul 2023/138 e argumentul juridic: o cerere de reutilizare în baza Legii 179/2022 poate invoca obligația de API gratuit.
- Pentru bazele comerciale, chiar dacă **textul legilor** nu e protejat de drept de autor (actele oficiale sunt excluse, art. 9 din Legea 8/1996, neverificat aici), **consolidarea, structura și adnotările** furnizorului pot fi protejate sui generis. Scraping-ul încalcă și contractul (termenii) și, probabil, dreptul sui generis.
- GDPR: la integrarea registrelor e nevoie de un temei (art. 6 alin. 1 lit. f, interes legitim), minimizare, limitarea stocării și o atenție specială la datele despre infracțiuni (art. 10) din dosarele penale. Interogările se fac doar pe dosarul clientului, iar persoanele fizice nu se indexează în masă.

### Gaps
- Numerotarea actuală (după republicarea din 2018) a articolelor despre dreptul sui generis din Legea 8/1996 nu a fost verificată pe textul consolidat. Numerotarea 122^1–122^4 e cea veche.
- Nu s-a verificat dacă România a cerut scutire de la gratuitate pentru seturile de mare valoare ONRC și nici dacă ONRC oferă deja un API HVD.
- Nu s-a verificat textul final al Legii 179/2022 privind excepțiile (de exemplu datele protejate de drepturi de proprietate intelectuală ale terților, datele personale).
- Nu s-a găsit vreo opinie ANSPDCP despre reutilizarea datelor din registre de către aplicații legal-tech.

## 9. Sinteză: potrivirea fiecărei surse cu interfața adaptorului

### Takeaway
Interfața actuală (`cauta_act`, `info_act`, `citeste_articol`, `cauta_in_act`, `cauta_decizii`, `citeste_decizie`, `citeste_pagina`) se potrivește doar cu bazele de **legislație și jurisprudență**, adică cu bazele comerciale, care sunt inaccesibile automat fără contract. **Toate registrele publice cer capabilități noi** orientate pe entitate sau dosar. Ordinea de prioritate după fezabilitate și valoare:
1. lookup firmă (ANAF v9 + snapshot ONRC open data);
2. dosare instanțe (SOAP portal.just.ro, cu rezervele din secțiunea 3);
3. insolvență (BPI sumar, cu autentificare);
4. RNPM, ONG, ANCPI (manual sau cu documente încărcate de utilizator).

### Cited Findings
- ANAF v9: REST JSON, fără autentificare, 100 CUI/cerere, 1 cerere/secundă. — [ANAF, doc_WS_V9](https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt)
- ONRC open data: CSV aproximativ lunar pe data.gov.ro, CC-BY-4.0 sau OGL-ROU-1.0. — [data.gov.ro/organization/onrc](https://data.gov.ro/organization/onrc)
- portal.just.ro: SOAP `Query.asmx`, metoda `CautareDosare`, plafon de 1.000 de rezultate (sursă terță). — [Apify](https://apify.com/apnoda/portal-just.md); [GitHub gist](https://gist.github.com/abernix/34c28442b039c55970e6)
- BPI: căutări sumare gratuite cu autentificare; textul integral pe abonament. — [e-Justice RO](https://e-justice.europa.eu/topics/registers-business-insolvency-land/bankruptcy-and-insolvency-registers/ro_ro?member=1)
- RNPM: interfață web JS pe co.rnpm.ro, rute `#cautare/IM|FI|AS|CS|OI`. — [co.rnpm.ro](https://co.rnpm.ro/)
- Lege5: interzice explicit accesul automat. — [lege5.ro/Terms](https://lege5.ro/Terms)

### Inferences
Tabel de mapare propus:

| Sursă | Acces | Metode existente | Capabilitate nouă necesară | Valoare |
|---|---|---|---|---|
| ANAF PlatitorTvaRest v9 | REST JSON gratuit, fără autentificare | — | `info_firma(cui, data)` | informativă (date fiscale oficiale ANAF) |
| ANAF bilant | REST GET gratuit | — | `bilant_firma(cui, an)` | informativă |
| ONRC open data (data.gov.ro) | CSV bulk, CC-BY/OGL | — | `cauta_firma(nume)` (index local) | informativă |
| ONRC RECOM / InfoCert | HTML, cont; complet contra cost | — | link sau comandă manuală | certificatul are valoare oficială |
| BRIS / e-Justice | HTML gratuit | `citeste_pagina` (parțial) | `cauta_firma_ue` | informativă |
| MO Partea a IV-a | contra cost (sau Lege5) | — | — (document încărcat) | oficială |
| Beneficiari reali ONRC | interes legitim, caz cu caz | — | nu se integrează | — |
| BPI | sumar gratuit cu cont; integral pe abonament | — | `cauta_insolventa(cui)` | oficială (citare/comunicare) |
| portal.just.ro | SOAP public nedocumentat | — | `cauta_dosar`, `info_dosar` | informativă |
| ANCPI ePay / eTerra | plată per extras; avocații acces gratuit personal | — | analiză PDF încărcat | extrasul e oficial |
| RNPM | web JS, fără API | — | `cauta_garantie_mobiliara` (partener) | oficială (opozabilitate) |
| Registre notariale | doar notari / extras la cerere | — | nu | — |
| UNEJ vânzări | web | `citeste_pagina` | eventual `cauta_vanzare_executare` | informativă |
| Registrul ONG (MJ, 2026) | portal public nou | — | `cauta_entitate` | informativă |
| Lege5, Sintact, Legalis, iDrept, Legis | abonament per utilizator, fără API, scraping interzis (Lege5) | toate 7, doar sub licență | `cauta_doctrina`, `cauta_model_act` | informativă |
| JURIDICE.ro | gratuit; reproducerea cere acord | `citeste_pagina` (link și citare scurtă) | — | informativă |

### Gaps
- Toate cifrele de cost pentru abonamentele comerciale și pentru RECOM sau BPI rămân neconfirmate pentru 2026.
- Starea endpoint-ului SOAP portal.just.ro la noiembrie 2026 (HTTP 525 la test) trebuie reverificată înainte de proiectare.
