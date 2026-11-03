import { randomBytes } from "node:crypto";

/** Identificator scurt, sortabil aproximativ după timp (prefix de tip pentru lizibilitate). */
export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(6).toString("base64url")}`;
}
