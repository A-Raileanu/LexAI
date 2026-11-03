import { EvidenceStore, SourceRegistry, toolsFor, type FetchFn } from "@lexai/sources";
import { describe, expect, it } from "vitest";
import { WEB_OFICIAL_SOURCE_ID, createWebOficialSource, isAllowedSourceUrl, pageText } from "../src";

const PAGE = `<html><head><title>Codul civil - art. 2517</title><script>var x=1</script></head>
<body><nav>Meniu</nav><main><h1>Art. 2517</h1><p>Termenul   prescripției este de <b>3 ani</b>.</p><div>Alt paragraf</div></main><footer>Subsol</footer></body></html>`;

function fakeFetch() {
  const requests: string[] = [];
  const fetchFn: FetchFn = async (url) => {
    requests.push(url);
    return new Response(url.includes("gol") ? "<html><body><nav>x</nav></body></html>" : PAGE);
  };
  return { requests, fetchFn };
}

describe("domeniile oficiale", () => {
  it("acceptă doar https pe domeniile oficiale, cu subdomeniile lor", () => {
    expect(isAllowedSourceUrl("https://www.cdep.ro/pls/legis/x")).toBe(true);
    expect(isAllowedSourceUrl("https://mfinante.gov.ro/legislatie")).toBe(true);
    expect(isAllowedSourceUrl("https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2023.htm")).toBe(true);
    expect(isAllowedSourceUrl("http://www.cdep.ro/x")).toBe(false);
    expect(isAllowedSourceUrl("https://blog-juridic.ro/x")).toBe(false);
    expect(isAllowedSourceUrl("https://cdep.ro.exemplu.com/x")).toBe(false);
    expect(isAllowedSourceUrl("nu e url")).toBe(false);
  });

  it("respinge site-urile care blochează accesul automat, chiar sub un domeniu acceptat", () => {
    // verificarea din 1.11.2026: AI blocat prin robots.txt, CAPTCHA sau WAF
    for (const url of [
      "https://www.csm1909.ro/",
      "https://www.rejust.ro/",
      "https://eur-lex.europa.eu/legal-content/RO/TXT/",
      "https://curia.europa.eu/juris/",
      "https://portal.just.ro/",
      "https://rnong.just.ro/",
      "https://e-consultare.gov.ro/",
      "https://curs.bnr.ro/nbrfxrates.xml",
      "https://www.anaf.ro/anaf/internet/ANAF/",
      "https://www.onrc.ro/",
    ]) {
      expect(isAllowedSourceUrl(url), url).toBe(false);
    }
    // gazdele surori rămân acceptate
    expect(isAllowedSourceUrl("https://legislatie.just.ro/Public/DetaliiDocument/1")).toBe(true);
    expect(isAllowedSourceUrl("https://sgg.gov.ro/1/")).toBe(true);
    expect(isAllowedSourceUrl("https://www.bnr.ro/")).toBe(true);
  });

  it("permite HTTP doar site-urilor oficiale care nu funcționează pe HTTPS", () => {
    expect(isAllowedSourceUrl("http://www.cnsc.ro/decizii/")).toBe(true);
    expect(isAllowedSourceUrl("http://www.ccr.ro/")).toBe(false);
  });

  it("extrage textul lizibil al paginii, fără navigare și scripturi", () => {
    const { titlu, text } = pageText(PAGE);
    expect(titlu).toBe("Codul civil - art. 2517");
    expect(text).toBe("Art. 2517\nTermenul prescripției este de 3 ani.\nAlt paragraf");
  });
});

describe("sursa paginilor web oficiale", () => {
  it("citește pagina și o întoarce ca dovadă", async () => {
    const { fetchFn, requests } = fakeFetch();
    const src = createWebOficialSource({ fetch: fetchFn });
    const activitati: string[] = [];
    const r = await src.citestePagina!({ url: "https://www.cdep.ro/pls/legis/x?id=1" }, { state: new Map(), activity: (m) => activitati.push(m) });
    expect(r.dovada).toMatchObject({ type: "sursa_web", unitate: "Codul civil - art. 2517", url: "https://www.cdep.ro/pls/legis/x?id=1" });
    expect(r.dovada.text).toContain("Termenul prescripției este de 3 ani.");
    expect(activitati).toEqual(["Citesc pagina: https://www.cdep.ro/pls/legis/x?id=1"]);
    await src.citestePagina!({ url: "https://www.cdep.ro/pls/legis/x?id=1" }, { state: new Map() });
    expect(requests).toHaveLength(1);
  });

  it("refuză domeniile neoficiale, PDF-urile și paginile fără text", async () => {
    const { fetchFn, requests } = fakeFetch();
    const src = createWebOficialSource({ fetch: fetchFn });
    const ctx = { state: new Map() };
    await expect(src.citestePagina!({ url: "https://blog-juridic.ro/x" }, ctx)).rejects.toMatchObject({ kind: "refuz" });
    await expect(src.citestePagina!({ url: "https://www.ccr.ro/decizie.pdf" }, ctx)).rejects.toThrow("PDF");
    await expect(src.citestePagina!({ url: "https://www.ccr.ro/gol" }, ctx)).rejects.toThrow("nu conține text lizibil");
    expect(requests).toEqual(["https://www.ccr.ro/gol"]);
  });

  it("oferă instrumentul web_fetch; dovezile sunt validate după domeniu", async () => {
    const { fetchFn } = fakeFetch();
    const registry = new SourceRegistry([createWebOficialSource({ fetch: fetchFn })]);
    const store = new EvidenceStore();
    const [tool] = toolsFor(registry, { store });
    expect(tool.name).toBe("web_fetch");
    const out = JSON.parse((await tool.run({ url: "https://legislatie.just.ro/Public/DetaliiDocument/1" })).content);
    expect(store.get(out.url)).toMatchObject({ id: out.evidence_id, sourceId: WEB_OFICIAL_SOURCE_ID });
    expect(registry.trusts(store.get(out.evidence_id)!)).toBe(true);
    expect(registry.trusts({ sourceId: WEB_OFICIAL_SOURCE_ID, url: "https://blog-juridic.ro/x" })).toBe(false);
    const refused = await tool.run({ url: "https://blog-juridic.ro/x" });
    expect(refused.isError).toBe(true);
  });
});
