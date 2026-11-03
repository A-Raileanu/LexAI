import { DEFAULT_APP_ORIGIN, DEFAULT_PORT, HOST, startTerminalServer } from "./server";

/**
 * Punctul de intrare al serviciului terminalului (rulat cu tsx). Next nu poate ține
 * WebSocket-uri în route handlers, de aceea terminalul este un proces separat.
 */

const port = Number(process.env.LEXAI_TERMINAL_PORT) || DEFAULT_PORT;
const appOrigin = process.env.LEXAI_APP_ORIGIN || DEFAULT_APP_ORIGIN;

const server = await startTerminalServer({ port, appOrigin });
console.log(`[terminal] pornit pe ws://${HOST}:${server.port}/pty (origine permisă: ${appOrigin})`);

let stopping = false;

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (stopping) return;
  stopping = true;
  console.log(`[terminal] ${signal}: închid sesiunea și opresc serverul`);
  // dacă PTY-ul nu se închide la timp, ieșim oricum
  setTimeout(() => process.exit(1), 5_000).unref();
  try {
    await server.close();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
