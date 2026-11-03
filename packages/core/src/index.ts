/**
 * @lexai/core — domeniul analizei juridice, fără framework și fără bază de date:
 * tipuri, text, segmentele documentului, analiza (identificare, verificare cu sursele active,
 * recuperare, reluare), documentul adnotat (PDF), extragerea textului (DOC, PDF, OCR) și redactarea.
 *
 * Subpath-uri fără dependențe de server (utilizabile și în browser): ./types, ./labels,
 * ./document, ./text, ./usage, ./findings.
 */
export * from "./types";
export * from "./labels";
export * from "./usage";
export * from "./text";
export * from "./document";
export { claudeCli, type AiClient, type AiSession, type ClaudeOptions } from "./ai";
export * from "./analysis";
export * from "./report";
export * from "./parse";
export * from "./redactare";
