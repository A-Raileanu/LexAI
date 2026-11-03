import { Suspense } from "react";
import { AppBar } from "@/components/app-shell/app-bar";
import { SkipLink } from "@/components/app-shell/skip-link";
import { Skeleton } from "@/components/ui/skeleton";
import { pinnedProjects } from "@/server/projects";
import { latestLimits } from "@/server/usage";
import { connection } from "next/server";

async function Shell({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    <>
      <SkipLink />
      <AppBar pinned={pinnedProjects()} limite={latestLimits()} />
      <main id="continut" tabIndex={-1} className="outline-none">
        {children}
      </main>
    </>
  );
}

/** Scheletul shell-ului: bara de 48 px (brand, navigare, căutare, chip, meniu) și un bloc de conținut. */
function ShellSkeleton() {
  return (
    <div aria-busy="true" aria-label="Se încarcă">
      <div className="flex h-(--app-bar-h) items-center border-b px-3 sm:px-4">
        <Skeleton className="size-5 rounded-md" />
        <Skeleton className="ms-2 h-4 w-16" />
        <div className="ms-7 hidden gap-5 md:flex">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-14" />
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Skeleton className="hidden h-8 w-60 lg:block" />
          <Skeleton className="hidden h-7 w-28 rounded-full md:block" />
          <Skeleton className="hidden size-8 rounded-full md:block" />
          <Skeleton className="size-8 md:hidden" />
          <Skeleton className="size-8 md:hidden" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    </div>
  );
}

/** Paginile obișnuite: bara globală deasupra și conținutul în `<main id="continut">` (docs/ux/17). */
export default function PagesLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}
