import * as cheerio from "cheerio";

/** Textul lizibil al unei pagini HTML: fără scripturi și navigare, cu blocurile pe rânduri separate. */
export function pageText(html: string): { titlu: string; text: string } {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, header, footer, form").remove();
  $("br, p, div, li, tr, h1, h2, h3, h4, h5, h6, section, article").after("\n");
  const root = $("main").length ? $("main") : $("body");
  const text = root
    .text()
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
  return { titlu: $("title").text().trim(), text };
}
