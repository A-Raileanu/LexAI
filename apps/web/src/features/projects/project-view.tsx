"use client";

import {
  IconAlertTriangle,
  IconArchive,
  IconCheck,
  IconDots,
  IconFileText,
  IconFileUpload,
  IconPencil,
  IconSparkles,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/ui/toast";
import { AnalysisBadge, type AnalysisSummary } from "@/features/documents/analysis-badge";
import { useNow } from "@/features/analysis/use-now";
import { analyzeDocument, archiveDocument, renameDocument } from "@/features/documents/actions";
import { UploadDialog } from "@/features/documents/upload-dialog";
import { fmtDateIso, fullDate, relativeTime } from "@/lib/format";
import { foldDiacritics } from "@/lib/text";
import { editProject, setProjectArchived } from "./actions";
import { ContextPanel, type ContextPanelHandle, type ProjectContextFile } from "./context-panel";
import { DeleteProjectDialog } from "./delete-project-dialog";

export interface ProjectDoc {
  id: string;
  title: string;
  kind: "incarcat" | "generat";
  ext: string | null;
  versiune: number | null;
  updatedAt: number;
  analysis: AnalysisSummary | null;
  analysisAt: number | null;
}

export interface ProjectJob {
  id: string;
  kind: string;
  status: string;
  documentTitle: string | null;
  createdAt: number;
  startedAt: number | null;
  finishedAt: number | null;
  error: string | null;
}

export interface ProjectInfo {
  id: string;
  name: string;
  client: string | null;
  description: string | null;
  createdAt: number;
  archivedAt: number | null;
  ultimaActivitate: number;
}

const JOB_LABELS: Record<string, string> = { analiza: "Analiză", reverificare: "Reverificare", redactare: "Generare", ocr: "Recunoaștere text" };

function duration(job: ProjectJob, now: number) {
  if (!job.startedAt) return "în așteptare";
  const ms = (job.finishedAt ?? now) - job.startedAt;
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

export function ProjectView({
  project,
  docs,
  jobs,
  today,
  defaultDate,
  switcher,
  contextFiles,
}: {
  project: ProjectInfo;
  docs: ProjectDoc[];
  contextFiles: ProjectContextFile[];
  jobs: ProjectJob[];
  today: string;
  defaultDate: string;
  /** comutatorul de proiect ⇅, lângă titlu (docs/ux/17) */
  switcher?: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [upload, setUpload] = useState<{ open: boolean; file: File | null }>({ open: params.get("incarca") === "1", file: null });
  const [filter, setFilter] = useState<"toate" | "incarcate" | "generate" | "probleme">("toate");
  const [q, setQ] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<ProjectDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [tab, setTab] = useState<"documente" | "context" | "joburi">("documente");
  const contextRef = useRef<ContextPanelHandle>(null);
  const [, start] = useTransition();
  // ora se reîmprospătează: pagina rămâne montată la navigare (Next o păstrează ascunsă), iar o oră
  // fixată la montare ar face activitatea nouă să apară „peste 14 minute”
  const [mountedAt] = useState(() => Date.now());
  const now = useNow(30_000) ?? mountedAt;
  const archived = Boolean(project.archivedAt);

  useEffect(() => {
    if (params.get("incarca") === "1") router.replace(`/proiecte/${project.id}`, { scroll: false });
  }, [params, router, project.id]);

  // reîmprospătare cât timp rulează joburi
  const running =
    jobs.some((j) => j.status === "in_curs" || j.status === "in_asteptare") || docs.some((d) => d.analysis?.status === "in_curs") || contextFiles.some((f) => f.status === "ocr");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(t);
  }, [running, router]);

  const problems = docs.filter((d) => d.analysis?.counts && (d.analysis.counts.erori > 0 || d.analysis.counts.uman > 0));
  const counts = { toate: docs.length, incarcate: docs.filter((d) => d.kind === "incarcat").length, generate: docs.filter((d) => d.kind === "generat").length, probleme: problems.length };

  const rows = useMemo(() => {
    const f = foldDiacritics(q);
    return docs
      .filter((d) => filter === "toate" || (filter === "incarcate" ? d.kind === "incarcat" : filter === "generate" ? d.kind === "generat" : problems.includes(d)))
      .filter((d) => !f || foldDiacritics(d.title).includes(f));
  }, [docs, filter, q, problems]);

  const docHref = (d: ProjectDoc) => `/proiecte/${project.id}/documente/${d.id}`;

  return (
    <div
      className="relative"
      onDragOver={(e) => {
        if (archived || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        // în tabul Context, fișierele trase pe pagină intră în context (toate odată)
        if (tab === "context") {
          contextRef.current?.upload([...e.dataTransfer.files]);
          return;
        }
        const f = e.dataTransfer.files[0];
        if (f) setUpload({ open: true, file: f });
      }}
    >
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center bg-background/80 backdrop-blur-sm">
          <p className="flex items-center gap-2 rounded-lg bg-card px-5 py-3 text-sm font-medium shadow-lg inset-ring-(length:--hairline) inset-ring-border">
            <IconUpload className="size-4" /> {tab === "context" ? `Eliberează pentru a adăuga în contextul „${project.name}”` : `Eliberează pentru a încărca în „${project.name}”`}
          </p>
        </div>
      )}

      {archived && (
        <Alert appearance="soft" className="mb-6">
          <IconArchive />
          <AlertTitle>Proiect arhivat — doar citire.</AlertTitle>
          <AlertAction>
            <Button size="sm" variant="outline" onClick={() => start(async () => { await setProjectArchived(project.id, false); router.refresh(); })}>
              Restaurează
            </Button>
            <Button size="sm" variant="ghost-destructive" onClick={() => setDeleting(true)}>
              Șterge definitiv
            </Button>
          </AlertAction>
        </Alert>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editingTitle ? (
            <Input
              autoFocus
              defaultValue={project.name}
              className="h-9 text-xl font-semibold"
              aria-label="Numele proiectului"
              onBlur={(e) => {
                setEditingTitle(false);
                const v = e.target.value.trim();
                if (v && v !== project.name) start(async () => { await editProject(project.id, { name: v }); router.refresh(); });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") setEditingTitle(false);
              }}
            />
          ) : (
            <div className="group flex min-w-0 items-center gap-1">
              <h1 className="truncate text-xl font-semibold tracking-tight">{project.name}</h1>
              {switcher}
              {!archived && (
                <Button variant="ghost" size="icon-xs" aria-label="Redenumește proiectul" className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100" onClick={() => setEditingTitle(true)}>
                  <IconPencil />
                </Button>
              )}
            </div>
          )}
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[project.client, `${docs.length} ${docs.length === 1 ? "document" : "documente"}`, `activ ${relativeTime(project.ultimaActivitate, now)}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        {!archived && (
          <div className="flex items-center gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/proiecte/${project.id}/nou`} />}>
              <IconSparkles className="text-ai" />
              Document nou
            </Button>
            <Button onClick={() => setUpload({ open: true, file: null })}>
              <IconFileUpload />
              Încarcă document
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Alte acțiuni" />}>
                <IconDots />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => setEditingTitle(true)}>
                  <IconPencil />
                  Redenumește proiectul
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => start(async () => { await setProjectArchived(project.id, true); toast("Proiect arhivat"); router.push("/"); })}>
                  <IconArchive />
                  Arhivează proiectul
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {problems.length > 0 && (
        <Alert variant="warning" appearance="soft" className="mt-5">
          <IconAlertTriangle />
          <AlertTitle>
            {problems.length === 1 ? "Un document are" : `${problems.length} documente au`} constatări nerezolvate (greșeli sau verificări umane necesare).
          </AlertTitle>
          <AlertAction>
            <Button size="sm" variant="ghost" onClick={() => setFilter("probleme")}>Vezi documentele</Button>
          </AlertAction>
        </Alert>
      )}

      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="w-full min-w-0">
          <TabsList>
            <TabsTrigger value="documente">Documente <span className="text-muted-foreground tabular-nums">{docs.length}</span></TabsTrigger>
            <TabsTrigger value="context">Context <span className="text-muted-foreground tabular-nums">{contextFiles.length}</span></TabsTrigger>
            <TabsTrigger value="joburi">Joburi <span className="text-muted-foreground tabular-nums">{jobs.length}</span></TabsTrigger>
          </TabsList>

          <TabsContent value="documente" className="mt-4 flex flex-col gap-3">
            {docs.length === 0 ? (
              <Empty className="rounded-lg border border-dashed py-14">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><IconFileText /></EmptyMedia>
                  <EmptyTitle>Adaugă primul document</EmptyTitle>
                  <EmptyDescription>Trage aici un PDF, DOCX sau DOC ori pornește un document nou.</EmptyDescription>
                </EmptyHeader>
                {!archived && (
                  <EmptyContent className="flex-row justify-center">
                    <Button onClick={() => setUpload({ open: true, file: null })}><IconFileUpload /> Încarcă document</Button>
                    <Button variant="outline" nativeButton={false} render={<Link href={`/proiecte/${project.id}/nou`} />}><IconSparkles className="text-ai" /> Document nou</Button>
                  </EmptyContent>
                )}
              </Empty>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <ToggleGroup value={[filter]} onValueChange={(v) => v[0] && setFilter(v[0] as typeof filter)} variant="outline" size="sm">
                    <ToggleGroupItem value="toate">Toate <span className="text-muted-foreground tabular-nums">{counts.toate}</span></ToggleGroupItem>
                    <ToggleGroupItem value="incarcate">Încărcate <span className="text-muted-foreground tabular-nums">{counts.incarcate}</span></ToggleGroupItem>
                    <ToggleGroupItem value="generate">Generate <span className="text-muted-foreground tabular-nums">{counts.generate}</span></ToggleGroupItem>
                    <ToggleGroupItem value="probleme">Cu probleme <span className="text-muted-foreground tabular-nums">{counts.probleme}</span></ToggleGroupItem>
                  </ToggleGroup>
                  <Input className="ms-auto h-8 w-full sm:w-56" placeholder="Caută în documente…" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-full">Nume</TableHead>
                        <TableHead className="hidden sm:table-cell">Versiune</TableHead>
                        <TableHead>Ultima analiză</TableHead>
                        <TableHead className="hidden md:table-cell">Modificat</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((d) => (
                        <TableRow key={d.id} className="cursor-pointer" onClick={() => renaming !== d.id && router.push(docHref(d))}>
                          <TableCell className="max-w-0">
                            {renaming === d.id ? (
                              <Input
                                autoFocus
                                defaultValue={d.title}
                                className="h-7"
                                aria-label="Titlu nou"
                                onClick={(e) => e.stopPropagation()}
                                onBlur={(e) => {
                                  setRenaming(null);
                                  const v = e.target.value.trim();
                                  if (v && v !== d.title) start(async () => { const r = await renameDocument(d.id, v); if (!r.ok) toast.error(r.error); router.refresh(); });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                  if (e.key === "Escape") setRenaming(null);
                                }}
                              />
                            ) : (
                              <span className="flex items-center gap-2.5">
                                {d.kind === "generat" ? <IconSparkles className="size-4 shrink-0 text-ai" /> : <IconFileText className="size-4 shrink-0 text-muted-foreground" />}
                                <span className="flex min-w-0 flex-col">
                                  <span className="truncate font-medium">{d.title}</span>
                                  <span className="text-xs text-muted-foreground">{d.kind === "generat" ? "Generat" : `Încărcat${d.ext ? ` · ${d.ext}` : ""}`}</span>
                                </span>
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden text-muted-foreground tabular-nums sm:table-cell">{d.versiune ? `v${d.versiune}` : "—"}</TableCell>
                          <TableCell><AnalysisBadge summary={d.analysis} /></TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell" title={fullDate(d.updatedAt)}>{relativeTime(d.updatedAt, now)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acțiuni pentru ${d.title}`} />}>
                                <IconDots />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-52">
                                <DropdownMenuItem onClick={() => router.push(docHref(d))}><IconFileText /> Deschide în editor</DropdownMenuItem>
                                {!archived && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      start(async () => {
                                        const r = await analyzeDocument(d.id, defaultDate);
                                        if (r.ok) toast.success("Analiză pornită.");
                                        else toast.error(r.error);
                                        router.refresh();
                                      })
                                    }
                                  >
                                    <IconSparkles /> Analizează din nou
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => setRenaming(d.id)}><IconPencil /> Redenumește</DropdownMenuItem>
                                <DropdownMenuItem render={<a href={`/api/documente/${d.id}/export?format=docx`} download />}><IconFileText /> Descarcă .docx</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setToDelete(d)} className="text-destructive"><IconX /> Șterge</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                      {rows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">Niciun document pentru filtrul ales.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                {!archived && (
                  <button
                    type="button"
                    onClick={() => setUpload({ open: true, file: null })}
                    className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
                  >
                    <IconUpload className="size-4" /> Trage fișiere aici sau încarcă (PDF, DOCX, DOC)
                  </button>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="context" className="mt-4">
            <ContextPanel ref={contextRef} projectId={project.id} files={contextFiles} archived={archived} now={now} />
          </TabsContent>

          <TabsContent value="joburi" className="mt-4">
            <JobsList jobs={jobs} now={now} />
          </TabsContent>
        </Tabs>

        <aside className="flex flex-col gap-6">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-medium">Detalii proiect</h2>
              {!archived && (
                <Button variant="ghost" size="icon-xs" aria-label="Editează detaliile" onClick={() => setEditingDetails((v) => !v)}>
                  {editingDetails ? <IconCheck /> : <IconPencil />}
                </Button>
              )}
            </div>
            {editingDetails ? (
              <form
                className="flex flex-col gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  start(async () => {
                    await editProject(project.id, { client: String(fd.get("client") ?? ""), description: String(fd.get("description") ?? "") });
                    setEditingDetails(false);
                    toast.success("Detalii salvate");
                    router.refresh();
                  });
                }}
              >
                <Input name="client" defaultValue={project.client ?? ""} placeholder="Client" aria-label="Client" />
                <Textarea name="description" defaultValue={project.description ?? ""} placeholder="Descriere" aria-label="Descriere" minRows={3} />
                <Button type="submit" size="sm" className="self-end">Salvează</Button>
              </form>
            ) : (
              <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-2 text-sm">
                <dt className="text-muted-foreground">Client</dt>
                <dd>{project.client ?? "—"}</dd>
                <dt className="text-muted-foreground">Descriere</dt>
                <dd className="whitespace-pre-line">{project.description || "—"}</dd>
                <dt className="text-muted-foreground">Creat</dt>
                <dd>{fmtDateIso(new Date(project.createdAt).toISOString().slice(0, 10))}</dd>
              </dl>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-medium">Joburi recente</h2>
            <JobsList jobs={jobs.slice(0, 5)} now={now} compact />
          </section>
        </aside>
      </div>

      <UploadDialog
        open={upload.open}
        onOpenChange={(o) => setUpload((u) => ({ open: o, file: o ? u.file : null }))}
        projectId={project.id}
        projectName={project.name}
        today={today}
        defaultDate={defaultDate}
        initialFile={upload.file}
      />

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi „{toDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>Documentul dispare din proiect împreună cu versiunile și analizele lui.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const d = toDelete;
                setToDelete(null);
                if (!d) return;
                start(async () => {
                  await archiveDocument(d.id, true);
                  toast("Document șters", { action: { label: "Anulează", onClick: () => start(async () => { await archiveDocument(d.id, false); router.refresh(); }) } });
                  router.refresh();
                });
              }}
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteProjectDialog
        project={deleting ? { id: project.id, name: project.name, documente: docs.length } : null}
        onOpenChange={setDeleting}
        onDeleted={() => router.push("/")}
      />
    </div>
  );
}

