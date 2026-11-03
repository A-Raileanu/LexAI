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

---

## Dezvoltare

### Pornire

Cerințe: Node.js 24+, pnpm 12 și [Claude Code](https://claude.com/claude-code) (se poate instala și conecta și din aplicație, din Setări → Cont Claude). Aplicația nu folosește cheie API: toate apelurile AI trec prin `claude -p` și consumă din limitele abonamentului.

```bash
pnpm install
claude            # o singură dată: /login cu contul Claude, apoi ieși
pnpm dev          # web (3000), worker și terminal (3101)
```

Deschide http://localhost:3000. Aplicația nu are autentificare: serverul ascultă doar pe 127.0.0.1, deci e accesibilă numai de pe acest calculator. Cererile venite de la alte site-uri deschise în browser sunt respinse (`apps/web/src/proxy.ts`).

Datele stau în `Documents/LexAI` din dosarul utilizatorului, pe macOS și pe Windows: baza de date SQLite `lexai.db`, fișierele încărcate (documente și fișiere de context), cheia locală `secret.key`, copiile de siguranță (`pnpm backup`) și jurnalele aplicației desktop. `LEXAI_DATA_DIR` mută datele în altă parte; `LEXAI_CLAUDE_BIN` indică executabilul `claude` dacă nu e în `PATH`.

### Aplicația desktop (macOS și Windows)

`apps/desktop` împachetează LexAI ca aplicație Electron: o fereastră nativă care pornește singură serverul web, worker-ul și terminalul și le oprește la închidere. Dacă un job AI rulează încă, cere confirmare, pentru că închiderea îl întrerupe.

```bash
pnpm desktop            # dezvoltare: refolosește `pnpm dev` dacă rulează, altfel îl pornește (aceleași date, din Documents/LexAI)
pnpm desktop:dist       # aplicația pentru acest calculator
pnpm desktop:dist:all   # Mac Apple Silicon, Mac Intel și Windows x64
```

Rezultatele ajung în `apps/desktop/release/`:
- `LexAI-<versiune>-mac-arm64.dmg`;
- `LexAI-<versiune>-mac-x64.dmg`;
- `LexAI-<versiune>-win-x64.exe` (instalator).

Cum funcționează aplicația împachetată:
- **Fără Node sau pnpm:** serviciile rulează cu Node-ul din Electron, din resursele aplicației, pregătite pe platformă de `scripts/stage.mjs`.
- **CLI-ul Claude** se caută în `LEXAI_CLAUDE_BIN`, apoi în `~/.local/bin` (instalarea nativă, pe care o poate face și aplicația), apoi în `PATH`.
- **Datele** stau în `Documents/LexAI`, ca la `pnpm dev` (pe Windows, în dosarul Documente al sistemului, chiar dacă e mutat în OneDrive). În dosarul aplicației (`~/Library/Application Support/LexAI`, `%APPDATA%\LexAI`) rămân doar profilul browserului intern și poziția ferestrei.
- **Lucrul în paralel:** aplicația și `pnpm dev` pot rula deodată pe aceleași date; un singur worker preia joburi (lacătul `worker.pid` din dosarul de date), iar celălalt așteaptă.
- **Jurnalele** serviciilor sunt în `Documents/LexAI/jurnale` (meniul Ajutor).

Build-urile locale nu au certificat de semnare (Mac: semnătură ad-hoc; Windows: nesemnat). Caută actualizări în Releases-urile acestui repo (`LEXAI_UPDATES_REPO=""` le oprește). Configurația e în `apps/desktop/electron-builder.config.cjs`.

### Publicarea unei versiuni

Versiunile se publică din GitHub Actions (`.github/workflows/release.yml`):

1. Crește `version` în `apps/desktop/package.json`.
2. Creează și trimite tagul:

```bash
git tag v0.2.0
git push origin v0.2.0
```

Workflow-ul rulează verificările, construiește DMG și ZIP pentru Mac (Apple Silicon și Intel) și instalatorul Windows, le încarcă într-un GitHub Release și îl publică. Aplicațiile instalate îl găsesc la următoarea căutare de actualizări.

Opțional, în Settings → Secrets and variables → Actions:
- **Mac semnat și notarizat** (necesar pentru actualizarea automată pe Mac): `CSC_LINK` (certificatul Developer ID `.p12`, în base64), `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
- **Versiunile publicate în alt repo** (de exemplu un repo public doar pentru instalatoare): variabila `LEXAI_UPDATES_REPO` (`proprietar/repo`) și secretul `RELEASES_TOKEN`, un token cu drept de scriere pe acel repo.

Aplicația citește versiunile din repo-ul în care au fost publicate. Dacă repo-ul e privat, aplicațiile instalate nu le pot citi, deci actualizările automate cer un repo public pentru Releases.

Iconul se regenerează cu `npx electron scripts/make-icon.mjs`, rulat în `apps/desktop`.

### Structură

| Director | Rol |
|---|---|
| `apps/web` | Next.js 16 + HextaUI: proiecte, editor, analiză, redactare, setări, utilizare |
| `apps/desktop` | aplicația Electron (macOS și Windows): fereastra nativă, serviciile, actualizările, împachetarea |
| `services/worker` | rulează joburile AI din coada din SQLite: analiză, reverificare, OCR, redactare |
| `services/terminal` | terminal în aplicație care rulează **doar** Claude CLI (ws + node-pty, 127.0.0.1) |
| `packages/db` | schema Drizzle, migrări, coada de joburi, versiuni |
| `packages/ai` | wrapper-ul `claude -p` (stream-json, MCP local pentru instrumente, limitele 5h/7z) |
| `packages/core` | domeniul juridic: identificarea și verificarea trimiterilor, rapoarte, parsare, redactare |
| `packages/sources` | interfața comună a surselor legislative, registrul și instrumentele agentului |
| `packages/source-*` | adaptoare: Portalul Legislativ, jurisprudența CCR/ÎCCJ, site-uri oficiale |
| `packages/docx` | DOCX ⇄ JSON-ul editorului (Tiptap), cu formatare |
| `docs/ux` | cercetarea UX pe pagini (Mobbin) și direcția vizuală |
| `docs/arhitectura` | contractul formatului de document |

O sursă legislativă nouă implementează `LegalSource` (`packages/sources/src/types.ts`) în propriul pachet, se înregistrează în `services/worker/src/registry.ts` și apare în Setări; agentul primește automat instrumentele pentru capabilitățile ei. Poate rula și ca serviciu separat, prin `createHttpSource`.

### Verificare

```bash
pnpm typecheck
pnpm lint
pnpm test
```
