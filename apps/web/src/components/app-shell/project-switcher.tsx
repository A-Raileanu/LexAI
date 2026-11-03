"use client";

import { IconCheck, IconFolder, IconLayoutGrid, IconPin, IconPlus, IconSelector } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface SwitcherProject {
  id: string;
  name: string;
  client: string | null;
  pinnedAt: number | null;
  ultimaActivitate: number;
}

const RECENT = 7;
const PINNED = 5;

const results = (n: number) => (n === 0 ? "Niciun proiect găsit" : n === 1 ? "Un rezultat" : `${n} rezultate`);

/**
 * Comutatorul de proiect ⇅ de lângă titlul proiectului (model Vercel): Popover cu căutare,
 * „Fixate”, „Recente” (după ultima activitate), apoi „Toate proiectele” și „Proiect nou”.
 */
export function ProjectSwitcher({ currentId, projects }: { currentId: string; projects: SwitcherProject[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const pinned = projects
    .filter((p) => p.pinnedAt)
    .sort((a, b) => (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0))
    .slice(0, PINNED);
  const pinnedIds = new Set(pinned.map((p) => p.id));
  const others = projects.filter((p) => !pinnedIds.has(p.id)).sort((a, b) => b.ultimaActivitate - a.ultimaActivitate);
  // fără interogare arătăm doar ultimele 7; la căutare, toate proiectele active sunt candidate
  const recent = search.trim() ? others : others.slice(0, RECENT);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch("");
  };
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const row = (p: SwitcherProject, group: "fixat" | "recent") => (
    <CommandItem key={p.id} value={`${group} ${p.id} ${p.name} ${p.client ?? ""}`} onSelect={() => go(`/proiecte/${p.id}`)}>
      {group === "fixat" ? <IconPin /> : <IconFolder />}
      <span className="min-w-0 truncate">{p.name}</span>
      {p.id === currentId && (
        <>
          <IconCheck aria-hidden className="ms-auto text-foreground" />
          <span className="sr-only">(curent)</span>
        </>
      )}
    </CommandItem>
  );

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger render={<PopoverTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Schimbă proiectul" className="text-muted-foreground" />} />}>
          <IconSelector />
        </TooltipTrigger>
        <TooltipContent>Schimbă proiectul</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-80 gap-0 p-0">
        <Command label="Schimbă proiectul" rootTitle="Proiecte" formatResults={results} className="ring-0">
          <div className="relative">
            <CommandInput placeholder="Caută proiect…" value={search} onValueChange={setSearch} clearLabel="Șterge căutarea" className="pe-10" />
            {!search && <Kbd keys="escape" size="sm" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2" />}
          </div>
          <CommandList>
            <CommandEmpty>Niciun proiect găsit.</CommandEmpty>
            {pinned.length > 0 && <CommandGroup heading="Fixate">{pinned.map((p) => row(p, "fixat"))}</CommandGroup>}
            {recent.length > 0 && <CommandGroup heading="Recente">{recent.map((p) => row(p, "recent"))}</CommandGroup>}
            <CommandSeparator alwaysRender />
            <CommandGroup forceMount>
              <CommandItem value="__toate" forceMount onSelect={() => go("/")}>
                <IconLayoutGrid />
                Toate proiectele
              </CommandItem>
              <CommandItem value="__nou" forceMount onSelect={() => go("/?proiect-nou=1")}>
                <IconPlus />
                Proiect nou
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
