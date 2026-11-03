# 00 — Direcția vizuală comună

Sinteza observațiilor din cele 16 cercetări de pagină (`01`–`16`, peste 250 de ecrane Mobbin din peste 100 de aplicații). Fiecare pagină urmează aceste reguli; abaterile se justifică în fișierul paginii.

## Principii
1. **Instrument de lucru, nu prezentare.** Densitate compactă, titluri sobre, fără ilustrații 3D sau gradiente (anti-modele: Canva, PandaDoc, Jasper, Revolut 3D).
2. **Monocrom + un accent.** Interfața e în tonuri neutre; culoarea înseamnă **stare** (verdict, limită, salvare), nu decor (Linear, Vanta, Grammarly, Supabase).
3. **Documentul e protagonistul.** Foaia A4 albă pe fundal neutru, cu fontul documentului (serif); interfața din jur e sans și discretă (Kit, Craft, Confluence, Contractbook).
4. **Stările sunt ale paginii, nu modale.** Blocarea, întreruperea, limita atinsă și erorile apar în pagină, lângă locul unde contează (WorkOS, Linear; anti-model: Surfshark).
5. **AI-ul își arată munca.** Etape cu rezultat sub fiecare, flux de activitate scurt, timp scurs (nu procente false), buton de oprire mereu vizibil, promisiunea „poți închide pagina” (Elicit, ChatGPT, Rox, Fabric).

## Fundații
| Element | Regula | Surse |
|---|---|---|
| **Font interfață** | Geist (sans, cu `latin-ext` pentru ș ț ă î â), 13–14 px corp, 12 px meta | Linear, Plane, Vanta |
| **Titluri** | 18–22 px semibold, o singură linie de descriere gri; etichete mici uppercase doar pentru grupuri în liste | Jasper, Gemini, Supabase |
| **Font document** | serif, implicit „Times New Roman” 12 pt (din `DocumentMeta`), afișat ca atare pe foaia A4 | Kit, Substack, Chronicle |
| **Cifre** | tabulare pentru contoare, procente, PIN, cronometre; Geist Mono pentru terminal și coduri | Gemini, Databricks |
| **Rază** | 6–8 px controale; 10–12 px carduri, dialoguri, paletă; pastile pentru stări | v0, Supabase, Pitch |
| **Margini** | hairline (`--hairline`) în loc de umbre; umbre doar pentru overlay-uri (popover, paletă, toast, foaia A4) | Linear, Vercel, Height |
| **Spațiere** | grilă de 8 pt; 24–32 px între secțiuni, 12–16 px în carduri | toate |
| **Iconuri** | Tabler outline, 16 px, aceeași grosime; butoanele doar-icon au mereu tooltip | Linear, Replit |
| **Mișcare** | 150–220 ms, ease-out; „shake” la eroare de PIN; totul respectă `prefers-reduced-motion` | HextaUI Motion |

## Culori
- **Neutre:** tokenii HextaUI/shadcn (`background`, `muted`, `border`, `foreground`, `muted-foreground`). Bara globală și pagina folosesc amândouă `background`, separate de un hairline (vezi `17-shell-fara-sidebar.md`; înainte: sidebar gri și panou alb).
- **Primar:** aproape negru (butonul principal), alb pe fundal închis în tema întunecată (Obvious, Supabase, v0).
- **Accent AI** (un singur ton, discret): indigo, doar pentru elementele AI (generare, „Analizează”, activitate agent). Fără gradiente.
- **Stările verdictelor** (din `08-rezultate-analiza.md`):

| Stare | Culoare | Icon | Subliniere în document |
|---|---|---|---|
| Greșeală | roșu | `IconCircleX` | continuă |
| Interpretare discutabilă | chihlimbar | `IconAlertTriangle` | ondulată |
| Necesită analiză umană | violet | `IconUserSearch` | dublă |
| Neverificat | gri | `IconCircleDashed` | punctată |
| Corect | smarald | `IconCircleCheck` | ascunsă implicit |

