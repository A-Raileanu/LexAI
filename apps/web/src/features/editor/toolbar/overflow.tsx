"use client";

import { IconClearFormatting, IconDots, IconPageBreak, IconReplace, IconSearch, IconTable } from "@tabler/icons-react";
import { useEditorState, type Editor } from "@tiptap/react";
import { Fragment } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Kbd } from "@/components/ui/kbd";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { changeIndent, setBlockAttrs } from "../schema/block-format";
import { FONT_SIZES, clearFormatting, parseFontSizePt, setFontSizePt, setParagraphStyle, stepFontSize, type ParagraphStyle } from "../schema/formatting";
import { insertPageBreak } from "../schema/page-break";
import { ALIGNMENTS, STYLE_KEYS, STYLE_LABELS, currentAlign, currentStyle } from "./controls";
import { HIGHLIGHT_COLORS, LINE_HEIGHTS, STANDARD_FONTS, TEXT_COLORS, TipLabel, firstFont, fmtNum, toEditor } from "./shared";

export type ControlKey = "style" | "font" | "strike" | "colors" | "align" | "indent" | "lineHeight" | "lists" | "table" | "pageBreak" | "field";

interface Props {
  editor: Editor;
  hidden: Set<ControlKey>;
  disabled?: boolean;
  defaultFont: string;
  defaultSize: number;
  defaultLineHeight: number;
  docFonts: string[];
  onFind: (replace: boolean) => void;
  onTableDialog: () => void;
  onFieldDialog: () => void;
  onLineHeightDialog: () => void;
}

const K = ({ keys }: { keys: string }) => (
  <DropdownMenuShortcut>
    <Kbd keys={keys} size="sm" variant="flat" />
  </DropdownMenuShortcut>
);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>{title}</DropdownMenuLabel>
      {children}
    </DropdownMenuGroup>
  );
}

