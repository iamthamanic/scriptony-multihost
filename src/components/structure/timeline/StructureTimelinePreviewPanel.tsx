/**
 * Structure timeline preview — book text, film/audio image, and playback controls (Epic T55d).
 * Film/Audio: centered player (max width), empty margin left/right for future UI.
 * Location: src/components/structure/timeline/StructureTimelinePreviewPanel.tsx
 */

import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Camera,
  Loader2,
} from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import { TimelineTextPreview } from "../../timeline/TimelineTextPreview";
import { ResolvedProjectAssetImage } from "../../timeline/ResolvedProjectAssetImage";

/** Centered player width — not full-bleed; margins stay free left/right. */
export const STRUCTURE_TIMELINE_PREVIEW_PLAYER_MAX_PX = 420;

export interface StructureTimelinePreviewPanelProps {
  isBookProject: boolean;
  isAudioProject: boolean;
  isFilmProject: boolean;
  previewAreaTitle: string;
  wordsArray: string[];
  currentWordIndex: number;
  currentSceneTitle?: string;
  activePreviewImageUrl: string;
  activePreviewLabel: string;
  activePreviewScene: { id?: string; title?: string } | null;
  activePreviewShot: {
    id?: string;
    label?: string;
    startSec?: number;
    endSec?: number;
  } | null;
  activePreviewSceneId?: string;
  activePreviewShotId?: string;
  playing: boolean;
  canPlay: boolean;
  canPlayReason: string | null;
  isFullscreen: boolean;
  positionSec: number;
  duration: number;
  readingSpeedWpm: number;
  formatTimeLabel: (totalSeconds: number) => string;
  uploadingSceneId: string | null;
  uploadingShotId?: string | null;
  onToggle: () => void;
  onStop?: () => void;
  onToggleFullscreen: () => void;
  onUploadSceneImage: (sceneId: string) => void;
  onUploadShotImage?: (shotId: string) => void;
  /** @deprecated use playing */
  isPlaying?: boolean;
  /** @deprecated use positionSec */
  currentTime?: number;
  /** @deprecated use onToggle */
  onPlayPause?: () => void;
}

