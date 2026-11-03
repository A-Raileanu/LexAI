import { cn } from "@/lib/utils";
import mark from "./brand-mark.png";

/** Wordmark-ul aplicației: iconul cu balanța (același ca al aplicației desktop) și numele. */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-foreground", className)}>
      {/* imagine mică, statică: fără next/image (optimizatorul n-ar aduce nimic la 20 px) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mark.src} alt="" width={20} height={20} className="size-5 shrink-0 rounded-[18.5%] dark:ring-1 dark:ring-white/20" />
      {!compact && <span className="text-[15px]">LexAI</span>}
    </span>
  );
}
