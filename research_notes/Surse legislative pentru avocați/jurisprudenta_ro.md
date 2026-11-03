# Surse de jurisprudență românească utilizabile programatic (stare la 1 noiembrie 2026)

> Metodă: căutări web plus verificări directe din terminal (curl, citirea robots.txt și a WSDL-ului) făcute pe 1.11.2026. Unde scrie „verificat direct” am citit pagina sau fișierul chiar în această sesiune. Sursele secundare (presă, bloguri) sunt marcate ca atare. Am respectat robots.txt: nu am citit conținut de pe csm1909.ro, care blochează explicit agenții Claude (vezi secțiunea CSM).

## 1. Curtea Constituțională (ccr.ro): baza de decizii, căutare, formate, legătura cu articolul atacat

### Takeaway
CCR nu are un API public. Deciziile de admitere sunt listate pe un site WordPress, ca fișiere PDF cu URL-uri previzibile. Motorul de căutare dedicat (ccrsearch.ccr.ro) și aplicația de dosare (dosare.ccr.ro) sunt aplicații separate, iar dosare.ccr.ro are protecție anti-bot (F5). Legătura cu articolul atacat se poate extrage din titlul standard al deciziei („referitoare la excepția/obiecția de neconstituționalitate a dispozițiilor art. …”). Sursa canonică rămâne publicarea în Monitorul Oficial, pe care LexAI o acoperă deja prin legislatie.just.ro.

