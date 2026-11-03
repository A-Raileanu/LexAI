import { Suspense } from "react";
import { SkipLink } from "@/components/app-shell/skip-link";
import { EditorSkeleton } from "@/features/editor/editor-skeleton";
import { connection } from "next/server";

/** Editorul se randează la fiecare cerere; până atunci se vede scheletul lui. */
async function Gate({ children }: { children: React.ReactNode }) {
  await connection();
  return children;
}

/** Editorul nu are bara globală: antetul lui (48 px) e singura bară, ca foaia să aibă tot spațiul. */
export default function EditorLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <Suspense fallback={<EditorSkeleton />}>
        <Gate>{children}</Gate>
      </Suspense>
    </>
  );
}
