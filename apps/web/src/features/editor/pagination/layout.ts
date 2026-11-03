/**
 * Paginarea ca în Word (Print Layout), partea pură: din pozițiile „naturale” ale blocurilor (foaia
 * continuă, fără spațiile dintre pagini) calculează unde începe fiecare pagină și cât spațiu se
 * inserează acolo. Fără DOM, ca să poată fi testată; măsurarea e în `extension.ts`.
 *
 * Coordonatele sunt px CSS nescalați (fără zoom), cu 0 la începutul zonei de text a primei pagini.
 * Pagina `p` are zona de text în [p·pitch, p·pitch + contentHeight] după inserarea spațiilor.
 */

export interface PageGeometry {
  /** înălțimea zonei de text: pagina minus marginile de sus și de jos */
  contentHeight: number;
  /** distanța dintre începuturile zonelor de text a două pagini: înălțimea paginii + spațiul dintre ele */
  pitch: number;
}

/** Un rând de text (caseta rândului), în coordonate naturale. */
export interface LayoutLine {
  top: number;
  bottom: number;
}

/** Un bloc care se mută întreg (paragraf, rând de tabel, saltul de pagină) sau se împarte pe rânduri. */
export interface LayoutUnit {
  top: number;
  bottom: number;
  /** rândurile blocului; cerute doar pentru blocurile care trec peste capătul paginii */
  lines?: () => LayoutLine[];
  /** titlurile rămân pe aceeași pagină cu blocul următor */
  keepWithNext?: boolean;
  /** blocul începe obligatoriu pe o pagină nouă (după un salt de pagină) */
  breakBefore?: boolean;
  /** marcajul saltului de pagină: nu se mută niciodată (poate intra în marginea de jos) */
  marker?: boolean;
}

export interface LayoutBreak {
  /** indexul blocului */
  unit: number;
  /** 0 = înaintea blocului; k > 0 = înaintea rândului k din bloc */
  line: number;
  /** spațiul inserat (px), astfel încât blocul / rândul să înceapă sus pe pagina `page` */
  space: number;
  /** pagina (de la 0) care începe aici */
  page: number;
}

export interface LayoutResult {
  breaks: LayoutBreak[];
  pages: number;
}

export interface LayoutOptions {
  /** rânduri minime rămase la capătul paginii (văduve, ca în Word: 2) */
  orphans?: number;
  /** rânduri minime mutate pe pagina următoare */
  widows?: number;
}

/** Toleranța (px) pentru rotunjirile din măsurare. */
const EPS = 0.5;

export function paginate(units: readonly LayoutUnit[], geo: PageGeometry, opts: LayoutOptions = {}): LayoutResult {
  const orphans = Math.max(1, opts.orphans ?? 2);
  const widows = Math.max(1, opts.widows ?? 2);
  const { contentHeight: hc, pitch } = geo;
  const breaks: LayoutBreak[] = [];
  // shift = spațiul inserat până acum; page = pagina curentă; first = primul bloc de pe pagina curentă
  let shift = 0;
  let page = 0;
  let first = 0;
  let bottom = 0;

  const fits = (y: number) => y + shift <= page * pitch + hc + EPS;
  const breakAt = (unit: number, line: number, y: number) => {
    // după un bloc mai înalt decât o pagină, următoarea pagină liberă poate fi mai departe de page + 1
    const target = Math.max(page + 1, Math.ceil((y + shift - EPS) / pitch));
    const space = Math.max(0, target * pitch - (y + shift));
    shift += space;
    page = target;
    breaks.push({ unit, line, space, page });
  };
  // un titlu de la capătul paginii pleacă împreună cu blocul care nu mai încape
  const keepStart = (i: number) => {
    let b = i;
    while (b - 1 > first && units[b - 1].keepWithNext && !units[b - 1].marker) b--;
    return b;
  };

  let i = 0;
  while (i < units.length) {
    const u = units[i];
    if (u.breakBefore && i !== first) {
      breakAt(i, 0, u.top);
      first = i;
    }
    if (u.marker || fits(u.bottom)) {
      bottom = Math.max(bottom, u.bottom + shift);
      i++;
      continue;
    }

    const lines = u.lines?.() ?? [];
    if (lines.length < 2) {
      if (i !== first) {
        const b = keepStart(i);
        breakAt(b, 0, units[b].top);
        first = b;
        i = b;
        continue;
      }
      // mai înalt decât o pagină și deja sus pe pagină: rămâne și trece peste capăt
      bottom = Math.max(bottom, u.bottom + shift);
      i++;
      continue;
    }

    let start = 0;
    let moved = false;
    for (;;) {
      let k = start;
      while (k < lines.length && fits(lines[k].bottom)) k++;
      if (k >= lines.length) break;
      if (start === 0 && i !== first) {
        if (k < orphans) k = 0;
        else if (lines.length - k < widows) {
          k = lines.length - widows;
          if (k < orphans) k = 0;
        }
      } else {
        if (lines.length - k < widows && lines.length - widows > start) k = Math.max(start + 1, lines.length - widows);
        // un singur rând mai înalt decât pagina
        if (k === start) k = start + 1;
      }
      if (k === 0) {
        const b = keepStart(i);
        breakAt(b, 0, units[b].top);
        first = b;
        i = b;
        moved = true;
        break;
      }
      if (k >= lines.length) break;
      breakAt(i, k, lines[k].top);
      first = i;
      start = k;
    }
    if (moved) continue;
    bottom = Math.max(bottom, u.bottom + shift);
    i++;
  }

  const pages = Math.max(page + 1, Math.floor(Math.max(0, bottom - EPS) / pitch) + 1);
  return { breaks, pages };
}

/** Pagina (de la 0) pe care cade o coordonată de după paginare, măsurată de la începutul zonei de text. */
export function pageAt(y: number, geo: PageGeometry & { marginTop: number }, pages: number): number {
  const p = Math.floor((y + geo.marginTop) / geo.pitch);
  return Math.min(Math.max(0, p), Math.max(0, pages - 1));
}

/**
 * Rândurile unui bloc din dreptunghiurile textului (`Range.getClientRects`, în coordonate naturale):
 * fragmentele cu centrul sub rândul curent încep un rând nou. Granița dintre două rânduri e la
 * jumătatea distanței dintre text (jumătate din interlinie de fiecare parte); primul rând începe
 * la `top`, ultimul se termină la `bottom` (marginile blocului).
 */
export function linesFromRects(rects: readonly { top: number; bottom: number }[], top: number, bottom: number): LayoutLine[] {
  const sorted = rects.filter((r) => r.bottom > r.top).sort((a, b) => a.top - b.top);
  const text: LayoutLine[] = [];
  for (const r of sorted) {
    const cur = text[text.length - 1];
    if (cur && (r.top + r.bottom) / 2 <= cur.bottom) {
      cur.top = Math.min(cur.top, r.top);
      cur.bottom = Math.max(cur.bottom, r.bottom);
    } else text.push({ top: r.top, bottom: r.bottom });
  }
  if (!text.length) return [{ top, bottom }];
  return text.map((l, k) => ({
    top: k === 0 ? top : (text[k - 1].bottom + l.top) / 2,
    bottom: k === text.length - 1 ? bottom : (l.bottom + text[k + 1].top) / 2,
  }));
}