/** „⋯ Mai multe”: grupurile care nu încap în bară, apoi acțiunile mereu ascunse. */
export function OverflowMenu(props: Props) {
  return (
    <DropdownMenu>
      <TooltipTrigger
        render={
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Mai multe" disabled={props.disabled} />}>
            <IconDots />
          </DropdownMenuTrigger>
        }
        content={<TipLabel label="Mai multe" />}
      />
      <DropdownMenuContent finalFocus={toEditor(props.editor)} className="max-h-[70vh] min-w-60">
        <OverflowItems {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OverflowItems({ editor, hidden, defaultFont, defaultSize, defaultLineHeight, docFonts, onFind, onTableDialog, onFieldDialog, onLineHeightDialog }: Props) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const ts = e.getAttributes("textStyle");
      const block = e.isActive("heading") ? e.getAttributes("heading") : e.getAttributes("paragraph");
      return {
        style: currentStyle(e),
        font: firstFont(ts.fontFamily) || defaultFont,
        size: parseFontSizePt(ts.fontSize) ?? defaultSize,
        color: (ts.color as string | undefined) ?? "",
        bg: (ts.backgroundColor as string | undefined) ?? "",
        strike: e.isActive("strike"),
        align: currentAlign(e),
        lh: typeof block.lineHeight === "number" ? String(block.lineHeight) : String(defaultLineHeight),
        bullet: e.isActive("bulletList"),
        ordered: e.isActive("orderedList"),
      };
    },
  });
  const fonts = [...new Set([defaultFont, ...docFonts, ...STANDARD_FONTS])];
  const sections: React.ReactNode[] = [];

  if (hidden.has("style"))
    sections.push(
      <Section key="style" title="Stil">
        <DropdownMenuRadioGroup value={s.style} onValueChange={(v) => setParagraphStyle(editor, v as ParagraphStyle)}>
          {(Object.keys(STYLE_LABELS) as ParagraphStyle[]).map((k) => (
            <DropdownMenuRadioItem key={k} value={k} closeOnClick>
              {STYLE_LABELS[k]}
              {STYLE_KEYS[k] && <K keys={STYLE_KEYS[k]} />}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </Section>,
    );

  if (hidden.has("font"))
    sections.push(
      <Section key="font" title="Font">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Familie: {s.font}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72">
            <DropdownMenuRadioGroup
              value={s.font}
              onValueChange={(v) => (v === defaultFont ? editor.chain().focus().unsetFontFamily().run() : editor.chain().focus().setFontFamily(String(v)).run())}
            >
              {fonts.map((f) => (
                <DropdownMenuRadioItem key={f} value={f} closeOnClick>
                  <span style={{ fontFamily: `"${f}", serif` }}>{f}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Mărime: {fmtNum(s.size)} pt</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72">
            <DropdownMenuRadioGroup value={String(s.size)} onValueChange={(v) => setFontSizePt(editor, Number(v))}>
              {FONT_SIZES.map((sz) => (
                <DropdownMenuRadioItem key={sz} value={String(sz)} closeOnClick>
                  {fmtNum(sz)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem closeOnClick={false} onClick={() => stepFontSize(editor, 1, defaultSize)}>
          Mărește fontul
          <K keys="mod+shift+." />
        </DropdownMenuItem>
        <DropdownMenuItem closeOnClick={false} onClick={() => stepFontSize(editor, -1, defaultSize)}>
          Micșorează fontul
          <K keys="mod+shift+," />
        </DropdownMenuItem>
      </Section>,
    );

  if (hidden.has("strike"))
    sections.push(
      <Section key="strike" title="Formatare">
        <DropdownMenuCheckboxItem checked={s.strike} onCheckedChange={() => editor.chain().focus().toggleStrike().run()}>
          Tăiat
          <K keys="mod+shift+x" />
        </DropdownMenuCheckboxItem>
      </Section>,
    );

  if (hidden.has("colors"))
    sections.push(
      <Section key="colors" title="Culoare">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Culoarea textului</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={s.color} onValueChange={(v) => (v ? editor.chain().focus().setColor(String(v)).run() : editor.chain().focus().unsetColor().run())}>
              <DropdownMenuRadioItem value="" closeOnClick>
                Automat
              </DropdownMenuRadioItem>
              {TEXT_COLORS.map((c) => (
                <DropdownMenuRadioItem key={c.value} value={c.value} closeOnClick>
                  <span aria-hidden className="size-3.5 rounded-sm" style={{ backgroundColor: c.value }} />
                  {c.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Evidențiere</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={s.bg}
              onValueChange={(v) => (v ? editor.chain().focus().setBackgroundColor(String(v)).run() : editor.chain().focus().unsetBackgroundColor().run())}
            >
              <DropdownMenuRadioItem value="" closeOnClick>
                Fără
              </DropdownMenuRadioItem>
              {HIGHLIGHT_COLORS.map((c) => (
                <DropdownMenuRadioItem key={c.value} value={c.value} closeOnClick>
                  <span aria-hidden className="size-3.5 rounded-sm" style={{ backgroundColor: c.value }} />
                  {c.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </Section>,
    );

  if (hidden.has("align") || hidden.has("indent") || hidden.has("lineHeight"))
    sections.push(
      <Section key="paragraph" title="Paragraf">
        {hidden.has("align") && (
          <DropdownMenuRadioGroup value={s.align} onValueChange={(v) => editor.chain().focus().setTextAlign(String(v)).run()}>
            {ALIGNMENTS.map((a) => {
              const I = a.icon;
              return (
                <DropdownMenuRadioItem key={a.value} value={a.value} closeOnClick>
                  <I />
                  {a.label}
                  <K keys={a.keys} />
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        )}
        {hidden.has("indent") && (
          <>
            <DropdownMenuItem closeOnClick={false} onClick={() => changeIndent(editor, -1)}>
              Micșorează indentarea
              <K keys="mod+[" />
            </DropdownMenuItem>
            <DropdownMenuItem closeOnClick={false} onClick={() => changeIndent(editor, 1)}>
              Mărește indentarea
              <K keys="mod+]" />
            </DropdownMenuItem>
          </>
        )}
        {hidden.has("lineHeight") && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Interlinie: {fmtNum(Number(s.lh))}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={s.lh}
                onValueChange={(v) => setBlockAttrs(editor, { lineHeight: Number(v) === defaultLineHeight ? null : Number(v) })}
              >
                {LINE_HEIGHTS.map((v) => (
                  <DropdownMenuRadioItem key={v} value={String(v)} closeOnClick>
                    {fmtNum(v)}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLineHeightDialog}>Personalizat…</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
      </Section>,
    );

  if (hidden.has("lists"))
    sections.push(
      <Section key="lists" title="Liste">
        <DropdownMenuCheckboxItem checked={s.bullet} onCheckedChange={() => editor.chain().focus().toggleBulletList().run()}>
          Listă cu buline
          <K keys="mod+shift+8" />
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={s.ordered} onCheckedChange={() => editor.chain().focus().toggleOrderedList().run()}>
          Listă numerotată
          <K keys="mod+shift+7" />
        </DropdownMenuCheckboxItem>
      </Section>,
    );

  if (hidden.has("table") || hidden.has("pageBreak") || hidden.has("field"))
    sections.push(
      <Section key="insert" title="Inserare">
        {hidden.has("table") && (
          <DropdownMenuItem onClick={onTableDialog}>
            <IconTable />
            Inserează tabel…
          </DropdownMenuItem>
        )}
        {hidden.has("pageBreak") && (
          <DropdownMenuItem onClick={() => insertPageBreak(editor)}>
            <IconPageBreak />
            Salt de pagină
            <K keys="mod+enter" />
          </DropdownMenuItem>
        )}
        {hidden.has("field") && (
          <DropdownMenuItem onClick={onFieldDialog}>
            <span aria-hidden className="w-4 text-center text-[0.625rem] font-semibold">
              [●]
            </span>
            Inserează câmp de completat…
            <K keys="mod+alt+p" />
          </DropdownMenuItem>
        )}
      </Section>,
    );

  return (
    <>
      {sections.map((sec, i) => (
        <Fragment key={i}>
          {sec}
          <DropdownMenuSeparator />
        </Fragment>
      ))}
      <DropdownMenuItem onClick={() => clearFormatting(editor)}>
        <IconClearFormatting />
        Șterge formatarea
        <K keys="mod+\" />
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onFind(false)}>
        <IconSearch />
        Caută
        <K keys="mod+f" />
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onFind(true)}>
        <IconReplace />
        Caută și înlocuiește
        <K keys="mod+alt+f" />
      </DropdownMenuItem>
    </>
  );
}
