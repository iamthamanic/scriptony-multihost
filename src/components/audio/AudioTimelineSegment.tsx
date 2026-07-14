/**
 * AudioTimelineSegment — Einzelner Track/Clip-Block auf einer Lane.
 *
 * T28: Union-Typ vorbereitet (AudioTrack | AudioClip).
 * Wenn Feature-Flag aktiv (T29+), rendert die Timeline AudioClip[]
 * statt AudioTrack[].
 * T31: Waveform-Visualisierung + TTS-Button auf geschätzten Clips.
 *
 * Accessibility (WCAG):
 * - aria-label für Screenreader (Typ + Content + Dauer).
 * - title-Attribut für Hover-Info.
 * - Kontrast: Weißer Text auf farbigem Hintergrund (ggf. anpassen).
 * - TTS-Button: Tastatur-fokussierbar, aria-label, kontrastreich.
 */

import { useState, useCallback, useRef } from "react";
import { Mic } from "lucide-react";
import type { AudioTrack, AudioClip } from "../../lib/types";
import { formatDurationSec } from "../../lib/audio-utils";
import { hasOverlap } from "../../lib/audio-lane";
import { cn } from "../../lib/utils";
import { ClipLanePopover } from "./ClipLanePopover";
import { AudioTimelineMveDialogSegment } from "./AudioTimelineMveDialogSegment";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveLineDirection } from "@/lib/multi-voice-engine/schema/line-direction";
import type { Character } from "@/lib/types";
import type { MveStructurePickerRefs } from "../structure/timeline/mve/MveStructureScenePickerModal";
import type { MveSceneOption } from "@/hooks/useMveTextBlockAudio";

const TYPE_COLORS: Record<string, string> = {
  dialog: "bg-amber-500 border-amber-600",
  narrator: "bg-amber-400 border-amber-500",
  music: "bg-violet-500 border-violet-600",
  sfx: "bg-slate-500 border-slate-600",
  atmo: "bg-sky-500 border-sky-600",
};

/** Max Anzahl Waveform-Samples gemäß T31. */
const MAX_WAVEFORM_SAMPLES = 200;

interface AudioTimelineSegmentProps {
  /** T28: Union-Typ für Transition Phase. */
  item: AudioTrack | AudioClip;
  pxPerSec: number;
  /** Horizontal scroll offset (same as VET structure tracks). */
  viewStartSec?: number;
  /** T30: Trim-Handler — wird bei Ende eines Resize-Drag aufgerufen. */
  onTrimEnd?: (clipId: string, newEndSec: number) => void;
  /** T30: Ob Trim erlaubt ist (nur im neuen Clip-System). */
  isEditable?: boolean;
  /** T31: TTS-Generate-Callback für geschätzte Clips. */
  onGenerateTts?: () => void;
  /** T32: All clips in scene (for overlap detection + lane popover). */
  allClips?: AudioClip[];
  /** T32: Callback when user changes a clip's lane assignment. */
  onLaneChange?: (clipId: string, newLaneIndex: number) => void;
  /** MVE dialog line bound to this clip (local Structure Timeline). */
  mveLine?: MveLine;
  mveProjectId?: string;
  onMveSaveText?: (lineId: string, text: string) => Promise<void>;
  onMveSaveDirection?: (
    lineId: string,
    direction: MveLineDirection,
  ) => Promise<void>;
  mveRenderBlockReason?: string;
  onMveRenderLine?: (lineId: string) => Promise<unknown>;
  mveIsRendering?: boolean;
  mveProjectType?: string;
  mveCharacter?: Character;
  mveSceneLabel?: string;
  mveSceneBlock?: { startSec: number; endSec: number };
  mveScenes?: MveSceneOption[];
  mveStructurePicker?: MveStructurePickerRefs;
  onMveBindAudioClip?: (lineId: string, clipId: string | null) => Promise<void>;
  onMveDeleteLine?: (lineId: string) => Promise<void>;
}

