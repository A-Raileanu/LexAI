"use client";

import { IconChevronDown, IconChevronUp, IconReplace, IconSearch, IconX } from "@tabler/icons-react";
import { useEditorState, type Editor } from "@tiptap/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Toggle } from "@/components/ui/toggle";
import { gotoMatch, replaceAll, replaceCurrent, searchKey, setSearchQuery } from "./search";

/** Bara „Caută și înlocuiește” deasupra foii (⌘F / ⌥⌘F). Căutarea ignoră diacriticele și majusculele. */
export function FindBar({ editor, replace: initialReplace, onClose }: { editor: Editor; replace: boolean; onClose: () => void }) {
  const [query, setQuery] = useState(() => searchKey.getState(editor.state)?.query ?? "");
  const [replacement, setReplacement] = useState("");
  const [showReplace, setShowReplace] = useState(initialReplace);
  const stats = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const st = searchKey.getState(e.state);
      return { count: st?.matches.length ?? 0, index: st?.index ?? 0 };
    },
  });

  const close = () => {
    setSearchQuery(editor, "");
    onClose();
    editor.commands.focus();
  };

  return (
    <div role="search" aria-label="Caută în document" className="sticky top-2 z-20 mx-auto mb-3 flex w-full max-w-xl flex-col gap-1.5 rounded-lg bg-popover p-1.5 shadow-md ring-(length:--hairline) ring-foreground/10">
      <div className="flex items-center gap-1">
        <InputGroup className="h-8 flex-1">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            autoFocus
            value={query}
            placeholder="Caută în document"
            aria-label="Caută în document"
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchQuery(editor, e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                gotoMatch(editor, e.shiftKey ? -1 : 1);
              } else if (e.key === "Escape") {
                e.preventDefault();
                close();
              }
            }}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText className="text-xs tabular-nums" aria-live="polite">
              {query ? (stats.count ? `${stats.index + 1} din ${stats.count}` : "Niciun rezultat") : ""}
            </InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        <Button variant="ghost" size="icon-sm" aria-label="Rezultatul anterior" disabled={!stats.count} onClick={() => gotoMatch(editor, -1)}>
          <IconChevronUp />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Rezultatul următor" disabled={!stats.count} onClick={() => gotoMatch(editor, 1)}>
          <IconChevronDown />
        </Button>
        <Toggle size="sm" aria-label="Înlocuiește" pressed={showReplace} onPressedChange={setShowReplace}>
          <IconReplace />
        </Toggle>
        <Button variant="ghost" size="icon-sm" aria-label="Închide căutarea" onClick={close}>
          <IconX />
        </Button>
      </div>
      {showReplace && (
        <div className="flex items-center gap-1">
          <InputGroup className="h-8 flex-1">
            <InputGroupInput
              value={replacement}
              placeholder="Înlocuiește cu"
              aria-label="Înlocuiește cu"
              onChange={(e) => setReplacement(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  replaceCurrent(editor, replacement);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                }
              }}
            />
          </InputGroup>
          <Button variant="outline" size="sm" disabled={!stats.count || !editor.isEditable} onClick={() => replaceCurrent(editor, replacement)}>
            Înlocuiește
          </Button>
          <Button variant="outline" size="sm" disabled={!stats.count || !editor.isEditable} onClick={() => replaceAll(editor, replacement)}>
            Înlocuiește tot
          </Button>
        </div>
      )}
    </div>
  );
}
