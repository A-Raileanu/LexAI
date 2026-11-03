"use client";

import { hasInlineFormat, isTextProposal, itemText, parseInline, plainInline, scopePreview, type Alignment, type ChatBlock, type ListBlock, type FormatProposal } from "@lexai/core/chat";
import { IconAlertTriangle, IconArrowUp, IconCheck, IconDots, IconPlayerStopFilled, IconSelector, IconSparkles, IconTrash, IconX } from "@tabler/icons-react";
import { createContext, useContext, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
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
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DEL, Diff, FOCUS_RING } from "@/features/analysis/suggestion-view";
import { suggestionDiff } from "@/features/analysis/triage";
import { useNow } from "@/features/analysis/use-now";
import { cn } from "@/lib/utils";
import { useChat } from "./context";
import { proposalSummary, proposalsHeading } from "./labels";
import type { ChatMessageView, ChatProposal } from "./types";

/**
 * Fila „Chat” din panoul editorului (docs/ux/18-chat-editor.md): conversația documentului,
 * modificările propuse (diff, Aplică / Respinge, Aplică toate) și compozitorul cu cipul selecției.
 */

const EXAMPLES = [
  "Reformulează clauza de reziliere ca pact comisoriu de gradul IV.",
  "Uniformizează denumirea părților în tot documentul.",
  "Verifică dacă termenul de preaviz respectă legea.",
  "Corectează diacriticele și punctuația.",
];

const timeFmt = new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Text simplu cu paragrafe (rând liber) și liste („- ”). */
function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <div className={cn("flex flex-col gap-2 text-md wrap-break-word", className)}>
      {blocks.map((b, i) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="flex list-disc flex-col gap-1 ps-5">
              {lines.map((l, k) => (
                <li key={k}>{l.replace(/^\s*[-•]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {b}
          </p>
        );
      })}
    </div>
  );
}

// ───────────────────────── modificări ─────────────────────────

function StatusLabel({ p }: { p: ChatProposal }) {
  if (p.status === "aplicata")
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-sm/5 font-medium text-v-corect-fg">
        <IconCheck aria-hidden className="size-4" />
        Aplicată
      </span>
    );
  return <span className="shrink-0 text-sm/5 text-fg-3">{p.status === "respinsa" ? "Respinsă" : "în așteptare"}</span>;
}

/** Textul nou cu **aldin** / *cursiv*, randat cu formatarea reală (fără asteriscuri). */
function Inline({ text }: { text: string }) {
  const parts = parseInline(text) ?? [{ text: plainInline(text), bold: false, italic: false }];
  return (
    <>
      {parts.map((x, i) => (
        <span key={i} className={cn(x.bold && "font-bold", x.italic && "italic")}>
          {x.text}
        </span>
      ))}
    </>
  );
}

/** Pasajul unei formatări, în context, cu formatarea nouă aplicată (aldin, cursiv, subliniat, tăiat). */
function FormatPreview({ p, segText, dim }: { p: FormatProposal; segText?: string; dim?: boolean }) {
  const at = segText && segText.startsWith(p.textOriginal, p.start) ? p.start : (segText?.indexOf(p.textOriginal) ?? -1);
  const before = segText && at >= 0 ? segText.slice(Math.max(0, at - 60), at) : "";
  const after = segText && at >= 0 ? segText.slice(at + p.textOriginal.length, at + p.textOriginal.length + 60) : "";
  const st = p.stiluri;
  const cls = cn(
    "rounded-[2px] bg-v-corect-bg box-decoration-clone shadow-[2px_0_0_var(--v-corect-bg),-2px_0_0_var(--v-corect-bg)]",
    st.bold === true && "font-bold",
    st.bold === false && "font-normal",
    st.italic === true && "italic",
    st.italic === false && "not-italic",
    st.underline === true && "underline decoration-1 underline-offset-2",
    st.strike === true && "line-through",
    st.underline === false && st.strike === false && "no-underline",
  );
  return (
    <p className={cn("font-serif text-base/6 wrap-break-word text-foreground", dim && "opacity-60")}>
      {before && <span className="text-fg-2">{at - 60 > 0 ? "…" : ""}{before}</span>}
      <span className={cls}>
        <span className="sr-only">formatat: </span>
        {p.textOriginal}
      </span>
      {after && <span className="text-fg-2">{after}{at + p.textOriginal.length + 60 < (segText?.length ?? 0) ? "…" : ""}</span>}
    </p>
  );
}

