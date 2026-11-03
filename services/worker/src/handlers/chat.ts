import { ClaudeSession, mcpToolName } from "@lexai/ai";
import { UsageTracker } from "@lexai/ai/usage";
import { type TiptapDoc } from "@lexai/core";
import { BLOCK_JSON_SCHEMA, validateChanges, type ChatProposal, type ChatScope, type ProposedChange } from "@lexai/core/chat";
import { documentLayout } from "@lexai/core/document";
import { and, asc, chatMessages, documentVersions, documents, eq, lt, settings, type Db } from "@lexai/db";
import { EvidenceStore, RunScope, defineTool, toolsFor } from "@lexai/sources";
import { z } from "zod";
import type { JobHandler } from "../runner";
import { buildRegistry } from "../registry";
import { CHAT_SYSTEM, MISSING_CHANGES_ERROR, announcesChange, buildChatRequest, fallbackNudge, type HistoryMessage } from "./chat-prompt";
import { contextActivity, describeContextFiles, describeProjectDocuments, projectContextFiles, projectDocuments } from "./project-context";

export interface ChatJobInput {
  documentId: string;
  /** mesajul utilizatorului (cererea și selecția) */
  userMessageId: string;
  /** mesajul asistentului care primește răspunsul */
  messageId: string;
}

const Block = z.object({ tip: z.string() }).passthrough();
const Change = z.object({
  tip: z.string().optional(),
  segment_id: z.string().optional(),
  text_original: z.string().optional(),
  text_nou: z.string().optional(),
  pozitie: z.string().optional(),
  segmente: z.array(z.string()).optional(),
  blocuri: z.array(Block).optional(),
  stiluri: z.record(z.string(), z.unknown()).optional(),
  explicatie: z.string().optional(),
});
const Answer = z.object({ raspuns: z.string(), modificari: z.array(Change) });

const str = { type: "string" } as const;
const strings = { type: "array", items: str } as const;
const ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["raspuns", "modificari"],
  properties: {
    raspuns: { ...str, description: "răspunsul pentru utilizator, scurt, text simplu" },
    modificari: {
      type: "array",
      description: "toate modificările propuse, câte una pentru fiecare loc sau bloc",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tip", "explicatie"],
        properties: {
          tip: { type: "string", enum: ["text", "formatare", "inserare", "inlocuire_blocuri", "stergere_blocuri"] },
          segment_id: { ...str, description: "text / formatare: segmentul modificat; inserare: segmentul-ancoră" },
          text_original: { ...str, description: "text / formatare: pasajul copiat caracter cu caracter, unic în segment (sau în selecție); inlocuire_blocuri / stergere_blocuri: începutul primului segment, exact" },
          text_nou: { ...str, description: "text: textul care înlocuiește pasajul; gol = ștergere; fără rânduri noi; formatare doar **aldin** / *cursiv*" },
          stiluri: {
            type: "object",
            additionalProperties: false,
            description: "formatare: true = aplică, false = scoate",
            properties: { bold: { type: "boolean" }, italic: { type: "boolean" }, underline: { type: "boolean" }, strike: { type: "boolean" } },
          },
          pozitie: { type: "string", enum: ["dupa", "inainte"], description: "inserare: după (implicit) sau înainte de blocul ancorei" },
          segmente: { ...strings, description: "inlocuire_blocuri / stergere_blocuri: id-urile paragrafelor consecutive, în ordine" },
          blocuri: { type: "array", items: BLOCK_JSON_SCHEMA, description: "inserare / inlocuire_blocuri: blocurile noi" },
          explicatie: str,
        },
      },
    },
  },
};

const MAX_TURNS = 24;
const MAX_ATTEMPTS = 3;

