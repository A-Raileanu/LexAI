import { defineConfig } from "vitest/config";

// testele din toate pachetele
export default defineConfig({
  test: {
    include: ["{apps,packages,services}/*/{src,tests}/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**"],
    environment: "node",
    passWithNoTests: true,
  },
});
