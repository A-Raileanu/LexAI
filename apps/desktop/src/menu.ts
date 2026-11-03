import { BrowserWindow, clipboard, Menu, type MenuItemConstructorOptions, type WebContents } from "electron";

/**
 * Meniul aplicației, în română. Rutele aplicației se deschid în fereastra activă. Pe Windows
 * nu există meniul „LexAI”: Setări și Ieșire trec în „Fișier”, Despre în „Ajutor”.
 */

const isMac = process.platform === "darwin";

export interface MenuActions {
  dev: boolean;
  navigate: (route: string) => void;
  openLogs: () => void;
  openData: () => void;
  checkUpdates: () => void;
}

export function buildMenu(a: MenuActions): Menu {
  const appMenu: MenuItemConstructorOptions[] = [
    {
      label: "LexAI",
      submenu: [
        { role: "about", label: "Despre LexAI" },
        { label: "Caută actualizări…", click: a.checkUpdates },
        { type: "separator" },
        { label: "Setări…", accelerator: "CmdOrCtrl+,", click: () => a.navigate("/setari") },
        { type: "separator" },
        { role: "services", label: "Servicii" },
        { type: "separator" },
        { role: "hide", label: "Ascunde LexAI" },
        { role: "hideOthers", label: "Ascunde celelalte" },
        { role: "unhide", label: "Arată tot" },
        { type: "separator" },
        { role: "quit", label: "Ieși din LexAI" },
      ],
    },
  ];
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? appMenu : []),
    {
      label: "Fișier",
      submenu: [
        { label: "Proiecte", accelerator: "CmdOrCtrl+Shift+P", click: () => a.navigate("/") },
        ...(isMac ? [] : ([{ label: "Setări", accelerator: "Ctrl+,", click: () => a.navigate("/setari") }] satisfies MenuItemConstructorOptions[])),
        { type: "separator" },
        { role: "close", label: "Închide fereastra" },
        ...(isMac ? [] : ([{ type: "separator" }, { role: "quit", label: "Ieșire" }] satisfies MenuItemConstructorOptions[])),
      ],
    },
    {
      label: "Editare",
      submenu: [
        { role: "undo", label: "Anulează" },
        { role: "redo", label: "Refă" },
        { type: "separator" },
        { role: "cut", label: "Taie" },
        { role: "copy", label: "Copiază" },
        { role: "paste", label: "Lipește" },
        { role: "pasteAndMatchStyle", label: "Lipește fără formatare" },
        { role: "delete", label: "Șterge" },
        { role: "selectAll", label: "Selectează tot" },
        ...(isMac
          ? ([
              { type: "separator" },
              {
                label: "Vorbire",
                submenu: [
                  { role: "startSpeaking", label: "Începe citirea" },
                  { role: "stopSpeaking", label: "Oprește citirea" },
                ],
              },
            ] satisfies MenuItemConstructorOptions[])
          : []),
      ],
    },
    {
      label: "Vizualizare",
      submenu: [
        { role: "reload", label: "Reîncarcă" },
        ...(a.dev
          ? ([
              { role: "forceReload", label: "Reîncarcă forțat" },
              { role: "toggleDevTools", label: "Instrumente pentru dezvoltatori" },
            ] satisfies MenuItemConstructorOptions[])
          : []),
        { type: "separator" },
        { role: "resetZoom", label: "Mărime reală" },
        { role: "zoomIn", label: "Mărește" },
        { role: "zoomOut", label: "Micșorează" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Ecran complet" },
      ],
    },
    {
      label: "Navigare",
      submenu: [
        { label: "Înapoi", accelerator: "CmdOrCtrl+[", click: (_i, w) => w instanceof BrowserWindow && w.webContents.navigationHistory.goBack() },
        { label: "Înainte", accelerator: "CmdOrCtrl+]", click: (_i, w) => w instanceof BrowserWindow && w.webContents.navigationHistory.goForward() },
        { type: "separator" },
        { label: "Proiecte", click: () => a.navigate("/") },
        { label: "Utilizare", click: () => a.navigate("/utilizare") },
        { label: "Setări", click: () => a.navigate("/setari") },
        { label: "Terminal Claude", click: () => a.navigate("/setari/terminal") },
      ],
    },
    {
      role: "windowMenu",
      label: "Fereastră",
      submenu: [
        { role: "minimize", label: "Minimizează" },
        ...(isMac
          ? ([
              { role: "zoom", label: "Redimensionează" },
              { type: "separator" },
              { role: "front", label: "Adu totul în față" },
            ] satisfies MenuItemConstructorOptions[])
          : []),
      ],
    },
    {
      role: "help",
      label: "Ajutor",
      submenu: [
        { label: "Deschide jurnalele", click: a.openLogs },
        { label: "Deschide dosarul de date", click: a.openData },
        ...(isMac
          ? []
          : ([{ type: "separator" }, { label: "Caută actualizări…", click: a.checkUpdates }, { role: "about", label: "Despre LexAI" }] satisfies MenuItemConstructorOptions[])),
      ],
    },
  ];
  return Menu.buildFromTemplate(template);
}

/** Meniul contextual (clic dreapta): corectură, editare, legături. */
export function contextMenu(wc: WebContents, p: Electron.ContextMenuParams, dev: boolean): Menu | null {
  const items: MenuItemConstructorOptions[] = [];
  if (p.misspelledWord) {
    for (const s of p.dictionarySuggestions.slice(0, 5)) items.push({ label: s, click: () => wc.replaceMisspelling(s) });
    if (!p.dictionarySuggestions.length) items.push({ label: "Nicio sugestie", enabled: false });
    items.push({ label: "Adaugă în dicționar", click: () => wc.session.addWordToSpellCheckerDictionary(p.misspelledWord) }, { type: "separator" });
  }
  if (p.linkURL && /^https?:/.test(p.linkURL)) items.push({ label: "Copiază adresa legăturii", click: () => clipboard.writeText(p.linkURL) }, { type: "separator" });
  const f = p.editFlags;
  if (p.isEditable) {
    items.push(
      { role: "cut", label: "Taie", enabled: f.canCut },
      { role: "copy", label: "Copiază", enabled: f.canCopy },
      { role: "paste", label: "Lipește", enabled: f.canPaste },
      { role: "pasteAndMatchStyle", label: "Lipește fără formatare", enabled: f.canPaste },
      { type: "separator" },
      { role: "selectAll", label: "Selectează tot", enabled: f.canSelectAll },
    );
  } else if (p.selectionText.trim()) {
    items.push({ role: "copy", label: "Copiază", enabled: f.canCopy });
  }
  if (dev) items.push({ type: "separator" }, { label: "Inspectează", click: () => wc.inspectElement(p.x, p.y) });
  while (items.at(-1)?.type === "separator") items.pop();
  return items.length ? Menu.buildFromTemplate(items) : null;
}
