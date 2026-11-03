"use client";

import { HEADER_DISTANCE_MM, zoneForPage, type Block, type DocumentMeta } from "@lexai/docx";
import { generateHTML, type Extensions } from "@tiptap/core";
import { useMemo, type CSSProperties, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";
import { PAGE_GAP_PX } from "./pagination/extension";
import { contractExtensions } from "./schema/extensions";

/** 1 mm la 96 dpi. */
export const MM_PX = 96 / 25.4;

export function pageSizeMm(meta: DocumentMeta): { width: number; height: number } {
  const base = meta.page.size === "Letter" ? { width: 215.9, height: 279.4 } : { width: 210, height: 297 };
  return meta.page.orientation === "landscape" ? { width: base.height, height: base.width } : base;
}

let schemaExtensions: Extensions | null = null;

/** HTML-ul unei zone (antet / subsol), randat cu schema documentului. */
function zoneHtml(blocks: Block[]): string {
  schemaExtensions ??= contractExtensions();
  try {
    return generateHTML({ type: "doc", content: blocks }, schemaExtensions);
  } catch {
    return "";
  }
}

const cssFont = (f: string) => `"${f.replace(/"/g, "")}", "Times New Roman", Times, serif`;

/**
 * Foaia documentului, împărțită în pagini (ca Print Layout din Word): mărimea paginii, marginile și
 * fontul implicit din `DocumentMeta`. Paginile albe sunt desenate în spatele textului; spațiile
 * dintre ele le inserează extensia de paginare (`pagination/extension.ts`), care citește geometria
 * din atributele `data-*` de aici. Foaia rămâne deschisă la culoare și în tema întunecată.
 * Antetul și subsolul importate (cel al primei pagini, al paginilor pare sau cel implicit) se
 * desenează pe fiecare pagină, în margini, doar pentru vedere: se păstrează la export.
 */
export function A4Sheet({
  meta,
  zoom,
  pages = 1,
  children,
  className,
  sheetRef,
}: {
  meta: DocumentMeta;
  zoom: number;
  /** numărul de pagini (din `usePagination`) */
  pages?: number;
  children: ReactNode;
  className?: string;
  sheetRef?: Ref<HTMLDivElement>;
}) {
  const size = pageSizeMm(meta);
  const m = meta.page.marginsMm;
  const pageW = size.width * MM_PX;
  const pageH = size.height * MM_PX;
  const pitch = pageH + PAGE_GAP_PX;
  const count = Math.max(1, pages);
  const total = count * pitch - PAGE_GAP_PX;
  // HTML-ul fiecărei zone distincte, calculat o dată
  const html = useMemo(() => ({ headers: meta.headers.map(zoneHtml), footers: meta.footers.map(zoneHtml) }), [meta.headers, meta.footers]);
  const zones = (key: "headers" | "footers", page: number) => {
    const blocks = zoneForPage(meta, key, page);
    return blocks?.length ? (html[key][meta[key].indexOf(blocks)] ?? "") : "";
  };
  const headerTop = `${meta.page.headerMm ?? HEADER_DISTANCE_MM}mm`;
  const footerBottom = `${meta.page.footerMm ?? HEADER_DISTANCE_MM}mm`;
  const style: CSSProperties = {
    width: `${pageW}px`,
    minHeight: `${total}px`,
    padding: `${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm`,
    fontFamily: cssFont(meta.defaults.fontFamily),
    fontSize: `${meta.defaults.fontSizePt}pt`,
    lineHeight: meta.defaults.lineHeight,
    zoom,
    ["--sheet-ml" as string]: `${m.left}mm`,
    ["--para-after" as string]: `${meta.defaults.spaceAfterPt}pt`,
    // textul acoperă toate paginile, ca un click sub ultimul rând să ducă cursorul la final
    ["--lex-flow-min" as string]: `${Math.max(0, total - (m.top + m.bottom) * MM_PX)}px`,
  };
  return (
    <div
      ref={sheetRef}
      className={cn("lex-sheet relative mx-auto shrink-0", className)}
      style={style}
      data-page-width={pageW}
      data-page-height={pageH}
      data-margin-top={m.top * MM_PX}
      data-margin-bottom={m.bottom * MM_PX}
      data-page-gap={PAGE_GAP_PX}
    >
      <div aria-hidden className="lex-pages">
        {Array.from({ length: count }, (_, i) => {
          const header = zones("headers", i + 1);
          const footer = zones("footers", i + 1);
          return (
            <div key={i} className="lex-page" style={{ top: `${i * pitch}px`, height: `${pageH}px` }}>
              {header && <div className="lex-zone" style={{ top: headerTop, left: `${m.left}mm`, right: `${m.right}mm` }} dangerouslySetInnerHTML={{ __html: header }} />}
              {footer && <div className="lex-zone" style={{ bottom: footerBottom, left: `${m.left}mm`, right: `${m.right}mm` }} dangerouslySetInnerHTML={{ __html: footer }} />}
            </div>
          );
        })}
      </div>
      <div className="lex-flow">{children}</div>
    </div>
  );
}
