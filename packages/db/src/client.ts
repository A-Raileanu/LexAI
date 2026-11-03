import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { dataDir, repoRoot } from "./paths";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

/**
 * Conexiunea SQLite (WAL: web-ul, worker-ul și scripturile scriu în paralel).
 * Migrările rulează la prima deschidere. Instanța e păstrată pe globalThis ca să
 * supraviețuiască reîncărcării modulelor în `next dev`.
 */
const g = globalThis as unknown as { __lexaiDb?: { db: Db; sqlite: Database.Database } };

const runMigrations = (db: Db) => migrate(db, { migrationsFolder: path.join(repoRoot(), "packages", "db", "drizzle") });

export function openDatabase(file = process.env.LEXAI_DB_FILE || dataDir("lexai.db")) {
  const sqlite = new Database(file);
  // întâi așteptarea la blocare: la prima pornire web-ul și worker-ul creează baza în același timp,
  // iar trecerea la WAL cere acces exclusiv
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("synchronous = NORMAL");
  const db = drizzle(sqlite, { schema });
  runMigrations(db);
  return { db, sqlite };
}

/** Migrările au rulat în această evaluare a modulului (după o reîncărcare, și pe conexiunea păstrată). */
let migrated = false;

export function getDb(): Db {
  if (!g.__lexaiDb) g.__lexaiDb = openDatabase();
  else if (!migrated) runMigrations(g.__lexaiDb.db);
  migrated = true;
  return g.__lexaiDb.db;
}

export function getSqlite(): Database.Database {
  getDb();
  return g.__lexaiDb!.sqlite;
}
