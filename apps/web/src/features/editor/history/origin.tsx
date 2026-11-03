import { IconDeviceFloppy, IconDownload, IconRestore, IconSparkles, IconWand, type Icon } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Origin } from "../types";

export const ORIGINS: Record<Origin, { label: string; icon: Icon; className: string }> = {
  import: { label: "Import", icon: IconDownload, className: "" },
  manual: { label: "Manual", icon: IconDeviceFloppy, className: "" },
  ai_sugestie: { label: "Sugestie AI", icon: IconSparkles, className: "text-ai inset-ring-ai/30 bg-ai-soft [&>svg]:text-ai" },
  generare: { label: "Generare", icon: IconWand, className: "text-ai/80 inset-ring-ai/20 [&>svg]:text-ai/80" },
  restaurare: { label: "Restaurare", icon: IconRestore, className: "" },
};

/** Badge-ul de origine al unei versiuni (Import, Manual, Sugestie AI, Generare, Restaurare). */
export function OriginBadge({ origin, className }: { origin: Origin; className?: string }) {
  const o = ORIGINS[origin] ?? ORIGINS.manual;
  const I = o.icon;
  return (
    <Badge size="sm" className={cn(o.className, className)}>
      <I aria-hidden />
      {o.label}
    </Badge>
  );
}
