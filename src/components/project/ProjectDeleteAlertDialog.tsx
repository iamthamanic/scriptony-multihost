/**
 * Shared delete-project confirmation dialog (phrase vs cloud password).
 * Location: src/components/project/ProjectDeleteAlertDialog.tsx
 */

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  getProjectDeleteConfirmationMode,
  type ProjectDeletePolicyInput,
} from "@/lib/project-delete-policy";
import {
  canSubmitDeleteConfirmation,
  ProjectDeleteConfirmationField,
} from "./ProjectDeleteConfirmationField";
import {
  canSubmitDeletePassword,
  ProjectDeletePasswordField,
} from "./ProjectDeletePasswordField";

interface ProjectDeleteAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDeletePolicyInput | null | undefined;
  projectTitle?: string;
  confirmValue: string;
  onConfirmValueChange: (value: string) => void;
  loading: boolean;
  onConfirm: () => void;
  /** Prefix for input ids (list vs detail). */
  fieldIdPrefix?: string;
}

export function ProjectDeleteAlertDialog({
  open,
  onOpenChange,
  project,
  projectTitle,
  confirmValue,
  onConfirmValueChange,
  loading,
  onConfirm,
  fieldIdPrefix = "delete-project",
}: ProjectDeleteAlertDialogProps) {
  const mode = getProjectDeleteConfirmationMode(project);
  const canSubmit =
    mode === "password"
      ? canSubmitDeletePassword(confirmValue)
      : canSubmitDeleteConfirmation(confirmValue);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onConfirmValueChange("");
    }
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="size-5 text-red-500" />
            </div>
            <AlertDialogTitle>Projekt wirklich löschen?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Diese Aktion kann <strong>nicht rückgängig</strong> gemacht
                werden.
                {projectTitle ? (
                  <>
                    {" "}
                    Das Projekt <strong>&quot;{projectTitle}&quot;</strong> wird
                    permanent gelöscht,
                  </>
                ) : (
                  " Das Projekt wird permanent gelöscht,"
                )}{" "}
                inklusive aller:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Szenen, Acts, Sequenzen</li>
                <li>Charaktere</li>
                <li>Shots & Timeline Nodes</li>
                <li>Projekt-Einstellungen</li>
              </ul>
              {mode === "password" ? (
                <ProjectDeletePasswordField
                  id={`${fieldIdPrefix}-password`}
                  value={confirmValue}
                  onChange={onConfirmValueChange}
                  disabled={loading}
                  onSubmit={onConfirm}
                />
              ) : (
                <ProjectDeleteConfirmationField
                  id={`${fieldIdPrefix}-phrase`}
                  value={confirmValue}
                  onChange={onConfirmValueChange}
                  disabled={loading}
                  onSubmit={onConfirm}
                />
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Abbrechen</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading || !canSubmit}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Wird gelöscht...
              </>
            ) : (
              <>
                <Trash2 className="size-4 mr-2" />
                Projekt löschen
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
