"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { RadioGroup, RadioGroupCard, RadioGroupCardDescription, RadioGroupCardTitle } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { VersionSummary } from "../actions";
import { dateTimeShort } from "../fmt";
import { downloadFile } from "./download";
import { FORBIDDEN_FILENAME, exportFileName } from "./filename";
import { EXPORT_FORMATS, formatById, type ExportContext, type ExportFormat, type ExportOptions } from "./formats";

const LAST_FORMAT_KEY = "lexai:export:format";

export function lastFormatId(): string {
  try {
    return window.localStorage.getItem(LAST_FORMAT_KEY) ?? EXPORT_FORMATS[0].id;
  } catch {
    return EXPORT_FORMATS[0].id;
  }
}

function rememberFormat(id: string) {
  try {
    window.localStorage.setItem(LAST_FORMAT_KEY, id);
  } catch {
    // ignorăm
  }
}

export interface ExportIssues {
  placeholders: number;
  suggestions: number;
}

/**
 * Exportă imediat (meniul rapid sau butonul din dialog): salvează întâi ciorna, apoi descarcă,
 * cu stare în Toast. Întoarce false dacă a eșuat.
 */
export async function runExport(format: ExportFormat, ctx: ExportContext, opts: ExportOptions, beforeExport: () => Promise<boolean>): Promise<boolean> {
  const id = toast.loading(`Se generează ${format.menuTitle}…`);
  try {
    if (!opts.versionId) await beforeExport();
    const { name } = await downloadFile(format.url(ctx, opts), `${opts.fileName || "document"}.${format.ext}`);
    rememberFormat(format.id);
    toast.update(id, {
      type: "success",
      title: `${name} a fost descărcat.`,
      action: { label: "Descarcă din nou", onClick: () => void runExport(format, ctx, opts, beforeExport) },
    });
    return true;
  } catch (e) {
    toast.update(id, {
      type: "error",
      title: "Nu am putut genera fișierul.",
      description: e instanceof Error ? e.message : undefined,
      action: { label: "Încearcă din nou", onClick: () => void runExport(format, ctx, opts, beforeExport) },
    });
    return false;
  }
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ctx: ExportContext;
  title: string;
  versions: VersionSummary[];
  currentVersionId: string | null;
  hasDraft: boolean;
  issues: ExportIssues;
  onGotoPlaceholder: () => void;
  onGotoSuggestion: () => void;
  beforeExport: () => Promise<boolean>;
}

/** Dialogul de export: ce exporți (carduri), avertismentul „Înainte de export”, opțiunile. */
export function ExportDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent size="lg">{props.open && <ExportForm {...props} />}</DialogContent>
    </Dialog>
  );
}