Fundalul evidențierii = culoarea stării la ~15 % opacitate; în tema întunecată, nuanța 400 pe ~15 %. Lângă orice culoare de stare există și text sau icon (accesibilitate).
- **Limite abonament:** verde < 70 %, chihlimbar 70–90 %, roșu ≥ 90 % sau „respins”.

## Tema întunecată
Suprafețe gri închis, niciodată negru pur (GitBook, Databricks, Air). Foaia A4 rămâne o suprafață deschisă ușor atenuată, ca să fie fidelă exportului DOCX. Terminalul folosește un gri foarte închis în ambele teme (PlanetScale). Comutator în meniul utilizatorului (Sistem / Luminos / Întunecat), salvat local.

## Structura aplicației
> Actualizat de `17-shell-fara-sidebar.md`: aplicația **nu mai are sidebar**. Detaliile (bara globală, comutatorul de proiect, ecranul îngust, scurtăturile) sunt acolo.

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ ◆ LexAI   Proiecte  Utilizare  Setări        [⌕ Caută… ⌘K]  [● 5h 11% · 7z 18%]  (◎) │ 48 px
└──────────────────────────────────────────────────────────────────────────────────────┘
        Proiecte ›                                        ← PageCrumbs (doar strămoșii)
        Titlul paginii                          acțiuni
        conținutul paginii (pe toată lățimea, centrat)
```
- O singură bară de sus, 48 px, cu hairline jos; activul e subliniat. Pe ecran îngust: `◆ LexAI … [⌕] [☰]`, cu foaia „Meniu”.
- Proiectele fixate: comutatorul ⇅ de lângă titlul proiectului, grupul „Fixate” din ⌘K, primele în lista de pe `/`.
- Paleta de comenzi `⌘K` peste tot (`16-command-palette.md`); `G P` / `G U` / `G S` duc la Proiecte / Utilizare / Setări.
- Editorul nu are bara globală: antetul lui (◆ + `{proiect} / {titlu}`) e singura bară.

## Comportamente comune
- Setările se salvează imediat, cu toast de confirmare (Mistral).
- Erorile apar inline lângă câmp; toast-ul doar confirmă sau anunță evenimente de fundal (WorkOS).
- Timp relativ în liste („acum 5 min”), ora exactă în tooltip (Confluence, GitBook).
- Fiecare listă are stare goală cu o acțiune principală (Linear, Hume AI).
- Acțiunile distructive cer confirmare (AlertDialog); arhivarea e preferată ștergerii.
- Scurtături afișate cu `Kbd` în meniuri și tooltip-uri; secvențe de două taste (`N` apoi `P`) pentru „nou”, fiindcă `⌘N` aparține browserului.

## Decizii pentru întrebările deschise din cercetări
| Întrebare | Decizie |
|---|---|
| Încercări per treaptă de blocare | 5; trepte 1 / 5 / 15 / 60 min (implementat) |
| Durata deblocării „sudo” (terminal, PIN) | 10 minute |
| Schimbarea PIN-ului închide celelalte sesiuni | Da |
| Mod interactiv `claude` în terminal | Păstrat, alături de cele trei comenzi `auth` |
| Limita de mărime la încărcare | 50 MB |
| Încărcarea din editor | creează un document nou în același proiect |
| O sugestie acceptată creează o versiune | Nu individual: acceptările se adună în ciornă; „Salvează versiunea” le fixează (originea `ai_sugestie` dacă versiunea conține doar acceptări) |
| Analiză automată la încărcare | Nu; dialogul are bifa „Pornește analiza” activată implicit |
| Moneda costului echivalent | USD (prețurile API sunt în USD), etichetat „cost echivalent API” |
| Căutare în conținut din paletă | Da, peste titluri și textul versiunii curente |
| Planul generării aprobat înainte de redactare | Nu în v1; planul e afișat ca schelet în timpul generării |
| Nota de conformitate | DOCX (separat sau anexat) |
| Exportul salvează o versiune | Nu; exportul folosește versiunea curentă și o menționează în numele fișierului |
