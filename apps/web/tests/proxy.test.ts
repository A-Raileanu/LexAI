import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { isLocalHost, proxy } from "../src/proxy";

const req = (url: string, init: { method?: string; headers?: Record<string, string> } = {}) =>
  new NextRequest(url, { method: init.method ?? "GET", headers: { host: new URL(url).host, ...init.headers } });

describe("accesul doar local", () => {
  it("recunoaște adresele locale", () => {
    for (const h of ["localhost:3000", "127.0.0.1:3150", "[::1]:3000", "app.localhost:3000"]) expect(isLocalHost(h), h).toBe(true);
    for (const h of ["192.168.1.10:3000", "evil.example:3000", "localhost.evil.example"]) expect(isLocalHost(h), h).toBe(false);
  });

  it("respinge un Host străin (DNS rebinding)", () => {
    expect(proxy(req("http://evil.example:3000/")).status).toBe(403);
  });

  it("respinge cererile trimise de alte site-uri, nu și navigarea", () => {
    expect(proxy(req("http://127.0.0.1:3000/api/documente/d/export", { headers: { "sec-fetch-site": "cross-site", "sec-fetch-mode": "no-cors" } })).status).toBe(403);
    expect(proxy(req("http://127.0.0.1:3000/", { headers: { "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate" } })).status).toBe(200);
  });

  it("respinge modificările cu altă origine", () => {
    expect(proxy(req("http://127.0.0.1:3000/api/terminal/ticket", { method: "POST", headers: { origin: "http://evil.example" } })).status).toBe(403);
    expect(proxy(req("http://127.0.0.1:3000/api/terminal/ticket", { method: "POST", headers: { origin: "http://127.0.0.1:3000" } })).status).toBe(200);
  });

  it("vechile pagini de autentificare duc acasă", () => {
    const res = proxy(req("http://localhost:3000/login"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
  });
});
