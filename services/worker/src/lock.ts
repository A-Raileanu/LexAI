import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { dataDir } from "@lexai/db/paths";

/**
 * Un singur worker pe un dosar de date. Aplicația desktop și `pnpm dev` pot rula în același
 * timp pe aceleași date; al doilea worker ar marca drept întrerupte joburile primului și le-ar prelua
 * în paralel. Lacătul e `worker.pid`: cine îl găsește ținut de un proces viu așteaptă să se
 * elibereze. Un lacăt rămas de la un proces oprit forțat se preia.
 */

const WAIT_MS = 5000;

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

function tryAcquire(file: string): number | null {
  try {
    writeFileSync(file, String(process.pid), { flag: "wx" });
    return null;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  const holder = Number(readFileSync(file, "utf8").trim());
  if (Number.isInteger(holder) && holder > 0 && holder !== process.pid && alive(holder)) return holder;
  // lacăt rămas: îl ștergem și reîncercăm
  rmSync(file, { force: true });
  return tryAcquire(file);
}

export async function acquireWorkerLock(): Promise<void> {
  const file = dataDir("worker.pid");
  let announced = false;
  for (;;) {
    const holder = tryAcquire(file);
    if (holder === null) break;
    if (!announced) console.log(`[worker] alt worker (pid ${holder}) lucrează pe aceleași date; aștept să se oprească`);
    announced = true;
    await new Promise((r) => setTimeout(r, WAIT_MS));
  }
  process.on("exit", () => {
    try {
      if (readFileSync(file, "utf8").trim() === String(process.pid)) rmSync(file, { force: true });
    } catch {
      // deja eliberat
    }
  });
}
