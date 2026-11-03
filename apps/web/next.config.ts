import path from "node:path";
import type { NextConfig } from "next";

/** Build-ul pentru aplicația desktop (apps/desktop): server autonom, în alt director decât `next build`. */
const desktop = process.env.LEXAI_DESKTOP_BUILD === "1";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // pachetele workspace-ului sunt importate ca surse TypeScript
  transpilePackages: ["@lexai/ai", "@lexai/core", "@lexai/db", "@lexai/docx", "@lexai/sources", "@lexai/terminal", "@lexai/source-portal-legislativ", "@lexai/source-jurisprudenta", "@lexai/source-web-oficial"],
  // module native și pachete Node folosite doar pe server
  serverExternalPackages: ["better-sqlite3", "pdfjs-dist", "word-extractor", "pdf-lib", "mammoth"],
  experimental: {
    // proxy.ts face ca Next să păstreze corpul cererii în memorie, implicit doar primii 10 MB: un fișier
    // mai mare ar ajunge trunchiat (deci „deteriorat”). Limita încărcărilor e 50 MB, plus antetul formularului.
    proxyClientMaxBodySize: "52mb",
  },
  ...(desktop && {
    output: "standalone",
    distDir: ".next-desktop",
    outputFileTracingRoot: path.resolve(process.cwd(), "..", ".."),
  }),
};

export default nextConfig;
