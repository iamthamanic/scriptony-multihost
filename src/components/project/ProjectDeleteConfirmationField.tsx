/**
 * Delete confirmation for projects — typed "delete" (not account password).
 * Cloud project DELETE uses session JWT only; the backend does not verify a password.
 *
 * Location: src/components/project/ProjectDeleteConfirmationField.tsx
 */

import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE,
  isLocalDeleteConfirmationValid,
} from "@/lib/local-project-delete-confirmation";

interface ProjectDeleteConfirmationFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSubmit?: () => void;
}

export function ProjectDeleteConfirmationField({
  id,
  value,
  onChange,
  disabled,
  onSubmit,
}: ProjectDeleteConfirmationFieldProps) {
  return (
    <div
      className="pt-2 space-y-2"
      data-confirm-mode="delete-phrase"
      data-scriptony-delete-ui="v2"
    >
      <Label htmlFor={id} className="text-foreground">
        Zur Bestätigung das folgende Wort eingeben:
      </Label>
      <p className="text-xs font-mono rounded-md border bg-muted/50 px-2 py-1.5 text-foreground">
        {LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE}
      </p>
      <Input
        id={id}
        type="text"
        placeholder={LOCAL_PROJECT_DELETE_CONFIRMATION_PHRASE}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11"
        autoComplete="off"
        aria-invalid={
          !isLocalDeleteConfirmationValid(value) && Boolean(value.trim())
        }
        onKeyDown={(e) => {
          if (e.key === "Enter" && canSubmitDeleteConfirmation(value)) {
            onSubmit?.();
          }
        }}
        autoFocus
      />
    </div>
  );
}

export function canSubmitDeleteConfirmation(value: string): boolean {
  return isLocalDeleteConfirmationValid(value);
}
