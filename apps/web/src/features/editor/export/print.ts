"use client";

import { toast } from "@/components/ui/toast";

/**
 * „Printează…” (⌘P): același PDF ca exportul, încărcat într-un iframe ascuns din care se deschide
 * dialogul de printare al browserului. Dacă browserul nu permite (iframe-ul nu se încarcă sau
 * `print()` aruncă), PDF-ul se deschide într-o filă nouă, de unde se printează manual.
 *
 * Iframe-ul și adresa obiectului rămân în viață cât e deschis dialogul de printare (în Chrome,
 * `print()` nu blochează), și se eliberează la printarea următoare sau după `KEEP_MS`.
 */

const KEEP_MS = 10 * 60_000;
const LOAD_TIMEOUT_MS = 15_000;

let current: { frame: HTMLIFrameElement; href: string; timer: ReturnType<typeof setTimeout> } | null = null;

function cleanup() {
  if (!current) return;
  clearTimeout(current.timer);
  current.frame.remove();
  URL.revokeObjectURL(current.href);
  current = null;
}

async function fetchPdf(url: string): Promise<Blob> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    let msg = "Nu am putut genera PDF-ul.";
    try {
      const j = (await res.json()) as { eroare?: string };
      if (j.eroare) msg = j.eroare;
    } catch {
      // răspuns fără JSON
    }
    throw new Error(msg);
  }
  // tipul explicit: vizualizatorul PDF al browserului se alege după el
  return new Blob([await res.blob()], { type: "application/pdf" });
}

/** Încarcă PDF-ul în iframe și cheamă `print()`; false dacă browserul nu permite. */
function printInFrame(href: string): Promise<boolean> {
  return new Promise((resolve) => {
    const frame = document.createElement("iframe");
    frame.title = "Document de printat";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    // nu `display: none`: vizualizatorul PDF nu se încarcă într-un iframe nerandat
    Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0", pointerEvents: "none" });
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(ok);
    };
    const timeout = setTimeout(() => done(false), LOAD_TIMEOUT_MS);
    frame.addEventListener("load", () => {
      // vizualizatorul PDF își termină inițializarea după `load`
      setTimeout(() => {
        try {
          const win = frame.contentWindow;
          if (!win) return done(false);
          win.focus();
          win.print();
          done(true);
        } catch {
          done(false);
        }
      }, 50);
    });
    current = { frame, href, timer: setTimeout(cleanup, KEEP_MS) };
    frame.src = href;
    document.body.appendChild(frame);
  });
}

/** Generează PDF-ul conținutului de lucru (după ce `beforePrint` salvează ciorna) și îl printează. */
export async function printPdf(url: string, beforePrint: () => Promise<boolean>): Promise<boolean> {
  cleanup();
  const id = toast.loading("Se pregătește documentul pentru printare…");
  try {
    await beforePrint();
    const blob = await fetchPdf(url);
    const href = URL.createObjectURL(blob);
    if (await printInFrame(href)) {
      toast.dismiss(id);
      return true;
    }
    // fără printare din iframe: PDF-ul într-o filă nouă (poate fi blocată, deci și din toast)
    const open = () => window.open(href, "_blank");
    open();
    toast.update(id, {
      type: "info",
      title: "PDF-ul s-a deschis într-o filă nouă.",
      description: "Printează-l de acolo (⌘P).",
      action: { label: "Deschide PDF-ul", onClick: open },
    });
    return true;
  } catch (e) {
    cleanup();
    toast.update(id, {
      type: "error",
      title: "Nu am putut pregăti printarea.",
      description: e instanceof Error ? e.message : undefined,
      action: { label: "Încearcă din nou", onClick: () => void printPdf(url, beforePrint) },
    });
    return false;
  }
}
