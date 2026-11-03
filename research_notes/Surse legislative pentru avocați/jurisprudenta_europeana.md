# Jurisprudența europeană (CEDO/HUDOC, CJUE/Curia, EUR-Lex/CELLAR, ECLI, Consiliul Europei): surse programatice pentru LexAI

Notă de metodă: cercetare făcută la 1 noiembrie 2026. Pe lângă căutări web, am făcut **teste live** (curl) pe endpoint-urile HUDOC, CELLAR SPARQL/REST și pe WSDL-ul EUR-Lex. Ce am observat direct în răspunsurile acestor endpoint-uri este marcat **[TESTAT 2026-11-01]**. Paginile `eur-lex.europa.eu` (help, manuale PDF, documente) nu au putut fi citite automat: răspund cu `HTTP 202`, corp gol și antetul `x-amzn-waf-action: challenge` (AWS WAF / CloudFront). Ca urmare, unele detalii EUR-Lex vin doar din fragmente de căutare și sunt marcate „neverificat direct”.

---

## 1. HUDOC (CEDO): conținut, API, traduceri în română, ECLI, licență

### Takeaway
HUDOC nu are un API oficial documentat. Interfața web folosește însă un endpoint JSON public, fără cheie: `https://hudoc.echr.coe.int/app/query/results`. Acesta funcționează (testat) și permite filtrarea după stat pârât (`respondent="ROU"`) și limbă (`languageisocode="RUM"`, **nu** „RON”). În noiembrie 2026 existau 1.241 de documente în română privind România și 3.667 de documente în română în total. Majoritatea traducerilor sunt făcute de Institutul European din România (IER). Obstacolul principal pentru un produs comercial este licența: reutilizarea comercială cere permisiune scrisă prealabilă de la Curte.

