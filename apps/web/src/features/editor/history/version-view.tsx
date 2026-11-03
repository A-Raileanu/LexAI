"use client";

import type { DocumentMeta, JSONContent } from "@lexai/docx";
import { IconArrowsLeftRight, IconChevronDown, IconChevronUp, IconInfoCircle, IconRestore, IconX } from "@tabler/icons-react";
import { useRef, useState, type ReactNode } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { VersionSummary } from "../actions";
import type { DiffResult } from "../diff";
import { dateTime, dateTimeShort } from "../fmt";
import { diffExtensions } from "../schema/diff-marks";
import { usePagination } from "../pagination/use-pagination";
import { A4Sheet } from "../sheet";
import { LexEditorContent, useReadOnlyEditor } from "../use-lex-editor";
import { DRAFT } from "./history-panel";
import { OriginBadge } from "./origin";

export type ViewMode =
  | { kind: "edit" }
  | { kind: "preview"; versionId: string; content: JSONContent | null; error?: string }
  | { kind: "compare"; left: string; right: string; result: DiffResult | null; onlyChanged: boolean; large: boolean; error?: string };

/** Peste atâtea modificări afișăm implicit doar paragrafele schimbate. */
export const LARGE_DIFF = 500;

const LINES = [96, 100, 88, 100, 92, 0, 100, 97, 84, 0, 100, 91];

function ReadOnlyDoc({ content, meta, zoom, diff }: { content: JSONContent; meta: DocumentMeta; zoom: number; diff: boolean }) {
  const editor = useReadOnlyEditor(content, meta, diff ? diffExtensions() : []);
  const { pages } = usePagination(editor);
  return (
    <A4Sheet meta={meta} zoom={zoom} pages={pages}>
      <LexEditorContent editor={editor} />
    </A4Sheet>
  );
}

/** Foaia doar pentru citire (versiune veche sau comparare), pe același fundal ca editorul. */
export function VersionSheet({
  content,
  contentKey,
  meta,
  zoom,
  diff,
  loading,
  containerRef,
  children,
  footer,
}: {
  content: JSONContent | null;
  contentKey: string;
  meta: DocumentMeta;
  zoom: number;
  diff: boolean;
  loading: boolean;
  containerRef?: React.Ref<HTMLDivElement>;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const hinted = useRef(0);
  return (
    <div
      ref={containerRef}
      className="lex-readonly relative min-h-0 flex-1 overflow-auto bg-desk px-4 py-8"
      onKeyDown={(e) => {
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && Date.now() - hinted.current > 4000) {
          hinted.current = Date.now();
          toast.info("Restaurează versiunea pentru a o edita.", { id: "readonly-hint" });
        }
      }}
    >
      {children}
      {loading || !content ? (
        <A4Sheet meta={meta} zoom={zoom}>
          <div className="flex flex-col gap-3" aria-busy="true">
            {LINES.map((w, i) => (w ? <Skeleton key={i} className="h-3.5 bg-black/8" style={{ width: `${w}%` }} /> : <div key={i} className="h-3" />))}
          </div>
        </A4Sheet>
      ) : (
        <ReadOnlyDoc key={contentKey} content={content} meta={meta} zoom={zoom} diff={diff} />
      )}
      {footer}
    </div>
  );
}

export function PreviewBanner({
  version,
  onCompare,
  onRestore,
  onClose,
  restoreDisabled,
  showBack,
}: {
  version: VersionSummary | undefined;
  onCompare: () => void;
  onRestore: () => void;
  onClose: () => void;
  restoreDisabled: boolean;
  showBack: boolean;
}) {
  return (
    <Alert variant="info" appearance="soft" className="rounded-none border-x-0 border-t-0">
      <IconInfoCircle aria-hidden />
      <AlertTitle className="flex flex-wrap items-center gap-2">
        {version ? `Vizualizezi versiunea din ${dateTime(version.createdAt)}.` : "Vizualizezi o versiune."}
        {version && <OriginBadge origin={version.origin} />}
      </AlertTitle>
      <AlertDescription>Documentul nu poate fi editat aici.</AlertDescription>
      <AlertAction className="flex-wrap">
        <Button variant="outline" size="xs" onClick={onCompare}>
          <IconArrowsLeftRight />
          Compară cu actuala
        </Button>
        <Button size="xs" onClick={onRestore} disabled={restoreDisabled}>
          <IconRestore />
          Restaurează această versiune
        </Button>
        <Button variant="ghost" size={showBack ? "xs" : "icon-xs"} aria-label="Închide vizualizarea" onClick={onClose}>
          {showBack ? "Înapoi la istoric" : <IconX />}
        </Button>
      </AlertAction>
    </Alert>
  );
}

