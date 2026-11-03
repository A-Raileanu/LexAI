// Compilează procesul principal (src/main.ts) într-un singur fișier CommonJS, în dist/.
import { build } from "esbuild";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

await build({
  entryPoints: [path.join(root, "src", "main.ts")],
  outfile: path.join(root, "dist", "main.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node24",
  external: ["electron"],
  sourcemap: "inline",
  logLevel: "warning",
});
