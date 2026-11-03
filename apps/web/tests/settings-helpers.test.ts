import { describe, expect, it } from "vitest";
import { initials, parseAuthStatus, planLabel } from "../src/features/settings/claude-account";
import { STALE_AFTER_MS, cacheFreshness, fmtBytes, moveInOrder, priorities } from "../src/features/settings/source-order";

describe("parseAuthStatus", () => {
  it("citește contul conectat", () => {
    const out = JSON.stringify({ loggedIn: true, authMethod: "claude.ai", email: "andrei@example.ro", orgName: "Cabinet", subscriptionType: "max" });
    expect(parseAuthStatus(out, 5)).toEqual({ state: "conectat", email: "andrei@example.ro", plan: "Max", org: "Cabinet", method: "claude.ai", checkedAt: 5 });
  });

  it("recunoaște starea neconectată și ieșirea necunoscută", () => {
    expect(parseAuthStatus('{"loggedIn":false}', 1)).toEqual({ state: "neconectat", checkedAt: 1 });
    expect(parseAuthStatus("Not logged in", 1)).toBeNull();
    expect(parseAuthStatus('{"ok":true}', 1)).toBeNull();
  });

  it("formatează planul și inițialele", () => {
    expect(planLabel("pro")).toBe("Pro");
    expect(planLabel("custom_plan")).toBe("Custom_plan");
    expect(planLabel(null)).toBeNull();
    expect(initials("andrei.pop@x.ro")).toBe("AP");
    expect(initials("andrei@x.ro")).toBe("AN");
    expect(initials(null)).toBe("C");
  });
});

describe("surse legale", () => {
  it("mută o sursă și recalculează prioritățile", () => {
    const ids = ["a", "b", "c"];
    expect(moveInOrder(ids, "b", "sus")).toEqual(["b", "a", "c"]);
    expect(moveInOrder(ids, "b", "jos")).toEqual(["a", "c", "b"]);
    expect(moveInOrder(ids, "a", "sus")).toEqual(ids);
    expect(moveInOrder(ids, "c", "jos")).toEqual(ids);
    expect(moveInOrder(ids, "x", "sus")).toEqual(ids);
    expect(priorities(["c", "a"])).toEqual([
      { id: "c", priority: 10 },
      { id: "a", priority: 20 },
    ]);
  });

  it("clasifică vechimea cache-ului", () => {
    expect(cacheFreshness(null, 100)).toBe("gol");
    expect(cacheFreshness(0, STALE_AFTER_MS)).toBe("actualizat");
    expect(cacheFreshness(0, STALE_AFTER_MS + 1)).toBe("vechi");
  });

  it("formatează mărimea", () => {
    expect(fmtBytes(512)).toBe("512 B");
    expect(fmtBytes(48 * 1024)).toBe("48 KB");
    expect(fmtBytes(312.4 * 1024 * 1024)).toBe("312,4 MB");
  });
});
