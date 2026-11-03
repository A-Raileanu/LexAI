"use client";

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
import { toast } from "@/components/ui/toast";
import { deleteProject } from "./actions";

/**
 * Confirmarea ștergerii definitive a unui proiect arhivat. Ștergerea nu poate fi anulată, deci
 * dialogul spune exact ce dispare; consumul AI rămâne în „Utilizare”.
 */
export function DeleteProjectDialog({
  project,
  onOpenChange,
  onDeleted,
}: {
  project: { id: string; name: string; documente?: number } | null;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const docs = project?.documente;
  const what = docs === undefined ? "toate documentele lui" : docs === 0 ? "proiectul (nu are documente)" : docs === 1 ? "documentul lui" : `cele ${docs} documente ale lui`;

  const remove = async () => {
    if (!project) return;
    const res = await deleteProject(project.id);
    if (!res.ok) {
      toast.error("Proiectul nu a fost șters.", { description: res.error });
      return;
    }
    toast.success(`„${project.name}” a fost șters definitiv.`);
    onOpenChange(false);
    onDeleted();
  };

  return (
    <AlertDialog open={Boolean(project)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ștergi definitiv „{project?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            Se șterg {what}, cu versiunile, analizele și fișierele încărcate. Acțiunea nu poate fi anulată. Consumul AI rămâne în „Utilizare”.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Renunță</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remove}>
            Șterge definitiv
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
