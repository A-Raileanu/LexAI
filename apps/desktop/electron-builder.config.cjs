// Împachetarea aplicației desktop: macOS (Apple Silicon și Intel) și Windows (x64).
// Resursele serviciilor vin din stage/<os>-<arch>/runtime (scripts/stage.mjs), în afara arhivei
// asar: Node-ul serviciilor le citește direct de pe disc. Platforma și arhitectura se aleg din
// linia de comandă (vezi scripturile din package.json).
//
// Din mediu (le setează workflow-ul de release, .github/workflows/release.yml):
// - LEXAI_UPDATES_REPO="proprietar/repo": publică în GitHub Releases (ca ciornă, publicată de
//   workflow după ce toate platformele au fost încărcate) și activează actualizările
//   automate (electron-updater citește de acolo). Fără el, build-ul e local, fără actualizări.
//   LEXAI_UPDATES_URL="http://…" face la fel cu un server HTTP oarecare (pentru teste).
// - CSC_LINK + CSC_KEY_PASSWORD: certificatul Developer ID pentru macOS (semnare reală, hardened
//   runtime). Cu APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD și APPLE_TEAM_ID, aplicația e și notarizată.
//   Fără certificat, semnătura e ad-hoc: rulează pe Mac-ul tău, dar nu se actualizează singură.

const updatesRepo = process.env.LEXAI_UPDATES_REPO?.trim();
const updatesUrl = process.env.LEXAI_UPDATES_URL?.trim();
const [owner, repo] = updatesRepo ? updatesRepo.split("/") : [];
if (updatesRepo && (!owner || !repo)) throw new Error(`LEXAI_UPDATES_REPO trebuie să fie „proprietar/repo” (acum: ${updatesRepo}).`);
const developerId = Boolean(process.env.CSC_LINK || process.env.CSC_NAME);
const notarize = developerId && Boolean(process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID);

/** @type {import("electron-builder").Configuration} */
module.exports = {
  appId: "ro.lexai.desktop",
  productName: "LexAI",
  copyright: "LexAI",
  directories: { output: "release", buildResources: "resources" },
  files: ["dist/**", "resources/icon.png", "package.json"],
  extraResources: [
    {
      from: "stage/${os}-${arch}/runtime",
      to: "runtime",
      // fără filtru explicit, electron-builder lasă pe dinafară node_modules
      filter: ["**/*", "**/node_modules/**", "**/.pnpm/**"],
    },
  ],
  asar: true,
  npmRebuild: false,
  nodeGypRebuild: false,
  // doar româna: dialogurile și meniurile sistemului apar în română
  electronLanguages: ["ro"],
  artifactName: "${productName}-${version}-${os}-${arch}.${ext}",
  publish: updatesRepo ? [{ provider: "github", owner, repo, releaseType: "draft" }] : updatesUrl ? [{ provider: "generic", url: updatesUrl }] : null,
  mac: {
    // zip: arhiva din care se actualizează aplicația pe macOS
    target: updatesRepo || updatesUrl ? ["dmg", "zip"] : ["dmg"],
    category: "public.app-category.productivity",
    icon: "resources/icon.icns",
    // fără Developer ID: semnătură ad-hoc (rulează pe Mac-urile tale, fără actualizări automate)
    ...(developerId
      ? { hardenedRuntime: true, entitlements: "resources/entitlements.mac.plist", entitlementsInherit: "resources/entitlements.mac.plist", notarize }
      : { identity: "-", hardenedRuntime: false }),
    extendInfo: { CFBundleDevelopmentRegion: "ro" },
  },
  dmg: { title: "LexAI" },
  win: { target: ["nsis"], icon: "resources/icon.png" },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    // 1048 = română
    installerLanguages: ["ro_RO"],
    language: "1048",
    // traducerea română din NSIS nu are textul paginii de alegere a modului de instalare (rămâne în engleză)
    warningsAsErrors: false,
    shortcutName: "LexAI",
  },
};
