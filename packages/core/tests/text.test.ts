import { describe, expect, it } from "vitest";
import { locateQuote } from "../src/text/locate";
import { containsLoose, normalizeArticleNumber, normalizeRo } from "../src/text/normalize";

describe("normalizare", () => {
  it("unifică diacriticele cu sedilă și spațiile", () => {
    expect(normalizeRo("societăţi  comerciale şi „acte”")).toBe('societăți comerciale și "acte"');
  });
  it("compară tolerant", () => {
    expect(containsLoose("Capitalul social nu poate fi mai mic de 200 lei", "capitalul SOCIAL nu poate fi")).toBe(true);
    expect(containsLoose("Capitalul social", "capital minim")).toBe(false);
  });
  it("normalizează numerele de articol", () => {
    expect(normalizeArticleNumber("art. 6¹")).toBe("6^1");
    expect(normalizeArticleNumber("Articolul 6^1")).toBe("6^1");
    expect(normalizeArticleNumber("6 ind. 1")).toBe("6^1");
    expect(normalizeArticleNumber("i")).toBe("I");
    expect(normalizeArticleNumber("Articolul 2.517")).toBe("2517");
    expect(normalizeArticleNumber("2517")).toBe("2517");
    expect(normalizeArticleNumber("1.535^1")).toBe("1535^1");
  });
});

describe("localizarea citatelor", () => {
  const text = "Conform art. 11 din Legea nr. 31/1990, capitalul social minim al unui SRL este de 200 lei. Alte clauze.";
  it("găsește potrivirea exactă în textul original", () => {
    const r = locateQuote(text, "capitalul social minim al unui SRL este de 200 lei");
    expect(r.potrivire).toBe("exacta");
    expect(text.slice(r.start, r.end)).toBe("capitalul social minim al unui SRL este de 200 lei");
  });
  it("ignoră diferențele de diacritice și spații", () => {
    const t = "Societăţile  comerciale sînt persoane juridice";
    const r = locateQuote(t, "Societățile comerciale sînt");
    expect(r.potrivire).toBe("exacta");
    expect(t.slice(r.start, r.end)).toBe("Societăţile  comerciale sînt");
  });
  it("marchează potrivirile aproximative ca atare", () => {
    const r = locateQuote(text, "capitalul social minim pentru un SRL este de 200 lei");
    expect(r.potrivire).toBe("aproximativa");
  });
  it("nu inventează o poziție când citatul lipsește", () => {
    expect(locateQuote(text, "termenul de preaviz este de 20 de zile lucrătoare").potrivire).toBe("negasita");
  });
});
