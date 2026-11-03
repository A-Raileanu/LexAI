"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SECTIONS, type SectionId } from "./section";

/**
 * Navigația „Pe pagină”: listă de ancore sticky în stânga (≥1280 px) sau rând orizontal
 * derulabil sus (sub acest prag), cu secțiunea vizibilă evidențiată.
 */
export function SettingsNav({ variant }: { variant: "side" | "top" }) {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);
  const listRef = useRef<HTMLUListElement>(null);

  // pe ecran îngust, linkul activ rămâne vizibil în rândul derulabil
  useEffect(() => {
    if (variant !== "top") return;
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>("[aria-current]");
    if (!list || !link) return;
    const left = link.offsetLeft; // relativ la listă (position: relative)
    if (left < list.scrollLeft || left + link.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollTo({ left: left - 16, behavior: "smooth" });
  }, [active, variant]);

  useEffect(() => {
    // secțiunile sunt înlocuite după încărcare (Suspense), deci le căutăm la fiecare derulare
    let frame = 0;
    const update = () => {
      frame = 0;
      let current: SectionId = SECTIONS[0].id;
      // pragul se măsoară sub bara globală lipicioasă (`--app-bar-h`)
      const bar = parseFloat(getComputedStyle(listRef.current ?? document.body).getPropertyValue("--app-bar-h")) * 16 || 48;
      const threshold = bar + 92;
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= threshold) current = s.id;
      }
      // la capătul paginii, ultima secțiune devine activă chiar dacă e scurtă
      const doc = document.scrollingElement;
      if (doc && Math.ceil(doc.scrollTop + window.innerHeight) >= doc.scrollHeight - 2) current = SECTIONS[SECTIONS.length - 1].id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      cancelAnimationFrame(frame);
    };
  }, []);

  if (variant === "side") {
    return (
      <nav aria-label="Pe pagină" className="sticky top-[calc(var(--app-bar-h)+1.5rem)] hidden w-44 shrink-0 self-start xl:block">
        <p className="mb-2 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">Pe pagină</p>
        <ul className="flex flex-col gap-0.5">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? "location" : undefined}
                onClick={() => setActive(s.id)}
                className={cn(
                  "block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  active === s.id && "bg-muted font-medium text-foreground",
                )}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Pe pagină" className="sticky top-(--app-bar-h) z-10 -mx-4 border-b bg-background/90 px-4 backdrop-blur-sm sm:-mx-8 sm:px-8 xl:hidden">
      <ul ref={listRef} className="relative flex gap-1 overflow-x-auto py-2 [scrollbar-width:none]">
        {SECTIONS.map((s) => (
          <li key={s.id} className="shrink-0">
            <a
              href={`#${s.id}`}
              aria-current={active === s.id ? "location" : undefined}
              onClick={() => setActive(s.id)}
              className={cn(
                "block rounded-md px-2.5 py-1 text-sm whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                active === s.id && "bg-muted font-medium text-foreground",
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
