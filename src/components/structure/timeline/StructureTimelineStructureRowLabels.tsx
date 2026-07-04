/**
 * Sidebar labels for structure rows (Zeit → Shot) used in RowShell pairs (#49).
 * Location: src/components/structure/timeline/StructureTimelineStructureRowLabels.tsx
 */

import type { Dispatch, MouseEvent, SetStateAction } from "react";
import { Crosshair, Magnet } from "lucide-react";
import { cn } from "../../ui/utils";
import { TimelineTrackAddButton } from "../../timeline/TimelineTrackAddButton";
import { TimelineStructureAudioLinkChip } from "../../timeline/TimelineStructureAudioLinkChip";
import { ShotTrackLabel } from "./tracks/ShotTrack";
import type { getTimelineStrategy, AddNodeKind } from "./strategies";

type ResizingTrack = string | null;

export interface StructureTimelineStructureRowLabelsProps {
  trackHeights: {
    beat: number;
    act: number;
    sequence: number;
    scene: number;
    shot: number;
  };
  strategy: ReturnType<typeof getTimelineStrategy>;
  labelByKind: Record<string, string>;
  beatAutosnapEnabled: boolean;
  setBeatAutosnapEnabled: (v: boolean) => void;
  beatMagnetEnabled: boolean;
  setBeatMagnetEnabled: (v: boolean) => void;
  trackAutosnap: Record<string, boolean>;
  setTrackAutosnap: Dispatch<SetStateAction<Record<string, boolean>>>;
  clipMagnets: Record<string, boolean>;
  setClipMagnets: Dispatch<SetStateAction<Record<string, boolean>>>;
  showFilmClipMagnets: boolean;
  resizingTrack: ResizingTrack;
  handleResizeStart: (track: string, e: MouseEvent) => void;
  openAddDialogForKind: (kind: AddNodeKind) => void;
  sidebarSceneAudioLink?: {
    short: string;
    full: string;
    nodeId: string;
  } | null;
  sidebarShotAudioLink?: {
    short: string;
    full: string;
    nodeId: string;
  } | null;
  openNodeEditWithAudioLinkFocus: (
    kind: "scene" | "shot",
    nodeId: string,
  ) => void;
  showFilmProductionTracks: boolean;
}

