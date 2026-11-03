/**
 * @lexai/source-portal-legislativ — sursa „Portalul Legislativ” (legislatie.just.ro):
 * căutarea actelor, fișa și formele actului, articolul la o dată, căutarea în act.
 */
export { createPortalLegislativSource, findArticle, type PortalSourceOptions } from "./source";
export {
  PORTAL_HOSTS,
  PORTAL_ORIGIN,
  PORTAL_SOURCE_ID,
  PortalClient,
  PortalError,
  actUrl,
  isPortalUrl,
  resolveVersionAt,
  type ActPageOutcome,
  type PortalClientOptions,
  type ResolvedVersion,
  type SearchOutcome,
  type SearchParams,
} from "./client";
export * from "./parse";
