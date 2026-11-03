import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { classifyDecision, parsePortalDecision, solutieDin } from "../src/decizii";

const fx = (n: string) => readFileSync(new URL(`./__fixtures__/${n}`, import.meta.url), "utf8");

describe("jurisprudență", () => {
  it("clasifică deciziile după emitent și descriere", () => {
    expect(classifyDecision("CURTEA CONSTITUŢIONALĂ", "referitoare la excepţia de neconstituţionalitate a dispoziţiilor art. 134").fel).toBe("ccr_exceptie");
    expect(classifyDecision("", "referitoare la interpretarea şi aplicarea unitară a dispoziţiilor art. 268").fel).toBe("iccj_ril");
    expect(classifyDecision("", "privind pronunţarea unei hotărâri prealabile pentru dezlegarea unor chestiuni de drept").fel).toBe("iccj_hp");
    expect(classifyDecision("", "privind dezlegarea chestiunii de drept referitoare la art. 61 lit. c)").fel).toBe("iccj_hp");
    expect(classifyDecision("ANAF", "privind soluționarea contestației").fel).toBe("alta");
  });

  it("recunoaște soluția din dispozitiv", () => {
    expect(solutieDin("DECIDE:\nRespinge, ca inadmisibilă, excepția de neconstituționalitate")).toBe("respinsă ca inadmisibilă");
    expect(solutieDin("DECIDE:\nAdmite excepția de neconstituționalitate și constată că dispozițiile art. 5 sunt neconstituționale.")).toMatch(/^admisă – dispozițiile/);
    expect(solutieDin("DECIDE:\nAdmite excepția … și constată că dispozițiile art. 5 sunt constituționale în măsura în care …")).toMatch(/interpretativă/);
    expect(solutieDin("D E C I D E:\nAdmite sesizarea formulată de Curtea de Apel")).toMatch(/obligatorie/);
    expect(solutieDin(null)).toBeNull();
  });

  it("extrage textul unei decizii de pe portal fără dubluri", () => {
    const d = parsePortalDecision(fx("decizie-ccr-684-2015.html"), 174157, "2026-11-01T00:00:00Z");
    expect(d.titlu).toBe("DECIZIE nr. 684 din 20 octombrie 2015");
    expect(d.fel).toBe("ccr_exceptie");
    expect(d.solutie).toBe("respinsă ca inadmisibilă");
    expect(d.dispozitiv).toMatch(/^DECIDE:\nRespinge, ca inadmisibilă/);
    expect(d.text.match(/Pe rol se află soluționarea excepției/g)).toHaveLength(1);
  });
});
