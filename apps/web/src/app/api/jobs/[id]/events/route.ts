import { getDb, getJob, readJobEvents } from "@lexai/db";
import type { NextRequest } from "next/server";

const FINAL = new Set(["finalizat", "esuat", "anulat", "intrerupt"]);
const POLL_MS = 400;

/**
 * Progresul unui job ca Server-Sent Events. Retrimite evenimentele după `after`
 * (sau Last-Event-ID), apoi le transmite pe cele noi pe măsură ce worker-ul le scrie.
 * Fluxul se închide după ce jobul s-a terminat și toate evenimentele au fost trimise.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/jobs/[id]/events">) {
  const { id } = await ctx.params;
  const db = getDb();
  if (!getJob(db, id)) return Response.json({ eroare: "Jobul nu există." }, { status: 404 });

  let after = Number(req.headers.get("last-event-id") ?? req.nextUrl.searchParams.get("after") ?? 0) || 0;
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          return false;
        }
      };
      const pump = () => {
        const job = getJob(db, id);
        const events = readJobEvents(db, id, after);
        for (const e of events) {
          if (!send(`id: ${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e.payload)}\n\n`)) return;
          after = e.seq;
        }
        if (!job || (FINAL.has(job.status) && events.length === 0)) {
          send(`event: sfarsit\ndata: ${JSON.stringify({ status: job?.status ?? "necunoscut", eroare: job?.error ?? null })}\n\n`);
          controller.close();
          return;
        }
        // comentariu periodic: ține conexiunea deschisă prin proxy-uri
        if (!events.length) send(": ping\n\n");
        timer = setTimeout(pump, POLL_MS);
      };
      send("retry: 2000\n\n");
      pump();
    },
    cancel() {
      clearTimeout(timer);
    },
  });

  req.signal.addEventListener("abort", () => clearTimeout(timer));
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
