import { describe, expect, it } from "vitest";
import { extractUrls, findLoginUrl, middleTruncate, stripAnsi } from "../src/features/terminal/extract-urls";

const LOGIN = "https://claude.ai/oauth/authorize?code=true&client_id=abc-123&response_type=code&redirect_uri=https%3A%2F%2Fconsole.anthropic.com%2Foauth%2Fcode%2Fcallback&scope=user%3Ainference&state=xyz";

describe("stripAnsi", () => {
  it("elimină culorile, mișcările de cursor și titlurile OSC", () => {
    expect(stripAnsi("\x1b[1;32mVerde\x1b[0m \x1b[2K\x1b[1Gtext\x1b]0;titlu\x07")).toBe("Verde text");
  });
});

describe("extractUrls", () => {
  it("găsește linkul de autorizare din ieșirea colorată", () => {
    const out = `Browser didn't open? Use the url below to sign in:\r\n\r\n\x1b[36m${LOGIN}\x1b[39m\r\n\r\nPaste code here if prompted > `;
    expect(extractUrls(out)).toEqual([LOGIN]);
  });

  it("citește hyperlinkurile OSC 8 și nu dublează URL-ul vizibil", () => {
    const out = `\x1b]8;;${LOGIN}\x07${LOGIN}\x1b]8;;\x07`;
    expect(extractUrls(out)).toEqual([LOGIN]);
  });

  it("taie punctuația de la final, dar păstrează parantezele echilibrate", () => {
    expect(extractUrls("Vezi https://example.com/docs. Apoi (https://example.com/a).")).toEqual(["https://example.com/docs", "https://example.com/a"]);
    expect(extractUrls("https://ro.wikipedia.org/wiki/Cod_(drept)")).toEqual(["https://ro.wikipedia.org/wiki/Cod_(drept)"]);
  });

  it("ignoră textul fără linkuri și schemele nepermise", () => {
    expect(extractUrls("Opening browser… javascript:alert(1) file:///etc/passwd")).toEqual([]);
  });
});

describe("findLoginUrl", () => {
  it("preferă linkul de autentificare față de altele", () => {
    const out = `Docs: https://docs.claude.com/ro\nOpen ${LOGIN}\n`;
    expect(findLoginUrl(out)).toBe(LOGIN);
  });

  it("întoarce ultimul URL dacă niciunul nu pare de autentificare, sau null", () => {
    expect(findLoginUrl("a https://a.ro b https://b.ro")).toBe("https://b.ro");
    expect(findLoginUrl("nimic aici")).toBeNull();
  });
});

describe("middleTruncate", () => {
  it("scurtează la mijloc doar textele lungi", () => {
    expect(middleTruncate("scurt", 10)).toBe("scurt");
    const t = middleTruncate(LOGIN, 40);
    expect(t).toHaveLength(40);
    expect(t.startsWith("https://claude.ai/oauth")).toBe(true);
    expect(t).toContain("…");
  });
});
