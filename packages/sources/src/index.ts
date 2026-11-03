/**
 * @lexai/sources — stratul de surse de legislație: interfața `LegalSource`, registrul surselor
 * active, instrumentele agentului generate din capabilități, cache-ul și adaptorul HTTP.
 */
export * from "./types";
export * from "./evidence";
export { MemorySourceCache, cached, type CacheEntry, type SourceCache } from "./cache";
export { fetchText, urlInDomains, USER_AGENT, type FetchFn, type FetchTextOptions } from "./fetch";
export { RunScope, SourceRegistry, type SourceEntry } from "./registry";
export { FEL_DECIZIE_LABELS, TOOL_NAMES, defineTool, toolError, toolsFor, type AgentTool, type ToolOutcome, type ToolsContext } from "./tools";
export { createHttpSource, connectHttpSource, type HttpSourceOptions } from "./http";
export { RESULT_SCHEMAS, EvidenceDraftSchema } from "./schemas";
