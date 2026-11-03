import { eq, getDb, markInterruptedAnalyses, markInterruptedJobs, settings } from "@lexai/db";
import { handlers } from "./handlers";
import { acquireWorkerLock } from "./lock";
import { startRunner } from "./runner";

/** Worker-ul de joburi AI (OCR, analiză, reverificare, redactare, chat în editor). */
await acquireWorkerLock();
const db = getDb();
const interrupted = markInterruptedJobs(db);
if (interrupted) console.log(`[worker] ${interrupted} joburi întrerupte la oprirea anterioară`);
markInterruptedAnalyses(db);

const concurrency = () => db.select({ c: settings.workerConcurrency }).from(settings).where(eq(settings.id, 1)).get()?.c ?? 2;
const stop = startRunner(db, handlers, { concurrency });
console.log("[worker] pornit");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, async () => {
    console.log("[worker] se oprește, așteaptă joburile în curs…");
    await stop();
    process.exit(0);
  });
}
