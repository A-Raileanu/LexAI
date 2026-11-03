import { isPassageProposal, isTextProposal, type ChatProposal } from "@lexai/core/chat";
import type { PreviewTarget, ProposalEdit } from "../editor/bridge";

/** Legătura dintre propunerile din chat și editor (fără React, testabilă). */

/** Propunerea ca modificare de aplicat în editor. */
export function proposalEdit(p: ChatProposal): ProposalEdit {
  if (p.kind === "formatare") return { kind: "format", segId: p.segmentId, start: p.start, original: p.textOriginal, styles: p.stiluri };
  if (isTextProposal(p)) return { segId: p.segmentId, start: p.start, original: p.textOriginal, replacement: p.textNou };
  if (p.kind === "inserare") return { kind: "insert", anchor: p.segmentId, position: p.pozitie, blocks: p.blocuri };
  return { kind: "replace", segIds: p.segmentIds, originals: p.textOriginal, blocks: p.kind === "stergere_blocuri" ? [] : p.blocuri };
}

/** Ținta previzualizării în document. */
export function proposalTarget(p: ChatProposal): PreviewTarget {
  if (isPassageProposal(p)) return { segId: p.segmentId, start: p.start, original: p.textOriginal };
  if (p.kind === "inserare") return { kind: "insert", anchor: p.segmentId, position: p.pozitie };
  return { kind: "replace", segIds: p.segmentIds };
}
