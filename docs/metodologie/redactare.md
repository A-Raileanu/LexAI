# Redactarea unui document conform legii

Scopul: utilizatorul primește un proiect gata de revizuit (Markdown și Word) și o **notă de conformitate**. Nota leagă fiecare clauză care se sprijină pe lege, fiecare cerință obligatorie și fiecare limită legală de textul oficial al normei, în forma de la data documentului, cu fragmente validate automat.

Se aplică oricărui document: contracte, acte adiționale, acte constitutive, hotărâri AGA, decizii ale angajatorului, regulamente interne, politici de confidențialitate, notificări, puneri în întârziere, cereri și plângeri, procuri, declarații.

## Cuprins
1. Clarifică cererea
2. Pornește sesiunea
3. Cercetează regimul juridic
4. Scrie proiectul
5. Leagă proiectul de lege și validează
6. Exportă și predă
7. Puncte de plecare pe tipuri de documente

## 1. Clarifică cererea

Află, din ce a spus utilizatorul sau cu întrebări scurte, doar ce schimbă conținutul:
- **tipul documentului** și scopul lui;
- **părțile** și calitatea lor (persoană fizică sau juridică, profesionist sau consumator, angajator sau salariat), pentru că de ele depind normele speciale;
- **elementele esențiale**: obiect, preț sau sumă, termene, durată;
- **data** la care documentul se încheie sau produce efecte. Legea se citește în forma de la acea dată (implicit azi);
- **poziția** pe care o reprezinți: echilibrat sau în favoarea uneia dintre părți.

Pentru restul nu insista: pune în proiect locuri de completat marcate `[●]`, cu o scurtă indicație (`[● CNP-ul împrumutătorului]`). Nu inventa date de identificare, sume sau termene.

Dacă utilizatorul aduce un model de pornire, verifică-l întâi (modul de verificare, într-o sesiune separată: `legalis --dir .legalis-model extrage model.docx`). Apoi redactează pe baza constatărilor.

## 2. Pornește sesiunea
```
legalis porneste --titlu "Contract de închiriere" --data 2026-11-01
```
Sesiunea nu are document: păstrează doar normele citite (dovezile `E…`).

**Data (`--data`)** este data semnării. Dacă nu e cunoscută sau e în viitor, folosește data de azi: portalul are doar formele publicate până azi, iar o dată viitoare dă tot forma de azi. Când documentul produce efecte mai târziu (un contract care începe peste o lună), spune în predare că legea a fost citită la data de azi și că modificările apărute până la data efectelor nu sunt acoperite. Verifică totuși, în `info-act` și în notele articolelor, dacă există modificări deja publicate care intră în vigoare mai târziu.

## 3. Cercetează regimul juridic

Înainte de a scrie, stabilește din textul oficial, nu din memorie:
1. **Actul principal**: reglementarea contractului sau a actului respectiv (de ex. contractele speciale din Codul civil, Codul muncii, Legea nr. 31/1990).
2. **Normele imperative**: forma cerută (scrisă, autentică, înregistrare), mențiunile obligatorii, termenele, plafoanele, interdicțiile, condițiile de validitate. Acestea devin cerințe (`tip: "cerinta"`) și limite (`tip: "limita"`) în nota de conformitate.
3. **Normele speciale** care se aplică din cauza părților sau a obiectului: consumatori, salariați, date personale, imobile, profesii reglementate.
4. **Normele supletive** pe care vrei să le preiei sau de la care vrei să derogi expres.
5. **Jurisprudența obligatorie** asupra normelor cheie: `cauta-decizii --articol N` (vezi [metodologie.md](metodologie.md), secțiunea 4).

Folosește `cauta-act`, `info-act`, `articol --data <data documentului>`, `cauta-in-act`, `cauta-decizii`, `decizie`. Fiecare citire dă o dovadă `E…`. Notează-ți ce dovadă susține ce clauză.

Pentru o regulă al cărei articol nu îl știi, `cauta-in-act <act_id> "<cuvinte cheie>"` caută în tot actul, tolerant la forma cuvintelor („înregistrarea contractelor” găsește și „înregistrării contractului”). Pentru fiecare articol găsit arată pasajul potrivit. Folosește 2–4 cuvinte specifice, nu fraze lungi. Pentru un capitol întreg (de ex. locațiunea), citește articolele pe rând, într-o buclă de shell.

## 4. Scrie proiectul

Scrie proiectul în `proiect.md`, în Markdown simplu (se exportă în Word):
- `# TITLUL DOCUMENTULUI` (centrat în Word), apoi părțile;
- `## Art. 1. Obiectul contractului` pentru fiecare articol, cu alineate numerotate (`1.1.`, `1.2.`);
- liste cu `-`, tabele cu `| … |`, **îngroșat** pentru termeni definiți;
- la final, semnăturile, ca tabel ca să stea alături (`| Proprietar | Chiriaș |`, apoi rândul cu numele și rândul `Semnătura: ____________`). Rândurile consecutive dintr-un paragraf rămân pe rânduri separate.

