/**
 * Generarea CSV pentru exportul istoricului. Implicit în formatul pe care Excel îl
 * deschide corect în limba română: separator „;”, virgulă zecimală, BOM UTF-8
 * (pentru diacritice) și rânduri încheiate cu CRLF (RFC 4180).
 */

export type CsvValue = string | number | null | undefined;

export interface CsvOptions {
  delimiter?: string;
  decimal?: "," | ".";
  bom?: boolean;
}

function cell(v: CsvValue, delimiter: string, decimal: "," | "."): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    s = String(v);
    if (decimal === ",") s = s.replace(".", ",");
  } else s = v;
  // formulele sunt neutralizate (injecție CSV în Excel)
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return s.includes(delimiter) || /["\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: readonly string[], rows: readonly (readonly CsvValue[])[], opts: CsvOptions = {}): string {
  const delimiter = opts.delimiter ?? ";";
  const decimal = opts.decimal ?? ",";
  const lines = [headers, ...rows].map((r) => r.map((v) => cell(v, delimiter, decimal)).join(delimiter));
  return `${opts.bom === false ? "" : "﻿"}${lines.join("\r\n")}\r\n`;
}
