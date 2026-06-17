import type { RefObject } from "react";
import type { BlockResult } from "../../../timeline-blocks";
import type { TimelineMarqueeSelectionApi } from "../../../../hooks/useTimelineMarqueeSelection";
import type {
  TimelineInteractionMode,
  TimelineSelectableKind,
} from "../../../../lib/timeline-selection/types";
import type { TimelineImageDropBindings } from "../../../../lib/timeline-image-drop-bindings";

/** Pixel-positioned block rendered on a structure timeline track row. */
export type StructureTimelineBlock = BlockResult;

export type StructureTrimKind = "act" | "sequence" | "scene" | "shot";

export type StructureTrackBaseProps = {
  containerRef: RefObject<HTMLElement | null>;
  trackHeightPx: number;
  pxPerSec: number;
  viewStartSec: number;
};

export type BeatTrackProps = StructureTrackBaseProps & {
  blocks: StructureTimelineBlock[];
  beatLayoutEpoch: number;
  interactionMode: TimelineInteractionMode;
  marqueeSelection: TimelineMarqueeSelectionApi;
  structureBodyDragMovedRef: React.MutableRefObject<boolean>;
  onBeatMoveMouseDown: (beatId: string, e: React.PointerEvent) => void;
  onTrimStart: (
    beatId: string,
    handle: "left" | "right",
    e: React.PointerEvent,
  ) => void;
  onOpenBeatEdit: (beatId: string) => void;
};

export type ActTrackProps = StructureTrackBaseProps & {
  blocks: StructureTimelineBlock[];
  rowKey: (id: string) => string;
  useFilmTreeLayout: boolean;
  marqueeSelection: TimelineMarqueeSelectionApi;
  onClipTitleClick: (
    kind: TimelineSelectableKind,
    id: string,
  ) => (e: React.MouseEvent) => void;
  onStructureMoveMouseDown: (
    kind: StructureTrimKind,
    id: string,
    e: React.PointerEvent,
  ) => void;
  onTrimClipMouseDown: (
    kind: StructureTrimKind,
    id: string,
    handle: "left" | "right",
    e: React.PointerEvent,
  ) => void;
};

export type SequenceTrackProps = ActTrackProps;

export type SceneTrackProps = StructureTrackBaseProps & {
  blocks: StructureTimelineBlock[];
  rowKey: (id: string) => string;
  useFilmTreeLayout: boolean;
  isAudioProject: boolean;
  marqueeSelection: TimelineMarqueeSelectionApi;
  structureBodyDragMovedRef: React.MutableRefObject<boolean>;
  sceneTitleClickTimerRef: React.MutableRefObject<ReturnType<
    typeof setTimeout
  > | null>;
  scenePreviewById: Map<string, string>;
  onStructureMoveMouseDown: (
    kind: StructureTrimKind,
    id: string,
    e: React.PointerEvent,
  ) => void;
  onTrimClipMouseDown: (
    kind: StructureTrimKind,
    id: string,
    handle: "left" | "right",
    e: React.PointerEvent,
  ) => void;
  onOpenSceneEdit: (sceneId: string) => void;
  onOpenSceneContentModal: (scene: StructureTimelineBlock) => void;
  onPickAndUploadSceneImage: (sceneId: string) => void | Promise<void>;
  onSceneImageFileDrop?: (sceneId: string, file: File) => void;
  onFilmSceneClipImageDrop?: (
    sceneId: string,
    file: File,
    clientX: number,
  ) => void;
  emptyLaneDropBindings?: TimelineImageDropBindings;
  /** @deprecated Film scene lane uses emptyLaneDropBindings (shot workflow). */
  filmSceneLaneHintBindings?: TimelineImageDropBindings;
  getAudioLinkLabel?: (
    nodeId: string,
  ) => { short: string; full: string } | undefined;
  onAudioLinkClick?: (nodeId: string) => void;
  onOpenSceneEditDirect?: (sceneId: string) => void;
};

export type ShotTrackLabelProps = {
  trackHeightPx: number;
  shotAddLabel: string;
  trackAutosnapShot: boolean;
  clipMagnetShot: boolean;
  resizingTrack: string | null;
  onToggleAutosnap: () => void;
  onToggleMagnet: () => void;
  onResizeStart: (e: React.MouseEvent) => void;
  onAddShot: () => void;
  sidebarAudioLink?: { short: string; full: string; nodeId: string };
  onSidebarAudioLinkClick?: (nodeId: string) => void;
};

export type ShotTrackProps = StructureTrackBaseProps & {
  blocks: StructureTimelineBlock[];
  rowKey: (id: string) => string;
  useFilmTreeLayout: boolean;
  marqueeSelection: TimelineMarqueeSelectionApi;
  structureBodyDragMovedRef: React.MutableRefObject<boolean>;
  onTrimClipMouseDown: (
    kind: "shot",
    id: string,
    handle: "left" | "right",
    e: React.PointerEvent,
  ) => void;
  onOpenShotEdit: (shotId: string) => void;
  shotPreviewUrl: (shot: StructureTimelineBlock) => string | null | undefined;
  onShotImageFileDrop?: (shotId: string, file: File) => void;
  emptyLaneDropBindings?: TimelineImageDropBindings;
  getAudioLinkLabel?: (
    nodeId: string,
  ) => { short: string; full: string } | undefined;
  onAudioLinkClick?: (nodeId: string) => void;
  onOpenShotEditDirect?: (shotId: string) => void;
};
