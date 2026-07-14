/**
 * AddMveTextBlockButton — plus button for dialog lanes that creates a text-first MVE line.
 *
 * Character lanes get "Text hinzufügen"; SFX/Music/Atmo lanes keep the legacy
 * AddAudioTimelineMenu. With a lane link the target scene is used immediately;
 * without a link the user picks a scene in the hierarchical structure picker.
 *
 * Location: src/components/timeline/audio/AddMveTextBlockButton.tsx
 */

import { useCallback, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "../../../lib/utils";
import { isCharacterDialogLane } from "../../../lib/character-lane-map";
import type { Character } from "../../../lib/types";
import {
  MveStructureScenePickerModal,
  type MveStructurePickerRefs,
} from "../../structure/timeline/mve/MveStructureScenePickerModal";
import { buildStructurePickerTree } from "../../../lib/mve/structure-picker-tree";

export interface AddMveTextBlockButtonProps {
  laneIndex: number;
  character?: Character;
  disabled?: boolean;
  structurePicker?: MveStructurePickerRefs;
  /** Resolved lane-link target container id, if any. */
  linkedSceneId?: string;
  onAddTextBlock: (payload: {
    characterId: string;
    sceneId: string;
  }) => Promise<void> | void;
}

function firstSceneIdInTree(picker?: MveStructurePickerRefs): string | null {
  if (!picker) return null;
  const tree = buildStructurePickerTree(
    picker.acts,
    picker.sequences,
    picker.scenes,
  );
  for (const act of tree) {
    for (const seq of act.sequences) {
      if (seq.scenes[0]) return seq.scenes[0].id;
    }
  }
  return null;
}

export function AddMveTextBlockButton({
  laneIndex,
  character,
  disabled,
  structurePicker,
  linkedSceneId,
  onAddTextBlock,
}: AddMveTextBlockButtonProps) {
  const [sceneDialogOpen, setSceneDialogOpen] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const hasStructure = Boolean(structurePicker?.scenes.length);

  const defaultSceneId = useMemo(
    () => firstSceneIdInTree(structurePicker),
    [structurePicker],
  );

  const addTextBlock = useCallback(
    async (sceneId: string) => {
      if (!character?.id) return;
      await onAddTextBlock({ characterId: character.id, sceneId });
    },
    [character, onAddTextBlock],
  );

  const handleClick = useCallback(() => {
    if (!character?.id) return;
    if (linkedSceneId) {
      void addTextBlock(linkedSceneId);
      return;
    }
    if (!hasStructure) return;
    setSelectedSceneId(defaultSceneId);
    setSceneDialogOpen(true);
  }, [character, linkedSceneId, hasStructure, defaultSceneId, addTextBlock]);

  const handleConfirmScene = useCallback(
    (sceneId: string) => {
      setSceneDialogOpen(false);
      void addTextBlock(sceneId);
    },
    [addTextBlock],
  );

  const handleCancelScene = useCallback(() => {
    setSceneDialogOpen(false);
    setSelectedSceneId(null);
  }, []);

  const isDialog = isCharacterDialogLane(laneIndex);
  if (!isDialog || !character) return null;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        aria-label="Text hinzufügen"
        title="Text hinzufügen"
        onClick={() => void handleClick()}
        className={cn(
          "h-5 w-5 shrink-0 text-[9px] font-bold rounded border",
          "inline-flex items-center justify-center transition-colors",
          "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          "border-primary/80 bg-primary text-white hover:bg-primary/90",
        )}
      >
        <Plus className="size-3" aria-hidden />
      </button>
      {structurePicker ? (
        <MveStructureScenePickerModal
          open={sceneDialogOpen}
          title="Szene für Textblock auswählen"
          acts={structurePicker.acts}
          sequences={structurePicker.sequences}
          scenes={structurePicker.scenes}
          selectedSceneId={selectedSceneId}
          onConfirm={handleConfirmScene}
          onCancel={handleCancelScene}
        />
      ) : null}
    </>
  );
}
