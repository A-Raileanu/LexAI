import { describe, expect, it } from "vitest";
import { linesFromRects, pageAt, paginate, type LayoutUnit } from "../src/features/editor/pagination/layout";

// pagină de 100 px de text, 20 px margini sus/jos, 10 px între pagini: pitch = 140 + 10
const geo = { contentHeight: 100, pitch: 150 };

/** Paragraf cu `n` rânduri de câte `lh` px, începând la `top`. */
function para(top: number, n: number, lh = 10, extra: Partial<LayoutUnit> = {}): LayoutUnit {
  const lines = Array.from({ length: n }, (_, k) => ({ top: top + k * lh, bottom: top + (k + 1) * lh }));
  return { top, bottom: top + n * lh, lines: () => lines, ...extra };
}
const block = (top: number, h: number, extra: Partial<LayoutUnit> = {}): LayoutUnit => ({ top, bottom: top + h, ...extra });

describe("paginate", () => {
  it("o singură pagină când totul încape", () => {
    expect(paginate([para(0, 5), para(55, 4)], geo)).toEqual({ breaks: [], pages: 1 });
  });

  it("mută un bloc întreg care nu mai încape, cu spațiul până sus pe pagina următoare", () => {
    const { breaks, pages } = paginate([block(0, 60), block(65, 40)], geo);
    expect(breaks).toEqual([{ unit: 1, line: 0, space: 150 - 65, page: 1 }]);
    expect(pages).toBe(2);
  });

  it("împarte un paragraf pe rânduri la capătul paginii", () => {
    // 8 rânduri la 50: rândurile 0–4 încap (până la 100), rândul 5 începe pagina 2
    const { breaks, pages } = paginate([block(0, 45), para(50, 8)], geo);
    expect(breaks).toEqual([{ unit: 1, line: 5, space: 150 - 100, page: 1 }]);
    expect(pages).toBe(2);
  });

  it("nu lasă un singur rând la capătul paginii (orfan): mută tot paragraful", () => {
    const { breaks } = paginate([block(0, 85), para(85, 4)], geo);
    expect(breaks).toEqual([{ unit: 1, line: 0, space: 150 - 85, page: 1 }]);
  });

  it("nu mută un singur rând pe pagina următoare (văduvă): mută două", () => {
    // 5 rânduri la 55: 4 încap, al cincilea ar rămâne singur → se rupe după 3
    const { breaks } = paginate([block(0, 50), para(55, 5)], geo);
    expect(breaks).toEqual([{ unit: 1, line: 3, space: 150 - 85, page: 1 }]);
  });

  it("paragraf de trei rânduri din care încap două: merge tot pe pagina următoare", () => {
    const { breaks } = paginate([block(0, 75), para(80, 3)], geo);
    expect(breaks).toEqual([{ unit: 1, line: 0, space: 70, page: 1 }]);
  });

  it("un paragraf lung continuă pe mai multe pagini", () => {
    const { breaks, pages } = paginate([para(0, 25)], geo);
    expect(breaks.map((b) => [b.line, b.page])).toEqual([
      [10, 1],
      [20, 2],
    ]);
    expect(breaks.every((b) => b.space === 50)).toBe(true);
    expect(pages).toBe(3);
  });

  it("saltul de pagină încheie pagina, chiar dacă blocul următor ar încăpea", () => {
    const units = [para(0, 2), block(26, 15, { marker: true }), para(41, 2, 10, { breakBefore: true })];
    const { breaks, pages } = paginate(units, geo);
    expect(breaks).toEqual([{ unit: 2, line: 0, space: 150 - 41, page: 1 }]);
    expect(pages).toBe(2);
  });

  it("marcajul saltului de pagină nu se mută, chiar dacă intră în marginea de jos", () => {
    const units = [block(0, 95), block(95, 15, { marker: true }), block(110, 10, { breakBefore: true })];
    expect(paginate(units, geo).breaks).toEqual([{ unit: 2, line: 0, space: 40, page: 1 }]);
  });

  it("două salturi de pagină la rând lasă o pagină goală, ca în Word", () => {
    const units = [block(0, 10), block(10, 15, { marker: true }), block(25, 15, { marker: true, breakBefore: true }), block(40, 10, { breakBefore: true })];
    const { breaks, pages } = paginate(units, geo);
    expect(breaks.map((b) => [b.unit, b.page])).toEqual([
      [2, 1],
      [3, 2],
    ]);
    expect(pages).toBe(3);
  });

  it("titlul rămâne cu paragraful următor", () => {
    const units = [block(0, 70), block(72, 12, { keepWithNext: true }), block(86, 30)];
    expect(paginate(units, geo).breaks).toEqual([{ unit: 1, line: 0, space: 150 - 72, page: 1 }]);
  });

  it("titlul de sus de pe pagină nu se mută (nu ar lăsa pagina goală)", () => {
    const units = [block(0, 12, { keepWithNext: true }), block(12, 120)];
    const { breaks, pages } = paginate(units, geo);
    expect(breaks).toEqual([{ unit: 1, line: 0, space: 150 - 12, page: 1 }]);
    expect(pages).toBe(2);
  });

  it("rândurile de tabel se mută întregi; un rând mai înalt decât pagina trece peste capăt", () => {
    const rows = [block(0, 40), block(40, 40), block(80, 130), block(210, 20)];
    const { breaks, pages } = paginate(rows, geo);
    // rândul 2 (130 px) începe pagina 2 și o depășește; rândul 3 începe pe pagina următoare liberă
    expect(breaks.map((b) => [b.unit, b.page])).toEqual([
      [2, 1],
      [3, 2],
    ]);
    expect(breaks[0].space).toBe(70);
    // după mutare rândul 2 se termină la 150 + 130 = 280; pagina 3 începe la 300
    expect(breaks[1].space).toBe(300 - (210 + 70));
    expect(pages).toBe(3);
  });

  it("ignoră marginea de sub ultimul rând dacă rândul încape", () => {
    expect(paginate([block(0, 100.3)], geo).breaks).toEqual([]);
  });
});