export function StructureTimelinePreviewPanel({
  isBookProject,
  isAudioProject,
  isFilmProject,
  previewAreaTitle,
  wordsArray,
  currentWordIndex,
  currentSceneTitle,
  activePreviewImageUrl,
  activePreviewLabel,
  activePreviewScene,
  activePreviewShot,
  activePreviewSceneId,
  activePreviewShotId,
  playing,
  canPlay,
  canPlayReason,
  isFullscreen,
  positionSec,
  duration,
  readingSpeedWpm,
  formatTimeLabel,
  uploadingSceneId,
  uploadingShotId = null,
  onToggle,
  onToggleFullscreen,
  onUploadSceneImage,
  onUploadShotImage,
  isPlaying: isPlayingLegacy,
  currentTime: currentTimeLegacy,
  onPlayPause,
}: StructureTimelinePreviewPanelProps) {
  const isPlaying = playing ?? isPlayingLegacy ?? false;
  const currentTime = positionSec ?? currentTimeLegacy ?? 0;
  const handleToggle = onToggle ?? onPlayPause ?? (() => undefined);
  const transportDisabled = !canPlay && !isPlaying;
  const transportTitle = transportDisabled
    ? (canPlayReason ?? "Wiedergabe nicht verfügbar")
    : isPlaying
      ? "Pause"
      : "Play";

  const playerShell = (
    <div
      className={cn(
        "relative bg-muted rounded overflow-hidden border-2 border-border w-full aspect-video",
        isBookProject ? "min-h-[200px] p-8" : "min-h-[160px]",
      )}
    >
      {isBookProject && wordsArray.length > 0 ? (
        <TimelineTextPreview
          wordsArray={wordsArray}
          currentWordIndex={currentWordIndex}
          currentSceneTitle={currentSceneTitle}
        />
      ) : (
        <>
          {activePreviewImageUrl ? (
            <ResolvedProjectAssetImage
              url={activePreviewImageUrl}
              alt={activePreviewLabel}
              className="w-full h-full object-cover rounded"
            />
          ) : (
            <div className="w-full h-full rounded bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
              <div className="text-center px-4">
                <div className="text-sm font-medium text-foreground">
                  {activePreviewLabel}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isAudioProject
                    ? activePreviewScene
                      ? "Kein Szenenbild — Kamera-Button oder Bild auf Szene ziehen"
                      : "Lege Szenen an oder bewege den Playhead"
                    : activePreviewShot
                      ? "Kein Bild fuer diesen Shot"
                      : "Fuege Shots hinzu oder bewege den Playhead"}
                </div>
              </div>
            </div>
          )}

          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <Button
              type="button"
              variant="default"
              size="icon"
              disabled={transportDisabled}
              title={transportTitle}
              className="rounded-full bg-background/20 hover:bg-background/30 backdrop-blur-sm w-16 h-16 pointer-events-auto disabled:opacity-40"
              data-testid="structure-timeline-play-pause"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (transportDisabled) return;
                handleToggle();
              }}
            >
              {isPlaying ? (
                <Pause className="w-8 h-8 text-foreground" />
              ) : (
                <Play className="w-8 h-8 text-foreground ml-1" />
              )}
            </Button>
          </div>
          {isAudioProject && activePreviewSceneId ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-9 w-9 bg-background/80 backdrop-blur-sm"
              disabled={uploadingSceneId === activePreviewSceneId}
              onClick={() => onUploadSceneImage(activePreviewSceneId)}
              aria-label="Szenenbild hochladen"
              title="Szenenbild hochladen"
            >
              {uploadingSceneId === activePreviewSceneId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </Button>
          ) : null}
          {isFilmProject && activePreviewShotId && onUploadShotImage ? (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-9 w-9 bg-background/80 backdrop-blur-sm"
              disabled={uploadingShotId === activePreviewShotId}
              onClick={() => onUploadShotImage(activePreviewShotId)}
              aria-label="Shot-Bild hochladen"
              title="Shot-Bild hochladen"
            >
              {uploadingShotId === activePreviewShotId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Camera className="size-4" />
              )}
            </Button>
          ) : null}
        </>
      )}

      {!isBookProject ? (
        <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground px-2 py-0.5 rounded text-xs font-mono">
          {formatTimeLabel(currentTime)}
        </div>
      ) : null}
    </div>
  );

  const centeredMaxWidth = isBookProject ? "max-w-2xl" : undefined;
  const centeredStyle = isBookProject
    ? undefined
    : { maxWidth: STRUCTURE_TIMELINE_PREVIEW_PLAYER_MAX_PX };

  return (
    <div
      className={cn(
        "flex-shrink-0 bg-card border-b border-border",
        isAudioProject ? "p-3" : "p-4 md:p-6",
      )}
    >
      <div className="text-sm text-muted-foreground mb-2 text-center">
        {previewAreaTitle}
      </div>

      <div
        className={cn("w-full mx-auto", centeredMaxWidth)}
        style={centeredStyle}
      >
        {playerShell}
      </div>

      {isBookProject ? (
        <div className="max-w-2xl mx-auto mt-4 flex items-center gap-3">
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={transportDisabled}
            title={transportTitle}
            onClick={(event) => {
              event.preventDefault();
              if (transportDisabled) return;
              handleToggle();
            }}
            className="bg-primary hover:bg-primary/90 disabled:opacity-40"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 mr-2" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isPlaying ? "Pause" : "Play"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleFullscreen}
            className="border-border"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 mr-2" />
            ) : (
              <Maximize2 className="w-4 h-4 mr-2" />
            )}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </Button>
          <div className="flex-1 bg-muted px-3 py-1.5 rounded text-xs font-mono text-foreground border border-border">
            {formatTimeLabel(currentTime)} / {formatTimeLabel(duration)}
          </div>
          <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
            {readingSpeedWpm} WPM
          </div>
        </div>
      ) : null}
    </div>
  );
}
