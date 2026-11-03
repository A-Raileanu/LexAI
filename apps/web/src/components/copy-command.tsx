"use client";

import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Comanda de terminal, cu buton de copiere. */
export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="mt-1.5 flex items-center gap-1 rounded-md bg-background/70 py-0.5 ps-2.5 pe-0.5 font-mono text-[13px] inset-ring-(length:--hairline) inset-ring-border">
      <code className="flex-1">{command}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={copied ? "Copiat" : "Copiază"}
        onClick={async () => {
          await navigator.clipboard.writeText(command).catch(() => undefined);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <IconCheck /> : <IconCopy />}
      </Button>
    </span>
  );
}
