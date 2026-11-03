import Link from "next/link";
import { Fragment } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

/**
 * Locația paginii, deasupra titlului: doar strămoșii, ca linkuri („Proiecte › Dosar ›”).
 * Pagina curentă rămâne doar pentru cititoarele de ecran, fiindcă `h1` e chiar dedesubt.
 */
export function PageCrumbs({ crumbs, current, className }: { crumbs: { label: string; href: string }[]; current: string; className?: string }) {
  return (
    <Breadcrumb aria-label="Locație" className={cn("mb-1.5", className)}>
      <BreadcrumbList className="flex-nowrap text-[13px]">
        {crumbs.map((c) => (
          <Fragment key={c.href}>
            <BreadcrumbItem className="min-w-0">
              <BreadcrumbLink render={<Link href={c.href} />} className="max-w-60 truncate">
                {c.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>›</BreadcrumbSeparator>
          </Fragment>
        ))}
        <BreadcrumbItem className="sr-only">
          <BreadcrumbPage>{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Titlul unei pagini de conținut: titlu, descriere, acțiuni. */
export function PageTitle({ title, description, actions }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
