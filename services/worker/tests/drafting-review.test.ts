import { describe, expect, it } from "vitest";
import { completenessIssues, type DraftPlan } from "../src/handlers/drafting-review";

const plin = "1.1. Locatorul predă locuința în stare de folosință, cu toate dotările din anexa 1, la data intrării în vigoare.";
const plan: DraftPlan = {
  analiza: "Contract de închiriere a unei locuințe între persoane fizice.",
  elemente: [{ element: "garanția", motiv: "acoperă eventualele daune" }],
  sectiuni: ["Părțile contractante", "Art. 1. Obiectul contractului", "Art. 2. Prețul și plata", "Art. 3. Garanția", "Încheiere și semnături"],
};

describe("completitudinea proiectului înainte de predare", () => {
  it("un proiect cu toate secțiunile din plan și cu conținut trece", () => {
    const proiect = { articole: [{ titlu: "Art. 1. Obiectul contractului", alineate: [plin] }, { titlu: "Art. 2. Prețul și plata", alineate: [plin] }, { titlu: "Art. 3 – Garanția", alineate: [plin] }] };
    expect(completenessIssues(proiect, plan)).toEqual([]);
  });

  it("semnalează articolele goale sau subțiri și secțiunile din plan care lipsesc", () => {
    const proiect = { articole: [{ titlu: "Art. 1. Obiectul contractului", alineate: [plin] }, { titlu: "Art. 2. Prețul și plata", alineate: ["2.1. Chiria."] }] };
    const issues = completenessIssues(proiect, plan);
    expect(issues).toHaveLength(2);
    expect(issues[0]).toContain("„Art. 2. Prețul și plata” nu are conținut dezvoltat");
    expect(issues[1]).toContain("„Art. 3. Garanția”");
    // părțile, încheierea și semnăturile nu sunt articole
    expect(issues[1]).not.toContain("Părțile");
    expect(issues[1]).not.toContain("Încheiere");
  });

  it("fără plan, verifică doar conținutul articolelor", () => {
    expect(completenessIssues({ articole: [{ titlu: "Art. 1. Obiectul", alineate: [] }] }, null)).toHaveLength(1);
  });
});
