/** Numele fișierelor exportate: titlul documentului + versiunea („Contract-inchiriere_v3”). */

export const FORBIDDEN_FILENAME = /[/\\:*?"<>|]/;

export function fileStem(title: string): string {
  const s = title
    .normalize("NFC")
    .replace(/[/\\:*?"<>|\u0000-\u001f]+/g, " ")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 120);
  return s || "document";
}

export function versionSuffix(versionNumber: number | null, draft: boolean): string {
  if (versionNumber === null) return draft ? "ciorna" : "";
  return draft ? `v${versionNumber}-ciorna` : `v${versionNumber}`;
}

export function exportFileName(title: string, versionNumber: number | null, draft: boolean, ext = "docx"): string {
  const suffix = versionSuffix(versionNumber, draft);
  return `${fileStem(title)}${suffix ? `_${suffix}` : ""}.${ext}`;
}

/** Fără diacritice și caractere speciale, pentru `filename=` (restul merge în `filename*`). */
export function asciiFileName(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_") || "document"
  );
}

export function contentDisposition(name: string): string {
  return `attachment; filename="${asciiFileName(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
