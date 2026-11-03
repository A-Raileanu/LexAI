import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const SECTIONS = [
  { id: "surse", label: "Surse legale" },
  { id: "ai", label: "AI și procesare" },
  { id: "analiza", label: "Analiză" },
  { id: "cont-claude", label: "Cont Claude" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

/** O secțiune a paginii Setări: titlu, o frază de descriere, conținutul într-un card. */
export function SettingsSection({
  id,
  title,
  description,
  actions,
  children,
}: {
  id: SectionId;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titlu`} className="scroll-mt-[calc(var(--app-bar-h)+5rem)] xl:scroll-mt-[calc(var(--app-bar-h)+1.5rem)]">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2 id={`${id}-titlu`} className="text-base font-semibold">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <Card size="flush" className="divide-y divide-border">
        {children}
      </Card>
    </section>
  );
}

/** Rândul standard: etichetă + descriere la stânga, controlul la dreapta (stivă pe ecran îngust). */
export function SettingRow({
  title,
  description,
  control,
  children,
  className,
  htmlFor,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  control?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6", className)}>
      <div className="min-w-0 flex-1">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-sm font-medium">
            {title}
          </label>
        ) : (
          <p className="text-sm font-medium">{title}</p>
        )}
        {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
        {children}
      </div>
      {control && <div className="flex shrink-0 flex-wrap items-center gap-2">{control}</div>}
    </div>
  );
}

export function SectionSkeleton({ id, title, rows = 2 }: { id: SectionId; title: string; rows?: number }) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--app-bar-h)+5rem)] xl:scroll-mt-[calc(var(--app-bar-h)+1.5rem)]" aria-busy="true" aria-label={`${title}: se încarcă`}>
      <h2 className="mb-1 text-base font-semibold">{title}</h2>
      <Skeleton className="mb-3 h-4 w-2/3" />
      <Card size="flush" className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-3.5">
            <div className="flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="mt-1.5 h-3.5 w-64 max-w-full" />
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </Card>
    </section>
  );
}
