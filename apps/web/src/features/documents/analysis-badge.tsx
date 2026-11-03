import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { summarize, type FindingCounts } from "@/features/analysis/summary";

export interface AnalysisSummary {
  status: string;
  counts: FindingCounts | null;
}

/** Rezumatul constatărilor dintr-un AnalysisResult salvat, fără cele ignorate în document. */
export { summarize };

/** Starea ultimei analize, ca badge semantic (docs/ux/04-pagina-proiect.md). */
export function AnalysisBadge({ summary }: { summary: AnalysisSummary | null }) {
  if (!summary) return <Badge appearance="muted">Neanalizat</Badge>;
  if (summary.status === "in_curs") {
    return (
      <Badge appearance="outline" className="gap-1.5">
        <Spinner className="size-3" /> Se analizează…
      </Badge>
    );
  }
  if (summary.status === "esuata" || summary.status === "intrerupta" || summary.status === "anulata") {
    return <Badge appearance="outline" variant="warning">{summary.status === "esuata" ? "Eșuată" : summary.status === "anulata" ? "Anulată" : "Întreruptă"}</Badge>;
  }
  const c = summary.counts;
  if (!c) return <Badge appearance="muted">Fără rezultat</Badge>;
  if (c.erori) return <Badge appearance="outline" variant="destructive">{c.erori === 1 ? "1 greșeală" : `${c.erori} greșeli`}</Badge>;
  if (c.discutabil) return <Badge appearance="outline" variant="warning">Discutabil</Badge>;
  if (c.uman) return <Badge appearance="outline" variant="info">De verificat</Badge>;
  if (c.neverificat && !c.corect) return <Badge appearance="muted">Neverificat</Badge>;
  return <Badge appearance="outline" variant="success">Corect</Badge>;
}
