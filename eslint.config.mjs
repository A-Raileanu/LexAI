import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: { next: { rootDir: "apps/web/" } },
  },
  globalIgnores([
    "data/**",
    "**/.next/**",
    "**/.next-desktop/**",
    // aplicația desktop: resursele pregătite pentru împachetare și pachetul rezultat
    "apps/desktop/stage/**",
    "apps/desktop/release/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "**/next-env.d.ts",
    "apps/web/public/**",
    // cod de bibliotecă adăugat de shadcn/HextaUI (nu îl modificăm)
    "apps/web/src/components/ui/**",
    "apps/web/src/hooks/**",
    "apps/web/src/lib/hotkey.ts",
    "apps/web/src/lib/motion.ts",
    "packages/db/drizzle/**",
  ]),
]);
