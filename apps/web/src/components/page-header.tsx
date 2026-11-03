import { IconChevronLeft } from "@tabler/icons-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Legătura spre pagina părinte, deasupra titlului: „‹ Înapoi la Dosar”. Nu folosim breadcrumb. */
export function BackLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("mb-1.5 -ms-1 inline-flex max-w-full items-center gap-0.5 rounded-md px-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground", className)}
    >
      <IconChevronLeft className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">Înapoi la {label}</span>
    </Link>
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
