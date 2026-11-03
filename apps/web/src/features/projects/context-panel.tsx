"use client";

import { IconFileTypeDoc, IconFileTypeDocx, IconFileTypePdf, IconPaperclip, IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { forwardRef, useImperativeHandle, useRef, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { fullDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { removeContextFile } from "./actions";

export interface ProjectContextFile {
  id: string;
  name: string;
  status: "gata" | "ocr" | "eroare";
  error: string | null;
  chars: number;
  size: number;
  createdAt: number;
}

export interface ContextPanelHandle {
  /** încarcă fișierele în context (din butoane sau din tras-și-plasat pe pagină) */
  upload: (files: File[]) => void;
}

const MAX = 50 * 1024 * 1024;
const OK_EXT = /\.(docx|doc|pdf|png|jpe?g)$/i;
const ACCEPT = ".pdf,.docx,.doc,.png,.jpg,.jpeg";

function fmtSize(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function fmtChars(n: number) {
  return `${n.toLocaleString("ro-RO")} ${n === 1 ? "caracter" : "caractere"}`;
}

function FileIcon({ name, className }: { name: string; className?: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return <IconPhoto className={cn("text-muted-foreground", className)} />;
  const Icon = ext === "pdf" ? IconFileTypePdf : ext === "doc" ? IconFileTypeDoc : IconFileTypeDocx;
  return <Icon className={cn(ext === "pdf" ? "text-v-eroare" : "text-info", className)} />;
}

/**
 * Fișierele de context ale proiectului: material de lucru care intră automat în toate generările
 * din proiect (documente noi și chat), fără analiză. Imaginile și PDF-urile scanate trec prin OCR.
 */
export const ContextPanel = forwardRef<ContextPanelHandle, { projectId: string; files: ProjectContextFile[]; archived: boolean; now: number }>(function ContextPanel(
  { projectId, files, archived, now },
  ref,
) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string[]>([]);
  const [toDelete, setToDelete] = useState<ProjectContextFile | null>(null);
  const [, start] = useTransition();

  async function upload(list: File[]) {
    const ok: File[] = [];
    for (const f of list) {
      if (!OK_EXT.test(f.name)) toast.error(`„${f.name}”: format neacceptat. Folosește PDF, DOCX, DOC, PNG sau JPG.`);
      else if (f.size > MAX) toast.error(`„${f.name}” are ${fmtSize(f.size)}. Limita este 50 MB.`);
      else ok.push(f);
    }
    if (!ok.length) return;
    setUploading((u) => [...u, ...ok.map((f) => f.name)]);
    let added = 0;
    let ocr = 0;
    for (const f of ok) {
      const body = new FormData();
      body.append("file", f);
      try {
        const res = await fetch(`/api/proiecte/${projectId}/context`, { method: "POST", body });
        const data = (await res.json().catch(() => ({}))) as { eroare?: string; ocrJobId?: string | null };
        if (!res.ok) toast.error(`„${f.name}”: ${data.eroare ?? "încărcarea a eșuat."}`);
        else {
          added++;
          if (data.ocrJobId) ocr++;
        }
      } catch {
        toast.error(`„${f.name}”: încărcarea a eșuat. Verifică conexiunea și încearcă din nou.`);
      }
      setUploading((u) => {
        const i = u.indexOf(f.name);
        return i < 0 ? u : [...u.slice(0, i), ...u.slice(i + 1)];
      });
      router.refresh();
    }
    if (added) toast.success(`${added === 1 ? "Un fișier adăugat" : `${added} fișiere adăugate`} în context${ocr ? `; textul din ${ocr === 1 ? "imagine sau paginile scanate se recunoaște" : `${ocr} fișiere se recunoaște`} în fundal` : ""}.`);
  }

  useImperativeHandle(ref, () => ({ upload: (list) => void upload(list) }));

  const picker = (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={ACCEPT}
      className="hidden"
      onChange={(e) => {
        const list = [...(e.target.files ?? [])];
        e.target.value = "";
        void upload(list);
      }}
    />
  );

  if (!files.length && !uploading.length) {
    return (
      <Empty className="rounded-lg border border-dashed py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon"><IconPaperclip /></EmptyMedia>
          <EmptyTitle>Niciun fișier de context</EmptyTitle>
          <EmptyDescription>
            Adaugă acte, corespondență, înscrisuri sau modele. Textul lor intră automat în toate generările din proiect (documente noi și chat), fără să fie analizate.
          </EmptyDescription>
        </EmptyHeader>
        {!archived && (
          <EmptyContent>
            <Button onClick={() => inputRef.current?.click()}><IconUpload /> Adaugă fișiere</Button>
            <p className="text-xs text-muted-foreground">PDF, DOCX, DOC, PNG sau JPG · maximum 50 MB · imaginile trec prin recunoașterea textului</p>
            {picker}
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Textul acestor fișiere intră automat, alături de documentele proiectului, în toate generările din proiect (documente noi și chat). Nu se analizează.
      </p>
      <ul className="flex flex-col divide-y rounded-lg border">
        {files.map((f) => (
          <li key={f.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
            <FileIcon name={f.name} className="size-5 shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium" title={f.name}>{f.name}</span>
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                {f.status === "ocr" && <Spinner className="size-3 shrink-0" />}
                <span className={cn("truncate", f.status === "eroare" && "text-destructive")}>
                  {[
                    fmtSize(f.size),
                    f.status === "ocr" ? "se recunoaște textul…" : f.status === "eroare" ? (f.error ?? "textul nu a putut fi citit") : fmtChars(f.chars),
                  ].join(" · ")}
                </span>
              </span>
            </span>
            <span className="hidden shrink-0 text-xs text-muted-foreground sm:block" title={fullDate(f.createdAt)}>{relativeTime(f.createdAt, now)}</span>
            {!archived && (
              <Button variant="ghost" size="icon-sm" aria-label={`Scoate „${f.name}” din context`} onClick={() => setToDelete(f)}>
                <IconTrash />
              </Button>
            )}
          </li>
        ))}
        {uploading.map((name, i) => (
          <li key={`${name}-${i}`} className="flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground">
            <FileIcon name={name} className="size-5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{name}</span>
            <Spinner className="size-4 shrink-0" />
            <span className="shrink-0 text-xs">se încarcă…</span>
          </li>
        ))}
      </ul>
      {!archived && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          >
            <IconUpload className="size-4" /> Trage fișiere aici sau adaugă (PDF, DOCX, DOC, PNG, JPG)
          </button>
          {picker}
        </>
      )}

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scoți „{toDelete?.name}” din context?</AlertDialogTitle>
            <AlertDialogDescription>Fișierul se șterge din proiect și nu mai intră în generări. Documentele generate deja rămân neschimbate.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                const f = toDelete;
                setToDelete(null);
                if (!f) return;
                start(async () => {
                  const r = await removeContextFile(projectId, f.id);
                  if (r.ok) toast("Fișier scos din context");
                  else toast.error(r.error);
                  router.refresh();
                });
              }}
            >
              Scoate din context
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
