"use client";

import {
  IconArchive,
  IconArchiveOff,
  IconDots,
  IconFileText,
  IconFileUpload,
  IconFolder,
  IconFolderPlus,
  IconPencil,
  IconPin,
  IconPinnedOff,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTrash,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { PageTitle } from "@/components/page-header";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fullDate, relativeTime } from "@/lib/format";
import { foldDiacritics } from "@/lib/text";
import { cn } from "@/lib/utils";
import type { ProjectRow } from "@/server/projects";
import { editProject, setProjectArchived, setProjectPinned } from "./actions";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { NewProjectDialog } from "./new-project-dialog";

type Sort = "activitate" | "nume" | "client" | "creare";
const SORTS: Record<Sort, string> = { activitate: "Ultima activitate", nume: "Nume A–Z", client: "Client", creare: "Data creării" };

export interface RecentDoc {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  updatedAt: number;
  kind: "incarcat" | "generat";
}

export function ProjectsView({ active, archived, recent, clients }: { active: ProjectRow[]; archived: ProjectRow[]; recent: RecentDoc[]; clients: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<"active" | "arhivate">("active");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("activitate");
  const [dialog, setDialog] = useState<{ open: boolean; then?: "incarca" | "nou" }>({ open: params.get("proiect-nou") === "1" });
  const [renaming, setRenaming] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ProjectRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);
  const [, start] = useTransition();

  useEffect(() => {
    if (params.get("proiect-nou") === "1") router.replace("/", { scroll: false });
  }, [params, router]);

  const rows = useMemo(() => {
    const list = tab === "active" ? active : archived;
    const f = foldDiacritics(q);
    const filtered = f ? list.filter((p) => foldDiacritics(`${p.name} ${p.client ?? ""}`).includes(f)) : list;
    const by: Record<Sort, (a: ProjectRow, b: ProjectRow) => number> = {
      activitate: (a, b) => b.ultimaActivitate - a.ultimaActivitate,
      nume: (a, b) => a.name.localeCompare(b.name, "ro"),
      client: (a, b) => (a.client ?? "￿").localeCompare(b.client ?? "￿", "ro"),
      creare: (a, b) => b.createdAt - a.createdAt,
    };
    // proiectele fixate stau primele (fostul grup „Fixate” din sidebar; docs/ux/17)
    const pinnedFirst = (a: ProjectRow, b: ProjectRow) => (tab === "active" ? Number(Boolean(b.pinnedAt)) - Number(Boolean(a.pinnedAt)) : 0);
    return [...filtered].sort((a, b) => pinnedFirst(a, b) || by[sort](a, b));
  }, [active, archived, tab, q, sort]);

  const archive = (p: ProjectRow, value: boolean) =>
    start(async () => {
      await setProjectArchived(p.id, value);
      if (value) {
        toast("Proiect arhivat", { action: { label: "Anulează", onClick: () => start(async () => { await setProjectArchived(p.id, false); router.refresh(); }) } });
      } else toast.success("Proiect restaurat");
      router.refresh();
    });

  if (active.length === 0 && archived.length === 0) {
    return (
      <>
        <FirstProject onCreate={(then) => setDialog({ open: true, then })} />
        <NewProjectDialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} clients={clients} then={dialog.then} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageTitle
        title="Proiecte"
        description={`${active.length} ${active.length === 1 ? "proiect activ" : "proiecte active"}`}
        actions={
          <Button onClick={() => setDialog({ open: true })}>
            <IconPlus />
            Proiect nou
          </Button>
        }
      />

      {recent.length > 0 && (
        <section>
          <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Continuă de unde ai rămas</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {recent.map((d) => (
              <Item
                key={d.id}
                variant="outline"
                size="sm"
                className="w-60 shrink-0"
                render={<Link href={`/proiecte/${d.projectId}/documente/${d.id}`} />}
              >
                <ItemMedia variant="icon">{d.kind === "generat" ? <IconSparkles className="text-ai" /> : <IconFileText />}</ItemMedia>
                <ItemContent className="min-w-0">
                  <ItemTitle className="w-full truncate">{d.title}</ItemTitle>
                  <ItemDescription className="truncate">
                    {d.projectName} · {relativeTime(d.updatedAt)}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup value={[tab]} onValueChange={(v) => v[0] && setTab(v[0] as typeof tab)} variant="outline" size="sm">
            <ToggleGroupItem value="active">Active <span className="text-muted-foreground tabular-nums">{active.length}</span></ToggleGroupItem>
            <ToggleGroupItem value="arhivate">Arhivate <span className="text-muted-foreground tabular-nums">{archived.length}</span></ToggleGroupItem>
          </ToggleGroup>
          <InputGroup className="w-full max-w-72 sm:w-72">
            <InputGroupAddon>
              <IconSearch />
            </InputGroupAddon>
            <InputGroupInput placeholder="Caută proiect sau client" value={q} onChange={(e) => setQ(e.target.value)} />
          </InputGroup>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger size="sm" className="ms-auto w-44">
              <SelectValue>{(v: string) => SORTS[v as Sort]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORTS) as Sort[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {SORTS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {rows.length === 0 ? (
          <Empty className="rounded-lg border py-12">
            <EmptyHeader>
              <EmptyMedia variant="icon">{q ? <IconSearch /> : <IconArchive />}</EmptyMedia>
              <EmptyTitle>{q ? `Niciun proiect pentru „${q}”` : "Niciun proiect arhivat"}</EmptyTitle>
              <EmptyDescription>{q ? "Încearcă alt nume sau caută în documente cu ⌘K." : "Proiectele arhivate rămân căutabile și pot fi restaurate oricând."}</EmptyDescription>
            </EmptyHeader>
            {q && (
              <EmptyContent>
                <Button variant="outline" size="sm" onClick={() => setQ("")}>Golește căutarea</Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-full">Nume</TableHead>
                  <TableHead className="hidden md:table-cell">Client</TableHead>
                  <TableHead className="hidden sm:table-cell">Ultima activitate</TableHead>
                  <TableHead className="text-right">Documente</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Analize deschise</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => renaming !== p.id && router.push(`/proiecte/${p.id}`)}>
                    <TableCell className="max-w-0 font-medium">
                      {renaming === p.id ? (
                        <RenameInput
                          initial={p.name}
                          onDone={(name) => {
                            setRenaming(null);
                            if (name && name !== p.name) start(async () => { const r = await editProject(p.id, { name }); if (!r.ok) toast.error(r.error); router.refresh(); });
                          }}
                        />
                      ) : (
                        <span className="flex items-center gap-2 truncate">
                          <IconFolder className="size-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{p.name}</span>
                          {p.pinnedAt && <IconPin className="size-3.5 shrink-0 text-muted-foreground" aria-label="Fixat" />}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{p.client ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      <Tooltip>
                        <TooltipTrigger render={<span />}>{relativeTime(p.ultimaActivitate)}</TooltipTrigger>
                        <TooltipContent>{fullDate(p.ultimaActivitate)}</TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.documente}</TableCell>
                    <TableCell className="hidden text-right sm:table-cell">
                      {p.analizeDeschise ? (
                        <Badge appearance="outline" variant={p.gravitate === "eroare" ? "destructive" : "warning"} className="tabular-nums">
                          ● {p.analizeDeschise}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Acțiuni pentru ${p.name}`} />}>
                          <IconDots />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => router.push(`/proiecte/${p.id}`)}>
                            <IconFolder />
                            Deschide
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRenaming(p.id)}>
                            <IconPencil />
                            Redenumește
                          </DropdownMenuItem>
                          {!p.archivedAt && (
                            <DropdownMenuItem onClick={() => start(async () => { await setProjectPinned(p.id, !p.pinnedAt); router.refresh(); })}>
                              {p.pinnedAt ? <IconPinnedOff /> : <IconPin />}
                              {p.pinnedAt ? "Desprinde" : "Fixează"}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {p.archivedAt ? (
                            <>
                              <DropdownMenuItem onClick={() => archive(p, false)}>
                                <IconArchiveOff />
                                Restaurează
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(p)}>
                                <IconTrash />
                                Șterge definitiv
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem onClick={() => setArchiveTarget(p)}>
                              <IconArchive />
                              Arhivează
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <NewProjectDialog open={dialog.open} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} clients={clients} then={dialog.then} />

      <AlertDialog open={Boolean(archiveTarget)} onOpenChange={(o) => !o && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arhivezi „{archiveTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Proiectul dispare din lista activă, dar documentele și analizele rămân. Îl poți restaura oricând din „Arhivate”.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (archiveTarget) archive(archiveTarget, true); setArchiveTarget(null); }}>Arhivează</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DeleteProjectDialog
        project={deleteTarget && { id: deleteTarget.id, name: deleteTarget.name, documente: deleteTarget.documente }}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (v: string | null) => void }) {
  const [v, setV] = useState(initial);
  return (
    <Input
      autoFocus
      value={v}
      className="h-7"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onDone(v.trim() || null)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onDone(v.trim() || null);
        if (e.key === "Escape") onDone(null);
      }}
      aria-label="Nume nou"
    />
  );
}

function FirstProject({ onCreate }: { onCreate: (then?: "incarca" | "nou") => void }) {
  const cards = [
    { then: undefined, icon: IconFolderPlus, title: "Proiect gol", text: "Creezi proiectul și adaugi documentele mai târziu." },
    { then: "incarca" as const, icon: IconFileUpload, title: "Pornește de la un document", text: "Încarci un DOCX, DOC sau PDF și îl verifici pe textul oficial al legii." },
    { then: "nou" as const, icon: IconSparkles, title: "Redactează un document nou", text: "Contract, notificare, cerere: LexAI îl scrie pe baza textului oficial al legii." },
  ];
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconFolder />
        </EmptyMedia>
        <EmptyTitle>Creează primul proiect</EmptyTitle>
        <EmptyDescription>Un proiect grupează documentele, analizele și versiunile unei cauze sau ale unui client.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <button
            key={c.title}
            type="button"
            onClick={() => onCreate(c.then)}
            className="flex flex-col gap-2 rounded-lg p-4 text-left inset-ring-(length:--hairline) inset-ring-border transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-focus-ring focus-visible:outline-none"
          >
            <c.icon className={cn("size-5", c.then === "nou" ? "text-ai" : "text-muted-foreground")} />
            <span className="font-medium">{c.title}</span>
            <span className="text-sm text-muted-foreground">{c.text}</span>
          </button>
        ))}
      </EmptyContent>
    </Empty>
  );
}
