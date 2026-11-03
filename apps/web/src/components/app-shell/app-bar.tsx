"use client";

import { IconMenu2, IconPin, IconSearch, IconTerminal2, IconUserCircle } from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SubscriptionLimits } from "@lexai/ai/usage";
import { Brand } from "@/components/brand";
import { setTheme, useTheme, type ThemeChoice } from "@/components/theme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Kbd } from "@/components/ui/kbd";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAV, SequenceKeys, THEMES, ThemeRadioItems } from "./app-menu";
import { openCommandPalette } from "./command-palette";
import { Bar, hasLimits } from "./limits";
import { UsageChip } from "./usage-chip";

type Pinned = { id: string; name: string }[];

/** Eticheta mică a unei secțiuni din foaia „Meniu” (ecran îngust). */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-1.5 px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">{children}</p>
);

/** Meniul din dreapta (≥768 px): Terminal Claude și tema. */
function ToolsMenu() {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Terminal și temă" className="hidden text-muted-foreground md:inline-flex" />} />}>
          <IconUserCircle />
        </TooltipTrigger>
        <TooltipContent>Terminal și temă</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem render={<Link href="/setari/terminal" />}>
          <IconTerminal2 />
          Terminal Claude
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Temă</DropdownMenuLabel>
          <ThemeRadioItems />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Foaia „Meniu” de pe ecran îngust (<768 px): navigare, fixate, limite, temă. */
function MobileMenu({ pathname, pinned, limite }: { pathname: string; pinned: Pinned; limite: SubscriptionLimits | null }) {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const close = () => setOpen(false);
  const links = [...NAV, { href: "/setari/terminal", label: "Terminal Claude", icon: IconTerminal2, match: (p: string) => p.startsWith("/setari/terminal") }];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Meniu" className="md:hidden" />}>
        <IconMenu2 />
      </SheetTrigger>
      <SheetContent side="right" className="w-[calc(min(18rem,85vw)+var(--bleed))] sm:max-w-[calc(18rem+var(--bleed))]">
        <SheetHeader>
          <SheetTitle>Meniu</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-6 px-3">
          <nav aria-label="Principal">
            <ul className="flex flex-col gap-0.5">
              {links.map((n) => {
                // „Setări” nu e activ pe subpagina Terminal, care are propriul rând aici
                const active = n.href === "/setari" ? pathname === "/setari" : n.match(pathname);
                return (
                  <li key={n.href}>
                    <Item size="xs" render={<Link href={n.href} onClick={close} aria-current={active ? "page" : undefined} />} className={cn(active && "bg-muted font-medium")}>
                      <ItemMedia>
                        <n.icon className="size-4 text-muted-foreground" />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{n.label}</ItemTitle>
                      </ItemContent>
                    </Item>
                  </li>
                );
              })}
            </ul>
          </nav>

          {pinned.length > 0 && (
            <section aria-labelledby="meniu-fixate">
              <SectionLabel>
                <span id="meniu-fixate">Fixate</span>
              </SectionLabel>
              <ul className="flex flex-col gap-0.5">
                {pinned.map((p) => {
                  const active = pathname === `/proiecte/${p.id}` || pathname.startsWith(`/proiecte/${p.id}/`);
                  return (
                    <li key={p.id}>
                      <Item size="xs" render={<Link href={`/proiecte/${p.id}`} onClick={close} aria-current={active ? "page" : undefined} />} className={cn(active && "bg-muted font-medium")}>
                        <ItemMedia>
                          <IconPin className="size-4 text-muted-foreground" />
                        </ItemMedia>
                        <ItemContent className="min-w-0">
                          <ItemTitle className="w-full truncate">{p.name}</ItemTitle>
                        </ItemContent>
                      </Item>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section aria-labelledby="meniu-limite">
            <SectionLabel>
              <span id="meniu-limite">Limite</span>
            </SectionLabel>
            <Link href="/utilizare" onClick={close} className="flex flex-col gap-1.5 rounded-md px-2.5 py-2 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-focus-ring">
              {hasLimits(limite) ? (
                <>
                  {limite.cinciOre && <Bar label="5 h" w={limite.cinciOre} rejected={limite.stare === "rejected"} />}
                  {limite.sapteZile && <Bar label="7 z" w={limite.sapteZile} rejected={limite.stare === "rejected"} />}
                  {limite.stare === "rejected" && <span className="text-xs text-v-eroare">Limită atinsă</span>}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Limitele abonamentului apar după primul job AI.</span>
              )}
            </Link>
          </section>

          <section aria-labelledby="meniu-tema">
            <SectionLabel>
              <span id="meniu-tema">Temă</span>
            </SectionLabel>
            <ToggleGroup
              value={[theme]}
              onValueChange={(v) => v[0] && setTheme(v[0] as ThemeChoice)}
              variant="outline"
              size="sm"
              aria-labelledby="meniu-tema"
              className="mx-2.5 w-[calc(100%-1.25rem)]"
            >
              {THEMES.map((t) => (
                <ToggleGroupItem key={t.value} value={t.value} className="flex-1 gap-1 px-1.5 text-xs">
                  <t.icon />
                  {t.short}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Bara globală (48 px) a paginilor din `(pagini)`: brand, navigarea principală, căutarea ⌘K,
 * chipul de consum și meniul cu terminalul și tema. Sub 768 px rămân brandul, lupa și ☰ (docs/ux/17).
 */
export function AppBar({ pinned, limite }: { pinned: Pinned; limite: SubscriptionLimits | null }) {
  const pathname = usePathname();
  return (
    <header data-titlebar className="sticky top-0 z-30 flex h-(--app-bar-h) shrink-0 items-center border-b bg-background px-3 sm:px-4">
      <Link
        href="/"
        aria-label="LexAI — Proiecte"
        className="-ms-1.5 flex h-8 items-center rounded-md px-1.5 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-focus-ring"
      >
        <Brand />
      </Link>

      <nav aria-label="Principal" className="ms-6 hidden h-full md:block">
        <ul className="flex h-full">
          {NAV.map((n) => {
            const active = n.match(pathname);
            return (
              <li key={n.href} className="flex">
                <Tooltip>
                  <TooltipTrigger
                    delay={700}
                    render={
                      <Link
                        href={n.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "relative flex h-full items-center rounded-md px-2.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset",
                          active && "font-medium text-foreground after:absolute after:inset-x-2.5 after:-bottom-px after:h-0.5 after:bg-foreground",
                        )}
                      />
                    }
                  >
                    {n.label}
                  </TooltipTrigger>
                  <TooltipContent>
                    {n.label} <SequenceKeys keys={n.keys} />
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="ms-auto flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={openCommandPalette} aria-label="Caută" aria-keyshortcuts="Meta+K Control+K" className="hidden w-60 justify-start font-normal text-muted-foreground lg:inline-flex">
          <IconSearch />
          Caută…
          <Kbd keys="mod+k" size="sm" className="ms-auto" />
        </Button>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Caută" aria-keyshortcuts="Meta+K Control+K" className="text-muted-foreground lg:hidden" onClick={openCommandPalette} />}>
            <IconSearch />
          </TooltipTrigger>
          <TooltipContent>
            Caută · <Kbd keys="mod+k" size="sm" />
          </TooltipContent>
        </Tooltip>
        <UsageChip limite={limite} className="hidden md:inline-flex" />
        <ToolsMenu />
        <MobileMenu pathname={pathname} pinned={pinned} limite={limite} />
      </div>
    </header>
  );
}
