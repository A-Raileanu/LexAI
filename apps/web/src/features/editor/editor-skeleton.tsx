import { Brand } from "@/components/brand";
import { Skeleton } from "@/components/ui/skeleton";

const LINES = [92, 100, 96, 88, 100, 74, 0, 100, 94, 98, 81, 0, 100, 90, 63];

/** Încărcarea editorului: antet, bară dezactivată, foaie cu rânduri și panoul cu carduri. */
export function EditorSkeleton() {
  return (
    <div className="flex h-svh flex-col overflow-hidden" aria-busy="true" aria-label="Se încarcă documentul">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b px-3">
        {/* ◆ ca în antetul editorului (fără bara globală) */}
        <Brand compact className="opacity-40" />
        <span className="h-5 w-px bg-border" />
        <Skeleton className="h-4 w-72 max-w-[50vw]" />
        <div className="ms-auto flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b px-3 opacity-60">
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className={i === 1 || i === 2 ? "h-7 w-24" : "size-7"} />
        ))}
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden bg-desk px-4 py-8">
          <div className="mx-auto flex w-full max-w-[210mm] flex-col gap-3 rounded-sm bg-paper p-[25mm] shadow-sm">
            {LINES.map((w, i) => (w ? <Skeleton key={i} className="h-3.5 bg-black/8" style={{ width: `${w}%` }} /> : <div key={i} className="h-3" />))}
          </div>
        </div>
        <div className="hidden w-[360px] shrink-0 flex-col gap-3 border-s p-4 xl:flex">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
      <div className="h-7 shrink-0 border-t" />
    </div>
  );
}