function SideSelect({ value, versions, onChange, label }: { value: string; versions: VersionSummary[]; onChange: (v: string) => void; label: string }) {
  const items: Record<string, string> = {
    [DRAFT]: "Ciorna curentă",
    ...Object.fromEntries(versions.map((v) => [v.id, `${dateTimeShort(v.createdAt)} · v${v.number}`])),
  };
  return (
    <Select value={value} onValueChange={(v) => v && onChange(String(v))} items={items}>
      <SelectTrigger size="sm" className="max-w-56 min-w-0" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(items).map(([k, l]) => (
          <SelectItem key={k} value={k}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CompareBand({
  mode,
  versions,
  onChange,
  onToggleAll,
  onRestoreOld,
  onClose,
}: {
  mode: Extract<ViewMode, { kind: "compare" }>;
  versions: VersionSummary[];
  onChange: (left: string, right: string) => void;
  onToggleAll: (showAll: boolean) => void;
  onRestoreOld: () => void;
  onClose: () => void;
}) {
  const r = mode.result;
  return (
    <div className="flex flex-col gap-1.5 border-b bg-background px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Compari</span>
        <SideSelect label="Versiunea veche" value={mode.left} versions={versions} onChange={(v) => onChange(v, mode.right)} />
        <IconArrowsLeftRight className="size-4 text-muted-foreground" aria-hidden />
        <SideSelect label="Versiunea nouă" value={mode.right} versions={versions} onChange={(v) => onChange(mode.left, v)} />
        <div className="ms-auto flex items-center gap-1">
          <Button variant="outline" size="xs" onClick={onRestoreOld} disabled={mode.left === DRAFT}>
            <IconRestore />
            Restaurează versiunea veche
          </Button>
          <Button variant="ghost" size="icon-xs" aria-label="Închide compararea" onClick={onClose}>
            <IconX />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {mode.error ? (
          <span className="text-destructive">{mode.error}</span>
        ) : !r ? (
          <span>Se compară…</span>
        ) : r.identical ? (
          <span>Versiunile sunt identice.</span>
        ) : (
          <>
            <span className="text-v-corect">+{r.wordsAdded.toLocaleString("ro-RO")} cuvinte</span>
            <span className="text-v-eroare">−{r.wordsRemoved.toLocaleString("ro-RO")} cuvinte</span>
            <span>· {r.changes === 1 ? "1 modificare" : `${r.changes.toLocaleString("ro-RO")} modificări`}</span>
          </>
        )}
        {mode.large && (
          <label className="ms-auto flex items-center gap-2">
            <span>Multe modificări: afișăm doar paragrafele schimbate.</span>
            <Switch checked={!mode.onlyChanged} onCheckedChange={(v) => onToggleAll(Boolean(v))} aria-label="Arată tot documentul" />
            <span>Arată tot documentul</span>
          </label>
        )}
      </div>
    </div>
  );
}

/** „Modificarea i din n ↑ ↓”, bara flotantă de navigare. */
export function ChangeNav({ total, onGo }: { total: number; onGo: (index: number) => void }) {
  const [index, setIndex] = useState(-1);
  if (total <= 0) return null;
  const go = (dir: 1 | -1) => {
    const next = index < 0 ? (dir > 0 ? 0 : total - 1) : (index + dir + total) % total;
    setIndex(next);
    onGo(next);
  };
  return (
    <div className="pointer-events-none sticky bottom-4 z-10 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-lg bg-popover p-1 ps-3 text-sm shadow-md ring-(length:--hairline) ring-foreground/10">
        <span className="tabular-nums" aria-live="polite">
          {index < 0 ? `${total === 1 ? "1 modificare" : `${total} modificări`}` : `Modificarea ${index + 1} din ${total}`}
        </span>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Modificarea anterioară" data-change-nav="prev" onClick={() => go(-1)} />}>
            <IconChevronUp />
          </TooltipTrigger>
          <TooltipContent>
            Anterioara <Kbd keys="mod+alt+[" size="sm" />
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Modificarea următoare" data-change-nav="next" onClick={() => go(1)} />}>
            <IconChevronDown />
          </TooltipTrigger>
          <TooltipContent>
            Următoarea <Kbd keys="mod+alt+]" size="sm" />
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/** Derulează la modificarea `index` din foaia de comparare și o face să pulseze. */
export function scrollToChange(container: HTMLElement | null, index: number) {
  const el = container?.querySelector<HTMLElement>(`[data-change="${index}"]`);
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  container?.querySelectorAll(".lex-diff-current").forEach((n) => n.classList.remove("lex-diff-current"));
  container?.querySelectorAll(`[data-change="${index}"]`).forEach((n) => n.classList.add("lex-diff-current"));
}
