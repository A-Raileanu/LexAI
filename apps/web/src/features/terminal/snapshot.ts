import "server-only";
import { connection } from "next/server";
import { checkTerminalHealth } from "./service";

/** Starea inițială a paginii terminalului: dacă serviciul rulează (citită la fiecare cerere). */
export async function terminalSnapshot(): Promise<{ serviceUp: boolean }> {
  await connection();
  const health = await checkTerminalHealth();
  return { serviceUp: health.ok };
}
