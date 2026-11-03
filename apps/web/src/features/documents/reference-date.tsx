"use client";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";

function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Data de referință (yyyy-mm-dd): forma legii verificată de analiză. */
export function ReferenceDateField({ value, onChange, today, id = "data-referinta", disabled }: { value: string; onChange: (iso: string) => void; today: string; id?: string; disabled?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">Data de referință</label>
      <div className="flex gap-2">
        <DatePicker
          id={id}
          className="flex-1"
          locale="ro-RO"
          placeholder="Alege data"
          title="Data de referință"
          value={value ? toDate(value) : null}
          onValueChange={(d) => d && onChange(toIso(d))}
          disabled={disabled}
        />
        <Button type="button" variant="outline" onClick={() => onChange(today)} disabled={disabled || value === today}>
          Azi
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Legea se verifică în forma în vigoare la această dată.</p>
    </div>
  );
}