### Cited Findings
- Pagina „Jurisprudență” de pe ccr.ro trimite la: motorul de căutare `http://ccrsearch.ccr.ro`, aplicația de dosare `https://dosare.ccr.ro/#/CautareDosare`, și listele „Decizii de admitere”, „Decizii relevante”, „Hotărâri de admitere”, „Hotărâri relevante” și „Avize consultative” (verificat direct) — [ccr.ro/jurisprudenta](https://www.ccr.ro/jurisprudenta/)
- Pagina „Decizii de admitere” are un filtru pe ani de la 1992 la 2026. Fiecare intrare trimite direct la un PDF cu tiparul `https://www.ccr.ro/wp-content/uploads/{AAAA}/{LL}/Decizie_{nr}_{AAAA}.pdf`. Exemplu: Decizia nr. 883 din 17 august 2026 → `.../2026/08/Decizie_883_2026.pdf`. Rezumatul intrării este începutul titlului standard: „referitoare la obiecția de neconstituționalitate a dispozițiilor art.II pct.2 [cu referire la art.2 alin.(6)] …”. Cele mai recente intrări văzute: DCC 883/2026, 876/2026, 840/2026, 836/2026 și 734/2026 (verificat direct) — [ccr.ro – Decizii de admitere](https://www.ccr.ro/jurisprudenta/jurisprudenta-decizii-de-admitere/)
- Lista folosește pluginul WordPress „Content Views” (clase `pt-cv-*`, câmp radio `anul_postului`), deci se poate parsa ca HTML static (verificat direct) — [ccr.ro – Decizii de admitere](https://www.ccr.ro/jurisprudenta/jurisprudenta-decizii-de-admitere/)
- API-ul REST WordPress (`/wp-json/wp/v2/...`) răspunde cu 401: „Access to REST API requests is restricted by Kadence Security settings” (verificat direct) — [ccr.ro/wp-json/wp/v2/types](https://www.ccr.ro/wp-json/wp/v2/types)
- robots.txt blochează doar `/wp-admin/` și declară sitemap-ul `https://www.ccr.ro/wp-sitemap.xml` (verificat direct) — [ccr.ro/robots.txt](https://www.ccr.ro/robots.txt)
- `dosare.ccr.ro` servește o pagină de provocare F5 BIG-IP ASM („TSPD”, `window["bobcmn"]`), adică o protecție anti-bot care cere execuție JavaScript (verificat direct) — [dosare.ccr.ro](https://dosare.ccr.ro/)
- `ccrsearch.ccr.ro` are DNS (213.177.9.214), dar nu a răspuns la conexiune din mediul de test. Poate fi restricționat geografic sau după IP; nu am putut verifica funcționalitatea (verificat direct) — [ccrsearch.ccr.ro](http://ccrsearch.ccr.ro)
- CCR pronunță decizii, hotărâri și avize (art. 11 alin. 1 din Legea nr. 47/1992) — [cotidianul.ro](https://www.cotidianul.ro/deciziile-ccr-se-executa-nu-se-discuta/) (sursă secundară)

### Inferences
- Pentru LexAI, adaptorul existent (deciziile CCR publicate în MO, preluate prin legislatie.just.ro) rămâne sursa primară, cu valoare oficială. ccr.ro poate fi un al doilea canal, mai rapid pentru deciziile de admitere: PDF-ul apare pe ccr.ro înainte de publicarea în MO. Exemplu: decizia din 17.08.2026 era deja listată.
- Etichetarea „admitere” vs. „respingere” nu este un câmp structurat. Ea rezultă din lista în care apare decizia (pagina „Decizii de admitere”) și din dispozitiv („Admite excepția…”, „constată că… este neconstituțional”). Deciziile interpretative se recunosc după formula din dispozitiv „…este constituțional în măsura în care…”. Le va detecta un parser de dispozitiv, nu un câmp de metadate.
- Legătura decizie → articol: din titlul standard se extrag cu regex perechile (articol, alineat, act). Acesta este exact filtrul pe care îl are deja `cauta_decizii`.
- Un crawler pentru lista de admiteri și pentru PDF-uri nu încalcă robots.txt. Pentru dosare.ccr.ro e nevoie de un browser headless, iar ocolirea protecției anti-bot nu este recomandată.

### Gaps
- Nu am putut accesa ccrsearch.ccr.ro: lipsesc câmpurile de căutare, formatele (HTML/PDF), eventualele endpoint-uri JSON și acoperirea pe ani.
- Nu am găsit termeni de utilizare sau o licență pentru conținutul ccr.ro.
- Temeiul obligativității (art. 147 alin. (4) din Constituție, art. 31 din Legea 47/1992) nu a fost verificat cu o sursă în această sesiune.

## 2. Înalta Curte de Casație și Justiție (scj.ro): RIL, HP, motorul de jurisprudență, ședințe, dosare

### Takeaway
scj.ro are trei module publice: „Căutare jurisprudență” (/736), „Căutare ședințe de judecată” (/737) și „Căutare dosare şi părţi” (/738). Toate se interoghează prin parametri GET de forma `customQuery[i].Key/Value`. Nu am găsit un API documentat. robots.txt exclude explicit endpoint-urile de descărcare a PDF-urilor și de listare a părților.

### Cited Findings
- Meniul scj.ro include `/736/Cautare-jurisprudenta`, `/737/Cautare-sedinte-de-judecata` (cu link-uri pe zile, de exemplu `?customQuery[0].Key=StartDate&customQuery[0].Value=10.11.2026 00:00:00`), `/738/Cautare-dosare-si-parti` și `/1258/Jurisprudenta` (verificat direct) — [scj.ro](https://www.scj.ro/)
- Formularul de căutare a jurisprudenței expune cheile `DocumentType`, `Department` (Secție), `Keyword`/`Keywords` (cuvinte în text, cu operator `AndOr` și/sau), `MatterType` (Materie), `DecisionNumber`, `DecisionDate`, `DecisionYear`, `DocketNumber`, `DocketYear`, `UniqueDocketNumber`, `PublishedInMofNr`, `PublishedInMofDate`, `Language` (RO/EN) și `SolutionType` (Admis/Respins). Are și un tezaur de cuvinte-cheie cu ID-uri numerice, de exemplu „Abuz în serviciu” = 10 și „Coparticipare procesuală” = 1006 (verificat direct) — [scj.ro/736/Cautare-jurisprudenta](https://www.scj.ro/736/Cautare-jurisprudenta)
- robots.txt interzice `/home/downloadpdfrequest`, `/home/getsessionsforyear`, `/home/getwebpartfull`, `/CMS/0/publicmedia/getincludedfile`, `/home/getpartiesfordocket`, `/home/getpage` și `/home/getnewspage` (plus variantele /en și /fr) (verificat direct) — [scj.ro/robots.txt](https://www.scj.ro/robots.txt)
- În decembrie 2021, ÎCCJ a lansat un nou motor de căutare a jurisprudenței, pe o platformă adiacentă site-ului oficial — [Agerpres, 24.12.2021](https://agerpres.ro/justitie/2021/12/24/iccj-lanseaza-noul-motor-de-cautare-a-jurisprudentei-pe-platforma-adiacenta-site-ului-sau-oficial--837332)
- Dosarele de hotărâre prealabilă au număr de forma „1/1/2014/HP” — [legeaz.net – Decizia RIL 3/2014](https://legeaz.net/monitorul-oficial-437-2014/decizia-iccj-ril-3) (agregator)
- O hotărâre prealabilă nu poate fi dată dacă problema face deja obiectul unui RIL în curs. scj.ro publică și un ghid pentru sesizările în materie penală — [Universul Juridic, D. Grădinaru](https://revista.universuljuridic.ro/wp-content/uploads/2019/10/04_Revista_Universul_Juridic_nr_8-2019_PAGINAT_BT_D_Gradinaru.pdf)

### Inferences
- Câmpurile `PublishedInMofNr`/`PublishedInMofDate` permit legarea directă a unei decizii ÎCCJ (RIL/HP) de publicarea ei în MO, deci de adaptorul existent pentru legislatie.just.ro. `UniqueDocketNumber` permite urmărirea sesizărilor în curs (HP și RIL) înainte de pronunțare, prin modulul de dosare /738 și prin termenele din /737.
- Pentru „minute” (dispozitivul pronunțat, nepublicat încă în MO), calea probabilă este modulul de dosare sau de ședințe, care afișează soluția. Nu am verificat însă direct afișarea minutelor HP/RIL.
- PDF-urile sunt servite prin `/home/downloadpdfrequest`, care este interzis în robots.txt. Un adaptor care respectă robots.txt ar trebui să extragă textul din paginile HTML ale deciziilor, nu din PDF.

### Gaps
- Nu am verificat pagini dedicate pentru „Recursuri în interesul legii în curs de soluționare”, „Sesizări HP în curs” sau „Buletinul Casației”, nici dacă acestea mai sunt publicate online.
- Nu am găsit niciun serviciu web (SOAP/REST) public al ÎCCJ și nici termeni de utilizare. Dosarele ÎCCJ nu apar în enumerarea `Institutie` din PortalWS (vezi secțiunea 5); de verificat dacă există o valoare pentru ÎCCJ.
- Obligativitatea RIL (art. 517 alin. (4) CPC) și HP (art. 521 alin. (3) CPC), precum și echivalentele din CPP, nu au fost confirmate cu o sursă în această sesiune.

## 3. ReJust (rejust.ro, CSM): baza anonimizată a hotărârilor tuturor instanțelor

### Takeaway
ReJust este portalul gratuit al CSM, cu peste 26 de milioane de hotărâri anonimizate (cifra din 2021; surse mai noi indică peste 35 de milioane). Tehnic, este o aplicație Blazor WebAssembly protejată de Cloudflare Turnstile (CAPTCHA), cu token anti-falsificare și un script de „criptare” la client. Nu există API public, export în masă sau date deschise, iar scraping-ul este practic blocat.

### Cited Findings
- Pagina rejust.ro încarcă `_framework/blazor.webassembly.js` (Blazor WASM), `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit` (CAPTCHA Cloudflare Turnstile), `antiForgeryToken.js` și `/js/encryption.js`. HTML-ul nu conține date, doar „Loading...”. Nu există robots.txt (404) (verificat direct) — [rejust.ro](https://www.rejust.ro/)
- CSM a lansat ReJust ca aplicație gratuită pentru hotărârile judecătoriilor, tribunalelor și curților de apel, cu acces personalizat. Baza avea peste 26 de milioane de hotărâri și încheieri, iar judecătorii urmau să primească acces la numărul dosarului și apoi la jurisprudența neanonimizată — [Agerpres, 26.11.2021](https://agerpres.ro/justitie/2021/11/26/csm-aplicatie-gratuita-pentru-acces-mai-facil-la-hotararile-instantelor-de-judecata--822408); [Newsweek](https://newsweek.ro/justitie/csm-a-lansat-rejust-o-aplicatie-pentru-acces-mai-facil-la-hotararile-instantelor-de-judecata)
- ReJust ar avea peste 35 de milioane de hotărâri și încheieri — [incorpo.ro](https://www.incorpo.ro/en-US/blog/differences-between-rolii-and-rejust-which-platform-to-choose) (blog comercial, sursă slabă)
- Un ghid din 2026 descrie platforma ca funcțională, cu acces gratuit pentru cetățeni la hotărâri și la unele servicii electronice ale instanțelor — [e-juridic.manager.ro](https://e-juridic.manager.ro/articole/ce-este-rejust-si-cum-poti-folosi-portalul-instantelor-online-30416.html)
- Un document CSM din 2025 privește accesul la portalul de jurisprudență ReJust (nu am citit conținutul, pentru că csm1909.ro blochează agenții Claude în robots.txt) — [csm1909.ro/files/6aa33022-…](https://www.csm1909.ro/files/6aa33022-7089-4dcb-a17a-55799a7190d7?download=1)
- Calitatea anonimizării a fost analizată critic într-o evaluare din 2024. Atenție: raportul CRJM pare să vizeze Republica Moldova, nu România — [CRJM, 2024](https://crjm.org/wp-content/uploads/2025/03/2024-12-Evaluarea-modului-de-anonimizare-a-hotararilor-judecatoresti_RO-fin.pdf)

### Inferences
- Integrarea automată cu ReJust nu este fezabilă în mod legitim: Turnstile este anti-bot prin design, iar ocolirea lui ar încălca regulile LexAI. Opțiunea realistă este un acord instituțional (protocol cu CSM pentru acces API sau export), sau un flux „human-in-the-loop” în care avocatul caută în ReJust și încarcă hotărârea în LexAI, care o citește cu `citeste_decizie`.
- Chiar anonimizate, hotărârile pot conține date personale reziduale. LexAI ar trebui să trateze textul încărcat ca date personale (GDPR art. 6/10 pentru date penale) și să nu-l reindexeze public.

### Gaps
- Termenii de utilizare ReJust, condițiile de înregistrare (cont obligatoriu sau nu), limitele de interogare și acoperirea exactă pe ani și instanțe nu au putut fi citite, pentru că pagina este SPA, iar documentele CSM sunt pe un domeniu care blochează agenții Claude.
- Nu am găsit date deschise sau un export în masă ReJust (de exemplu pe data.gov.ro).

## 4. ROLII (rolii.ro): stare, acoperire, acces

### Takeaway
ROLII („Portalul de jurisprudență românească”) a fost lansat în jurul anului 2015, cu circa 2 milioane de hotărâri, și administrat de o fundație. La 1.11.2026, domeniul rolii.ro are încă DNS, dar serverul nu răspunde la conexiuni HTTP/HTTPS. Pentru un adaptor nou trebuie considerat inactiv sau nesigur.

### Cited Findings
- rolii.ro și www.rolii.ro se rezolvă la 85.120.166.210, dar conexiunile HTTP și HTTPS au eșuat (cod 000 sau timeout) la testul din 1.11.2026 (verificat direct) — [rolii.ro](https://rolii.ro/)
- La lansare, portalul avea peste 2 milioane de hotărâri publicate pe internet — [alba24.ro](https://alba24.ro/a-fost-lansat-portalul-de-jurisprudenta-romaneasca-peste-2-milioane-de-hotarari-judecatoresti-publicate-pe-internet-458293.html); istoric „De la Jurindex la ROLII” — [UNBR (PDF)](https://unbr.ro/wp-content/uploads/2015/12/articol-pt-link_Portalul-national-de-jurisprudenta-De-la-Jurindex-la-ROLII-1.pdf); specificațiile proiectului — [UNBR (PDF)](https://unbr.ro/wp-content/uploads/2014/06/Specificatii-detaliate-proiect-RoLII-v1-1.pdf)
- În 2022, fundația ROLII întreținea gratuit portalul, iar ReJust era descris ca platformă complementară — [Wolters Kluwer, 2022](https://www.wolterskluwer.com/ro-ro/expert-insights/transparenta-deciziilor-judecatoresti)
- Pagina e-Justice despre ECLI (2020) încă trimitea la ROLII ca bază anonimizată „în dezvoltare” — [e-Justice ECLI România](https://e-justice.europa.eu/topics/legislation-and-case-law/european-case-law-identifier-ecli/ro_en)
- Curtea de Apel București încă are în meniu o secțiune „Jurisprudenţă naţională şi europeană” la `/jurisprudenta/rolli/` (verificat direct) — [cab1864.eu](https://www.cab1864.eu/)

### Inferences
- Probabil ROLII a fost înlocuit de facto de ReJust. Nu am găsit însă un anunț oficial de închidere, deci verdictul „inactiv” se bazează doar pe testul tehnic.

### Gaps
- Nu am găsit un anunț oficial de închidere sau o arhivă (bulk) a datelor ROLII.

## 5. Portalul instanțelor (portal.just.ro) și serviciul SOAP PortalWS (portalquery.just.ro)

### Takeaway
Serviciul SOAP `http://portalquery.just.ro/query.asmx` este public, fără autentificare în WSDL, și expune `CautareDosare`, `CautareDosare2` (cu filtru pe data ultimei modificări) și `CautareSedinte`. Returnează părți, ședințe, soluție și „soluție pe scurt”, număr și dată document, plus căi de atac, pentru 246 de instanțe. Nu returnează textul hotărârii. Site-ul portal.just.ro este în spatele Cloudflare: răspunde 403 la clienți ne-browser și interzice explicit ClaudeBot și alți boți AI în robots.txt.

### Cited Findings
- WSDL-ul (`http://portalquery.just.ro/query.asmx?WSDL`, namespace `portalquery.just.ro`, aproximativ 90 KB) definește operațiile `CautareDosare`, `CautareDosare2`, `CautareSedinte` și `HelloWorld` (verificat direct) — [WSDL PortalWS](http://portalquery.just.ro/query.asmx?WSDL)
  - `CautareDosare(numarDosar, obiectDosar, numeParte, institutie, dataStart, dataStop)`
  - `CautareDosare2(... aceiași parametri ..., dataUltimaModificareStart, dataUltimaModificareStop)`
  - `CautareSedinte(dataSedinta, institutie)`
  - `Dosar`: `numar`, `numarVechi`, `data`, `institutie`, `departament`, `categorieCaz`/`categorieCazNume`, `stadiuProcesual`/`stadiuProcesualNume`, `obiect`, `dataModificare`, `parti[]`, `sedinte[]`, `caiAtac[]`
  - `DosarParte`: `nume`, `calitateParte`
  - `DosarSedinta`: `complet`, `data`, `ora`, `solutie`, `solutieSumar`, `dataPronuntare`, `documentSedinta` (enum), `numarDocument`, `dataDocument`
  - `DosarCaleAtac`: `dataDeclarare`, `parteDeclaratoare`, `tipCaleAtac`
  - `Sedinta`: `departament`, `complet`, `data`, `ora`, `dosare[]`
  - enumerarea `Institutie` are 246 de valori, de exemplu `CurteadeApelBUCURESTI`, `TribunalulBUCURESTI`, `JudecatoriaSECTORUL4BUCURESTI`
- robots.txt pentru portal.just.ro, gestionat de Cloudflare, are „Content-Signal: search=yes, ai-train=no, use=reference” pentru `*`, interzice complet ClaudeBot, anthropic-ai, Claude-Web, GPTBot, CCBot, Google-Extended etc., și declară că restricțiile sunt rezerve de drepturi conform art. 4 din Directiva (UE) 2019/790 (verificat direct) — [portal.just.ro/robots.txt](https://portal.just.ro/robots.txt)
- `https://portal.just.ro/2/SitePages/acasa.aspx` răspunde 403 la curl (verificat direct) — [portal.just.ro](https://portal.just.ro/2/SitePages/acasa.aspx)
- Există clienți open-source: un gist Ruby (Savon) care iterează pe instanțe și intervale de date și salvează CSV — [gist baditaflorin](https://gist.github.com/baditaflorin/eedac2a2c5fcbb82a865); un SDK PHP generat cu wsdltophp — [packagist adrian-marinescu-ch/portal-just-romania](https://packagist.org/packages/adrian-marinescu-ch/portal-just-romania)
- Limita de 1000 de rezultate pe interogare este afirmată de un actor Apify comercial; neconfirmat oficial — [Apify apnoda/portal-just](https://apify.com/apnoda/portal-just.md)
- Curtea de Apel București trimite pentru jurisprudența proprie către `http://portal.just.ro/2/SitePages/jurisprudenta.aspx?id_inst=2` (verificat direct) — [cab1864.eu](https://www.cab1864.eu/)

### Inferences
- Pentru un avocat, PortalWS servește la urmărirea dosarelor (termene, soluții pe scurt, căi de atac) și la verificarea dacă o hotărâre citată a rămas definitivă. Nu este o sursă de jurisprudență în text integral. Adaptorul sugerat este `urmareste_dosar(numar)` / `sedinte(instanta, data)`, cu cache și cu `CautareDosare2` pe `dataUltimaModificare` pentru sincronizare incrementală.
- Câmpul `numeParte` conține date personale (părți persoane fizice). Folosirea lor într-un produs comercial cere un temei GDPR (de exemplu interesul legitim al avocatului pentru propriile dosare) și minimizarea datelor: fără indexare pe nume, fără profilare.
- Endpoint-ul SOAP este pe alt host (portalquery.just.ro), fără Cloudflare la testul din 1.11.2026. Semnalele din robots.txt ale portal.just.ro (ai-train=no) arată însă intenția operatorului. Recomandare: folosire „use=reference” la cererea utilizatorului, fără antrenare de modele.

### Gaps
- Nu am găsit documentație oficială, condiții de utilizare, rate limits sau o procedură de înregistrare pentru PortalWS (WSDL-ul nu cere autentificare).
- Nu am verificat dacă ÎCCJ apare în enumerarea `Institutie` (am văzut doar primele 15 valori).

## 6. CSM (csm1909.ro), INM (inm-lex.ro) și Jurindex: unificarea practicii

### Takeaway
INM publică „Repertoriul problemelor de practică neunitară”, ca PDF-uri pe materii, cu trimiteri la minutele întâlnirilor de unificare (actualizat până în ianuarie 2026). Reutilizarea lui cere însă acordul scris al INM. Jurindex mai are doar un domeniu fără conținut util. csm1909.ro interzice explicit agenții AI în robots.txt.

### Cited Findings
- Pagina INM „Repertoriu probleme de practică neunitară” (februarie 2026) conține problemele de drept discutate la întâlnirile președinților de secții, grupate pe materii și instituții. Pentru fiecare problemă indică întâlnirea, link către minută (pe site-ul INM) și pagina din minută. Precizează că reproducerea și utilizarea în alt scop decât formarea sau unificarea practicii judiciare se pot face numai cu acordul scris prealabil al INM (verificat direct) — [inm-lex.ro – Repertoriu](https://inm-lex.ro/repertoriu-probleme-de-practica-neunitara/)
- Fișiere disponibile (verificat direct):
  - [Repertoriu drept civil](https://inm-lex.ro/wp-content/uploads/2025/11/Repertoriu-drept-civil.pdf)
  - [Drept procesual civil (ZIP)](https://inm-lex.ro/wp-content/uploads/2025/11/Drept-procesual-civil.zip)
  - [Drept penal, ianuarie 2026](https://inm-lex.ro/wp-content/uploads/2026/01/Repertoriu-drept-penal-actualizat-ianuarie-2026.pdf)
  - [Procesual penal, partea I](https://inm-lex.ro/wp-content/uploads/2025/11/Repertoriu-drept-procesual-penal-actualizat-ianuarie-2026-partea-I.pdf)
  - [Procesual penal, partea a II-a](https://inm-lex.ro/wp-content/uploads/2025/11/Repertoriu-drept-procesual-penal-actualizat-ianuarie-2026-partea-a-II-a.pdf)
  - [Contencios administrativ și fiscal (SCAF), octombrie 2025](https://inm-lex.ro/wp-content/uploads/2025/11/Repertoriu-SCAF-actualizat-octombrie-2025-1.pdf)
  - [Litigii cu profesioniști și insolvență](https://inm-lex.ro/wp-content/uploads/2022/02/Repertoriu-litigii-cu-profesionisti-si-insolventa.pdf)
- Meniul INM include „Unificare Practică Judiciară”, cu subsecțiuni pe materii: contencios, civil, penal, profesioniști și insolvență, muncă (verificat direct) — [inm-lex.ro](https://inm-lex.ro/repertoriu-probleme-de-practica-neunitara/)
- robots.txt INM interzice doar căi administrative (`/DOC/`, `/form/`, `/wp-admin` etc.) și declară sitemap-ul `http://inm-lex.ro/sitemap.xml` (verificat direct) — [inm-lex.ro/robots.txt](https://www.inm-lex.ro/robots.txt)
- robots.txt csm1909.ro interzice complet GPTBot, ClaudeBot, Claude-User, Claude-SearchBot, anthropic-ai, CCBot, PerplexityBot, Google-Extended etc. și are un `/verify-human` (verificat direct) — [csm1909.ro/robots.txt](https://www.csm1909.ro/robots.txt)
- jurindex.ro răspunde 200, dar pagina nu are practic conținut, doar titlul „jurindex.ro” (verificat direct) — [jurindex.ro](http://www.jurindex.ro/). Conținutul istoric Jurindex (hotărâri culese din practica secțiilor civile ale curților de apel) circulă prin agregatori — [legeaz.net – Jurindex](https://legeaz.net/spete-civil-jurindex/pagina-1140)

### Inferences
- Repertoriul INM este cel mai bun index structurat al practicii neunitare. Un adaptor `cauta_practica_neunitara(materie, cuvinte)` ar putea indexa local PDF-urile, dar numai după obținerea acordului scris al INM, cerut explicit pe pagină. Fără acord: doar trimitere (link) către PDF.
- Minutele întâlnirilor de unificare au valoare informativă, nu obligatorie. Arată însă soluțiile majoritare și sunt utile pentru argumentare.
- Materialele CSM nu pot fi preluate de un agent Claude fără încălcarea robots.txt. Rămâne accesul uman sau un acord cu CSM.

### Gaps
- Nu am verificat lista exactă a minutelor CSM sau INM pe ani și nici URL-urile lor, pentru că csm1909.ro este blocat agenților și nu am parcurs subpaginile INM.

## 7. Curțile de apel: jurisprudență proprie și buletine

### Takeaway
Curțile de apel publică jurisprudență proprie pe site-uri separate: buletine de jurisprudență și decizii relevante, de regulă în PDF. Curtea de Apel București (cab1864.eu) are secțiunile „Decizii relevante” și „Buletin de jurisprudenţă” și trimite și la pagina de jurisprudență de pe portal.just.ro.

### Cited Findings
- Meniul cab1864.eu are: „Jurisprudență C.A. București (portal)” → `http://portal.just.ro/2/SitePages/jurisprudenta.aspx?id_inst=2`, „Decizii relevante” → `https://www.cab1864.eu/jurisprudenta/decizii-relevante/`, „Buletin de jurisprudenţă” → `https://www.cab1864.eu/jurisprudenta/buletin-de-jurisprudenta/` și „Jurisprudenţă naţională şi europeană” → `/jurisprudenta/rolli/`. Documentele sunt sub `/wp-content/uploads/AAAA/LL/*.pdf` (verificat direct) — [cab1864.eu](https://www.cab1864.eu/)
- O modificare legislativă cere curților de apel să întocmească trimestrial Buletinul jurisprudenței cu deciziile relevante — [avocatnet.ro](https://www.avocatnet.ro/articol_7665/Hotarare-privind-masurile-pentru-unificarea-practicii-judiciare.html) (sursă secundară)
- Există și culegeri tipărite de practică judiciară ale curților de apel, de exemplu C.A. Brașov 2006 — [Hamangiu (cuprins)](https://www.hamangiu.ro/upload/cuprins_extras/curtea-de-apel-brasov-culegere-de-practica-judiciara-in-materie-penala-pe-anul-2006_cuprins.pdf)

### Inferences
- Fiecare curte de apel are un CMS propriu (cab1864.eu este WordPress). Un adaptor generic ar avea nevoie de o configurație pe curte (URL listă + parser PDF). Valoarea juridică este informativă.

### Gaps
- Nu am verificat conținutul și frecvența buletinelor C.A. București și nici site-urile celorlalte 14 curți de apel.

## 8. Curtea de Conturi și CNSC (achiziții publice)

### Takeaway
CNSC publică deciziile ca PDF-uri cu URL-uri previzibile pe cnsc.ro, plus secțiunile „Jurisprudență relevantă” și „Buletinul oficial” (decizii conform art. 279 alin. 4 din OUG 34/2006). portal.cnsc.ro este o aplicație ASP.NET WebForms. Curtea de Conturi a răspuns 403 la testul automat.

### Cited Findings
- cnsc.ro, accesibil doar pe HTTP (HTTPS a eșuat la test), are: `/decizii/`, `/decizii/decizii-referitoare-la-suspendarea-procedurii/`, `/jurisprudenta-relevanta/`, `/buletinul-oficial/decizii-conform-art-279-alin-4-din-oug-nr-342006-modificata-si-completata/` și link către `http://portal.cnsc.ro` (verificat direct) — [cnsc.ro](http://www.cnsc.ro/)
- Pagina `/decizii/` listează PDF-uri cu tiparul `/wp-content/uploads/decizii/decizii-{AAAA}/decizie-{nr}.pdf`, de exemplu `decizii-2015/decizie-2208.pdf` (verificat direct) — [cnsc.ro/decizii](http://www.cnsc.ro/decizii/)
- portal.cnsc.ro („Acasă - CNSC”) este o aplicație ASP.NET WebForms (`__doPostBack`, ScriptManager), deci interogarea automată cere gestionarea ViewState (verificat direct) — [portal.cnsc.ro](http://portal.cnsc.ro/)
- INM și CNSC au un protocol de colaborare — [e-juridic](https://e-juridic.manager.ro/articole/protocolul-de-colaborare-intre-inm-si-consiliul-national-de-solutionare-a-contestatiilor-22471.html)
- curteadeconturi.ro a răspuns 403 la un client ne-browser (verificat direct) — [curteadeconturi.ro](https://www.curteadeconturi.ro/)

### Inferences
- CNSC este un candidat bun pentru un adaptor dedicat achizițiilor: PDF-uri cu tipar numeric, deci crawl secvențial cu rată mică. Deciziile CNSC sunt acte jurisdicționale administrative, cu valoare informativă pentru alte cauze. Controlul lor se face la curțile de apel.
- Pagina listată pare să conțină arhive vechi (2015). Deciziile curente sunt probabil pe portal.cnsc.ro, ceea ce trebuie verificat.

### Gaps
- Nu am verificat acoperirea pe ani a portal.cnsc.ro, filtrele (CPV, autoritate, soluție), anonimizarea deciziilor CNSC și termenii de utilizare.
- Nu am date despre jurisprudența Curții de Conturi (după reforma secțiilor jurisdicționale, controlul se face la instanțele de contencios); robots.txt nu a putut fi citit.

## 9. Integrare practică: ECLI, anonimizare, anti-bot, limite, identificatori stabili, temei legal

### Takeaway
România a adoptat ECLI în 2015, atribuit automat prin ECRIS (de exemplu `ECLI:RO:JDS4B:2017:001.004053`), dar nu există un punct public de căutare după ECLI. Cheile stabile practice sunt: numărul unic de dosar (PortalWS, scj.ro), numărul și anul deciziei plus numărul și data MO (scj.ro, CCR) și URL-urile PDF (CCR, CNSC). Barierele anti-bot sunt: Cloudflare Turnstile la ReJust, Cloudflare plus robots anti-AI la portal.just.ro, F5 TSPD la dosare.ccr.ro, robots anti-AI la csm1909.ro.

### Cited Findings
- ECLI în România: coordonator național este Ministerul Justiției, codul de țară RO, adoptat de instanțe la sfârșitul lui 2015 și atribuit automat prin ECRIS hotărârilor din 2007 încoace. Structura este cod instanță + an + număr; exemplu `ECLI:RO:JDS4B:2017:001.004053`. O versiune a paginii spune că nu există o bază națională conectată la motorul de căutare ECLI, alta trimite la ROLII ca fiind „în dezvoltare” — [e-Justice ECLI România](https://e-justice.europa.eu/topics/legislation-and-case-law/european-case-law-identifier-ecli/ro_en); [PDF export](https://e-justice.europa.eu/pdf-export/2713_en)
- Pagina e-Justice despre jurisprudența națională nu listează nicio bază românească (ultima actualizare 04/11/2013) — [e-Justice national case law](https://e-justice.europa.eu/topics/legislation-and-case-law/national-case-law/ro_en)
- Bariere tehnice (verificat direct): ReJust are Cloudflare Turnstile — [rejust.ro](https://www.rejust.ro/); portal.just.ro răspunde 403 și are robots cu ClaudeBot interzis — [robots](https://portal.just.ro/robots.txt); dosare.ccr.ro are F5 TSPD — [dosare.ccr.ro](https://dosare.ccr.ro/); CCR are REST WordPress restricționat — [wp-json](https://www.ccr.ro/wp-json/wp/v2/types); csm1909.ro blochează agenții AI — [robots](https://www.csm1909.ro/robots.txt); scj.ro interzice descărcarea PDF prin robots — [robots](https://www.scj.ro/robots.txt)

### Inferences
- Ordinea de prioritate recomandată pentru adaptoare LexAI:
  1. Varianta existentă MO/legislatie.just.ro, pentru CCR, RIL și HP (valoare obligatorie).
  2. Parsarea HTML a scj.ro /736, cu `PublishedInMofNr`, pentru RIL/HP și deciziile de speță ale ÎCCJ.
  3. Lista PDF „Decizii de admitere” de pe ccr.ro, pentru noutăți înainte de MO.
  4. PortalWS SOAP, pentru starea dosarelor și soluțiile pe scurt.
  5. CNSC (PDF) pentru achiziții.
  6. Repertoriul INM, doar ca link sau cu acord.
  7. ReJust, doar prin încărcare manuală de către utilizator sau printr-un acord CSM.
- Model de identificator intern: `{sursa}:{instanta}:{tip}:{nr}/{an}`, cu câmpuri opționale `ecli` și `mo_nr/mo_data`. ECLI poate fi construit doar acolo unde apare în textul hotărârii (generat de ECRIS).
- Rate limit: niciun site nu publică limite. Recomandat: cel mult 1 cerere pe secundă, cache agresiv, User-Agent identificabil și respectarea robots.txt. Pentru portal.just.ro și csm1909.ro, robots.txt exclude explicit agenții Claude.
- GDPR: textele hotărârilor de instanță (inclusiv din ReJust) și rezultatele PortalWS conțin date personale, chiar pseudonimizate. Hotărârile CCR și ÎCCJ (RIL/HP) publicate în MO sunt în mare parte fără date de identificare relevante. Pentru PortalWS: minimizare, fără căutare după nume terți, păstrare limitată.

### Gaps
- Nu am identificat articolul din Legea nr. 304/2022 privind organizarea judiciară (care a înlocuit Legea 304/2004) sau hotărârea CSM în vigoare care reglementează publicarea hotărârilor anonimizate. Căutările au întors doar surse din Republica Moldova. Rămâne de verificat pe legislatie.just.ro.
- Lista codurilor de instanță ECLI (PDF pe e-Justice) nu a fost consultată.
- Nu am găsit articole academice despre datele deschise ale instanțelor românești.
