import { checkTerminalHealth } from "@/features/terminal/service";

/** Starea serviciului de terminal, pentru „Verifică din nou” din pagina terminalului. */
export async function GET() {
  return Response.json(await checkTerminalHealth(), { headers: { "Cache-Control": "no-store" } });
}
