"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PageCrumbs } from "@/components/page-header";
import { toast } from "@/components/ui/toast";
import { rerunDraftingAction } from "./actions";
import { GenerationView } from "./generation-view";
import { initialProgress, progressReducer } from "./progress";
import { FINAL_JOB, type DraftInfo, type JobStatus } from "./types";
import { useJobEvents } from "./use-job-events";

/**
 * Pagina separată a generării: progresul (pașii, actele cercetate, oprirea), apoi eroarea sau
 * oprirea cu „Generează din nou”. Editorul se deschide abia când proiectul documentului e gata.
 */
export function GenerationPage({ title, project, draft }: { title: string; project: { id: string; name: string }; draft: DraftInfo }) {
  const router = useRouter();
  const [rerunning, setRerunning] = useState(false);
  const jobId = draft.job?.id ?? null;
  const events = useJobEvents(jobId, { reducer: progressReducer, initial: initialProgress });
  const progress = events.state;
  const serverStatus = draft.job?.status ?? null;
  const status: JobStatus | null = progress.status ?? serverStatus;
  // editorul se deschide doar după ce jobul e marcat „finalizat” (altfel ruta editorului ne-ar trimite înapoi aici)
  const finished = status === "finalizat";
  const failed = !finished && status !== null && FINAL_JOB.has(status);
  const phase = finished || progress.proiect ? "finishing" : failed ? "failed" : "generating";
  const editorUrl = `/proiecte/${project.id}/documente/${draft.documentId}`;

  // proiectul e gata: deschidem editorul (o singură dată)
  const opened = useRef(false);
  useEffect(() => {
    if (!finished || opened.current) return;
    opened.current = true;
    toast.success("Documentul a fost generat.", { description: "Verifică fiecare clauză înainte de semnare." });
    router.replace(editorUrl);
  }, [finished, editorUrl, router]);

  const rerun = async () => {
    setRerunning(true);
    try {
      const res = await rerunDraftingAction(draft.documentId);
      if (!res.ok) {
        toast.error("Nu am putut porni generarea.", { description: res.error });
        setRerunning(false);
        return;
      }
      router.push(`/proiecte/${res.data.projectId}/documente/${res.data.documentId}/generare`);
    } catch {
      toast.error("Nu am putut porni generarea.");
      setRerunning(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="min-w-0">
        <PageCrumbs
          crumbs={[
            { label: "Proiecte", href: "/" },
            { label: project.name, href: `/proiecte/${project.id}` },
          ]}
          current={title}
        />
        <h1 className="truncate text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div className="overflow-hidden rounded-xl bg-card inset-ring-(length:--hairline) inset-ring-border">
        <GenerationView phase={phase} draft={draft} status={status} progress={progress} connection={events.connection} onRerun={() => void rerun()} rerunning={rerunning} />
      </div>
    </div>
  );
}