Reguli de redactare:
- **Clar și precis.** Termene în zile calendaristice sau lucrătoare, spus explicit. Sumele în cifre și litere. Obligațiile cu subiect, conținut și termen.
- **Conform normelor imperative.** O clauză care încalcă o normă imperativă nu se scrie. Dacă utilizatorul o cere, explică de ce nu și propune o variantă legală.
- **Citează legea numai unde ajută** (temeiul unei proceduri, o trimitere ca să nu repeți textul). Fiecare trimitere din proiect trebuie să aibă temei verificat. Altfel programul o semnalează.
- **Fără norme abrogate sau denumiri vechi.** Folosește forma actuală a actului de la data documentului (verifică notele din `articol`).
- **Echilibru.** Clauzele care limitează răspunderea, permit denunțarea unilaterală sau suspendarea executării ori impun decăderi, renunțări sau restrângeri pot avea nevoie de acceptare expresă în scris (clauze neuzuale). În contractele cu consumatorii pot fi abuzive. Semnalează-le în nota de conformitate.

## 5. Leagă proiectul de lege și validează

Scrie `temeiuri.json` (format în [format.md](format.md)): câte un element pentru fiecare clauză care aplică o normă, fiecare cerință obligatorie (îndeplinită sau de completat) și fiecare limită legală. Fiecare are fragmente **copiate exact** din textul citit cu `legalis`.

```
legalis temeiuri temeiuri.json --proiect proiect.md
```

Programul verifică:
- că fiecare fragment există în textul oficial citit;
- că norma a fost citită în forma de la data documentului;
- că `text_clauza` apare în proiect;
- că fiecare act citat în proiect („Legea nr. 260/2008”, „Codul civil”, „C.proc.civ.”) are, în același paragraf, un temei a cărui dovadă provine chiar din acel act.

Programul adună și locurile de completat (`[●…]`) în notă. Comanda iese cu cod 1 cât timp există temeiuri nevalidate sau trimiteri fără temei. Corectează și rulează din nou până la 0. O trimitere fără temei se rezolvă fie citind actul și adăugând temeiul, fie scoțând trimiterea din proiect. Nu acoperi o trimitere cu dovada altui act.

Fiecare rulare rescrie nota de conformitate (`--md` alege alt fișier). Rulează pe proiectul final înainte de export.

Stările: `respectat` (proiectul aplică norma), `de_completat` (lipsesc informații de la utilizator; în proiect rămâne `[●]`), `de_verificat` (depinde de fapte sau de o interpretare discutabilă; un jurist trebuie să decidă).

## 6. Exportă și predă
```
legalis document proiect.md
legalis document "proiect - notă de conformitate.md"
```
Prezintă utilizatorului:
- fișierele: proiectul (`.docx` și `.md`) și nota de conformitate;
- pe scurt: ce acoperă proiectul și pe ce norme se sprijină, cu data formei legii;
- ce trebuie completat (`[●]`) și ce trebuie decis de un jurist;
- clauzele cu risc (neuzuale, posibil abuzive, dependente de interpretare).

Încheie cu precizarea că proiectul nu constituie consultanță juridică și trebuie revizuit de un jurist înainte de semnare.

Pentru documente importante, poți face și o **verificare independentă** a proiectului final, într-o sesiune separată, pe fluxul din [verificare.md](verificare.md):
```
legalis --dir .legalis-verificare extrage proiect.docx
```

## 7. Puncte de plecare pe tipuri de documente

Sunt doar locuri unde să începi cercetarea. Citește întotdeauna textul în forma de la data documentului și caută și normele speciale.

| Document | De unde pornești |
|---|---|
| Orice contract | Codul civil: art. 1.178 (libertatea formei), art. 1.179 (condițiile de validitate), art. 1.203 (clauzele standard neuzuale), apoi capitolul contractului special (de ex. împrumutul de consumație, art. 2.158 și urm.) |
| Contract de închiriere (locațiune) | Codul civil: art. 1.777 și urm. (locațiunea), art. 1.798 (contractul înregistrat la organele fiscale sau autentic e titlu executoriu pentru plata chiriei), art. 1.809 (expirarea termenului; restituirea bunului), art. 1.824 și urm. (reguli speciale pentru locuințe); Codul fiscal, art. 83 (înregistrarea contractului la organul fiscal) |
| Contract cu un consumator | în plus, Legea nr. 193/2000 privind clauzele abuzive (art. 4) și normele speciale de protecție a consumatorilor aplicabile |
| Contract individual de muncă, act adițional | Codul muncii: art. 16 (forma scrisă, limba română, înregistrarea), art. 17 (informarea și elementele obligatorii); modelul-cadru stabilit prin ordin al ministrului |
| Decizie de sancționare disciplinară | Codul muncii, art. 252 (forma scrisă, termenele, conținutul obligatoriu), plus procedura cercetării disciplinare care îl precedă |
| Act constitutiv SRL, SNC, SCS | Legea nr. 31/1990, art. 7 (conținutul actului constitutiv) |
| Notificare, punere în întârziere | Codul civil, art. 1.522 (punerea în întârziere de către creditor) |
| Cerere de chemare în judecată | Codul de procedură civilă, art. 194 (cuprinsul cererii), plus competența și taxele de timbru |
| Informare privind datele personale | Regulamentul (UE) 2016/679 (obligațiile de informare), legislația națională de aplicare; vezi [surse.md](surse.md) pentru accesul la textele UE |
