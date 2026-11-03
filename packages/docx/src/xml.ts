import * as cheerio from "cheerio";

/** Nod XML minimal (structura din domhandler), parcurs direct, fără selectori. */
export interface XNode {
  type: string;
  name?: string;
  attribs?: Record<string, string>;
  children?: XNode[];
  data?: string;
}

export function parseXml(xml: string): XNode {
  return cheerio.load(xml, { xml: true }).root()[0] as unknown as XNode;
}

export function kids(n: XNode | undefined): XNode[] {
  return (n?.children ?? []).filter((c) => c.type === "tag");
}

export function child(n: XNode | undefined, name: string): XNode | undefined {
  return kids(n).find((c) => c.name === name);
}

export function childrenNamed(n: XNode | undefined, name: string): XNode[] {
  return kids(n).filter((c) => c.name === name);
}

export function attr(n: XNode | undefined, name: string): string | undefined {
  return n?.attribs?.[name];
}

export function num(v: string | undefined): number | undefined {
  if (v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/** Primul descendent cu numele dat (în adâncime). */
export function find(n: XNode | undefined, name: string): XNode | undefined {
  for (const c of kids(n)) {
    if (c.name === name) return c;
    const f = find(c, name);
    if (f) return f;
  }
  return undefined;
}

export function findAll(n: XNode | undefined, name: string, out: XNode[] = []): XNode[] {
  for (const c of kids(n)) {
    if (c.name === name) out.push(c);
    findAll(c, name, out);
  }
  return out;
}

export function textContent(n: XNode | undefined): string {
  if (!n) return "";
  if (n.type === "text" || n.type === "cdata") return n.data ?? (n.children ?? []).map(textContent).join("");
  return (n.children ?? []).map(textContent).join("");
}

/** Proprietățile „toggle” din OOXML: `<w:b/>` = adevărat, `w:val="0|false|off"` = fals. */
export function onOff(n: XNode | undefined): boolean | undefined {
  if (!n) return undefined;
  const v = attr(n, "w:val");
  return v === undefined || !["0", "false", "off", "none"].includes(v);
}
