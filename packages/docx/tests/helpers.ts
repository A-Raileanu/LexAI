import type { ImportResult, JSONContent } from "../src";

export function walk(node: JSONContent | JSONContent[] | undefined, fn: (n: JSONContent) => void): void {
  if (!node) return;
  if (Array.isArray(node)) return node.forEach((n) => walk(n, fn));
  fn(node);
  walk(node.content, fn);
}

export function nodes(node: JSONContent | JSONContent[], type?: string): JSONContent[] {
  const out: JSONContent[] = [];
  walk(node, (n) => {
    if (!type || n.type === type) out.push(n);
  });
  return out;
}

export function text(node: JSONContent | JSONContent[]): string {
  return nodes(node)
    .map((n) => (n.type === "text" ? n.text : n.type === "hardBreak" ? "\n" : ""))
    .join("");
}

/** Blocul de text (paragraf/titlu) care conține fragmentul dat. */
export function block(doc: JSONContent | JSONContent[], fragment: string): JSONContent {
  const found = nodes(doc).find((n) => (n.type === "paragraph" || n.type === "heading") && text(n).includes(fragment));
  if (!found) throw new Error(`Nu există paragraful „${fragment}”`);
  return found;
}

/** Nodul text cu exact acest conținut. */
export function textNode(doc: JSONContent | JSONContent[], value: string): JSONContent {
  const found = nodes(doc, "text").find((n) => n.text === value);
  if (!found) throw new Error(`Nu există textul „${value}”`);
  return found;
}

export const markTypes = (n: JSONContent) => (n.marks ?? []).map((m) => m.type).sort();
export const textStyle = (n: JSONContent) => n.marks?.find((m) => m.type === "textStyle")?.attrs;

export function allSegIds(r: ImportResult): string[] {
  const ids: string[] = [];
  const all = [r.content, ...r.meta.headers.flat(), ...r.meta.footers.flat(), ...r.meta.footnotes.flatMap((f) => f.content)];
  walk(all, (n) => {
    if (n.type === "paragraph" || n.type === "heading") ids.push(n.attrs?.segId as string);
  });
  return ids;
}

/** Copie fără `segId` și cu mark-urile ordonate, pentru comparații structurale. */
export function normalize(n: JSONContent): JSONContent {
  const out: JSONContent = { ...n };
  if (n.attrs) {
    const attrs = { ...n.attrs };
    delete attrs.segId;
    if (Object.keys(attrs).length) out.attrs = attrs;
    else delete out.attrs;
  }
  if (n.marks) out.marks = [...n.marks].sort((a, b) => a.type.localeCompare(b.type));
  if (n.content) out.content = n.content.map(normalize);
  return out;
}
