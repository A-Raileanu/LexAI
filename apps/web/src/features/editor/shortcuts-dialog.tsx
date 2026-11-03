"use client";

import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Document",
    items: [
      ["Salvează versiunea", "mod+s"],
      ["Analizează documentul", "mod+shift+a"],
      ["Opțiuni de export", "mod+shift+e"],
      ["Printează", "mod+p"],
      ["Deschide istoricul", "mod+shift+y"],
      ["Afișează / ascunde panoul", "mod+."],
      ["Chat: cere o modificare", "mod+j"],
      ["Caută", "mod+f"],
      ["Caută și înlocuiește", "mod+alt+f"],
      ["Lista de scurtături", "mod+/"],
    ],
  },
  {
    title: "Formatare",
    items: [
      ["Aldin", "mod+b"],
      ["Cursiv", "mod+i"],
      ["Subliniat", "mod+u"],
      ["Tăiat", "mod+shift+x"],
      ["Evidențiere", "mod+shift+h"],
      ["Micșorează / mărește fontul", "mod+shift+,"],
      ["Șterge formatarea", "mod+\\"],
      ["Normal", "mod+alt+0"],
      ["Titlu 1 / 2 / 3", "mod+alt+1"],
    ],
  },
  {
    title: "Paragraf și inserare",
    items: [
      ["Aliniere stânga / centru", "mod+shift+l"],
      ["Aliniere dreapta / stânga-dreapta", "mod+shift+r"],
      ["Micșorează indentarea", "mod+["],
      ["Mărește indentarea", "mod+]"],
      ["Listă cu buline", "mod+shift+8"],
      ["Listă numerotată", "mod+shift+7"],
      ["Salt de pagină", "mod+enter"],
      ["Inserează câmp de completat", "mod+alt+p"],
    ],
  },
  {
    title: "Câmpuri și sugestii",
    items: [
      ["Câmpul următor / anterior", "mod+alt+arrowdown"],
      ["Sugestia următoare / anterioară", "mod+alt+]"],
      ["Acceptă sugestia curentă", "mod+alt+y"],
      ["Respinge sugestia curentă", "mod+alt+n"],
      ["În tabel: rând deasupra / dedesubt", "mod+alt+arrowup"],
    ],
  },
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Scurtături de tastatură</DialogTitle>
          <DialogDescription>Pe Windows și Linux, ⌘ înseamnă Ctrl, iar ⌥ înseamnă Alt.</DialogDescription>
        </DialogHeader>
        <DialogBody className="grid gap-6 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{g.title}</h3>
              <dl className="flex flex-col gap-1.5 text-sm">
                {g.items.map(([label, keys]) => (
                  <div key={label} className="flex items-center justify-between gap-3">
                    <dt>{label}</dt>
                    <dd>
                      <Kbd keys={keys} size="sm" />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
