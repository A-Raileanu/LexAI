import { readFileSync } from "node:fs";
import { EvidenceStore, MemorySourceCache, RunScope, SourceRegistry, toolsFor, type FetchFn, type SourceCallContext } from "@lexai/sources";
import { describe, expect, it } from "vitest";
import { PORTAL_SOURCE_ID, createPortalLegislativSource, findArticle } from "../src";

const fx = (n: string) => readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), "utf8");

const DOC_TYPES = `<select id="DocumentType"><option value="">Toate</option><option value="1">LEGE</option><option value="2">ORDONANȚĂ DE URGENȚĂ</option><option value="10">CODUL CIVIL</option><option value="11">COD</option></select>`;

/** Portalul simulat din fixture-uri: nicio cerere nu iese în rețea. */
function fakePortal() {
  const requests: string[] = [];
  const fetchFn: FetchFn = async (url, init) => {
    requests.push(`${init?.method ?? "GET"} ${url}`);
    const u = new URL(url);
    if (u.hostname !== "legislatie.just.ro") throw new Error(`cerere neașteptată: ${url}`);
    if (u.pathname === "/Public/Acasa") return new Response(DOC_TYPES);
    if (u.pathname === "/Public/RezultateCautare") return new Response(fx("cautare31.html"));
    if (u.pathname.startsWith("/Public/DetaliiDocument/")) return new Response(fx("lege31.html"));
    if (u.pathname === "/Public/actiuniSuferite") return new Response(JSON.stringify({ acte: fx("actiuni295.html") }));
    return new Response("", { status: 404 });
  };
  return { requests, fetchFn };
}

const ctx = (): SourceCallContext & { activitati: string[] } => {
  const activitati: string[] = [];
  return { state: new Map(), activity: (m) => activitati.push(m), activitati };
};