export function AudioTimelineSegment({
  item,
  pxPerSec,
  viewStartSec = 0,
  onTrimEnd,
  isEditable = false,
  onGenerateTts,
  allClips,
  onLaneChange,
  mveLine,
  mveProjectId,
  onMveSaveText,
  onMveSaveDirection,
  mveRenderBlockReason,
  onMveRenderLine,
  mveIsRendering,
  mveProjectType,
  mveCharacter,
  mveSceneLabel,
  mveSceneBlock,
  mveScenes,
  mveStructurePicker,
  onMveBindAudioClip,
  onMveDeleteLine,
}: AudioTimelineSegmentProps) {
  // T28: Union-Typ — unterscheide Track (Legacy) vs Clip (neu)
  const isClip = "startSec" in item;

  const startSec = isClip
    ? (item as AudioClip).startSec
    : ((item as AudioTrack).startTime ?? 0);

  const endSec = isClip
    ? (item as AudioClip).endSec
    : ((item as AudioTrack).startTime ?? 0) +
      ((item as AudioTrack).duration ?? 3);

  const durationSec = Math.max(endSec - startSec, 0.1);

  const startPx = (startSec - viewStartSec) * pxPerSec;
  const widthPx = Math.max(durationSec * pxPerSec, 4); // Min 4px

  const trackType = isClip
    ? ((item as AudioClip).trackType ?? "dialog")
    : (item as AudioTrack).type;
  const content = isClip
    ? ((item as AudioClip).content ?? "…")
    : ((item as AudioTrack).content ?? "…");

  const colorClass = TYPE_COLORS[trackType] || "bg-gray-500 border-gray-600";

  const showMveEditor =
    isClip &&
    mveLine &&
    mveProjectId &&
    onMveSaveText &&
    onMveSaveDirection &&
    (trackType === "dialog" || trackType === "narrator");

  // T32: Overlap detection — red dashed border when clips overlap on the same lane
  const overlapping =
    isClip && allClips
      ? hasOverlap(
          allClips,
          {
            startSec: (item as AudioClip).startSec,
            endSec: (item as AudioClip).endSec,
            id: (item as AudioClip).id,
          },
          (item as AudioClip).laneIndex,
        )
      : false;

  // T29: Geschätzt = kein audioFileId auf Clip
  const isEstimated = isClip && !(item as AudioClip).audioFileId;

  // T31: Waveform-Daten (nur bei Clips mit generiertem Audio)
  const rawWaveform = isClip ? (item as AudioClip).waveformData : undefined;
  const waveformData = rawWaveform?.length
    ? rawWaveform.length > MAX_WAVEFORM_SAMPLES
      ? rawWaveform.slice(0, MAX_WAVEFORM_SAMPLES)
      : rawWaveform
    : undefined;

  // ── T30: Trim-State ─────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const clipIdRef = useRef(isClip ? (item as AudioClip).id : "");

  // T30: Conflict-Check vor Trim
  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!isEditable || !isClip) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartWidth.current = widthPx;
    },
    [isEditable, isClip, widthPx],
  );

  // T30: Keyboard-Trim (WCAG 2.2 AA — Tastatur-Bedienbarkeit)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isEditable || !isClip) return;
      if (e.key === "ArrowRight" && e.shiftKey) {
        e.preventDefault();
        const stepSec = e.altKey ? 0.1 : 1.0; // Alt = fein
        const newEndSec = endSec + stepSec;
        if (onTrimEnd) {
          onTrimEnd(clipIdRef.current, newEndSec);
        }
      } else if (e.key === "ArrowLeft" && e.shiftKey) {
        e.preventDefault();
        const stepSec = e.altKey ? 0.1 : 1.0;
        const newEndSec = Math.max(endSec - stepSec, startSec + 0.5);
        if (onTrimEnd) {
          onTrimEnd(clipIdRef.current, newEndSec);
        }
      }
    },
    [isEditable, isClip, endSec, startSec, onTrimEnd],
  );

  const handleMouseMove = useCallback(
    (_e: React.MouseEvent) => {
      if (!isDragging) return;
      // Visuelles Feedback während Drag (optional: könnte auch über CSS-Variable gehen)
      // Für KISS: wir zeigen kein Live-Resize, nur Cursor-Change
    },
    [isDragging],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setIsDragging(false);
      const deltaPx = e.clientX - dragStartX.current;
      const newDurationSec = Math.max(
        (dragStartWidth.current + deltaPx) / pxPerSec,
        0.5,
      );
      const newEndSec = startSec + newDurationSec;
      if (onTrimEnd && clipIdRef.current) {
        onTrimEnd(clipIdRef.current, newEndSec);
      }
    },
    [isDragging, pxPerSec, startSec, onTrimEnd],
  );

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // T31: TTS-Button-Handler (stopPropagation, damit Drag/Click nicht kollidieren)
  const handleTtsClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onGenerateTts?.();
    },
    [onGenerateTts],
  );

  // ── Content ────────────────────────────────────────────────────
  const wordCount = content
    ? content
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length
    : 0;
  const durationMin = durationSec / 60;
  const roughWpm =
    wordCount > 0 && durationMin > 0 ? Math.round(wordCount / durationMin) : 0;
  const contentPreview =
    content && content.length > 40
      ? `"${content.slice(0, 40)}…”`
      : content
        ? `"${content}"`
        : "";

  const tooltipText = isEstimated
    ? `⏳ Geschätzt: ${formatDurationSec(durationSec)} (${wordCount} Wörter${roughWpm > 0 ? `, ~${roughWpm} WPM` : ""}${contentPreview ? `, ${contentPreview}` : ""})`
    : waveformData
      ? `✅ Generiert: ${formatDurationSec(durationSec)} (${wordCount} Wörter${roughWpm > 0 ? `, ~${roughWpm} WPM` : ""}${contentPreview ? `, ${contentPreview}` : ""})`
      : `${trackType}: ${content || "(kein Text)"} (${formatDurationSec(durationSec)})`;

  const ariaText = isEstimated
    ? `Geschätzt: ${trackType}: ${content || "(kein Text)"}, Dauer ${formatDurationSec(durationSec)}, ${wordCount} Wörter${roughWpm > 0 ? `, ~${roughWpm} WPM` : ""}`
    : `${trackType}: ${content}, Dauer ${formatDurationSec(durationSec)}`;

  if (showMveEditor && mveLine && mveProjectId && isClip) {
    return (
      <AudioTimelineMveDialogSegment
        clip={item as AudioClip}
        line={mveLine}
        pxPerSec={pxPerSec}
        viewStartSec={viewStartSec}
        isEditable={isEditable}
        onTrimEnd={onTrimEnd}
        allClips={allClips}
        onLaneChange={onLaneChange}
        projectId={mveProjectId}
        projectType={mveProjectType}
        sceneLabel={mveSceneLabel}
        sceneBlock={mveSceneBlock}
        character={mveCharacter}
        scenes={mveScenes}
        structurePicker={mveStructurePicker}
        onSaveText={onMveSaveText}
        onSaveDirection={onMveSaveDirection}
        onBindAudioClip={onMveBindAudioClip}
        onDeleteLine={onMveDeleteLine}
        renderBlockReason={mveRenderBlockReason}
        onRenderLine={onMveRenderLine}
        isRendering={mveIsRendering}
      />
    );
  }

  return (
    <div
      className={cn(
        "absolute top-1.5 bottom-1.5 rounded-md border text-white text-[10px] overflow-hidden cursor-pointer",
        "hover:brightness-110 transition-all shadow-sm select-none",
        colorClass,
        isEstimated && "border-dotted opacity-70",
        !isEstimated && "border-solid",
        overlapping && "border-red-500 border-dashed",
        isDragging && "ring-2 ring-white/50",
      )}
      style={{
        left: `${startPx}px`,
        width: `${widthPx}px`,
      }}
      title={tooltipText}
      aria-label={ariaText}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* T31: Waveform-Visualisierung (SVG-Rechtecke aus waveformData) */}
      {waveformData && (
        <svg
          className="absolute inset-0 pointer-events-none"
          width={widthPx}
          height="100%"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {waveformData.map((peak, i) => {
            const barWidth = widthPx / waveformData.length;
            const x = i * barWidth;
            const safePeak = Math.max(0, Math.min(1, peak));
            const heightPct = Math.max(safePeak * 100, 2);
            const y = (100 - heightPct) / 2;
            return (
              <rect
                key={`${(item as AudioClip).id ?? i}-wf-${i}`}
                x={`${x}px`}
                y={`${y}%`}
                width={`${barWidth}px`}
                height={`${heightPct}%`}
                fill="currentColor"
                opacity={0.4}
                rx={1}
              />
            );
          })}
        </svg>
      )}

      <div className="px-1.5 py-0.5 flex items-center gap-1 h-full relative z-10">
        {/* T32: Lane-Wechsel Popover (nur bei Clips mit Handler) */}
        {isClip && onLaneChange && allClips && (
          <ClipLanePopover
            clip={item as AudioClip}
            allClips={allClips}
            onLaneChange={onLaneChange}
          />
        )}
        <span className="truncate font-medium">{content || "…"}</span>
        <div className="flex items-center gap-1 shrink-0">
          {/* T31: TTS-Button nur auf geschätzten Clips mit handler.
               Mindestbreite verhindert UI-Überlappung bei schmalen Segmenten. */}
          {isEstimated && onGenerateTts && widthPx >= 48 && (
            <button
              type="button"
              onClick={handleTtsClick}
              className="shrink-0 min-w-4 p-0.5 rounded-sm hover:bg-white/30 transition-colors focus:outline-none focus:ring-1 focus:ring-white/50"
              title="TTS generieren"
              aria-label="TTS generieren"
            >
              <Mic className="w-3 h-3" aria-hidden="true" />
            </button>
          )}
          {isEstimated && <span aria-hidden="true">⏳</span>}
        </div>
        {/* T30: Resize-Handle (rechts) */}
        {isEditable && isClip && (
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 transition-colors focus:outline-none focus:ring-1 focus:ring-white/50"
            onMouseDown={handleResizeMouseDown}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="slider"
            aria-label="Clip verlängern/verkürzen. Shift+Alt+Pfeiltaste = fein (0,1s), Shift+Pfeiltaste = grob (1s)"
            aria-valuenow={endSec}
            aria-valuemin={startSec + 0.5}
            aria-valuemax={startSec + 600}
            title="Ziehen oder Shift+Pfeiltaste zum Trimmen"
          />
        )}
      </div>
    </div>
  );
}

export default AudioTimelineSegment;