describe("linesFromRects", () => {
  it("grupează fragmentele pe rânduri și împarte interlinia între ele", () => {
    const rects = [
      { top: 2, bottom: 18 },
      { top: 4, bottom: 16 }, // alt font, același rând
      { top: 22, bottom: 38 },
      { top: 42, bottom: 58 },
    ];
    expect(linesFromRects(rects, 0, 60)).toEqual([
      { top: 0, bottom: 20 },
      { top: 20, bottom: 40 },
      { top: 40, bottom: 60 },
    ]);
  });

  it("un indice superior ridicat rămâne pe rândul lui", () => {
    const rects = [
      { top: 10, bottom: 26 },
      { top: 6, bottom: 18 },
      { top: 30, bottom: 46 },
    ];
    expect(linesFromRects(rects, 8, 48)).toHaveLength(2);
  });

  it("interlinie 1: rândurile se suprapun puțin, dar rămân separate", () => {
    const rects = [0, 16, 32].map((t) => ({ top: t, bottom: t + 18.4 }));
    expect(linesFromRects(rects, 0, 48)).toHaveLength(3);
  });

  it("paragraf gol: un singur rând cât blocul", () => {
    expect(linesFromRects([], 5, 25)).toEqual([{ top: 5, bottom: 25 }]);
  });
});

describe("pageAt", () => {
  const g = { ...geo, marginTop: 20 };
  it("pagina unei coordonate, cu marginile și spațiul dintre pagini", () => {
    expect(pageAt(0, g, 3)).toBe(0);
    expect(pageAt(149, g, 3)).toBe(1);
    expect(pageAt(-20, g, 3)).toBe(0);
    expect(pageAt(10_000, g, 3)).toBe(2);
  });
});
