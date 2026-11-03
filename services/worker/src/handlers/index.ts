import type { JobKind } from "@lexai/db";
import type { JobHandler } from "../runner";
import { analysisHandler } from "./analysis";
import { chatHandler } from "./chat";
import { draftingHandler } from "./drafting";
import { ocrHandler } from "./ocr";

/** Handler-ele pe tipuri de job. */
export const handlers: Partial<Record<JobKind, JobHandler>> = {
  analiza: analysisHandler,
  reverificare: analysisHandler,
  ocr: ocrHandler,
  redactare: draftingHandler,
  chat: chatHandler,
};
