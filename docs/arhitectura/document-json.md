# Formatul documentului (JSON Tiptap) — contract comun

Editorul (`apps/web/src/features/editor`), convertorul DOCX (`packages/docx`) și analiza (`packages/core`) folosesc același format: JSON-ul Tiptap v3 (`JSONContent`). Orice câmp nou se adaugă aici întâi.

## Nod rădăcină
`{ type: "doc", content: Block[] }`. Setările de pagină nu stau în JSON, ci alături, în `DocumentMeta`:

```ts
interface DocumentMeta {
  page: { size: "A4" | "Letter"; orientation: "portrait" | "landscape";
          marginsMm: { top: number; right: number; bottom: number; left: number };
          headerMm?: number; footerMm?: number };   // distanța antetului / subsolului față de marginea foii (implicit 12,7)
  defaults: { fontFamily: string; fontSizePt: number; lineHeight: number };   // ex. "Times New Roman", 12, 1.15
  headers: Block[][];   // anteturi (afișate pe fiecare pagină, needitabile; păstrate la export)
  footers: Block[][];
  headerKinds?: ("default" | "first" | "even")[];   // tipul antetului de pe același index (lipsă = „default”)
  footerKinds?: ("default" | "first" | "even")[];
  titlePage?: boolean;  // prima pagină are antetul / subsolul „first” (sau niciunul)
  evenOdd?: boolean;    // paginile pare au antetul / subsolul „even”
  footnotes: { id: string; content: Block[] }[];
}
```
Ce antet apare pe o pagină: `zoneForPage(meta, "headers", pagina)` (din `@lexai/docx`), după regulile din Word.
Valori implicite: A4 portret, margini 25/25/25/25 mm, „Times New Roman” 12 pt, 1.15.

## Blocuri
Toate blocurile de text au atributul `segId` (string, unic în document, stabil la editare; ex. `"p_8f3k2a"`). Constatările analizei se ancorează pe `segId`.

| type | atribute | conținut |
|---|---|---|
| `paragraph` | `segId`, `textAlign` (`left`/`center`/`right`/`justify`/null), `indentPt` (stânga, număr/null), `firstLineIndentPt`, `lineHeight` (multiplicator), `spaceBeforePt`, `spaceAfterPt` | inline |
| `heading` | `level` 1–4 + aceleași atribute ca paragraful | inline |
| `bulletList` / `orderedList` (`start`) | — | `listItem[]` |
| `listItem` | — | `paragraph` + liste imbricate |
| `table` | — | `tableRow[]` |
| `tableRow` | — | `tableCell[]` / `tableHeader[]` |
| `tableCell` / `tableHeader` | `colspan`, `rowspan`, `colwidth` (number[] în px, la 96 dpi), `backgroundColor` | `paragraph[]` |
| `pageBreak` | — | — |
| `horizontalRule` | — | — |

Inline: `text` (cu mark-uri), `hardBreak` și `image` (`src`, `alt`, `title`, `width`, `height` în px la 96 dpi).

Imaginile importate din DOCX se salvează în `files/imagini/<sha256>.<ext>` din dosarul de date, iar `src` e `/api/imagini/<sha256>.<ext>` (nu data URL, ca versiunile să nu repete octeții). Formatele afișabile sunt PNG, JPEG, GIF, BMP, WebP; EMF/WMF/TIFF se omit cu avertisment. Imaginile nu au text: segmentele, căutarea și tot ce se trimite la AI le ignoră (fără OCR). Casetele de text devin paragrafe după paragraful care le ancorează.

## Mark-uri
| type | atribute |
|---|---|
| `bold`, `italic`, `underline`, `strike`, `subscript`, `superscript` | — |
| `textStyle` | `fontFamily`, `fontSize` (ex. `"12pt"`), `color` (`#rrggbb`), `backgroundColor` (evidențiere, `#rrggbb`) |
| `link` | `href` |
| `placeholder` | `hint` — câmp de completat; textul afișat e `[● hint]` |
| `suggestInsert` | `id`, `author` (`ai`/`user`), `findingId?`, `createdAt` — text propus, încă neacceptat |
| `suggestDelete` | aceleași — text propus spre ștergere |

Exportul DOCX și cel PDF (`packages/docx/src/pdf.ts`) scriu documentul cu sugestiile **neaplicate** (ignoră `suggestInsert`, păstrează textul cu `suggestDelete`), iar placeholderele ca text evidențiat.

## Segmente pentru analiză
`packages/core` derivă segmentele (`DocSegment`) din blocuri: fiecare `paragraph`/`heading` și fiecare paragraf din celulele de tabel devine un segment cu `id = segId`, `text` = textul simplu, `kind` = `titlu` pentru heading, `tabel` în tabel, altfel `paragraf`.
