/**
 * AudioTimelineMveTextBlock — visual placeholder for an MVE line without audio.
 *
 * Renders as a scene-like colored block inside the audio dialog lane. It shows
 * the line text (or a placeholder) and can later be extended with inline editing,
 * tag highlighting, and an audio-generation menu (Issue T27).
 *
 * Location: src/components/audio/AudioTimelineMveTextBlock.tsx
 */

import { useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MVE_LINE_DRAG_MIME } from "@/hooks/useMveTextBlockLaneDrop";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import { MveTextBlockEditor } from "../structure/timeline/mve/MveTextBlockEditor";
import { MveSceneSelectDialog } from "../structure/timeline/mve/MveSceneSelectDialog";
import { useMveLineEnhance } from "@/hooks/useMveLineEnhance";
import { useMveTextBlockAudio } from "@/hooks/useMveTextBlockAudio";
import type { MveSceneOption } from "@/hooks/useMveTextBlockAudio";

export interface AudioTimelineMveTextBlockProps {
  line: MveLine;
  pxPerSec: number;
  viewStartSec: number;
  sceneStartSec: number;
  sceneEndSec: number;
  projectId?: string;
  sceneId?: string;
  characterId?: string;
  scenes?: MveSceneOption[];
  onSaveText?: (lineId: string, text: string) => Promise<void>;
  onBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
  onClick?: (lineId: string) => void;
  draggable?: boolean;
}

export function AudioTimelineMveTextBlock({
  line,
  pxPerSec,
  viewStartSec,
  sceneStartSec,
  sceneEndSec,
  projectId,
  sceneId,
  characterId,
  scenes = [],
  onSaveText,
  onBindAudioClip,
  onClick,
  draggable: draggableProp,
}: AudioTimelineMveTextBlockProps) {
  const widthSec = Math.max(sceneEndSec - sceneStartSec, 1);
  const [isEditing, setIsEditing] = useState(false);
  const { enhance } = useMveLineEnhance(projectId);
  const audioMenu = useMveTextBlockAudio({
    projectId,
    lineId: line.id,
    characterId,
    sceneId,
    scenes,
    text: line.text ?? "",
    onBindAudioClip,
  });

  const style = useMemo(
    () => ({
      left: `${(sceneStartSec - viewStartSec) * pxPerSec}px`,
      width: `${widthSec * pxPerSec}px`,
    }),
    [sceneStartSec, viewStartSec, pxPerSec, widthSec],
  );

  const displayText = line.text?.trim() || "Text hinzufügen…";
  const canEdit = Boolean(projectId && onSaveText);
  const canDrag = Boolean(draggableProp && !isEditing);

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!canDrag) return;
      e.dataTransfer.setData(MVE_LINE_DRAG_MIME, line.id);
      e.dataTransfer.effectAllowed = "move";
    },
    [canDrag, line.id],
  );

  const handleSave = useCallback(
    async (text: string) => {
      if (!onSaveText) {
        throw new Error("Kein Speicher-Handler für diesen Textblock.");
      }
      await onSaveText(line.id, text);
    },
    [line.id, onSaveText],
  );

  const handleEnhance = useCallback(
    async (rawText: string) => {
      return enhance(rawText);
    },
    [enhance],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isEditing) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (canEdit) {
        setIsEditing(true);
      }
      onClick?.(line.id);
    }
  };

  return (
    <div
      role={isEditing ? "none" : canDrag ? "button" : "button"}
      tabIndex={isEditing ? -1 : 0}
      draggable={canDrag}
      onDragStart={handleDragStart}
      aria-label={isEditing ? undefined : `Textblock: ${displayText}`}
      className={cn(
        "absolute top-0.5 bottom-0.5 rounded border border-primary/40",
        "bg-primary/20 hover:bg-primary/30 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "flex items-start px-1 overflow-hidden",
        canEdit ? "cursor-pointer" : "cursor-default",
        canDrag && "cursor-grab active:cursor-grabbing",
        line.status === "dirty" && "ring-1 ring-warning/50",
      )}
      style={style}
      onClick={() => {
        if (!isEditing) {
          if (canEdit) {
            setIsEditing(true);
          }
          onClick?.(line.id);
        }
      }}
      onKeyDown={handleKeyDown}
      data-testid="audio-timeline-mve-text-block"
      data-mve-line-id={line.id}
    >
      {isEditing ? (
        <div
          role="application"
          aria-label="Textblock bearbeiten"
          className="w-full z-20 py-0.5"
          onClick={(e) => e.stopPropagation()}
          data-testid="mve-text-block-inline-editor"
        >
          <MveTextBlockEditor
            initialText={line.text ?? ""}
            onSave={handleSave}
            onEnhance={handleEnhance}
            onClose={() => setIsEditing(false)}
            audioMenu={audioMenu}
            scenes={scenes}
            sceneId={sceneId}
          />
        </div>
      ) : (
        <span
          className={cn(
            "truncate text-[10px] font-medium text-foreground",
            !line.text?.trim() && "italic opacity-70",
          )}
          title={displayText}
        >
          {displayText}
        </span>
      )}
      <MveSceneSelectDialog
        open={audioMenu.pendingAction !== null}
        title={
          audioMenu.pendingAction === "generate"
            ? "Szene für Generate auswählen"
            : audioMenu.pendingAction === "record"
              ? "Szene für Aufnahme auswählen"
              : "Szene für Upload auswählen"
        }
        scenes={scenes}
        selectedId={audioMenu.selectedSceneId}
        onSelect={audioMenu.setSelectedSceneId}
        onConfirm={() => {
          audioMenu.confirmSceneSelection();
        }}
        onCancel={audioMenu.cancelSceneSelection}
      />
    </div>
  );
}
