import { getDb } from "@lexai/db";
import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageTitle } from "@/components/page-header";
import { AiSection, AnalysisSection } from "@/features/settings/ai-settings";
import { ClaudeAccountSection, ClaudeDisconnectedAlert } from "@/features/settings/claude-account-card";
import { getClaudeAccount } from "@/features/settings/claude-status";
import { sourcesSnapshot } from "@/features/settings/data";
import { SectionSkeleton } from "@/features/settings/section";
import { SourcesSection } from "@/features/settings/sources-list";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Setări — LexAI" };

async function Sources() {
  await connection();
  const { sources, now } = sourcesSnapshot();
  return <SourcesSection sources={sources} now={now} />;
}

async function Ai() {
  await connection();
  const s = getSettings(getDb());
  const values = { model: s.model, workerConcurrency: s.workerConcurrency, defaultReferenceDate: s.defaultReferenceDate };
  return (
    <>
      <AiSection values={values} />
      <AnalysisSection values={values} />
    </>
  );
}

async function ClaudeAccount() {
  await connection();
  return <ClaudeAccountSection initial={await getClaudeAccount()} />;
}

async function TopAlert() {
  await connection();
  return <ClaudeDisconnectedAlert account={await getClaudeAccount()} />;
}

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-8">
      <PageTitle title="Setări" description="Surse legale, comportamentul AI și contul Claude." />
      <Suspense fallback={null}>
        <TopAlert />
      </Suspense>
      <Suspense fallback={<SectionSkeleton id="surse" title="Surse legale" rows={3} />}>
        <Sources />
      </Suspense>
      <Suspense
        fallback={
          <>
            <SectionSkeleton id="ai" title="AI și procesare" />
            <SectionSkeleton id="analiza" title="Analiză" rows={1} />
          </>
        }
      >
        <Ai />
      </Suspense>
      <Suspense fallback={<SectionSkeleton id="cont-claude" title="Cont Claude" rows={1} />}>
        <ClaudeAccount />
      </Suspense>
    </div>
  );
}
