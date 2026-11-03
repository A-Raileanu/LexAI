import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveVersionAt } from "../src/client";
import { parseActPage, parseActionsTable, parseRoDate, parseSearchResults } from "../src/parse";

const fx = (n: string) => readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), "utf8");

describe("parser Portal Legislativ", () => {
  const page = parseActPage(fx("lege31.html"));

  it("citește fișa și formele actului", () => {
    expect(page.versionId).toBe(304533);
    expect(page.emitent).toBe("PARLAMENTUL");
    expect(page.versiuni.find((v) => v.curenta)?.data).toBe("2025-12-18");
    const rep = page.versiuni.filter((v) => v.tip === "republicare");
    expect(rep.map((r) => r.id)).toEqual([56732, 800]);
    expect(rep.every((r) => r.formaDeBaza)).toBe(true);
  });

  it("extrage articole cu alineate, litere, note de modificare și tranzitorii", () => {
    const a7 = page.articole.find((a) => a.numar === "7")!;
    expect(a7.text).toContain("Actul constitutiv al societății în nume colectiv");
    expect(a7.unitati.some((u) => u.tip === "litera" && u.eticheta === "a)")).toBe(true);
    expect(a7.unitati.some((u) => u.tip === "nota_modificare")).toBe(true);
    const a61 = page.articole.find((a) => a.numar === "6^1")!;
    expect(a61.text).toContain("Prin semnarea actului constitutiv");
    const a11 = page.articole.find((a) => a.numar === "11")!;
    expect(a11.text).toContain("[Notă] Articolul VI din LEGEA nr. 239");
  });

  it("citește rezultatele căutării și acțiunile suferite", () => {
    const r = parseSearchResults(fx("cautare31.html"));
    expect(r[0]).toMatchObject({ id: 798, intrareInVigoare: "1990-11-17", descriere: "privind societăţile comerciale" });
    const rows = parseActionsTable(fx("actiuni295.html"));
    expect(rows[0]).toMatchObject({ sectiune: "Actul", operatiune: "ABROGAT DE", actId: 41625 });
  });

  it("interpretează datele în format românesc", () => {
    expect(parseRoDate("Consolidarea din 06.12.2024")).toBe("2024-12-06");
    expect(parseRoDate("17 noiembrie 1990")).toBe("1990-11-17");
  });
});

describe("forma aplicabilă la o dată", () => {
  const page = parseActPage(fx("lege31.html"));
  it("alege ultima formă cu data ≤ data de referință", () => {
    expect(resolveVersionAt(page.versiuni, 798, "1990-11-17", "2010-01-01").version.id).toBe(104814);
    expect(resolveVersionAt(page.versiuni, 798, "1990-11-17", "2026-11-01").version.id).toBe(304533);
  });
  it("folosește forma de bază înaintea primei consolidări", () => {
    const r = resolveVersionAt(page.versiuni, 798, "1990-11-17", "1991-01-01");
    expect(r.version).toMatchObject({ id: 798, tip: "baza", formaDeBaza: true });
    expect(r.inainteDePrimaForma).toBe(false);
  });
  it("semnalează datele anterioare intrării în vigoare", () => {
    expect(resolveVersionAt(page.versiuni, 798, "1990-11-17", "1985-01-01").inainteDePrimaForma).toBe(true);
  });
});
