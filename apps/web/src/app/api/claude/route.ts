import type { NextRequest } from "next/server";
import { z } from "zod";
import { cancelInstall, cancelLogin, claudeSetupState, sendLoginCode, SetupError, startInstall, startLogin } from "@/server/claude-setup";

const noStore = { "Cache-Control": "no-store" };

const Body = z.discriminatedUnion("actiune", [
  z.object({ actiune: z.literal("instaleaza") }),
  z.object({ actiune: z.literal("anuleaza-instalarea") }),
  z.object({ actiune: z.literal("conecteaza") }),
  z.object({ actiune: z.literal("cod"), cod: z.string().trim().min(1).max(500) }),
  z.object({ actiune: z.literal("anuleaza-conectarea") }),
]);

/** Starea instalării Claude Code și a conectării contului. */
export function GET() {
  return Response.json(claudeSetupState(), { headers: noStore });
}

/** Pornește sau oprește instalarea ori conectarea; proxy.ts respinge cererile din alte origini. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ eroare: "Cerere invalidă." }, { status: 400, headers: noStore });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return Response.json({ eroare: "Cerere invalidă." }, { status: 400, headers: noStore });
  try {
    const a = parsed.data;
    if (a.actiune === "instaleaza") startInstall();
    else if (a.actiune === "anuleaza-instalarea") cancelInstall();
    else if (a.actiune === "conecteaza") startLogin();
    else if (a.actiune === "cod") sendLoginCode(a.cod);
    else cancelLogin();
  } catch (e) {
    if (e instanceof SetupError) return Response.json({ eroare: e.message }, { status: 409, headers: noStore });
    throw e;
  }
  return Response.json(claudeSetupState(), { headers: noStore });
}
