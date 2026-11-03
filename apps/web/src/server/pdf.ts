import "server-only";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPdfDefinition, pickFontFamily, type DocumentMeta, type JSONContent, type PdfDefinition, type PdfFonts } from "@lexai/docx";
import { repoRoot } from "@lexai/db";
import { resolveImage } from "./images";

/**
 * Documentul ca PDF (export și „Printează…”), randat pe server cu pdfmake. Conversia JSON → definiție
 * e în `@lexai/docx` (`buildPdfDefinition`); aici sunt fonturile și randarea.
 *
 * Fonturile: aplicația rulează local pe macOS, deci folosim fonturile sistemului (Times New Roman,
 * Arial, Georgia…), cu variantele bold/italic. Familiile care lipsesc trec pe un echivalent
 * (sans → Arial, serif → Times New Roman), iar dacă nici acela nu există, pe Roboto din pdfmake.
 * Caracterele fără glifă în fontul ales se scriu cu Arial Unicode, dacă există.
 *
 * pdfmake nu e dependență directă a aplicației web: îl încărcăm la rulare din `packages/core`, cu
 * `createRequire`, ca bundler-ul să nu încerce să-l împacheteze (are fișiere de fonturi și module Node).
 */

type Variant = "normal" | "bold" | "italics" | "bolditalics";
type FontFiles = Record<Variant, string>;

interface PdfMakeNode {
  addFonts(fonts: Record<string, FontFiles>): void;
  setUrlAccessPolicy(fn: (url: string) => boolean): void;
  setLocalAccessPolicy(fn: (p: string) => boolean): void;
  createPdf(def: PdfDefinition): { getBuffer(): Promise<Buffer> };
}

interface FontkitFont {
  ascent: number;
  descent: number;
  unitsPerEm: number;
  hasGlyphForCodePoint(cp: number): boolean;
}

const FONT_DIRS = ["/System/Library/Fonts/Supplemental", "/Library/Fonts", path.join(os.homedir(), "Library", "Fonts")];

/** Familiile căutate, cu numele fișierelor (macOS: „Times New Roman Bold Italic.ttf”; Office: „calibrib.ttf”). */
const FAMILIES: { name: string; files?: Partial<FontFiles> }[] = [
  { name: "Times New Roman" },
  { name: "Arial" },
  { name: "Arial Narrow" },
  { name: "Georgia" },
  { name: "Courier New" },
  { name: "Verdana" },
  { name: "Tahoma" },
  { name: "Trebuchet MS" },
  { name: "Book Antiqua" },
  { name: "Garamond" },
  { name: "Calibri", files: { normal: "calibri.ttf", bold: "calibrib.ttf", italics: "calibrii.ttf", bolditalics: "calibriz.ttf" } },
  { name: "Cambria", files: { bold: "cambriab.ttf", italics: "cambriai.ttf", bolditalics: "cambriaz.ttf" } },
];
const SUFFIX: Record<Variant, string> = { normal: "", bold: " Bold", italics: " Italic", bolditalics: " Bold Italic" };
const FALLBACK_GLYPHS = "Arial Unicode";

function findFile(names: string[]): string | null {
  for (const dir of FONT_DIRS) {
    for (const n of names) {
      const p = path.join(dir, n);
      if (existsSync(p)) return p;
    }
  }
  return null;
}

/** Fișierele unei familii; variantele lipsă cad pe cea mai apropiată (bold italic → bold → normal). */
function familyFiles(f: (typeof FAMILIES)[number]): FontFiles | null {
  const pick = (v: Variant) => findFile([...(f.files?.[v] ? [f.files[v]!] : []), `${f.name}${SUFFIX[v]}.ttf`]);
  const normal = pick("normal");
  if (!normal) return null;
  const bold = pick("bold") ?? normal;
  const italics = pick("italics") ?? normal;
  return { normal, bold, italics, bolditalics: pick("bolditalics") ?? (bold !== normal ? bold : italics) };
}

