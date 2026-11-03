import { describe, expect, it } from "vitest";
import { inlineNodes, normalizeProiect, proiectToDoc } from "../src/handlers/drafting";

describe("proiectul generat → JSON Tiptap", () => {
  it("transformă îngroșatul și câmpurile de completat", () => {
    expect(inlineNodes("Chiria este de **2.500 lei** pe lună, plătită în contul [● IBAN locator].")).toEqual([
      { type: "text", text: "Chiria este de " },
      { type: "text", text: "2.500 lei", marks: [{ type: "bold" }] },
      { type: "text", text: " pe lună, plătită în contul " },
      { type: "text", text: "[● IBAN locator]", marks: [{ type: "placeholder", attrs: { hint: "IBAN locator" } }] },
      { type: "text", text: "." },
    ]);
  });

  it("păstrează câmpurile de completat în tabelul de semnături", () => {
    const doc = proiectToDoc({
      titlu: "T",
      preambul: [],
      articole: [{ titlu: "Art. 1", alineate: ["x"] }],
      incheiere: [],
      semnaturi: [{ parte: "Locator", nume: "[● reprezentant]" }],
    }) as { content: { type: string; content?: { content?: { content?: { content?: { marks?: { type: string }[] }[] }[] }[] }[] }[] };
    const table = doc.content.find((n) => n.type === "table")!;
    const name = table.content![1].content![0].content![0].content![0];
    expect(name.marks?.map((m) => m.type)).toEqual(["placeholder"]);
  });

  it("construiește titlul, articolele, încheierea și tabelul de semnături cu segId unice", () => {
    const doc = proiectToDoc({
      titlu: "CONTRACT DE ÎNCHIRIERE",
      preambul: ["Între părțile:", "1. Ion Popescu, în calitate de locator, și"],
      articole: [{ titlu: "Art. 1. Obiectul contractului", alineate: ["1.1. Locatorul asigură folosința apartamentului.", "1.2. [● adresa]"] }],
      incheiere: ["Încheiat azi, în 2 exemplare."],
      semnaturi: [{ parte: "Locator", nume: "Ion Popescu" }, { parte: "Locatar", nume: "Alfa SRL" }],
    }) as { content: { type: string; attrs?: { segId?: string; level?: number }; content?: { content?: { content?: { attrs?: { segId?: string } }[] }[] }[] }[] };
    expect(doc.content.map((n) => n.type)).toEqual(["heading", "paragraph", "paragraph", "heading", "paragraph", "paragraph", "paragraph", "table"]);
    expect(doc.content[0].attrs?.level).toBe(1);
    const ids = [
      ...doc.content.map((n) => n.attrs?.segId).filter(Boolean),
      ...doc.content[7].content!.flatMap((r) => r.content!.flatMap((c) => c.content!.map((p) => p.attrs?.segId))),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("cererea pentru un document descris liber", () => {
  it("trimite denumirea și descrierea, fără părți sau tip predefinit", async () => {
    const { describeRequest } = await import("../src/handlers/drafting");
    const text = describeRequest({
      documentId: "d",
      draftId: "x",
      titlu: "Contract de închiriere apartament",
      tip: { id: "altul", nume: "Alt document", subtip: "", norme: [] },
      parametri: { scop: "Contract de închiriere apartament", parti: [], elemente: { continut: "Închiriere pe 12 luni, chirie 2.500 lei." }, dataDocument: "2026-11-01", dataLegii: "2026-11-01", pozitie: "echilibrat", model: null },
      deCompletat: [],
    });
    expect(text).toContain("„Contract de închiriere apartament”");
    expect(text).toContain("Închiriere pe 12 luni, chirie 2.500 lei.");
    expect(text).toContain("[● indicație]");
    expect(text).not.toContain("Părțile:");
  });
});

describe("formatarea proiectului generat", () => {
  const base = {
    titlu: "CONTRACT",
    preambul: [] as unknown[],
    incheiere: [] as unknown[],
    semnaturi: [],
  };

  it("enumerările devin liste reale cu litere, iar tabelele, tabele", () => {
    const r = normalizeProiect({
      ...base,
      articole: [
        {
          titlu: "Art. 4. Obligațiile locatarului",
          alineate: [
            "4.1. Locatarul are următoarele obligații:",
            { tip: "lista", numerotata: true, stil: "litere", elemente: ["să plătească chiria;", "să predea bunul."] },
            { tip: "tabel", antet: ["Termen", "Sumă"], randuri: [["lunar", "[● suma]"]] },
          ],
        },
      ],
    } as never);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const doc = proiectToDoc(r.proiect) as { content: { type: string; attrs?: Record<string, unknown> }[] };
    expect(doc.content.map((n) => n.type)).toEqual(["heading", "heading", "paragraph", "orderedList", "table"]);
    expect(doc.content[3].attrs).toMatchObject({ type: "a" });
  });

  it("respinge enumerarea scrisă de mână și blocurile invalide, cu poziția lor", () => {
    const r = normalizeProiect({
      ...base,
      articole: [{ titlu: "Art. 2. Prețul", alineate: ["2.1. Prețul cuprinde:", "a) chiria;", { tip: "lista", elemente: [] }] }],
    } as never);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toMatch(/„Art\. 2\. Prețul”, poziția 2: textul începe cu „a\)”.*"stil":"litere"/);
    expect(r.errors[1]).toMatch(/poziția 3: lista: lista nu are elemente/);
  });
});