function parseJson<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Forma de lucru a documentului: ciorna (salvată de client înainte de cerere) sau versiunea curentă. */
function workingDoc(db: Db, documentId: string) {
  const doc = db
    .select({ title: documents.title, draft: documents.draftContent, versionId: documents.currentVersionId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .get();
  if (!doc) throw new Error("Documentul nu mai există.");
  const raw = doc.draft ?? (doc.versionId ? db.select({ c: documentVersions.content }).from(documentVersions).where(eq(documentVersions.id, doc.versionId)).get()?.c : undefined);
  const content = parseJson<TiptapDoc>(raw);
  if (!content) throw new Error("Documentul nu are conținut.");
  const layout = documentLayout(content);
  return { title: doc.title, segments: layout.segments, pageBreaks: layout.pageBreaks, blocks: layout.blocks };
}

/**
 * O tură de chat în editor: agentul primește documentul (pe segmente), selecția, conversația
 * anterioară și cererea; poate citi legea prin sursele active și încheie cu propune_modificari.
 * Codul validează fiecare modificare pe textul documentului (și pe selecție); nimic nu se aplică
 * în document: propunerile ajung la utilizator, care le aprobă una câte una.
 */
export const chatHandler: JobHandler = async (ctx) => {
  const input = ctx.input as ChatJobInput;
  const { db } = ctx;
  const user = db.select().from(chatMessages).where(eq(chatMessages.id, input.userMessageId)).get();
  if (!user) throw new Error("Cererea nu mai există.");
  const scope = parseJson<ChatScope>(user.scope);
  const { title, segments, pageBreaks, blocks } = workingDoc(db, input.documentId);
  const validate = (list: readonly ProposedChange[]) => validateChanges(list, segments, scope, { pageBreaks, blocks });
  if (!segments.length) throw new Error("Documentul nu conține text.");

  const history: HistoryMessage[] = db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.documentId, input.documentId), lt(chatMessages.createdAt, user.createdAt)))
    .orderBy(asc(chatMessages.createdAt))
    .all()
    .map((m) => ({ role: m.role, content: m.content, scope: parseJson<ChatScope>(m.scope), proposals: parseJson<ChatProposal[]>(m.proposals) }));

  const registry = buildRegistry(db);
  const usage = new UsageTracker();
  const model = db.select({ m: settings.model }).from(settings).where(eq(settings.id, 1)).get()?.m ?? "claude-sonnet-5-5";
  const activity = (mesaj: string) => ctx.emit("activitate", { mesaj });

  let accepted: { raspuns: string; proposals: ChatProposal[] } | null = null;
  let attempts = 0;
  let session: ClaudeSession | null = null;

  const answer = defineTool({
    name: "propune_modificari",
    description: "Încheie tura: răspunsul pentru utilizator și modificările propuse (pot lipsi). Codul verifică fiecare modificare pe textul documentului.",
    inputSchema: ANSWER_SCHEMA,
    input: Answer,
    run: ({ raspuns, modificari }) => {
      attempts++;
      const retry = attempts < MAX_ATTEMPTS;
      // un răspuns care anunță o modificare fără s-o propună: utilizatorul n-ar avea ce aplica
      if (!modificari.length && retry && announcesChange(raspuns)) return { content: MISSING_CHANGES_ERROR, isError: true };
      const check = validate(modificari);
      if (!check.ok) {
        if (retry) {
          return { content: `Răspunsul NU a fost acceptat încă. Probleme de validare:\n- ${check.errors.join("\n- ")}\nCorectează și apelează din nou propune_modificari cu lista completă.`, isError: true };
        }
        // după ultima încercare: răspunsul ajunge la utilizator fără modificările invalide (pe rând, ca să nu se suprapună)
        const valid: ProposedChange[] = [];
        for (const m of modificari) if (validate([...valid, m]).ok) valid.push(m);
        const recheck = validate(valid);
        const kept = recheck.ok ? recheck.proposals : [];
        const dropped = modificari.length - kept.length;
        accepted = { raspuns: `${raspuns.trim()}${dropped ? `\n\n(${dropped === 1 ? "O modificare propusă nu a putut fi verificată pe text și a fost omisă." : `${dropped} modificări propuse nu au putut fi verificate pe text și au fost omise.`})` : ""}`, proposals: kept };
      } else accepted = { raspuns: raspuns.trim(), proposals: check.proposals };
      setImmediate(() => session?.stop());
      return { content: "Răspuns înregistrat. Încheie." };
    },
  });

  const tools = toolsFor(registry, { store: new EvidenceStore(), scope: new RunScope(), signal: ctx.signal, activity, extra: [answer] });
  let turns = 0;
  activity("Citesc documentul");
  ctx.progress({ etapa: "raspuns" });

  session = await ClaudeSession.start({
    model,
    effort: "low",
    maxOutputTokens: 16000,
    system: `${CHAT_SYSTEM}\n\n## Instrumente disponibile\n${tools.map((t) => `- ${t.name}${t.promptLine ? `: ${t.promptLine}` : ""}`).join("\n")}\nInstrumentele apar cu prefixul „mcp__lexai__” (ex. ${mcpToolName("propune_modificari")}).`,
    tools,
    signal: ctx.signal,
    onLimits: (l) => usage.setLimits(l),
    onMessage: (m) => {
      turns++;
      usage.record("chat", m.model, m.usage);
      if (turns === 1 && !accepted) activity("Pregătesc răspunsul");
      if (turns >= MAX_TURNS && !accepted) session?.stop();
    },
  });

  let fallbackText = "";
  try {
    // fișierele de context și celelalte documente ale proiectului, ca la redactare
    const context = projectContextFiles(db, input.documentId);
    const documente = projectDocuments(db, input.documentId);
    const folosite = contextActivity(context.length, documente.length);
    if (folosite) activity(folosite);
    const projectContext = [describeContextFiles(context), describeProjectDocuments(documente)].filter(Boolean);
    let result = await session.send(buildChatRequest({ segments, scope, history, request: user.content, title, pageBreaks, projectContext }));
    fallbackText = result.text;
    // fără apelul final: textul gol cere încheierea, iar unul care anunță modificări le cere concret
    const nudge = !accepted && result.subtype === "success" && !ctx.signal.aborted ? fallbackNudge(result.text) : null;
    if (nudge) {
      result = await session.send(nudge);
      if (result.text.trim()) fallbackText = result.text;
    }
  } finally {
    await session.close();
    ctx.recordUsage(usage.report());
  }
  if (ctx.signal.aborted) throw ctx.signal.reason ?? new Error("Anulat.");
  const done = accepted as { raspuns: string; proposals: ChatProposal[] } | null;
  // fără instrumentul final, dar cu text: e un răspuns fără modificări
  const final = done ?? (fallbackText.trim() ? { raspuns: fallbackText.trim(), proposals: [] } : null);
  if (!final) throw new Error("Asistentul nu a trimis un răspuns. Încearcă din nou.");

  db.update(chatMessages)
    .set({ content: final.raspuns, proposals: final.proposals.length ? JSON.stringify(final.proposals) : null })
    .where(eq(chatMessages.id, input.messageId))
    .run();
  ctx.emit("raspuns", { messageId: input.messageId, modificari: final.proposals.length });
  return { messageId: input.messageId, modificari: final.proposals.length };
};
