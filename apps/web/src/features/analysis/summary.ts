import { countVisibleByStatus, type IgnoredSignatures, type SignatureSource } from "@lexai/core/findings";

/**
 * Rezumatele unui AnalysisResult salvat (JSON), pentru insignele documentelor și ale proiectelor
 * și pentru alertele „cu probleme”. Constatările ignorate în document (`ignored`, semnăturile din
 * `ignoredSignatures`) nu se numără: nu mai sunt probleme nicăieri. La fel cele rezolvate în
 * analiza respectivă (`resolved`: corectura aplicată sau „Am verificat”, din `resolvedFindings`).
 */

export interface FindingCounts {
  corect: number;
  erori: number;
  discutabil: number;
  uman: number;
  neverificat: number;
}

/** Numărul de constatări pe stare; null dacă rezultatul lipsește sau nu poate fi citit. */
export function summarize(result: string | null, ignored?: IgnoredSignatures | null, resolved?: ReadonlySet<string> | null): FindingCounts | null {
  if (!result) return null;
  try {
    const all = (JSON.parse(result) as { findings?: (SignatureSource & { id?: string; status: string })[] }).findings ?? [];
    const findings = resolved?.size ? all.filter((f) => !f.id || !resolved.has(f.id)) : all;
    const c = countVisibleByStatus(findings, ignored);
    return { corect: c.corect, erori: c.eroare_citare, discutabil: c.interpretare_discutabila, uman: c.necesita_analiza_umana, neverificat: c.neverificat };
  } catch {
    return null;
  }
}

/** Constatările problematice: greșeli și „atenție” (discutabile + de analizat de un jurist). */
export function severityCounts(result: string | null, ignored?: IgnoredSignatures | null, resolved?: ReadonlySet<string> | null): { erori: number; atentie: number } {
  const c = summarize(result, ignored, resolved);
  return c ? { erori: c.erori, atentie: c.discutabil + c.uman } : { erori: 0, atentie: 0 };
}
