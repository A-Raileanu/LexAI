# LexAI

LexAI este o aplicație desktop pentru documente juridice românești, pentru macOS și Windows:

- **redactezi documente noi** (contracte, notificări, cereri, decizii) după o descriere, cu temeiuri legale citite din textul oficial al legii;
- **le editezi** într-un editor asemănător cu Word: fonturi, tabele, antet și subsol, imagini, versiuni, export DOCX și PDF;
- **verifici documentele încărcate** (DOCX, DOC, PDF): LexAI găsește trimiterile la lege și semnalează actele abrogate, articolele modificate sau greșite, cu dovezi din Portalul Legislativ și jurisprudența obligatorie (CCR, ÎCCJ), în forma legii aplicabilă la o dată aleasă;
- **adaugi context** fiecărui proiect (acte, corespondență, modele, fotografii cu OCR), folosit automat la redactare.

Totul rulează pe calculatorul tău. Datele stau în dosarul `Documente/LexAI`. AI-ul este Claude, prin [Claude Code](https://claude.com/claude-code) și abonamentul tău Claude (Pro, Max sau Team), fără cheie API.

## Instalare

Descarcă ultima versiune din [Releases](https://github.com/A-Raileanu/LexAI/releases/latest).

### macOS (Apple Silicon sau Intel)

1. Descarcă `LexAI-<versiune>-mac-arm64.dmg` pentru Mac-urile cu Apple Silicon (M1–M5) sau `LexAI-<versiune>-mac-x64.dmg` pentru Mac-urile cu Intel. Ce procesor ai vezi din meniul  → Despre acest Mac.
2. Deschide DMG-ul și trage **LexAI** în **Aplicații**.
3. Prima deschidere: în Aplicații, clic dreapta pe LexAI → **Deschide** → **Deschide**. Dacă macOS tot refuză, mergi la Configurări sistem → Confidențialitate și securitate și apasă **Deschide oricum** în dreptul LexAI. Pasul e necesar doar o dată, cât timp aplicația nu e semnată cu un certificat Apple Developer ID.

### Windows 10 și 11 (x64)

1. Descarcă `LexAI-<versiune>-win-x64.exe`.
2. Rulează instalatorul. Dacă apare „Windows a protejat computerul” (SmartScreen), apasă **Mai multe informații** → **Rulează oricum**.
3. Alege dosarul de instalare și termină instalarea. LexAI apare în meniul Start și pe desktop. Nu sunt necesare drepturi de administrator.

### Prima pornire: Claude

LexAI are nevoie de Claude Code, aplicația oficială Anthropic prin care rulează AI-ul. Nu trebuie instalat separat: la prima pornire, pagina Proiecte îți arată ce lipsește.

1. **Instalează Claude Code**: LexAI îl descarcă de la Anthropic (circa 300 MB), verifică suma de control și îl instalează doar pentru utilizatorul tău.
2. **Conectează contul Claude**: se deschide pagina de conectare Anthropic în browser. După ce confirmi, revii în LexAI. Dacă pagina îți arată un cod, îl lipești în LexAI.

Contul se poate verifica sau schimba oricând din **Setări → Cont Claude**.

### Actualizări

Versiunile publicate în Releases conțin actualizarea automată. LexAI caută versiuni noi la pornire și apoi la câteva ore, sau la cerere din meniul **LexAI → Caută actualizări…** (pe Windows: **Ajutor**).

- **Windows** și **macOS cu aplicație semnată** (Developer ID): versiunea nouă se descarcă în fundal și se instalează când închizi aplicația, sau imediat, cu „Repornește acum”.
- **macOS fără semnătură** (ad-hoc): LexAI anunță versiunea nouă și deschide pagina de descărcare; o instalezi ca prima dată, înlocuind aplicația din Aplicații.

Actualizările nu ating datele din `Documente/LexAI`.

### Dezinstalare

- **macOS:** șterge LexAI din Aplicații.
- **Windows:** Setări → Aplicații → LexAI → Dezinstalează.

Dosarul `Documente/LexAI` (proiectele, documentele, baza de date) rămâne. Îl ștergi manual dacă nu mai ai nevoie de el.
