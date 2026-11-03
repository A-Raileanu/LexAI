// node-pty publică spawn-helper (macOS) fără bitul de execuție; fără el terminalul nu pornește.
import { chmodSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const store = path.join(process.cwd(), "node_modules", ".pnpm");
if (existsSync(store)) {
  for (const dir of readdirSync(store).filter((d) => d.startsWith("node-pty@"))) {
    const prebuilds = path.join(store, dir, "node_modules", "node-pty", "prebuilds");
    if (!existsSync(prebuilds)) continue;
    for (const platform of readdirSync(prebuilds)) {
      const helper = path.join(prebuilds, platform, "spawn-helper");
      if (existsSync(helper) && !(statSync(helper).mode & 0o111)) chmodSync(helper, 0o755);
    }
  }
}
