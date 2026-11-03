/** Text fără diacritice și cu litere mici, pentru căutări („ses” găsește „șes”). */
export function foldDiacritics(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[şș]/gi, "s")
    .replace(/[ţț]/gi, "t")
    .toLowerCase()
    .trim();
}