describe("sursa Portalul Legislativ", () => {
  it("caută actele și păstrează metadatele pentru analiză", async () => {
    const { fetchFn, requests } = fakePortal();
    const src = createPortalLegislativSource({ fetch: fetchFn });
    const c = ctx();
    const r = await src.cautaAct!({ tip: "lege", numar: "31", an: "1990", titlu: null, text: null, inVigoareLa: null }, c);
    expect(r.rezultate[0]).toMatchObject({ actId: 798, eticheta: "LEGE 31 16/11/1990", intrareInVigoare: "1990-11-17" });
    expect(r.url).toContain("tipdoc=1");
    expect(r.url).toContain("numardoc=31-1990");
    expect(r.dovada).toBeUndefined();
    expect(c.activitati[0]).toContain("Caut pe Portalul Legislativ");
    expect((c.state.get("actMeta") as Map<number, unknown>).has(798)).toBe(true);
    // a doua căutare vine din cache
    const n = requests.length;
    await src.cautaAct!({ tip: "lege", numar: "31", an: "1990", titlu: null, text: null, inVigoareLa: null }, ctx());
    expect(requests.length).toBe(n);
  });

  it("citește articolul în forma aplicabilă la dată, cu dovada completă", async () => {
    const { fetchFn } = fakePortal();
    const src = createPortalLegislativSource({ fetch: fetchFn });
    const c = ctx();
    await src.cautaAct!({ tip: "lege", numar: "31", an: "1990", titlu: null, text: null, inVigoareLa: null }, c);
    const r = await src.citesteArticol!({ actId: 798, articol: "11", alineat: "1", data: "2026-11-01" }, c);
    if (!r.gasit) throw new Error("articolul ar trebui găsit");
    expect(r.dovada).toMatchObject({ type: "text_articol", unitate: "art. 11", dataReferinta: "2026-11-01", ultimaFormaId: 304533 });
    expect(r.dovada.url).toBe("https://legislatie.just.ro/Public/DetaliiDocument/304533#id_artA266");
    expect(r.dovada.versiune).toMatchObject({ id: 304533, tip: "consolidare", eticheta: "Consolidare 18.12.2025" });
    expect(r.dovada.act).toMatchObject({ baseId: 798, tip: "LEGE", numar: "31", an: "1990" });
    // agentul primește doar alineatul cerut; dovada păstrează tot articolul
    expect(r.text).toContain("(1) Capitalul social");
    expect(r.text).not.toContain("(2) Părțile sociale");
    expect(r.dovada.text).toContain("(2) Părțile sociale");

    const vechi = await src.citesteArticol!({ actId: 798, articol: "11", alineat: null, data: "2010-01-01" }, c);
    expect(!("redirect" in vechi) && vechi.dovada.versiune?.id).toBe(104814);
  });

  it("dă o dovadă de inexistență pentru articolele care lipsesc", async () => {
    const { fetchFn } = fakePortal();
    const src = createPortalLegislativSource({ fetch: fetchFn });
    const r = await src.citesteArticol!({ actId: 798, articol: "999", alineat: null, data: "2026-11-01" }, ctx());
    expect(r.gasit).toBe(false);
    if ("redirect" in r) throw new Error("fără redirecționare");
    expect(r.dovada.type).toBe("articol_inexistent");
    expect(r.text).toContain("Articolul 999 NU există în această formă a actului.");
  });

  it("întoarce fișa actului cu formele și acțiunile suferite", async () => {
    const { fetchFn } = fakePortal();
    const src = createPortalLegislativSource({ fetch: fetchFn });
    const r = await src.infoAct!({ actId: 798, data: "2024-03-15" }, ctx());
    expect(r.fisa.type).toBe("fisa_act");
    expect(r.fisa.text).toContain("Forma aplicabilă la 15.03.2024: Consolidare");
    expect(r.fisa.text).toContain("Cea mai recentă formă: 18.12.2025 [id 304533]");
    expect(r.actiuni?.text).toContain("- Actul: ABROGAT DE LEGE 53 24/01/2003");
    expect(r.nota).toContain("Actul figurează ca abrogat");
  });

  it("caută o expresie în articolele actului", async () => {
    const { fetchFn } = fakePortal();
    const src = createPortalLegislativSource({ fetch: fetchFn });
    const r = await src.cautaInAct!({ actId: 798, expresie: "capitalul social al unei societăți cu răspundere limitată", data: "2026-11-01" }, ctx());
    expect(r.rezultate.length).toBeGreaterThan(0);
    expect(r.rezultate.map((x) => x.articol)).toContain("11");
    expect(r.rezultate.every((x) => x.dovada.type === "text_articol")).toBe(true);
    const nimic = await src.cautaInAct!({ actId: 798, expresie: "zzqx inexistent", data: "2026-11-01" }, ctx());
    expect(nimic.rezultate).toEqual([]);
    expect(nimic.dovada?.type).toBe("cautare_in_act");
  });

  it("funcționează prin registru: dovezile poartă id-ul sursei, iar cache-ul e injectabil", async () => {
    const { fetchFn, requests } = fakePortal();
    const cache = new MemorySourceCache();
    const registry = new SourceRegistry([createPortalLegislativSource({ fetch: fetchFn, cache })]);
    const store = new EvidenceStore();
    const tools = new Map(toolsFor(registry, { store, scope: new RunScope() }).map((t) => [t.name, t]));
    expect([...tools.keys()]).toEqual(["cauta_act", "info_act", "citeste_articol", "cauta_in_act"]);
    const out = JSON.parse((await tools.get("citeste_articol")!.run({ act_id: 798, articol: "11", alineat: null, data: "2026-11-01" })).content);
    expect(out).toMatchObject({ gasit: true, evidence_id: "E1" });
    expect(store.get("E1")?.sourceId).toBe(PORTAL_SOURCE_ID);
    expect(registry.trusts(store.get("E1")!)).toBe(true);
    expect(cache.size).toBeGreaterThan(0);
    // o sursă nouă cu același cache nu mai descarcă paginile
    const n = requests.length;
    const again = createPortalLegislativSource({ fetch: fetchFn, cache });
    await again.citesteArticol!({ actId: 798, articol: "11", alineat: null, data: "2026-11-01" }, ctx());
    expect(requests.length).toBe(n);
  });

  it("asociază numerele de articol cu indicele superior pierdut", () => {
    const arts = [{ numar: "6" }, { numar: "6^1" }, { numar: "7" }];
    expect(findArticle(arts, "art. 6¹")).toEqual({ index: 1, fuzzy: false });
    expect(findArticle(arts, "61")).toEqual({ index: 1, fuzzy: true });
    expect(findArticle(arts, "8").index).toBe(-1);
  });
});
