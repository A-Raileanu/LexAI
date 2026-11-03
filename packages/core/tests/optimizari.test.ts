import { describe, expect, it } from "vitest";
import { dedupeReferences, groupReferences } from "../src/analysis/identify";
import type { LegalReference } from "../src/types";
import { UsageTracker, mergeUsage } from "../src/usage";

const ref = (id: string, segment: string, citat: string, numar: string, an: string): LegalReference => ({
  id,
  segment_id: segment,
  citat,
  tip: "explicita",
  act: { tip: "lege", numar, an, denumire: null },
  unitate: "art. 7 lit. d)",
  afirmatie: "x",
});

describe("deduplicarea și gruparea trimiterilor", () => {
  const seg = (id: string, text: string) => ({ id, text, kind: "paragraf" as const, quality: "ok" as const });
  it("verifică o singură dată trimiterile identice, în același context", () => {
    const { unique, duplicates } = dedupeReferences(
      [
        ref("T1", "s13", "art. 7 lit. d) din Legea nr. 31/1990", "31", "1990"),
        ref("T2", "s16", "art. 7 lit. d) din Legea nr. 31/1990", "31", "1990"),
        ref("T3", "s20", "art. 7 lit. d) din Legea nr. 53/2003", "53", "2003"),
      ],
      [seg("s13", "art. 7 lit. d) din Legea nr. 31/1990"), seg("s16", "art. 7 lit. d) din Legea nr. 31/1990"), seg("s20", "art. 7 lit. d) din Legea nr. 53/2003")],
    );
    expect(unique.map((r) => r.id)).toEqual(["T1", "T3"]);
    expect(duplicates.get("T1")?.map((r) => r.id)).toEqual(["T2"]);
  });
  it("nu preia verdictul când contextul diferă", () => {
    const { unique } = dedupeReferences(
      [ref("T1", "s1", "conform art. 7 lit. d) din Legea nr. 31/1990", "31", "1990"), ref("T2", "s2", "conform art. 7 lit. d) din Legea nr. 31/1990", "31", "1990")],
      [seg("s1", "Asociatul A aduce aport în natură conform art. 7 lit. d) din Legea nr. 31/1990."), seg("s2", "Administratorul nu poate fi asociat, conform art. 7 lit. d) din Legea nr. 31/1990.")],
    );
    expect(unique.map((r) => r.id)).toEqual(["T1", "T2"]);
  });
  it("comasează grupurile mici într-un singur agent", () => {
    const groups = groupReferences([
      ref("T1", "s1", "a", "123", "2000"),
      ref("T2", "s2", "b", "441", "2006"),
      ref("T3", "s3", "c", "190", "2018"),
      ...Array.from({ length: 4 }, (_, i) => ref(`T${i + 4}`, `s${i + 4}`, `d${i}`, "31", "1990")),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.find((g) => g.references.length === 3)?.cheie).toContain("+");
  });
});

describe("estimarea costului", () => {
  it("calculează costul pe tipuri de tokeni și căutări web", () => {
    const t = new UsageTracker();
    t.record("verificare", "claude-sonnet-5-5", { input_tokens: 1_000_000, output_tokens: 100_000, cache_creation_input_tokens: 0, cache_read_input_tokens: 1_000_000 });
    t.record("web", "claude-sonnet-5-5", { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 3 } });
    const r = t.report();
    // 1M input × $2 + 0,1M output × $10 + 1M citit din cache × $0,10 + 3 căutări × $0,01
    expect(r.total.costUsd).toBeCloseTo(2 + 1 + 0.1 + 0.03, 6);
    expect(mergeUsage(r, r).total.costUsd).toBeCloseTo(2 * 3.13, 6);
  });
});
