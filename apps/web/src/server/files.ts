import "server-only";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dataDir, eq, files, getDb, newId } from "@lexai/db";

export type StoredFile = typeof files.$inferSelect;

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/** Salvează un fișier încărcat în data/files/<prefix>/<sha256><ext> (deduplicat după conținut). */
export function storeFile(bytes: Uint8Array, name: string, mime: string): StoredFile {
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const ext = path.extname(name).toLowerCase().replace(/[^.a-z0-9]/g, "");
  const rel = path.join("files", sha256.slice(0, 2), `${sha256}${ext}`);
  const abs = dataDir(rel);
  if (!existsSync(abs)) writeFileSync(abs, bytes);
  const row = { id: newId("fil"), sha256, name, mime, size: bytes.byteLength, path: rel, createdAt: Date.now() };
  getDb().insert(files).values(row).run();
  return row;
}

export function getFile(id: string): StoredFile | undefined {
  return getDb().select().from(files).where(eq(files.id, id)).get();
}

export function readStoredFile(f: StoredFile): Buffer {
  return readFileSync(dataDir(f.path));
}
