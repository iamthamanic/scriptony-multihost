/**
 * MveDialogClipHost — shared inline card + enhance/audio hooks + scene picker modal.
 * Used by text-only blocks and audio-bound dialog segments (Slice 3).
 *
 * Location: src/components/structure/timeline/mve/MveDialogClipHost.tsx
 */

import { useCallback } from "react";
import type { ReactNode } from "react";
import { MveDialogClipCard } from "./MveDialogClipCard";
import { MveStructureScenePickerModal } from "./MveStructureScenePickerModal";
import type { MveStructurePickerRefs } from "./MveStructureScenePickerModal";
import { useMveLineEnhance } from "@/hooks/useMveLineEnhance";
import { useMveTextBlockAudio } from "@/hooks/useMveTextBlockAudio";
import type { MveSceneOption } from "@/hooks/useMveTextBlockAudio";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import type { Character } from "@/lib/types";

export interface MveDialogClipHostProps {
  line: MveLine;
  clipWidthPx: number;
  /** Absolute timeline start for clip shell placement (from visual span). */
  timelineStartSec?: number;
  projectId: string;
  projectType?: string;
  sceneId?: string;
  sceneLabel?: string;
  character?: Character;
  scenes?: MveSceneOption[];
  structurePicker?: MveStructurePickerRefs;
  waveformData?: number[];
  /** Bound audio clip length in seconds (footer chip). */
  audioDurationSec?: number;
  headerAddon?: ReactNode;
  renderBlockReason?: string;
  onRenderLine?: (lineId: string) => Promise<unknown>;
  isRendering?: boolean;
  onSaveText: (lineId: string, text: string) => Promise<void>;
  onSaveDirection?: (
    lineId: string,
    direction: MveLineDirection,
  ) => Promise<void>;
  onBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
  onDeleteLine?: (lineId: string) => Promise<void>;
  onDraftTextChange?: (text: string) => void;
  readingSpeedWpm?: number;
  onTextareaFocusChange?: (focused: boolean) => void;
}

export function MveDialogClipHost({
  line,
  clipWidthPx,
  timelineStartSec,
  projectId,
  projectType,
  sceneId,
  sceneLabel,
  character,
  scenes = [],
  structurePicker,
  waveformData,
  audioDurationSec,
  headerAddon,
  renderBlockReason,
  onRenderLine,
  isRendering,
  onSaveText,
  onSaveDirection,
  onBindAudioClip,
  onDeleteLine,
  onDraftTextChange,
  readingSpeedWpm,
  onTextareaFocusChange,
}: MveDialogClipHostProps) {
  const { enhance } = useMveLineEnhance(projectId);
  const audioMenu = useMveTextBlockAudio({
    projectId,
    projectType,
    lineId: line.id,
    characterId: character?.id ?? line.characterId,
    sceneId,
    scenes,
    text: line.text ?? "",
    timelineStartSec,
    onBindAudioClip,
  });

  const handleSave = useCallback(
    async (text: string) => onSaveText(line.id, text),
    [line.id, onSaveText],
  );

  const handleEnhance = useCallback(
    async (rawText: string) => enhance(rawText),
    [enhance],
  );

  const handleSaveDirection = useCallback(
    async (direction: MveLineDirection) => {
      if (!onSaveDirection) return;
      await onSaveDirection(line.id, direction);
    },
    [line.id, onSaveDirection],
  );

  const handleDeleteLine = useCallback(async () => {
    if (!onDeleteLine) return;
    await onDeleteLine(line.id);
  }, [line.id, onDeleteLine]);

  return (
    <>
      <MveDialogClipCard
        line={line}
        clipWidthPx={clipWidthPx}
        sceneLabel={sceneLabel}
        character={character}
        sceneId={sceneId}
        waveformData={waveformData}
        audioDurationSec={audioDurationSec}
        headerAddon={headerAddon}
        projectId={projectId}
        renderBlockReason={renderBlockReason}
        onRenderLine={onRenderLine}
        isRendering={isRendering}
        onSaveText={handleSave}
        onEnhance={handleEnhance}
        onSaveDirection={onSaveDirection ? handleSaveDirection : undefined}
        onDeleteLine={onDeleteLine ? handleDeleteLine : undefined}
        onDraftTextChange={onDraftTextChange}
        readingSpeedWpm={readingSpeedWpm}
        onTextareaFocusChange={onTextareaFocusChange}
        audioMenu={audioMenu}
      />
      {structurePicker ? (
        <MveStructureScenePickerModal
          open={audioMenu.pendingAction !== null}
          title={
            audioMenu.pendingAction === "generate"
              ? "Szene für Generate auswählen"
              : audioMenu.pendingAction === "record"
                ? "Szene für Aufnahme auswählen"
                : "Szene für Upload auswählen"
          }
          acts={structurePicker.acts}
          sequences={structurePicker.sequences}
          scenes={structurePicker.scenes}
          selectedSceneId={audioMenu.selectedSceneId}
          onConfirm={(pickedSceneId) => {
            audioMenu.confirmSceneSelection(pickedSceneId);
          }}
          onCancel={audioMenu.cancelSceneSelection}
        />
      ) : null}
    </>
  );
}
