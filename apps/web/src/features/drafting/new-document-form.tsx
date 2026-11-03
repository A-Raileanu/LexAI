"use client";

import { IconSparkles } from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createDocumentFromDescription } from "./actions";

/** Document nou: doar denumirea și descrierea; LexAI deduce restul și redactează. */
export function NewDocumentForm({ projectId, projectName, context }: { projectId: string; projectName: string; context: { fisiere: number; documente: number } }) {
  const hasContext = context.fisiere + context.documente > 0;
  const router = useRouter();
  const [titlu, setTitlu] = useState("");
  const [descriere, setDescriere] = useState("");
  const [useContext, setUseContext] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await createDocumentFromDescription(projectId, { titlu, descriere, context: hasContext && useContext });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push(`/proiecte/${projectId}/documente/${r.data.documentId}/generare`);
    });
  };

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Document nou</h1>
        <p className="mt-1 text-[15px] leading-6 text-muted-foreground">
          În proiectul „{projectName}”. Descrie documentul, iar LexAI îl redactează pe baza textului oficial al legii.
        </p>
      </div>

      <Field>
        <FieldLabel htmlFor="doc-titlu">Denumire</FieldLabel>
        <Input
          id="doc-titlu"
          autoFocus
          value={titlu}
          onChange={(e) => setTitlu(e.target.value)}
          placeholder="ex. Contract de închiriere apartament"
          maxLength={160}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="doc-descriere">Descriere</FieldLabel>
        <Textarea
          id="doc-descriere"
          minRows={7}
          value={descriere}
          onChange={(e) => setDescriere(e.target.value)}
          placeholder="ex. Închiriere pe 12 luni a unui apartament din Cluj-Napoca, str. Memorandumului nr. 5. Locator: Ion Popescu, persoană fizică. Locatar: Alfa SRL. Chirie 2.500 lei pe lună, plătită până la data de 5, garanție de două chirii. Clauze echilibrate pentru ambele părți."
          aria-invalid={Boolean(error)}
        />
        <FieldDescription>
          Scrie tipul documentului, părțile, elementele esențiale (obiect, preț, termene) și ce vrei să conțină. Ce nu reiese de nicăieri apare ca „[● …]”, de completat în editor.
        </FieldDescription>
        {error && <FieldError>{error}</FieldError>}
      </Field>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm font-medium has-disabled:opacity-60">
          <Checkbox checked={hasContext && useContext} disabled={!hasContext} onCheckedChange={(v) => setUseContext(Boolean(v))} />
          Folosește contextul proiectului
        </label>
        <p className="ps-6 text-sm text-muted-foreground">
          {!hasContext
            ? "Proiectul nu are încă fișiere în Context sau alte documente."
            : useContext
              ? `Datele din ${contextLabel(context)} (părți, dosar, fapte) sunt preluate automat.`
              : "Documentul se redactează doar din descriere, fără fișierele din Context și fără celelalte documente ale proiectului."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button type="submit" loading={pending} disabled={!titlu.trim() || descriere.trim().length < 15} className="bg-ai text-white hover:bg-ai/90">
          <IconSparkles /> Generează documentul
        </Button>
        <Button variant="ghost" nativeButton={false} render={<Link href={`/proiecte/${projectId}`} />}>
          Renunță
        </Button>
      </div>
    </form>
  );
}

/** „3 fișiere din Context și un document din proiect” */
function contextLabel({ fisiere, documente }: { fisiere: number; documente: number }): string {
  const parts = [
    fisiere ? (fisiere === 1 ? "fișierul din Context" : `cele ${fisiere} fișiere din Context`) : "",
    documente ? (documente === 1 ? "documentul din proiect" : `cele ${documente} documente din proiect`) : "",
  ].filter(Boolean);
  return parts.join(" și ");
}
