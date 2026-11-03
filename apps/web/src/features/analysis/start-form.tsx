"use client";

import { IconSparkles } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ReferenceDateField } from "@/features/documents/reference-date";
import { useAnalysis } from "./context";

/**
 * Formularul de pornire (docs/ux/07, starea „Gol”): data de referință și „Pornește analiza”.
 * Dacă există modificări nesalvate, se salvează întâi o versiune: analiza vede exact textul afișat.
 */
export function StartForm({ onCancel }: { onCancel?: () => void }) {
  const a = useAnalysis();
  const [date, setDate] = useState(a.latest?.dataReferinta ?? a.defaultDate);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const busy = a.busy === "start";

  // „Analizează” din antet aduce focusul aici
  const { analyzeTick, consumeFocusRequest } = a;
  useEffect(() => {
    if (consumeFocusRequest()) buttonRef.current?.focus();
  }, [analyzeTick, consumeFocusRequest]);

  const future = Boolean(date && a.today && date > a.today);
  return (
    <form
      className="flex w-full flex-col gap-3 text-start"
      onSubmit={(e) => {
        e.preventDefault();
        if (date) void a.start(date);
      }}
    >
      <ReferenceDateField value={date} onChange={setDate} today={a.today} disabled={busy} id="analiza-data-referinta" />
      {future && <p className="text-center text-sm/5 text-fg-2">Data este în viitor; analiza va folosi forma legii cunoscută azi pentru acea dată.</p>}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button ref={buttonRef} type="submit" disabled={busy || !date} aria-busy={busy}>
          {busy ? <Spinner className="size-4" label="Se pornește" /> : <IconSparkles />}
          {busy ? "Se pornește…" : "Pornește analiza"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Renunță
          </Button>
        )}
      </div>
      <p className="text-center text-sm/5 text-fg-2">
        {a.needsSave ? "Modificările nesalvate se salvează întâi ca versiune nouă. " : ""}
        Analiza durează de obicei câteva minute și folosește din limitele abonamentului Claude.
      </p>
    </form>
  );
}
