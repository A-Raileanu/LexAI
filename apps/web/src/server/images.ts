import "server-only";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { decodeDataUrl, IMAGE_MIME, sniffImage, type ImageExt, type ImageResolver, type ImageSource } from "@lexai/docx";
import { dataDir } from "@lexai/db";

/**
 * Imaginile din documente (importate din DOCX): fișiere în data/files/imagini/<sha256>.<ext>,
 * deduplicate după conținut și servite de /api/imagini/<nume>. În document rămâne doar adresa,
 * ca versiunile să nu repete octeții imaginii.
 */

export const IMAGE_URL_PREFIX = "/api/imagini/";
const NAME_RE = /^[0-9a-f]{64}\.(png|jpg|gif|bmp|webp)$/;

export function storeImage(img: ImageSource): string {
  const name = `${createHash("sha256").update(img.data).digest("hex")}.${img.ext}`;
  const abs = dataDir("files", "imagini", name);
  if (!existsSync(abs)) writeFileSync(abs, img.data);
  return IMAGE_URL_PREFIX + name;
}

/** Fișierul imaginii cu numele dat, dacă numele e valid și fișierul există. */
export function readImage(name: string): { data: Buffer; mime: string } | null {
  const m = NAME_RE.exec(name);
  if (!m) return null;
  const abs = path.join(dataDir("files", "imagini"), name);
  if (!existsSync(abs)) return null;
  return { data: readFileSync(abs), mime: IMAGE_MIME[m[1] as ImageExt] };
}

/** Octeții imaginii după `src`, pentru export: imaginile salvate de aplicație și data URL-urile. */
export const resolveImage: ImageResolver = (src) => {
  if (src.startsWith("data:")) return decodeDataUrl(src);
  if (!src.startsWith(IMAGE_URL_PREFIX)) return undefined;
  const img = readImage(src.slice(IMAGE_URL_PREFIX.length));
  if (!img) return undefined;
  const data = new Uint8Array(img.data);
  const ext = sniffImage(data);
  return ext ? { data, ext } : undefined;
};
