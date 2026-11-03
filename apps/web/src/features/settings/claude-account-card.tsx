"use client";

import { IconAlertTriangle, IconArrowRight, IconRefresh, IconTerminal2 } from "@tabler/icons-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, BadgeDot } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fullDate, relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { checkClaudeAccount } from "./actions";
import { initials, type ClaudeAccount } from "./claude-account";
import { ClaudeSetup } from "./claude-setup";
import { SettingsSection } from "./section";

/** Pastila de stare a contului Claude (text + punct colorat). */
export function ClaudeStatusBadge({ account, checking }: { account: ClaudeAccount | null; checking?: boolean }) {
  if (checking || !account)
    return (
      <Badge appearance="muted" shape="pill">
        <Spinner size="sm" className="size-3" label="Se verifică" />
        Se verifică…
      </Badge>
    );
  if (account.state === "conectat")
    return (
      <Badge variant="success" shape="pill">
        <BadgeDot />
        Conectat
      </Badge>
    );
  if (account.state === "neconectat")
    return (
      <Badge appearance="muted" shape="pill">
        <BadgeDot />
        Neconectat
      </Badge>
    );
  if (account.state === "lipsa")
    return (
      <Badge variant="destructive" shape="pill">
        <BadgeDot />
        CLI negăsit
      </Badge>
    );
  return (
    <Badge variant="warning" shape="pill">
      <BadgeDot />
      Nu am putut verifica
    </Badge>
  );
}

/** Starea curentă + „Verifică din nou” (rulează `claude auth status` pe server). */
export function useClaudeAccount(initial: ClaudeAccount) {
  const [fresh, setFresh] = useState<ClaudeAccount | null>(null);
  const [checking, start] = useTransition();
  const refresh = () =>
    new Promise<ClaudeAccount | null>((resolve) => {
      start(async () => {
        try {
          const a = await checkClaudeAccount();
          setFresh(a);
          resolve(a);
        } catch {
          setFresh({ state: "eroare", message: "Serverul local nu răspunde.", checkedAt: Date.now() });
          resolve(null);
        }
      });
    });
  return { account: fresh ?? initial, checking, refresh };
}

export function CheckedAt({ at }: { at: number }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>verificat {relativeTime(at)}</TooltipTrigger>
      <TooltipContent>{fullDate(at)}</TooltipContent>
    </Tooltip>
  );
}

export function ClaudeAccountSection({ initial }: { initial: ClaudeAccount }) {
  const { account, checking, refresh } = useClaudeAccount(initial);
  const recheck = (
    <Button variant="outline" size="sm" loading={checking} onClick={() => void refresh()}>
      <IconRefresh />
      Verifică din nou
    </Button>
  );
  return (
    <SettingsSection id="cont-claude" title="Cont Claude" description="Contul Claude prin care LexAI rulează analizele și redactarea.">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start">
        <Avatar size="lg" aria-hidden>
          <AvatarFallback>{account.state === "conectat" ? initials(account.email) : <IconTerminal2 className="size-4" />}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <ClaudeStatusBadge account={account} checking={checking} />
            {account.state === "conectat" && account.plan && (
              <Badge appearance="outline" shape="pill">
                plan {account.plan}
              </Badge>
            )}
          </div>
          {account.state === "conectat" && (
            <>
              <p className="mt-2 truncate text-sm font-medium">{account.email ? `Conectat ca ${account.email}` : "Conectat"}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {account.org && <>{account.org} · </>}
                <CheckedAt at={account.checkedAt} />
              </p>
            </>
          )}
          {account.state === "neconectat" && (
            <p className="mt-2 text-sm text-muted-foreground">Analizele și generarea nu pot rula fără un cont Claude.</p>
          )}
          {account.state === "lipsa" && <p className="mt-2 text-sm font-medium">Claude Code nu este instalat pe acest calculator.</p>}
          {account.state === "eroare" && <p className="mt-2 text-sm text-muted-foreground">{account.message}</p>}
          {(account.state === "lipsa" || account.state === "neconectat") && (
            <div className="mt-3">
              <ClaudeSetup account={account} refresh={refresh} />
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {account.state !== "lipsa" && (
              <Link href="/setari/terminal" className={buttonVariants({ variant: "outline", size: "sm" })}>
                Deschide terminalul
                <IconArrowRight />
              </Link>
            )}
            {recheck}
            <Link href="/utilizare" className="ms-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              Vezi limitele de utilizare
            </Link>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}

/** Alerta din capul paginii Setări când contul nu e utilizabil. */
export function ClaudeDisconnectedAlert({ account, className }: { account: ClaudeAccount; className?: string }) {
  if (account.state === "conectat" || account.state === "eroare") return null;
  return (
    <Alert variant="warning" appearance="soft" className={cn(className)}>
      <IconAlertTriangle />
      <AlertTitle>{account.state === "lipsa" ? "Claude Code nu este instalat." : "Contul Claude nu e conectat."}</AlertTitle>
      <AlertDescription>Analizele și redactarea nu pot rula.</AlertDescription>
      <AlertAction>
        <Link href="#cont-claude" className={buttonVariants({ variant: "outline", size: "sm" })}>
          {account.state === "lipsa" ? "Instalează" : "Conectează"}
        </Link>
      </AlertAction>
    </Alert>
  );
}

/** Pe prima pagină: apare doar cât timp Claude Code lipsește sau contul nu e conectat. */
export function ClaudeSetupCard({ initial }: { initial: ClaudeAccount }) {
  const { account, refresh } = useClaudeAccount(initial);
  if (account.state !== "lipsa" && account.state !== "neconectat") return null;
  return (
    <section aria-labelledby="claude-setup-title" className="mb-8 rounded-xl border bg-card px-5 py-4">
      <h2 id="claude-setup-title" className="text-base font-semibold">
        {account.state === "lipsa" ? "Instalează Claude Code" : "Conectează contul Claude"}
      </h2>
      <div className="mt-2">
        <ClaudeSetup account={account} refresh={refresh} />
      </div>
    </section>
  );
}
