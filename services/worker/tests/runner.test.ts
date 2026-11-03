import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { aiUsage, claimNextJob, enqueueJob, getJob, markInterruptedJobs, openDatabase, readJobEvents, requestJobCancel, type Db } from "@lexai/db";
import { runJob } from "../src/runner";

let db: Db;
beforeEach(() => {
  db = openDatabase(path.join(mkdtempSync(path.join(tmpdir(), "lexai-jobs-")), "t.db")).db;
});

describe("coada de joburi", () => {
  it("preia joburile în ordine, o singură dată", () => {
    const a = enqueueJob(db, { kind: "analiza", input: { n: 1 } });
    enqueueJob(db, { kind: "analiza", input: { n: 2 } });
    expect(claimNextJob(db)?.id).toBe(a.id);
    expect(getJob(db, a.id)?.status).toBe("in_curs");
    expect(claimNextJob(db)?.input).toBe('{"n":2}');
    expect(claimNextJob(db)).toBeUndefined();
  });

  it("rulează handler-ul, numerotează evenimentele și salvează consumul", async () => {
    const job = enqueueJob(db, { kind: "analiza", input: { x: 1 } });
    await runJob(db, claimNextJob(db)!, {
      analiza: async (ctx) => {
        ctx.emit("etapa", { nume: "identificare" });
        ctx.recordUsage({
          linii: [{ etapa: "verificare", model: "claude-sonnet-5-5", input: 1, cacheWrite: 2, cacheRead: 3, output: 4, apeluri: 1, cautariWeb: 0, costUsd: 0.01 }],
          total: { input: 1, cacheWrite: 2, cacheRead: 3, output: 4, apeluri: 1, cautariWeb: 0, costUsd: 0.01 },
          sursaPreturi: "",
          limite: { cinciOre: { procent: 12, resetLa: "2026-11-01T18:00:00.000Z" }, sapteZile: null, stare: "allowed", actualizatLa: "2026-11-01T15:00:00.000Z" },
        });
        return { gata: (ctx.input as { x: number }).x };
      },
    });
    const done = getJob(db, job.id)!;
    expect(done.status).toBe("finalizat");
    expect(JSON.parse(done.result!)).toEqual({ gata: 1 });
    const events = readJobEvents(db, job.id);
    expect(events.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(events.map((e) => e.type)).toEqual(["stare", "etapa", "stare"]);
    expect(readJobEvents(db, job.id, 2).map((e) => e.seq)).toEqual([3]);
    const usage = db.select().from(aiUsage).all();
    expect(usage[0]).toMatchObject({ jobId: job.id, etapa: "verificare", limit5hPct: 12 });
  });

  it("anularea cerută oprește jobul și îl marchează „anulat”", async () => {
    const job = enqueueJob(db, { kind: "redactare", input: {} });
    const claimed = claimNextJob(db)!;
    const run = runJob(
      db,
      claimed,
      {
        redactare: (ctx) =>
          new Promise((_, reject) => ctx.signal.addEventListener("abort", () => reject(ctx.signal.reason))),
      },
      20,
    );
    requestJobCancel(db, job.id);
    await run;
    expect(getJob(db, job.id)?.status).toBe("anulat");
  });

  it("eroarea handler-ului devine „esuat”; joburile în curs la pornire devin „intrerupt”", async () => {
    const a = enqueueJob(db, { kind: "ocr", input: {} });
    await runJob(db, claimNextJob(db)!, { ocr: async () => { throw new Error("PDF corupt"); } });
    expect(getJob(db, a.id)).toMatchObject({ status: "esuat", error: "PDF corupt" });
    const b = enqueueJob(db, { kind: "ocr", input: {} });
    claimNextJob(db);
    expect(markInterruptedJobs(db)).toBe(1);
    expect(getJob(db, b.id)?.status).toBe("intrerupt");
  });
});
