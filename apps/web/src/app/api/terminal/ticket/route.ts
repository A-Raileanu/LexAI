import { signTicket } from "@lexai/terminal/ticket";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { SERVICE_DOWN } from "@/features/terminal/modes";
import { checkTerminalHealth, terminalWsUrl } from "@/features/terminal/service";

const Body = z.object({ mode: z.enum(["claude", "auth-login", "auth-logout", "auth-status"]) });

const noStore = { "Cache-Control": "no-store" };

/**
 * Emite un tichet de unică folosință pentru serviciul de terminal; modul vine dintr-o listă fixă.
 * Cererile din alte origini sunt respinse în proxy.ts, deci doar interfața aplicației primește tichete.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ eroare: "Cerere invalidă." }, { status: 400, headers: noStore });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return Response.json({ eroare: "Mod de terminal necunoscut." }, { status: 400, headers: noStore });

  const health = await checkTerminalHealth();
  if (!health.ok) return Response.json({ eroare: SERVICE_DOWN, cod: "serviciu" }, { status: 503, headers: noStore });

  return Response.json({ ticket: signTicket({ mode: parsed.data.mode }), url: terminalWsUrl() }, { headers: noStore });
}
