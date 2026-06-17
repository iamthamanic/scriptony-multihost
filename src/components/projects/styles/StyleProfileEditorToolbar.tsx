/**
 * Editor toolbar: back, title, dirty save/discard actions.
 * Location: src/components/projects/styles/StyleProfileEditorToolbar.tsx
 */

import { ArrowLeft, Save, Undo2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";

interface StyleProfileEditorToolbarProps {
  name: string;
  isActive?: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onBack: () => void;
  onDiscard: () => void;
  onSave: () => void;
}

export function StyleProfileEditorToolbar({
  name,
  isActive,
  isDirty,
  isSaving,
  onBack,
  onDiscard,
  onSave,
}: StyleProfileEditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4 mr-1" />
        Zur Liste
      </Button>
      <h2 className="text-xl font-semibold flex-1">{name}</h2>
      {isActive && (
        <Badge className="bg-primary text-primary-foreground">Aktiv</Badge>
      )}
      {isDirty && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onDiscard}>
            <Undo2 className="size-4 mr-1" />
            Verwerfen
          </Button>
          <Button size="sm" disabled={isSaving} onClick={() => void onSave()}>
            <Save className="size-4 mr-1" />
            Speichern
          </Button>
        </div>
      )}
    </div>
  );
}