function JobsList({ jobs, now, compact }: { jobs: ProjectJob[]; now: number; compact?: boolean }) {
  if (!jobs.length) return <p className="text-sm text-muted-foreground">Niciun job încă.</p>;
  return (
    <ul className={compact ? "flex flex-col gap-2" : "flex flex-col divide-y rounded-lg border"}>
      {jobs.map((j) => (
        <li key={j.id} className={compact ? "flex gap-2 text-sm" : "flex gap-3 px-3 py-2.5 text-sm"}>
          <span className="mt-0.5 grid size-4 shrink-0 place-items-center">
            {j.status === "in_curs" || j.status === "in_asteptare" ? <Spinner className="size-3.5" /> : j.status === "finalizat" ? <IconCheck className="size-4 text-v-corect" /> : <IconX className="size-4 text-destructive" />}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{JOB_LABELS[j.kind] ?? j.kind}{j.documentTitle ? ` · ${j.documentTitle}` : ""}</span>
            <span className="truncate text-xs text-muted-foreground">
              {j.status === "in_curs" ? `rulează · ${duration(j, now)}` : j.status === "in_asteptare" ? "în așteptare" : j.status === "finalizat" ? `${duration(j, now)} · ${relativeTime(j.createdAt, now)}` : `${j.status === "anulat" ? "anulat" : j.status === "intrerupt" ? "întrerupt" : "eșuat"}${j.error ? ` · ${j.error}` : ""}`}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
