"use client";

import {
  IconArrowLeft,
  IconChartBar,
  IconFileText,
  IconFileUpload,
  IconFolder,
  IconFolderPlus,
  IconMoon,
  IconPin,
  IconSettings,
  IconSparkles,
  IconSun,
  IconTerminal2,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandLoading, CommandSeparator, CommandShortcut, useCommandHotkey } from "@/components/ui/command";
import { setTheme, useTheme } from "@/components/theme";
import { paletteData, searchDocumentContent, type ContentHit, type PaletteData } from "@/features/palette/actions";
import { NAV, SequenceKeys } from "./app-menu";

type Mode = { kind: "root" } | { kind: "alege-proiect"; action: "incarca" | "nou" };

const results = (n: number) => (n === 0 ? "Niciun rezultat" : n === 1 ? "Un rezultat" : `${n} rezultate`);

const listeners = new Set<(open: boolean) => void>();
/** Deschide paleta din orice componentă (căutarea din bara globală, meniul „⋯” din editor). */
export function openCommandPalette() {
  listeners.forEach((l) => l(true));
}

/** Câmp de text sau zonă editabilă: acolo literele sunt text, nu scurtături. */
function isEditable(t: EventTarget | null) {
  return t instanceof HTMLElement && (t.isContentEditable || t.closest("input, textarea, select, [contenteditable='true']") !== null);
}

/**
 * Secvențele G P / G U / G S (Proiecte, Utilizare, Setări): G, apoi a doua tastă în cel mult 1 s.
 * Merg și în editor, unde bara globală lipsește, dar nu cât timp focusul e în text.
 */
