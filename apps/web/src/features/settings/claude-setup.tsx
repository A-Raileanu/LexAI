"use client";

import { IconAlertTriangle, IconDownload, IconExternalLink, IconPlugConnected, IconTerminal2 } from "@tabler/icons-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { ClaudeAccount } from "./claude-account";
import { installRunning, type ClaudeSetupState } from "./claude-setup-state";

type Action = { actiune: "instaleaza" | "anuleaza-instalarea" | "conecteaza" | "anuleaza-conectarea" } | { actiune: "cod"; cod: string };

async function call(action?: Action): Promise<ClaudeSetupState> {
  const res = await fetch("/api/claude", action ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) } : { cache: "no-store" });
  const body = (await res.json().catch(() => null)) as (ClaudeSetupState & { eroare?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.eroare ?? "Serverul local nu răspunde.");
  return body;
}

const mb = (n: number) => Math.round(n / 1_000_000);

/**
 * Pașii care lipsesc ca LexAI să poată folosi Claude: instalarea Claude Code (descărcat de la
 * Anthropic) și conectarea contului în browser. Nu afișează nimic când contul e conectat.
 */
export function ClaudeSetup({ account, refresh }: { account: ClaudeAccount; refresh: () => Promise<ClaudeAccount | null> }) {
  const [state, setState] = useState<ClaudeSetupState | null>(null);
  /** urmărim o operație pornită (aici sau înainte de reîncărcarea paginii) */
  const [watching, setWatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  // o instalare sau o conectare pornită înainte de reîncărcare continuă pe server
  useEffect(() => {
    let live = true;
    call()
      .then((s) => {
        if (!live) return;
        setState(s);
        if (installRunning(s.instalare) || s.conectare.phase === "astept") setWatching(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const settle = useCallback((s: ClaudeSetupState) => {
    setState(s);
    if (installRunning(s.instalare) || s.conectare.phase === "astept") return;
    setWatching(false);
    if (s.instalare.phase === "eroare") setError(s.instalare.message);
    else if (s.conectare.phase === "eroare") setError(s.conectare.message);
    else if (s.instalare.phase === "gata" || s.conectare.phase === "gata") {
      void refreshRef.current().then((a) => {
        if (a?.state === "conectat") toast.success(a.email ? `Contul Claude ${a.email} e conectat.` : "Contul Claude e conectat.");
        else if (a?.state === "neconectat") toast.success("Claude Code e instalat. Mai rămâne conectarea contului.");
      });
    }
  }, []);

  useEffect(() => {
    if (!watching) return;
    const id = setInterval(() => {
      call().then(settle, () => {});
    }, 800);
    return () => clearInterval(id);
  }, [watching, settle]);

  const run = async (action: Action) => {
    setBusy(true);
    setError(null);
    try {
      const s = await call(action);
      setState(s);
      if (action.actiune === "instaleaza" || action.actiune === "conecteaza") setWatching(true);
      if (action.actiune === "cod") setCode("");
      if (action.actiune.startsWith("anuleaza")) setWatching(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (account.state !== "lipsa" && account.state !== "neconectat") return null;
  const install = watching && state ? state.instalare : null;
  const login = watching && state ? state.conectare : null;

  const failure = error && (
    <Alert variant="destructive" appearance="soft">
      <IconAlertTriangle />
      <AlertTitle>{account.state === "lipsa" ? "Instalarea nu a reușit." : "Conectarea nu a reușit."}</AlertTitle>
      <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
    </Alert>
  );

  if (account.state === "lipsa") {
    const pct = install?.phase === "descarc" ? Math.round((install.received / install.total) * 100) : install?.phase === "instalez" ? 100 : 0;
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          LexAI folosește Claude Code, aplicația oficială Anthropic, ca să ruleze analizele și redactarea cu abonamentul tău Claude. Se descarcă de la Anthropic (circa 300 MB), se verifică
          și se instalează doar pentru utilizatorul tău, fără drepturi de administrator.
        </p>
        {install && installRunning(install) ? (
          <div className="flex flex-col gap-2" aria-live="polite">
            <Progress value={install.phase === "versiune" ? null : pct} size="sm" aria-label="Instalarea Claude Code" />
            <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>
                {install.phase === "versiune" && "Caut ultima versiune…"}
                {install.phase === "descarc" && `Descarc Claude Code ${install.version}: ${mb(install.received)} din ${mb(install.total)} MB`}
                {install.phase === "instalez" && `Instalez Claude Code ${install.version}…`}
              </span>
              {install.phase !== "instalez" && (
                <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run({ actiune: "anuleaza-instalarea" })}>
                  Anulează
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {failure}
            <div>
              <Button size="sm" loading={busy} onClick={() => void run({ actiune: "instaleaza" })}>
                <IconDownload />
                {error ? "Încearcă din nou" : "Instalează Claude Code"}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {login?.phase === "astept" ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Spinner size="sm" label="Se așteaptă" />
            Aștept confirmarea din browser…
          </p>
          <p className="text-sm text-muted-foreground">
            Am deschis pagina de conectare Anthropic în browser. Conectează-te cu contul Claude și apasă Authorize, apoi revino aici.
            {login.url && (
              <>
                {" "}
                Nu s-a deschis?{" "}
                <a href={login.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-foreground underline underline-offset-4">
                  Deschide pagina de conectare
                  <IconExternalLink className="size-3.5" />
                </a>
              </>
            )}
          </p>
          <form
            className="flex max-w-md flex-col gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) void run({ actiune: "cod", cod: code });
            }}
          >
            <label htmlFor="claude-cod" className="text-sm text-muted-foreground">
              Pagina îți arată un cod? Lipește-l aici:
            </label>
            <div className="flex gap-2">
              <Input id="claude-cod" size="sm" value={code} autoComplete="off" spellCheck={false} aria-invalid={login.codInvalid > 0 && !code ? true : undefined} onChange={(e) => setCode(e.target.value)} />
              <Button type="submit" size="sm" variant="outline" disabled={!code.trim()} loading={busy}>
                Trimite
              </Button>
            </div>
            {login.codInvalid > 0 && !code && (
              <p key={login.codInvalid} className="text-sm text-destructive" role="alert">
                Codul nu a fost acceptat. Copiază-l întreg din pagina Anthropic (cu butonul Copy) și lipește-l din nou.
              </p>
            )}
          </form>
          <div>
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void run({ actiune: "anuleaza-conectarea" })}>
              Anulează
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">Se deschide pagina de conectare Anthropic în browser. Ai nevoie de un abonament Claude Pro, Max sau Team.</p>
          {failure}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" loading={busy} onClick={() => void run({ actiune: "conecteaza" })}>
              <IconPlugConnected />
              {error ? "Încearcă din nou" : "Conectează contul Claude"}
            </Button>
            {error && (
              <Link href="/setari/terminal?mod=auth-login" className="inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                <IconTerminal2 className="size-4" />
                Conectează din terminal
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
