import type { ChatProposal, ChatScope } from "@lexai/core/chat";

export type { ChatProposal, ChatScope, ProposalStatus } from "@lexai/core/chat";

/** Starea unui răspuns al asistentului, din jobul lui. */
export type ChatReplyState = "in_curs" | "gata" | "eroare" | "oprit";

/** Un mesaj al conversației documentului, cum îl afișează panoul „Chat”. */
export interface ChatMessageView {
  id: string;
  role: "utilizator" | "asistent";
  content: string;
  /** selecția trimisă cu cererea (doar la mesajele utilizatorului) */
  scope: ChatScope | null;
  proposals: ChatProposal[];
  createdAt: number;
  /** doar la mesajele asistentului */
  reply: { state: ChatReplyState; jobId: string | null; error: string | null; startedAt: number | null } | null;
}
