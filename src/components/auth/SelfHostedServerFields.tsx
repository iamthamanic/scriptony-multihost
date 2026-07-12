/**
 * Self-hosted Appwrite server fields — shared by Settings (T41) and Cloud login modal.
 * Location: src/components/auth/SelfHostedServerFields.tsx
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SelfHostedServerFieldsValues {
  name: string;
  endpoint: string;
  projectId: string;
}

interface SelfHostedServerFieldsProps {
  idPrefix?: string;
  values: SelfHostedServerFieldsValues;
  onChange: (patch: Partial<SelfHostedServerFieldsValues>) => void;
  busy?: boolean;
  /** When true, name field is shown (optional label). Default true for Settings list labels. */
  showName?: boolean;
  onTest?: () => void;
  onSave?: () => void;
  saveLabel?: string;
}

export function SelfHostedServerFields({
  idPrefix = "sh",
  values,
  onChange,
  busy = false,
  showName = true,
  onTest,
  onSave,
  saveLabel = "Speichern",
}: SelfHostedServerFieldsProps) {
  return (
    <div className="space-y-4">
      {showName ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-name`}>Name (optional)</Label>
          <Input
            id={`${idPrefix}-name`}
            value={values.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Studio Appwrite"
            disabled={busy}
          />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-endpoint`}>Server-URL (Endpoint)</Label>
        <Input
          id={`${idPrefix}-endpoint`}
          value={values.endpoint}
          onChange={(e) => onChange({ endpoint: e.target.value })}
          placeholder="https://appwrite.example.com/v1"
          disabled={busy}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-project`}>Project ID</Label>
        <Input
          id={`${idPrefix}-project`}
          value={values.projectId}
          onChange={(e) => onChange({ projectId: e.target.value })}
          placeholder="69abc…"
          disabled={busy}
        />
      </div>
      {onTest || onSave ? (
        <div className="flex flex-wrap gap-2">
          {onTest ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onTest}
            >
              Verbindung testen
            </Button>
          ) : null}
          {onSave ? (
            <Button type="button" disabled={busy} onClick={onSave}>
              {saveLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
