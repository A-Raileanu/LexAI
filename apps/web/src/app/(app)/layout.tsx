import { Suspense } from "react";
import { CommandPalette } from "@/components/app-shell/command-palette";
import { connection } from "next/server";

/** Paleta ⌘K (cu secvențele G P / G U / G S), randată la cerere (citește date). */
async function Palette() {
  await connection();
  return <CommandPalette />;
}

/**
 * Comun tuturor rutelor aplicației: paleta ⌘K și înălțimea barei globale (`--app-bar-h`).
 * Bara în sine trăiește în `(pagini)`; editorul din `(editor)` are doar antetul propriu (docs/ux/17).
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="contents [--app-bar-h:3rem]">
      {children}
      <Suspense fallback={null}>
        <Palette />
      </Suspense>
    </div>
  );
}
