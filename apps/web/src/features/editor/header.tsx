"use client";

import {
  IconAdjustmentsHorizontal,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconDeviceFloppy,
  IconDots,
  IconHistory,
  IconKeyboard,
  IconPencil,
  IconPrinter,
  IconSearch,
  IconSparkles,
  IconSunMoon,
} from "@tabler/icons-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { SequenceKeys, ThemeRadioItems } from "@/components/app-shell/app-menu";
import { openCommandPalette } from "@/components/app-shell/command-palette";
import { Brand } from "@/components/brand";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { EXPORT_FORMATS, type ExportContext, type ExportFormat } from "./export/formats";
import { SaveChip } from "./save-chip";
import type { SaveState } from "./use-autosave";

const K = ({ keys }: { keys: string }) => (
  <DropdownMenuShortcut>
    <Kbd keys={keys} size="sm" variant="flat" />
  </DropdownMenuShortcut>
);

function TitleEditor({ title, onRename, editing, setEditing }: { title: string; onRename: (t: string) => Promise<boolean>; editing: boolean; setEditing: (v: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  if (!editing) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="min-w-0 truncate rounded-sm px-1 text-sm font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-focus-ring"
              onClick={() => setEditing(true)}
              aria-label={`Titlul documentului: ${title}. Click pentru a redenumi`}
            />
          }
        >
          {title}
        </TooltipTrigger>
        <TooltipContent>Redenumește</TooltipContent>
      </Tooltip>
    );
  }
  const commit = async (value: string) => {
    const v = value.trim();
    if (!v || v === title) {
      setEditing(false);
      return;
    }
    setBusy(true);
    const ok = await onRename(v);
    setBusy(false);
    if (ok) setEditing(false);
  };
  return (
    <Input
      autoFocus
      defaultValue={title}
      disabled={busy}
      aria-label="Titlul documentului"
      className="h-7 w-[min(28rem,50vw)] text-sm font-medium"
      onFocus={(e) => e.currentTarget.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void commit(e.currentTarget.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
        }
      }}
      onBlur={(e) => void commit(e.currentTarget.value)}
    />
  );
}

/**
 * Butonul split din antet (docs/ux/12-export.md): „Salvează” salvează o versiune (⌘S), iar fără
 * modificări arată „Salvat”. `▾` deschide exportul rapid (DOCX, PDF, DOCX adnotat după o analiză),
 * „Printează…” (⌘P) și dialogul de export. Sub 640 px rămân doar iconițele.
 */
