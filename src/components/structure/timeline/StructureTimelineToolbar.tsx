/**
 * Structure timeline toolbar — transport, zoom, interaction mode (Epic T55d / T61).
 * Location: src/components/structure/timeline/StructureTimelineToolbar.tsx
 */

import {
  Minus,
  Plus,
  MousePointer2,
  Move,
  Play,
  Pause,
  Square,
} from "lucide-react";
import type { ChangeEvent } from "react";
import { cn } from "../../ui/utils";
import type { TimelineInteractionMode } from "../../../lib/timeline-selection/types";

export interface StructureTimelineToolbarProps {
  duration: number;
  formatTimeLabel: (totalSeconds: number) => string;
  isBookProject: boolean;
  targetPages?: number;
  timelineInteractionMode: TimelineInteractionMode;
  onInteractionModeChange: (mode: TimelineInteractionMode) => void;
  zoom: number;
  fitPxPerSec: number;
  maxPxPerSec: number;
  onZoomAroundCursor: (nextZoom: number) => void;
  onZoomSlider: (event: ChangeEvent<HTMLInputElement>) => void;
  playing: boolean;
  canPlay: boolean;
  canPlayReason: string | null;
  positionSec: number;
  onToggle: () => void;
  onStop: () => void;
}

export function StructureTimelineToolbar({
  duration,
  formatTimeLabel,
  isBookProject,
  targetPages,
  timelineInteractionMode,
  onInteractionModeChange,
  zoom,
  fitPxPerSec,
  maxPxPerSec,
  onZoomAroundCursor,
  onZoomSlider,
  playing,
  canPlay,
  canPlayReason,
  positionSec,
  onToggle,
  onStop,
}: StructureTimelineToolbarProps) {
  const transportDisabled = !canPlay && !playing;
  const transportTitle = transportDisabled
    ? (canPlayReason ?? "Wiedergabe nicht verfügbar")
    : playing
      ? "Pause (Leertaste)"
      : "Play (Leertaste)";

  return (
    <div className="flex-shrink-0 bg-card border-b border-border px-4 py-2 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1 border-r border-border pr-3">
          <button
            type="button"
            className={cn(
              "p-1.5 rounded transition-colors",
              transportDisabled
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-muted/50",
            )}
            disabled={transportDisabled}
            title={transportTitle}
            aria-label={playing ? "Pause" : "Play"}
            data-testid="structure-timeline-toolbar-play-pause"
            onClick={() => {
              if (transportDisabled) return;
              onToggle();
            }}
          >
            {playing ? (
              <Pause className="size-4 text-foreground" />
            ) : (
              <Play className="size-4 text-foreground ml-0.5" />
            )}
          </button>
          <button
            type="button"
            className="p-1.5 rounded hover:bg-muted/50 transition-colors"
            title="Stop (Home)"
            aria-label="Stop"
            data-testid="structure-timeline-toolbar-stop"
            onClick={onStop}
          >
            <Square className="size-3.5 text-foreground" />
          </button>
        </div>
        <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
          {formatTimeLabel(positionSec)} / {formatTimeLabel(duration)}
        </div>
        {isBookProject && targetPages ? (
          <span className="text-xs text-muted-foreground font-mono hidden sm:inline">
            Target: {targetPages} pages
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 mr-1 border-r border-border pr-2">
          <button
            type="button"
            onClick={() => onInteractionModeChange("select")}
            className={cn(
              "p-1.5 rounded transition-colors flex items-center gap-1 text-xs",
              timelineInteractionMode === "select"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/50 text-muted-foreground",
            )}
            title="Auswahl (V) — Beat solo · Act/Seq/Scene/Shot zusammen"
          >
            <MousePointer2 className="size-3.5" />
            <span className="hidden sm:inline">Auswahl</span>
          </button>
          <button
            type="button"
            onClick={() => onInteractionModeChange("move")}
            className={cn(
              "p-1.5 rounded transition-colors flex items-center gap-1 text-xs",
              timelineInteractionMode === "move"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted/50 text-muted-foreground",
            )}
            title="Verschieben (M) — Clips ziehen"
          >
            <Move className="size-3.5" />
            <span className="hidden sm:inline">Verschieben</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => onZoomAroundCursor(Math.max(0, zoom - 0.25))}
          className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
          title="Zoom out"
        >
          <Minus className="size-4 text-muted-foreground" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={zoom}
          onChange={onZoomSlider}
          className="w-32"
          title={`${fitPxPerSec.toFixed(2)} - ${maxPxPerSec} px/s`}
        />
        <button
          type="button"
          onClick={() => onZoomAroundCursor(Math.min(1, zoom + 0.25))}
          className="p-1.5 rounded-full hover:bg-muted/50 transition-colors"
          title="Zoom in"
        >
          <Plus className="size-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}
