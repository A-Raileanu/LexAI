import type { Metadata } from "next";
import { Suspense } from "react";
import { PageCrumbs, PageTitle } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getClaudeAccount } from "@/features/settings/claude-status";
import { parseMode } from "@/features/terminal/modes";
import { terminalSnapshot } from "@/features/terminal/snapshot";
import { TerminalWorkspace } from "@/features/terminal/terminal-workspace";

export const metadata: Metadata = { title: "Terminal Claude — LexAI" };

async function Terminal({ searchParams }: { searchParams: PageProps<"/setari/terminal">["searchParams"] }) {
  const { mod } = await searchParams;
  const { serviceUp } = await terminalSnapshot();
  return (
    <TerminalWorkspace
      // nu e așteptată: cardul de cont are propriul Skeleton, terminalul nu depinde de CLI
      account={getClaudeAccount()}
      serviceUp={serviceUp}
      initialMode={parseMode(Array.isArray(mod) ? mod[0] : mod)}
    />
  );
}

function TerminalSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-18 w-full rounded-xl" />
      <Skeleton className="h-[420px] w-full rounded-xl" />
    </div>
  );
}

export default function TerminalPage(props: PageProps<"/setari/terminal">) {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-8 sm:px-8">
      <div>
        <PageCrumbs crumbs={[{ label: "Setări", href: "/setari" }]} current="Terminal Claude" />
        <PageTitle title="Terminal Claude" description="Conectează, verifică sau schimbă contul Claude folosit de LexAI." />
      </div>
      <Suspense fallback={<TerminalSkeleton />}>
        <Terminal searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
