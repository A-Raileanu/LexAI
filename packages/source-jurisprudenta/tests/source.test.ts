import { readFileSync } from "node:fs";
import { EvidenceStore, SourceRegistry, toolsFor, type FetchFn } from "@lexai/sources";
import { describe, expect, it } from "vitest";
import { JURISPRUDENTA_SOURCE_ID, createJurisprudentaSource, passages } from "../src";

const fx = (n: string) => readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), "utf8");

const DOC_TYPES = `<select id="DocumentType"><option value="1">LEGE</option><option value="7">DECIZIE</option></select>`;
const SCJ = `<table><tbody>
<tr><td>1</td><td>Completul pentru dezlegarea unor chestiuni de drept</td><td><a href="/1093/Detalii-jurisprudenta?customQuery%5B0%5D.Key=id&customQuery%5B0%5D.Value=239658">Decizia nr. 12/2024</a></td><td>18.03.2024</td><td>Dezlegarea unor chestiuni de drept privind art. 268 Codul muncii</td></tr>
</tbody></table>`;

function fakeFetch() {
  const requests: string[] = [];
  const fetchFn: FetchFn = async (url) => {
    requests.push(url);
    const u = new URL(url);
    if (u.hostname === "www.scj.ro") return new Response(SCJ);
    if (u.hostname !== "legislatie.just.ro") throw new Error(`cerere neașteptată: ${url}`);
    if (u.pathname === "/Public/Acasa") return new Response(DOC_TYPES);
    if (u.pathname === "/Public/RezultateCautare") return new Response(fx("cautare31.html"));
    if (u.pathname === "/Public/DetaliiDocument/174157") return new Response(fx("decizie-ccr-684-2015.html"));
    return new Response("", { status: 404 });
  };
  return { requests, fetchFn };
}

describe("sursa de jurisprudență", () => {
  it("citește o decizie cu soluția, dispozitivul și pasajele cerute, ca dovadă", async () => {
    const { fetchFn } = fakeFetch();
    const src = createJurisprudentaSource({ fetch: fetchFn });
    const r = await src.citesteDecizie!({ id: "174157", expresie: "excepției de neconstituționalitate" }, { state: new Map() });
    expect(r.decizie).toMatchObject({ id: "174157", fel: "ccr_exceptie", solutie: "respinsă ca inadmisibilă", url: "https://legislatie.just.ro/Public/DetaliiDocument/174157" });
    expect(r.dovada).toMatchObject({ type: "decizie", unitate: "DECIZIE nr. 684 din 20 octombrie 2015 (CCR – excepție de neconstituționalitate)" });
    expect(r.dovada.text).toContain("Pe rol se află soluționarea excepției");
    expect(r.pasaje.length).toBeGreaterThan(0);
    expect(r.pasaje.every((p) => r.dovada.text.includes(p))).toBe(true);
    await expect(src.citesteDecizie!({ id: "abc", expresie: null }, { state: new Map() })).rejects.toMatchObject({ kind: "refuz" });
  });

  it("caută deciziile unui act pe portal și, la cerere, pe scj.ro", async () => {
    const { fetchFn, requests } = fakeFetch();
    const src = createJurisprudentaSource({ fetch: fetchFn });
    const r = await src.cautaDecizii!({ numar: "31", an: "1990", cod: null, articol: null, instanta: null, expresie: "art. 268 Codul muncii" }, { state: new Map() });
    expect(requests.some((u) => u.includes("titlu=nr.%2031%2F1990") && u.includes("tipdoc=7"))).toBe(true);
    expect(r.rezultate[0]).toMatchObject({ id: "798", url: "https://legislatie.just.ro/Public/DetaliiDocument/798" });
    const iccj = r.rezultate.find((d) => d.id === "iccj:239658");
    expect(iccj).toMatchObject({ instanta: "iccj", fel: "iccj_hp", data: "2024-03-18" });
    expect(r.total).toBe(1);
  });

  it("găsește deciziile codurilor și după legea de aprobare", async () => {
    const { fetchFn, requests } = fakeFetch();
    const src = createJurisprudentaSource({ fetch: fetchFn });
    await src.cautaDecizii!({ numar: "53", an: "2003", cod: null, articol: null, instanta: "ccr", expresie: null }, { state: new Map() });
    expect(requests.some((u) => u.includes("titlu=codul%20muncii"))).toBe(true);
    expect(requests.some((u) => u.includes("titlu=nr.%2053%2F2003"))).toBe(true);
    expect(requests.some((u) => u.includes("scj.ro"))).toBe(false);
    await expect(src.cautaDecizii!({ numar: null, an: null, cod: null, articol: null, instanta: null, expresie: null }, { state: new Map() })).rejects.toMatchObject({ kind: "refuz" });
  });

  it("oferă agentului cauta_decizii și citeste_decizie, cu dovezi atribuite sursei", async () => {
    const { fetchFn } = fakeFetch();
    const registry = new SourceRegistry([createJurisprudentaSource({ fetch: fetchFn })]);
    const store = new EvidenceStore();
    const tools = new Map(toolsFor(registry, { store }).map((t) => [t.name, t]));
    expect([...tools.keys()]).toEqual(["cauta_decizii", "citeste_decizie"]);
    const out = JSON.parse((await tools.get("citeste_decizie")!.run({ decizie_id: "174157", expresie: null })).content);
    expect(out).toMatchObject({ evidence_id: "E1", solutie: "respinsă ca inadmisibilă" });
    expect(out.dispozitiv).toMatch(/^DECIDE:/);
    expect(store.get("E1")).toMatchObject({ sourceId: JURISPRUDENTA_SOURCE_ID, type: "decizie" });
    expect(registry.trusts(store.get("E1")!)).toBe(true);
  });

  it("extrage pasajele care conțin o expresie, indiferent de diacritice", () => {
    const text = "Primul rând.\nCurtea reține că excepția de neconstituționalitate este inadmisibilă.\nAlt rând.";
    expect(passages(text, "exceptia de neconstitutionalitate")).toEqual([text]);
    expect(passages(text, "nu apare")).toEqual([]);
  });
});

