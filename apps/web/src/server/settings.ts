import { eq, settings, type Db } from "@lexai/db";

export type Settings = typeof settings.$inferSelect;

/** Rândul unic de setări (creat la prima citire). */
export function getSettings(db: Db): Settings {
  const row = db.select().from(settings).where(eq(settings.id, 1)).get();
  if (row) return row;
  db.insert(settings).values({ id: 1 }).onConflictDoNothing().run();
  return db.select().from(settings).where(eq(settings.id, 1)).get()!;
}

export function updateSettings(db: Db, values: Partial<Omit<Settings, "id">>) {
  getSettings(db);
  db.update(settings).set(values).where(eq(settings.id, 1)).run();
}
