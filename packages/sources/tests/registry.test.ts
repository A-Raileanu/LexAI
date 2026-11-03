import { describe, expect, it } from "vitest";
import {
  EvidenceStore,
  RunScope,
  SourceError,
  SourceRegistry,
  defineTool,
  toolsFor,
  urlInDomains,
  type Capability,
  type CitesteArticolResult,
  type LegalSource,
} from "../src";
import { z } from "zod";

/** O sursă de test, cu capabilitățile cerute și apelurile înregistrate. */
function fakeSource(id: string, caps: Capability[], over: Partial<LegalSource> = {}): LegalSource & { calls: string[] } {
  const calls: string[] = [];
  const src: LegalSource & { calls: string[] } = {
    id,
    label: `Sursa ${id}`,
    capabilities: new Set(caps),
    calls,
    async cautaAct(p) {
      calls.push(`cauta_act:${p.numar}`);
      return {
        total: 1,
        url: `https://${id}.ro/cautare`,
        accesatLa: "2026-11-01T10:00:00Z",
        rezultate: [
          { actId: 798, eticheta: "LEGE 31 16/11/1990", titlu: "LEGE nr. 31", descriere: "privind societățile", emitent: "PARLAMENTUL", publicat: "MO", intrareInVigoare: "1990-11-17", intrareInVigoareText: "17 noiembrie 1990", republicare: false },
        ],
      };
    },
    async citesteArticol(p): Promise<CitesteArticolResult> {
      calls.push(`citeste_articol:${p.actId}:${p.articol}`);
      return {
        gasit: true,
        abrogat: false,
        text: `Articolul ${p.articol}\n(1) Capitalul social nu poate fi mai mic de 500 lei.`,
        actiuniPeArticol: [],
        dovada: {
          type: "text_articol",
          act: { baseId: p.actId, titlu: "LEGE nr. 31/1990" },
          unitate: `art. ${p.articol}`,
          text: `Articolul ${p.articol}\n(1) Capitalul social nu poate fi mai mic de 500 lei.`,
          url: `https://${id}.ro/act/${p.actId}`,
          accesatLa: "2026-11-01T10:00:00Z",
          dataReferinta: p.data,
        },
      };
    },
    async cautaDecizii() {
      calls.push("cauta_decizii");
      return {
        total: 1,
        complet: true,
        url: `https://${id}.ro/decizii`,
        accesatLa: "",
        rezultate: [{ id: "174157", titlu: "DECIZIE nr. 684", descriere: "referitoare la excepția", instanta: "ccr", fel: "ccr_exceptie", data: "2015-10-20", publicat: "MO", url: `https://${id}.ro/d/174157` }],
      };
    },
    async citestePagina(p) {
      return { url: p.url, titlu: "Pagina", dovada: { type: "sursa_web", text: "Termenul prescripției este de 3 ani", url: p.url, accesatLa: "" } };
    },
    ...over,
  };
  return src;
}

const names = (registry: SourceRegistry, exclude: Capability[] = []) => toolsFor(registry, { store: new EvidenceStore(), exclude }).map((t) => t.name);

