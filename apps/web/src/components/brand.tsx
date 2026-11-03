import { cn } from "@/lib/utils";

/** Wordmark-ul aplicației: un romb (semn de secțiune stilizat) și numele. */
export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-foreground", className)}>
      <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
        <rect x="4" y="4" width="16" height="16" rx="3" transform="rotate(45 12 12)" className="fill-primary" />
        <path d="M9.5 9.2c0-1 1-1.7 2.5-1.7s2.4.6 2.5 1.6M14.5 14.8c0 1-1 1.7-2.5 1.7s-2.4-.6-2.5-1.6M9.6 11.1c.6-.6 1.5-.8 2.4-.8 1.5 0 2.5.7 2.5 1.7s-1 1.7-2.5 1.7c-.9 0-1.8-.2-2.4-.8" className="fill-none stroke-primary-foreground" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      {!compact && <span className="text-[15px]">LexAI</span>}
    </span>
  );
}