interface Runtime {
  pdfmake: PdfMakeNode;
  fonts: PdfFonts;
}

let runtime: Runtime | null = null;

function load(): Runtime {
  if (runtime) return runtime;
  const { createRequire } = process.getBuiltinModule("node:module") as typeof import("node:module");
  const coreRequire = createRequire(path.join(repoRoot(), "packages", "core", "package.json"));
  const mod = coreRequire("pdfmake") as PdfMakeNode | { default: PdfMakeNode };
  const pm = "createPdf" in mod ? mod : mod.default;
  // fontkit (prin pdfkit): metricile și acoperirea glifelor
  const pdfmakeRequire = createRequire(coreRequire.resolve("pdfmake"));
  const fontkit = createRequire(pdfmakeRequire.resolve("pdfkit"))("fontkit") as { openSync(p: string): FontkitFont };

  const robotoDir = path.join(path.dirname(coreRequire.resolve("pdfmake")), "..", "build", "fonts", "Roboto");
  const registered: Record<string, FontFiles> = {
    Roboto: {
      normal: path.join(robotoDir, "Roboto-Regular.ttf"),
      bold: path.join(robotoDir, "Roboto-Medium.ttf"),
      italics: path.join(robotoDir, "Roboto-Italic.ttf"),
      bolditalics: path.join(robotoDir, "Roboto-MediumItalic.ttf"),
    },
  };
  for (const f of FAMILIES) {
    const files = familyFiles(f);
    if (files) registered[f.name] = files;
  }
  const unicode = findFile([`${FALLBACK_GLYPHS}.ttf`]);
  if (unicode) registered[FALLBACK_GLYPHS] = { normal: unicode, bold: unicode, italics: unicode, bolditalics: unicode };
  pm.addFonts(registered);

  // definiția conține doar text: fără acces la rețea, iar pe disc doar la fonturile înregistrate
  const allowed = new Set(Object.values(registered).flatMap((v) => Object.values(v).map((p) => path.resolve(p))));
  pm.setUrlAccessPolicy(() => false);
  pm.setLocalAccessPolicy((p) => allowed.has(path.resolve(p)));

  const metrics = new Map<string, FontkitFont | null>();
  const fontOf = (family: string): FontkitFont | null => {
    if (!metrics.has(family)) {
      let f: FontkitFont | null = null;
      try {
        f = registered[family] ? fontkit.openSync(registered[family].normal) : null;
      } catch {
        f = null;
      }
      metrics.set(family, f);
    }
    return metrics.get(family) ?? null;
  };
  const families = Object.keys(registered).filter((f) => f !== FALLBACK_GLYPHS);
  const resolved = new Map<string, string>();

  runtime = {
    pdfmake: pm,
    fonts: {
      resolve(family) {
        if (!resolved.has(family)) resolved.set(family, pickFontFamily(family, families));
        return resolved.get(family)!;
      },
      lineRatio(font) {
        const f = fontOf(font);
        return f ? (f.ascent - f.descent) / f.unitsPerEm : 1.15;
      },
      hasGlyph(font, cp) {
        const f = fontOf(font);
        return f ? f.hasGlyphForCodePoint(cp) : true;
      },
      fallback: unicode ? FALLBACK_GLYPHS : undefined,
    },
  };
  return runtime;
}

export interface DocumentPdfOptions {
  title?: string;
  pageNumbers?: boolean;
}

export async function renderDocumentPdf(content: JSONContent, meta: DocumentMeta, opts: DocumentPdfOptions = {}): Promise<Uint8Array<ArrayBuffer>> {
  const { pdfmake, fonts } = load();
  const def = buildPdfDefinition(content, meta, { fonts, title: opts.title, pageNumbers: opts.pageNumbers, image: resolveImage });
  const buf = await pdfmake.createPdf(def).getBuffer();
  return new Uint8Array(buf);
}
