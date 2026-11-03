/**
 * @lexai/source-jurisprudenta — deciziile CCR și ÎCCJ (HP, RIL): căutare și citire,
 * de pe Portalul Legislativ și scj.ro.
 */
export { createJurisprudentaSource, type JurisprudentaSourceOptions } from "./source";
export {
  CODE_LAWS,
  JURISPRUDENTA_HOSTS,
  JURISPRUDENTA_SOURCE_ID,
  JurisprudentaClient,
  classifyDecision,
  htmlToText,
  parsePortalDecision,
  parseScjDecision,
  passages,
  SCJ_SEARCH_KEYS,
  scjDecisionUrl,
  scjSearchBody,
  solutieDin,
  type DecisionQuery,
  type DecisionSearchResult,
  type DecizieGasita,
  type DecizieText,
  type FelDecizie,
  type Instanta,
  type JurisprudentaClientOptions,
  type ScjSearchKey,
} from "./decizii";
export { parseSearchCount, parseSearchResults, portalUrl } from "./portal-search";
