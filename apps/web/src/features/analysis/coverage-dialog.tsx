"use client";

import { STATUS_ORDER, fmtDate } from "@lexai/core/labels";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAnalysis } from "./context";
import { STATUS_UI, StatusIcon } from "./status";

/**
 * „Acoperirea analizei” (08b, 4.4): statistica analizei mutată din panou în meniul antetului.
 * Câte trimiteri s-au găsit, câte au fost verificate cu sursă și numărul pe stări (fără ignorate).
 */
export function CoverageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const a = useAnalysis();
  const shown = a.shown;
  const cov = shown?.result.coverage;
  const rows: [string, number | string][] = cov
    ? [
        ["Trimiteri găsite", cov.trimiteriGasite],
        ["Explicite / implicite", `${cov.explicite} / ${cov.implicite}`],
        ["Verificate cu sursă oficială", cov.verificateCuSursa],
        ["Din care cu pagină web oficială", cov.verificateCuWeb],
        ["Citate nelocalizate în document", cov.citateNelocalizate],
        ...(cov.segmenteOcr ? ([["Paragrafe recunoscute prin OCR", cov.segmenteOcr]] as [string, number][]) : []),
        ...(cov.paginiNecitite.length ? ([["Pagini necitite", cov.paginiNecitite.join(", ")]] as [string, string][]) : []),
      ]
    : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Acoperirea analizei</DialogTitle>
          {shown && <DialogDescription>Legislația în vigoare la {fmtDate(shown.dataReferinta)}. Constatările ignorate nu sunt numărate.</DialogDescription>}
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {rows.length > 0 && (
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-md">
              {rows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-fg-2">{k}</dt>
                  <dd className="text-end tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <ul className="flex flex-col gap-1 border-t border-divider pt-3 text-md" aria-label="Constatări pe stări">
            {STATUS_ORDER.map((s) => (
              <li key={s} className="flex items-center gap-3">
                <StatusIcon status={s} />
                <span className="flex-1">{STATUS_UI[s].group}</span>
                <span className="tabular-nums">{a.counts[s]}</span>
              </li>
            ))}
          </ul>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
