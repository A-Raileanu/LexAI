"use client";

import type { TerminalMode } from "@lexai/terminal/ticket";
import { IconLogout, IconPlugConnectedX, IconRefresh, IconTerminal2 } from "@tabler/icons-react";
import dynamic from "next/dynamic";
import { Suspense, use, useState, useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { CopyCommand } from "@/components/copy-command";
import { checkClaudeAccount } from "@/features/settings/actions";
import { initials, type ClaudeAccount } from "@/features/settings/claude-account";
import { CheckedAt, ClaudeStatusBadge } from "@/features/settings/claude-account-card";
import { SERVICE_DOWN } from "./modes";
import type { Run } from "./terminal-panel";

const TerminalPanel = dynamic(() => import("./terminal-panel"), {
  ssr: false,
  loading: () => <Skeleton className="min-h-[420px] flex-1 rounded-xl" />,
});

const INSTALL = "curl -fsSL https://claude.ai/install.sh | bash";

export interface TerminalWorkspaceProps {
  account: Promise<ClaudeAccount>;
  serviceUp: boolean;
  initialMode: TerminalMode | null;
}

export function TerminalWorkspace({ account, serviceUp, initialMode }: TerminalWorkspaceProps) {
  const [run, setRun] = useState<Run | null>({ mode: initialMode ?? "auth-status", id: 1 });
  const [service, setService] = useState(serviceUp);
  const [checkingService, startService] = useTransition();
  const [fresh, setFresh] = useState<ClaudeAccount | null>(null);
  const [checking, startCheck] = useTransition();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const start = (mode: TerminalMode) => setRun((r) => ({ mode, id: (r?.id ?? 0) + 1 }));

  const refreshAccount = (after?: (a: ClaudeAccount) => void) =>
    startCheck(async () => {
      try {
        const a = await checkClaudeAccount();
        setFresh(a);
        after?.(a);
      } catch {
        setFresh({ state: "eroare", message: "Serverul local nu răspunde.", checkedAt: Date.now() });
      }
    });

  const onExit = (mode: TerminalMode, code: number | null) => {
    if (mode === "auth-status" || code !== 0) return refreshAccount();
    if (mode === "auth-login")
      refreshAccount((a) => {
        if (a.state === "conectat") toast.success(a.email ? `Conectat ca ${a.email}.` : "Conectat.");
      });
    if (mode === "auth-logout") refreshAccount((a) => a.state === "neconectat" && toast("Deconectat."));
  };

  const recheckService = () =>
    startService(async () => {
      try {
        const res = await fetch("/api/terminal/health", { cache: "no-store" });
        const body = (await res.json()) as { ok?: boolean };
        setService(body.ok === true);
        if (body.ok) start(run?.mode ?? "auth-status");
      } catch {
        setService(false);
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<AccountSkeleton />}>
        <AccountCard
          promise={account}
          fresh={fresh}
          checking={checking}
          onCheck={() => refreshAccount()}
          onLogin={() => start("auth-login")}
          onLogout={() => setConfirmLogout(true)}
        />
      </Suspense>

      {!service ? (
        <Card className="min-h-[420px] justify-center">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconPlugConnectedX />
              </EmptyMedia>
              <EmptyTitle>Terminalul nu este disponibil</EmptyTitle>
              <EmptyDescription>
                {SERVICE_DOWN.replace(" `pnpm dev`.", "")} <Kbd className="font-mono">pnpm dev</Kbd>.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" size="sm" loading={checkingService} onClick={recheckService}>
                <IconRefresh />
                Verifică din nou
              </Button>
            </EmptyContent>
          </Empty>
        </Card>
      ) : (
        <div className="relative flex min-h-[420px] flex-col" style={{ height: "max(420px, calc(100dvh - 22rem))" }}>
          {run && (
            <TerminalPanel
              run={run}
              onRun={start}
              onExit={onExit}
              onServiceDown={() => setService(false)}
            />
          )}
        </div>
      )}

      <p className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <IconTerminal2 className="size-3.5" aria-hidden />
          Doar Claude CLI. Alte comenzi nu sunt disponibile.
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Ctrl C</Kbd> oprește procesul
        </span>
      </p>
      <p className="text-xs text-muted-foreground sm:hidden">Terminalul e mai comod pe un ecran mai lat.</p>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deconectezi contul Claude?</AlertDialogTitle>
            <AlertDialogDescription>Analizele și generarea de documente nu vor mai funcționa până te conectezi din nou.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLogout(false);
                start("auth-logout");
              }}
            >
              Deconectează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <Card size="sm" className="flex-row items-center gap-3 px-4" aria-busy="true" aria-label="Se verifică contul Claude">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-1.5 h-3.5 w-32" />
      </div>
      <ClaudeStatusBadge account={null} checking />
    </Card>
  );
}

function AccountCard({
  promise,
  fresh,
  checking,
  onCheck,
  onLogin,
  onLogout,
}: {
  promise: Promise<ClaudeAccount>;
  fresh: ClaudeAccount | null;
  checking: boolean;
  onCheck: () => void;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const initial = use(promise);
  const a = fresh ?? initial;
  return (
    <Card size="sm" className="gap-3 px-4">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar size="lg" aria-hidden>
          <AvatarFallback>{a.state === "conectat" ? initials(a.email) : <IconTerminal2 className="size-4" />}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 basis-48" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 truncate text-sm font-medium">
              {a.state === "conectat" ? (a.email ?? "Cont Claude") : a.state === "lipsa" ? "Claude CLI nu a fost găsit" : "Cont Claude"}
            </p>
            <ClaudeStatusBadge account={a} checking={checking} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {a.state === "conectat" && (
              <>
                {a.plan && <>Plan {a.plan} · </>}
                <CheckedAt at={a.checkedAt} />
              </>
            )}
            {a.state === "neconectat" && "Analizele și generarea nu pot rula fără un cont Claude."}
            {a.state === "lipsa" && "Instalează Claude Code pe acest Mac, apoi apasă Verifică din nou."}
            {a.state === "eroare" && a.message}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 max-sm:basis-full">
          <Button variant="outline" size="sm" loading={checking} onClick={onCheck}>
            <IconRefresh />
            Verifică
          </Button>
          {a.state === "neconectat" && (
            <Button size="sm" onClick={onLogin}>
              Conectează-te
            </Button>
          )}
          {a.state === "conectat" && (
            <Button variant="ghost-destructive" size="sm" onClick={onLogout}>
              <IconLogout />
              Deconectează…
            </Button>
          )}
        </div>
      </div>
      {a.state === "lipsa" && (
        <div className="text-sm text-muted-foreground">
          Comanda de instalare (în Terminal-ul macOS):
          <CopyCommand command={INSTALL} />
        </div>
      )}
    </Card>
  );
}