describe("registrul surselor", () => {
  it("ordonează sursele după prioritate și ignoră sursele dezactivate", () => {
    const a = fakeSource("a", ["cauta_act"]);
    const b = fakeSource("b", ["cauta_act", "citeste_articol"]);
    const reg = new SourceRegistry([{ source: a, priority: 200 }, { source: b, priority: 10 }]);
    expect(reg.providers("cauta_act").map((s) => s.id)).toEqual(["b", "a"]);
    reg.setEnabled("b", false);
    expect(reg.providers("cauta_act").map((s) => s.id)).toEqual(["a"]);
    expect(reg.has("citeste_articol")).toBe(false);
    expect(reg.get("b")).toBeUndefined();
    expect(reg.list().map((e) => e.source.id)).toEqual(["b", "a"]);
  });

  it("validează dovezile după sursa care le-a furnizat", () => {
    const portal = fakeSource("portal", ["citeste_articol"], { trustsUrl: (u) => urlInDomains(u, ["legislatie.just.ro"]) });
    const reg = new SourceRegistry([portal]);
    expect(reg.trusts({ sourceId: "portal", url: "https://legislatie.just.ro/Public/DetaliiDocument/1" })).toBe(true);
    expect(reg.trusts({ sourceId: "portal", url: "https://exemplu.ro/lege" })).toBe(false);
    expect(reg.trusts({ sourceId: "necunoscuta", url: "https://legislatie.just.ro/x" })).toBe(false);
    // fără sursă: o sursă activă trebuie să garanteze adresa
    expect(reg.trusts({ url: "https://legislatie.just.ro/x" })).toBe(true);
    expect(reg.trusts({ url: "http://legislatie.just.ro/x" })).toBe(false);
  });
});

