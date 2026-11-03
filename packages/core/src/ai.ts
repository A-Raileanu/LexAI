import { ClaudeSession, runClaude, type ClaudeResult, type InputBlock } from "@lexai/ai";

/**
 * Accesul la Claude, injectabil: implicit CLI-ul `claude` (@lexai/ai); testele și alte
 * medii pot furniza o implementare proprie.
 */

export type ClaudeOptions = Parameters<typeof runClaude>[0];

/** O conversație cu modelul (un proces CLI). */
export interface AiSession {
  send(content: string | InputBlock[]): Promise<ClaudeResult>;
  /** oprește imediat; cererea în curs se încheie cu subtype „oprit” */
  stop(): void;
  close(): Promise<void>;
}

export interface AiClient {
  start(opts: ClaudeOptions): Promise<AiSession>;
  /** o singură cerere (pornește, trimite, închide) */
  run(opts: ClaudeOptions, content: string | InputBlock[]): Promise<ClaudeResult>;
}

/** Claude prin CLI-ul `claude -p`, autentificat cu abonamentul utilizatorului. */
export const claudeCli: AiClient = {
  start: (opts) => ClaudeSession.start(opts),
  run: (opts, content) => runClaude(opts, content),
};