### Cited Findings
**Conținut și acoperire**
- HUDOC conține jurisprudența Curții: hotărâri și decizii ale Marii Camere, ale Camerei și ale Comitetului, cauze comunicate, avize consultative și rezumate juridice (Case-Law Information Note). Mai conține decizii și rapoarte ale fostei Comisii Europene a Drepturilor Omului și rezoluții ale Comitetului Miniștrilor (meta-descrierea paginii) — [hudoc.echr.coe.int](https://hudoc.echr.coe.int/) **[TESTAT 2026-11-01]**.
- Colecțiile, după FAQ: Judgments (GC, Chamber, Committee), Decisions (inclusiv Commission și Screening Panel), Communicated Cases, Legal Summaries, Advisory Opinions (art. 47 și Protocolul 16), rapoarte și rezoluții ale Comitetului Miniștrilor. Implicit sunt bifate doar hotărârile Marii Camere și ale Camerei — [HUDOC FAQ (PDF)](https://prd-echr.coe.int/documents/d/echr/HUDOC_FAQ_ENG).
- Interfața HUDOC există în engleză și franceză, plus armeană, bulgară, georgiană, **română**, rusă, spaniolă, turcă și ucraineană („Other Languages”) — [HUDOC FAQ](https://prd-echr.coe.int/documents/d/echr/HUDOC_FAQ_ENG). Interfața în română a fost dezvoltată împreună cu Institutul European din România (fragment de căutare, nu am deschis pagina) — [euroavocatura.ro](https://www.euroavocatura.ro/tag/Hotarari_CEDO).
- FAQ-ul spune explicit că HUDOC „nu este destinat” cercetării statistice — [HUDOC FAQ](https://prd-echr.coe.int/documents/d/echr/HUDOC_FAQ_ENG).
- Totaluri măsurate: query-ul `contentsitename:ECHR AND (respondent="ROU")` întoarce `resultcount: 12408` (toate colecțiile și limbile). Restrâns la `documentcollectionid2="JUDGMENTS"`, întoarce 5.577 de documente (EN+FR+traduceri) — [endpoint HUDOC](https://hudoc.echr.coe.int/app/query/results) **[TESTAT 2026-11-01]**.

**Endpoint-ul JSON (neoficial, folosit de interfața web)**
- Exemplu care funcționează:
  `GET https://hudoc.echr.coe.int/app/query/results?query=contentsitename:ECHR AND (languageisocode="RUM") AND (respondent="ROU")&select=itemid,docname,appno,ecli,kpdate,languageisocode,doctype,respondent,importance,documentcollectionid2&sort=kpdate Descending&start=0&length=500`
  Răspunsul are forma `{"resultcount":1241,"results":[{"columns":{...}}],"message":null}` — [endpoint HUDOC](https://hudoc.echr.coe.int/app/query/results) **[TESTAT 2026-11-01]**.
- Câmpuri observate în `columns`: `itemid` (ex. `001-252138`), `docname`, `appno`, `ecli`, `kpdate`, `languageisocode`, `doctype` (ex. `HJUDRUM`, `HDECRUM`, `HEJUD`), `respondent`, `importance` (1–4), `documentcollectionid2` (ex. `CASELAW;JUDGMENTS;GRANDCHAMBER;RON;RUM`) și `rank` — **[TESTAT 2026-11-01]**.
- Particularitate: codul de limbă din `languageisocode` este ISO 639-2/B, adică `"RUM"`. Cu `"RON"` se obțin 0 rezultate. În `documentcollectionid2` apar totuși ambele coduri, `RON;RUM` — **[TESTAT 2026-11-01]**.
- Particularitate: o cerere fără parametrul `sort` a primit `HTTP 404` (pagină CoE), chiar și cu un query simplu. Cu `sort=` (gol) sau `sort=kpdate Descending` merge. Căutarea full-text funcționează cu un termen liber în query, de ex. `... AND proprietate` (453 de rezultate RUM/ROU). Un query cu frază între ghilimele trimisă prin `--data-urlencode` a dat 404, deci codificarea trebuie testată atent — **[TESTAT 2026-11-01]**.
- Serverul MCP terț `@pipeworx/hudoc` descrie același endpoint ca API-ul apelat de interfața HUDOC. Spune că gramatica este de tip Lucene și că o frază precedată de numele unui câmp întoarce în tăcere zero rezultate — [glama.ai – mcp-hudoc](https://glama.ai/mcp/servers/pipeworx-io/mcp-hudoc/tree).
- Textul integral: `GET https://hudoc.echr.coe.int/app/conversion/docx/html/body?library=ECHR&id=001-253150` întoarce HTML (stiluri CSS plus corp). `GET https://hudoc.echr.coe.int/app/conversion/pdf/?library=ECHR&id=001-253150&filename=x.pdf` întoarce PDF (200, ~190 KB) — **[TESTAT 2026-11-01]**. Pentru o traducere în română (`001-252138`), endpoint-ul docx/html a întors un corp gol. Posibil ca unele traduceri să nu aibă sursă DOCX convertibilă (vezi Gaps).
- Biblioteca `echr-extractor` (PyPI, Maastricht Law & Tech, licență Apache 2.0 din oct. 2022) oferă `get_echr` (metadate), `get_echr_extra` (plus text integral, descărcare paralelă, implicit 10 fire) și `get_nodes_edges`. Recunoaște că HUDOC nu are API documentat și că reconstruiește apelurile din traficul browserului — [PyPI echr-extractor](https://pypi.org/project/echr-extractor/).
- Alt instrument din comunitate: `jr989/HUDOC-Analysis` (Python, descărcare și căutare HUDOC) — [GitHub](https://github.com/jr989/HUDOC-Analysis).
- Nu am găsit documentație oficială pentru rate limits sau quotas. Am făcut ~15 cereri consecutive și n-am întâlnit throttling — [rezultat căutare](https://glama.ai/mcp/servers/pipeworx-io/mcp-hudoc/tree) **[TESTAT 2026-11-01]**.

**Traduceri în română**
- Câteva itemid-uri recente în română (RUM) privind România: `001-252138` „CASE OF ALEXFORCAM S.R.L. v. ROMANIA – [Romanian Translation] by the European Institute of Romania” (hotărâre din 16.06.2026); `001-252142` Danileţ c. României (Marea Cameră, 15.12.2025, importance 1); `001-252157` Văscăuţanu c. României (decizie, 18.11.2025) — **[TESTAT 2026-11-01]**.
- Am agregat cele mai recente 1.500 de documente RUM (din 3.667) după furnizorul menționat în `docname`. Rezultat: IER 346 de traduceri și 37 de rezumate; Curtea Supremă de Justiție a R. Moldova 243 de rezumate; Curtea Constituțională a R. Moldova ~238 de rezumate; Ministerul Justiției al R. Moldova 140; Teodor Papuc ~94 de rezumate; „Lawyers for Human Rights” 33; COE Human Rights Trust Fund 55; fără mențiune 294. Pe stat pârât: ROU 456, MDA 175, RUS 98, TUR 76 — **[TESTAT 2026-11-01]**. Corpusul RUM include deci multe texte moldovenești și cauze contra altor state, utile ca jurisprudență tematică în română.
- Există și traduceri marcate „by the SCM Romania and IER” (de ex. `001-176301`, Ichim c. României) — **[TESTAT 2026-11-01]**. Probabil SCM = Consiliul Superior al Magistraturii, pe baza unui parteneriat (inferență).
- FAQ HUDOC: traducerile în limbi neoficiale nu sunt, de regulă, produse de Grefă, care nu le verifică acuratețea. Sunt publicate „doar cu titlu informativ” și pot exista mai multe traduceri ale aceleiași hotărâri — [HUDOC FAQ](https://prd-echr.coe.int/documents/d/echr/HUDOC_FAQ_ENG).
- Un răspuns al MAE către Senat arată că traducerile sunt făcute de Institutul European din România și publicate pe site-ul acestuia. Același document spune că, între 1998 și 2022, CEDO a pronunțat 1.754 de hotărâri împotriva României (fragment de căutare, PDF nedeschis) — [senat.ro](https://senat.ro/PDFIntrebari/b%20r%2027%2002%20dinica%203090%20b.pdf).
- Monitorul Oficial: OUG 48/2008, care modifică OG 94/1999, prevede că Agentul guvernamental *poate* cere Camerei Deputaților publicarea gratuită în M.Of. Partea I a hotărârilor și deciziilor în cauzele în care România este pârâtă. Reclamantul poate cere același lucru doar pentru hotărârile care constată o încălcare. Publicarea nu mai este deci sistematică — [legeaz.net – OUG 48/2008](https://legeaz.net/text-integral/oug-48-2008-modificare-completare-og-94-1999).
- Pagina CEDO „Case-law translations” există (programul de traduceri al Curții), dar nu am deschis-o — [echr.coe.int](https://www.echr.coe.int/web/echr/case-law-translations).

**ECLI CEDO**
- Format observat: `ECLI:CE:ECHR:{AN}:{LLZZ}{JUD|DEC}{nr. cerere pe 7 cifre}{an cerere pe 2 cifre}`. Exemplu: `ECLI:CE:ECHR:2026:1027JUD001956515` pentru cererea 19565/15, hotărâre din 27.10.2026. Traducerea moștenește ECLI-ul hotărârii originale, de ex. `ECLI:CE:ECHR:2026:0616JUD006491019` pentru cererea 64910/19 — **[TESTAT 2026-11-01]**.

**Licență / reutilizare**
- Textele de pe site-ul Curții pot fi reproduse cu indicarea sursei, pentru uz privat sau în scop de informare și educare, și gratuit. Pentru orice alt uz, „în special pentru uz comercial”, trebuie cerută **permisiune scrisă prealabilă** — [ECHR Copyright and Disclaimer](https://www.echr.coe.int/copyright-and-disclaimer).
- Versiunile electronice sunt puse la dispoziție conform art. 44 § 3 din Convenție. Versiunea autentică este originalul semnat din arhivele Curții — [ECHR Copyright and Disclaimer](https://www.echr.coe.int/copyright-and-disclaimer).
- Pentru traducerile din HUDOC fără mențiune de copyright, trebuie contactată echipa HUDOC pentru a afla titularul drepturilor. Unele traduceri sunt marcate ca integral protejate (din fragmentul de căutare; pagina deschisă nu menționa HUDOC, deci formularea nu e confirmată) — [rezultat căutare echr.coe.int](https://www.echr.coe.int/copyright-and-disclaimer).

### Inferences
- Pentru LexAI, endpoint-ul JSON e suficient de stabil pentru un adaptor, dar e neoficial. Trebuie tratat ca „best effort”: cache agresiv, User-Agent identificabil, throttling propriu (de ex. ≤1 cerere/s) și teste de regresie pe forma răspunsului.
- Licența e riscul major: LexAI este produs comercial, deci este probabil necesară o cerere de permisiune scrisă către Curte (formularul de pe site). Variantele „sigure” până atunci: link-uri și citate scurte, sau text integral servit doar la cerere, fără redistribuire în bulk. Pentru traducerile IER/SCM, drepturile pot aparține traducătorului.
- Fiindcă traducerile nu sunt oficiale, LexAI trebuie să afișeze și textul autentic (EN/FR), cu un avertisment, mai ales când citează pasaje.

### Gaps
- Nu există documentație oficială HUDOC pentru API, rate limits sau termeni de utilizare automată. Nici `robots.txt` nu e util: `https://hudoc.echr.coe.int/robots.txt` întoarce pagina HTML a aplicației.
- Nu am verificat de ce endpoint-ul `conversion/docx/html/body` întoarce gol pentru traducerea `001-252138`. Poate traducerile vin ca PDF sau DOC. De testat endpoint-ul PDF pe traduceri.
- Nu am confirmat dacă site-ul IER (ier.gov.ro) mai publică o bază proprie de traduceri și sub ce licență. Nici pe scj.ro sau csm1909.ro nu am verificat colecții proprii de hotărâri CEDO traduse.
- Nu am verificat cine este Agentul guvernamental actual. Sursele de presă dau nume diferite în timp.

---

## 2. CURIA / InfoCuria (CJUE)

### Takeaway
În ianuarie 2026, CJUE a lansat un nou InfoCuria (`https://infocuria.curia.europa.eu/`), în toate cele 24 de limbi oficiale ale UE, cu căutare full-text și pe metadate. Ulterior a venit o versiune cu formular multi-criteriu. Nu am găsit niciun API public pentru InfoCuria. Calea programatică recomandată pentru jurisprudența CJUE este EUR-Lex/CELLAR (secțiunea 3). Textele de pe curia pot fi reproduse cu indicarea sursei, dar nu sunt autentice.

### Cited Findings
- Comunicatul de presă nr. 1/26 din 12 ianuarie 2026 anunță un nou site, o platformă audiovizuală și un nou InfoCuria. Motorul caută în textul integral și în metadate (clasificări, acte și decizii citate, cuvinte-cheie) și e disponibil în 24 de limbi — [CURIA – New InfoCuria](https://curia.europa.eu/site/jcms/p1_1000063986/en/new-infocuria-case-law-database-and-search-tool); [comunicat CP 1/26](https://curia.europa.eu/site/upload/docs/application/pdf/2026-01/cp260001en.pdf).
- O versiune nouă (nedatată pe pagină, ulterioară lui ianuarie 2026) a adus un formular multi-criteriu: denumirea cauzei, sursa întrebării preliminare (instanța sau statul de trimitere), limba de procedură. A îmbunătățit și căutarea legislației citate. URL-ul noului instrument este `https://infocuria.curia.europa.eu/`, iar pagina nu menționează API, open data, export sau RSS — [CURIA – New release of InfoCuria](https://curia.europa.eu/site/jcms/p1_1000085112/en/new-release-of-infocuria-case-law-database-and-search-tool).
- Ghidul vechi al bazei de jurisprudență descrie date despre cauză: etapele procedurii, materia, tipul procedurii, actele UE citate — [curia aideGlobale.pdf](https://curia.europa.eu/common/juris/en/aideGlobale.pdf).
- Avertismentul juridic CURIA: textele „pot fi reproduse cu indicarea sursei”, sunt gratuite, puse la dispoziție pentru informarea publicului și „nu sunt autentice”. Versiunile autentice sunt cele din Repertoriu (Reports of Cases) și din JO, iar acestea prevalează în caz de diferențe. Pagina nu tratează separat uzul comercial — [curia avertissement](https://curia.europa.eu/common/juris/en/avertissement.html).
- ECLI CJUE: format `ECLI:EU:{C|T}:{AN}:{nr. ordine}` (C = Curtea de Justiție, T = Tribunalul). Exemplu verificat în CELLAR: `ECLI:EU:C:2026:872` ↔ CELEX `62023CJ0695` — [CELLAR SPARQL](https://publications.europa.eu/webapi/rdf/sparql) **[TESTAT 2026-11-01]**.

### Inferences
- Pentru LexAI, InfoCuria e util ca țintă de link pentru utilizator (fișa cauzei, toate documentele procedurii, inclusiv concluziile AG și ordonanțele). Interogarea programatică ar trebui făcută prin CELLAR. Scraping-ul noului InfoCuria (aplicație nouă, 2026) ar fi fragil și neautorizat explicit.
- Filtrul „sursa întrebării preliminare = România” din InfoCuria e foarte valoros pentru avocații români. În CELLAR, echivalentul ar trebui construit din metadatele despre instanța națională de trimitere. Proprietatea CDM exactă nu e verificată (vezi Gaps).

### Gaps
- Nu am găsit documentație de API, export sau RSS pentru noul InfoCuria. Nu am verificat dacă vechiul `curia.europa.eu/juris/` (formularul clasic) mai funcționează după relansare.
- Nu am verificat proprietatea CDM pentru „instanța/statul de trimitere” al întrebării preliminare (pentru filtrarea trimiterilor din România).

---

## 3. EUR-Lex (jurisprudență) și CELLAR: CELEX, web service SOAP, SPARQL, REST, licență

### Takeaway
Cea mai bună cale programatică pentru hotărârile CJUE în română este CELLAR. Endpoint-ul SPARQL `https://publications.europa.eu/webapi/rdf/sparql` e public, fără cheie, și am verificat că funcționează. Textul integral în română se obține prin REST cu content negotiation (`/resource/celex/{CELEX}` sau `/resource/ecli/{ECLI}`, cu `Accept-Language: ron`). În CELLAR există 18.126 de hotărâri ale Curții de Justiție (CELEX `6YYYYCJ…`) cu expresie în română. EUR-Lex oferă și un web service SOAP (`doQuery`, cu înregistrare și plafon zilnic stabilit la înregistrare). Site-ul EUR-Lex este însă protejat de AWS WAF, care blochează accesul automat la paginile HTML.

### Cited Findings
**Numerotarea CELEX pentru jurisprudență**
- Sectorul 6 = jurisprudență. Format: `6` + an de înregistrare a cauzei + cod de document + număr de cauză pe 4 cifre. Exemple verificate: `62023CJ0695` (hotărâre a Curții de Justiție, cauza C‑695/23, ECLI:EU:C:2026:872, 15.10.2026) și `62019CJ0083` (C‑83/19, cauza „Asociația Forumul Judecătorilor din România”) — [CELLAR SPARQL](https://publications.europa.eu/webapi/rdf/sparql) **[TESTAT 2026-11-01]**. Codurile `CJ` (hotărâre CJ), `TJ` (hotărâre Tribunal), `CC` (concluzii AG), `CO` (ordonanță) etc. sunt convenția CELEX cunoscută. Doar `CJ` a fost verificat direct aici.

**CELLAR SPARQL** **[TESTAT 2026-11-01]**
- Endpoint: `https://publications.europa.eu/webapi/rdf/sparql` (GET, parametrii `query` și `format=application/sparql-results+json`).
- Query funcțional pentru hotărâri recente cu versiune în română:
  ```sparql
  PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
  SELECT ?celex ?ecli ?date ?expr WHERE {
    ?w cdm:resource_legal_id_celex ?celex ; cdm:case-law_ecli ?ecli ; cdm:work_date_document ?date .
    FILTER(STRSTARTS(STR(?celex),"62023CJ"))
    ?expr cdm:expression_belongs_to_work ?w ;
          cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/RON> .
  } ORDER BY DESC(?date) LIMIT 3
  ```
  Rezultat: 62023CJ0695 / ECLI:EU:C:2026:872 / 2026-10-15 etc. Pentru aceeași operă pot apărea mai multe expresii RON (de ex. 62023CJ0706 are două), deci e nevoie de deduplicare.
- `COUNT(DISTINCT ?w)` pentru CELEX `^6[0-9]{4}CJ` cu expresie RON = **18.126** — **[TESTAT 2026-11-01]**.
- Arhitectura generală CELLAR (depozit comun de metadate și conținut, SPARQL plus API REST): EUR-Lex își preia conținutul din CELLAR (fragmente din paginile EUR-Lex data-reuse) — [EUR-Lex data reuse (RO)](https://eur-lex.europa.eu/content/help/data-reuse/reuse-contents-eurlex-details.html?locale=ro); [SEMIC 2014, Publications Office](https://interoperable-europe.ec.europa.eu/sites/default/files/inline-files/10_SEMIC2014_Van%20Gemert_Kuster_The%20role%20of%20Publications%20Office%20of%20the%20European%20Union%20in%20semantic%20web%20and%20standardisation%20activities%282%29.pdf).

**CELLAR REST (content negotiation)** **[TESTAT 2026-11-01]**
- `GET http://publications.europa.eu/resource/celex/62023CJ0695` cu `Accept: text/html` și `Accept-Language: ron` → 200, redirecționare către `…/cellar/9d2b90a6-…0017.01/DOC_1`. Textul e în română („Ediție provizorie HOTĂRÂREA CURȚII (Camera a zecea) 15 octombrie 2026 …”).
- Pentru o cauză mai veche (`62019CJ0083`), `text/html` a dat 404, iar `Accept: application/xhtml+xml` → 200 (400 KB). Formatul disponibil diferă de la document la document. Adaptorul trebuie să încerce succesiv `application/xhtml+xml`, `text/html`, apoi PDF.
- Notice-ul de metadate: `Accept: application/xml;notice=branch` → XML `<NOTICE decoding="ron" type="branch">` (225–830 KB).
- Același mecanism funcționează și cu ECLI: `http://publications.europa.eu/resource/ecli/ECLI%3AEU%3AC%3A2026%3A872` (text/html → 200; xhtml → 404 pentru acest document).

**Web service-ul SOAP EUR-Lex**
- WSDL: `https://eur-lex.europa.eu/EURLexWebService?wsdl`. E accesibil automat (200, `text/xml`), publicat cu JAX-WS RI 2.3.2 (WebLogic 14.1.1). Are o singură operație, `doQuery`, cu binding SOAP 1.2 la `https://eur-lex.europa.eu/EURLexWebService` — [WSDL EUR-Lex](https://eur-lex.europa.eu/EURLexWebService?wsdl) **[TESTAT 2026-11-01]**.
- Serviciul e bazat pe SOAP și e gratuit după înregistrare. Formularul de înregistrare cere scopul utilizării, numărul maxim de apeluri pe zi și acceptarea termenilor din avizul juridic EUR-Lex. Accesul se acordă prin e-mail, iar limitele pot fi modificate ulterior. Căutarea folosește sintaxa „expert search” EUR-Lex (motor IDOL) și întoarce XML. Serviciul **nu descarcă** fișierele documentelor: acestea se obțin prin CELLAR REST sau prin URL-uri construite (fragmente de căutare; pagina e blocată de WAF) — [EUR-Lex webservice (EN)](https://eur-lex.europa.eu/content/help/data-reuse/webservice.html?locale=en); [Search Web Service User Manual v2.00](https://eur-lex.europa.eu/content/tools/webservices/SearchWebServiceUserManual_v2.00.pdf); [v2.01](https://eur-lex.europa.eu/content/tools/webservices/SearchWebserviceUserManual_v2.01.pdf); [DataExtractionUsingWebServices v1.00](https://eur-lex.europa.eu/content/tools/webservices/DataExtractionUsingWebServices-v1.00.pdf).
- Nu am găsit public o cifră exactă pentru plafonul zilnic. E ales la înregistrare și ajustabil din contul EUR-Lex — [EUR-Lex webservice (fragment)](https://eur-lex.europa.eu/content/help/data-reuse/webservice.html?locale=en).

**Accesul direct la EUR-Lex HTML**
- `https://eur-lex.europa.eu/legal-content/RO/TXT/HTML/?uri=CELEX:62019CJ0083` → `HTTP 202`, `Content-Length: 0`, `x-amzn-waf-action: challenge`, `Server: CloudFront` — **[TESTAT 2026-11-01]**. Accesul automat la paginile EUR-Lex este blocat de o provocare WAF (JavaScript). Pentru server-side trebuie folosit CELLAR, nu `eur-lex.europa.eu/legal-content`.

**Licență**
- Utilizatorii pot reutiliza gratuit conținutul EUR-Lex, sub rezerva condițiilor de copyright (fragment din pagina data-reuse) — [EUR-Lex data reuse (RO)](https://eur-lex.europa.eu/content/help/data-reuse/reuse-contents-eurlex-details.html?locale=ro).
- Decizia 2011/833/UE a Comisiei privind reutilizarea documentelor Comisiei stabilește regula generală: reutilizare permisă, inclusiv comercială, cu indicarea sursei și fără denaturarea sensului. Din 2019, Comisia folosește CC BY 4.0 ca licență implicită. **Neverificat direct în această sesiune** (EUR-Lex blocat de WAF): de confirmat textul Deciziei 2011/833/UE la CELEX `32011D0833` și avizul juridic EUR-Lex privind jurisprudența CJUE. Pentru textele hotărârilor, regula aplicabilă este și avizul CURIA citat la secțiunea 2 (reproducere cu indicarea sursei, texte neautentice).

### Inferences
- Pentru LexAI, varianta recomandată este CELLAR SPARQL (căutare pe metadate, ECLI, CELEX, dată) plus CELLAR REST (text RO). Nu necesită înregistrare și ocolește WAF-ul EUR-Lex. SOAP-ul EUR-Lex ajută doar pentru căutarea full-text cu sintaxa expert. Cere cont și e o tehnologie veche, dar e singura cale oficială de full-text search pe EUR-Lex.
- Full-text search în română peste ~18 mii de hotărâri se poate face mai robust local: ingestie incrementală zilnică prin SPARQL (după `work_date_document` sau data creării), descărcare RO prin REST și indexare proprie (BM25 + embeddings).
- Licența CJUE/UE este mult mai permisivă decât cea CEDO pentru un produs comercial (reutilizare cu indicarea sursei), sub rezerva confirmării textelor citate mai sus.

### Gaps
- Nu am putut citi manualul SOAP (PDF blocat de WAF). Lipsesc detaliile exacte: structura cererii `doQuery` (expertQuery, page, pageSize, searchLanguage), WS-Security UsernameToken și dimensiunea maximă a paginii.
- Nu am verificat textul oficial al Deciziei 2011/833/UE și nici dacă avizul juridic EUR-Lex face excepții pentru textele CJUE.
- Nu am verificat din ce dată ar trebui să înceapă ingestia, deci câte dintre cele 18.126 de hotărâri RO sunt anterioare aderării (2007). Probabil include și traduceri retroactive.
- Bulk download: nu am verificat existența unor dump-uri oficiale de jurisprudență pe data.europa.eu sau op.europa.eu.

---

## 4. Motorul de căutare ECLI (Portalul e-Justiție), JuriFast, Dec.Nat

### Takeaway
Motorul ECLI de pe Portalul European e-Justiție agregă decizii cu ECLI de la instanțele naționale participante. Serviciul său web SOAP este declarat „în curs de actualizare și momentan indisponibil”, iar pagina nu confirmă participarea României. JuriFast și Dec.Nat (ACA-Europe) conțin decizii naționale care aplică dreptul UE, în limba originală, cu rezumate EN/FR. Nu au API oficial. Toate trei sunt surse secundare pentru LexAI.

### Cited Findings
- Motorul ECLI e pe e-Justice: [ECLI search engine](https://e-justice.europa.eu/topics/legislation-and-case-law/european-case-law-identifier-ecli-search-engine_en); [e-justice.europa.eu/ecli](https://e-justice.europa.eu/ecli/).
- Termenii: nu toate statele au introdus ECLI la nivel național. Deciziile provin de la instanțele sau editorii participanți. Căutarea e în timp real, dar indexarea e de obicei zilnică. Folosirea implică acceptarea termenilor portalului. Pentru copyright se trimite la avizul juridic. **Serviciul web SOAP „is being updated and is currently not available”**. Pagina nu menționează România, nici instanțele UE (ECLI:EU) sau CoE (ECLI:CE) — [ECLI – General information and terms and conditions](https://e-justice.europa.eu/topics/legislation-and-case-law/european-case-law-identifier-ecli-search-engine/general-information-and-terms-and-conditions_en).
- Motorul ECLI a fost lansat pe 4 mai 2016. O sursă din aceeași perioadă indică peste 5 milioane de decizii din 12 jurisdicții (cifră veche) — [IALS – ECLI Search Engine](https://resources.ials.sas.ac.uk/node/776845); [Cornell JOAL](https://ojs.law.cornell.edu/index.php/joal/article/download/57/67).
- Pagina e-Justice despre jurisprudența națională: [National case law](https://e-justice.europa.eu/topics/legislation-and-case-law/national-case-law_fr?clang=pt). Contact pentru date: `JUST-E-JUSTICE@ec.europa.eu` (după rezumatul căutării) — [e-Justice ECLI](https://e-justice.europa.eu/topics/legislation-and-case-law/european-case-law-identifier-ecli-search-engine_en).
- JuriFast și Dec.Nat sunt gestionate de ACA-Europe (Asociația Consiliilor de Stat și a Jurisdicțiilor Administrative Supreme). Cuprind jurisprudența statelor membre privind aplicarea dreptului UE, cu decizii în limba originală și rezumate EN/FR. Dec.Nat include și referințe și analize ale direcției de cercetare și documentare a CJUE. Unele decizii naționale (de ex. cele finlandeze) apar în motorul ECLI prin JuriFast — [rezultat căutare: e-Justice / Cornell JOAL](https://ojs.law.cornell.edu/index.php/joal/article/download/57/67/224).
- API: nu am găsit un API oficial e-Justice sau ACA-Europe. Singurul „API” găsit este un actor terț pe Apify, neoficial — [Apify – Court Decisions](https://apify.com/fuchsblau/court-decisions).

### Inferences
- ECLI-ul în sine (format comun) e util pentru LexAI ca identificator canonic transversal: `ECLI:EU:C:…` (CJUE), `ECLI:CE:ECHR:…` (CEDO) și, dacă există, ECLI-uri românești. Motorul ECLI nu e însă o sursă de integrare viabilă acum (WS indisponibil, acoperire incertă pentru RO).
- JuriFast/Dec.Nat sunt utile ca link-out pentru „cum au aplicat alte instanțe supreme hotărârea CJUE X”. Nu justifică un adaptor dedicat.

### Gaps
- Nu am verificat dacă România (ÎCCJ, ReJust) furnizează date către motorul ECLI și nici dacă România a implementat ECLI la nivel național.
- Nu am deschis direct site-urile JuriFast și Dec.Nat (aca-europe.eu) pentru acoperire, licență și numărul de decizii românești.

---

## 5. Consiliul Europei: Comisia de la Veneția și GRECO (avize și rapoarte privind România)

### Takeaway
Ambele sunt surse de „soft law” relevante pentru dreptul constituțional, legile justiției și anticorupție. Documentele lor sunt publicate ca PDF-uri cu referințe stabile (CDL-AD(an)nr. la Veneția, rapoartele GRECO pe rm.coe.int). Nu am găsit API-uri. Integrarea realistă este un index curatoriat (metadate plus PDF) cu `citeste_pagina`.

### Cited Findings
- GRECO, Runda a 5-a (funcții executive de rang înalt și forțe de ordine: președinte, prim-ministru, miniștri, consilieri, Poliție, Jandarmerie): raportul de evaluare pentru România a fost publicat pe 7 septembrie 2023 — [eucrim](https://eucrim.eu/news/greco-fifth-round-evaluation-report-on-romania/); vizita de evaluare a avut loc la București, 31.10–04.11.2022 — [coe.int/greco](https://www.coe.int/web/greco/-/5th-round-evaluation-visit-to-romania-bucharest-31-october-4-november-2022-).
- Raportul de conformitate, adoptat la plenara 100 (iunie 2025) și publicat în august 2025, arată că România a implementat integral doar 2 din 26 de recomandări. Autoritățile trebuie să raporteze până la 31.12.2026 — [Romania Insider](https://www.romania-insider.com/romania-greco-report-august-2025); [bursa.ro](https://www.bursa.ro/greco-warns-romania-has-implemented-only-two-of-the-26-anti-corruption-recommendations-49255652).
- Listele de decizii ale plenarelor GRECO sunt pe rm.coe.int, de ex. [GRECO 92](https://rm.coe.int/greco-92-list-of-decisions/1680a947fa) și [GRECO 97](https://rm.coe.int/greco-97-decisions/1680b08995).
- Comisia de la Veneția: pagina de avize pe țări (`https://www.venice.coe.int/webforms/documents/by_opinion.aspx?lang=EN&country=36`) a răspuns cu `HTTP 502` la încercarea de acces. Nu am putut verifica lista avizelor privind România — [venice.coe.int](https://www.venice.coe.int/webforms/documents/by_opinion.aspx?lang=EN&country=36).

### Inferences
- Pattern-ul uzual al documentelor Veneția este `https://www.venice.coe.int/webforms/documents/default.aspx?pdffile=CDL-AD(AAAA)NNN-e`. Este cunoscut din practică, dar **neverificat** aici. Un adaptor ar putea menține o listă statică de avize privind România (legile justiției, codurile penale, referendum etc.), actualizată manual sau prin scraping prudent al paginii pe țară.
- Rapoartele GRECO sunt de regulă și în franceză. Traduceri în română ale rapoartelor GRECO există uneori (publicate de MJ), dar acest lucru este **neverificat**.

### Gaps
- Nu am obținut lista avizelor Comisiei de la Veneția privind România (502 la acces). Nu am verificat nici traducerile lor în română și nici termenii de reutilizare de pe venice.coe.int și rm.coe.int.
- Nu am verificat dacă GRECO sau Veneția au feed-uri RSS ori o bază interogabilă.

---

## 6. Valoarea juridică pentru practica din România (CJUE, CEDO)

### Takeaway
Hotărârile CEDO sunt obligatorii pentru statul pârât (art. 46 CEDO). În dreptul intern, Convenția are prioritate față de legile interne contrare (art. 20 alin. (2) din Constituție). Hotărârile CJUE pronunțate în procedura preliminară (art. 267 TFUE) leagă instanța de trimitere și, în practică, toate instanțele naționale care aplică aceeași normă. Dreptul UE are prioritate potrivit art. 148 din Constituție. Pentru LexAI, ambele categorii trebuie tratate ca jurisprudență cu valoare normativă ridicată, nu ca simplă doctrină.

### Cited Findings
- Art. 46 § 1 CEDO: Înaltele Părți Contractante se angajează să se conformeze hotărârilor definitive ale Curții în litigiile în care sunt părți. Comitetul Miniștrilor supraveghează executarea (§ 2) — [Convenția (text oficial, echr.coe.int)](https://www.echr.coe.int/documents/d/echr/convention_ENG).
- Art. 20 din Constituția României: dispozițiile constituționale privind drepturile și libertățile se interpretează și se aplică în concordanță cu DUDO și cu tratatele la care România este parte (alin. 1). În caz de neconcordanță, au prioritate reglementările internaționale, cu excepția dispozițiilor interne mai favorabile (alin. 2). Art. 148 alin. (2) consacră prioritatea tratatelor constitutive UE și a reglementărilor obligatorii ale UE față de legile interne contrare — [Constituția României, cdep.ro](https://www.cdep.ro/pls/dic/site.page?id=339).
- Art. 267 TFUE (trimiterea preliminară) — [TFUE versiune consolidată, EUR-Lex CELEX 12016E267](https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:12016E/TXT) (URL nedeschis din cauza WAF).
- Contestarea hotărârilor CEDO și căile de atac se exercită de Agentul guvernamental, cu aprobarea ministrului afacerilor externe (art. 9 din OG 94/1999, citat în presă) — [wall-street.ro](https://www.wall-street.ro/articol/Justitie/258923/guvernul-nu-contesta-hotararea-cedo-in-cazul-kovesi.html).
- Publicarea în M.Of. a hotărârilor CEDO contra României se face la cererea Agentului guvernamental sau a reclamantului (OUG 48/2008) — [legeaz.net](https://legeaz.net/text-integral/oug-48-2008-modificare-completare-og-94-1999).

### Inferences
- În dreptul procesual român există căi de revizuire întemeiate pe hotărâri CEDO: art. 509 alin. (1) pct. 10 CPC și art. 465 CPP. În contencios administrativ există o revizuire legată de dreptul UE (art. 21 alin. (2) din Legea 554/2004, cu istoric de control constituțional). Aceste texte sunt **neverificate în această sesiune** și ar trebui confirmate prin adaptorul legislativ intern (legislatie.just.ro). Ele justifică marcarea în LexAI a hotărârilor CEDO contra României ca „deschid cale de revizuire”.
- Ierarhizare utilă pentru UI: (1) hotărâri CJUE preliminare pe trimiteri românești și hotărâri CEDO contra României (efect direct asupra cauzelor/statului); (2) hotărâri ale Marii Camere CEDO și hotărâri CJUE de principiu (efect interpretativ erga omnes); (3) decizii de inadmisibilitate și concluzii AG (valoare persuasivă). Câmpul `importance` din HUDOC (1 = key case … 4) poate alimenta această ierarhizare.

### Gaps
- Nu am verificat în această sesiune textul actual al art. 509 CPC, art. 465 CPP și art. 21 din Legea 554/2004, nici jurisprudența CCR sau ÎCCJ privind efectul hotărârilor CEDO și CJUE.

---

## 7. Dificultăți practice de integrare și maparea pe interfața de adaptor LexAI

### Takeaway
Arhitectura propusă are două adaptoare. **`hudoc`** folosește endpoint-ul JSON neoficial, cu cache, throttling și flag de licență. **`cjue_cellar`** folosește SPARQL plus REST, fără cheie, și este robust. Dificultățile principale sunt: API HUDOC neoficial și licență comercială restrictivă; WAF pe EUR-Lex; formate variabile în CELLAR (html/xhtml/pdf); expresii duplicate; traduceri RO neoficiale (CEDO) sau provizorii (CJUE, „Ediție provizorie”).

### Cited Findings
- WAF EUR-Lex (202 + challenge) — **[TESTAT 2026-11-01]**, vezi secțiunea 3.
- HUDOC: 404 fără `sort`, cod de limbă `RUM` și nu `RON`, corp gol pentru unele traduceri prin conversia docx/html — **[TESTAT 2026-11-01]**, vezi secțiunea 1.
- CELLAR: unele documente răspund doar la `text/html`, altele doar la `application/xhtml+xml`. Mai multe expresii RON pot exista pentru aceeași operă — **[TESTAT 2026-11-01]**, vezi secțiunea 3.
- Textul CJUE descărcat poate fi „Ediție provizorie”. Versiunea autentică este cea din Repertoriu sau JO — [curia avertissement](https://curia.europa.eu/common/juris/en/avertissement.html); text RO observat **[TESTAT 2026-11-01]**.
- HUDOC: traducerile sunt „for information purposes only”. Uz comercial = permisiune scrisă prealabilă — [HUDOC FAQ](https://prd-echr.coe.int/documents/d/echr/HUDOC_FAQ_ENG); [ECHR Copyright](https://www.echr.coe.int/copyright-and-disclaimer).

### Inferences
Maparea pe capabilitățile adaptorului LexAI:

| Capabilitate | Adaptor `hudoc` | Adaptor `cjue_cellar` |
|---|---|---|
| `cauta_decizii` | `app/query/results` cu `query=contentsitename:ECHR AND (respondent="ROU") AND (languageisocode="RUM"\|"ENG"\|"FRE") AND <termeni>`, `select=itemid,docname,appno,ecli,kpdate,importance,doctype,languageisocode`, `sort=kpdate Descending`, paginare cu `start`/`length` | SPARQL: filtru CELEX `^6\d{4}(CJ\|TJ\|CC\|CO)`, ECLI, dată, limbă RON. Full-text: index local sau SOAP `doQuery` (cont EUR-Lex) |
| `citeste_decizie` | `app/conversion/docx/html/body?library=ECHR&id={itemid}`; fallback `app/conversion/pdf/?library=ECHR&id={itemid}`. Afișare paralelă RO (neoficial) și EN/FR (autentic) | REST `http://publications.europa.eu/resource/celex/{CELEX}` sau `/resource/ecli/{ECLI}`, `Accept-Language: ron`, încercare xhtml → html → pdf |
| `citeste_pagina` | link către `https://hudoc.echr.coe.int/eng?i={itemid}` (pattern uzual, neverificat aici) | link către InfoCuria sau EUR-Lex (pentru utilizator; nu pentru fetch server-side, din cauza WAF) |
| `info_act` / `cauta_act` / `citeste_articol` / `cauta_in_act` | Nu se aplică (doar Convenția și Protocoalele, care pot sta static) | Se aplică dacă adaptorul CELLAR acoperă și legislația UE (sector 3, 1); în afara scopului acestor note |

- Rezolvarea identificatorilor: un parser ECLI unic (`ECLI:CE:ECHR:…` → HUDOC prin `ecli="…"` în query; `ECLI:EU:C:…` → CELLAR `/resource/ecli/`) plus un parser de citări („C‑83/19”, „cererea nr. 64910/19”, „CELEX 62019CJ0083”).
- Ingestie: CELLAR, delta zilnică prin SPARQL. HUDOC, delta zilnică pe `kpdate` (sau pe data de publicare, dacă există un câmp; neverificat). Ambele cu cache local de text pentru RAG.
- Conformitate: până la obținerea permisiunii CEDO pentru uz comercial, textul HUDOC se servește la cerere, cu atribuire „ECHR-CEDH” și link la sursă, fără redistribuire în bulk.

### Gaps
- Nu am verificat pattern-ul de permalink HUDOC (`/eng?i=001-…`) și nici existența unui câmp de dată de publicare pentru delta-sync.
- Nu am testat SOAP-ul EUR-Lex end-to-end (necesită cont).
- Nu am măsurat latența și stabilitatea pe termen lung a endpoint-urilor (doar teste punctuale pe 1.11.2026).
