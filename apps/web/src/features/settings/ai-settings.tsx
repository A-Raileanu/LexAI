"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fmtDateIso } from "@/lib/format";
import { setDefaultReferenceDate, setModel, setWorkerConcurrency, type ActionResult } from "./actions";
import { MODELS } from "./models";
import { SettingRow, SettingsSection } from "./section";

export interface AiValues {
  model: string;
  workerConcurrency: number;
  defaultReferenceDate: string | null;
}

function useSave() {
  const [, start] = useTransition();
  return function save<T>(apply: (v: T) => void, value: T, action: () => Promise<ActionResult>) {
    const attempt = () =>
      start(async () => {
        apply(value);
        const res = await action().catch(() => ({ ok: false as const, error: "Serverul local nu răspunde." }));
        if (res.ok) toast.success("Salvat");
        else toast.error("Nu am putut salva. Reîncearcă.", { description: res.error, action: { label: "Reîncearcă", onClick: attempt } });
      });
    attempt();
  };
}

const modelLabel = (id: string) => MODELS.find((m) => m.id === id)?.label ?? id;

export function AiSection({ values }: { values: AiValues }) {
  const [v, apply] = useOptimistic(values, (s, patch: Partial<AiValues>) => ({ ...s, ...patch }));
  const save = useSave();
  return (
    <SettingsSection id="ai" title="AI și procesare" description="Modelul și ritmul în care LexAI folosește abonamentul Claude.">
      <SettingRow
        title="Model Claude"
        htmlFor="model-claude"
        description="Folosit pentru analiză și generare. Modelele mai mari sunt mai atente, dar consumă limita mai repede."
        control={
          <Select
            value={v.model}
            onValueChange={(m) => m && m !== v.model && save((x: string) => apply({ model: x }), m as string, () => setModel(m as string))}
          >
            <SelectTrigger id="model-claude" size="sm" className="w-full sm:w-44" aria-label="Model Claude">
              <SelectValue>{(id: string) => modelLabel(id)}</SelectValue>
            </SelectTrigger>
            <SelectContent className="w-72" alignItemWithTrigger={false} align="end">
              {MODELS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="items-start">
                  <span className="flex flex-col">
                    <span>{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.description}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <SettingRow
        title="Analize în paralel"
        description={
          <>
            Câte documente sau verificări rulează simultan.
            {v.workerConcurrency >= 4 && (
              <span className="mt-1 block text-v-discutabil">
                La 4 poți atinge mai repede limita de 5 ore.{" "}
                <Link href="/utilizare" className="underline underline-offset-4 hover:text-foreground">
                  Vezi Utilizare
                </Link>
              </span>
            )}
          </>
        }
        control={
          <ToggleGroup
            value={[String(v.workerConcurrency)]}
            onValueChange={(arr) => {
              const n = Number(arr[0]);
              if (n && n !== v.workerConcurrency) save((x: number) => apply({ workerConcurrency: x }), n, () => setWorkerConcurrency(n));
            }}
            variant="outline"
            size="sm"
            aria-label="Analize în paralel"
          >
            {[1, 2, 3, 4].map((n) => (
              <ToggleGroupItem key={n} value={String(n)} className="w-9 tabular-nums" aria-label={`${n} în paralel`}>
                {n}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />
    </SettingsSection>
  );
}

/** yyyy-mm-dd → Date locală (fără decalaj de fus orar). */
function toDate(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function AnalysisSection({ values }: { values: AiValues }) {
  const [v, apply] = useOptimistic(values, (s, patch: Partial<AiValues>) => ({ ...s, ...patch }));
  // „O dată fixă” fără dată aleasă încă: doar local, se salvează abia după alegerea datei
  const [wantFixed, setWantFixed] = useState(false);
  const mode = v.defaultReferenceDate || wantFixed ? "fixa" : "azi";
  const save = useSave();
  return (
    <SettingsSection id="analiza" title="Analiză" description="Valorile implicite pentru documentele noi.">
      <SettingRow title="Data de referință implicită" description="Data la care se verifică forma legii, dacă nu alegi alta pentru un document.">
        <RadioGroup
          value={mode}
          onValueChange={(m) => {
            setWantFixed(m === "fixa");
            if (m === "azi" && v.defaultReferenceDate !== null) save((x: null) => apply({ defaultReferenceDate: x }), null, () => setDefaultReferenceDate(null));
          }}
          aria-label="Data de referință implicită"
          className="mt-3 flex flex-col gap-2.5"
        >
          <label className="flex items-center gap-2 text-sm">
            <RadioGroupItem value="azi" />
            Ziua curentă
          </label>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="fixa" />O dată fixă
            </label>
            {mode === "fixa" && (
              <DatePicker
                size="sm"
                className="w-48"
                locale="ro-RO"
                placeholder="Alege data"
                title="Data de referință"
                aria-label="Data de referință fixă"
                value={toDate(v.defaultReferenceDate)}
                onValueChange={(d) => {
                  if (!d) return;
                  const iso = toIso(d);
                  if (iso !== v.defaultReferenceDate) save((x: string) => apply({ defaultReferenceDate: x }), iso, () => setDefaultReferenceDate(iso));
                }}
              />
            )}
          </div>
        </RadioGroup>
        {mode === "fixa" && !v.defaultReferenceDate && <p className="mt-2 text-xs text-muted-foreground">Alege data; până atunci se folosește ziua curentă.</p>}
        {v.defaultReferenceDate && <p className="mt-2 text-xs text-muted-foreground">Documentele noi se verifică după forma legii din {fmtDateIso(v.defaultReferenceDate)}.</p>}
      </SettingRow>
    </SettingsSection>
  );
}
