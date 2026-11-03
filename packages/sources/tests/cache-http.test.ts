import { describe, expect, it, vi } from "vitest";
import { MemorySourceCache, SourceError, cached, connectHttpSource, createHttpSource, fetchText, type FetchFn } from "../src";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("cache-ul surselor", () => {
  it("păstrează valoarea până la expirare, cu momentul accesării", async () => {
    vi.useFakeTimers();
    try {
      const cache = new MemorySourceCache();
      let n = 0;
      const load = async () => ++n;
      const first = await cached(cache, { sourceId: "s", key: "k", ttlMs: 1000 }, load);
      const second = await cached(cache, { sourceId: "s", key: "k", ttlMs: 1000 }, load);
      expect([first.value, second.value]).toEqual([1, 1]);
      expect(second.fetchedAt).toBe(first.fetchedAt);
      // altă sursă, altă cheie
      expect((await cached(cache, { sourceId: "t", key: "k", ttlMs: 1000 }, load)).value).toBe(2);
      vi.advanceTimersByTime(1001);
      expect((await cached(cache, { sourceId: "s", key: "k", ttlMs: 1000 }, load)).value).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("nu descarcă de două ori același conținut în paralel și acceptă un cache injectat", async () => {
    const store = new Map<string, unknown>();
    const cache = { get: async (k: string) => (store.get(k) as never) ?? null, set: async (k: string, e: unknown) => void store.set(k, e) };
    let n = 0;
    const load = () => new Promise<number>((r) => setTimeout(() => r(++n), 5));
    const [a, b] = await Promise.all([cached(cache, { sourceId: "s", key: "x", ttlMs: 60_000 }, load), cached(cache, { sourceId: "s", key: "x", ttlMs: 60_000 }, load)]);
    expect([a.value, b.value, n]).toEqual([1, 1, 1]);
    expect(store.get("s:x")).toMatchObject({ sourceId: "s", value: 1 });
  });

  it("limitează numărul de intrări", () => {
    const cache = new MemorySourceCache(2);
    for (const k of ["a", "b", "c"]) cache.set(k, { sourceId: "s", value: k, fetchedAt: "", expiresAt: Date.now() + 1000 });
    expect(cache.get("a")).toBeNull();
    expect(cache.size).toBe(2);
  });
});

describe("cererile HTTP", () => {
  it("reîncearcă și raportează erorile în română", async () => {
    let calls = 0;
    const flaky: FetchFn = async () => (++calls < 2 ? Promise.reject(new TypeError("fetch failed")) : new Response("ok"));
    expect(await fetchText("https://x.ro", { fetch: flaky, label: "Sursa X", attempts: 2 })).toBe("ok");
    const down: FetchFn = async () => new Response("", { status: 503 });
    await expect(fetchText("https://x.ro", { fetch: down, label: "Sursa X", attempts: 1 })).rejects.toThrow("Sursa X a răspuns cu 503");
  });
});

describe("sursa la distanță (HTTP)", () => {
  const articol = {
    gasit: true,
    abrogat: false,
    text: "Articolul 11",
    actiuniPeArticol: [],
    dovada: { type: "text_articol", text: "Articolul 11 (1) ...", url: "https://legislatie.just.ro/Public/DetaliiDocument/1", accesatLa: "2026-11-01T00:00:00Z" },
  };

  it("trimite parametrii ca JSON și validează rezultatul", async () => {
    const requests: { url: string; body: unknown; run: string | null }[] = [];
    const fetchFn: FetchFn = async (url, init) => {
      requests.push({ url, body: JSON.parse(String(init?.body)), run: new Headers(init?.headers).get("X-LexAI-Run") });
      return json(articol);
    };
    const src = createHttpSource("https://surse.local/portal/", { id: "remote", label: "Portal la distanță", capabilities: ["citeste_articol"], trustedDomains: ["legislatie.just.ro"], fetch: fetchFn });
    expect([...src.capabilities]).toEqual(["citeste_articol"]);
    expect(src.cautaAct).toBeUndefined();
    const state = new Map<string, unknown>();
    const r = await src.citesteArticol!({ actId: 798, articol: "11", alineat: null, data: "2024-03-15" }, { state });
    await src.citesteArticol!({ actId: 798, articol: "12", alineat: null, data: "2024-03-15" }, { state });
    expect(r).toMatchObject({ gasit: true, dovada: { type: "text_articol" } });
    expect(requests[0]).toMatchObject({ url: "https://surse.local/portal/citeste_articol", body: { params: { actId: 798, articol: "11" } } });
    // aceeași analiză → același id de rulare
    expect(requests[0].run).toBeTruthy();
    expect(requests[1].run).toBe(requests[0].run);
    expect(src.trustsUrl!("https://legislatie.just.ro/x")).toBe(true);
    expect(src.trustsUrl!("https://exemplu.ro/x")).toBe(false);
  });

  it("transmite erorile serviciului și respinge răspunsurile invalide", async () => {
    const refuz = createHttpSource("https://s.local", {
      id: "r",
      label: "S",
      capabilities: ["citeste_pagina"],
      fetch: async () => json({ error: "Domeniu nepermis", kind: "refuz" }, 400),
    });
    const err = await refuz.citestePagina!({ url: "https://x.ro" }, { state: new Map() }).catch((e) => e);
    expect(err).toBeInstanceOf(SourceError);
    expect(err).toMatchObject({ message: "Domeniu nepermis", kind: "refuz", sourceId: "r" });

    const invalid = createHttpSource("https://s.local", { id: "i", label: "S", capabilities: ["citeste_articol"], fetch: async () => json({ gasit: "poate" }) });
    await expect(invalid.citesteArticol!({ actId: 1, articol: "1", alineat: null, data: "2024-01-01" }, { state: new Map() })).rejects.toThrow("răspuns invalid");
  });

  it("citește manifestul serviciului", async () => {
    const src = await connectHttpSource("https://s.local", {
      fetch: async (url) =>
        url.endsWith("/manifest") ? json({ id: "eurlex", label: "EUR-Lex", capabilities: ["cauta_act", "citeste_articol"], trustedDomains: ["eur-lex.europa.eu"] }) : json({}, 404),
    });
    expect(src).toMatchObject({ id: "eurlex", label: "EUR-Lex" });
    expect([...src.capabilities]).toEqual(["cauta_act", "citeste_articol"]);
    expect(src.trustsUrl!("https://eur-lex.europa.eu/legal-content/RO/TXT/?uri=CELEX:32016R0679")).toBe(true);
    await expect(connectHttpSource("https://s.local", { fetch: async () => json({ id: "" }) })).rejects.toThrow("Manifestul");
  });
});
