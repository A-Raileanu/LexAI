import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { installClaude, startClaudeLogin, type InstallProgress, type LoginUpdate } from "../src";

const tmp = realpathSync(mkdtempSync(path.join(tmpdir(), "lexai-ai-setup-")));

// „binarul” descărcat: la `install` pune lansatorul în ~/.local/bin, ca instalatorul real
const BINARY = Buffer.from(
  ["#!/bin/sh", '[ "$1" = "install" ] || exit 9', 'mkdir -p "$HOME/.local/bin"', 'printf "#!/bin/sh\\necho 9.9.9\\n" > "$HOME/.local/bin/claude"', 'chmod +x "$HOME/.local/bin/claude"', "echo instalat", ""].join("\n"),
);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

let server: Server;
let base = "";
let checksum = sha(BINARY);

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/latest") return res.end("9.9.9\n");
    if (req.url === "/9.9.9/manifest.json") return res.end(JSON.stringify({ version: "9.9.9", platforms: { "test-arm64": { binary: "claude", checksum, size: BINARY.length } } }));
    if (req.url === "/9.9.9/test-arm64/claude") return res.end(BINARY);
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("installClaude", () => {
  it("descarcă versiunea curentă, verifică suma de control și rulează `install`", async () => {
    const home = mkdtempSync(path.join(tmp, "home-"));
    const progress: InstallProgress[] = [];
    const r = await installClaude({ baseUrl: base, platform: "test-arm64", home, onProgress: (p) => progress.push(p) });
    expect(r).toEqual({ version: "9.9.9", path: path.join(home, ".local", "bin", "claude") });
    expect(readFileSync(r.path, "utf8")).toContain("9.9.9");
    expect(progress.map((p) => p.stage)).toEqual(expect.arrayContaining(["versiune", "descarc", "instalez"]));
    expect(progress.filter((p) => p.stage === "descarc").at(-1)).toMatchObject({ received: BINARY.length, total: BINARY.length });
  });

  it("refuză un binar care nu corespunde sumei din manifest și nu îl rulează", async () => {
    const home = mkdtempSync(path.join(tmp, "home-"));
    checksum = sha(Buffer.from("altceva"));
    try {
      await expect(installClaude({ baseUrl: base, platform: "test-arm64", home })).rejects.toThrow(/sumei de control/);
      expect(existsSync(path.join(home, ".local", "bin", "claude"))).toBe(false);
    } finally {
      checksum = sha(BINARY);
    }
  });

  it("explică lipsa unei versiuni pentru platformă", async () => {
    await expect(installClaude({ baseUrl: base, platform: "beos-x64", home: tmp })).rejects.toThrow(/beos-x64/);
  });
});

describe("startClaudeLogin", () => {
  // CLI-ul fals: afișează adresa ca `claude auth login`, apoi așteaptă codul pe stdin
  const fake = path.join(tmp, "claude-fals");
  writeFileSync(
    fake,
    [
      "#!/bin/sh",
      'echo "ARGS:$*" >&2',
      'echo "Opening browser to sign in…"',
      "echo \"If the browser didn't open, visit: https://claude.com/cai/oauth/authorize?code=true&state=abc\"",
      'printf "Paste code here if prompted > "',
      "read code",
      'while [ "$code" = "incomplet" ]; do echo "Invalid code. Please make sure the full code was copied."; read code; done',
      '[ "$code" = "cod#bun" ] && { echo "Login successful."; exit 0; }',
      'echo "Login failed: Request failed with status code 400"; exit 1',
      "",
    ].join("\n"),
  );
  chmodSync(fake, 0o755);

  function login() {
    process.env.LEXAI_CLAUDE_BIN = fake;
    const updates: LoginUpdate[] = [];
    let done!: () => void;
    const finished = new Promise<void>((r) => (done = r));
    const handle = startClaudeLogin((u) => {
      updates.push(u);
      if (u.type === "gata" || u.type === "eroare") done();
    });
    const urlSeen = () => new Promise<void>((r) => {
      const t = setInterval(() => updates.some((u) => u.type === "url") && (clearInterval(t), r()), 10);
    });
    return { handle, updates, finished, urlSeen };
  }

  it("transmite adresa de conectare și termină după codul corect", async () => {
    const l = login();
    await l.urlSeen();
    expect(l.updates[0]).toEqual({ type: "url", url: "https://claude.com/cai/oauth/authorize?code=true&state=abc" });
    l.handle.sendCode("  cod#bun \n");
    await l.finished;
    expect(l.updates.at(-1)).toEqual({ type: "gata" });
  });

  it("un cod incomplet e respins, iar conectarea așteaptă altul", async () => {
    const l = login();
    await l.urlSeen();
    l.handle.sendCode("incomplet");
    await vi.waitFor(() => expect(l.updates.at(-1)).toEqual({ type: "cod-invalid" }));
    l.handle.sendCode("cod#bun");
    await l.finished;
    expect(l.updates.at(-1)).toEqual({ type: "gata" });
  });

  it("raportează un cod refuzat de server", async () => {
    const l = login();
    await l.urlSeen();
    l.handle.sendCode("cod#vechi");
    await l.finished;
    const last = l.updates.at(-1);
    expect(last?.type).toBe("eroare");
    expect(last?.type === "eroare" && last.message).toContain("status code 400");
  });

  it("se poate anula", async () => {
    const l = login();
    await l.urlSeen();
    l.handle.cancel();
    await l.finished;
    expect(l.updates.at(-1)).toEqual({ type: "eroare", message: "Conectarea a fost anulată." });
  });

  afterAll(() => {
    delete process.env.LEXAI_CLAUDE_BIN;
  });
});
