"use client";

import { IconListCheck, IconShieldCheck } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { BridgePlaceholder, BridgeSegment, EditorBridge } from "@/features/editor/bridge";
import { rerunDraftingAction } from "./actions";
import { FillList } from "./fill-list";
import { GenerationView } from "./generation-view";
import { FOCUS_RING } from "./ui";
import type { DraftingSession } from "./use-drafting-session";

interface DocSnapshot {
  placeholders: BridgePlaceholder[];
  segments: BridgeSegment[];
  segOrder: string[];
  segText: Map<string, string>;
}

/** Câmpurile și blocurile documentului, recalculate doar când documentul se schimbă. */
function createDocStore(bridge: EditorBridge, version: () => unknown) {
  let key: unknown = Symbol("none");
  let value: DocSnapshot = { placeholders: [], segments: [], segOrder: [], segText: new Map() };
  return () => {
    const v = version();
    if (v !== key) {
      key = v;
      const segments = bridge.getSegments();
      const placeholders = bridge.listPlaceholders();
      const sameOrder = segments.length === value.segments.length && segments.every((s, i) => s.segId === value.segments[i].segId && s.text === value.segments[i].text);
      value = sameOrder
        ? { ...value, placeholders, segments: value.segments }
        : { placeholders, segments, segOrder: segments.map((s) => s.segId), segText: new Map(segments.map((s) => [s.segId, s.text])) };
    }
    return value;
  };
}

const EMPTY_SNAPSHOT: DocSnapshot = { placeholders: [], segments: [], segOrder: [], segText: new Map() };

interface Props {
  documentId: string;
  editor: EditorBridge;
  session: DraftingSession;
  /** comută panoul pe „Constatări” (verificarea documentului) */
  onAnalyze?: () => void;
}

/**
 * Fila „De completat” a documentelor generate: în timpul generării, progresul; apoi eroarea
 * sau oprirea; la final, doar câmpurile `[● …]` rămase în document.
 */
export function GroundsPanel({ documentId, editor, session, onAnalyze }: Props) {
  const router = useRouter();
  const [rerunning, setRerunning] = useState(false);
  const { phase, draft, status, progress, connection } = session;

  const rerun = async () => {
    setRerunning(true);
    try {
      const res = await rerunDraftingAction(documentId);
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

  if (phase === "loading" || phase === "off") {
    return (
      <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="Se încarcă documentul generat">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
      </div>
    );
  }

  if (phase === "none") {
    return (
      <Empty className="h-full">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconListCheck />
          </EmptyMedia>
          <EmptyTitle>De completat</EmptyTitle>
          <EmptyDescription>{session.loadError ?? "Documentul nu a fost generat de LexAI sau generarea nu s-a încheiat."}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (phase === "generating" || phase === "finishing" || phase === "failed") {
    return <GenerationView phase={phase} draft={draft} status={status} progress={progress} connection={connection} onRerun={() => void rerun()} rerunning={rerunning} />;
  }

  return <DoneView bridge={editor} session={session} onAnalyze={onAnalyze} />;
}

function DoneView({ bridge, session, onAnalyze }: { bridge: EditorBridge; session: DraftingSession; onAnalyze?: () => void }) {
  const getSnapshot = useMemo(() => createDocStore(bridge, session.docVersion), [bridge, session.docVersion]);
  const doc = useSyncExternalStore(session.subscribeDoc, getSnapshot, () => EMPTY_SNAPSHOT);

  // după generare rămân doar câmpurile de completat; ce e „de verificat” apare în Constatări, după analiză
  return (
    <div className="flex flex-col">
      <FillList bridge={bridge} placeholders={doc.placeholders} segments={doc.segments} initial={session.draft?.conformitate?.deCompletat ?? []} />
      {onAnalyze && (
        <div className="mt-2 flex flex-col gap-3 border-t border-divider px-4 py-4">
          <p className="flex items-start gap-2 text-md">
            <IconShieldCheck aria-hidden className="mt-[3px] size-4 shrink-0 text-ai" />
            <span>După ce completezi documentul, verifică-l: analiza confirmă fiecare trimitere la lege din textul final și arată în Constatări ce trebuie verificat.</span>
          </p>
          <Button variant="outline" size="sm" className={cn("self-start", FOCUS_RING)} onClick={onAnalyze}>
            Verifică documentul
          </Button>
        </div>
      )}
    </div>
  );
}
