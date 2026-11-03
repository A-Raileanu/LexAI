"use client";

import {
  IconAlignCenter,
  IconAlignJustified,
  IconAlignLeft,
  IconAlignRight,
  IconArrowBackUp,
  IconArrowForwardUp,
  IconBold,
  IconChevronDown,
  IconHighlight,
  IconIndentDecrease,
  IconIndentIncrease,
  IconItalic,
  IconLineHeight,
  IconList,
  IconListNumbers,
  IconMinus,
  IconPlus,
  IconStrikethrough,
  IconUnderline,
  type Icon,
} from "@tabler/icons-react";
import { useEditorState, type Editor } from "@tiptap/react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/ui/combobox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { changeIndent, setBlockAttrs } from "../schema/block-format";
import { FONT_SIZES, parseFontSizePt, setFontSizePt, setParagraphStyle, stepFontSize, type ParagraphStyle } from "../schema/formatting";
import { HIGHLIGHT_COLORS, LINE_HEIGHTS, TEXT_COLORS, Tip, TipLabel, firstFont, fmtNum, keepFocus, toEditor } from "./shared";

export interface ControlProps {
  editor: Editor;
  disabled?: boolean;
}

// ───────────── Istoric ─────────────

export function HistoryButtons({ editor, disabled }: ControlProps) {
  const s = useEditorState({ editor, selector: ({ editor: e }) => ({ undo: e.can().undo(), redo: e.can().redo() }) });
  return (
    <>
      <Tip label="Anulează" keys="mod+z">
        <Button variant="ghost" size="icon-sm" aria-label="Anulează" disabled={disabled || !s.undo} onMouseDown={keepFocus} onClick={() => editor.chain().focus().undo().run()}>
          <IconArrowBackUp />
        </Button>
      </Tip>
      <Tip label="Refă" keys="mod+shift+z">
        <Button variant="ghost" size="icon-sm" aria-label="Refă" disabled={disabled || !s.redo} onMouseDown={keepFocus} onClick={() => editor.chain().focus().redo().run()}>
          <IconArrowForwardUp />
        </Button>
      </Tip>
    </>
  );
}

// ───────────── Stil ─────────────

export const STYLE_LABELS: Record<ParagraphStyle, string> = {
  paragraph: "Normal",
  h1: "Titlu 1",
  h2: "Titlu 2",
  h3: "Titlu 3",
  h4: "Titlu 4",
  quote: "Citat",
};
export const STYLE_KEYS: Partial<Record<ParagraphStyle, string>> = { paragraph: "mod+alt+0", h1: "mod+alt+1", h2: "mod+alt+2", h3: "mod+alt+3", h4: "mod+alt+4" };
const STYLE_CLASS: Record<ParagraphStyle, string> = {
  paragraph: "",
  h1: "text-base font-bold",
  h2: "text-[0.95rem] font-bold",
  h3: "font-bold",
  h4: "font-bold italic",
  quote: "italic ps-3",
};

export function currentStyle(e: Editor): ParagraphStyle {
  for (const l of [1, 2, 3, 4] as const) if (e.isActive("heading", { level: l })) return `h${l}`;
  const p = e.getAttributes("paragraph");
  if (p.indentPt === 36 && p.spaceBeforePt === 6 && p.spaceAfterPt === 6) return "quote";
  return "paragraph";
}

