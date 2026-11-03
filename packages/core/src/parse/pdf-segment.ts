import type { DocSegment } from "../types";

/**
 * Împărțirea stratului de text al unei pagini PDF în paragrafe, comună browserului
 * (vizualizatorul) și serverului (extragerea textului). Fiecare segment păstrează indicii
 * bucăților de text (page, item), pentru evidențieri exacte.
 */

type TextItem = {
  str: string;
  transform: number[];
  width: number;
  height: number;
  hasEOL: boolean;
};

/** caractere de control / de înlocuire: semn că fontul nu are o corespondență Unicode corectă */
export const BAD_CHARS = /[\u0000-\u0008\u000e-\u001f�]/g;
const GARBLED_RATIO = 0.01;
const MIN_PAGE_CHARS = 25;
export const LIST_START = /^(\(?\d{1,3}[).]|[a-zăîâșț]\)|art\.|articolul|capitolul|secțiunea|sectiunea|titlul|[-–•▪])\s?/i;

export interface PageSegments {
  segments: DocSegment[];
  /** prea puțin text (probabil pagină scanată) */
  lowText: boolean;
  /** strat de text deteriorat */
  garbled: boolean;
}

export function segmentPdfPage(items: unknown[], p: number): PageSegments {
  const segments: DocSegment[] = [];
  let pageChars = 0;
  let badChars = 0;
  let cur: { text: string; items: NonNullable<DocSegment["pdfItems"]> } | null = null;
  let lastY: number | null = null;
  let lastH = 10;
  let lineBreakPending = false;

  const flush = () => {
    if (cur && cur.text.trim()) {
      segments.push({ id: "", text: cur.text, kind: "paragraf", quality: "ok", page: p, pdfItems: cur.items });
    }
    cur = null;
  };

  items.forEach((raw, index) => {
    if (!raw || typeof raw !== "object" || !("str" in raw)) return;
    const it = raw as TextItem;
    const y = it.transform[5];
    const h = Math.abs(it.height || it.transform[3] || lastH) || lastH;

    if (it.str === "") {
      if (it.hasEOL) lineBreakPending = true;
      return;
    }
    pageChars += it.str.trim().length;
    // aceeași lungime ca în stratul de text, ca indicii evidențierilor să rămână valabili
    const str = it.str.replace(BAD_CHARS, () => {
      badChars++;
      return "�";
    });

    const newLine = lastY !== null && Math.abs(y - lastY) > h * 0.5;
    const gap = lastY !== null ? Math.abs(lastY - y) : 0;
    const bigGap = newLine && gap > Math.max(h, lastH) * 1.75;
    const startsList = (newLine || lineBreakPending) && LIST_START.test(str.trimStart());
    const prevEndsSentence = cur ? /[.;:!?]\s*$/.test(cur.text) : false;

    if (!cur || bigGap || (startsList && prevEndsSentence) || (startsList && newLine && /^(art\.|articolul|capitolul|titlul)/i.test(str.trimStart()))) {
      flush();
      cur = { text: "", items: [] };
    } else if ((newLine || lineBreakPending) && !/\s$/.test(cur.text)) {
      cur.text += " ";
    }

    const c = cur!;
    c.items.push({ page: p, item: index, offset: c.text.length, length: str.length });
    c.text += str;
    lineBreakPending = it.hasEOL;
    lastY = y;
    lastH = h;
  });
  flush();
  const lowText = pageChars < MIN_PAGE_CHARS;
  return { segments, lowText, garbled: !lowText && badChars / pageChars > GARBLED_RATIO };
}

/** Renumerotează segmentele în ordinea paginilor (după adăugarea textului OCR). */
export function numberSegments(segments: DocSegment[]): DocSegment[] {
  const sorted = [...segments].sort((a, b) => (a.page ?? 0) - (b.page ?? 0));
  return sorted.map((s, i) => ({ ...s, id: `s${i + 1}` }));
}
