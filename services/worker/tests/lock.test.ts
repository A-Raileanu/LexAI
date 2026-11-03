import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { acquireWorkerLock } from "../src/lock";

describe("lacătul worker-ului", () => {
  it("preia un lacăt rămas de la un proces oprit", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "lexai-lock-"));
    vi.stubEnv("LEXAI_DATA_DIR", dir);
    writeFileSync(path.join(dir, "worker.pid"), "999999");
    await acquireWorkerLock();
    expect(readFileSync(path.join(dir, "worker.pid"), "utf8")).toBe(String(process.pid));
    vi.unstubAllEnvs();
  });

  it("așteaptă cât lacătul e ținut de un proces viu", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "lexai-lock-"));
    vi.stubEnv("LEXAI_DATA_DIR", dir);
    // procesul părinte al testelor e viu
    writeFileSync(path.join(dir, "worker.pid"), String(process.ppid));
    const settled = await Promise.race([acquireWorkerLock().then(() => "preluat"), new Promise((r) => setTimeout(() => r("așteaptă"), 300))]);
    expect(settled).toBe("așteaptă");
    vi.unstubAllEnvs();
  });
});
