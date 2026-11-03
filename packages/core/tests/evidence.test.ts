import { SourceRegistry, urlInDomains, type LegalSource } from "@lexai/sources";
import { describe, expect, it } from "vitest";
import { EvidenceStore, trustFrom, validateEvidence } from "../src/analysis/evidence";

const source = (id: string, domains: string[]): LegalSource => ({
  id,
  label: id,
  capabilities: new Set(["citeste_articol"]),
  trustsUrl: (u) => urlInDomains(u, domains),
});

describe("validarea dovezilor de către cod", () => {
  const registry = new SourceRegistry([source("portal", ["legislatie.just.ro"]), source("web", ["cdep.ro"])]);
  const trusts = trustFrom(registry);
  const store = new EvidenceStore();
  const ev = store.add({
    sourceId: "portal",
    type: "text_articol",
    text: "Articolul 11\n(1) Capitalul social al unei societăţi cu răspundere limitată nu poate fi mai mic de 200 lei.\n[Notă de modificare] (la 01-12-2006, ...)",
    url: "https://legislatie.just.ro/Public/DetaliiDocument/104814#id_artA231",
    accesatLa: "2026-11-01T10:00:00Z",
  });
  it("confirmă fragmentele care există în sursă", () => {
    const r = validateEvidence(store, ev.id, "nu poate fi mai mic de 200 lei", trusts);
    expect("validare" in r && r.validare).toBe("confirmata");
  });
  it("respinge fragmentele inventate", () => {
    const r = validateEvidence(store, ev.id, "nu poate fi mai mic de 500 lei", trusts);
    expect("validare" in r && r.validare).toBe("respinsa");
  });
  it("respinge dovezile inexistente sau din surse nepermise", () => {
    expect("error" in validateEvidence(store, "E999", "x", trusts)).toBe(true);
    const bad = store.add({ sourceId: "portal", type: "text_articol", text: "abc def ghi", url: "https://exemplu.ro/lege", accesatLa: "" });
    const r = validateEvidence(store, bad.id, "abc def", trusts);
    expect("validare" in r && r.validare).toBe("respinsa");
  });
  it("respinge dovezile unei surse dezactivate", () => {
    const local = new SourceRegistry([source("portal", ["legislatie.just.ro"])]);
    expect(validateEvidence(store, ev.id, "200 lei", trustFrom(local))).toMatchObject({ validare: "confirmata" });
    local.setEnabled("portal", false);
    expect(validateEvidence(store, ev.id, "200 lei", trustFrom(local))).toMatchObject({ validare: "respinsa" });
  });
  it("ignoră marcajele de note adăugate în textul pentru agent", () => {
    expect(validateEvidence(store, ev.id, "[Notă de modificare] (la 01-12-2006", trusts)).toMatchObject({ validare: "confirmata" });
    expect(validateEvidence(store, ev.id, "ab", trusts)).toMatchObject({ validare: "respinsa", motivRespingere: "Fragmentul citat lipsește sau este prea scurt." });
  });
});

describe("dovezi web", () => {
  it("acceptă paginile oficiale citite, după URL", () => {
    const registry = new SourceRegistry([source("web", ["cdep.ro"])]);
    const store = new EvidenceStore();
    store.add({ sourceId: "web", type: "sursa_web", text: "Art. 2517. Termenul prescripției este de 3 ani", url: "https://www.cdep.ro/pls/legis/x?id=1", accesatLa: "" });
    const ok = validateEvidence(store, "https://www.cdep.ro/pls/legis/x?id=1", "Termenul prescripției este de 3 ani", trustFrom(registry));
    expect("validare" in ok && ok.validare).toBe("confirmata");
    store.add({ sourceId: "web", type: "sursa_web", text: "Termenul prescripției este de 3 ani", url: "https://blog-juridic.ro/x", accesatLa: "" });
    const bad = validateEvidence(store, "https://blog-juridic.ro/x", "Termenul prescripției este de 3 ani", trustFrom(registry));
    expect("validare" in bad && bad.validare).toBe("respinsa");
  });
  it("fără registru, acceptă doar adrese https", () => {
    const store = new EvidenceStore();
    const e = store.add({ sourceId: "x", type: "sursa_web", text: "abc def", url: "http://site.ro", accesatLa: "" });
    expect(validateEvidence(store, e.id, "abc def")).toMatchObject({ validare: "respinsa" });
  });
});