export function getStructureTimelineStructureRowLabels({
  trackHeights,
  strategy,
  labelByKind,
  beatAutosnapEnabled,
  setBeatAutosnapEnabled,
  beatMagnetEnabled,
  setBeatMagnetEnabled,
  trackAutosnap,
  setTrackAutosnap,
  clipMagnets,
  setClipMagnets,
  showFilmClipMagnets,
  resizingTrack,
  handleResizeStart,
  openAddDialogForKind,
  sidebarSceneAudioLink,
  sidebarShotAudioLink,
  openNodeEditWithAudioLinkFocus,
  showFilmProductionTracks,
}: StructureTimelineStructureRowLabelsProps) {
  const zeitLabel = (
    <div className="h-12 border-b border-border px-2 flex items-center bg-card">
      <span className="text-[9px] text-foreground font-medium">Zeit</span>
    </div>
  );

  const beatLabel = (
    <div
      data-testid="timeline-label-beat"
      className="border-b border-border px-2 flex items-center justify-between bg-card relative h-full"
      style={{ minHeight: `${trackHeights.beat}px` }}
    >
      <span className="text-[9px] text-foreground font-medium">Beat</span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={() => setBeatAutosnapEnabled(!beatAutosnapEnabled)}
          className={cn(
            "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
            beatAutosnapEnabled
              ? "opacity-100 text-primary"
              : "opacity-35 text-muted-foreground",
          )}
          title={
            beatAutosnapEnabled
              ? "Autosnap: an (Snapping am Beat-Trim)"
              : "Autosnap: aus"
          }
        >
          <Crosshair className="size-3.5" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          onClick={() => setBeatMagnetEnabled(!beatMagnetEnabled)}
          className={cn(
            "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
            beatMagnetEnabled
              ? "opacity-100 text-primary"
              : "opacity-35 text-muted-foreground",
          )}
          title={
            beatMagnetEnabled
              ? "Magnet: alle Kanten (Beats + Playhead). Aus = nur Playhead, wenn Autosnap an"
              : "Magnet: aus (nur Playhead-Snap bei Autosnap)"
          }
        >
          <Magnet className="size-3.5" strokeWidth={2.25} />
        </button>
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
          resizingTrack === "beat"
            ? "border-b-4 border-primary"
            : "hover:border-b-4 hover:border-primary",
        )}
        onMouseDown={(e) => handleResizeStart("beat", e)}
      />
    </div>
  );

  const actLabel = (
    <div
      data-testid="timeline-label-act"
      className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-card relative h-full"
      style={{ minHeight: `${trackHeights.act}px` }}
    >
      <span className="text-[9px] text-foreground font-medium truncate min-w-0">
        {strategy.actTrackLabel}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        <TimelineTrackAddButton
          onClick={() => openAddDialogForKind("act")}
          title={`${labelByKind.act} hinzufügen`}
        />
        {showFilmClipMagnets ? (
          <>
            <button
              type="button"
              onClick={() => setTrackAutosnap((t) => ({ ...t, act: !t.act }))}
              className={cn(
                "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                trackAutosnap.act
                  ? "text-primary opacity-100"
                  : "text-muted-foreground opacity-40",
              )}
              title={
                trackAutosnap.act ? "Act: Autosnap an" : "Act: Autosnap aus"
              }
            >
              <Crosshair className="size-3.5" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => setClipMagnets((m) => ({ ...m, act: !m.act }))}
              className={cn(
                "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                clipMagnets.act
                  ? "text-primary opacity-100"
                  : "text-muted-foreground opacity-40",
              )}
              title={
                clipMagnets.act
                  ? "Act: Magnet (alle Kanten)"
                  : "Act: nur Playhead, wenn Autosnap an"
              }
            >
              <Magnet className="size-3.5" strokeWidth={2.25} />
            </button>
          </>
        ) : null}
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
          resizingTrack === "act"
            ? "border-b-4 border-primary"
            : "hover:border-b-4 hover:border-primary",
        )}
        onMouseDown={(e) => handleResizeStart("act", e)}
      />
    </div>
  );

  const sequenceLabel = (
    <div
      className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-card relative h-full"
      style={{ minHeight: `${trackHeights.sequence}px` }}
    >
      <span className="text-[9px] text-foreground font-medium truncate min-w-0">
        {strategy.sequenceTrackLabel}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        <TimelineTrackAddButton
          onClick={() => openAddDialogForKind("sequence")}
          title={`${labelByKind.sequence} hinzufügen`}
        />
        {showFilmClipMagnets ? (
          <>
            <button
              type="button"
              onClick={() =>
                setTrackAutosnap((t) => ({ ...t, sequence: !t.sequence }))
              }
              className={cn(
                "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                trackAutosnap.sequence
                  ? "text-primary opacity-100"
                  : "text-muted-foreground opacity-40",
              )}
              title={
                trackAutosnap.sequence
                  ? "Seq.: Autosnap an"
                  : "Seq.: Autosnap aus"
              }
            >
              <Crosshair className="size-3.5" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() =>
                setClipMagnets((m) => ({ ...m, sequence: !m.sequence }))
              }
              className={cn(
                "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                clipMagnets.sequence
                  ? "text-primary opacity-100"
                  : "text-muted-foreground opacity-40",
              )}
              title={
                clipMagnets.sequence
                  ? "Seq.: Magnet (alle Kanten)"
                  : "Seq.: nur Playhead"
              }
            >
              <Magnet className="size-3.5" strokeWidth={2.25} />
            </button>
          </>
        ) : null}
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
          resizingTrack === "sequence"
            ? "border-b-4 border-primary"
            : "hover:border-b-4 hover:border-primary",
        )}
        onMouseDown={(e) => handleResizeStart("sequence", e)}
      />
    </div>
  );

  const sceneLabel = (
    <div
      className="border-b border-border px-1.5 flex items-center justify-between gap-1 bg-card relative h-full"
      style={{ minHeight: `${trackHeights.scene}px` }}
    >
      <span className="text-[9px] text-foreground font-medium truncate min-w-0 shrink">
        {strategy.sceneTrackLabel}
      </span>
      <div className="flex items-center gap-1 shrink-0 min-w-0">
        {sidebarSceneAudioLink ? (
          <TimelineStructureAudioLinkChip
            shortLabel={sidebarSceneAudioLink.short}
            fullLabel={sidebarSceneAudioLink.full}
            variant="scene"
            size="sidebar"
            onClick={() =>
              openNodeEditWithAudioLinkFocus(
                "scene",
                sidebarSceneAudioLink.nodeId,
              )
            }
          />
        ) : null}
        <TimelineTrackAddButton
          onClick={() => openAddDialogForKind("scene")}
          title={`${labelByKind.scene} hinzufügen`}
        />
        {showFilmClipMagnets ? (
          <>
            <button
              type="button"
              onClick={() =>
                setTrackAutosnap((t) => ({ ...t, scene: !t.scene }))
              }
              className={cn(
                "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                trackAutosnap.scene
                  ? "text-primary opacity-100"
                  : "text-muted-foreground opacity-40",
              )}
              title={
                trackAutosnap.scene
                  ? "Scene: Autosnap an"
                  : "Scene: Autosnap aus"
              }
            >
              <Crosshair className="size-3.5" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => setClipMagnets((m) => ({ ...m, scene: !m.scene }))}
              className={cn(
                "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                clipMagnets.scene
                  ? "text-primary opacity-100"
                  : "text-muted-foreground opacity-40",
              )}
              title={
                clipMagnets.scene
                  ? "Scene: Magnet (alle Kanten)"
                  : "Scene: nur Playhead"
              }
            >
              <Magnet className="size-3.5" strokeWidth={2.25} />
            </button>
          </>
        ) : null}
      </div>
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
          resizingTrack === "scene"
            ? "border-b-4 border-primary"
            : "hover:border-b-4 hover:border-primary",
        )}
        onMouseDown={(e) => handleResizeStart("scene", e)}
      />
    </div>
  );

  const shotLabel = showFilmProductionTracks ? (
    <ShotTrackLabel
      trackHeightPx={trackHeights.shot}
      shotAddLabel={labelByKind.shot}
      trackAutosnapShot={trackAutosnap.shot}
      clipMagnetShot={clipMagnets.shot}
      resizingTrack={resizingTrack}
      onToggleAutosnap={() =>
        setTrackAutosnap((t) => ({ ...t, shot: !t.shot }))
      }
      onToggleMagnet={() => setClipMagnets((m) => ({ ...m, shot: !m.shot }))}
      onResizeStart={(e) => handleResizeStart("shot", e)}
      onAddShot={() => openAddDialogForKind("shot")}
      sidebarAudioLink={sidebarShotAudioLink ?? undefined}
      onSidebarAudioLinkClick={(shotId) =>
        openNodeEditWithAudioLinkFocus("shot", shotId)
      }
    />
  ) : null;

  return {
    zeitLabel,
    beatLabel,
    actLabel,
    sequenceLabel,
    sceneLabel,
    shotLabel,
  };
}