function ExportForm({ onOpenChange, ctx, title, versions, currentVersionId, hasDraft, issues, onGotoPlaceholder, onGotoSuggestion, beforeExport }: Props) {
  const current = versions.find((v) => v.id === currentVersionId) ?? null;
  const [formatId, setFormatId] = useState(() => {
    const f = formatById(lastFormatId());
    return f.available(ctx).ok ? f.id : EXPORT_FORMATS[0].id;
  });
  const [versionId, setVersionId] = useState<string>("ciorna");
  const selectedVersion = versionId === "ciorna" ? null : (versions.find((v) => v.id === versionId) ?? null);
  const defaultName = exportFileName(title, selectedVersion?.number ?? current?.number ?? null, !selectedVersion && hasDraft, "x").replace(/\.x$/, "");
  const [fileName, setFileName] = useState<string | null>(null);
  const name = fileName ?? defaultName;
  const [keepHighlights, setKeepHighlights] = useState(false);
  const [pageNumbers, setPageNumbers] = useState(false);
  const [busy, setBusy] = useState(false);

  const format = formatById(formatId);
  const nameError = FORBIDDEN_FILENAME.test(name) ? 'Numele nu poate conține / \\ : * ? " < > |' : null;
  const versionLabel = selectedVersion ? `versiunea ${selectedVersion.number}` : "ciorna curentă";

  const submit = async () => {
    if (nameError || !format.available(ctx).ok) return;
    setBusy(true);
    const ok = await runExport(format, ctx, { versionId: selectedVersion?.id ?? null, fileName: name, keepHighlights: format.options.keepHighlights && keepHighlights, pageNumbers: format.options.pageNumbers && pageNumbers }, beforeExport);
    setBusy(false);
    if (ok) onOpenChange(false);
  };

  const versionItems: Record<string, string> = {
    ciorna: "Ciorna curentă",
    ...Object.fromEntries(versions.map((v) => [v.id, `${dateTimeShort(v.createdAt)} · v${v.number}${v.note ? ` · ${v.note}` : ""}`])),
  };

  return (
    <form
      className="contents"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <DialogHeader>
        <DialogTitle>Export</DialogTitle>
        <DialogDescription>
          {title} · {versionLabel}
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Ce exporți</h3>
          <RadioGroup variant="card" value={formatId} onValueChange={(v) => setFormatId(String(v))} className="grid gap-2 sm:grid-cols-3" aria-label="Formatul exportului">
            {EXPORT_FORMATS.map((f) => {
              const a = f.available(ctx);
              const Icon = f.icon;
              return (
                <RadioGroupCard key={f.id} value={f.id} disabled={!a.ok} className="p-3">
                  <RadioGroupCardTitle className="flex items-center gap-2">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    {f.title}
                  </RadioGroupCardTitle>
                  <RadioGroupCardDescription className="text-xs">{a.ok ? f.description : `${f.description} ${a.reason.replace(/\.?$/, ".")}`}</RadioGroupCardDescription>
                </RadioGroupCard>
              );
            })}
          </RadioGroup>
        </section>

        {(issues.placeholders > 0 || issues.suggestions > 0) && (
          <Alert variant="warning" appearance="soft">
            <IconAlertTriangle aria-hidden />
            <AlertTitle>Înainte de export</AlertTitle>
            <AlertDescription className="flex flex-col gap-1">
              {issues.placeholders > 0 && (
                <p>
                  {issues.placeholders === 1 ? "1 câmp necompletat [● …] va apărea" : `${issues.placeholders} câmpuri necompletate [● …] vor apărea`} în fișier așa cum{" "}
                  {issues.placeholders === 1 ? "este" : "sunt"}.{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => {
                      onOpenChange(false);
                      onGotoPlaceholder();
                    }}
                  >
                    Mergi la primul ›
                  </Button>
                </p>
              )}
              {issues.suggestions > 0 && (
                <p>
                  {issues.suggestions === 1 ? "1 sugestie AI nerezolvată nu va fi inclusă." : `${issues.suggestions} sugestii AI nerezolvate nu vor fi incluse.`}{" "}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => {
                      onOpenChange(false);
                      onGotoSuggestion();
                    }}
                  >
                    Revizuiește ›
                  </Button>
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        <section className={cn("flex flex-col gap-3", !format.available(ctx).ok && "pointer-events-none opacity-50")}>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Opțiuni</h3>
          {format.options.version && (
            <Field className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3">
              <FieldLabel>Versiune</FieldLabel>
              <Select value={versionId} onValueChange={(v) => setVersionId(String(v))} items={versionItems}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(versionItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          {format.options.fileName && (
            <Field className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-3" invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="export-name" className="mt-2">
                Nume fișier
              </FieldLabel>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <InputGroup>
                  <InputGroupInput id="export-name" value={name} onChange={(e) => setFileName(e.target.value)} aria-invalid={Boolean(nameError)} spellCheck={false} />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>.{format.ext}</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {nameError && <FieldError>{nameError}</FieldError>}
              </div>
            </Field>
          )}
          {format.options.keepHighlights && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={keepHighlights} onCheckedChange={(v) => setKeepHighlights(Boolean(v))} />
              Păstrează evidențierile de culoare din text
            </label>
          )}
          {format.options.pageNumbers && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={pageNumbers} onCheckedChange={(v) => setPageNumbers(Boolean(v))} />
              Numerotează paginile („Pagina 2 din 5” în subsol)
            </label>
          )}
        </section>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Anulează
        </Button>
        <Button type="submit" loading={busy} loadingLabel="Se generează…" disabled={!format.available(ctx).ok || Boolean(nameError)}>
          {format.buttonLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
