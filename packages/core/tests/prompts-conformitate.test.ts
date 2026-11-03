import { EvidenceStore, SourceRegistry, toolsFor, urlInDomains, type LegalSource } from "@lexai/sources";
import { describe, expect, it } from "vitest";
import { trustFrom } from "../src/analysis/evidence";
import { DEFAULT_TOOL_LINES, VERIFY_SYSTEM, verifySystem } from "../src/analysis/prompts";
import { documentTools, reportTool } from "../src/analysis/tools";
import { systemFor } from "../src/analysis/verify";
import { renderNotaConformitate, validateTemeiuri } from "../src/redactare/conformitate";

const src = (id: string, caps: LegalSource["capabilities"], description?: string): LegalSource => ({ id, label: id, description, capabilities: caps });

describe("promptul de verificare", () => {
  it("păstrează textul aplicației anterioare pentru instrumentele portalului", () => {
    expect(VERIFY_SYSTEM).toBe(verifySystem({ sources: ["Portalul Legislativ (legislatie.just.ro)"], toolLines: DEFAULT_TOOL_LINES }));
    expect(VERIFY_SYSTEM).toContain("folosind EXCLUSIV textul oficial de pe Portalul Legislativ (legislatie.just.ro)");
    expect(VERIFY_SYSTEM).toContain("## Instrumente\n- cauta_act:");
  });

  it("listează doar instrumentele surselor active și numește sursele", () => {
    const registry = new SourceRegistry([
      src("portal", new Set(["cauta_act", "info_act", "citeste_articol", "cauta_in_act"]), "Portalul Legislativ (legislatie.just.ro)"),
      src("juris", new Set(["cauta_decizii", "citeste_decizie"]), "deciziile CCR și ÎCCJ"),
      src("web", new Set(["citeste_pagina"]), "pagini web oficiale"),
    ]);
    const tools = toolsFor(registry, { store: new EvidenceStore(), exclude: ["citeste_pagina"], extra: [...documentTools([]), reportTool(() => ({ ok: true, message: "" }))] });
    const system = systemFor(tools, registry, false);
    expect(system).toContain("de pe Portalul Legislativ (legislatie.just.ro), deciziile CCR și ÎCCJ, accesat");
    expect(system).toContain("- cauta_decizii:");
    expect(system).toContain("- citeste_decizie:");
    expect(system).not.toContain("A doua verificare");
    // ordinea instrumentelor din aplicația anterioară se păstrează
    const section = system.slice(system.indexOf("## Instrumente"), system.indexOf("## Surse pregătite"));
    const lines = section.split("\n").filter((l) => /^- [a-z_]+:/.test(l)).map((l) => l.split(":")[0]);
    expect(lines.slice(0, 4)).toEqual(["- cauta_act", "- info_act", "- citeste_articol", "- cauta_in_act"]);
    expect(lines.at(-1)).toBe("- raporteaza_constatare");
    expect(systemFor(tools, registry, true)).toContain("A doua verificare: căutare pe web");
  });
});

describe("nota de conformitate", () => {
  it("validează temeiurile cu dovezi și semnalează trimiterile neacoperite", () => {
    const registry = new SourceRegistry([{ ...src("portal", new Set(["citeste_articol"])), trustsUrl: (u: string) => urlInDomains(u, ["legislatie.just.ro"]) }]);
    const store = new EvidenceStore();
    const ev = store.add({
      sourceId: "portal",
      type: "text_articol",
      act: { baseId: 798, titlu: "LEGE nr. 31 din 16 noiembrie 1990", numar: "31", an: "1990" },
      text: "Articolul 11\n(1) Capitalul social nu poate fi mai mic de 500 lei.",
      url: "https://legislatie.just.ro/Public/DetaliiDocument/1",
      accesatLa: "",
      dataReferinta: "2026-11-01",
    });
    const proiect = {
      fisier: "contract.md",
      paragrafe: ["Capitalul social este de 500 lei, conform Legii nr. 31/1990.", "Litigiile se soluționează potrivit Legii nr. 134/2010.", "Sediul: [● adresa]"],
    };
    const c = validateTemeiuri(
      {
        document: "Contract",
        temeiuri: [
          { id: "T1", tip: "temei", norma: "art. 11 din Legea nr. 31/1990", stare: "respectat", explicatie: "Capital minim.", text_clauza: "Capitalul social este de 500 lei", dovezi: [{ evidence_id: ev.id, fragment: "nu poate fi mai mic de 500 lei" }] },
          { id: "T2", tip: "limita", norma: "art. 11", stare: "respectat", explicatie: "x", dovezi: [{ evidence_id: ev.id, fragment: "nu poate fi mai mic de 900 lei" }] },
        ],
      },
      store,
      "2026-11-01",
      proiect,
      trustFrom(registry),
    );
    expect(c.temeiuri[0].erori).toEqual([]);
    expect(c.temeiuri[1].erori.join(" ")).toContain("Fragmentul nu apare");
    expect(c.neacoperite).toEqual([{ paragraf: proiect.paragrafe[1], acte: ["Codul de procedura civila"] }]);
    expect(c.deCompletat).toEqual(["[● adresa]"]);
    const nota = renderNotaConformitate(c, "LexAI");
    expect(nota).toContain("# Notă de conformitate — Contract");
    expect(nota).toContain("„nu poate fi mai mic de 500 lei”");
  });
});
