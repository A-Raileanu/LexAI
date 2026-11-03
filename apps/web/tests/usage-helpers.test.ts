import { describe, expect, it } from "vitest";
import { bucketize, byJob, byStage, fmtDuration, fmtPct, fmtTokens, fmtUntil, fmtUsd, inRange, rangeStart, totals, type JobInfo, type UsageRow } from "../src/features/usage/aggregate";
import { toCsv } from "../src/features/usage/csv";

const HOUR = 3_600_000;
// un moment fix, la mijlocul unei ore, ca rezultatele să nu depindă de ora rulării
const NOW = new Date(2026, 10, 1, 14, 30).getTime();

function row(over: Partial<UsageRow>): UsageRow {
  return { t: NOW, jobId: null, etapa: "verificare", model: "claude-sonnet-5-5", input: 0, output: 0, cacheRead: 0, cacheWrite: 0, apeluri: 1, cost: 0, l5: null, l7: null, ...over };
}

describe("toCsv", () => {
  it("folosește „;”, virgulă zecimală, BOM și CRLF", () => {
    const csv = toCsv(["Data", "Cost"], [["01.11.2026", 1.4]]);
    expect(csv).toBe("﻿Data;Cost\r\n01.11.2026;1,4\r\n");
  });

  it("pune între ghilimele câmpurile cu separator, ghilimele sau rând nou", () => {
    const csv = toCsv(["a", "b", "c"], [['Cerere "urgentă"', "x;y", "rând\nnou"]], { bom: false });
    expect(csv).toBe('a;b;c\r\n"Cerere ""urgentă""";"x;y";"rând\nnou"\r\n');
  });

  it("neutralizează formulele și lasă goale valorile lipsă", () => {
    expect(toCsv(["f", "n", "u"], [["=SUM(A1)", null, undefined]], { bom: false })).toBe("f;n;u\r\n'=SUM(A1);;\r\n");
    expect(toCsv(["n"], [[-3]], { bom: false })).toBe("n\r\n-3\r\n");
  });

  it("acceptă formatul internațional", () => {
    expect(toCsv(["x", "y"], [[0.5, "a,b"]], { delimiter: ",", decimal: ".", bom: false })).toBe('x,y\r\n0.5,"a,b"\r\n');
  });
});

describe("intervale și găleți", () => {
  it("24 h înseamnă 24 de ore întregi, ora curentă inclusă", () => {
    const start = rangeStart("24h", NOW);
    expect(new Date(start).getMinutes()).toBe(0);
    expect(NOW - start).toBeLessThan(24 * HOUR);
    expect(NOW - start).toBeGreaterThanOrEqual(23 * HOUR);
  });

  it("grupează pe ore și păstrează găleți goale", () => {
    const rows = [row({ t: NOW - 10 * 60_000, input: 100, output: 50, cost: 1, l5: 20 }), row({ t: NOW - 5 * 60_000, cacheRead: 30, cost: 0.5, l5: 35 }), row({ t: NOW - 3 * HOUR, output: 10 })];
    const b = bucketize(rows, "24h", NOW);
    expect(b).toHaveLength(24);
    const last = b.at(-1)!;
    expect(last.tokens).toBe(180);
    expect(last.cache).toBe(30);
    expect(last.cost).toBeCloseTo(1.5);
    expect(last.l5).toBe(35);
    expect(b.at(-4)!.output).toBe(10);
    expect(b.at(-2)!.l5).toBeNull();
  });

  it("grupează pe zile pentru 7 și 30 de zile și ignoră rândurile din afara intervalului", () => {
    const rows = [row({ t: NOW, input: 1 }), row({ t: NOW - 6 * 24 * HOUR, input: 2 }), row({ t: NOW - 40 * 24 * HOUR, input: 99 })];
    const week = bucketize(rows, "7z", NOW);
    expect(week).toHaveLength(7);
    expect(week[0].input).toBe(2);
    expect(week[6].input).toBe(1);
    expect(bucketize(rows, "30z", NOW)).toHaveLength(30);
    expect(inRange(rows, "30z", NOW)).toHaveLength(2);
  });
});

describe("totaluri și defalcări", () => {
  const rows = [
    row({ jobId: "j1", etapa: "verificare", input: 1000, output: 200, cost: 3, l5: 10, l7: 4 }),
    row({ jobId: "j1", etapa: "identificare", input: 500, cost: 1, t: NOW - 60_000 }),
    row({ jobId: "j2", etapa: "ocr", input: 100, cost: 0, t: NOW - HOUR }),
    row({ jobId: null, etapa: "web", input: 10, cost: 0 }),
  ];
  const jobs: JobInfo[] = [
    { id: "j1", kind: "analiza", status: "finalizat", projectId: "p", projectName: "Ionescu SRL", documentId: "d", documentTitle: "Cerere", createdAt: NOW - 2 * 60_000, startedAt: NOW - 100_000, finishedAt: NOW },
    { id: "j2", kind: "ocr", status: "esuat", projectId: null, projectName: null, documentId: null, documentTitle: null, createdAt: NOW - HOUR, startedAt: null, finishedAt: null },
  ];

  it("însumează tokenii și vârfurile limitelor", () => {
    const t = totals(rows);
    expect(t.tokens).toBe(1810);
    expect(t.cost).toBe(4);
    expect(t.peak5).toBe(10);
    expect(t.peak7).toBe(4);
  });

  it("ordonează etapele după cost și calculează procentul", () => {
    const s = byStage(rows);
    expect(s.map((x) => x.etapa)).toEqual(["verificare", "identificare", "ocr", "web"]);
    expect(s[0].share).toBeCloseTo(75);
    expect(s[0].label).toBe("Verificare temeiuri");
  });

  it("grupează pe joburi, cele mai noi primele, cu durata", () => {
    const j = byJob(rows, jobs);
    expect(j.map((x) => x.job.id)).toEqual(["j1", "j2"]);
    expect(j[0].tokens).toBe(1700);
    expect(j[0].durationMs).toBe(100_000);
    expect(j[0].stages).toHaveLength(2);
    expect(j[1].durationMs).toBeNull();
  });
});

describe("formatare", () => {
  it("formatează în stil românesc", () => {
    expect(fmtTokens(950)).toBe("950");
    expect(fmtTokens(182_400)).toBe("182 k");
    expect(fmtTokens(2_400_000)).toBe("2,4 M");
    expect(fmtUsd(1.4)).toBe("1,40 $");
    expect(fmtUsd(0.001)).toBe("< 0,01 $");
    expect(fmtPct(34.4)).toBe("34 %");
    expect(fmtDuration(100_000)).toBe("1m 40s");
    expect(fmtDuration(45_000)).toBe("45s");
    expect(fmtUntil(133 * 60_000)).toBe("în 2 h 13 min");
    expect(fmtUntil(48 * 60_000)).toBe("în 48 min");
  });
});
