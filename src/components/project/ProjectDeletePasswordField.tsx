/**
 * Cloud password confirmation for deleting a project with active cloud sync.
 * Location: src/components/project/ProjectDeletePasswordField.tsx
 */

import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface ProjectDeletePasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  onSubmit?: () => void;
}

export function ProjectDeletePasswordField({
  id,
  value,
  onChange,
  disabled,
  onSubmit,
}: ProjectDeletePasswordFieldProps) {
  return (
    <div className="pt-2 space-y-2" data-confirm-mode="cloud-password">
      <Label htmlFor={id} className="text-foreground">
        Cloud-Passwort zur Bestätigung:
      </Label>
      <p className="text-xs text-muted-foreground">
        Dieses Projekt ist mit der Scriptony Cloud synchronisiert. Gib dein
        Cloud-Kontopasswort ein (nicht das Wort „delete“).
      </p>
      <Input
        id={id}
        type="password"
        placeholder="Dein Cloud-Passwort"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11"
        autoComplete="current-password"
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSubmit?.();
          }
        }}
        autoFocus
      />
    </div>
  );
}

export function canSubmitDeletePassword(value: string): boolean {
  return value.trim().length > 0;
}
