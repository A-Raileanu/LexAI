import { getDb, getJob, requestJobCancel } from "@lexai/db";
import type { NextRequest } from "next/server";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/jobs/[id]/cancel">) {
  const { id } = await ctx.params;
  const db = getDb();
  if (!getJob(db, id)) return Response.json({ eroare: "Jobul nu există." }, { status: 404 });
  requestJobCancel(db, id);
  return Response.json({ ok: true });
}
