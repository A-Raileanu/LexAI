"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { createProject } from "./actions";

/** Dialogul „Proiect nou”; după creare deschide proiectul (sau `then`, dacă e dat). */
export function NewProjectDialog({
  open,
  onOpenChange,
  clients,
  then,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  clients: string[];
  then?: "incarca" | "nou";
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const res = await createProject({ name, client, description });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      toast.success("Proiect creat");
      onOpenChange(false);
      setName("");
      setClient("");
      setDescription("");
      const base = `/proiecte/${res.data.id}`;
      router.push(then === "nou" ? `${base}/nou` : then === "incarca" ? `${base}?incarca=1` : base);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Proiect nou</DialogTitle>
            <DialogDescription>Un proiect grupează documentele, analizele și versiunile unei cauze sau ale unui client.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="p-name">Nume proiect</FieldLabel>
              <Input id="p-name" autoFocus value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="ex. Litigiu creanță Ionescu" aria-invalid={Boolean(error)} />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor="p-client">Client <span className="font-normal text-muted-foreground">(opțional)</span></FieldLabel>
              <Input id="p-client" list="p-clients" value={client} onChange={(e) => setClient(e.target.value)} placeholder="ex. Ionescu SRL" />
              <datalist id="p-clients">
                {clients.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field>
              <FieldLabel htmlFor="p-desc">Descriere <span className="font-normal text-muted-foreground">(opțional)</span></FieldLabel>
              <Textarea id="p-desc" minRows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Renunță
            </Button>
            <Button type="submit" loading={pending} disabled={!name.trim()}>
              Creează proiectul
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
