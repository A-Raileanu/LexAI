"use client";

import { IconX } from "@tabler/icons-react";
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FindingsPanel } from "@/features/analysis/findings-panel";
import { ChatPanel } from "@/features/chat/chat-panel";
import { GroundsPanel } from "@/features/drafting/grounds-panel";
import type { DraftingSession } from "@/features/drafting/use-drafting-session";
import type { EditorBridge } from "../bridge";
import { HistoryPanel } from "../history/history-panel";
import type { PanelTab } from "../types";

interface Props {
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  kind: "incarcat" | "generat";
  documentId: string;
  versionId: string | null;
  bridge: EditorBridge;
  drafting: DraftingSession;
  history: ComponentProps<typeof HistoryPanel>;
  onClose: () => void;
  /** „arată în document” din chat (pe ecran îngust închide foaia) */
  onLocate?: () => void;
}

/** Panoul lateral: Constatări · De completat (doar documente generate) · Chat · Istoric. */
export function SidePanel({ tab, onTabChange, kind, documentId, versionId, bridge, drafting, history, onClose, onLocate }: Props) {
  const current = kind !== "generat" && tab === "temeiuri" ? "constatari" : tab;
  return (
    <Tabs value={current} onValueChange={(v) => onTabChange(v as PanelTab)} className="flex h-full min-h-0 flex-col gap-0 bg-background">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b px-2">
        <TabsList variant="line" className="h-10 flex-1 shadow-none">
          <TabsTrigger value="constatari">Constatări</TabsTrigger>
          {kind === "generat" && <TabsTrigger value="temeiuri">De completat</TabsTrigger>}
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="istoric">Istoric</TabsTrigger>
        </TabsList>
        <Button variant="ghost" size="icon-xs" aria-label="Închide panoul" onClick={onClose}>
          <IconX />
        </Button>
      </div>
      <TabsContent value="constatari" className="min-h-0 flex-1 overflow-y-auto">
        <FindingsPanel documentId={documentId} versionId={versionId} editor={bridge} />
      </TabsContent>
      {kind === "generat" && (
        <TabsContent value="temeiuri" className="min-h-0 flex-1 overflow-y-auto">
          <GroundsPanel documentId={documentId} editor={bridge} session={drafting} onAnalyze={() => onTabChange("constatari")} />
        </TabsContent>
      )}
      <TabsContent value="chat" className="min-h-0 flex-1">
        <ChatPanel markScope={bridge.markChatScope} onLocate={onLocate} />
      </TabsContent>
      <TabsContent value="istoric" className="min-h-0 flex-1">
        <HistoryPanel {...history} />
      </TabsContent>
    </Tabs>
  );
}
