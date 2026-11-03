"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { fmtPct, fmtTokens, fmtUsd, type Bucket, type Range, type Totals } from "./aggregate";

export type Metric = "l5" | "l7" | "tokens" | "cost";

const fg = (pct: number) => `color-mix(in oklch, var(--foreground) ${pct}%, transparent)`;

const LIMIT_CONFIG: ChartConfig = {
  l5: { label: "Limita 5 h", color: fg(85) },
  l7: { label: "Limita 7 z", color: fg(85) },
};
const TOKEN_CONFIG: ChartConfig = {
  output: { label: "Output", color: fg(85) },
  input: { label: "Input", color: fg(45) },
  cache: { label: "Cache", color: fg(18) },
};
const COST_CONFIG: ChartConfig = { cost: { label: "Cost echivalent API", color: fg(80) } };

function KpiTab({ value, label, figure, hint }: { value: Metric; label: string; figure: string; hint?: string }) {
  return (
    <TabsTrigger value={value} className="h-auto min-w-32 flex-col items-start gap-0.5 px-3 py-2 text-start">
      <span className="text-xs font-normal text-muted-foreground">{label}</span>
      <span className="text-base font-semibold tabular-nums">{figure}</span>
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </TabsTrigger>
  );
}

export function HistoryChart({
  metric,
  onMetric,
  buckets,
  totals,
  range,
}: {
  metric: Metric;
  onMetric: (m: Metric) => void;
  buckets: Bucket[];
  totals: Totals;
  range: Range;
}) {
  const perDay = range === "24h" ? 1 : range === "7z" ? 7 : 30;
  const unit = range === "24h" ? "oră" : "zi";
  const peakBucket = (key: "tokens" | "cost") => buckets.reduce((m, b) => Math.max(m, b[key]), 0);
  // recharts omite singur etichetele care s-ar suprapune (ecrane înguste, 30 de zile)
  const xAxis = <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" minTickGap={16} />;

  return (
    <Tabs value={metric} onValueChange={(v) => onMetric(v as Metric)} className="gap-0">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto" aria-label="Metrica graficului">
        <KpiTab value="l5" label="Limita 5 h" figure={totals.peak5 === null ? "—" : fmtPct(totals.peak5)} hint="vârf" />
        <KpiTab value="l7" label="Limita 7 z" figure={totals.peak7 === null ? "—" : fmtPct(totals.peak7)} hint="vârf" />
        <KpiTab value="tokens" label="Tokeni" figure={fmtTokens(totals.tokens)} hint="total" />
        <KpiTab value="cost" label="Cost echivalent API" figure={`≈ ${fmtUsd(totals.cost)}`} hint="estimare" />
      </TabsList>

      <div className="pt-4">
        {(metric === "l5" || metric === "l7") && (
          <ChartContainer config={LIMIT_CONFIG} className="aspect-auto h-56 w-full" aria-label={`Evoluția limitei ${metric === "l5" ? "de 5 ore" : "de 7 zile"}`}>
            <AreaChart data={buckets} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              {xAxis}
              <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => `${v} %`} />
              <ReferenceLine y={100} stroke="var(--v-eroare)" strokeOpacity={0.6} strokeDasharray="4 4" />
              <ChartTooltip content={<ChartTooltipContent locale="ro-RO" indicator="line" valueFormatter={(v) => (typeof v === "number" ? fmtPct(v) : "—")} />} />
              <Area
                dataKey={metric}
                type="monotone"
                stroke={`var(--color-${metric})`}
                fill={`var(--color-${metric})`}
                fillOpacity={0.12}
                strokeWidth={1.5}
                connectNulls={false}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
        {metric === "tokens" && (
          <ChartContainer config={TOKEN_CONFIG} className="aspect-auto h-56 w-full" aria-label="Tokeni pe interval">
            <BarChart data={buckets} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              {xAxis}
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => fmtTokens(v)} />
              <ChartTooltip content={<ChartTooltipContent locale="ro-RO" valueFormatter={(v) => (typeof v === "number" ? fmtTokens(v) : "—")} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="cache" stackId="t" fill="var(--color-cache)" isAnimationActive={false} />
              <Bar dataKey="input" stackId="t" fill="var(--color-input)" isAnimationActive={false} />
              <Bar dataKey="output" stackId="t" fill="var(--color-output)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        )}
        {metric === "cost" && (
          <ChartContainer config={COST_CONFIG} className="aspect-auto h-56 w-full" aria-label="Cost echivalent API pe interval">
            <BarChart data={buckets} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              {xAxis}
              <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => fmtUsd(v)} />
              <ChartTooltip content={<ChartTooltipContent locale="ro-RO" valueFormatter={(v) => (typeof v === "number" ? `≈ ${fmtUsd(v)}` : "—")} />} />
              <Bar dataKey="cost" fill="var(--color-cost)" radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ChartContainer>
        )}
        <p className={cn("mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums")}>
          {metric === "tokens" && (
            <>
              <span>Total {fmtTokens(totals.tokens)}</span>
              <span>Medie pe zi {fmtTokens(totals.tokens / perDay)}</span>
              <span>
                Vârf {fmtTokens(peakBucket("tokens"))} / {unit}
              </span>
              <span>
                in {fmtTokens(totals.input)} · out {fmtTokens(totals.output)} · cache {fmtTokens(totals.cache)}
              </span>
            </>
          )}
          {metric === "cost" && (
            <>
              <span>Total ≈ {fmtUsd(totals.cost)}</span>
              <span>Medie pe zi ≈ {fmtUsd(totals.cost / perDay)}</span>
              <span>
                Vârf ≈ {fmtUsd(peakBucket("cost"))} / {unit}
              </span>
            </>
          )}
          {(metric === "l5" || metric === "l7") && (
            <span>Valorile sunt citite după fiecare job AI; intervalele fără joburi apar ca goluri. Linia punctată marchează 100 %.</span>
          )}
        </p>
      </div>
    </Tabs>
  );
}