describe("instrumentele generate din capabilități", () => {
  it("oferă doar instrumentele pentru capabilitățile surselor active, apoi instrumentele suplimentare", () => {
    const extra = defineTool({ name: "raporteaza_constatare", description: "x", inputSchema: { type: "object" }, input: z.object({}), run: () => ({ content: "ok" }) });
    const reg = new SourceRegistry([fakeSource("portal", ["cauta_act", "citeste_articol"])]);
    expect(toolsFor(reg, { store: new EvidenceStore(), extra: [extra] }).map((t) => t.name)).toEqual(["cauta_act", "citeste_articol", "raporteaza_constatare"]);

    reg.register(fakeSource("juris", ["cauta_decizii", "citeste_decizie"]));
    reg.register(fakeSource("web", ["citeste_pagina"]));
    expect(names(reg)).toEqual(["cauta_act", "citeste_articol", "cauta_decizii", "citeste_decizie", "web_fetch"]);
    // citirea paginilor web se poate omite (ex. în afara recuperării pe web)
    expect(names(reg, ["citeste_pagina"])).not.toContain("web_fetch");
    reg.setEnabled("juris", false);
    expect(names(reg)).toEqual(["cauta_act", "citeste_articol", "web_fetch"]);
    expect(names(new SourceRegistry())).toEqual([]);
  });

  it("înregistrează dovezile cu sursa lor și trimite apelurile la sursa care a găsit actul", async () => {
    const goala = fakeSource("goala", ["cauta_act", "citeste_articol"], {
      async cautaAct() {
        return { total: 0, url: "https://goala.ro/c", accesatLa: "", rezultate: [], dovada: { type: "act_negasit", text: "Nimic.", url: "https://goala.ro/c", accesatLa: "" } };
      },
    });
    const plina = fakeSource("plina", ["cauta_act", "citeste_articol"]);
    const reg = new SourceRegistry([{ source: goala, priority: 1 }, { source: plina, priority: 2 }]);
    const store = new EvidenceStore();
    const scope = new RunScope();
    const tools = new Map(toolsFor(reg, { store, scope }).map((t) => [t.name, t]));

    const found = JSON.parse((await tools.get("cauta_act")!.run({ tip: "lege", numar: "31", an: "1990", titlu: null, text: null, in_vigoare_la: null })).content);
    expect(found.rezultate[0].act_id).toBe(798);
    expect(scope.owners.get("act:798")).toBe("plina");

    const art = JSON.parse((await tools.get("citeste_articol")!.run({ act_id: "798", articol: "11", alineat: null, data: "2024-03-15" })).content);
    expect(art.gasit).toBe(true);
    expect(plina.calls).toContain("citeste_articol:798:11");
    expect(goala.calls).toEqual([]);
    const ev = store.get(art.evidence_id)!;
    expect(ev).toMatchObject({ sourceId: "plina", type: "text_articol", dataReferinta: "2024-03-15" });
  });

  it("întoarce dovada de inexistență a primei surse când nicio sursă nu găsește actul", async () => {
    const empty = (id: string) =>
      fakeSource(id, ["cauta_act"], {
        async cautaAct() {
          return { total: 0, url: `https://${id}.ro`, accesatLa: "", rezultate: [], dovada: { type: "act_negasit", text: `Nimic în ${id}.`, url: `https://${id}.ro`, accesatLa: "" } };
        },
      });
    const store = new EvidenceStore();
    const reg = new SourceRegistry([empty("x"), empty("y")]);
    const [tool] = toolsFor(reg, { store });
    const out = JSON.parse((await tool.run({ tip: null, numar: "1", an: "2000", titlu: null, text: null, in_vigoare_la: null })).content);
    expect(out.rezultate).toEqual([]);
    expect(out.nota).toContain("Nimic în x.");
    expect(store.get(out.evidence_id)).toMatchObject({ sourceId: "x", type: "act_negasit" });
  });

  it("transformă erorile în mesaje pentru agent", async () => {
    const failing = fakeSource("f", ["citeste_articol", "citeste_pagina"], {
      async citesteArticol() {
        throw new SourceError("Portalul a răspuns cu 503", { url: "https://f.ro/x" });
      },
      trustsUrl: (u) => u.startsWith("https://oficial.ro/"),
    });
    const tools = new Map(toolsFor(new SourceRegistry([failing]), { store: new EvidenceStore() }).map((t) => [t.name, t]));
    const bad = await tools.get("citeste_articol")!.run({ act_id: 1, articol: "", alineat: null, data: "2024-01-01" });
    expect(bad).toMatchObject({ isError: true });
    expect(bad.content).toMatch(/^INVALID_INPUT/);
    const down = await tools.get("citeste_articol")!.run({ act_id: 1, articol: "5", alineat: null, data: "2024-01-01" });
    expect(down.content).toMatch(/^SURSĂ INDISPONIBILĂ: Portalul a răspuns cu 503 \(https:\/\/f\.ro\/x\)/);
    const refused = await tools.get("web_fetch")!.run({ url: "https://blog.ro/articol" });
    expect(refused).toMatchObject({ isError: true });
    expect(refused.content).toContain("nu aparține unui site oficial acceptat");
    const ok = JSON.parse((await tools.get("web_fetch")!.run({ url: "https://oficial.ro/lege" })).content);
    expect(ok.evidence_id).toBe("E1");
  });

  it("reunește deciziile surselor de jurisprudență", async () => {
    const store = new EvidenceStore();
    const reg = new SourceRegistry([fakeSource("j1", ["cauta_decizii"]), fakeSource("j2", ["cauta_decizii"])]);
    const scope = new RunScope();
    const [tool] = toolsFor(reg, { store, scope });
    const out = JSON.parse((await tool.run({ numar: "31", an: "1990", cod: null, articol: null, instanta: null, expresie: null })).content);
    expect(out.rezultate).toHaveLength(2);
    expect(out.rezultate[0]).toMatchObject({ decizie_id: "174157", instanta: "CCR – excepție de neconstituționalitate" });
    expect(scope.owners.get("decizie:174157")).toBeDefined();
  });
});

describe("registrul de dovezi", () => {
  it("numerotează dovezile, le găsește după URL și le reîncarcă", () => {
    const store = new EvidenceStore();
    const a = store.add({ sourceId: "web", type: "sursa_web", text: "a", url: "https://cdep.ro/x/", accesatLa: "" });
    store.add({ sourceId: "portal", type: "text_articol", text: "b", url: "https://legislatie.just.ro/1", accesatLa: "" });
    expect(store.get("e1")?.id).toBe(a.id);
    expect(store.get("https://cdep.ro/x#sus")?.id).toBe("E1");
    const again = EvidenceStore.from(store.all());
    expect(again.add({ sourceId: "x", type: "decizie", text: "c", url: "https://ccr.ro", accesatLa: "" }).id).toBe("E3");
  });
});
