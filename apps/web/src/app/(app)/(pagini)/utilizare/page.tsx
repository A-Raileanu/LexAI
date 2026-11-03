import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usageSnapshot } from "@/features/usage/data";
import { UsageView } from "@/features/usage/usage-view";
import { connection } from "next/server";

export const metadata: Metadata = { title: "Utilizare — LexAI" };

async function Usage() {
  await connection();
  return <UsageView data={usageSnapshot()} />;
}

function UsageSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Se încarcă utilizarea">
      <div>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border p-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-56" />
          </div>
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-lg" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function UsagePage() {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-8 sm:px-8">
      <Suspense fallback={<UsageSkeleton />}>
        <Usage />
      </Suspense>
    </div>
  );
}
