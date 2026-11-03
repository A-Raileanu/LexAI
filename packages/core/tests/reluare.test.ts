import { describe, expect, it } from "vitest";
import { pendingReferences } from "../src/analysis/findings";
import { parseUnit, prefetchSources } from "../src/analysis/prefetch";
import { documentTools } from "../src/analysis/tools";
import type { Finding, LegalReference } from "../src/types";

const ref = (id: string, over: Partial<LegalReference> = {}): LegalReference => ({
  id,
  segment_id: "s1",
  citat: "art. 11 alin. (1) din Legea nr. 31/1990",
  tip: "explicita",
  act: { tip: "lege", numar: "31", an: "1990", denumire: null },
  unitate: "art. 11 alin. (1)",
  afirmatie: "x",
  ...over,
});

describe("extragerea unității citate", () => {
  it("recunoaște articol, alineat, indice și separator de mii", () => {
    expect(parseUnit("art. 11 alin. (1) lit. b)")).toEqual({ articol: "11", alineat: "1" });
    expect(parseUnit("Articolul 6^1")).toEqual({ articol: "6^1", alineat: null });
    expect(parseUnit("art. 6¹ alin. 2")).toEqual({ articol: "6^1", alineat: "2" });
    expect(parseUnit("art. 2.517 C.civ.")).toEqual({ articol: "2.517", alineat: null });
    expect(parseUnit("Legea nr. 31/1990")).toBeNull();
  });
});

describe("sursele pregătite de server", () => {
  it("citește fișa o dată și articolul la ambele date, pentru actul identificat fără echivoc", async () => {
    const calls: string[] = [];
    const call = async (name: string, input: Record<string, unknown>) => {
      calls.push(`${name}:${input.articol ?? input.numar ?? ""}:${input.data ?? ""}`);
      if (name === "cauta_act") return { content: JSON.stringify({ rezultate: [{ act_id: 798, eticheta: "LEGE 31 16/11/1990" }] }) };
      return { content: `{"evidence_id":"E1","text":"${name}"}` };
    };
    const out = await prefetchSources([ref("T1"), ref("T2", { unitate: "art. 7 lit. d)", citat: "art. 7 lit. d)" })], "2024-03-15", "2026-11-01", call);
    expect(out).toContain("act_id 798");
    expect(calls).toEqual([
      "cauta_act:31:",
      "info_act::2024-03-15",
      "citeste_articol:11:2024-03-15",
      "citeste_articol:11:2026-11-01",
      "citeste_articol:7:2024-03-15",
      "citeste_articol:7:2026-11-01",
    ]);
  });
  it("lasă agentului actele ambigue și trimiterile implicite", async () => {
    const call = async () => ({ content: JSON.stringify({ rezultate: [{ act_id: 1, eticheta: "a" }, { act_id: 2, eticheta: "b" }] }) });
    const out = await prefetchSources([ref("T1"), ref("T2", { tip: "implicita" })], "2026-11-01", "2026-11-01", call);
    expect(out).toContain("T1: identificare automată nereușită");
    expect(out).not.toContain("T2");
  });
});

describe("căutarea în document", () => {
  it("întoarce o fereastră în jurul potrivirii, nu începutul segmentului", async () => {
    const lung = `${"Lorem ipsum dolor sit amet. ".repeat(40)}Penalitatea de întârziere este de 1% pe zi.`;
    const [cauta, citeste] = documentTools([{ id: "s1", text: lung, kind: "paragraf", quality: "ok" }]);
    const r = JSON.parse((await cauta.run({ expresie: "penalitatea de întârziere" })).content);
    expect(r.segmente[0].fragment).toContain("Penalitatea de întârziere este de 1% pe zi.");
    expect(r.segmente[0].fragment.startsWith("[…]")).toBe(true);
    const full = JSON.parse((await citeste.run({ segment_id: "s1", vecine: 0 })).content);
    expect(full.segmente[0].text).toBe(lung);
  });
});

describe("reluarea verificărilor", () => {
  it("reia doar trimiterile fără rezultat sau oprite de o limită, nu și duplicatele", () => {
    const f = (id: string, over: Partial<Finding> = {}) => ({ id: `F-${id}`, referenceId: id, status: "corect", ...over }) as Finding;
    const pending = pendingReferences({
      trimiteri: { references: ["T1", "T2", "T3", "T4", "T5"].map((id) => ref(id)), duplicates: [["T1", ["T5"]]] },
      findings: [f("T1"), f("T2", { status: "neverificat", tipNeverificare: "limita_atinsa" }), f("T3", { status: "neverificat", tipNeverificare: "act_ambiguu" })],
    });
    expect(pending.map((r) => r.id)).toEqual(["T2", "T4"]);
  });
});

describe("instrumentele documentului", () => {
  it("validează intrarea și semnalează segmentele inexistente", async () => {
    const [cauta, citeste] = documentTools([
      { id: "p_a", text: "Primul", kind: "titlu", quality: "ok" },
      { id: "p_b", text: "Al doilea", kind: "paragraf", quality: "ok" },
      { id: "p_c", text: "Al treilea", kind: "tabel", quality: "ok" },
    ]);
    expect((await cauta.run({ expresie: "x" })).content).toMatch(/^INVALID_INPUT/);
    expect(await citeste.run({ segment_id: "p_z", vecine: 0 })).toMatchObject({ isError: true });
    const vecine = JSON.parse((await citeste.run({ segment_id: "p_b", vecine: 1 })).content);
    expect(vecine.segmente.map((s: { segment_id: string }) => s.segment_id)).toEqual(["p_a", "p_b", "p_c"]);
  });
});
