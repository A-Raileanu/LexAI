import { createSegIdGenerator } from "./segid";
import type { JSONContent } from "./types";

/**
 * Text fără formatare (DOC, PDF) → document: câte un paragraf pentru fiecare element,
 * rândurile din interiorul unui paragraf devin `hardBreak`.
 */
export function textFromParagraphs(paragraphs: string[]): JSONContent {
  const segId = createSegIdGenerator();
  const content = paragraphs.map((p): JSONContent => {
    const inline: JSONContent[] = [];
    p.replace(/\r\n?/g, "\n")
      .split("\n")
      .forEach((line, i) => {
        if (i > 0) inline.push({ type: "hardBreak" });
        if (line) inline.push({ type: "text", text: line });
      });
    const node: JSONContent = { type: "paragraph", attrs: { segId: segId() } };
    if (inline.length) node.content = inline;
    return node;
  });
  if (!content.length) content.push({ type: "paragraph", attrs: { segId: segId() } });
  return { type: "doc", content };
}
