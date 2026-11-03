import { eq, sql } from "drizzle-orm";
import type { Db } from "./client";
import { newId } from "./ids";
import { documentVersions, documents } from "./schema";

/** Adaugă o versiune nouă documentului și o face curentă (ciorna se golește). */
export function addDocumentVersion(
  db: Db,
  documentId: string,
  content: unknown,
  origin: (typeof documentVersions.$inferSelect)["origin"],
  note?: string | null,
): string {
  const now = Date.now();
  const id = newId("ver");
  db.transaction((tx) => {
    const last = tx
      .select({ n: sql<number>`coalesce(max(${documentVersions.number}), 0)` })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .get();
    tx.insert(documentVersions)
      .values({ id, documentId, number: (last?.n ?? 0) + 1, content: JSON.stringify(content), origin, note: note ?? null, createdAt: now })
      .run();
    tx.update(documents).set({ currentVersionId: id, draftContent: null, draftUpdatedAt: null, updatedAt: now }).where(eq(documents.id, documentId)).run();
  });
  return id;
}