function useGoSequences(go: (href: string) => void) {
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  useEffect(() => {
    let armedAt = 0;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return;
      // dialogurile și meniurile deschise își păstrează tastele
      if (document.querySelector("[role='dialog'], [role='alertdialog'], [role='menu']")) return;
      const key = e.key.toLowerCase();
      if (armedAt && e.timeStamp - armedAt <= 1000) {
        armedAt = 0;
        const target = NAV.find((n) => n.keys === `g ${key}`);
        if (target) {
          e.preventDefault();
          goRef.current(target.href);
        }
        return;
      }
      armedAt = key === "g" && !e.shiftKey ? e.timeStamp : 0;
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
}

export function CommandPalette() {
  const router = useRouter();
  useGoSequences((href) => router.push(href));
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>({ kind: "root" });
  const [data, setData] = useState<PaletteData | null>(null);
  const [search, setSearch] = useState("");
  const [found, setFound] = useState<{ q: string; hits: ContentHit[] }>({ q: "", hits: [] });
  const [searching, startSearch] = useTransition();

  useCommandHotkey("mod+k", (e) => {
    e.preventDefault();
    setOpen((o) => !o);
  });

  useEffect(() => {
    listeners.add(setOpen);
    return () => {
      listeners.delete(setOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    paletteData().then((d) => alive && setData(d)).catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open]);

  const searchable = search.trim().length >= 3 && mode.kind === "root";
  useEffect(() => {
    if (!searchable) return;
    const t = setTimeout(() => startSearch(async () => setFound({ q: search, hits: await searchDocumentContent(search).catch(() => []) })), 250);
    return () => clearTimeout(t);
  }, [search, searchable]);
  // rezultatele afișate corespund doar căutării curente
  const hits = searchable && found.q === search ? found.hits : [];

  const go = (href: string) => {
    setOpen(false);
    setMode({ kind: "root" });
    setSearch("");
    router.push(href);
  };

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setMode({ kind: "root" });
      setSearch("");
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Paleta de comenzi" description="Caută proiecte, documente și acțiuni.">
      {/* CommandDialog (HextaUI) e doar fereastra: rădăcina Command o punem noi */}
      <Command label="Paleta de comenzi" rootTitle="Toate comenzile" formatResults={results}>
        <CommandInput
          placeholder={mode.kind === "alege-proiect" ? "Alege proiectul…" : "Caută proiecte, documente sau acțiuni…"}
          value={search}
          onValueChange={setSearch}
          clearLabel="Șterge căutarea"
        />
        <CommandList>
          <CommandEmpty>Niciun rezultat pentru „{search}”.</CommandEmpty>

          {mode.kind === "alege-proiect" ? (
            <CommandGroup heading={mode.action === "incarca" ? "Încarcă document în proiectul…" : "Document nou în proiectul…"}>
              <CommandItem onSelect={() => setMode({ kind: "root" })} value="__inapoi">
                <IconArrowLeft />
                Înapoi
              </CommandItem>
              {data?.projects.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.client ?? ""}`}
                  onSelect={() => go(mode.action === "incarca" ? `/proiecte/${p.id}?incarca=1` : `/proiecte/${p.id}/nou`)}
                >
                  <IconFolder />
                  {p.name}
                  {p.client && <span className="ms-auto text-xs text-muted-foreground">{p.client}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <>
              {!search && data && data.projects.some((p) => p.pinnedAt) && (
                <CommandGroup heading="Fixate">
                  {data.projects
                    .filter((p) => p.pinnedAt)
                    .sort((a, b) => (a.pinnedAt ?? 0) - (b.pinnedAt ?? 0))
                    .slice(0, 5)
                    .map((p) => (
                      <CommandItem key={p.id} value={`fixat ${p.name} ${p.client ?? ""}`} onSelect={() => go(`/proiecte/${p.id}`)}>
                        <IconPin />
                        <span className="truncate">{p.name}</span>
                        {p.client && <span className="ms-auto truncate text-xs text-muted-foreground">{p.client}</span>}
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}
              {!search && data && data.documents.length > 0 && (
                <CommandGroup heading="Recente">
                  {data.documents.slice(0, 5).map((d) => (
                    <CommandItem key={d.id} value={`recent ${d.title} ${d.projectName}`} onSelect={() => go(`/proiecte/${d.projectId}/documente/${d.id}`)}>
                      <IconFileText />
                      <span className="truncate">{d.title}</span>
                      <span className="ms-auto truncate text-xs text-muted-foreground">{d.projectName}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading="Acțiuni">
                <CommandItem value="proiect nou creeaza" onSelect={() => go("/?proiect-nou=1")}>
                  <IconFolderPlus />
                  Proiect nou
                </CommandItem>
                <CommandItem value="incarca document analiza" onSelect={() => { setSearch(""); setMode({ kind: "alege-proiect", action: "incarca" }); }}>
                  <IconFileUpload />
                  Încarcă document…
                </CommandItem>
                <CommandItem value="document nou redacteaza genereaza" onSelect={() => { setSearch(""); setMode({ kind: "alege-proiect", action: "nou" }); }}>
                  <IconSparkles className="text-ai" />
                  Document nou…
                </CommandItem>
                <CommandItem value="tema intunecata luminoasa" onSelect={() => setTheme(theme === "intunecat" ? "luminos" : "intunecat")}>
                  {theme === "intunecat" ? <IconSun /> : <IconMoon />}
                  {theme === "intunecat" ? "Temă luminoasă" : "Temă întunecată"}
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Navigare">
                <CommandItem value="proiecte acasa" onSelect={() => go("/")}>
                  <IconFolder />
                  Proiecte
                  <CommandShortcut>
                    <SequenceKeys keys="g p" />
                  </CommandShortcut>
                </CommandItem>
                <CommandItem value="utilizare limite consum" onSelect={() => go("/utilizare")}>
                  <IconChartBar />
                  Utilizare
                  <CommandShortcut>
                    <SequenceKeys keys="g u" />
                  </CommandShortcut>
                </CommandItem>
                <CommandItem value="setari surse model cont claude" onSelect={() => go("/setari")}>
                  <IconSettings />
                  Setări
                  <CommandShortcut>
                    <SequenceKeys keys="g s" />
                  </CommandShortcut>
                </CommandItem>
                <CommandItem value="terminal claude login" onSelect={() => go("/setari/terminal")}>
                  <IconTerminal2 />
                  Terminal Claude
                </CommandItem>
              </CommandGroup>
              {search && data && (
                <>
                  <CommandGroup heading="Proiecte">
                    {data.projects.map((p) => (
                      <CommandItem key={p.id} value={`proiect ${p.name} ${p.client ?? ""}`} onSelect={() => go(`/proiecte/${p.id}`)}>
                        <IconFolder />
                        {p.name}
                        {p.client && <span className="ms-auto text-xs text-muted-foreground">{p.client}</span>}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Documente">
                    {data.documents.map((d) => (
                      <CommandItem key={d.id} value={`document ${d.title} ${d.projectName}`} onSelect={() => go(`/proiecte/${d.projectId}/documente/${d.id}`)}>
                        <IconFileText />
                        <span className="truncate">{d.title}</span>
                        <span className="ms-auto truncate text-xs text-muted-foreground">{d.projectName}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              {searching && <CommandLoading>Caut în conținutul documentelor…</CommandLoading>}
              {hits.length > 0 && (
                <CommandGroup heading="În conținutul documentelor" forceMount>
                  {hits.map((h) => (
                    <CommandItem key={h.documentId} value={`continut ${search} ${h.documentId}`} forceMount onSelect={() => go(`/documente/${h.documentId}`)}>
                      <IconFileText />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{h.title} <span className="text-xs text-muted-foreground">· {h.projectName}</span></span>
                        <span className="truncate text-xs text-muted-foreground">{h.snippet}</span>
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
