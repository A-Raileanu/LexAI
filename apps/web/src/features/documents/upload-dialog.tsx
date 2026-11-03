"use client";

import { IconAlertTriangle, IconCheck, IconCircle, IconFileTypeDoc, IconFileTypeDocx, IconFileTypePdf, IconUpload, IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { ReferenceDateField } from "./reference-date";

const MAX = 50 * 1024 * 1024;
const OK_EXT = /\.(docx|doc|pdf)$/i;

function fmtSize(n: number) {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function FileIcon({ name, className }: { name: string; className?: string }) {
  const ext = name.split(".").pop()?.toLowerCase();
  const Icon = ext === "pdf" ? IconFileTypePdf : ext === "doc" ? IconFileTypeDoc : IconFileTypeDocx;
  return <Icon className={cn(ext === "pdf" ? "text-v-eroare" : "text-info", className)} />;
}

type Step = "alegere" | "incarcare" | "import" | "gata" | "eroare";

interface UploadResult {
  documentId: string;
  warnings: string[];
  ocrPages: number[];
  jobId: string | null;
  ocrJobId: string | null;
}

export function UploadDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  today,
  defaultDate,
  initialFile,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  projectName: string;
  today: string;
  defaultDate: string;
  initialFile?: File | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [date, setDate] = useState(defaultDate);
  const [analyze, setAnalyze] = useState(true);
  const [step, setStep] = useState<Step>("alegere");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [prevInitial, setPrevInitial] = useState(initialFile);
  if (initialFile !== prevInitial) {
    setPrevInitial(initialFile);
    if (initialFile) setFile(initialFile);
  }

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (!OK_EXT.test(f.name)) {
      setError(`Fișierul „${f.name}” nu poate fi analizat. Acceptăm DOCX, DOC și PDF.`);
      return;
    }
    if (f.size > MAX) {
      setError(`Fișierul are ${fmtSize(f.size)}. Limita este 50 MB.`);
      return;
    }
    setError(null);
    setFile(f);
  };

  const reset = () => {
    setFile(null);
    setStep("alegere");
    setProgress(0);
    setError(null);
    setResult(null);
  };

  const close = (o: boolean) => {
    if (!o && (step === "incarcare" || step === "import")) {
      xhrRef.current?.abort();
    }
    onOpenChange(o);
    if (!o) setTimeout(reset, 200);
  };

  const submit = () => {
    if (!file) return;
    const body = new FormData();
    body.set("file", file);
    body.set("dataReferinta", date);
    body.set("analizeaza", analyze ? "1" : "0");
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    setStep("incarcare");
    setProgress(0);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(e.loaded / e.total);
    };
    xhr.upload.onload = () => setStep("import");
    xhr.onerror = () => {
      setStep("eroare");
      setError("Nu am putut trimite fișierul. Verifică dacă serverul local rulează.");
    };
    xhr.onload = () => {
      let data: (UploadResult & { eroare?: string }) | null = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* răspuns invalid */
      }
      if (xhr.status >= 400 || !data || data.eroare) {
        setStep("eroare");
        setError(data?.eroare ?? "Nu am putut citi fișierul. Poate fi deteriorat.");
        return;
      }
      setResult(data);
      setStep("gata");
      router.refresh();
      if (data.jobId || data.ocrJobId) toast.success("Analiza a pornit. Te anunțăm când e gata.");
      else toast.success("Document încărcat.");
    };
    xhr.open("POST", `/api/proiecte/${projectId}/documente`);
    xhr.send(body);
  };

  const busy = step === "incarcare" || step === "import";

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Încarcă document pentru analiză</DialogTitle>
          <DialogDescription>
            {step === "alegere" ? `În proiectul „${projectName}”. Analiza rulează în fundal; poți continua lucrul cât timp e gata.` : `${file?.name ?? ""} · data de referință ${date.split("-").reverse().join(".")}`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {step === "alegere" && (
            <>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  pick(e.dataTransfer.files[0]);
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center transition-colors",
                  file ? "h-14 flex-row" : "py-9",
                  dragOver ? "border-primary bg-muted" : "border-border",
                )}
              >
                {!file && <IconUpload className="size-6 text-muted-foreground" />}
                <p className="text-sm text-muted-foreground">
                  {dragOver ? "Eliberează pentru a încărca" : file ? "" : "Trage fișierul aici sau"}{" "}
                  <Button type="button" variant={file ? "ghost" : "outline"} size="sm" onClick={() => inputRef.current?.click()}>
                    {file ? "Înlocuiește fișierul" : "Alege fișierul"}
                  </Button>
                </p>
                {!file && <p className="text-xs text-muted-foreground">DOCX, DOC sau PDF · maximum 50 MB</p>}
                <input ref={inputRef} type="file" accept=".docx,.doc,.pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              </div>
              {file && (
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 inset-ring-(length:--hairline) inset-ring-border">
                  <FileIcon name={file.name} className="size-6 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{fmtSize(file.size)}</span>
                  <Button variant="ghost" size="icon-sm" aria-label="Elimină fișierul" onClick={() => setFile(null)}>
                    <IconX />
                  </Button>
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <ReferenceDateField value={date} onChange={setDate} today={today} />
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={analyze} onCheckedChange={(v) => setAnalyze(Boolean(v))} />
                Pornește analiza juridică după import
              </label>
            </>
          )}

          {step !== "alegere" && (
            <ol className="flex flex-col gap-3">
              <StepRow
                state={step === "incarcare" ? "activ" : step === "eroare" && progress < 1 ? "eroare" : "gata"}
                label="Încărcare"
                detail={file ? `${fmtSize(file.size * Math.min(1, progress))} / ${fmtSize(file.size)}` : ""}
                progress={step === "incarcare" ? progress * 100 : undefined}
              />
              <StepRow
                state={step === "import" ? "activ" : step === "gata" ? "gata" : step === "eroare" && progress >= 1 ? "eroare" : "asteapta"}
                label="Import și extragere text"
                detail={step === "import" ? "Citim documentul și păstrăm formatarea…" : result?.ocrPages.length ? `${result.ocrPages.length} pagini scanate trimise la recunoaștere optică (OCR)` : undefined}
              />
              <StepRow
                state={step === "gata" && (result?.jobId || result?.ocrJobId) ? "fundal" : "asteapta"}
                label="Analiză juridică"
                detail={!analyze ? "nu a fost cerută" : step === "gata" ? "rulează în fundal" : "pornește în fundal"}
              />
            </ol>
          )}

          {step === "gata" && result && result.ocrPages.length > 0 && (
            <Alert variant="warning" appearance="soft">
              <IconAlertTriangle />
              <AlertTitle>PDF scanat</AlertTitle>
              <AlertDescription>
                Unele pagini nu conțin text selectabil. Folosim recunoașterea optică a textului (OCR), care poate introduce greșeli. Verifică textul importat înainte să te bazezi pe analiză.
              </AlertDescription>
            </Alert>
          )}
          {step === "gata" && result && result.warnings.length > 0 && (
            <Alert appearance="soft">
              <AlertTitle>Observații la import</AlertTitle>
              <AlertDescription>
                <ul className="list-disc ps-4">
                  {result.warnings.slice(0, 5).map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          {step === "eroare" && error && (
            <Alert variant="destructive" appearance="soft">
              <AlertTitle>Importul nu a reușit</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </DialogBody>
        <DialogFooter>
          {step === "alegere" && (
            <>
              <Button variant="ghost" onClick={() => close(false)}>Anulează</Button>
              <Button onClick={submit} disabled={!file}>
                {analyze ? "Încarcă și analizează" : "Încarcă"}
              </Button>
            </>
          )}
          {busy && (
            <Button variant="ghost" onClick={() => close(false)}>
              Anulează importul
            </Button>
          )}
          {step === "eroare" && (
            <>
              <Button variant="ghost" onClick={() => close(false)}>Închide</Button>
              <Button onClick={reset}>Alege alt fișier</Button>
            </>
          )}
          {step === "gata" && result && (
            <>
              <Button variant="ghost" onClick={() => close(false)}>Continuă în fundal</Button>
              <Button onClick={() => { close(false); router.push(`/proiecte/${projectId}/documente/${result.documentId}`); }}>Deschide documentul</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepRow({ state, label, detail, progress }: { state: "gata" | "activ" | "asteapta" | "fundal" | "eroare"; label: string; detail?: string; progress?: number }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid size-5 shrink-0 place-items-center">
        {state === "gata" && <IconCheck className="size-4 text-v-corect" />}
        {state === "activ" && <Spinner className="size-4" />}
        {state === "fundal" && <Spinner className="size-4 text-ai" />}
        {state === "asteapta" && <IconCircle className="size-3.5 text-muted-foreground" />}
        {state === "eroare" && <IconX className="size-4 text-destructive" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className={cn(state === "asteapta" && "text-muted-foreground")}>{label}</span>
          {detail && <span className="truncate text-xs text-muted-foreground">{detail}</span>}
        </div>
        {progress !== undefined && <Progress value={Math.round(progress)} size="sm" aria-label={label} />}
      </div>
    </li>
  );
}
