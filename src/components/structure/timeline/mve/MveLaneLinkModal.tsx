/**
 * MVE Lane Link Modal — hierarchical Act/Sequence/Scene picker for default
 * text-block placement per character lane (T30).
 *
 * Location: src/components/structure/timeline/mve/MveLaneLinkModal.tsx
 */

import { Button } from "../../../ui/button";
import type { Act, Scene, Sequence } from "../../../../lib/types";
import { MveStructureScenePickerModal } from "./MveStructureScenePickerModal";

export interface MveLaneLinkModalProps {
  open: boolean;
  characterName: string;
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  selectedSceneId: string | null;
  onConfirm: (sceneId: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
  isBusy?: boolean;
}

export function MveLaneLinkModal({
  open,
  characterName,
  acts,
  sequences,
  scenes,
  selectedSceneId,
  onConfirm,
  onRemove,
  onCancel,
  isBusy,
}: MveLaneLinkModalProps) {
  return (
    <MveStructureScenePickerModal
      open={open}
      title={`Szene verknüpfen — ${characterName}`}
      description="Neue Text-Blöcke dieser Spur werden standardmäßig in der gewählten Szene angelegt."
      acts={acts}
      sequences={sequences}
      scenes={scenes}
      selectedSceneId={selectedSceneId}
      confirmLabel="Speichern"
      isBusy={isBusy}
      onCancel={onCancel}
      onConfirm={onConfirm}
      testId="mve-lane-link-modal"
      footerStart={
        onRemove && selectedSceneId ? (
          <Button
            type="button"
            variant="outline"
            disabled={isBusy}
            onClick={onRemove}
            data-testid="mve-lane-link-remove"
          >
            Verknüpfung entfernen
          </Button>
        ) : null
      }
    />
  );
}