function SaveSplitButton(p: Props) {
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    await p.onSaveVersion("");
    setBusy(false);
  };
  const saved = !p.needsSave && !busy;
  return (
    <ButtonGroup>
      {saved ? (
        <Button size="sm" disabled aria-label="Salvat: nicio modificare de la ultima versiune">
          <IconCheck />
          <span className="max-sm:sr-only">Salvat</span>
        </Button>
      ) : (
        <Tooltip>
          <TooltipTrigger render={<Button size="sm" loading={busy} disabled={p.readOnly} onClick={() => void save()} />}>
            <IconDeviceFloppy />
            <span className="max-sm:sr-only">Salvează</span>
          </TooltipTrigger>
          <TooltipContent>
            Salvează versiunea <Kbd keys="mod+s" size="sm" />
          </TooltipContent>
        </Tooltip>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon-sm" aria-label="Export și printare" />}>
          <IconChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Exportă ca</DropdownMenuLabel>
            {/* DOCX adnotat apare doar după o analiză */}
            {EXPORT_FORMATS.filter((f) => f.available(p.exportCtx).ok).map((f) => {
              const I = f.icon;
              return (
                <DropdownMenuItem key={f.id} onClick={() => p.onQuickExport(f)}>
                  <I />
                  {f.menuTitle}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={p.onPrint}>
            <IconPrinter />
            Printează…
            <K keys="mod+p" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={p.onExport}>
            <IconAdjustmentsHorizontal />
            Opțiuni de export…
            <K keys="mod+shift+e" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}

interface Props {
  project: { id: string; name: string };
  title: string;
  onRename: (title: string) => Promise<boolean>;
  save: SaveState;
  saveOpen: boolean;
  onSaveOpenChange: (open: boolean) => void;
  onSaveVersion: (note: string) => Promise<boolean>;
  onRetrySave: () => void;
  /** conținutul diferă de ultima versiune (altfel „Salvează” arată „Salvat”) */
  needsSave: boolean;
  readOnly: boolean;
  compact: boolean;
  onVersions: () => void;
  onAnalyze: () => void;
  /** starea compactă a analizei în curs (pastila din features/analysis) */
  analysisStatus?: ReactNode;
  onExport: () => void;
  onQuickExport: (format: ExportFormat) => void;
  onPrint: () => void;
  exportCtx: ExportContext;
  onShortcuts: () => void;
}

/** Antetul editorului (48 px): breadcrumb cu titlul editabil, starea salvării, acțiunile. */
export function EditorHeader(p: Props) {
  const [editing, setEditing] = useState(false);
  return (
    <header data-titlebar className="flex h-12 shrink-0 items-center gap-1 border-b bg-background px-2 sm:px-3">
      {/* fără bară globală: ◆ duce acasă; sub 640 px îl înlocuiește „‹” spre proiect (docs/ux/17) */}
      <Tooltip>
        <TooltipTrigger render={<Link href="/" aria-label="LexAI — Proiecte" className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "hidden sm:inline-flex")} />}>
          <Brand compact />
        </TooltipTrigger>
        <TooltipContent>
          Proiecte · <SequenceKeys keys="g p" />
        </TooltipContent>
      </Tooltip>
      <Separator orientation="vertical" className="mx-1 hidden h-5 self-center sm:block" />
      <Tooltip>
        <TooltipTrigger render={<Link href={`/proiecte/${p.project.id}`} aria-label={`Înapoi la ${p.project.name}`} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "sm:hidden")} />}>
          <IconChevronLeft />
        </TooltipTrigger>
        <TooltipContent>Înapoi la proiect</TooltipContent>
      </Tooltip>
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          <BreadcrumbItem className="hidden min-w-0 sm:inline-flex">
            <BreadcrumbLink render={<Link href={`/proiecte/${p.project.id}`} />} className="max-w-32 truncate lg:max-w-48">
              {p.project.name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden sm:inline-flex">/</BreadcrumbSeparator>
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="min-w-0">
              <TitleEditor title={p.title} onRename={p.onRename} editing={editing} setEditing={setEditing} />
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <SaveChip state={p.save} open={p.saveOpen} onOpenChange={p.onSaveOpenChange} onSaveVersion={p.onSaveVersion} onRetry={p.onRetrySave} disabled={p.readOnly} />

      <div className="ms-auto flex shrink-0 items-center gap-1.5">
        {p.analysisStatus}
        {p.compact ? (
          <>
            <Tooltip>
              <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Versiuni" onClick={p.onVersions} />}>
                <IconHistory />
              </TooltipTrigger>
              <TooltipContent>
                Versiuni <Kbd keys="mod+shift+y" size="sm" />
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline" size="icon-sm" aria-label="Analizează" onClick={p.onAnalyze} />}>
                <IconSparkles className="text-ai" />
              </TooltipTrigger>
              <TooltipContent>
                Analizează <Kbd keys="mod+shift+a" size="sm" />
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={p.onVersions}>
              <IconHistory />
              Versiuni
            </Button>
            <Button variant="outline" size="sm" onClick={p.onAnalyze}>
              <IconSparkles className="text-ai" />
              Analizează
            </Button>
          </>
        )}
        <SaveSplitButton {...p} />
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Mai multe acțiuni" />}>
            <IconDots />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem onClick={() => setEditing(true)}>
              <IconPencil />
              Redenumește
            </DropdownMenuItem>
            <DropdownMenuItem onClick={p.onShortcuts}>
              <IconKeyboard />
              Scurtături de tastatură
              <K keys="mod+/" />
            </DropdownMenuItem>
            {/* ce era în sidebar, ca editorul să nu trebuiască părăsit */}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Aplicație</DropdownMenuLabel>
              <DropdownMenuItem onClick={openCommandPalette}>
                <IconSearch />
                Caută…
                <K keys="mod+k" />
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <IconSunMoon />
                  Temă
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-44">
                  <ThemeRadioItems />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
