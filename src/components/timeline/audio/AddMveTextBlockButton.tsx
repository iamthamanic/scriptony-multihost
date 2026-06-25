/**
 * AddMveTextBlockButton — plus button for dialog lanes that creates a text-first MVE line.
 *
 * Character lanes get "Text hinzufügen"; SFX/Music/Atmo lanes keep the legacy
 * AddAudioTimelineMenu. The button resolves a target scene via the lane link
 * (Issue T25) or falls back to the first visible scene when no link is set.
 *
 * Location: src/components/timeline/audio/AddMveTextBlockButton.tsx
 */

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { cn } from "../../../lib/utils";
import { isCharacterDialogLane } from "../../../lib/character-lane-map";
import type { Character } from "../../../lib/types";
import type { TimelineSceneRef } from "../../../lib/timeline-add-audio";

export interface AddMveTextBlockButtonProps {
  laneIndex: number;
  character?: Character;
  disabled?: boolean;
  scenes?: TimelineSceneRef[];
  /** Resolved lane-link target container id, if any. */
  linkedSceneId?: string;
  onAddTextBlock: (payload: {
    characterId: string;
    sceneId: string;
  }) => Promise<void> | void;
}

export function AddMveTextBlockButton({
  laneIndex,
  character,
  disabled,
  scenes,
  linkedSceneId,
  onAddTextBlock,
}: AddMveTextBlockButtonProps) {
  const handleClick = useCallback(async () => {
    if (!character?.id) return;
    const sceneId = linkedSceneId ?? scenes?.[0]?.id;
    if (!sceneId) return;
    await onAddTextBlock({ characterId: character.id, sceneId });
  }, [character, linkedSceneId, scenes, onAddTextBlock]);

  const isDialog = isCharacterDialogLane(laneIndex);
  if (!isDialog || !character) return null;

  return (
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
  );
}