describe("căutarea pe scj.ro", () => {
  it("trimite formularul complet (16 câmpuri) prin POST, ca site-ul, și citește rezultatele", async () => {
    const posts: { url: string; method?: string; body: URLSearchParams }[] = [];
    const fetchFn: FetchFn = async (url, init) => {
      posts.push({ url, method: init?.method, body: new URLSearchParams(String(init?.body ?? "")) });
      return new Response(SCJ);
    };
    const { JurisprudentaClient, SCJ_SEARCH_KEYS } = await import("../src");
    const client = new JurisprudentaClient({ fetch: fetchFn });
    const r = await client.searchScj("concediere", "hp", { an: "2024" });
    expect(posts).toHaveLength(1);
    const { url, method, body } = posts[0];
    expect(url).toBe("https://www.scj.ro/736/Cautare-jurisprudenta");
    expect(method).toBe("POST");
    expect(SCJ_SEARCH_KEYS.map((_, i) => body.get(`CustomQuery[${i}].Key`))).toEqual([...SCJ_SEARCH_KEYS]);
    const value = (k: string) => body.get(`CustomQuery[${SCJ_SEARCH_KEYS.indexOf(k as never)}].Value`);
    expect([value("Keywords"), value("Department"), value("DecisionYear"), value("AndOr"), value("DocumentType")]).toEqual(["concediere", "202", "2024", "0", ""]);
    expect(body.get("formTypeId")).toBe("6");
    expect(r.rezultate[0]).toMatchObject({ id: "iccj:239658", instanta: "iccj", data: "2024-03-18" });

    // același formular: răspunsul vine din cache, fără o nouă cerere
    await client.searchScj("concediere", "hp", { an: "2024" });
    expect(posts).toHaveLength(1);
    // RIL caută în ambele complete (RIL și vechile Secții Unite)
    await client.searchScj("concediere", "ril");
    expect(posts.slice(1).map((p) => p.body.get("CustomQuery[1].Value"))).toEqual(["210", "163"]);
  });
});