const TABLE_PREVIEW_ROWS = 8;

function TablePreview({ b }: { b: Extract<ChatBlock, { tip: "tabel" }> }) {
  const [all, setAll] = useState(false);
  const rows = all ? b.randuri : b.randuri.slice(0, TABLE_PREVIEW_ROWS);
  const hidden = b.randuri.length - rows.length;
  const cell = "border border-divider px-2 py-1 text-start align-top min-w-24 max-w-64 wrap-break-word";
  return (
    <div className="flex flex-col items-start gap-1">
      {/* tabelele late derulează în card, nu în panou */}
      <div className="max-w-full overflow-x-auto rounded-md" tabIndex={0} role="region" aria-label={`Tabel nou, ${b.antet.length || b.randuri[0]?.length || 0} coloane, ${b.randuri.length} rânduri`}>
        <table className="border-collapse text-sm/5">
          {b.antet.length > 0 && (
            <thead>
              <tr>
                {b.antet.map((h, i) => (
                  <th key={i} scope="col" className={cn(cell, "bg-muted font-semibold dark:bg-accent")}>
                    <Inline text={h} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((v, k) => (
                  <td key={k} className={cell}>
                    <Inline text={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hidden > 0 && (
        <Button size="sm" variant="ghost" className={cn("-ms-2.5", FOCUS_RING)} onClick={() => setAll(true)}>
          Încă {hidden === 1 ? "un rând" : `${hidden} rânduri`}
        </Button>
      )}
    </div>
  );
}

/** Saltul de pagină, ca marcajul discret din editor. */
function PageBreakPreview() {
  return (
    <div role="separator" aria-label="Salt de pagină" className="relative flex h-6 items-center justify-center">
      <span aria-hidden className="absolute inset-x-0 top-1/2 border-t border-dotted border-fg-3" />
      <span aria-hidden className="relative bg-background px-2 text-sm/5 text-fg-3 dark:bg-card">
        Salt de pagină
      </span>
    </div>
  );
}

const ALIGN_CLASS: Record<Alignment, string> = { stanga: "text-start", centru: "text-center", dreapta: "text-end", justificat: "text-justify" };

/** O listă nouă, cu sublistele ei: cifre, litere („a)”) sau buline, ca în editor. */
function ListPreview({ list }: { list: ListBlock }) {
  const List = list.numerotata ? "ol" : "ul";
  return (
    <List className={cn("flex flex-col gap-0.5 ps-5", list.litere ? "list-[lower-alpha]" : list.numerotata ? "list-decimal" : "list-disc")}>
      {list.elemente.map((e, k) => (
        <li key={k} className="wrap-break-word">
          <Inline text={itemText(e)} />
          {typeof e !== "string" && <ListPreview list={e.sublista} />}
        </li>
      ))}
    </List>
  );
}

/** Blocurile noi, randate: paragrafe, titluri, liste, tabele reale și salturi de pagină. */
function BlocksPreview({ blocks, dim }: { blocks: readonly ChatBlock[]; dim?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2 border-s-2 border-v-corect-fg/50 ps-3 font-serif text-base/6 text-foreground", dim && "opacity-60")}>
      <span className="sr-only">Conținut nou:</span>
      {blocks.map((b, i) => {
        switch (b.tip) {
          case "paragraf":
            return (
              <p key={i} className={cn("wrap-break-word", b.aliniere && ALIGN_CLASS[b.aliniere])}>
                <Inline text={b.text} />
              </p>
            );
          case "titlu":
            return (
              <p key={i} className={cn("font-semibold wrap-break-word", b.nivel === 1 && "text-[17px]/6", b.aliniere && ALIGN_CLASS[b.aliniere])}>
                <Inline text={b.text} />
              </p>
            );
          case "lista":
            return <ListPreview key={i} list={b} />;
          case "tabel":
            return (
              <div key={i} className="font-sans">
                <TablePreview b={b} />
              </div>
            );
          case "salt_pagina":
            return (
              <div key={i} className="font-sans">
                <PageBreakPreview />
              </div>
            );
        }
      })}
    </div>
  );
}

/** Textul paragrafelor înlocuite / șterse: tăiat, restrâns la două rânduri. */
function OldBlocks({ texts, dim }: { texts: readonly string[]; dim?: boolean }) {
  const [open, setOpen] = useState(false);
  const long = texts.length > 1 || (texts[0]?.length ?? 0) > 140;
  return (
    <div className={cn("flex flex-col items-start gap-1", dim && "opacity-60")}>
      <div className={cn("flex flex-col gap-1 font-serif text-base/6 text-foreground", !open && "line-clamp-2")}>
        {(open ? texts : [texts.join(" ¶ ")]).map((t, i) => (
          <p key={i} className="wrap-break-word">
            <del className={DEL}>
              <span className="sr-only">șters: </span>
              {t}
            </del>
          </p>
        ))}
      </div>
      {long && (
        <Button size="sm" variant="ghost" className={cn("-ms-2.5", FOCUS_RING)} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? "Restrânge textul înlocuit" : "Tot textul înlocuit"}
        </Button>
      )}
    </div>
  );
}

/** Hover-ul pe card, cu intenție: conturul imediat, derularea după 250 ms (doar dacă lista nu derulează). */
const HOVER_SCROLL_MS = 250;
const ListScrollContext = createContext<{ current: number }>({ current: 0 });
const listScrolling = (at: { current: number }) => performance.now() - at.current < 200;

function ProposalCard({ messageId, p, onLocate }: { messageId: string; p: ChatProposal; onLocate?: () => void }) {
  const c = useChat();
  const scrolledAt = useContext(ListScrollContext);
  const timer = useRef<number | null>(null);
  const hovering = useRef(false);
  const error = c.applyErrors[`${messageId}:${p.id}`];
  const locator = c.location(messageId, p);
  const pending = p.status === "propusa";
  const previewable = p.status !== "aplicata";
  const dim = p.status === "respinsa";

  const clearTimer = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const enter = () => {
    if (!previewable || hovering.current || listScrolling(scrolledAt)) return;
    hovering.current = true;
    c.preview(p);
    clearTimer();
    timer.current = window.setTimeout(() => {
      timer.current = null;
      if (hovering.current && !listScrolling(scrolledAt)) c.preview(p, { scroll: "if-needed" });
    }, HOVER_SCROLL_MS);
  };
  const leave = () => {
    hovering.current = false;
    clearTimer();
    c.preview(null);
  };
  const onBlur = (e: FocusEvent<HTMLElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) c.preview(null);
  };

  let body: ReactNode;
  if (p.kind === "formatare") {
    body = (
      <>
        <p className="text-sm/5 font-medium text-fg-2">{proposalSummary(p)}</p>
        <FormatPreview p={p} segText={c.segTexts.get(p.segmentId)} dim={dim} />
      </>
    );
  } else if (isTextProposal(p)) {
    const segText = c.segTexts.get(p.segmentId);
    // contextul diff-ului: textul paragrafului doar cât pasajul original e încă acolo
    const parts = suggestionDiff({ textOriginal: p.textOriginal, textPropus: plainInline(p.textNou) }, p.status === "aplicata" ? null : segText);
    body = (
      <>
        <Diff parts={parts} className={cn(dim && "opacity-60")} />
        {hasInlineFormat(p.textNou) && (
          <p className={cn("font-serif text-base/6 wrap-break-word", dim && "opacity-60")}>
            <span className="me-1.5 font-sans text-sm/5 text-fg-3">Cu formatare:</span>
            <Inline text={p.textNou} />
          </p>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className="text-sm/5 font-medium text-fg-2">{proposalSummary(p)}</p>
        {p.kind !== "inserare" && <OldBlocks texts={p.textOriginal} dim={dim} />}
        {p.blocuri.length > 0 && <BlocksPreview blocks={p.blocuri} dim={dim} />}
      </>
    );
  }

  return (
    <li
      className="flex min-w-0 flex-col gap-2 rounded-xl bg-background p-3 inset-ring-(length:--hairline) inset-ring-divider dark:bg-card"
      onMouseEnter={enter}
      onMouseMove={enter}
      onMouseLeave={leave}
      onFocus={() => previewable && c.preview(p, { scroll: "if-needed" })}
      onBlur={onBlur}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className={cn("min-w-0 truncate rounded-sm text-sm/5 text-fg-2 underline-offset-2 outline-none hover:text-foreground hover:underline", FOCUS_RING)}
          title="Arată în document"
          onClick={() => {
            clearTimer();
            c.preview(p, { scroll: true });
            onLocate?.();
          }}
        >
          {locator}
        </button>
        <StatusLabel p={p} />
      </div>
      {body}
      {p.explicatie && <p className="text-md text-fg-2">{p.explicatie}</p>}
      {error && (
        <p role="alert" className="text-sm/5 text-v-eroare-fg">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {pending && (
          <>
            <Button size="sm" className={FOCUS_RING} onClick={() => c.apply(messageId, [p.id])}>
              Aplică
            </Button>
            <Button size="sm" variant="ghost" className={FOCUS_RING} onClick={() => c.reject(messageId, p.id)}>
              Respinge
            </Button>
          </>
        )}
        {p.status === "aplicata" && (
          <Button size="sm" variant="ghost" className={cn("-ms-2.5", FOCUS_RING)} onClick={() => c.undo(messageId, p.id)}>
            Anulează
          </Button>
        )}
        {p.status === "respinsa" && (
          <Button size="sm" variant="ghost" className={cn("-ms-2.5", FOCUS_RING)} onClick={() => c.reconsider(messageId, p.id)}>
            Reconsideră
          </Button>
        )}
      </div>
    </li>
  );
}

function Proposals({ m, onLocate }: { m: ChatMessageView; onLocate?: () => void }) {
  const c = useChat();
  if (!m.proposals.length) return null;
  const list = c.ordered(m);
  const pending = list.filter((p) => p.status === "propusa");
  const headingId = `chat-mod-${m.id}`;
  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <div className="flex min-h-8 items-center gap-2">
        <h3 id={headingId} className="text-sm/5 font-semibold text-fg-2">
          {proposalsHeading(list.length)}
        </h3>
        {pending.length >= 2 && (
          <Button
            size="sm"
            variant="outline"
            className={cn("ms-auto", FOCUS_RING)}
            onClick={() =>
              c.apply(
                m.id,
                pending.map((p) => p.id),
              )
            }
          >
            Aplică toate ({pending.length})
          </Button>
        )}
      </div>
      <ul className="flex min-w-0 flex-col gap-2">
        {list.map((p) => (
          <ProposalCard key={p.id} messageId={m.id} p={p} onLocate={onLocate} />
        ))}
      </ul>
    </section>
  );
}

// ───────────────────────── mesaje ─────────────────────────

function Elapsed({ since }: { since: number | null }) {
  const now = useNow(1000, since !== null);
  if (!now || since === null) return null;
  const s = Math.max(0, Math.round((now - since) / 1000));
  return <span className="shrink-0 text-fg-3 tabular-nums">{s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`}</span>;
}

function AssistantMessage({ m, onLocate }: { m: ChatMessageView; onLocate?: () => void }) {
  const c = useChat();
  const reply = m.reply;
  if (reply?.state === "in_curs") {
    return (
      <div role="status" className="flex items-center gap-2 text-sm/5 text-fg-2">
        <Spinner className="size-4" label="Răspuns în curs" />
        <span className="min-w-0 flex-1 truncate">{c.activity ?? "Pregătesc răspunsul"}</span>
        <Elapsed since={reply.startedAt} />
      </div>
    );
  }
  if (reply?.state === "eroare" || reply?.state === "oprit") {
    const stopped = reply.state === "oprit";
    return (
      <div role={stopped ? "status" : "alert"} className={cn("flex flex-col items-start gap-1.5 text-sm/5", stopped ? "text-fg-3" : "text-v-eroare-fg")}>
        <p className="flex items-start gap-1.5">
          {!stopped && <IconAlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />}
          <span>{stopped ? "Oprit." : `Nu am putut răspunde.${reply.error ? ` ${reply.error}` : ""}`}</span>
        </p>
        <Button size="sm" variant="outline" className={FOCUS_RING} disabled={Boolean(c.running)} onClick={() => c.retry(m.id)}>
          Reîncearcă
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {m.content && <RichText text={m.content} />}
      <Proposals m={m} onLocate={onLocate} />
    </div>
  );
}

function UserMessage({ m }: { m: ChatMessageView }) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[85%] flex-col gap-1.5 rounded-xl bg-muted px-3 py-2 dark:bg-accent" title={timeFmt.format(m.createdAt)}>
        {m.scope && (
          <p className="line-clamp-2 border-s-2 border-divider ps-2 text-sm/5 text-fg-2">
            <span className="sr-only">Pe textul selectat: </span>„{scopePreview(m.scope, 160)}”
          </p>
        )}
        <p className="text-md wrap-break-word whitespace-pre-line">{m.content}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  const c = useChat();
  return (
    <div className="flex flex-col gap-4 px-4 pt-8 pb-4">
      <div className="flex flex-col gap-1">
        <IconSparkles aria-hidden className="mb-1 size-5 text-ai" />
        <h3 className="text-base/[22px] font-semibold">Cere o modificare sau pune o întrebare</h3>
        <p className="text-md text-fg-2">Modificările propuse apar ca diferențe. Documentul nu se schimbă până nu le aplici.</p>
      </div>
      <ul className="-mx-2 flex flex-col">
        {EXAMPLES.map((e) => (
          <li key={e}>
            <button
              type="button"
              className={cn("w-full rounded-md px-2 py-1.5 text-start text-md text-foreground outline-none hover:bg-muted", FOCUS_RING)}
              onClick={() => {
                c.setDraft(e);
                document.getElementById("chat-composer")?.focus();
              }}
            >
              {e}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-sm/5 text-fg-3">Răspunsurile pot conține erori; verifică înainte să aplici.</p>
    </div>
  );
}

// ───────────────────────── compozitor ─────────────────────────

function ScopeChip() {
  const c = useChat();
  const scope = c.scope;
  if (!scope) return null;
  const chars = scope.text.length;
  const paras = scope.segments.length;
  return (
    <div className="flex min-w-0 items-center gap-1 rounded-md bg-muted ps-2 pe-0.5 text-sm/5 text-fg-2 dark:bg-accent">
      <IconSelector aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate" title={`${chars} caractere din ${paras === 1 ? "un paragraf" : `${paras} paragrafe`}`}>
        Doar textul selectat: „{scopePreview(scope, 48)}”
      </span>
      <Button variant="ghost" size="icon-xs" className={FOCUS_RING} aria-label="Scoate selecția din cerere" onClick={c.dismissScope}>
        <IconX />
      </Button>
    </div>
  );
}

function Composer() {
  const c = useChat();
  const ref = useRef<HTMLTextAreaElement>(null);
  const running = Boolean(c.running);
  const { consumeFocusRequest, focusTick } = c;

  // ⌘J: focusul în compozitor (și după ce fila abia s-a montat)
  useEffect(() => {
    if (consumeFocusRequest()) ref.current?.focus();
  }, [consumeFocusRequest, focusTick]);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!running) void c.send();
    } else if (e.key === "Escape") {
      e.preventDefault();
      c.focusEditor();
    }
  };

  const canSend = Boolean(c.draft.trim()) && !c.sending;
  return (
    <div className="shrink-0 border-t border-divider p-3">
      <div className="flex flex-col gap-2 rounded-xl bg-background p-2 inset-ring-(length:--hairline) inset-ring-divider focus-within:inset-ring-foreground/40 dark:bg-card">
        <ScopeChip />
        <label htmlFor="chat-composer" className="sr-only">
          Cererea pentru asistent
        </label>
        <Textarea
          id="chat-composer"
          ref={ref}
          value={c.draft}
          onChange={(e) => c.setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          minRows={2}
          maxRows={8}
          placeholder={c.scope ? "Ce schimb în textul selectat?" : "Cere o modificare sau pune o întrebare…"}
          className="border-0 bg-transparent px-1 py-0.5 text-md shadow-none ring-0 focus-visible:ring-0 dark:bg-transparent"
          aria-describedby={c.sendError ? "chat-send-error" : "chat-composer-hint"}
        />
        <div className="flex items-center gap-2">
          <p id="chat-composer-hint" className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden ps-1 text-sm/5 whitespace-nowrap text-fg-3">
            <Kbd keys="enter" size="sm" /> trimite · <Kbd keys="shift+enter" size="sm" /> rând nou
          </p>
          {running ? (
            <Tooltip>
              <TooltipTrigger render={<Button size="icon-sm" shape="pill" className={FOCUS_RING} aria-label="Oprește răspunsul" onClick={c.stop} />}>
                <IconPlayerStopFilled className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent>Oprește</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger render={<Button size="icon-sm" shape="pill" className={FOCUS_RING} aria-label="Trimite" disabled={!canSend} onClick={() => void c.send()} />}>
                {c.sending ? <Spinner className="size-4" label="Se trimite" /> : <IconArrowUp />}
              </TooltipTrigger>
              <TooltipContent>
                Trimite <Kbd keys="enter" size="sm" />
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
      {c.sendError && (
        <p id="chat-send-error" role="alert" className="mt-2 text-sm/5 text-v-eroare-fg">
          {c.sendError}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── panoul ─────────────────────────

function Header() {
  const c = useChat();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-divider ps-4 pe-2">
      <p className="min-w-0 flex-1 truncate text-sm/5 text-fg-2">Conversația documentului</p>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger render={<DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" className={FOCUS_RING} aria-label="Opțiunile conversației" />} />}>
            <IconDots />
          </TooltipTrigger>
          <TooltipContent>Opțiunile conversației</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem variant="destructive" disabled={!c.messages.length || Boolean(c.running)} onClick={() => setConfirm(true)}>
            <IconTrash />
            Șterge conversația
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirm} onOpenChange={(o) => !busy && setConfirm(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi conversația?</AlertDialogTitle>
            <AlertDialogDescription>Mesajele și modificările propuse dispar din acest document. Textul documentului rămâne cum e.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Renunță</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                setBusy(true);
                void c.clear().then((ok) => {
                  setBusy(false);
                  if (ok) setConfirm(false);
                });
              }}
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** `onLocate`: după „arată în document” (pe ecran îngust închide foaia, ca pasajul să se vadă). */
export function ChatPanel({ markScope, onLocate }: { markScope: (on: boolean) => void; onLocate?: () => void }) {
  const c = useChat();
  const listRef = useRef<HTMLDivElement>(null);
  const scrolledAt = useRef(0);
  const count = c.messages.length;
  const runningId = c.running?.id ?? null;
  const hasScope = Boolean(c.scope);

  // selecția trimisă rămâne vizibilă în document cât fila e deschisă
  useEffect(() => {
    markScope(hasScope);
    return () => markScope(false);
  }, [markScope, hasScope]);

  // mesaj nou sau răspuns în curs: lista coboară la capăt
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count, runningId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Header />
      <div
        ref={listRef}
        role="log"
        aria-label="Conversația documentului"
        aria-live="polite"
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={() => {
          scrolledAt.current = performance.now();
        }}
      >
        {count === 0 ? (
          <EmptyState />
        ) : (
          <ListScrollContext.Provider value={scrolledAt}>
            <ol className="flex flex-col gap-5 px-4 py-4">
              {c.messages.map((m) => (
                <li key={m.id} className="min-w-0">
                  {m.role === "utilizator" ? <UserMessage m={m} /> : <AssistantMessage m={m} onLocate={onLocate} />}
                </li>
              ))}
            </ol>
          </ListScrollContext.Provider>
        )}
      </div>
      <Composer />
    </div>
  );
}
