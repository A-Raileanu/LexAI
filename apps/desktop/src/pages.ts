/**
 * Paginile locale ale ferestrei cât timp serverul aplicației nu e gata: pornirea și eroarea.
 * Butoanele paginii de eroare sunt legături `lexai://…`, interceptate de procesul principal.
 */

const LOGO = `<svg viewBox="0 0 24 24" width="44" height="44" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3" transform="rotate(45 12 12)" fill="currentColor"/><path d="M9.5 9.2c0-1 1-1.7 2.5-1.7s2.4.6 2.5 1.6M14.5 14.8c0 1-1 1.7-2.5 1.7s-2.4-.6-2.5-1.6M9.6 11.1c.6-.6 1.5-.8 2.4-.8 1.5 0 2.5.7 2.5 1.7s-1 1.7-2.5 1.7c-.9 0-1.8-.2-2.4-.8" fill="none" stroke="var(--bg)" stroke-width="1.3" stroke-linecap="round"/></svg>`;

const STYLE = `
:root{--bg:#fff;--fg:#0a0a0a;--muted:#737373;--border:#e5e5e5;--code:#f5f5f5;color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{--bg:#0a0a0a;--fg:#fafafa;--muted:#a3a3a3;--border:#262626;--code:#171717}}
*{box-sizing:border-box}html,body{height:100%;margin:0}
body{background:var(--bg);color:var(--fg);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center;-webkit-app-region:drag;-webkit-user-select:none}
main{width:min(560px,100% - 48px);display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px}
h1{font-size:17px;font-weight:600;margin:6px 0 0}p{margin:0;color:var(--muted)}
.spin{width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--fg);border-radius:50%;animation:s .8s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
pre{width:100%;max-height:220px;overflow:auto;text-align:left;font:12px/1.45 ui-monospace,Menlo,monospace;background:var(--code);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin:4px 0 0;white-space:pre-wrap;-webkit-user-select:text;-webkit-app-region:no-drag}
.actions{display:flex;gap:8px;margin-top:4px}
a{-webkit-app-region:no-drag;text-decoration:none;font-weight:500;border-radius:8px;padding:7px 14px;border:1px solid var(--border);color:var(--fg)}
a.primary{background:var(--fg);color:var(--bg);border-color:var(--fg)}
`;

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function page(title: string, body: string): string {
  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>${escape(title)}</title><style>${STYLE}</style></head><body><main>${LOGO}${body}</main></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

export function splashPage(detail: string): string {
  return page("LexAI", `<h1>Pornesc LexAI</h1><p>${escape(detail)}</p><div class="spin" role="progressbar" aria-label="Se încarcă"></div>`);
}

export function errorPage(message: string, log: string): string {
  return page(
    "LexAI — eroare la pornire",
    `<h1>LexAI nu a putut porni</h1><p>${escape(message)}</p>${log ? `<pre>${escape(log)}</pre>` : ""}<div class="actions"><a class="primary" href="lexai://reincearca">Încearcă din nou</a><a href="lexai://jurnale">Deschide jurnalele</a></div>`,
  );
}