export function StyleSelect({ editor, disabled }: ControlProps) {
  const style = useEditorState({ editor, selector: ({ editor: e }) => currentStyle(e) });
  return (
    <Select value={style} onValueChange={(v) => v && setParagraphStyle(editor, v)} items={STYLE_LABELS} disabled={disabled}>
      <TooltipTrigger
        render={
          <SelectTrigger size="sm" className="w-28 shrink-0" aria-label="Stil paragraf">
            <SelectValue />
          </SelectTrigger>
        }
        content={<TipLabel label="Stil paragraf" />}
      />
      <SelectContent finalFocus={toEditor(editor)} alignItemWithTrigger={false} className="min-w-52">
        {(Object.keys(STYLE_LABELS) as ParagraphStyle[]).map((k) => (
          <SelectItem key={k} value={k}>
            <span className={cn("flex-1", STYLE_CLASS[k])}>{STYLE_LABELS[k]}</span>
            {STYLE_KEYS[k] && <Kbd keys={STYLE_KEYS[k]} size="sm" className="ms-3" />}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ───────────── Font ─────────────

interface FontGroup {
  value: string;
  items: string[];
}

export function FontFamilyCombo({ editor, disabled, defaultFont, docFonts }: ControlProps & { defaultFont: string; docFonts: string[] }) {
  const current = useEditorState({ editor, selector: ({ editor: e }) => firstFont(e.getAttributes("textStyle").fontFamily) || defaultFont });
  const groups = useMemo<FontGroup[]>(() => {
    const fromDoc = [...new Set([defaultFont, ...docFonts])];
    const rest = ["Times New Roman", "Arial", "Calibri", "Cambria", "Georgia", "Garamond", "Verdana", "Courier New"].filter((f) => !fromDoc.includes(f));
    return [
      { value: "Din document", items: fromDoc },
      { value: "Toate", items: rest },
    ].filter((g) => g.items.length);
  }, [defaultFont, docFonts]);

  return (
    <Combobox<string>
      items={groups}
      value={current}
      onValueChange={(v) => {
        if (!v) return;
        if (v === defaultFont) editor.chain().focus().unsetFontFamily().run();
        else editor.chain().focus().setFontFamily(v).run();
      }}
      disabled={disabled}
    >
      <TooltipTrigger
        render={
          <ComboboxTrigger className="h-8 w-36 shrink-0 text-sm" aria-label="Familie de font">
            <span style={{ fontFamily: `"${current}", serif` }}>{current}</span>
          </ComboboxTrigger>
        }
        content={<TipLabel label="Familie de font" />}
      />
      <ComboboxContent className="w-60" finalFocus={toEditor(editor)}>
        <ComboboxInput placeholder="Caută fontul…" />
        <ComboboxEmpty>Niciun font găsit.</ComboboxEmpty>
        <ComboboxList>
          {(group: FontGroup) => (
            <ComboboxGroup key={group.value} items={group.items}>
              <ComboboxLabel>{group.value}</ComboboxLabel>
              <ComboboxCollection>
                {(font: string) => (
                  <ComboboxItem key={font} value={font}>
                    <span style={{ fontFamily: `"${font}", serif` }}>{font}</span>
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </ComboboxGroup>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function FontSizeControl({ editor, disabled, defaultSize }: ControlProps & { defaultSize: number }) {
  const size = useEditorState({ editor, selector: ({ editor: e }) => parseFontSizePt(e.getAttributes("textStyle").fontSize) ?? defaultSize });
  const apply = (raw: string) => {
    const n = Number.parseFloat(raw.replace(",", "."));
    if (Number.isFinite(n) && n > 0 && n !== size) setFontSizePt(editor, n);
  };
  return (
    <div role="group" aria-label="Mărime font" className="flex h-8 shrink-0 items-center rounded-md inset-ring-(length:--hairline) inset-ring-input">
      <Tip label="Micșorează fontul" keys="mod+shift+,">
        <Button variant="ghost" size="icon-xs" className="ms-0.5" aria-label="Micșorează fontul" disabled={disabled} onMouseDown={keepFocus} onClick={() => stepFontSize(editor, -1, defaultSize)}>
          <IconMinus />
        </Button>
      </Tip>
      <input
        key={size}
        defaultValue={fmtNum(size)}
        disabled={disabled}
        aria-label="Mărimea fontului în puncte"
        inputMode="decimal"
        className="h-full w-9 bg-transparent text-center text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:opacity-50"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply(e.currentTarget.value);
          } else if (e.key === "Escape") {
            e.currentTarget.value = fmtNum(size);
            editor.commands.focus();
          }
        }}
        onBlur={(e) => apply(e.currentTarget.value)}
      />
      <Tip label="Mărește fontul" keys="mod+shift+.">
        <Button variant="ghost" size="icon-xs" aria-label="Mărește fontul" disabled={disabled} onMouseDown={keepFocus} onClick={() => stepFontSize(editor, 1, defaultSize)}>
          <IconPlus />
        </Button>
      </Tip>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" className="me-0.5" aria-label="Mărimi presetate" disabled={disabled} />}>
          <IconChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent finalFocus={toEditor(editor)} className="max-h-72 min-w-20">
          <DropdownMenuRadioGroup value={String(size)} onValueChange={(v) => setFontSizePt(editor, Number(v))}>
            {FONT_SIZES.map((s) => (
              <DropdownMenuRadioItem key={s} value={String(s)} closeOnClick>
                {fmtNum(s)}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ───────────── Formatare ─────────────

const MARKS: { name: "bold" | "italic" | "underline" | "strike"; label: string; keys: string; icon: Icon }[] = [
  { name: "bold", label: "Aldin", keys: "mod+b", icon: IconBold },
  { name: "italic", label: "Cursiv", keys: "mod+i", icon: IconItalic },
  { name: "underline", label: "Subliniat", keys: "mod+u", icon: IconUnderline },
  { name: "strike", label: "Tăiat", keys: "mod+shift+x", icon: IconStrikethrough },
];

export function MarkToggles({ editor, disabled, showStrike }: ControlProps & { showStrike: boolean }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike") }),
  });
  return (
    <>
      {MARKS.filter((m) => showStrike || m.name !== "strike").map((m) => {
        const I = m.icon;
        return (
          <Tip key={m.name} label={m.label} keys={m.keys}>
            <Toggle
              size="sm"
              aria-label={m.label}
              pressed={s[m.name]}
              disabled={disabled}
              onMouseDown={keepFocus}
              onPressedChange={() => editor.chain().focus().toggleMark(m.name).run()}
            >
              <I />
            </Toggle>
          </Tip>
        );
      })}
    </>
  );
}

// ───────────── Culoare ─────────────

function Swatch({ color, label, onPick, active }: { color: string | null; label: string; onPick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onPick}
      className={cn(
        "relative size-6 rounded-md inset-ring-(length:--hairline) inset-ring-foreground/15 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring",
        active && "ring-2 ring-foreground/60 ring-offset-1 ring-offset-popover",
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {!color && <span aria-hidden className="absolute inset-1 rotate-45 border-t border-destructive" />}
    </button>
  );
}

export function TextColorPicker({ editor, disabled }: ControlProps) {
  const color = useEditorState({ editor, selector: ({ editor: e }) => (e.getAttributes("textStyle").color as string | undefined) ?? null });
  return (
    <Popover>
      <TooltipTrigger
        render={
          <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Culoarea textului" disabled={disabled} className="flex-col gap-0" />}>
            <span className="text-sm leading-none font-semibold">A</span>
            <span aria-hidden className="mt-0.5 h-1 w-4 rounded-full inset-ring-(length:--hairline) inset-ring-foreground/20" style={{ backgroundColor: color ?? "currentColor" }} />
          </PopoverTrigger>
        }
        content={<TipLabel label="Culoarea textului" />}
      />
      <PopoverContent className="w-auto" finalFocus={toEditor(editor)} align="start">
        <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Culori">
          {TEXT_COLORS.map((c) => (
            <Swatch key={c.value} color={c.value} label={c.label} active={color === c.value} onPick={() => editor.chain().focus().setColor(c.value).run()} />
          ))}
        </div>
        <Button variant="ghost" size="sm" className="justify-start" onClick={() => editor.chain().focus().unsetColor().run()}>
          <span aria-hidden className="size-3.5 rounded-sm bg-foreground" />
          Automat
        </Button>
      </PopoverContent>
    </Popover>
  );
}

export function HighlightPicker({ editor, disabled }: ControlProps) {
  const color = useEditorState({ editor, selector: ({ editor: e }) => (e.getAttributes("textStyle").backgroundColor as string | undefined) ?? null });
  return (
    <Popover>
      <TooltipTrigger
        render={
          <PopoverTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Evidențiere" disabled={disabled} className="flex-col gap-0" />}>
            <IconHighlight className="size-3.5!" />
            <span aria-hidden className="mt-0.5 h-1 w-4 rounded-full inset-ring-(length:--hairline) inset-ring-foreground/20" style={{ backgroundColor: color ?? "transparent" }} />
          </PopoverTrigger>
        }
        content={<TipLabel label="Evidențiere" keys="mod+shift+h" />}
      />
      <PopoverContent className="w-auto" finalFocus={toEditor(editor)} align="start">
        <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Culori de evidențiere">
          {HIGHLIGHT_COLORS.map((c) => (
            <Swatch key={c.value} color={c.value} label={c.label} active={color === c.value} onPick={() => editor.chain().focus().setBackgroundColor(c.value).run()} />
          ))}
        </div>
        <Button variant="ghost" size="sm" className="justify-start" onClick={() => editor.chain().focus().unsetBackgroundColor().run()}>
          <Swatch color={null} label="Fără" active={false} onPick={() => undefined} />
          Fără
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// ───────────── Paragraf ─────────────

export const ALIGNMENTS: { value: "left" | "center" | "right" | "justify"; label: string; keys: string; icon: Icon }[] = [
  { value: "left", label: "Stânga", keys: "mod+shift+l", icon: IconAlignLeft },
  { value: "center", label: "Centru", keys: "mod+shift+e", icon: IconAlignCenter },
  { value: "right", label: "Dreapta", keys: "mod+shift+r", icon: IconAlignRight },
  { value: "justify", label: "Stânga-dreapta", keys: "mod+shift+j", icon: IconAlignJustified },
];

export const currentAlign = (e: Editor) => ALIGNMENTS.find((a) => a.value !== "left" && e.isActive({ textAlign: a.value }))?.value ?? "left";

export function AlignMenu({ editor, disabled }: ControlProps) {
  const align = useEditorState({ editor, selector: ({ editor: e }) => currentAlign(e) });
  const I = ALIGNMENTS.find((a) => a.value === align)!.icon;
  return (
    <DropdownMenu>
      <TooltipTrigger
        render={
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="gap-0.5 px-1.5" aria-label="Aliniere" disabled={disabled} />}>
            <I />
            <IconChevronDown className="size-3! text-muted-foreground" />
          </DropdownMenuTrigger>
        }
        content={<TipLabel label="Aliniere" />}
      />
      <DropdownMenuContent finalFocus={toEditor(editor)}>
        <DropdownMenuRadioGroup value={align} onValueChange={(v) => editor.chain().focus().setTextAlign(String(v)).run()}>
          {ALIGNMENTS.map((a) => {
            const AI = a.icon;
            return (
              <DropdownMenuRadioItem key={a.value} value={a.value} closeOnClick>
                <AI />
                {a.label}
                <DropdownMenuShortcut>
                  <Kbd keys={a.keys} size="sm" variant="flat" />
                </DropdownMenuShortcut>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function IndentButtons({ editor, disabled }: ControlProps) {
  return (
    <>
      <Tip label="Micșorează indentarea" keys="mod+[">
        <Button variant="ghost" size="icon-sm" aria-label="Micșorează indentarea" disabled={disabled} onMouseDown={keepFocus} onClick={() => changeIndent(editor, -1)}>
          <IconIndentDecrease />
        </Button>
      </Tip>
      <Tip label="Mărește indentarea" keys="mod+]">
        <Button variant="ghost" size="icon-sm" aria-label="Mărește indentarea" disabled={disabled} onMouseDown={keepFocus} onClick={() => changeIndent(editor, 1)}>
          <IconIndentIncrease />
        </Button>
      </Tip>
    </>
  );
}

export function LineHeightMenu({ editor, disabled, defaultLineHeight, onCustom }: ControlProps & { defaultLineHeight: number; onCustom: () => void }) {
  const lh = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const a = e.isActive("heading") ? e.getAttributes("heading") : e.getAttributes("paragraph");
      return typeof a.lineHeight === "number" ? (a.lineHeight as number) : defaultLineHeight;
    },
  });
  const preset = LINE_HEIGHTS.includes(lh) ? String(lh) : "custom";
  return (
    <DropdownMenu>
      <TooltipTrigger
        render={
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Interlinie" disabled={disabled} />}>
            <IconLineHeight />
          </DropdownMenuTrigger>
        }
        content={<TipLabel label="Interlinie" />}
      />
      <DropdownMenuContent finalFocus={toEditor(editor)}>
        <DropdownMenuRadioGroup value={preset} onValueChange={(v) => v !== "custom" && setBlockAttrs(editor, { lineHeight: Number(v) === defaultLineHeight ? null : Number(v) })}>
          {LINE_HEIGHTS.map((v) => (
            <DropdownMenuRadioItem key={v} value={String(v)} closeOnClick>
              {fmtNum(v)}
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value="custom" closeOnClick onClick={onCustom}>
            Personalizat…{preset === "custom" && <span className="ms-auto text-xs text-muted-foreground">{fmtNum(lh)}</span>}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ───────────── Liste ─────────────

export function ListToggles({ editor, disabled }: ControlProps) {
  const s = useEditorState({ editor, selector: ({ editor: e }) => ({ bullet: e.isActive("bulletList"), ordered: e.isActive("orderedList") }) });
  return (
    <>
      <Tip label="Listă cu buline" keys="mod+shift+8">
        <Toggle size="sm" aria-label="Listă cu buline" pressed={s.bullet} disabled={disabled} onMouseDown={keepFocus} onPressedChange={() => editor.chain().focus().toggleBulletList().run()}>
          <IconList />
        </Toggle>
      </Tip>
      <Tip label="Listă numerotată" keys="mod+shift+7">
        <Toggle size="sm" aria-label="Listă numerotată" pressed={s.ordered} disabled={disabled} onMouseDown={keepFocus} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}>
          <IconListNumbers />
        </Toggle>
      </Tip>
    </>
  );
}

