import { cpSync, existsSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { dataDir } from "../src/paths";
import { getSqlite } from "../src/client";

/** Copie consistentă a bazei de date (API-ul backup al SQLite) și a fișierelor; păstrează ultimele 10. */
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = dataDir("backups", stamp);
await getSqlite().backup(path.join(target, "lexai.db"));
const files = dataDir("files");
if (existsSync(files)) cpSync(files, path.join(target, "files"), { recursive: true });
const all = readdirSync(dataDir("backups")).sort();
for (const old of all.slice(0, Math.max(0, all.length - 10))) rmSync(dataDir("backups", old), { recursive: true, force: true });
console.log(`Backup salvat în ${target}`);
