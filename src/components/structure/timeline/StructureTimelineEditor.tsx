import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  type RefObject,
} from "react";
import { Plus, Magnet, Clapperboard, Crosshair } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { cn } from "../../ui/utils";
import * as BeatsAPI from "../../../lib/api/beats-api";
import * as TimelineAPI from "../../../lib/api/timeline-api";
import * as ShotsAPI from "../../../lib/api/shots-api";
import { useAuth } from "../../../hooks/useAuth";
import type { TimelineData } from "../../../lib/timeline-data";
import type { BookTimelineData } from "../../book/BookDropdownView";
import type {
  Character,
  Clip,
  Act,
  Sequence,
  Scene,
  Shot,
} from "../../../lib/types";
import * as ClipsAPI from "../../../lib/api/clips-api";
import {
  buildTimelineTree,
  listFilmShotSpansFromTree,
} from "../../../lib/timeline-tree/buildTree";
import { expandStructurePctToFitClip } from "../../../lib/timeline-container-expand";
import {
  maxDescendantEndInAct,
  minDescendantStartInAct,
  maxDescendantEndInSequence,
  minDescendantStartInSequence,
  maxDescendantEndInScene,
  minDescendantStartInScene,
  maxClipEndForShot,
  minClipStartForShot,
  clampBoundaryToChildren,
} from "../../../lib/timeline-structure-trim-clamp";
import { RichTextEditorModal } from "../../shared/RichTextEditorModal";
import { StructureTimelinePreviewPanel } from "./StructureTimelinePreviewPanel";
import { StructureTimelineToolbar } from "./StructureTimelineToolbar";
import { StructureTimelineRuler } from "./StructureTimelineRuler";
import { StructureTimelinePlayheadOverlay } from "./StructureTimelinePlayheadOverlay";
import { StructureTimelineFilmProductionTracks } from "./StructureTimelineFilmProductionTracks";
import {
  getPageMarkerInterval,
  shotBlockPreviewUrl,
} from "./structure-timeline-editor-helpers";
import {
  ActTrack,
  BeatTrack,
  SceneTrack,
  SequenceTrack,
  ShotTrack,
  ShotTrackLabel,
  getTrackBlockText,
  type StructureTimelineBlock,
} from "./tracks";
import { trimBeatLeft, trimBeatRight } from "../../timeline-helpers";
import {
  calculateActBlocks,
  calculateSequenceBlocks,
  calculateSceneBlocks,
} from "../../timeline-blocks";
import { toast } from "sonner";
import { ShotCardModal } from "../../ShotCardModal";
import { useOptionalTimelineState } from "../../../contexts/TimelineStateContext";
import {
  useTrimDragEngine,
  applyBeatPreviewToDOM,
} from "../../../lib/trim-drag-engine";
import { resetBeatLanePreviewStyles } from "../../../lib/beats/beat-move-preview";
import {
  getTrimGrabHandleStyles,
  TRIM_END_CAP_WIDTH,
} from "../../../hooks/useTrimGrabHandles";
import {
  isTrailingPointerActivationSuppressed,
  suppressTrailingPointerActivation,
} from "../../../lib/suppress-trailing-pointer-activation";
import {
  buildStructureParentOptions,
  structureAddDialogParentLabel,
  structureAddMissingPrerequisiteMessage,
  structureAddRequiresParentPicker,
  type StructureAddKind,
} from "@/lib/structure/structure-add-parent";
import {
  nextActCreatePayload,
  nextSceneCreatePayload,
  nextSequenceCreatePayload,
} from "@/lib/structure/structure-create-fields";
import { TimelineTrackAddButton } from "../../timeline/TimelineTrackAddButton";
import { TimelineNodeEditDialog } from "../../timeline/TimelineNodeEditDialog";
import { TimelineNodeStatsDialog } from "../../timeline/TimelineNodeStatsDialog";
import { useHierarchyCRUD } from "../../../hooks/useHierarchyCRUD";
import { useSceneImageUpload } from "../../../hooks/useSceneImageUpload";
import { useShotImageUpload } from "../../../hooks/useShotImageUpload";
import { useStructureTimelineImageDrop } from "../../../hooks/timeline/useStructureTimelineImageDrop";
import { useTauriTimelineImageDropBridge } from "../../../hooks/timeline/useTauriTimelineImageDropBridge";
import { StructureTimelineImageDropDialog } from "./StructureTimelineImageDropDialog";
import { pickImageFile } from "@/lib/pick-image-file";
import { getProjectTypeConfig } from "@/lib/projectTypeRegistry";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/react-query";
import {
  useStructureTimelineAudioLanes,
  StructureTimelineAudioLaneLabels,
  StructureTimelineAudioLaneScrollRows,
} from "./tracks/StructureTimelineAudioLanes";
import { SceneAudioLaneLinkSection } from "../../timeline/SceneAudioLaneLinkSection";
import { useSceneAudioLaneLinks } from "../../../hooks/useSceneAudioLaneLinks";
import type { LinkedLaneAudioContext } from "../../../hooks/useTimelineAddAudio";
import { expandTimelineDataForLinkedNodeClip } from "../../../lib/expand-structure-for-audio-clip";
import {
  formatSceneAudioLinkBadge,
  getLinkForNode,
  getSceneAudioLinkLabel,
  resolveSidebarStructureAudioLink,
  SCENE_AUDIO_LINK_CHIP_CLASS,
} from "@/lib/scene-audio-lane-link";
import { TimelineStructureAudioLinkChip } from "../../timeline/TimelineStructureAudioLinkChip";
import { getTimelineStrategy, type AddNodeKind } from "./strategies";
import { TRIM_GRAB_PRESET_BASE_HEX } from "../../../lib/trim-handle-colors";
import {
  enrichBookTimelineData,
  loadProjectTimelineBundle,
} from "../../../lib/timeline-map";
import { useStructureTimelineTrimBridge } from "../../../hooks/useStructureTimelineTrimBridge";
import { useStructureTimelineMoveBridge } from "../../../hooks/useStructureTimelineMoveBridge";
import { useTimelineTransport } from "../../../hooks/timeline/useTimelineTransport";
import { resolveTimelineTransportGuard } from "../../../hooks/timeline/resolveTimelineTransportGuard";
import { useTimelinePlayback } from "../../../hooks/timeline/useTimelinePlayback";
import { useTimelineZoom } from "../../../hooks/timeline/useTimelineZoom";
import { useTimelineEditorData } from "../../../hooks/timeline/useTimelineEditorData";
import { projectStructureBlocksFromTree } from "../../../lib/timeline-tree/projectBlocks";
import {
  commitBeatTrimPositions,
  packBeatsGapless,
  sortBeatsByStart,
} from "../../../lib/beats/beat-trim-commit";
import {
  useTimelineMarqueeSelection,
  shouldUseMarqueeInsteadOfBodyMove,
} from "../../../hooks/useTimelineMarqueeSelection";
import type { TimelineMarqueeSelectionApi } from "../../../hooks/useTimelineMarqueeSelection";
import type {
  TimelineInteractionMode,
  TimelineSelectableKind,
} from "../../../lib/timeline-selection/types";
import {
  BEAT_MARQUEE_KINDS,
  STRUCTURE_MARQUEE_KINDS,
} from "../../../lib/timeline-selection/types";
import { TIMELINE_CLIP_SELECTED_CLASS } from "../../../lib/timeline-selection/clip-selection-styles";
import { TimelineStructureSelectionStack } from "../../timeline/TimelineStructureSelectionStack";
import { timelineClipPreviewUrl } from "../../../lib/timeline-clip-preview-url";
import { useBeatMoveSession } from "../../../hooks/useBeatMoveSession";
import { USE_HIERARCHICAL_STRUCTURE_RIPPLE } from "../../../lib/vetilalorapp-feature";
import { isVetStructureLayoutFrozen } from "../../../lib/vet-structure-trim-active";
import {
  clearFrozenStructureRowLayouts,
  freezeStructureRowLayouts,
  pickFrozenStructureBlocks,
  type StructureLayoutFrozenRef,
} from "../../../lib/vet-structure-trim-layout-freeze";
import {
  filmTimelineNeedsLayoutRepair,
  persistFilmLayoutRepair,
  repairFilmTimelineLayout,
} from "../../../lib/timeline-tree/layout-repair";
import { isPersistedTimelineNodeId } from "../../../lib/timeline-node-ids";
import { withFilmActsPctResolved } from "../../../lib/timeline-act-layout";
import { resolveTimelineDurations } from "../../../lib/timeline-duration";
import {
  FALLBACK_MIN_PX_PER_SEC,
  getFitPxPerSec,
  pxPerSecFromZoom,
  stableZoomOnFitChange,
} from "../../../lib/timeline-zoom";
import { getTimelineTrackClipClasses } from "../../../lib/timeline-track-tokens";
import {
  outerTrimAdjustFirstPair,
  outerTrimAdjustLastPair,
  clampOuterFirstDurationToChildHull,
  clampOuterLastDurationToChildHull,
} from "../../../lib/book-shot-outer-trim";
import type { FrozenGlobalBounds } from "../../../lib/timeline-frozen-bounds";

/** True when incoming timeline has structure ids missing from current (add/undo). */
function timelineHasStructuralIdsNotIn(
  current: TimelineData | BookTimelineData | null | undefined,
  incoming: TimelineData | BookTimelineData,
): boolean {
  if (!current) return true;
  for (const key of ["acts", "sequences", "scenes"] as const) {
    const curIds = new Set((current[key] ?? []).map((n) => n.id));
    if ((incoming[key] ?? []).some((n) => !curIds.has(n.id))) return true;
  }
  if ("shots" in incoming && "shots" in current) {
    const curIds = new Set((current.shots ?? []).map((n) => n.id));
    if ((incoming.shots ?? []).some((n) => !curIds.has(n.id))) return true;
  }
  return false;
}

function snapshotSeqSceneFrozenBoundsFromRefs(
  seqBlocks: Array<{ id: string; startSec: number; endSec: number }>,
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>,
): { frozenSeq: FrozenGlobalBounds; frozenScene: FrozenGlobalBounds } {
  const frozenSeq: FrozenGlobalBounds = {};
  for (const b of seqBlocks)
    frozenSeq[b.id] = { startSec: b.startSec, endSec: b.endSec };
  const frozenScene: FrozenGlobalBounds = {};
  for (const b of sceneBlocks)
    frozenScene[b.id] = { startSec: b.startSec, endSec: b.endSec };
  return { frozenSeq, frozenScene };
}

function snapshotSceneFrozenBoundsFromRefs(
  sceneBlocks: Array<{ id: string; startSec: number; endSec: number }>,
): FrozenGlobalBounds {
  const frozenScene: FrozenGlobalBounds = {};
  for (const b of sceneBlocks)
    frozenScene[b.id] = { startSec: b.startSec, endSec: b.endSec };
  return frozenScene;
}

/**
 * 🎬 VIDEO EDITOR TIMELINE (CapCut Style)
 *
 * NEW ARCHITECTURE:
 * - Unit-based system (seconds or reading-seconds)
 * - Dynamic ticks based on zoom level (no overlaps!)
 * - Anchor-based zoom (zooms to cursor position)
 * - Viewport culling (only render visible items)
 * - Dynamic zoom range: zoom=0 always shows ENTIRE timeline (like CapCut!)
 * - Exponential zoom mapping from fitPxPerSec (dynamic) to MAX_PX_PER_SEC (200)
 * - Shot track: shows each shot’s image (thumbnail or full-bleed when the block is narrow).
 * - Film: Musik- und SFX-Zeilen nutzen dieselbe x/Breite wie der Shot (mit Shot-Trim); Clips proportional nach Audiolänge/Trim.
 */

export interface StructureTimelineEditorProps {
  projectId: string;
  projectType?: string;
  initialData?: TimelineData | BookTimelineData | null;
  onDataChange?: (data: TimelineData | BookTimelineData) => void;
  /**
   * Project timeline length in seconds. Structure pct math and expansion clamp to this range;
   * extending the timeline requires updating duration upstream (project “Dauer” / API).
   */
  duration?: number;
  /**
   * Notify parent when structure trim needs more seconds than `duration`; parent auto-extends
   * stored project duration (CapCut-style).
   */
  onProjectDurationSecondsHint?: (minSeconds: number) => void;
  beats?: any[];
  totalWords?: number;
  wordsPerPage?: number;
  targetPages?: number;
  readingSpeedWpm?: number; // Reading speed in words per minute for books
  /** Film: switch to structure dropdown, expand act→scene→shot and scroll to shot (full ShotCard menu). */
  onOpenShotInStructureTree?: (shotId: string) => void;
}

type EditableTitleKind = AddNodeKind | "beat";

export function StructureTimelineEditor({
  projectId,
  projectType = "film",
  initialData,
  onDataChange,
  duration = 300,
  onProjectDurationSecondsHint,
  beats: parentBeats,
  totalWords,
  wordsPerPage = 250,
  targetPages,
  readingSpeedWpm = 150, // Default reading speed in words per minute
  onOpenShotInStructureTree,
}: StructureTimelineEditorProps) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const sceneAudioLaneLinks = useSceneAudioLaneLinks(projectId);
  const commitLinkedAudioClipRef = useRef<
    (clip: {
      sceneId: string;
      startSec: number;
      endSec: number;
      linkedNodeId: string;
    }) => Promise<void>
  >(async () => {});

  // 🎬 SHOT MODAL: Open ShotCard directly in timeline (no view switch)
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const timelineCtx = useOptionalTimelineState(); // May be null if no provider

  /** Open shot: prefer modal (if context available), fallback to structure tree */
  const canOpenShot = !!(timelineCtx || onOpenShotInStructureTree);
  const openShot = useCallback(
    (shotId: string) => {
      if (isTrailingPointerActivationSuppressed()) return;
      if (timelineCtx) {
        setSelectedShotId(shotId);
      } else if (onOpenShotInStructureTree) {
        onOpenShotInStructureTree(shotId);
      }
    },
    [timelineCtx, onOpenShotInStructureTree],
  );

  // 🎯 SCROLL / VIEWPORT REFS (zoom via useTimelineZoom after duration resolved)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const verticalScrollRef = useRef<HTMLDivElement | null>(null);
  const viewStartSecRef = useRef<number>(0);
  const [playheadSyncGeneration, setPlayheadSyncGeneration] = useState(0);
  const onPlayheadTickRef = useRef<(t: number) => void>(() => {});
  const structureTrimBridgeRef = useRef<ReturnType<
    typeof useStructureTimelineTrimBridge
  > | null>(null);

  // Timeline data
  const [timelineData, setTimelineData] = useState<
    TimelineData | BookTimelineData | null
  >(initialData || null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  /** Bumped after structure trim so React remounts row styles (post-preview bailout). */
  const [structureLayoutEpoch, setStructureLayoutEpoch] = useState(0);
  const [beatLayoutEpoch, setBeatLayoutEpoch] = useState(0);
  /** Structure trim grow — does not affect beat pct decode. */
  const [structureElasticDurationSec, setStructureElasticDurationSec] =
    useState(() => Math.max(1e-6, duration));
  /** Beat trim/move grow — does not rebuild VET structure tree. */
  const [beatElasticDurationSec, setBeatElasticDurationSec] = useState(() =>
    Math.max(1e-6, duration),
  );
  useEffect(() => {
    const base = Math.max(1e-6, duration);
    setStructureElasticDurationSec(base);
    setBeatElasticDurationSec(base);
    setPlayheadSyncGeneration((g) => g + 1);
  }, [projectId]);
  useEffect(() => {
    const base = Math.max(1e-6, duration);
    setStructureElasticDurationSec((prev) => Math.max(prev, base));
    setBeatElasticDurationSec((prev) => Math.max(prev, base));
  }, [duration]);
  const bumpStructureDurationSec = useCallback(
    (minSeconds: number) => {
      setStructureElasticDurationSec((prev) => Math.max(prev, minSeconds));
      onProjectDurationSecondsHint?.(minSeconds);
    },
    [onProjectDurationSecondsHint],
  );
  const bumpBeatTimelineDurationSec = useCallback((minSeconds: number) => {
    setBeatElasticDurationSec((prev) => Math.max(prev, minSeconds));
  }, []);
  const onDataChangeRef = useRef(onDataChange);
  const timelineSeededForProjectRef = useRef<string | null>(null);
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  // Beats from database (via useTimelineEditorData)
  const { beats, setBeats, beatsLoading, dbBeatIds, setDbBeatIds } =
    useTimelineEditorData({
      projectId,
      parentBeats,
    });

  // 🧲 BEAT MAGNET (nur Beat-Trim / Ripple)
  const [beatMagnetEnabled, setBeatMagnetEnabled] = useState(true);
  /** Master: wenn aus, kein Snapping am Beat-Trim (CapCut „Autosnap“). */
  const [beatAutosnapEnabled, setBeatAutosnapEnabled] = useState(true);

  // 🧲 CLIP MAGNETS (Act / Sequence / Scene / Shot / Editorial — „Magnet“ = alle Kanten snappen)
  const CLIP_MAGNETS_STORAGE_KEY = `scriptony-timeline-clip-magnets-${projectId}`;
  const [clipMagnets, setClipMagnets] = useState(() => {
    const defaults = {
      act: true,
      sequence: true,
      scene: true,
      shot: true,
      editorialClip: true,
    };
    if (typeof window === "undefined") return defaults;
    try {
      const raw = localStorage.getItem(CLIP_MAGNETS_STORAGE_KEY);
      if (!raw) return defaults;
      const p = JSON.parse(raw) as Record<string, unknown>;
      return {
        act: p.act !== false,
        sequence: p.sequence !== false,
        scene: p.scene !== false,
        shot: p.shot !== false,
        editorialClip: p.editorialClip !== false,
      };
    } catch {
      return defaults;
    }
  });

  const TRACK_AUTOSNAP_STORAGE_KEY = `scriptony-timeline-track-autosnap-v1-${projectId}`;
  type TrackAutosnapKey =
    | "beat"
    | "act"
    | "sequence"
    | "scene"
    | "shot"
    | "editorialClip"
    | "music";
  const [trackAutosnap, setTrackAutosnap] = useState(() => {
    const defaults: Record<TrackAutosnapKey, boolean> = {
      beat: true,
      act: true,
      sequence: true,
      scene: true,
      shot: true,
      editorialClip: true,
      music: true,
    };
    if (typeof window === "undefined") return defaults;
    try {
      const raw = localStorage.getItem(TRACK_AUTOSNAP_STORAGE_KEY);
      if (!raw) return defaults;
      const p = JSON.parse(raw) as Record<string, unknown>;
      (Object.keys(defaults) as TrackAutosnapKey[]).forEach((k) => {
        if (p[k] === false) defaults[k] = false;
      });
      return defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(CLIP_MAGNETS_STORAGE_KEY, JSON.stringify(clipMagnets));
  }, [clipMagnets, CLIP_MAGNETS_STORAGE_KEY]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      TRACK_AUTOSNAP_STORAGE_KEY,
      JSON.stringify(trackAutosnap),
    );
  }, [trackAutosnap, TRACK_AUTOSNAP_STORAGE_KEY]);

  // 🎯 BEAT TRIM STATE
  const [trimingBeat, setTrimingBeat] = useState<{
    id: string;
    handle: "left" | "right";
  } | null>(null);
  const trimStartXRef = useRef(0);
  const trimStartSecRef = useRef(0);
  /** Snapshot at beat trim pointerdown — used on pointerup to diff DB updates via engine commit. */
  const beatTrimSnapshotRef = useRef<BeatsAPI.StoryBeat[] | null>(null);

  // 🎬 CAPCUT-LIKE TRIM STATE (Act / Sequence / Scene / Shot)
  type TrimKind = "act" | "sequence" | "scene" | "shot";
  const [trimingClip, setTrimingClip] = useState<{
    kind: TrimKind;
    id: string;
    handle: "left" | "right";
  } | null>(null);
  const [structureMoveClip, setStructureMoveClip] = useState<{
    kind: TrimKind;
    id: string;
  } | null>(null);
  /** Block Musik/SFX/Shot lane clicks while structure trim/move is active. */
  const blockUnderlyingLanePointerEvents =
    structureMoveClip != null || trimingClip != null;
  const STRUCTURE_BODY_DRAG_THRESHOLD_PX = 5;
  const trimStartXRefClip = useRef(0);
  const trimClipBoundaryStartRef = useRef(0);
  const trimClipCtxRef = useRef<{
    kind: TrimKind;
    actIds?: string[];
    actIndex?: number;
    sequenceIds?: string[];
    seqIndex?: number;
    sceneIds?: string[];
    sceneIndex?: number;
    actStartSec?: number;
    actDurSec?: number;
    seqStartSec?: number;
    seqDurSec?: number;
    sceneStartSec?: number;
    sceneDurSec?: number;
    actDurations?: number[];
    sequenceDurations?: number[];
    sceneDurations?: number[];
    shotIds?: string[];
    shotIndex?: number;
    shotDurations?: number[];
    /** Last shot: drag right edge — grow/shrink last shot, take/give time to earlier shots (same scene duration). */
    trimLastRight?: boolean;
    /** First shot: drag left edge — grow/shrink first shot, take/give time to later shots. */
    trimFirstLeft?: boolean;
    /** Absolute sec end of first shot (boundary shot0|shot1); fixed while trimFirstLeft drag. */
    anchorEndFirstSec?: number;
  } | null>(null);
  const trimClipSnapshotRef = useRef<{
    manualShotDurations: Record<string, number>;
  } | null>(null);
  const trimingClipRef = useRef<typeof trimingClip>(null);
  trimingClipRef.current = trimingClip;

  /** Set synchronously on beat trim pointerdown; window listeners use this (not React state). */
  const beatTrimActiveRef = useRef<{
    id: string;
    handle: "left" | "right";
  } | null>(null);
  /** Set synchronously on clip trim pointerdown before setTrimingClip. */
  const clipTrimActiveRef = useRef<typeof trimingClip>(null);
  const filmLayoutRepairAttemptedRef = useRef(false);
  const beatTrimWindowCleanupRef = useRef<(() => void) | null>(null);
  const clipTrimWindowCleanupRef = useRef<(() => void) | null>(null);
  const beatTrimEndGuardRef = useRef(false);

  const finishBeatTrimPreview = useCallback(
    (snapshotBeatIds: Iterable<string>) => {
      resetBeatLanePreviewStyles(
        beatTrackContainerRef.current,
        new Set(snapshotBeatIds),
      );
      setBeatLayoutEpoch((epoch) => epoch + 1);
    },
    [],
  );
  const clipTrimEndGuardRef = useRef(false);
  const handleTrimMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const handleTrimEndRef = useRef<(e?: PointerEvent) => void | Promise<void>>(
    () => {},
  );
  const handleTrimClipMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const handleTrimClipEndRef = useRef<
    (clientX?: number) => void | Promise<void>
  >(() => {});
  const registerBeatTrimWindowListenersRef = useRef<() => void>(() => {});
  const registerClipTrimWindowListenersRef = useRef<() => void>(() => {});
  const handleNleClipMoveRef = useRef<(e: PointerEvent) => void>(() => {});
  const handleNleClipEndRef = useRef<() => void | Promise<void>>(() => {});
  const registerNleClipTrimWindowListenersRef = useRef<() => void>(() => {});

  // 🚀 EPHEMERAL DRAG ENGINE — ref-based state during drag, single commit on pointerup
  const trimEngine = useTrimDragEngine();
  const beatTrackContainerRef = useRef<HTMLElement | null>(null);
  const beatStackRef = useRef<HTMLElement | null>(null);
  const structureStackRef = useRef<HTMLElement | null>(null);
  const [timelineInteractionMode, setTimelineInteractionMode] =
    useState<TimelineInteractionMode>("move");
  const timelineInteractionModeRef = useRef<TimelineInteractionMode>("move");
  timelineInteractionModeRef.current = timelineInteractionMode;
  const structureMoveBridgeRef = useRef<ReturnType<
    typeof useStructureTimelineMoveBridge
  > | null>(null);
  const structureMoveActiveRef = useRef<{ kind: TrimKind; id: string } | null>(
    null,
  );
  const structureMovePendingRef = useRef<{
    kind: TrimKind;
    id: string;
    pointerId: number;
    clientX: number;
    clientY: number;
    shiftKey: boolean;
    altKey: boolean;
  } | null>(null);
  const structureBodyDragMovedRef = useRef(false);
  const beatMovePendingRef = useRef<{
    beatId: string;
    pointerId: number;
    clientX: number;
    clientY: number;
    shiftKey: boolean;
    altKey: boolean;
  } | null>(null);
  const beatMoveActiveRef = useRef(false);
  const beatMoveEndGuardRef = useRef(false);
  const beatMoveLastClientXRef = useRef(0);

  const actTrackContainerRef = useRef<HTMLElement | null>(null);
  const sequenceTrackContainerRef = useRef<HTMLElement | null>(null);
  const sceneTrackContainerRef = useRef<HTMLElement | null>(null);
  const shotTrackContainerRef = useRef<HTMLElement | null>(null);
  const beatTrimPointerIdRef = useRef<number | null>(null);

  // Buch-Shot legacy trim: duration overrides during drag (film uses VET tree bridge).
  const [manualShotDurations, setManualShotDurations] = useState<
    Record<string, number>
  >({});

  const manualShotDurationsRef = useRef(manualShotDurations);
  if (!clipTrimActiveRef.current) {
    manualShotDurationsRef.current = manualShotDurations;
  }

  type TimingUpdater<T> = (prev: T) => T;

  const queueManualShotDurations = useCallback(
    (action: React.SetStateAction<Record<string, number>>) => {
      const updater: TimingUpdater<Record<string, number>> =
        typeof action === "function"
          ? (action as TimingUpdater<Record<string, number>>)
          : () => action;
      if (!clipTrimActiveRef.current) {
        setManualShotDurations(action);
        return;
      }
      manualShotDurationsRef.current = updater(manualShotDurationsRef.current);
    },
    [],
  );

  const actBlocksRef = useRef<any[]>([]);
  const sequenceBlocksRef = useRef<any[]>([]);
  const sceneBlocksRef = useRef<any[]>([]);
  const shotBlocksRef = useRef<any[]>([]);
  /** Editorial clip blocks (film); used for structure-trim child clamp + NLE track. */
  const clipBlocksRef = useRef<
    Array<{
      id: string;
      sceneId: string;
      shotId?: string;
      startSec: number;
      endSec: number;
    }>
  >([]);
  const timelineDataRef = useRef(timelineData);
  timelineDataRef.current = timelineData;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const pxPerSecRef = useRef(FALLBACK_MIN_PX_PER_SEC);
  const beatMagnetEnabledRef = useRef(beatMagnetEnabled);
  beatMagnetEnabledRef.current = beatMagnetEnabled;
  const beatAutosnapEnabledRef = useRef(beatAutosnapEnabled);
  beatAutosnapEnabledRef.current = beatAutosnapEnabled;
  const clipMagnetsRef = useRef(clipMagnets);
  clipMagnetsRef.current = clipMagnets;
  const trackAutosnapRef = useRef(trackAutosnap);
  trackAutosnapRef.current = trackAutosnap;
  const beatsRef = useRef(beats);
  beatsRef.current = beats;

  const MIN_CLIP_DURATION_SEC = 1; // Consistent with Beat min duration

  /** Live editorial clip bounds during NLE trim drag (pointer session). */
  const [nleClipPreview, setNleClipPreview] = useState<Record<
    string,
    { startSec: number; endSec: number }
  > | null>(null);
  const nleClipDragRef = useRef<{
    clipId: string;
    handle: "left" | "right";
    startClientX: number;
    anchorSec: number;
    origStart: number;
    origEnd: number;
    sceneId: string;
    shotId?: string;
  } | null>(null);
  const nleClipTrimCleanupRef = useRef<(() => void) | null>(null);
  const nleClipFinalBoundsRef = useRef<{
    clipId: string;
    startSec: number;
    endSec: number;
  } | null>(null);
  const clipMigrationAttemptedRef = useRef(false);

  // 🎯 MODAL STATE: Scene Content Editor
  const [editingSceneForModal, setEditingSceneForModal] = useState<any | null>(
    null,
  );
  const [showContentModal, setShowContentModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState<{
    kind: EditableTitleKind;
    id: string;
    value: string;
  } | null>(null);
  const [nodeEditDialogOpen, setNodeEditDialogOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<{
    kind: AddNodeKind | "beat";
    id: string;
    title: string;
    description: string;
  } | null>(null);
  const [focusLinkSection, setFocusLinkSection] = useState(false);
  const [requestOpenLinkPicker, setRequestOpenLinkPicker] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [infoDialogData, setInfoDialogData] = useState<{
    type: "act" | "sequence" | "scene" | "shot";
    node: Act | Sequence | Scene | Shot;
  } | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [pendingAddKind, setPendingAddKind] = useState<AddNodeKind | null>(
    null,
  );
  const [selectedParentId, setSelectedParentId] = useState<string>("");

  // 🎯 DURATION & VIEWPORT (NOW SAFE TO USE timelineData!)
  const totalDurationMin = duration / 60; // Total timeline duration in MINUTES (from prop)
  const layoutDurationSec =
    timelineData &&
    "layoutProjectDurationSec" in timelineData &&
    typeof timelineData.layoutProjectDurationSec === "number" &&
    Number.isFinite(timelineData.layoutProjectDurationSec)
      ? timelineData.layoutProjectDurationSec
      : 0;
  const {
    structureProjectDurationSec,
    beatTimelineDurationSec,
    rulerDurationSec: totalDurationSec,
  } = resolveTimelineDurations({
    durationSec: duration,
    layoutDurationSec,
    structureElasticSec: structureElasticDurationSec,
    beatElasticSec: beatElasticDurationSec,
  });
  const beatTimelineDurationRef = useRef(beatTimelineDurationSec);
  beatTimelineDurationRef.current = beatTimelineDurationSec;

  const timelineZoom = useTimelineZoom({
    scrollRef,
    viewStartSecRef,
    pxPerSecRef,
    totalDurationSec,
    onScroll: () => {
      structureTrimBridgeRef.current?.syncViewportAndReapplyPreview();
    },
  });
  const {
    zoom,
    pxPerSec,
    fitPxPerSec,
    viewportWidth,
    scrollLeft,
    totalWidthPx,
    viewStartSec,
    viewEndSec,
    ticks,
    minorTicks,
    setZoomAroundCursor,
    handleZoomSlider,
    handleWheel,
    formatTimeLabel,
    maxPxPerSec,
  } = timelineZoom;

  const syncBookAtTimeRef = useRef<(timeSec: number) => void>(() => undefined);

  const transport = useTimelineTransport({
    durationSec: totalDurationSec,
    scrollRef,
    viewStartSec,
    pxPerSec,
    viewStartSecRef,
    playheadSyncGeneration,
    onTick: (t) => onPlayheadTickRef.current(t),
    onScrubTimeChange: (t) => syncBookAtTimeRef.current(t),
  });
  const {
    positionSec: currentTime,
    setPositionSec: setCurrentTime,
    playing: isPlaying,
    setPlaying: setIsPlaying,
    positionSecRef: currentTimeRef,
    playingRef: isPlayingRef,
    play,
    pause,
    stop: transportStop,
    seek: playheadSeek,
    reanchorPlaybackClock,
    playheadScrubHandlers,
  } = transport;

  // 📖 BOOK METRICS: Default duration for empty acts
  const DEFAULT_EMPTY_ACT_MIN = 5; // 5 minutes
  const strategy = useMemo(
    () => getTimelineStrategy(projectType),
    [projectType],
  );
  const {
    isBookProject,
    isAudioProject,
    showFilmProductionTracks,
    showFilmClipMagnets,
    showEditorialClipTrack,
    labelByKind,
  } = strategy;
  const isBookProjectRef = useRef<boolean>(isBookProject);
  isBookProjectRef.current = isBookProject;

  const showAudioDawLanes = strategy.resolveShowAudioDawLanes(projectType);

  // 🎯 FULLSCREEN STATE
  const [isFullscreen, setIsFullscreen] = useState(false);

  const structureLayoutFrozenRef =
    useRef<StructureLayoutFrozenRef["current"]>(null);
  const structureLayoutFrozen: StructureLayoutFrozenRef =
    structureLayoutFrozenRef;
  const vetStructureLayoutFrozen = isVetStructureLayoutFrozen({
    trimClip: trimingClip,
    moveClip: structureMoveClip,
  });

  const structureTrimBridge = useStructureTimelineTrimBridge({
    timelineData:
      timelineData && "acts" in timelineData
        ? (timelineData as TimelineData)
        : null,
    projectDurationSec: structureProjectDurationSec,
    viewStartSecRef,
    pxPerSecRef,
    currentTimeSec: currentTime,
    actTrackRef: actTrackContainerRef,
    sequenceTrackRef: sequenceTrackContainerRef,
    sceneTrackRef: sceneTrackContainerRef,
    shotTrackRef: shotTrackContainerRef,
    getAccessToken,
    setTimelineData: (value) => {
      setTimelineData((prev) => {
        const next =
          typeof value === "function"
            ? value(prev as TimelineData | null)
            : value;
        if (!next) return prev;
        const notify = next as TimelineData;
        queueMicrotask(() => onDataChangeRef.current?.(notify));
        return next as typeof prev;
      });
      manualShotDurationsRef.current = {};
      setManualShotDurations({});
    },
    onTrimSessionEnd: () => {
      setStructureLayoutEpoch((epoch) => epoch + 1);
    },
    onProjectDurationGrow: bumpStructureDurationSec,
  });
  structureTrimBridgeRef.current = structureTrimBridge;

  const structureMoveBridge = useStructureTimelineMoveBridge({
    timelineData:
      timelineData && "acts" in timelineData
        ? (timelineData as TimelineData)
        : null,
    projectDurationSec: structureProjectDurationSec,
    currentTimeSec: currentTime,
    viewStartSecRef,
    pxPerSecRef,
    actTrackRef: actTrackContainerRef,
    sequenceTrackRef: sequenceTrackContainerRef,
    sceneTrackRef: sceneTrackContainerRef,
    shotTrackRef: shotTrackContainerRef,
    getAccessToken,
    setTimelineData: (value) => {
      setTimelineData((prev) => {
        const next =
          typeof value === "function"
            ? value(prev as TimelineData | null)
            : value;
        if (!next) return prev;
        const notify = next as TimelineData;
        queueMicrotask(() => onDataChangeRef.current?.(notify));
        return next as typeof prev;
      });
      manualShotDurationsRef.current = {};
      setManualShotDurations({});
    },
    onMoveSessionEnd: () => {
      setStructureMoveClip(null);
      setStructureLayoutEpoch((epoch) => epoch + 1);
    },
  });
  structureMoveBridgeRef.current = structureMoveBridge;

  const beatMoveSession = useBeatMoveSession({
    getContainer: () => beatTrackContainerRef.current,
    durationSecRef: beatTimelineDurationRef,
    pxPerSecRef,
    viewStartSecRef,
    onCommit: async ({ beats: committedLayout, durationScale, snapshot }) => {
      if (durationScale > 1) {
        bumpBeatTimelineDurationSec(
          beatTimelineDurationRef.current * durationScale,
        );
      }
      const orderById = new Map(
        committedLayout.map((b, index) => [b.id, index]),
      );
      const committedById = new Map(committedLayout.map((b) => [b.id, b]));
      setBeats((prev) =>
        prev.map((b) => {
          const next = committedById.get(b.id);
          if (!next) return b;
          return {
            ...b,
            pct_from: next.pct_from,
            pct_to: next.pct_to,
            order_index: orderById.get(b.id) ?? b.order_index,
          };
        }),
      );

      try {
        const dbUpdates = committedLayout.filter((cb) => {
          if (!dbBeatIds.has(cb.id)) return false;
          const snapB = snapshot.find((ob) => ob.id === cb.id);
          return (
            snapB &&
            (cb.pct_from !== snapB.pct_from ||
              cb.pct_to !== snapB.pct_to ||
              orderById.get(cb.id) !==
                snapshot.findIndex((s) => s.id === cb.id))
          );
        });

        for (const b of dbUpdates) {
          await BeatsAPI.updateBeat(b.id, {
            pct_from: b.pct_from,
            pct_to: b.pct_to,
            order_index: orderById.get(b.id),
          });
        }

        if (dbUpdates.length > 0) {
          await queryClient.invalidateQueries({
            queryKey: queryKeys.beats.byProject(projectId),
          });
        }
      } catch (error) {
        console.error("[Beat Move] ❌ Error saving:", error);
        setBeats(
          snapshot.map((b) => {
            const orig = beatsRef.current.find((x) => x.id === b.id);
            return orig ? { ...orig } : (b as BeatsAPI.StoryBeat);
          }),
        );
      }
    },
    onMoveSessionEnd: () => {
      setBeatLayoutEpoch((epoch) => epoch + 1);
    },
  });
  const beatMoveSessionRef = useRef(beatMoveSession);
  beatMoveSessionRef.current = beatMoveSession;
  const beatMarqueeSelectionRef = useRef<TimelineMarqueeSelectionApi | null>(
    null,
  );
  const structureMarqueeSelectionRef =
    useRef<TimelineMarqueeSelectionApi | null>(null);

  // Escape bricht einen laufenden Structure-Trim/Move ab (Plan §5 cancelTrim).
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      if (beatMoveSessionRef.current?.isActive()) {
        beatMoveSessionRef.current.cancelMove();
        beatMoveActiveRef.current = false;
        beatMovePendingRef.current = null;
        beatTrimWindowCleanupRef.current?.();
        beatTrimWindowCleanupRef.current = null;
        return;
      }
      const moveBridge = structureMoveBridgeRef.current;
      if (moveBridge?.handleCancel()) {
        suppressIfActiveStructureGesture();
        clearFrozenStructureRowLayouts(structureLayoutFrozen);
        structureMoveActiveRef.current = null;
        structureMovePendingRef.current = null;
        setStructureMoveClip(null);
        clipTrimWindowCleanupRef.current?.();
        clipTrimWindowCleanupRef.current = null;
        return;
      }
      const bridge = structureTrimBridgeRef.current;
      if (!bridge?.handleCancel()) return;
      suppressIfActiveStructureGesture();
      clearFrozenStructureRowLayouts(structureLayoutFrozen);
      clipTrimActiveRef.current = null;
      setTrimingClip(null);
      clipTrimWindowCleanupRef.current?.();
      clipTrimWindowCleanupRef.current = null;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTrimingClip]);

  // 🎯 TRACK HEIGHTS (CapCut-Style with localStorage)
  const TRACK_CONSTRAINTS = {
    beat: { min: 40, max: 120, default: 64 },
    act: { min: 40, max: 100, default: 48 },
    sequence: { min: 40, max: 80, default: 40 },
    /** min wie Act/Seq — schmale Zeile möglich; volle Scene-Vorschau braucht eher default 120 */
    scene: { min: 40, max: 400, default: 120 },
    shot: { min: 32, max: 90, default: 48 },
    music: { min: 22, max: 72, default: 28 },
    sfx: { min: 22, max: 72, default: 28 },
    editorialClip: { min: 22, max: 72, default: 28 },
  };

  const STORAGE_KEY = `scriptony-timeline-heights-${projectId}`;

  const [trackHeights, setTrackHeights] = useState(() => {
    // Load from localStorage or use defaults
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          return {
            beat: parsed.beat ?? TRACK_CONSTRAINTS.beat.default,
            act: parsed.act ?? TRACK_CONSTRAINTS.act.default,
            sequence: parsed.sequence ?? TRACK_CONSTRAINTS.sequence.default,
            scene: parsed.scene ?? TRACK_CONSTRAINTS.scene.default,
            shot: parsed.shot ?? TRACK_CONSTRAINTS.shot.default,
            music: parsed.music ?? TRACK_CONSTRAINTS.music.default,
            sfx: parsed.sfx ?? TRACK_CONSTRAINTS.sfx.default,
            editorialClip:
              parsed.editorialClip ?? TRACK_CONSTRAINTS.editorialClip.default,
          };
        } catch (e) {
          console.error(
            "[VideoEditorTimeline] Failed to parse stored heights:",
            e,
          );
        }
      }
    }
    return {
      beat: TRACK_CONSTRAINTS.beat.default,
      act: TRACK_CONSTRAINTS.act.default,
      sequence: TRACK_CONSTRAINTS.sequence.default,
      scene: TRACK_CONSTRAINTS.scene.default,
      shot: TRACK_CONSTRAINTS.shot.default,
      music: TRACK_CONSTRAINTS.music.default,
      sfx: TRACK_CONSTRAINTS.sfx.default,
      editorialClip: TRACK_CONSTRAINTS.editorialClip.default,
    };
  });

  // 🎯 RESIZE STATE
  const [resizingTrack, setResizingTrack] = useState<string | null>(null);
  const resizeStartYRef = useRef(0);
  const resizeStartHeightRef = useRef(0);

  // 💾 SAVE HEIGHTS TO LOCALSTORAGE
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trackHeights));
      console.log(
        "[VideoEditorTimeline] 💾 Saved track heights:",
        trackHeights,
      );
    }
  }, [trackHeights, STORAGE_KEY]);

  // 🎯 RESIZE HANDLERS
  const handleResizeStart = (track: string, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingTrack(track);
    resizeStartYRef.current = e.clientY;
    resizeStartHeightRef.current =
      trackHeights[track as keyof typeof trackHeights];
    console.log(
      `[Resize] 🎯 Start resizing ${track} at Y=${e.clientY}, height=${resizeStartHeightRef.current}px`,
    );
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingTrack) return;

    const deltaY = e.clientY - resizeStartYRef.current;
    const newHeight = resizeStartHeightRef.current + deltaY;
    const constraints =
      TRACK_CONSTRAINTS[resizingTrack as keyof typeof TRACK_CONSTRAINTS];
    const clampedHeight = Math.max(
      constraints.min,
      Math.min(constraints.max, newHeight),
    );

    setTrackHeights((prev) => ({
      ...prev,
      [resizingTrack]: clampedHeight,
    }));
  };

  const handleResizeEnd = () => {
    if (resizingTrack) {
      console.log(
        `[Resize] ✅ Finished resizing ${resizingTrack} to ${trackHeights[resizingTrack as keyof typeof trackHeights]}px`,
      );
    }
    setResizingTrack(null);
  };

  const commitBeatBodyMove = (
    pending: NonNullable<typeof beatMovePendingRef.current>,
  ): boolean => {
    const snapshot = beatsRef.current.map((b) => ({
      id: b.id,
      pct_from: b.pct_from,
      pct_to: b.pct_to,
      label: b.label,
    }));
    beatMoveSessionRef.current.startMove({
      beatId: pending.beatId,
      clientX: pending.clientX,
      snapshot,
      selectedIds: beatMarqueeSelectionRef.current?.getGroupMoveIds(
        "beat",
        pending.beatId,
      ),
    });
    beatMoveActiveRef.current = true;
    beatMovePendingRef.current = null;
    structureBodyDragMovedRef.current = true;
    return true;
  };

  const handleBeatMoveMouseDown = (beatId: string, e: React.PointerEvent) => {
    if (timelineInteractionModeRef.current === "select") return;
    if (clipTrimActiveRef.current || beatTrimActiveRef.current) return;
    if (e.shiftKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-beat-trim-handle]")) return;
    if (target.closest("button")) return;

    e.preventDefault();
    e.stopPropagation();
    structureBodyDragMovedRef.current = false;
    beatMovePendingRef.current = {
      beatId,
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
    };
    registerBeatTrimWindowListenersRef.current();
  };

  // 🎯 BEAT TRIM HANDLERS (Pointer Events + Ephemeral Engine)
  const handleTrimStart = (
    beatId: string,
    handle: "left" | "right",
    e: React.PointerEvent,
  ) => {
    if (clipTrimActiveRef.current) return;
    if (beatMovePendingRef.current || beatMoveActiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    beatTrimActiveRef.current = { id: beatId, handle };
    setTrimingBeat({ id: beatId, handle });
    trimStartXRef.current = e.clientX;

    // Pointer capture for touch/pen support — events stay on this element even outside
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    beatTrimPointerIdRef.current = e.pointerId;

    const beat = beats.find((b) => b.id === beatId);
    if (beat) {
      const beatDur = beatTimelineDurationRef.current;
      if (handle === "left") {
        trimStartSecRef.current = (beat.pct_from / 100) * beatDur;
      } else {
        trimStartSecRef.current = (beat.pct_to / 100) * beatDur;
      }
    }
    beatTrimSnapshotRef.current = beats.map((b) => ({ ...b }));

    // Start the ephemeral drag engine (stores snapshot in ref, zero re-renders during drag)
    trimEngine.startBeatTrim(
      beatId,
      handle,
      e.clientX,
      trimStartSecRef.current,
      beats as any[],
    );

    registerBeatTrimWindowListenersRef.current();

    console.log(
      `[Beat Trim] 🎯 Start trimming ${handle} handle of ${beatId} (pointer capture)`,
    );
  };

  // 🧲 BEAT RIPPLE FUNCTIONS (CapCut-Style Magnetic Timeline)
  const MIN_BEAT_DURATION_SEC = 1; // Minimum beat duration (like CapCut's 0.1s, but 1s for beats)
  const SNAP_THRESHOLD_PX = 8; // Pixel-based snapping threshold (CapCut/DaVinci style!)

  /**
   * 🧲 SNAP TIME TO NEAREST EDGE (CapCut/DaVinci Style)
   *
   * Snaps a time value to nearby beats or playhead based on PIXEL distance,
   * not percentage. This ensures consistent snapping behavior at all zoom levels.
   *
   * @param rawSec - Raw time in seconds to snap
   * @param beatsArray - Array of all beats
   * @param duration - Total timeline duration in seconds
   * @param pxPerSec - Current pixels per second (for pixel-based threshold)
   * @param options - Optional: excludeBeatId, snapToPlayheadSec
   * @returns Snapped time in seconds
   */
  function snapTime(
    rawSec: number,
    beatsArray: BeatsAPI.StoryBeat[],
    duration: number,
    pxPerSec: number,
    options?: {
      excludeBeatId?: string;
      snapToPlayheadSec?: number;
    },
  ): number {
    const thresholdSec = SNAP_THRESHOLD_PX / pxPerSec;

    const edges: number[] = [];

    // Add beat edges
    for (const b of beatsArray) {
      if (options?.excludeBeatId && b.id === options.excludeBeatId) continue;
      edges.push((b.pct_from / 100) * duration);
      edges.push((b.pct_to / 100) * duration);
    }

    // Add playhead edge
    if (typeof options?.snapToPlayheadSec === "number") {
      edges.push(options.snapToPlayheadSec);
    }

    let best = rawSec;
    let bestDelta = thresholdSec;

    for (const edge of edges) {
      const delta = Math.abs(rawSec - edge);
      if (delta <= bestDelta) {
        bestDelta = delta;
        best = edge;
      }
    }

    return Math.max(0, Math.min(duration, best));
  }

  /** Snap a timeline boundary (sec) to extra edges + 0/duration; uses same px threshold as beats when magnet is on. */
  function snapClipBoundary(
    rawSec: number,
    extraEdges: number[],
    totalDur: number,
    pxs: number,
    magnet: boolean,
  ): number {
    if (!magnet) return rawSec;
    const thresholdSec = SNAP_THRESHOLD_PX / pxs;
    const edges = [...extraEdges, 0, totalDur];
    let best = rawSec;
    let bestDelta = thresholdSec;
    for (const edge of edges) {
      const d = Math.abs(rawSec - edge);
      if (d <= bestDelta) {
        bestDelta = d;
        best = edge;
      }
    }
    return Math.max(0, Math.min(totalDur, best));
  }

  function resolveActPct(
    actId: string,
    manual: Record<string, { pct_from: number; pct_to: number }>,
    actsOrdered: any[],
  ): { from: number; to: number } {
    const o = manual[actId];
    if (o) return { from: o.pct_from, to: o.pct_to };
    const i = actsOrdered.findIndex((a) => a.id === actId);
    const act = actsOrdered[i];
    const m = act?.metadata;
    if (typeof m?.pct_from === "number" && typeof m?.pct_to === "number") {
      return { from: m.pct_from, to: m.pct_to };
    }
    const n = actsOrdered.length || 1;
    return { from: (i / n) * 100, to: ((i + 1) / n) * 100 };
  }

  function resolveSeqPct(
    seqId: string,
    manual: Record<string, { pct_from: number; pct_to: number }>,
    seqsOrdered: any[],
  ): { from: number; to: number } {
    const o = manual[seqId];
    if (o) return { from: o.pct_from, to: o.pct_to };
    const j = seqsOrdered.findIndex((s) => s.id === seqId);
    const seq = seqsOrdered[j];
    const m = seq?.metadata;
    if (typeof m?.pct_from === "number" && typeof m?.pct_to === "number") {
      return { from: m.pct_from, to: m.pct_to };
    }
    const n = seqsOrdered.length || 1;
    return { from: (j / n) * 100, to: ((j + 1) / n) * 100 };
  }

  function resolveScenePct(
    sceneId: string,
    manual: Record<string, { pct_from: number; pct_to: number }>,
    scenesOrdered: any[],
  ): { from: number; to: number } {
    const o = manual[sceneId];
    if (o) return { from: o.pct_from, to: o.pct_to };
    const j = scenesOrdered.findIndex((s) => s.id === sceneId);
    const sc = scenesOrdered[j];
    const m = sc?.metadata;
    if (typeof m?.pct_from === "number" && typeof m?.pct_to === "number") {
      return { from: m.pct_from, to: m.pct_to };
    }
    const n = scenesOrdered.length || 1;
    return { from: (j / n) * 100, to: ((j + 1) / n) * 100 };
  }

  function collectClipSnapEdgesFilm(includeBeatPct: boolean): number[] {
    const out: number[] = [];
    const dur = durationRef.current;
    const b = beatsRef.current;
    if (includeBeatPct) {
      for (const beat of b) {
        out.push((beat.pct_from / 100) * dur, (beat.pct_to / 100) * dur);
      }
    }
    out.push(currentTimeRef.current);
    for (const ab of actBlocksRef.current) {
      out.push(ab.startSec, ab.endSec);
    }
    for (const sb of sequenceBlocksRef.current) {
      out.push(sb.startSec, sb.endSec);
    }
    for (const scb of sceneBlocksRef.current) {
      out.push(scb.startSec, scb.endSec);
    }
    for (const sh of shotBlocksRef.current) {
      out.push(sh.startSec, sh.endSec);
    }
    return out;
  }

  /** Autosnap master off → keine Kanten; Autosnap an + Magnet aus → nur Playhead; sonst alle Kanten. */
  function getStructureTrimSnapEdges(
    kind: "act" | "sequence" | "scene" | "shot",
  ): number[] {
    const ta = trackAutosnapRef.current;
    const cm = clipMagnetsRef.current;
    if (!ta[kind]) return [];
    if (cm[kind]) return collectClipSnapEdgesFilm(true);
    return [currentTimeRef.current];
  }

  function getEditorialClipTrimSnapEdges(): number[] {
    const ta = trackAutosnapRef.current;
    const cm = clipMagnetsRef.current;
    if (!ta.editorialClip) return [];
    if (cm.editorialClip) return collectClipSnapEdgesFilm(true);
    return [currentTimeRef.current];
  }

  function snapTimePlayheadOnly(
    rawSec: number,
    _beatsArray: BeatsAPI.StoryBeat[],
    duration: number,
    pxPerSec: number,
    options?: { snapToPlayheadSec?: number },
  ): number {
    const ph = options?.snapToPlayheadSec;
    if (typeof ph !== "number") return Math.max(0, Math.min(duration, rawSec));
    const thresholdSec = SNAP_THRESHOLD_PX / pxPerSec;
    const clamped = Math.max(0, Math.min(duration, rawSec));
    return Math.abs(clamped - ph) <= thresholdSec ? ph : clamped;
  }

  /** Buch-Shot legacy trim: DOM preview (left 0 + translateX, aligned with film tree rows). */
  function applyShotTrimPreviewToDOM(
    sceneStartSec: number,
    shotIds: string[],
    durs: number[],
  ) {
    const container = shotTrackContainerRef.current;
    if (!container || !shotIds.length || durs.length !== shotIds.length) return;
    const pxs = pxPerSecRef.current;
    const viewStart = viewStartSecRef.current;
    let cursor = sceneStartSec;
    for (let i = 0; i < shotIds.length; i++) {
      const dur = durs[i];
      const startSec = cursor;
      const endSec = startSec + dur;
      cursor = endSec;
      const el = container.querySelector(
        `[data-shot-id="${shotIds[i]}"]`,
      ) as HTMLElement | null;
      if (!el) continue;
      el.style.transform = `translateX(${(startSec - viewStart) * pxs}px)`;
      el.style.width = `${Math.max(2, (endSec - startSec) * pxs)}px`;
      el.style.left = "0";
    }
  }

  function resetClipPreviewStyles() {
    const selectors: Array<[HTMLElement | null, string]> = [
      [actTrackContainerRef.current, "[data-act-id]"],
      [sequenceTrackContainerRef.current, "[data-sequence-id]"],
      [sceneTrackContainerRef.current, "[data-scene-id]"],
      [shotTrackContainerRef.current, "[data-shot-id]"],
    ];
    for (const [container, selector] of selectors) {
      if (!container) continue;
      const els = container.querySelectorAll(selector);
      els.forEach((el) => {
        const node = el as HTMLElement;
        node.style.transform = "";
        node.style.width = "";
        node.style.left = "";
      });
    }
  }

  const commitStructureBodyMove = (
    pending: NonNullable<typeof structureMovePendingRef.current>,
  ): boolean => {
    const moveBridge = structureMoveBridgeRef.current;
    if (!moveBridge?.enabled) return false;
    const selectableKind = pending.kind as TimelineSelectableKind;
    const groupIds = structureMarqueeSelectionRef.current?.getGroupMoveIds(
      selectableKind,
      pending.id,
    );
    if (
      !moveBridge.tryPointerDown(
        pending.kind,
        pending.id,
        {
          clientX: pending.clientX,
          pointerId: pending.pointerId,
        },
        pending.clientX,
        groupIds,
      )
    ) {
      return false;
    }

    freezeStructureRowLayouts(structureLayoutFrozen, {
      acts: actBlocksRef.current,
      sequences: sequenceBlocksRef.current,
      scenes: sceneBlocksRef.current,
      shots: shotBlocksRef.current,
    });
    setStructureMoveClip({ kind: pending.kind, id: pending.id });
    structureMoveActiveRef.current = { kind: pending.kind, id: pending.id };
    structureMovePendingRef.current = null;
    structureBodyDragMovedRef.current = true;
    return true;
  };

  const handleStructureMoveMouseDown = (
    kind: TrimKind,
    id: string,
    e: React.PointerEvent,
  ) => {
    if (timelineInteractionModeRef.current === "select") return;
    if (beatTrimActiveRef.current) return;
    if (kind === "shot") return;
    if (e.shiftKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-structure-trim-handle]")) return;
    if (target.closest("button")) return;

    const moveBridge = structureMoveBridgeRef.current;
    if (!moveBridge?.enabled) return;

    e.preventDefault();
    e.stopPropagation();

    structureBodyDragMovedRef.current = false;
    structureMovePendingRef.current = {
      kind,
      id,
      pointerId: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
    };
    registerClipTrimWindowListenersRef.current();
  };

  const handleTrimClipMouseDown = (
    kind: TrimKind,
    id: string,
    handle: "left" | "right",
    e: React.PointerEvent,
  ) => {
    if (beatTrimActiveRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const td = timelineDataRef.current;
    if (!td || !("acts" in td) || !td.acts?.length) return;
    // `kind` als TrimKind umkopieren, damit TS den Legacy-Block nicht auf "shot" narrowed.
    const legacyKind: TrimKind = kind;

    // Structure-Trim (alle pct-basierten Projekttypen) über VETILALORAPP-Bridge.
    const isBookShotLegacy =
      legacyKind === "shot" && isBookProject && showFilmProductionTracks;
    if (!isBookShotLegacy) {
      const vetBridge = structureTrimBridgeRef.current;
      if (
        vetBridge?.enabled &&
        vetBridge.tryPointerDown(legacyKind, id, handle, e)
      ) {
        freezeStructureRowLayouts(structureLayoutFrozen, {
          acts: actBlocksRef.current,
          sequences: sequenceBlocksRef.current,
          scenes: sceneBlocksRef.current,
          shots: shotBlocksRef.current,
        });
        clipTrimActiveRef.current = { kind: legacyKind, id, handle };
        setTrimingClip({ kind: legacyKind, id, handle });
        registerClipTrimWindowListenersRef.current();
        return;
      }
      if (legacyKind !== "shot" || !isBookProject) {
        toast.error("Struktur-Trim vorübergehend nicht verfügbar.");
        return;
      }
    }

    // Pointer capture for touch/pen support (after validation so we do not leave capture dangling)
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    trimClipSnapshotRef.current = {
      manualShotDurations: { ...manualShotDurationsRef.current },
    };

    // Buch-Shot Legacy-Trim (kind is always "shot" here).
    {
      const shotsList =
        "shots" in td && Array.isArray(td.shots) ? td.shots : [];
      const shRow = shotsList.find((sh: any) => sh.id === id);
      const sceneId = shRow?.sceneId || shRow?.scene_id;
      if (!sceneId) return;
      const sceneBlock = sceneBlocksRef.current.find(
        (b: any) => b.id === sceneId,
      );
      if (!sceneBlock) return;
      const blocksInScene = shotBlocksRef.current
        .filter(
          (b: any) => ((b as any).sceneId || (b as any).scene_id) === sceneId,
        )
        .sort((a: any, b: any) => a.startSec - b.startSec);
      const idx = blocksInScene.findIndex((b: any) => b.id === id);
      if (idx < 0) return;
      const n = blocksInScene.length;
      const shb = blocksInScene[idx];
      const durs = blocksInScene.map((b: any) =>
        Math.max(0, b.endSec - b.startSec),
      );
      const sceneStartSec = sceneBlock.startSec;
      const sceneDurSec = Math.max(0, sceneBlock.endSec - sceneBlock.startSec);

      if (handle === "right" && idx === n - 1) {
        trimClipBoundaryStartRef.current = shb.endSec;
        trimStartXRefClip.current = e.clientX;
        trimClipCtxRef.current = {
          kind: "shot",
          shotIds: blocksInScene.map((b: any) => b.id),
          shotIndex: idx,
          sceneStartSec,
          sceneDurSec,
          shotDurations: durs,
          trimLastRight: true,
        };
        clipTrimActiveRef.current = { kind: "shot", id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: "shot", id, handle });
        return;
      }
      if (handle === "left" && idx === 0) {
        trimClipBoundaryStartRef.current = shb.startSec;
        trimStartXRefClip.current = e.clientX;
        trimClipCtxRef.current = {
          kind: "shot",
          shotIds: blocksInScene.map((b: any) => b.id),
          shotIndex: idx,
          sceneStartSec,
          sceneDurSec,
          shotDurations: durs,
          trimFirstLeft: true,
          anchorEndFirstSec: shb.endSec,
        };
        clipTrimActiveRef.current = { kind: "shot", id, handle };
        registerClipTrimWindowListenersRef.current();
        setTrimingClip({ kind: "shot", id, handle });
        return;
      }
      trimClipBoundaryStartRef.current =
        handle === "left" ? shb.startSec : shb.endSec;
      trimStartXRefClip.current = e.clientX;
      trimClipCtxRef.current = {
        kind: "shot",
        shotIds: blocksInScene.map((b: any) => b.id),
        shotIndex: idx,
        sceneStartSec,
        sceneDurSec,
        shotDurations: durs,
      };
      clipTrimActiveRef.current = { kind: "shot", id, handle };
      registerClipTrimWindowListenersRef.current();
      setTrimingClip({ kind: "shot", id, handle });
    }
  };

  /**
   * Structure trim — nur Buch-Shots (Plan §11.8) gehen durch diesen Legacy-Pfad.
   * Act/Sequence/Scene/Shot für Film-Projekte laufen über VETILALORAPP-Bridge
   * (siehe useVetStructureTrimBridge). Outer-Trim-Helper aus
   * `book-shot-outer-trim` setzen die Dauer-Budgets für den ersten/letzten
   * Buch-Shot-Handle unter Berücksichtigung des Child-Hull.
   */
  const handleTrimClipMove = (e: PointerEvent) => {
    const pending = structureMovePendingRef.current;
    if (pending) {
      const dx = e.clientX - pending.clientX;
      const dy = e.clientY - pending.clientY;
      if (Math.hypot(dx, dy) < STRUCTURE_BODY_DRAG_THRESHOLD_PX) return;

      if (
        pending.kind !== "shot" &&
        shouldUseMarqueeInsteadOfBodyMove({
          dx,
          dy,
          thresholdPx: STRUCTURE_BODY_DRAG_THRESHOLD_PX,
          shiftKey: pending.shiftKey,
          altKey: pending.altKey,
          interactionMode: timelineInteractionModeRef.current,
        })
      ) {
        structureMarqueeSelectionRef.current?.beginMarqueeGesture({
          pointerId: pending.pointerId,
          startClientX: pending.clientX,
          startClientY: pending.clientY,
          additive: pending.shiftKey,
          clientX: e.clientX,
          clientY: e.clientY,
        });
        structureMovePendingRef.current = null;
        return;
      }

      if (!commitStructureBodyMove(pending)) {
        structureMovePendingRef.current = null;
        clipTrimWindowCleanupRef.current?.();
        clipTrimWindowCleanupRef.current = null;
        return;
      }
    }

    if (structureTrimBridgeRef.current?.handleMove(e)) return;
    if (structureMoveBridgeRef.current?.handleMove(e)) return;

    const clip = clipTrimActiveRef.current ?? trimingClipRef.current;
    const ctx = trimClipCtxRef.current;
    if (!clip || !ctx || ctx.kind !== clip.kind) return;

    // Film-Kinds gehen immer über VETILALORAPP-Bridge; Legacy-Pfad ist Buch-Shots vorbehalten.
    if (clip.kind !== "shot") return;
    // Film-Shots gehen ebenfalls über Bridge; nur Buch-Shots nutzen Legacy.
    if (!isBookProjectRef.current) return;
    const dTotal = durationRef.current;
    const pxs = pxPerSecRef.current;
    const snapEdges = getStructureTrimSnapEdges("shot");
    const magnet = snapEdges.length > 0;
    const deltaSec = (e.clientX - trimStartXRefClip.current) / pxs;
    let newBoundarySec = trimClipBoundaryStartRef.current + deltaSec;
    const td = timelineDataRef.current;
    if (!td || !("acts" in td)) return;

    if (
      ctx.kind === "shot" &&
      ctx.shotIds &&
      ctx.sceneStartSec !== undefined &&
      ctx.sceneDurSec !== undefined &&
      ctx.shotDurations
    ) {
      const sceneStart = ctx.sceneStartSec;
      const sceneDur = ctx.sceneDurSec;
      const ids = ctx.shotIds;
      const minD = MIN_CLIP_DURATION_SEC;
      const n = ids.length;

      const commitShotDurs = (durs: number[]) => {
        trimClipCtxRef.current = { ...ctx, shotDurations: durs };
        queueManualShotDurations((prev) => {
          const next = { ...prev };
          ids.forEach((sid, idx) => {
            next[sid] = durs[idx];
          });
          return next;
        });
        trimEngine.scheduleRAF(() => {
          const c = trimClipCtxRef.current;
          if (
            !c ||
            c.kind !== "shot" ||
            !c.shotIds ||
            !c.shotDurations ||
            c.sceneStartSec === undefined
          ) {
            return;
          }
          applyShotTrimPreviewToDOM(
            c.sceneStartSec,
            c.shotIds,
            c.shotDurations,
          );
        });
      };

      if (ctx.trimLastRight) {
        let durs = [...ctx.shotDurations];
        if (n === 1) {
          const lastStart = sceneStart;
          let newEnd = newBoundarySec;
          newEnd = Math.max(
            lastStart + minD,
            Math.min(sceneStart + sceneDur, newEnd),
          );
          if (magnet) {
            newEnd = snapClipBoundary(newEnd, snapEdges, dTotal, pxs, true);
            newEnd = Math.max(
              lastStart + minD,
              Math.min(sceneStart + sceneDur, newEnd),
            );
          }
          const rightHullEnd = maxClipEndForShot(ids[0], clipBlocksRef.current);
          if (rightHullEnd != null) {
            newEnd = Math.max(rightHullEnd, newEnd);
          }
          durs[0] = newEnd - lastStart;
        } else {
          const lastStartRel = durs.slice(0, n - 1).reduce((s, x) => s + x, 0);
          const lastStart = sceneStart + lastStartRel;
          let newEnd = newBoundarySec;
          newEnd = Math.max(
            lastStart + minD,
            Math.min(sceneStart + sceneDur, newEnd),
          );
          if (magnet) {
            newEnd = snapClipBoundary(newEnd, snapEdges, dTotal, pxs, true);
            newEnd = Math.max(
              lastStart + minD,
              Math.min(sceneStart + sceneDur, newEnd),
            );
          }
          let newLastDur = newEnd - lastStart;
          newLastDur = clampOuterLastDurationToChildHull({
            desiredLastDur: newLastDur,
            pairStartSec:
              sceneStart + durs.slice(0, n - 2).reduce((s, x) => s + x, 0),
            totalEndSec: sceneStart + sceneDur,
            minD,
            leftHullEndSec: maxClipEndForShot(
              ids[n - 2],
              clipBlocksRef.current,
            ),
            rightHullStartSec: minClipStartForShot(
              ids[n - 1],
              clipBlocksRef.current,
            ),
          });
          durs = outerTrimAdjustLastPair(durs, newLastDur, sceneDur, minD);
        }
        commitShotDurs(durs);
        return;
      }

      if (ctx.trimFirstLeft && ctx.anchorEndFirstSec !== undefined) {
        const anchorEnd = ctx.anchorEndFirstSec;
        let durs = [...ctx.shotDurations];
        if (n === 1) {
          let newStart = newBoundarySec;
          newStart = Math.max(sceneStart, Math.min(anchorEnd - minD, newStart));
          if (magnet) {
            newStart = snapClipBoundary(newStart, snapEdges, dTotal, pxs, true);
            newStart = Math.max(
              sceneStart,
              Math.min(anchorEnd - minD, newStart),
            );
          }
          const leftHullStart = minClipStartForShot(
            ids[0],
            clipBlocksRef.current,
          );
          if (leftHullStart != null) {
            newStart = Math.min(leftHullStart, newStart);
          }
          durs[0] = anchorEnd - newStart;
        } else {
          let newStart = newBoundarySec;
          newStart = Math.max(sceneStart, Math.min(anchorEnd - minD, newStart));
          if (magnet) {
            newStart = snapClipBoundary(newStart, snapEdges, dTotal, pxs, true);
            newStart = Math.max(
              sceneStart,
              Math.min(anchorEnd - minD, newStart),
            );
          }
          let newFirstDur = Math.max(minD, anchorEnd - newStart);
          newFirstDur = clampOuterFirstDurationToChildHull({
            desiredFirstDur: newFirstDur,
            totalStartSec: sceneStart,
            pairEndSec: sceneStart + durs[0] + durs[1],
            minD,
            leftHullEndSec: maxClipEndForShot(ids[0], clipBlocksRef.current),
            rightHullStartSec: minClipStartForShot(
              ids[1],
              clipBlocksRef.current,
            ),
          });
          durs = outerTrimAdjustFirstPair(durs, newFirstDur, sceneDur, minD);
        }
        commitShotDurs(durs);
        return;
      }

      if (ctx.shotIndex === undefined) return;
      const durs = [...ctx.shotDurations];
      const i = ctx.shotIndex;
      const j = clip.handle === "left" ? i : i + 1;
      const pairLeft = j - 1;
      const P = durs.slice(0, pairLeft).reduce((s, x) => s + x, 0);
      const pairSum = durs[pairLeft] + durs[j];
      const minPairLeft = MIN_CLIP_DURATION_SEC;
      const maxPairLeft = pairSum - MIN_CLIP_DURATION_SEC;
      let newPairLeft = newBoundarySec - sceneStart - P;
      newPairLeft = Math.max(minPairLeft, Math.min(maxPairLeft, newPairLeft));
      if (magnet) {
        const boundaryAbs = sceneStart + P + newPairLeft;
        const snapped = snapClipBoundary(
          boundaryAbs,
          snapEdges,
          dTotal,
          pxs,
          true,
        );
        newPairLeft = snapped - sceneStart - P;
        newPairLeft = Math.max(minPairLeft, Math.min(maxPairLeft, newPairLeft));
      }
      {
        const leftId = ids[pairLeft];
        const rightId = ids[j];
        const cmax = maxClipEndForShot(leftId, clipBlocksRef.current);
        const cmin = minClipStartForShot(rightId, clipBlocksRef.current);
        let minPL = minPairLeft;
        let maxPL = maxPairLeft;
        if (cmax != null) minPL = Math.max(minPL, cmax - sceneStart - P);
        if (cmin != null) maxPL = Math.min(maxPL, cmin - sceneStart - P);
        if (minPL <= maxPL + 1e-4) {
          newPairLeft = Math.max(minPL, Math.min(maxPL, newPairLeft));
        }
      }
      const d1 = newPairLeft;
      const d2 = pairSum - d1;
      durs[pairLeft] = d1;
      durs[j] = d2;
      trimClipCtxRef.current = { ...ctx, shotDurations: durs };
      queueManualShotDurations((prev) => {
        const next = { ...prev };
        next[ids[pairLeft]] = d1;
        next[ids[j]] = d2;
        return next;
      });
    }
  };

  const hadActiveStructureGesture = (): boolean =>
    structureMoveActiveRef.current != null ||
    structureBodyDragMovedRef.current ||
    structureMoveBridgeRef.current?.isActive() === true ||
    structureTrimBridgeRef.current?.isActive() === true ||
    clipTrimActiveRef.current != null;

  const suppressIfActiveStructureGesture = (): void => {
    if (hadActiveStructureGesture()) {
      suppressTrailingPointerActivation();
    }
  };

  const handleTrimClipEnd = async (clientX?: number) => {
    if (clipTrimEndGuardRef.current) return;
    clipTrimEndGuardRef.current = true;

    if (structureMovePendingRef.current) {
      structureMovePendingRef.current = null;
      clipTrimEndGuardRef.current = false;
      clipTrimWindowCleanupRef.current?.();
      clipTrimWindowCleanupRef.current = null;
      return;
    }

    const moveBridge = structureMoveBridgeRef.current;
    if (structureMoveActiveRef.current || moveBridge?.isActive()) {
      suppressTrailingPointerActivation();
      await moveBridge?.handleEnd(clientX);
      clearFrozenStructureRowLayouts(structureLayoutFrozen);
      structureMoveActiveRef.current = null;
      setStructureMoveClip(null);
      clipTrimEndGuardRef.current = false;
      clipTrimWindowCleanupRef.current?.();
      clipTrimWindowCleanupRef.current = null;
      return;
    }

    const clip = clipTrimActiveRef.current ?? trimingClipRef.current;
    if (!clip) {
      clipTrimEndGuardRef.current = false;
      return;
    }

    if (await structureTrimBridgeRef.current?.handleEnd(clientX)) {
      suppressTrailingPointerActivation();
      clearFrozenStructureRowLayouts(structureLayoutFrozen);
      clipTrimActiveRef.current = null;
      setTrimingClip(null);
      clipTrimEndGuardRef.current = false;
      clipTrimWindowCleanupRef.current?.();
      clipTrimWindowCleanupRef.current = null;
      return;
    }

    if (await structureMoveBridgeRef.current?.handleEnd()) {
      suppressTrailingPointerActivation();
      clearFrozenStructureRowLayouts(structureLayoutFrozen);
      structureMoveActiveRef.current = null;
      setStructureMoveClip(null);
      clipTrimEndGuardRef.current = false;
      clipTrimWindowCleanupRef.current?.();
      clipTrimWindowCleanupRef.current = null;
      return;
    }

    // Film-Kinds gehen immer über VETILALORAPP-Bridge; Legacy-Persist ist Buch-Shots vorbehalten.
    // `clip.kind` als TrimKind-typed Variable umkopieren, damit TS den Legacy-Block
    // nicht auf "shot" narrowed.
    const legacyKind: TrimKind = clip.kind;
    if (legacyKind !== "shot" || !isBookProjectRef.current) {
      clipTrimActiveRef.current = null;
      setTrimingClip(null);
      clipTrimEndGuardRef.current = false;
      return;
    }

    clipTrimWindowCleanupRef.current?.();
    clipTrimWindowCleanupRef.current = null;

    setManualShotDurations({ ...manualShotDurationsRef.current });
    resetClipPreviewStyles();

    const snap = trimClipSnapshotRef.current;
    const td = timelineDataRef.current;

    const revert = () => {
      if (snap) {
        setManualShotDurations(snap.manualShotDurations);
      }
    };

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Nicht authentifiziert");
        revert();
        clipTrimActiveRef.current = null;
        setTrimingClip(null);
        trimClipCtxRef.current = null;
        clipTrimEndGuardRef.current = false;
        return;
      }

      if (td && "shots" in td) {
        const ctxEnd = trimClipCtxRef.current;
        if (ctxEnd?.kind === "shot" && ctxEnd.shotIds && ctxEnd.shotDurations) {
          const ids = ctxEnd.shotIds;
          const durs = ctxEnd.shotDurations;
          const snapD = snap?.manualShotDurations ?? {};

          const timelineShotTotalSec = (shotId: string): number | undefined => {
            const sh = (td.shots || []).find((x: any) => x.id === shotId);
            if (!sh) return undefined;
            const mRaw = sh.shotlengthMinutes ?? sh.shotlength_minutes ?? 0;
            const sRaw = sh.shotlengthSeconds ?? sh.shotlength_seconds;
            if (typeof sRaw !== "number" || !Number.isFinite(sRaw))
              return undefined;
            const mi =
              typeof mRaw === "number" && Number.isFinite(mRaw)
                ? Math.max(0, Math.floor(mRaw))
                : 0;
            const s = Math.round(sRaw);
            const t = mi * 60 + s;
            return t > 0 ? t : undefined;
          };

          const pushShotApi = async (shotId: string, totalSec: number) => {
            if (!isPersistedTimelineNodeId(shotId)) return;
            const total = Math.max(
              MIN_CLIP_DURATION_SEC,
              Math.round(Number(totalSec)),
            );
            const minutes = Math.floor(total / 60);
            const seconds = total % 60;
            await ShotsAPI.updateShot(
              shotId,
              {
                shotlengthMinutes: minutes,
                shotlengthSeconds: seconds,
                duration: `${total}s`,
              },
              token,
            );
          };

          const patchTimelineShotsFromDurs = () => {
            setTimelineData((prev) => {
              if (!prev || !("shots" in prev)) return prev;
              return {
                ...prev,
                shots: (prev.shots ?? []).map((sh: any) => {
                  const ix = ids.indexOf(sh.id);
                  if (ix < 0) return sh;
                  const total = Math.max(
                    MIN_CLIP_DURATION_SEC,
                    Math.round(Number(durs[ix])),
                  );
                  const minutes = Math.floor(total / 60);
                  const seconds = total % 60;
                  return {
                    ...sh,
                    shotlengthMinutes: minutes,
                    shotlengthSeconds: seconds,
                    shotlength_minutes: minutes,
                    shotlength_seconds: seconds,
                    duration: `${total}s`,
                  };
                }),
              };
            });
            setManualShotDurations((prev) => {
              const next = { ...prev };
              for (const sid of ids) delete next[sid];
              return next;
            });
          };

          if (ctxEnd.trimLastRight || ctxEnd.trimFirstLeft) {
            for (let i = 0; i < ids.length; i++) {
              const sid = ids[i];
              const newTotal = Math.max(
                MIN_CLIP_DURATION_SEC,
                Math.round(Number(durs[i])),
              );
              const fromSnap = snapD[sid];
              const baseline =
                fromSnap !== undefined
                  ? Math.round(fromSnap)
                  : timelineShotTotalSec(sid);
              if (baseline === undefined || newTotal !== baseline) {
                await pushShotApi(sid, newTotal);
              }
            }
            patchTimelineShotsFromDurs();
          } else if (ctxEnd.shotIndex !== undefined) {
            const i = ctxEnd.shotIndex;
            const toWrite: [string, string] =
              clip.handle === "left"
                ? [ids[i - 1], ids[i]]
                : [ids[i], ids[i + 1]];
            const idxA = clip.handle === "left" ? i - 1 : i;
            const idxB = clip.handle === "left" ? i : i + 1;
            await pushShotApi(toWrite[0], durs[idxA]);
            await pushShotApi(toWrite[1], durs[idxB]);
            patchTimelineShotsFromDurs();
          }
        }
      }
    } catch (err) {
      console.error("[Clip Trim] save failed", err);
      toast.error("Trim konnte nicht gespeichert werden");
      revert();
    }

    clipTrimActiveRef.current = null;
    setTrimingClip(null);
    trimClipCtxRef.current = null;
    trimClipSnapshotRef.current = null;
    clipTrimEndGuardRef.current = false;
  };

  const handleNleClipPointerDown = (
    row: {
      id: string;
      sceneId: string;
      shotId?: string;
      startSec: number;
      endSec: number;
    },
    handle: "left" | "right",
    e: React.PointerEvent,
  ) => {
    if (
      clipTrimActiveRef.current ||
      beatTrimActiveRef.current ||
      trimingClipRef.current
    )
      return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    nleClipDragRef.current = {
      clipId: row.id,
      handle,
      startClientX: e.clientX,
      anchorSec: handle === "left" ? row.startSec : row.endSec,
      origStart: row.startSec,
      origEnd: row.endSec,
      sceneId: row.sceneId,
      shotId: row.shotId,
    };
    nleClipFinalBoundsRef.current = {
      clipId: row.id,
      startSec: row.startSec,
      endSec: row.endSec,
    };
    setNleClipPreview({
      [row.id]: { startSec: row.startSec, endSec: row.endSec },
    });
    registerNleClipTrimWindowListenersRef.current();
  };

  const handleNleClipMove = (e: PointerEvent) => {
    const drag = nleClipDragRef.current;
    if (!drag) return;
    const pxs = pxPerSecRef.current;
    const dTotal = durationRef.current;
    const deltaSec = (e.clientX - drag.startClientX) / pxs;
    let start = drag.origStart;
    let end = drag.origEnd;
    if (drag.handle === "left") {
      start = drag.anchorSec + deltaSec;
    } else {
      end = drag.anchorSec + deltaSec;
    }
    if (end - start < MIN_CLIP_DURATION_SEC) {
      if (drag.handle === "left") start = end - MIN_CLIP_DURATION_SEC;
      else end = start + MIN_CLIP_DURATION_SEC;
    }
    start = Math.max(0, Math.min(dTotal, start));
    end = Math.max(0, Math.min(dTotal, end));
    let parentStart = 0;
    let parentEnd = dTotal;
    const sc = sceneBlocksRef.current.find((b: any) => b.id === drag.sceneId);
    if (sc) {
      parentStart = Math.max(parentStart, sc.startSec);
      parentEnd = Math.min(parentEnd, sc.endSec);
    }
    const sh =
      drag.shotId != null
        ? shotBlocksRef.current.find((b: any) => b.id === drag.shotId)
        : null;
    if (sh) {
      parentStart = Math.max(parentStart, sh.startSec);
      parentEnd = Math.min(parentEnd, sh.endSec);
    }
    start = Math.max(parentStart, Math.min(parentEnd, start));
    end = Math.max(parentStart, Math.min(parentEnd, end));
    if (end - start < MIN_CLIP_DURATION_SEC) return;
    const edSnap = getEditorialClipTrimSnapEdges();
    if (edSnap.length > 0) {
      if (drag.handle === "left") {
        start = snapClipBoundary(start, edSnap, dTotal, pxs, true);
      } else {
        end = snapClipBoundary(end, edSnap, dTotal, pxs, true);
      }
      start = Math.max(parentStart, Math.min(parentEnd, start));
      end = Math.max(parentStart, Math.min(parentEnd, end));
      if (end - start < MIN_CLIP_DURATION_SEC) {
        if (drag.handle === "left") start = end - MIN_CLIP_DURATION_SEC;
        else end = start + MIN_CLIP_DURATION_SEC;
      }
      start = Math.max(parentStart, Math.min(parentEnd, start));
      end = Math.max(parentStart, Math.min(parentEnd, end));
      if (end - start < MIN_CLIP_DURATION_SEC) return;
    }
    nleClipFinalBoundsRef.current = {
      clipId: drag.clipId,
      startSec: start,
      endSec: end,
    };
    setNleClipPreview({ [drag.clipId]: { startSec: start, endSec: end } });
  };

  const handleNleClipEnd = async () => {
    nleClipTrimCleanupRef.current?.();
    nleClipTrimCleanupRef.current = null;
    nleClipDragRef.current = null;
    setNleClipPreview(null);
    const bounds = nleClipFinalBoundsRef.current;
    nleClipFinalBoundsRef.current = null;
    if (!bounds) return;

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Nicht authentifiziert");
        return;
      }
      const td = timelineDataRef.current as TimelineData | null;
      if (!td?.clips?.length) return;
      const clipEnt = td.clips.find((c) => c.id === bounds.clipId);
      if (!clipEnt) return;

      const { startSec, endSec } = bounds;
      const updated = await ClipsAPI.updateClip(
        bounds.clipId,
        { startSec, endSec },
        token,
      );

      const scene = td.scenes?.find((s) => s.id === clipEnt.sceneId);
      const seq = scene
        ? td.sequences?.find((s) => s.id === scene.sequenceId)
        : undefined;
      const act = seq ? td.acts?.find((a) => a.id === seq.actId) : undefined;
      const sceneBlock = sceneBlocksRef.current.find(
        (b: any) => b.id === clipEnt.sceneId,
      );
      const sequenceBlock = seq
        ? sequenceBlocksRef.current.find((b: any) => b.id === seq.id)
        : undefined;
      const actBlock = act
        ? actBlocksRef.current.find((b: any) => b.id === act.id)
        : undefined;
      const totalDur = durationRef.current;

      let exp: ReturnType<typeof expandStructurePctToFitClip> | null = null;
      if (sceneBlock && sequenceBlock && actBlock) {
        exp = expandStructurePctToFitClip({
          clip: { startSec, endSec, sceneId: clipEnt.sceneId },
          actBlock,
          sequenceBlock,
          sceneBlock,
          totalDur,
        });
        if (exp.act && act && isPersistedTimelineNodeId(act.id)) {
          await TimelineAPI.updateAct(
            act.id,
            {
              metadata: {
                ...(act.metadata || {}),
                pct_from: exp.act.pct_from,
                pct_to: exp.act.pct_to,
              },
            },
            token,
          );
        }
        if (exp.sequence && seq && isPersistedTimelineNodeId(seq.id)) {
          await TimelineAPI.updateSequence(
            seq.id,
            {
              metadata: {
                ...(seq.metadata || {}),
                pct_from: exp.sequence.pct_from,
                pct_to: exp.sequence.pct_to,
              },
            },
            token,
          );
        }
        if (exp.scene && scene && isPersistedTimelineNodeId(scene.id)) {
          await TimelineAPI.updateScene(
            scene.id,
            {
              metadata: {
                ...(scene.metadata || {}),
                pct_from: exp.scene.pct_from,
                pct_to: exp.scene.pct_to,
              },
            },
            token,
          );
        }
      }

      const nextData: TimelineData = {
        ...td,
        clips: td.clips.map((c) =>
          c.id === updated.id ? { ...c, ...updated } : c,
        ),
        acts: td.acts.map((a) => {
          if (!exp?.act || !act || a.id !== act.id) return a;
          return {
            ...a,
            metadata: {
              ...(a.metadata || {}),
              pct_from: exp.act.pct_from,
              pct_to: exp.act.pct_to,
            },
          };
        }),
        sequences: td.sequences.map((s) => {
          if (!exp?.sequence || !seq || s.id !== seq.id) return s;
          return {
            ...s,
            metadata: {
              ...(s.metadata || {}),
              pct_from: exp.sequence.pct_from,
              pct_to: exp.sequence.pct_to,
            },
          };
        }),
        scenes: td.scenes.map((s) => {
          if (!exp?.scene || !scene || s.id !== scene.id) return s;
          return {
            ...s,
            metadata: {
              ...(s.metadata || {}),
              pct_from: exp.scene.pct_from,
              pct_to: exp.scene.pct_to,
            },
          };
        }),
      };

      setTimelineData(nextData);
      onDataChange?.(nextData);
    } catch (e) {
      console.error("[NLE clip trim]", e);
      toast.error("Clip-Update fehlgeschlagen");
    }
  };

  /* OLD - REPLACED BY handleTrimMoveSimplified
  const handleTrimMove = (e: MouseEvent) => {
    if (!trimingBeat) return;
    
    const deltaX = e.clientX - trimStartXRef.current;
    const deltaSec = deltaX / pxPerSec;
    let newSec = trimStartSecRef.current + deltaSec;
    
    // Get current beat
    const beat = beats.find(b => b.id === trimingBeat.id);
    if (!beat) return;
    
    if (trimingBeat.handle === 'left') {
      // LEFT HANDLE: Resize from start
      const beatEndSec = (beat.pct_to / 100) * duration;
      
      // Clamp to min duration and bounds
      newSec = Math.max(0, Math.min(beatEndSec - MIN_BEAT_DURATION_SEC, newSec));
      
      // 🧲 SNAP (if magnet enabled)
      if (beatMagnetEnabled) {
        newSec = snapTime(newSec, beats, duration, pxPerSec, {
          excludeBeatId: trimingBeat.id,
          snapToPlayheadSec: currentTimeRef.current
        });
      }
      
      // ✅ Convert snapped seconds to percentage
      let newPctFrom = (newSec / duration) * 100;
      
      // 🧲 FIND ADJACENT BEAT (based on NEW position for accurate snapping!)
      const otherBeats = beats
        .filter(b => b.id !== trimingBeat.id)
        .sort((a, b) => a.pct_from - b.pct_from);
      
      // Find beat immediately above (closest beat that ends BEFORE new position)
      const beatsAbove = otherBeats.filter(b => b.pct_to <= newPctFrom);
      const beatAbove = beatsAbove.length > 0 ? beatsAbove[beatsAbove.length - 1] : null;
      
      console.log(`[Beat Trim] 📍 LEFT: "${beat.label}" moving to ${newPctFrom.toFixed(1)}%`, {
        magnetEnabled: beatMagnetEnabled,
        beatAbove: beatAbove ? `"${beatAbove.label}" ends at ${beatAbove.pct_to.toFixed(1)}%` : 'none'
      });
      
      // 🧲 SNAP FIRST (if magnet enabled and close enough)
      if (beatAbove && beatMagnetEnabled) {
        const distance = Math.abs(newPctFrom - beatAbove.pct_to);
        if (distance < SNAP_THRESHOLD_PERCENT) {
          console.log(`[Beat Trim] 🧲 LEFT snapped! Distance=${distance.toFixed(2)}%`);
          newPctFrom = beatAbove.pct_to;
        }
      }
      
      // 🚫 THEN PREVENT OVERLAP: Can't go above beatAbove's bottom
      if (beatAbove) {
        const minAllowed = beatAbove.pct_to;
        if (newPctFrom < minAllowed) {
          console.log(`[Beat Trim] 🚫 LEFT blocked at ${minAllowed}%`);
          newPctFrom = minAllowed;
        }
      }
      
      // 🚫 Min beat duration
      const maxAllowed = beat.pct_to - (MIN_BEAT_DURATION_SEC / duration * 100);
      newPctFrom = Math.min(newPctFrom, maxAllowed);
      
      setBeats(prev => prev.map(b =>
        b.id === trimingBeat.id ? { ...b, pct_from: newPctFrom } : b
      ));
      
    } else {
      // RIGHT HANDLE: Resize from end (CapCut/DaVinci Magnet Style)
      const oldStartSec = (beat.pct_from / 100) * duration;
      let clampedEndSec = Math.max(oldStartSec + MIN_BEAT_DURATION_SEC, Math.min(duration, newSec));
      let newPctTo = (clampedEndSec / duration) * 100;
      
      // 🧲 FIND ADJACENT BEAT (based on NEW position for accurate snapping!)
      const otherBeats = beats
        .filter(b => b.id !== trimingBeat.id)
        .sort((a, b) => a.pct_from - b.pct_from);
      
      // Find beat immediately below (closest beat that starts AFTER CURRENT end)
      const beatsBelow = otherBeats.filter(b => b.pct_from >= beat.pct_to);
      const beatBelow = beatsBelow.length > 0 ? beatsBelow[0] : null;
      
      console.log(`[Beat Trim] 📍 RIGHT: "${beat.label}" moving to ${newPctTo.toFixed(1)}%`, {
        magnetEnabled: beatMagnetEnabled,
        beatBelow: beatBelow ? `"${beatBelow.label}" starts at ${beatBelow.pct_from.toFixed(1)}%` : 'none'
      });
      
      // CAPCUT/DAVINCI MAGNET: Snapping + Hard Stop
      if (beatBelow) {
        // SNAP if close enough and magnet enabled
        if (beatMagnetEnabled) {
          const distance = Math.abs(newPctTo - beatBelow.pct_from);
          if (distance < SNAP_THRESHOLD_PERCENT) {
            newPctTo = beatBelow.pct_from;
          }
        }
        
        // HARD STOP: Prevent overlap (always active)
        if (newPctTo > beatBelow.pct_from) {
          newPctTo = beatBelow.pct_from;
        }
      }
      
      // 🚫 Min beat duration
      const minAllowed = beat.pct_from + (MIN_BEAT_DURATION_SEC / duration * 100);
      newPctTo = Math.max(newPctTo, minAllowed);
      
      setBeats(prev => prev.map(b =>
        b.id === trimingBeat.id ? { ...b, pct_to: newPctTo } : b
      ));
    }
  };
  */

  // 🆕 EPHEMERAL handleTrimMove — engine calculates in refs, rAF applies to DOM (zero React re-renders)
  const handleTrimMove = (e: PointerEvent) => {
    beatMoveLastClientXRef.current = e.clientX;

    const pendingBeatMove = beatMovePendingRef.current;
    if (pendingBeatMove && !beatMoveActiveRef.current) {
      const dx = e.clientX - pendingBeatMove.clientX;
      const dy = e.clientY - pendingBeatMove.clientY;
      if (Math.hypot(dx, dy) < STRUCTURE_BODY_DRAG_THRESHOLD_PX) return;

      if (
        shouldUseMarqueeInsteadOfBodyMove({
          dx,
          dy,
          thresholdPx: STRUCTURE_BODY_DRAG_THRESHOLD_PX,
          shiftKey: pendingBeatMove.shiftKey,
          altKey: pendingBeatMove.altKey,
          interactionMode: timelineInteractionModeRef.current,
        })
      ) {
        beatMarqueeSelectionRef.current?.beginMarqueeGesture({
          pointerId: pendingBeatMove.pointerId,
          startClientX: pendingBeatMove.clientX,
          startClientY: pendingBeatMove.clientY,
          additive: pendingBeatMove.shiftKey,
          clientX: e.clientX,
          clientY: e.clientY,
        });
        beatMovePendingRef.current = null;
        return;
      }

      commitBeatBodyMove(pendingBeatMove);
      return;
    }

    if (beatMoveActiveRef.current) {
      beatMoveSessionRef.current.moveDrag(e.clientX);
      return;
    }

    if (!beatTrimActiveRef.current && !trimEngine.isBeatTrimActive()) return;

    // Use SNAPSHOT beats (from drag start) so we don't depend on React state during drag
    const snapshotBeats = beatTrimSnapshotRef.current;
    if (!snapshotBeats) return;

    const active = beatTrimActiveRef.current;
    if (!active) return;

    const useAutosnap = beatAutosnapEnabledRef.current;
    const useFullMagnet = beatMagnetEnabledRef.current;
    const snapFnBeat = !useAutosnap
      ? snapTime
      : useFullMagnet
        ? snapTime
        : snapTimePlayheadOnly;

    const result = trimEngine.updateBeatTrim(
      e.clientX,
      snapshotBeats as any[],
      beatTimelineDurationRef.current,
      pxPerSecRef.current,
      useAutosnap,
      snapFnBeat as any,
      currentTimeRef.current,
    );

    if (!result) return;

    // 🚀 rAF-throttled DOM update — bypasses React entirely for 60fps smoothness
    trimEngine.scheduleRAF(() => {
      applyBeatPreviewToDOM(
        beatTrackContainerRef.current,
        snapshotBeats as any[],
        active.id,
        active.handle,
        result.trimmedBeat,
        beatTimelineDurationRef.current,
        pxPerSecRef.current,
        viewStartSecRef.current,
      );
    });
  };

  const handleTrimEnd = async (e?: PointerEvent) => {
    if (beatMoveActiveRef.current || beatMoveSessionRef.current.isActive()) {
      if (beatMoveEndGuardRef.current) return;
      beatMoveEndGuardRef.current = true;
      beatTrimWindowCleanupRef.current?.();
      beatTrimWindowCleanupRef.current = null;
      const clientX = e?.clientX ?? beatMoveLastClientXRef.current;
      await beatMoveSessionRef.current.endMove(clientX);
      beatMoveActiveRef.current = false;
      suppressTrailingPointerActivation();
      beatMoveEndGuardRef.current = false;
      return;
    }

    if (beatMovePendingRef.current) {
      beatMovePendingRef.current = null;
      beatTrimWindowCleanupRef.current?.();
      beatTrimWindowCleanupRef.current = null;
      return;
    }

    if (!beatTrimActiveRef.current) return;
    if (beatTrimEndGuardRef.current) return;
    beatTrimEndGuardRef.current = true;

    beatTrimWindowCleanupRef.current?.();
    beatTrimWindowCleanupRef.current = null;

    const activeHandle = beatTrimActiveRef.current.handle;
    console.log(`[Beat Trim] ✅ Finished trimming ${activeHandle} handle`);

    // Release pointer capture
    if (e && beatTrimPointerIdRef.current !== null) {
      try {
        (e.target as HTMLElement).releasePointerCapture(
          beatTrimPointerIdRef.current,
        );
      } catch (_) {
        // Ignore release failures during teardown.
      }
      beatTrimPointerIdRef.current = null;
    }

    const beatsAtTrimStart = beatTrimSnapshotRef.current;
    beatTrimSnapshotRef.current = null;

    // 🚀 Commit from engine — single source of truth for final positions (identity if no move)
    const commitResult = trimEngine.commitBeatTrim();
    trimEngine.cleanup();

    if (!commitResult) {
      if (beatsAtTrimStart?.length) {
        finishBeatTrimPreview(beatsAtTrimStart.map((b) => b.id));
      }
      beatTrimActiveRef.current = null;
      setTrimingBeat(null);
      beatTrimEndGuardRef.current = false;
      return;
    }

    const snapshot = beatsAtTrimStart ?? [];
    const committedPreview = commitBeatTrimPositions({
      snapshot: snapshot as Parameters<
        typeof commitBeatTrimPositions
      >[0]["snapshot"],
      beatId: commitResult.beatId,
      handle: commitResult.handle,
      trimmedBeat: commitResult.trimmedBeat,
    });
    const unchanged = committedPreview.beats.every((cb) => {
      const snapB = snapshot.find((b) => b.id === cb.id);
      return (
        snapB && snapB.pct_from === cb.pct_from && snapB.pct_to === cb.pct_to
      );
    });

    if (unchanged) {
      finishBeatTrimPreview(snapshot.map((b) => b.id));
      beatTrimActiveRef.current = null;
      setTrimingBeat(null);
      beatTrimEndGuardRef.current = false;
      return;
    }

    const { beats: committedLayout, durationScale } = committedPreview;

    if (durationScale > 1) {
      const grownSec = beatTimelineDurationRef.current * durationScale;
      bumpBeatTimelineDurationSec(grownSec);
    }

    const committedById = new Map(committedLayout.map((b) => [b.id, b]));
    setBeats((prev) =>
      prev.map((b) => {
        const next = committedById.get(b.id);
        if (!next) return b;
        return { ...b, pct_from: next.pct_from, pct_to: next.pct_to };
      }),
    );
    finishBeatTrimPreview(snapshot.map((b) => b.id));
    beatTrimActiveRef.current = null;
    setTrimingBeat(null);

    suppressTrailingPointerActivation();

    // DB persist — full gapless row (ripple may touch beats whose pct diff is subtle)
    try {
      const dbUpdates = committedLayout.filter((cb) => dbBeatIds.has(cb.id));

      console.log(`[Beat Trim] 📤 Saving ${dbUpdates.length} beat(s) to DB`);

      for (const b of dbUpdates) {
        try {
          await BeatsAPI.updateBeat(b.id, {
            pct_from: b.pct_from,
            pct_to: b.pct_to,
          });
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          if (message.includes("404") || message.includes("not found")) {
            console.warn(
              `[Beat Trim] ⚠️ Beat ${b.id} not found in DB, removing from tracking...`,
            );
            setDbBeatIds((prev) => {
              const next = new Set(prev);
              next.delete(b.id);
              return next;
            });
            continue;
          }
          throw error;
        }
      }

      if (dbUpdates.length > 0) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.beats.byProject(projectId),
        });
      }

      console.log("[Beat Trim] ✅ DB updated successfully");
    } catch (error) {
      console.error("[Beat Trim] ❌ Error updating beat:", error);
      if (beatsAtTrimStart) {
        setBeats(beatsAtTrimStart.map((b) => ({ ...b })));
      }
    }

    beatTrimEndGuardRef.current = false;
  };

  registerBeatTrimWindowListenersRef.current = () => {
    beatTrimWindowCleanupRef.current?.();
    const onMove = (ev: PointerEvent) => {
      handleTrimMoveRef.current(ev);
    };
    const onEnd = (ev: PointerEvent) => {
      void handleTrimEndRef.current(ev);
    };
    window.addEventListener("pointermove", onMove, { capture: true });
    window.addEventListener("pointerup", onEnd, { capture: true });
    window.addEventListener("pointercancel", onEnd, { capture: true });
    beatTrimWindowCleanupRef.current = () => {
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("pointerup", onEnd, { capture: true });
      window.removeEventListener("pointercancel", onEnd, { capture: true });
    };
  };

  registerClipTrimWindowListenersRef.current = () => {
    clipTrimWindowCleanupRef.current?.();
    const onMove = (ev: PointerEvent) => {
      handleTrimClipMoveRef.current(ev);
    };
    const cancelActiveStructureDrag = () => {
      suppressIfActiveStructureGesture();
      structureTrimBridgeRef.current?.handleCancel();
      structureMoveBridgeRef.current?.handleCancel();
      clearFrozenStructureRowLayouts(structureLayoutFrozen);
      clipTrimActiveRef.current = null;
      structureMoveActiveRef.current = null;
      structureMovePendingRef.current = null;
      setStructureMoveClip(null);
      setTrimingClip(null);
      clipTrimWindowCleanupRef.current?.();
      clipTrimWindowCleanupRef.current = null;
    };
    const onEnd = (ev: PointerEvent) => {
      // pointercancel ist kein Commit, sondern ein Abbruch (Plan §5: cancelTrim).
      if (ev.type === "pointercancel") {
        cancelActiveStructureDrag();
        return;
      }
      void handleTrimClipEndRef.current(ev.clientX);
    };
    // Maus außerhalb des Fensters losgelassen → kein pointerup. Ohne Abbruch
    // bliebe der Drag aktiv und der nächste Click (z.B. auf einem Shot-Block)
    // würde ungewollt navigieren (View-Wechsel). Blur = Abbruch wie pointercancel.
    const onWindowBlur = () => {
      cancelActiveStructureDrag();
    };
    window.addEventListener("pointermove", onMove, { capture: true });
    window.addEventListener("pointerup", onEnd, { capture: true });
    window.addEventListener("pointercancel", onEnd, { capture: true });
    window.addEventListener("blur", onWindowBlur);
    clipTrimWindowCleanupRef.current = () => {
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("pointerup", onEnd, { capture: true });
      window.removeEventListener("pointercancel", onEnd, { capture: true });
      window.removeEventListener("blur", onWindowBlur);
    };
  };

  handleTrimMoveRef.current = handleTrimMove;
  handleTrimEndRef.current = handleTrimEnd;
  handleTrimClipMoveRef.current = handleTrimClipMove;
  handleTrimClipEndRef.current = handleTrimClipEnd;

  registerNleClipTrimWindowListenersRef.current = () => {
    nleClipTrimCleanupRef.current?.();
    const onMove = (ev: PointerEvent) => {
      handleNleClipMoveRef.current(ev);
    };
    const onEnd = () => {
      void handleNleClipEndRef.current();
    };
    window.addEventListener("pointermove", onMove, { capture: true });
    window.addEventListener("pointerup", onEnd, { capture: true });
    window.addEventListener("pointercancel", onEnd, { capture: true });
    nleClipTrimCleanupRef.current = () => {
      window.removeEventListener("pointermove", onMove, { capture: true });
      window.removeEventListener("pointerup", onEnd, { capture: true });
      window.removeEventListener("pointercancel", onEnd, { capture: true });
    };
  };
  handleNleClipMoveRef.current = handleNleClipMove;
  handleNleClipEndRef.current = handleNleClipEnd;

  // 🎯 GLOBAL RESIZE + TRIM LISTENERS
  useEffect(() => {
    if (resizingTrack) {
      window.addEventListener("mousemove", handleResizeMove);
      window.addEventListener("mouseup", handleResizeEnd);
      return () => {
        window.removeEventListener("mousemove", handleResizeMove);
        window.removeEventListener("mouseup", handleResizeEnd);
      };
    }
  }, [resizingTrack, trackHeights]);

  console.log("[VideoEditorTimeline] 📖 Book Timeline:", {
    isBookProject,
    totalWords,
    wordsPerPage,
    targetPages,
    readingSpeedWpm,
  });

  const linkedLaneAudio = useMemo((): LinkedLaneAudioContext => {
    return {
      links: sceneAudioLaneLinks.links,
      getBlockForNode: (nodeId) =>
        sceneBlocksRef.current.find((b) => b.id === nodeId) ??
        shotBlocksRef.current.find((b) => b.id === nodeId),
      resolveSceneIdForNode: (nodeId) => {
        const td = timelineDataRef.current;
        if (td && "shots" in td) {
          const shot = (td as TimelineData).shots?.find((s) => s.id === nodeId);
          if (shot) {
            const row = shot as { sceneId?: string; scene_id?: string };
            return row.sceneId ?? row.scene_id;
          }
        }
        if (sceneBlocksRef.current.some((b) => b.id === nodeId)) {
          return nodeId;
        }
        return undefined;
      },
      seekPlayhead: playheadSeek,
      onClipCommitted: (clip) => commitLinkedAudioClipRef.current(clip),
    };
  }, [sceneAudioLaneLinks.links, playheadSeek]);

  const timelineAudio = useStructureTimelineAudioLanes({
    projectId,
    projectType,
    readingSpeedWpm,
    pxPerSec,
    viewStartSec,
    totalWidthPx,
    currentTimeSec: currentTime,
    linkedLaneAudio,
    sceneBlocksRef,
  });
  const hasVisibleAudioLanes =
    timelineAudio.laneProps.sortedLaneIndices.length > 0;
  const showAudioDawLaneRows = showAudioDawLanes && hasVisibleAudioLanes;

  // 📊 LOAD TIMELINE DATA (props → context hydrate → single batch fetch)
  useEffect(() => {
    timelineSeededForProjectRef.current = null;
  }, [projectId]);

  useEffect(() => {
    if (!initialData) return;
    // Während Trim: kein Überschreiben aus Props — sonst neue initialData-Referenzen (Parent-Re-Renders)
    // resetten timelineData und kollidieren mit manual*TimingsRef / Live-Vorschau (Acts stapeln sich).
    if (
      clipTrimActiveRef.current ||
      beatTrimActiveRef.current ||
      trimingClipRef.current ||
      nleClipDragRef.current ||
      trimEngine.isBeatTrimActive()
    ) {
      return;
    }
    if (timelineSeededForProjectRef.current === projectId) {
      if (
        timelineHasStructuralIdsNotIn(timelineData, initialData as TimelineData)
      ) {
        setTimelineData(
          isBookProject
            ? initialData
            : withFilmActsPctResolved(initialData as TimelineData, duration),
        );
      }
      return;
    }
    timelineSeededForProjectRef.current = projectId;
    setTimelineData(
      isBookProject
        ? initialData
        : withFilmActsPctResolved(initialData as TimelineData, duration),
    );
    setIsLoadingData(false);
  }, [initialData, isBookProject, projectId, duration, timelineData]);

  useEffect(() => {
    filmLayoutRepairAttemptedRef.current = false;
  }, [projectId]);

  useEffect(() => {
    if (filmLayoutRepairAttemptedRef.current) return;
    if (!timelineData || !("acts" in timelineData)) return;
    const td = timelineData as TimelineData;
    if (!td.acts?.length) return;
    if (!filmTimelineNeedsLayoutRepair(td, duration)) return;

    filmLayoutRepairAttemptedRef.current = true;
    const before = td;
    const repaired = repairFilmTimelineLayout(before, duration);
    setTimelineData(repaired);
    onDataChange?.(repaired);

    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const result = await persistFilmLayoutRepair(
          before,
          repaired,
          duration,
          token,
        );
        if (!result.ok) {
          console.warn(
            "[VideoEditorTimeline] layout repair persist partial failure",
            result.failed,
          );
        }
      } catch (err) {
        console.warn("[VideoEditorTimeline] layout repair persist failed", err);
      }
    })();
  }, [
    timelineData,
    duration,
    isBookProject,
    getAccessToken,
    onDataChange,
    projectId,
  ]);

  /** After first load, never bootstrap from timelineCtx — it can lag behind API creates. */
  const hadTimelineDataRef = useRef(!!initialData);

  useEffect(() => {
    if (timelineData) {
      hadTimelineDataRef.current = true;
    }
  }, [timelineData]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (timelineData) return;

      if (timelineCtx && !hadTimelineDataRef.current) {
        const has =
          timelineCtx.acts.length > 0 ||
          timelineCtx.sequences.length > 0 ||
          timelineCtx.scenes.length > 0;
        if (has) {
          const data = isBookProject
            ? enrichBookTimelineData(timelineCtx.getBookTimelineData())
            : withFilmActsPctResolved(
                timelineCtx.getTimelineData() as TimelineData,
                duration,
              );
          setTimelineData(data);
          setIsLoadingData(false);
          return;
        }
      }

      try {
        setIsLoadingData(true);
        const token = await getAccessToken();
        if (!token || cancelled) return;

        const data = await loadProjectTimelineBundle(
          projectId,
          token,
          isBookProject,
        );
        if (cancelled) return;

        const loaded = isBookProject
          ? data
          : withFilmActsPctResolved(data as TimelineData, duration);
        setTimelineData(loaded);
        onDataChange?.(loaded);
      } catch (error) {
        console.error(
          "[VideoEditorTimeline] Error loading timeline data:",
          error,
        );
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    timelineData,
    duration,
    isBookProject,
    getAccessToken,
    onDataChange,
    timelineCtx,
    timelineCtx?.acts.length,
    timelineCtx?.sequences.length,
    timelineCtx?.scenes.length,
  ]);

  // PHASE1: One-time migration — create one editorial clip per shot from film geometry when none exist.
  useEffect(() => {
    if (isBookProject) return;
    if (!timelineData || !("shots" in timelineData)) return;
    const td = timelineData as TimelineData;
    const shots = td.shots || [];
    const existing = td.clips || [];
    if (existing.length > 0) {
      clipMigrationAttemptedRef.current = true;
      return;
    }
    if (shots.length === 0) return;
    if (clipMigrationAttemptedRef.current) return;
    clipMigrationAttemptedRef.current = true;

    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const tree = buildTimelineTree({
          timelineData: td,
          projectDurationSec: Math.max(1e-6, duration),
        });
        const spans = listFilmShotSpansFromTree(tree);
        for (const s of spans) {
          try {
            await ClipsAPI.createClip(
              {
                projectId,
                shotId: s.shotId,
                sceneId: s.sceneId,
                startSec: s.startSec,
                endSec: s.endSec,
                laneIndex: 0,
                orderIndex: s.orderIndex,
              },
              token,
            );
          } catch (e) {
            console.warn(
              "[VideoEditorTimeline] clip migration skipped for shot",
              s.shotId,
              e,
            );
          }
        }
        const list = await ClipsAPI.listClipsByProject(projectId, token);
        setTimelineData((prev) => {
          if (!prev || !("shots" in prev)) return prev;
          return { ...(prev as TimelineData), clips: list };
        });
        onDataChange?.({ ...(td as TimelineData), clips: list });
      } catch (e) {
        console.error("[VideoEditorTimeline] clip migration failed", e);
      }
    })();
  }, [
    isBookProject,
    timelineData,
    duration,
    projectId,
    getAccessToken,
    onDataChange,
  ]);

  // 🛠️ AUTO-FIX OVERLAPS: Repair all overlapping beats
  const fixOverlappingBeats = (
    beatsToFix: BeatsAPI.StoryBeat[],
  ): BeatsAPI.StoryBeat[] => {
    if (beatsToFix.length === 0) return beatsToFix;

    console.log("[Beat Auto-Fix] 🔧 Checking for overlaps...");

    // Sort beats by pct_from
    const sorted = [...beatsToFix].sort((a, b) => a.pct_from - b.pct_from);

    let hasOverlaps = false;
    const fixed: BeatsAPI.StoryBeat[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const beat = { ...sorted[i] };

      if (i > 0) {
        const prevBeat = fixed[i - 1];

        // Check if this beat overlaps with previous
        if (beat.pct_from < prevBeat.pct_to) {
          hasOverlaps = true;
          console.log(
            `[Beat Auto-Fix] ⚠️ OVERLAP DETECTED: "${beat.label}" (${beat.pct_from.toFixed(1)}-${beat.pct_to.toFixed(1)}%) overlaps with "${prevBeat.label}" (${prevBeat.pct_from.toFixed(1)}-${prevBeat.pct_to.toFixed(1)}%)`,
          );

          // Fix: Move this beat to start right after the previous beat
          const originalLength = beat.pct_to - beat.pct_from;
          beat.pct_from = prevBeat.pct_to;
          beat.pct_to = beat.pct_from + originalLength;

          // Clamp to 100%
          if (beat.pct_to > 100) {
            beat.pct_to = 100;
          }

          console.log(
            `[Beat Auto-Fix] ✅ FIXED: "${beat.label}" moved to ${beat.pct_from.toFixed(1)}-${beat.pct_to.toFixed(1)}%`,
          );
        }
      }

      fixed.push(beat);
    }

    if (hasOverlaps) {
      console.log("[Beat Auto-Fix] 🎉 All overlaps fixed!");
    } else {
      console.log("[Beat Auto-Fix] ✅ No overlaps detected");
    }

    return fixed;
  };

  // 🎯 MAP BEATS TO PIXELS (MEMOIZED for performance!)
  const beatBlocks = useMemo(() => {
    const start = performance.now();
    const result = beats.map((beat) => {
      const rawStartSec =
        (Number(beat.pct_from) / 100) * beatTimelineDurationSec;
      const rawEndSec = (Number(beat.pct_to) / 100) * beatTimelineDurationSec;

      // Guard against invalid/negative ranges so CSS width never becomes invalid.
      const startSec =
        Number.isFinite(rawStartSec) && Number.isFinite(rawEndSec)
          ? Math.min(rawStartSec, rawEndSec)
          : 0;
      const endSec =
        Number.isFinite(rawStartSec) && Number.isFinite(rawEndSec)
          ? Math.max(rawStartSec, rawEndSec)
          : 0;

      const x = (startSec - viewStartSec) * pxPerSec;
      const rawWidth = (endSec - startSec) * pxPerSec;
      const width = Math.max(2, Number.isFinite(rawWidth) ? rawWidth : 2);

      return {
        ...beat,
        startSec,
        endSec,
        x,
        width,
        visible:
          !isBookProject || (endSec >= viewStartSec && startSec <= viewEndSec),
      };
    });
    const elapsed = performance.now() - start;
    if (elapsed > 5) {
      console.warn(
        `[VideoEditorTimeline] ⚠️ beatBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 5ms)`,
      );
    }
    return result;
  }, [
    beats,
    beatTimelineDurationSec,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    isBookProject,
  ]);

  /**
   * Delete a beat and apply ripple effect
   * @param beatId - ID of beat to delete
   */
  const handleDeleteBeat = async (beatId: string) => {
    const beatToDelete = beats.find((b) => b.id === beatId);
    if (!beatToDelete) return;

    const originalBeats = [...beats];

    try {
      // Delete from database
      await BeatsAPI.deleteBeat(beatId);

      // Calculate duration for ripple
      const beatDur = beatTimelineDurationSec;
      const startSec = (beatToDelete.pct_from / 100) * beatDur;
      const endSec = (beatToDelete.pct_to / 100) * beatDur;
      const deletedDuration = endSec - startSec;

      // Remove from local state
      const remainingBeats = beats.filter((b) => b.id !== beatId);

      if (!beatMagnetEnabled) {
        setBeats(remainingBeats);
        console.log("[Beat Delete] ✅ Beat deleted (no ripple)");
        return;
      }

      // Apply ripple: shift all beats after deleted beat to the left
      const beatsToUpdate: BeatsAPI.StoryBeat[] = [];
      const withRipple = remainingBeats.map((beat) => {
        const beatStartSec = (beat.pct_from / 100) * beatDur;
        const beatEndSec = (beat.pct_to / 100) * beatDur;

        if (beatStartSec >= endSec) {
          const newStartSec = beatStartSec - deletedDuration;
          const newEndSec = beatEndSec - deletedDuration;

          const newPctFrom = Math.max(
            0,
            Math.min(100, (newStartSec / beatDur) * 100),
          );
          const newPctTo = Math.max(
            0,
            Math.min(100, (newEndSec / beatDur) * 100),
          );

          const updatedBeat = {
            ...beat,
            pct_from: newPctFrom,
            pct_to: newPctTo,
          };

          beatsToUpdate.push(updatedBeat);
          return updatedBeat;
        }

        return beat;
      });

      // Update all rippled beats in database sequentially
      for (const beat of beatsToUpdate) {
        await BeatsAPI.updateBeat(beat.id, {
          pct_from: beat.pct_from,
          pct_to: beat.pct_to,
        });
      }

      setBeats(withRipple);
      console.log("[Beat Delete] 🧲 Ripple applied:", {
        beatId,
        deletedDuration,
        updatedCount: beatsToUpdate.length,
      });
    } catch (error) {
      console.error("[Beat Delete] ❌ Error:", error);
      // Revert to original state on error
      setBeats(originalBeats);
    }
  };

  const filmStructureTree = structureTrimBridge.tree;
  const useFilmTreeLayout =
    USE_HIERARCHICAL_STRUCTURE_RIPPLE && !!filmStructureTree && !!timelineData;

  const structureRowKey = useCallback(
    (id: string) => (useFilmTreeLayout ? `${id}-${structureLayoutEpoch}` : id),
    [useFilmTreeLayout, structureLayoutEpoch],
  );

  // Act blocks: packed tree (VETILALORAPP); fallback calculateActBlocks when tree off.
  const actBlocksLive = useMemo(() => {
    const start = performance.now();
    const result =
      useFilmTreeLayout && timelineData
        ? projectStructureBlocksFromTree({
            tree: filmStructureTree!,
            timelineData: timelineData as TimelineData,
            kind: "act",
            viewStartSec,
            viewEndSec,
            pxPerSec,
          })
        : calculateActBlocks(
            timelineData,
            structureProjectDurationSec,
            viewStartSec,
            viewEndSec,
            pxPerSec,
            isBookProject,
            readingSpeedWpm,
          );
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(
        `[VideoEditorTimeline] ⚠️ actBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 10ms)`,
      );
    }
    return result;
  }, [
    useFilmTreeLayout,
    filmStructureTree,
    timelineData,
    structureProjectDurationSec,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    isBookProject,
    readingSpeedWpm,
  ]);

  const actBlocks = pickFrozenStructureBlocks(
    structureLayoutFrozen,
    "acts",
    actBlocksLive,
    vetStructureLayoutFrozen,
  );

  /** Film: dedupe act.id rows; VET DOM preview handles live trim (no pct overlay). */
  const filmActRowBlocks = useMemo(() => {
    const vis = actBlocks.filter((a) => a.visible !== false);
    if (isBookProject) return vis;
    const seen = new Set<string>();
    const out: typeof vis = [];
    for (const a of vis) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      out.push(a);
    }
    out.sort((a, b) => a.startSec - b.startSec);
    return out;
  }, [actBlocks, isBookProject]);

  // 🚀 OPTIMIZED: Memoized sequence blocks calculation
  const sequenceBlocksLive = useMemo(() => {
    const start = performance.now();
    const result =
      useFilmTreeLayout && timelineData
        ? projectStructureBlocksFromTree({
            tree: filmStructureTree!,
            timelineData: timelineData as TimelineData,
            kind: "sequence",
            viewStartSec,
            viewEndSec,
            pxPerSec,
          })
        : calculateSequenceBlocks(
            timelineData,
            structureProjectDurationSec,
            viewStartSec,
            viewEndSec,
            pxPerSec,
            isBookProject,
            totalWords,
            readingSpeedWpm,
          );
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(
        `[VideoEditorTimeline] ⚠️ sequenceBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 10ms)`,
      );
    }
    return result;
  }, [
    useFilmTreeLayout,
    filmStructureTree,
    timelineData,
    timelineData,
    structureProjectDurationSec,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    isBookProject,
    totalWords,
    readingSpeedWpm,
  ]);

  const sequenceBlocks = pickFrozenStructureBlocks(
    structureLayoutFrozen,
    "sequences",
    sequenceBlocksLive,
    vetStructureLayoutFrozen,
  );

  // 🚀 OPTIMIZED: Memoized scene blocks calculation
  const sceneBlocksLive = useMemo(() => {
    const start = performance.now();
    const result =
      useFilmTreeLayout && timelineData
        ? projectStructureBlocksFromTree({
            tree: filmStructureTree!,
            timelineData: timelineData as TimelineData,
            kind: "scene",
            viewStartSec,
            viewEndSec,
            pxPerSec,
          })
        : calculateSceneBlocks(
            timelineData,
            structureProjectDurationSec,
            viewStartSec,
            viewEndSec,
            pxPerSec,
            isBookProject,
            readingSpeedWpm,
          );
    const elapsed = performance.now() - start;
    if (elapsed > 10) {
      console.warn(
        `[VideoEditorTimeline] ⚠️ sceneBlocks calculation took ${elapsed.toFixed(2)}ms (SLA: 10ms)`,
      );
    }
    return result;
  }, [
    useFilmTreeLayout,
    filmStructureTree,
    timelineData,
    timelineData,
    structureProjectDurationSec,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    isBookProject,
    readingSpeedWpm,
  ]);

  const sceneBlocks = pickFrozenStructureBlocks(
    structureLayoutFrozen,
    "scenes",
    sceneBlocksLive,
    vetStructureLayoutFrozen,
  );

  const playbackSceneBlocks = useMemo(
    () =>
      sceneBlocks.map((block) => ({
        id: String((block as { id?: string }).id ?? ""),
        title: (block as { title?: string }).title,
        startSec: block.startSec,
        endSec: block.endSec,
        content: (block as { content?: unknown }).content,
      })),
    [sceneBlocks],
  );

  const transportGuard = useMemo(
    () =>
      resolveTimelineTransportGuard({
        projectType: projectType ?? "",
        sceneBlocks: playbackSceneBlocks,
        audioClips: timelineAudio.lanes.allClips,
      }),
    [playbackSceneBlocks, projectType, timelineAudio.lanes.allClips],
  );

  const playback = useTimelinePlayback({
    projectType: projectType ?? "",
    playing: isPlaying,
    positionSec: currentTime,
    durationSec: totalDurationSec,
    audioClips: timelineAudio.lanes.allClips,
    sceneBlocks: playbackSceneBlocks,
    canPlay: transportGuard.canPlay,
    canPlayReason: transportGuard.reason,
    play,
    pause,
    transportStop,
    transportSeek: playheadSeek,
    reanchorPlaybackClock,
    isBookProject,
    readingSpeedWpm,
    sceneBlocksRef,
    positionSecRef: currentTimeRef,
    playingRef: isPlayingRef,
  });
  useLayoutEffect(() => {
    onPlayheadTickRef.current = playback.onPlayheadTick;
  }, [playback.onPlayheadTick]);

  const { bookState } = playback;
  const { currentWordIndex, currentSceneId, wordsArray } = bookState;
  const handleTransportToggle = playback.toggle;
  const handleTransportStop = playback.stop;
  const syncBookAtTime = playback.seek;
  const handleTransportToggleRef = useRef(handleTransportToggle);
  handleTransportToggleRef.current = handleTransportToggle;
  const handleTransportStopRef = useRef(handleTransportStop);
  handleTransportStopRef.current = handleTransportStop;

  useLayoutEffect(() => {
    syncBookAtTimeRef.current = syncBookAtTime;
  }, [syncBookAtTime]);

  const filmSequenceRowBlocks = useMemo(
    () => sequenceBlocks.filter((s) => s.visible !== false),
    [sequenceBlocks],
  );

  const filmSceneRowBlocks = useMemo(
    () => sceneBlocks.filter((s) => s.visible !== false),
    [sceneBlocks],
  );

  const shotBlocksLive = useMemo(() => {
    if (
      !strategy.showShotBlocks ||
      !timelineData ||
      !("shots" in timelineData) ||
      !timelineData.shots?.length
    ) {
      return [];
    }

    if (useFilmTreeLayout && filmStructureTree) {
      return projectStructureBlocksFromTree({
        tree: filmStructureTree,
        timelineData: timelineData as TimelineData,
        kind: "shot",
        viewStartSec,
        viewEndSec,
        pxPerSec,
      }).map((block, index) => ({
        ...block,
        label:
          (
            block as {
              shotNumber?: string;
              shot_number?: string;
              title?: string;
            }
          ).shotNumber ||
          (block as { shot_number?: string }).shot_number ||
          (block as { title?: string }).title ||
          `Shot ${index + 1}`,
      }));
    }

    const sceneById = new Map(
      sceneBlocksLive.map((scene: any) => [scene.id, scene]),
    );
    const shotsByScene = new Map<string, any[]>();

    for (const shot of timelineData.shots) {
      const sceneId = (shot as any).sceneId || (shot as any).scene_id;
      if (!sceneId) continue;
      const current = shotsByScene.get(sceneId) || [];
      current.push(shot);
      shotsByScene.set(sceneId, current);
    }

    const getShotDurationSec = (shot: any): number | null => {
      const override = manualShotDurations[shot.id];
      if (override !== undefined) return override;

      const mRaw = shot.shotlengthMinutes ?? shot.shotlength_minutes;
      const sRaw = shot.shotlengthSeconds ?? shot.shotlength_seconds;
      if (typeof sRaw === "number" && Number.isFinite(sRaw) && sRaw >= 0) {
        const m =
          typeof mRaw === "number" && Number.isFinite(mRaw)
            ? Math.max(0, Math.floor(mRaw))
            : 0;
        const s = Math.round(sRaw);
        const total = m * 60 + s;
        if (total > 0) return total;
      }

      const stored = shot.durationSeconds;
      if (typeof stored === "number" && Number.isFinite(stored) && stored > 0) {
        return stored;
      }

      // Optional legacy parsing (best-effort).
      if (typeof shot.duration === "string") {
        // e.g. "3s" or "0:05"
        const s = shot.duration.trim();
        if (s.endsWith("s")) {
          const n = Number(s.slice(0, -1));
          if (Number.isFinite(n) && n > 0) return n;
        }
      }

      return null;
    };

    const blocks: any[] = [];

    for (const [sceneId, sceneShots] of shotsByScene.entries()) {
      const scene = sceneById.get(sceneId);
      if (!scene) continue;

      const orderedShots = [...sceneShots].sort((a, b) => {
        const orderA = (a as any).orderIndex ?? (a as any).order_index ?? 0;
        const orderB = (b as any).orderIndex ?? (b as any).order_index ?? 0;
        return orderA - orderB;
      });

      const sceneDuration = Math.max(0, scene.endSec - scene.startSec);

      const storedDurations = orderedShots.map(getShotDurationSec);
      const allDurationsValid = storedDurations.every(
        (d) => typeof d === "number" && (d as number) > 0,
      );

      // If we have persisted durations for all shots, use them (scaled to fit this scene).
      // Otherwise fall back to equal distribution (so initial projects still render).
      let durations: number[];
      if (allDurationsValid && sceneDuration > 0) {
        const totalStored = (storedDurations as number[]).reduce(
          (sum, d) => sum + d,
          0,
        );
        const scale = totalStored > 0 ? sceneDuration / totalStored : 1;
        const raw = (storedDurations as number[]).map((d) =>
          Math.max(MIN_CLIP_DURATION_SEC, d * scale),
        );
        const sumAfterClamp = raw.reduce((sum, d) => sum + d, 0);
        const renorm = sumAfterClamp > 0 ? sceneDuration / sumAfterClamp : 1;
        durations = raw.map((d) => d * renorm);
      } else {
        const slotDuration = sceneDuration / Math.max(1, orderedShots.length);
        durations = orderedShots.map(() =>
          Math.max(MIN_CLIP_DURATION_SEC, slotDuration),
        );
        // Renormalize to exact scene duration.
        const sum = durations.reduce((s, d) => s + d, 0);
        const renorm = sum > 0 ? sceneDuration / sum : 1;
        durations = durations.map((d) => d * renorm);
      }

      let cursor = scene.startSec;
      orderedShots.forEach((shot, index) => {
        const startSec = cursor;
        const endSec = startSec + durations[index];
        cursor = endSec;

        const x = (startSec - viewStartSec) * pxPerSec;
        const width = Math.max(2, (endSec - startSec) * pxPerSec);

        blocks.push({
          ...(shot as any),
          startSec,
          endSec,
          x,
          width,
          visible: true,
          label:
            (shot as any).shotNumber ||
            (shot as any).shot_number ||
            (shot as any).title ||
            `Shot ${index + 1}`,
        });
      });
    }

    return blocks;
  }, [
    strategy.showShotBlocks,
    useFilmTreeLayout,
    filmStructureTree,
    timelineData,
    sceneBlocksLive,
    viewStartSec,
    viewEndSec,
    pxPerSec,
    manualShotDurations,
  ]);

  const shotBlocks = pickFrozenStructureBlocks(
    structureLayoutFrozen,
    "shots",
    shotBlocksLive,
    vetStructureLayoutFrozen,
  );

  const clipBlocks = useMemo(() => {
    if (
      !strategy.showEditorialClipTrack ||
      !timelineData ||
      !("clips" in timelineData)
    )
      return [];
    const raw = ((timelineData as TimelineData).clips || []) as Clip[];
    if (raw.length === 0) return [];
    return raw.map((c) => {
      const pv = nleClipPreview?.[c.id];
      const startSec = pv?.startSec ?? c.startSec;
      const endSec = pv?.endSec ?? c.endSec;
      return {
        ...c,
        startSec,
        endSec,
        x: (startSec - viewStartSec) * pxPerSec,
        width: Math.max(2, (endSec - startSec) * pxPerSec),
      };
    });
  }, [isBookProject, timelineData, viewStartSec, pxPerSec, nleClipPreview]);

  actBlocksRef.current = actBlocks;
  sequenceBlocksRef.current = sequenceBlocks;
  sceneBlocksRef.current = sceneBlocks;
  shotBlocksRef.current = shotBlocks;
  clipBlocksRef.current = clipBlocks;

  const activePreviewScene = useMemo(() => {
    if (!isAudioProject || sceneBlocks.length === 0) return null;
    const exact = sceneBlocks.find(
      (scene: { startSec: number; endSec: number }) =>
        currentTime >= scene.startSec && currentTime <= scene.endSec,
    );
    if (exact) return exact;
    const next = sceneBlocks.find(
      (scene: { startSec: number }) => scene.startSec >= currentTime,
    );
    if (next) return next;
    return sceneBlocks[sceneBlocks.length - 1];
  }, [currentTime, isAudioProject, sceneBlocks]);

  const activePreviewShot = useMemo(() => {
    if (isBookProject || isAudioProject || shotBlocks.length === 0) return null;
    const td = timelineData as TimelineData | null;
    const clips = (td?.clips || []) as Clip[];
    if (clips.length > 0 && clipBlocks.length > 0) {
      const hit = clipBlocks.find(
        (c: any) => currentTime >= c.startSec && currentTime <= c.endSec,
      );
      if (hit) {
        const shotId = (hit as any).shotId || (hit as any).shot_id;
        const fromShot = shotBlocks.find((s: any) => s.id === shotId);
        if (fromShot) return fromShot as any;
      }
    }
    const exact = shotBlocks.find(
      (shot: any) => currentTime >= shot.startSec && currentTime <= shot.endSec,
    );
    if (exact) return exact as any;
    const next = shotBlocks.find((shot: any) => shot.startSec >= currentTime);
    if (next) return next as any;
    return shotBlocks[shotBlocks.length - 1] as any;
  }, [currentTime, isBookProject, shotBlocks, timelineData, clipBlocks]);

  const activePreviewImageUrl = useMemo(() => {
    if (isAudioProject && activePreviewScene) {
      const sceneId = (activePreviewScene as { id?: string }).id;
      const td = timelineData as TimelineData | null;
      const full = sceneId
        ? td?.scenes?.find((s) => s.id === sceneId)
        : undefined;
      return (
        (full as { imageUrl?: string; image_url?: string } | undefined)
          ?.imageUrl ||
        (full as { image_url?: string } | undefined)?.image_url ||
        ""
      );
    }
    const shot = activePreviewShot as {
      imageUrl?: string;
      image_url?: string;
      thumbnailUrl?: string;
      thumbnail_url?: string;
    } | null;
    if (!shot) return "";
    return (
      shot.imageUrl ||
      shot.image_url ||
      shot.thumbnailUrl ||
      shot.thumbnail_url ||
      ""
    );
  }, [isAudioProject, activePreviewScene, activePreviewShot, timelineData]);

  const scenePreviewById = useMemo(() => {
    const map = new Map<string, string>();
    for (const scene of timelineData?.scenes ?? []) {
      const url = timelineClipPreviewUrl(scene);
      if (url) map.set(scene.id, url);
    }
    return map;
  }, [timelineData?.scenes]);

  const activePreviewLabel = useMemo(() => {
    if (isAudioProject) {
      const scene = activePreviewScene as { title?: string } | null | undefined;
      return scene?.title || "Keine Szene aktiv";
    }
    const shot = activePreviewShot as { label?: string } | null;
    return shot?.label || "Kein Shot aktiv";
  }, [isAudioProject, activePreviewScene, activePreviewShot]);

  const addableKinds = strategy.addableKinds;

  const structureAddLabels = useMemo(
    () => ({
      act: labelByKind.act,
      sequence: labelByKind.sequence,
      scene: labelByKind.scene,
    }),
    [labelByKind.act, labelByKind.sequence, labelByKind.scene],
  );

  const getParentOptions = useCallback(
    (kind: AddNodeKind): Array<{ id: string; label: string }> => {
      if (!timelineData) return [];
      return buildStructureParentOptions(
        kind as StructureAddKind,
        {
          acts: timelineData.acts,
          sequences: timelineData.sequences,
          scenes: timelineData.scenes,
        },
        structureAddLabels,
      );
    },
    [timelineData, structureAddLabels],
  );

  const reloadTimelineDataFromSource = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;

    const data = await loadProjectTimelineBundle(
      projectId,
      token,
      isBookProject,
    );
    let merged: TimelineData | BookTimelineData = data;
    if (!isBookProject && timelineData && "acts" in timelineData) {
      const filmLoaded = data as TimelineData;
      const prevFilm = timelineData as TimelineData;
      merged = {
        ...filmLoaded,
        shots:
          (filmLoaded.shots?.length ?? 0) > 0
            ? filmLoaded.shots
            : (prevFilm.shots ?? []),
        clips:
          (filmLoaded.clips?.length ?? 0) > 0
            ? filmLoaded.clips
            : (prevFilm.clips ?? []),
      };
    }
    const loaded = isBookProject
      ? merged
      : repairFilmTimelineLayout(
          withFilmActsPctResolved(merged as TimelineData, duration),
          duration,
        );
    clearFrozenStructureRowLayouts(structureLayoutFrozen);
    setStructureLayoutEpoch((epoch) => epoch + 1);
    setTimelineData(loaded);
    onDataChange?.(loaded);
    const filmLoaded =
      !isBookProject && "shots" in loaded ? (loaded as TimelineData) : null;
    if (timelineCtx) {
      timelineCtx.dispatch({
        type: "SET_TIMELINE_DATA",
        payload: {
          acts: loaded.acts ?? [],
          sequences: loaded.sequences ?? [],
          scenes: loaded.scenes ?? [],
          shots: filmLoaded?.shots ?? [],
          clips: filmLoaded?.clips ?? [],
        },
      });
    }
  }, [
    duration,
    getAccessToken,
    isBookProject,
    onDataChange,
    projectId,
    structureLayoutFrozen,
    timelineCtx,
    timelineData,
  ]);

  const { uploadForScene: uploadSceneImageForPreview, uploadingSceneId } =
    useSceneImageUpload(projectId, {
      onUploaded: async (sceneId, imageUrl) => {
        setTimelineData((prev) => {
          if (!prev || !("scenes" in prev)) return prev;
          return {
            ...prev,
            scenes: prev.scenes.map((scene) =>
              scene.id === sceneId ? { ...scene, imageUrl } : scene,
            ),
          };
        });
        await reloadTimelineDataFromSource();
      },
    });

  const pickAndUploadSceneImage = useCallback(
    async (sceneId: string) => {
      const file = await pickImageFile();
      if (!file) return;
      await uploadSceneImageForPreview(sceneId, file);
    },
    [uploadSceneImageForPreview],
  );

  const { uploadForShot: uploadShotImageForPreview, uploadingShotId } =
    useShotImageUpload(projectId, {
      onUploaded: async (shotId, imageUrl) => {
        setTimelineData((prev) => {
          if (!prev || !("shots" in prev) || !prev.shots) return prev;
          return {
            ...prev,
            shots: prev.shots.map((shot) =>
              shot.id === shotId ? { ...shot, imageUrl } : shot,
            ),
          };
        });
        await reloadTimelineDataFromSource();
      },
    });

  const pickAndUploadShotImage = useCallback(
    async (shotId: string) => {
      const file = await pickImageFile();
      if (!file) return;
      await uploadShotImageForPreview(shotId, file);
    },
    [uploadShotImageForPreview],
  );

  const activePreviewSceneId = (activePreviewScene as { id?: string } | null)
    ?.id;

  const activePreviewShotId = (activePreviewShot as { id?: string } | null)?.id;

  const isFilmProject = showFilmProductionTracks;

  const editingSceneImageUrl = useMemo(() => {
    if (!editingNode || editingNode.kind !== "scene") return "";
    return (
      timelineData?.scenes?.find((scene) => scene.id === editingNode.id)
        ?.imageUrl ?? ""
    );
  }, [editingNode, timelineData?.scenes]);

  const createNodeAndRefresh = useCallback(
    async (kind: AddNodeKind, parentId?: string): Promise<string | null> => {
      const token = await getAccessToken();
      if (!token) {
        toast.error("Nicht authentifiziert");
        return null;
      }

      let created: Act | Sequence | Scene | null = null;
      let createdShotId: string | null = null;

      if (kind === "act") {
        created = await TimelineAPI.createAct(
          projectId,
          nextActCreatePayload(timelineData?.acts ?? [], labelByKind.act),
          token,
        );
      } else if (kind === "sequence") {
        if (!parentId) throw new Error("Parent für Sequence fehlt");
        created = await TimelineAPI.createSequence(
          parentId,
          nextSequenceCreatePayload(
            timelineData?.sequences ?? [],
            parentId,
            labelByKind.sequence,
          ),
          token,
        );
      } else if (kind === "scene") {
        if (!parentId) throw new Error("Parent für Scene fehlt");
        created = await TimelineAPI.createScene(
          parentId,
          nextSceneCreatePayload(
            timelineData?.scenes ?? [],
            parentId,
            labelByKind.scene,
          ),
          token,
        );
      } else if (kind === "shot") {
        if (!parentId) throw new Error("Parent für Shot fehlt");
        const next =
          (timelineData && "shots" in timelineData
            ? (timelineData.shots || []).filter(
                (s: any) => s.sceneId === parentId || s.scene_id === parentId,
              ).length
            : 0) + 1;
        const newShot = await ShotsAPI.createShot(
          parentId,
          {
            projectId,
            shotNumber: `${labelByKind.shot} ${next}`,
            description: "",
          } as any,
          token,
        );
        createdShotId = newShot.id;
      }

      if (created && timelineData) {
        setTimelineData((prev) => {
          if (!prev) return prev;
          if (kind === "act") {
            return { ...prev, acts: [...(prev.acts ?? []), created as Act] };
          }
          if (kind === "sequence") {
            return {
              ...prev,
              sequences: [...(prev.sequences ?? []), created as Sequence],
            };
          }
          if (kind === "scene") {
            return {
              ...prev,
              scenes: [...(prev.scenes ?? []), created as Scene],
            };
          }
          return prev;
        });
        if (timelineCtx) {
          if (kind === "act") {
            timelineCtx.dispatch({ type: "ADD_ACT", payload: created as Act });
          } else if (kind === "sequence") {
            timelineCtx.dispatch({
              type: "ADD_SEQUENCE",
              payload: created as Sequence,
            });
          } else if (kind === "scene") {
            timelineCtx.dispatch({
              type: "ADD_SCENE",
              payload: created as Scene,
            });
          }
        }
      }

      await queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.byProject(projectId),
      });

      await reloadTimelineDataFromSource();
      toast.success(`${labelByKind[kind]} hinzugefügt`);

      if (createdShotId) return createdShotId;
      if (created?.id) return created.id;
      return null;
    },
    [
      getAccessToken,
      labelByKind,
      projectId,
      queryClient,
      reloadTimelineDataFromSource,
      timelineCtx,
      timelineData,
    ],
  );

  const openAddDialogForKind = useCallback(
    (kind: AddNodeKind) => {
      if (!structureAddRequiresParentPicker(kind as StructureAddKind)) {
        void createNodeAndRefresh(kind);
        return;
      }
      const options = getParentOptions(kind);
      if (options.length === 0) {
        toast.error(
          structureAddMissingPrerequisiteMessage(
            kind as StructureAddKind,
            structureAddLabels,
          ),
        );
        return;
      }
      setPendingAddKind(kind);
      setSelectedParentId(options[0].id);
      setAddDialogOpen(true);
    },
    [createNodeAndRefresh, getParentOptions, structureAddLabels],
  );

  const structureImageDrop = useStructureTimelineImageDrop({
    scrollRef,
    pxPerSec,
    isAudioProject,
    isFilmProject,
    sequenceBlocks: sequenceBlocks as Array<{
      id: string;
      startSec: number;
      endSec: number;
      title?: string;
    }>,
    sceneBlocks: (isAudioProject ? sceneBlocks : filmSceneRowBlocks) as Array<{
      id: string;
      startSec: number;
      endSec: number;
      title?: string;
    }>,
    shotBlocks: shotBlocks as Array<{
      id: string;
      startSec: number;
      endSec: number;
      label?: string;
    }>,
    formatTimeLabel,
    uploadSceneImage: uploadSceneImageForPreview,
    uploadShotImage: uploadShotImageForPreview,
    createNodeAndRefresh,
  });

  useTauriTimelineImageDropBridge({
    enabled: isAudioProject || isFilmProject,
    isAudioProject,
    isFilmProject,
    onSceneImageFileDrop: structureImageDrop.onSceneImageFileDrop,
    onFilmSceneClipImageDrop: structureImageDrop.onFilmSceneClipImageDrop,
    onShotImageFileDrop: structureImageDrop.onShotImageFileDrop,
    onEmptySceneLaneDrop: structureImageDrop.onEmptySceneLaneDrop,
    onEmptyShotLaneDrop: structureImageDrop.onEmptyShotLaneDrop,
  });

  const handleConfirmAddWithParent = useCallback(async () => {
    if (!pendingAddKind || !selectedParentId) return;
    try {
      await createNodeAndRefresh(pendingAddKind, selectedParentId);
    } catch (error) {
      console.error("[VideoEditorTimeline] Add item failed:", error);
      toast.error("Element konnte nicht angelegt werden");
    } finally {
      setAddDialogOpen(false);
      setPendingAddKind(null);
      setSelectedParentId("");
    }
  }, [createNodeAndRefresh, pendingAddKind, selectedParentId]);

  const structureCrud = useHierarchyCRUD({
    projectId,
    projectType: projectType ?? "film",
    acts: timelineData?.acts ?? [],
    sequences: timelineData?.sequences ?? [],
    scenes: timelineData?.scenes ?? [],
    shots:
      timelineData && "shots" in timelineData
        ? ((timelineData as TimelineData).shots ?? [])
        : [],
    labels: getProjectTypeConfig(projectType ?? "film").hierarchyLabels,
    onMutated: reloadTimelineDataFromSource,
  });

  const openStructureInfo = useCallback(
    (type: "act" | "sequence" | "scene" | "shot", id: string) => {
      if (!timelineData) return;
      let node: Act | Sequence | Scene | Shot | undefined;
      if (type === "act") {
        node = (timelineData.acts ?? []).find((a) => a.id === id);
      } else if (type === "sequence") {
        node = (timelineData.sequences ?? []).find((s) => s.id === id);
      } else if (type === "scene") {
        node = (timelineData.scenes ?? []).find((s) => s.id === id);
      } else if ("shots" in timelineData) {
        node = ((timelineData as TimelineData).shots ?? []).find(
          (s) => s.id === id,
        );
      }
      if (!node) return;
      setInfoDialogData({ type, node });
      setInfoDialogOpen(true);
    },
    [timelineData],
  );

  const openNodeEditDialog = useCallback(
    (
      kind: AddNodeKind | "beat",
      id: string,
      title: string,
      description = "",
    ) => {
      setEditingNode({ kind, id, title, description });
      setNodeEditDialogOpen(true);
    },
    [],
  );

  const openNodeEditForKind = useCallback(
    (kind: AddNodeKind | "beat", id: string) => {
      if (kind === "beat") {
        const beat = beats.find((b) => b.id === id);
        if (beat) {
          openNodeEditDialog(kind, id, beat.label, beat.description ?? "");
        }
        return;
      }
      if (!timelineData) return;
      if (kind === "act") {
        const act = (timelineData.acts ?? []).find((a) => a.id === id);
        if (act) {
          openNodeEditDialog(kind, id, act.title ?? "", act.description ?? "");
        }
      } else if (kind === "sequence") {
        const seq = (timelineData.sequences ?? []).find((s) => s.id === id);
        if (seq) {
          openNodeEditDialog(kind, id, seq.title ?? "", seq.description ?? "");
        }
      } else if (kind === "scene") {
        const scene = (timelineData.scenes ?? []).find((s) => s.id === id);
        if (scene) {
          openNodeEditDialog(
            kind,
            id,
            scene.title ?? "",
            scene.description ?? "",
          );
        }
      } else if ("shots" in timelineData) {
        const shot = ((timelineData as TimelineData).shots ?? []).find(
          (s) => s.id === id,
        );
        if (shot) {
          openNodeEditDialog(
            kind,
            id,
            String(shot.shotNumber ?? ""),
            shot.description ?? "",
          );
        }
      }
    },
    [beats, openNodeEditDialog, timelineData],
  );

  const openNodeEditWithAudioLinkFocus = useCallback(
    (kind: AddNodeKind | "beat", id: string) => {
      setFocusLinkSection(true);
      setRequestOpenLinkPicker(false);
      openNodeEditForKind(kind, id);
    },
    [openNodeEditForKind],
  );

  const commitLinkedAudioClip = useCallback(
    async (clip: {
      sceneId: string;
      startSec: number;
      endSec: number;
      linkedNodeId: string;
    }) => {
      const td = timelineDataRef.current as TimelineData | null;
      if (!td) return;

      const linkedBlock =
        sceneBlocksRef.current.find((b) => b.id === clip.linkedNodeId) ??
        shotBlocksRef.current.find((b) => b.id === clip.linkedNodeId);
      if (!linkedBlock) return;

      const scene = td.scenes?.find((s) => s.id === clip.sceneId);
      const seq = scene
        ? td.sequences?.find((s) => s.id === scene.sequenceId)
        : undefined;
      const act = seq ? td.acts?.find((a) => a.id === seq.actId) : undefined;
      const sceneBlock = sceneBlocksRef.current.find(
        (b) => b.id === clip.sceneId,
      );
      const sequenceBlock = seq
        ? sequenceBlocksRef.current.find((b) => b.id === seq.id)
        : undefined;
      const actBlock = act
        ? actBlocksRef.current.find((b) => b.id === act.id)
        : undefined;
      if (!sceneBlock || !sequenceBlock || !actBlock) return;

      const expanded = expandTimelineDataForLinkedNodeClip({
        timelineData: td,
        clip,
        linkedBlock,
        blocks: { actBlock, sequenceBlock, sceneBlock },
        totalDurSec: durationRef.current,
      });
      if (!expanded) return;

      const token = await getAccessToken();
      if (!token) return;

      const { expansion } = expanded;
      if (expansion.act && act && isPersistedTimelineNodeId(act.id)) {
        await TimelineAPI.updateAct(
          act.id,
          {
            metadata: {
              ...(act.metadata || {}),
              pct_from: expansion.act.pct_from,
              pct_to: expansion.act.pct_to,
            },
          },
          token,
        );
      }
      if (expansion.sequence && seq && isPersistedTimelineNodeId(seq.id)) {
        await TimelineAPI.updateSequence(
          seq.id,
          {
            metadata: {
              ...(seq.metadata || {}),
              pct_from: expansion.sequence.pct_from,
              pct_to: expansion.sequence.pct_to,
            },
          },
          token,
        );
      }
      if (expansion.scene && scene && isPersistedTimelineNodeId(scene.id)) {
        await TimelineAPI.updateScene(
          scene.id,
          {
            metadata: {
              ...(scene.metadata || {}),
              pct_from: expansion.scene.pct_from,
              pct_to: expansion.scene.pct_to,
            },
          },
          token,
        );
      }

      setTimelineData(expanded.timelineData);
      onDataChange?.(expanded.timelineData);
    },
    [getAccessToken, onDataChange],
  );
  commitLinkedAudioClipRef.current = commitLinkedAudioClip;

  const getSceneAudioLinkOccupantLabel = useCallback(
    (nodeId: string) => {
      if (!timelineData) return nodeId;
      if ("shots" in timelineData) {
        const shot = (timelineData as TimelineData).shots?.find(
          (s) => s.id === nodeId,
        );
        if (shot) return String(shot.shotNumber ?? nodeId);
      }
      const scene = timelineData.scenes?.find((s) => s.id === nodeId);
      return scene?.title?.trim() || nodeId;
    },
    [timelineData],
  );

  const getAudioLinkLabel = useCallback(
    (nodeId: string) => {
      const link = getLinkForNode(sceneAudioLaneLinks.links, nodeId);
      if (!link) return undefined;
      const character =
        timelineAudio.laneProps.characterLanes.getCharacterForLane(
          link.laneIndex,
        );
      return getSceneAudioLinkLabel(link.laneIndex, character?.name);
    },
    [sceneAudioLaneLinks.links, timelineAudio.laneProps.characterLanes],
  );

  const sidebarSceneAudioLink = useMemo(() => {
    if (isBookProject) return null;
    return resolveSidebarStructureAudioLink({
      editingDialogOpen: nodeEditDialogOpen,
      editingNodeId: editingNode?.kind === "scene" ? editingNode.id : undefined,
      editingNodeKind: editingNode?.kind === "scene" ? "scene" : undefined,
      blocks: sceneBlocks.map((b) => ({
        id: b.id,
        startSec: b.startSec,
        endSec: b.endSec,
      })),
      viewStartSec,
      viewEndSec,
      getLabel: getAudioLinkLabel,
    });
  }, [
    isBookProject,
    nodeEditDialogOpen,
    editingNode,
    sceneBlocks,
    viewStartSec,
    viewEndSec,
    getAudioLinkLabel,
  ]);

  const sidebarShotAudioLink = useMemo(() => {
    if (isBookProject || isAudioProject) return null;
    return resolveSidebarStructureAudioLink({
      editingDialogOpen: nodeEditDialogOpen,
      editingNodeId: editingNode?.kind === "shot" ? editingNode.id : undefined,
      editingNodeKind: editingNode?.kind === "shot" ? "shot" : undefined,
      blocks: shotBlocks.map((b) => ({
        id: (b as { id: string }).id,
        startSec: (b as { startSec: number }).startSec,
        endSec: (b as { endSec: number }).endSec,
      })),
      viewStartSec,
      viewEndSec,
      getLabel: getAudioLinkLabel,
    });
  }, [
    isAudioProject,
    isBookProject,
    nodeEditDialogOpen,
    editingNode,
    shotBlocks,
    viewStartSec,
    viewEndSec,
    getAudioLinkLabel,
  ]);

  const handleDuplicateShot = useCallback(
    async (shotId: string) => {
      if (!timelineData || !("shots" in timelineData)) return;
      const shots = (timelineData as TimelineData).shots ?? [];
      const shot = shots.find((s) => s.id === shotId);
      if (!shot) return;
      try {
        const token = await getAccessToken();
        if (!token) return;
        await ShotsAPI.createShot(
          shot.sceneId,
          {
            shotNumber: `${shot.shotNumber} (Kopie)`,
            description: shot.description,
            cameraAngle: shot.cameraAngle,
            cameraMovement: shot.cameraMovement,
            framing: shot.framing,
            lens: shot.lens,
            duration: shot.duration,
            shotlengthMinutes: shot.shotlengthMinutes,
            shotlengthSeconds: shot.shotlengthSeconds,
            notes: shot.notes,
            dialog: shot.dialog,
            projectId,
          },
          token,
        );
        toast.success("Shot duplicated");
        await reloadTimelineDataFromSource();
      } catch (error) {
        console.error("[VideoEditorTimeline] duplicate shot failed:", error);
        toast.error("Duplicate failed");
      }
    },
    [getAccessToken, projectId, reloadTimelineDataFromSource, timelineData],
  );

  const handleDeleteShot = useCallback(
    async (shotId: string) => {
      if (!timelineData || !("shots" in timelineData)) return;
      const shot = ((timelineData as TimelineData).shots ?? []).find(
        (s) => s.id === shotId,
      );
      if (!shot) return;
      if (
        !confirm(
          `Delete Shot "${shot.shotNumber || shot.description || "Shot"}"?`,
        )
      ) {
        return;
      }
      try {
        const token = await getAccessToken();
        if (!token) return;
        await ShotsAPI.deleteShot(shotId, token);
        toast.success("Shot deleted");
        await reloadTimelineDataFromSource();
      } catch (error) {
        console.error("[VideoEditorTimeline] delete shot failed:", error);
        toast.error("Delete failed");
        await reloadTimelineDataFromSource();
      }
    },
    [getAccessToken, reloadTimelineDataFromSource, timelineData],
  );

  const handleDuplicateBeat = useCallback(
    async (beatId: string) => {
      const beat = beats.find((b) => b.id === beatId);
      if (!beat) return;
      try {
        await BeatsAPI.createBeat({
          project_id: projectId,
          label: `${beat.label} (Kopie)`,
          description: beat.description,
          from_container_id: beat.from_container_id,
          to_container_id: beat.to_container_id,
          pct_from: beat.pct_from,
          pct_to: beat.pct_to,
          color: beat.color,
          notes: beat.notes,
          order_index: beats.length,
        });
        const fresh = await BeatsAPI.getBeats(projectId);
        setBeats(fresh);
        toast.success("Beat duplicated");
      } catch (error) {
        console.error("[VideoEditorTimeline] duplicate beat failed:", error);
        toast.error("Duplicate failed");
      }
    },
    [beats, projectId],
  );

  const handleDeleteBeatWithConfirm = useCallback(
    async (beatId: string) => {
      const beat = beats.find((b) => b.id === beatId);
      if (!beat) return;
      if (!confirm(`Delete Beat "${beat.label}"?`)) return;
      await handleDeleteBeat(beatId);
    },
    [beats, handleDeleteBeat],
  );

  const handleDeleteBeatsBatch = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const message =
        ids.length === 1
          ? `Delete Beat "${beats.find((b) => b.id === ids[0])?.label ?? "Beat"}"?`
          : `${ids.length} Beats wirklich löschen?`;
      if (!confirm(message)) return;
      const sorted = [...ids].sort((a, b) => {
        const ba = beats.find((x) => x.id === a);
        const bb = beats.find((x) => x.id === b);
        return (bb?.pct_from ?? 0) - (ba?.pct_from ?? 0);
      });
      for (const id of sorted) {
        await handleDeleteBeat(id);
      }
    },
    [beats, handleDeleteBeat],
  );

  const handleDuplicateBeatsBatch = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      try {
        for (const id of ids) {
          const beat = beats.find((b) => b.id === id);
          if (!beat) continue;
          await BeatsAPI.createBeat({
            project_id: projectId,
            label: `${beat.label} (Kopie)`,
            description: beat.description,
            from_container_id: beat.from_container_id,
            to_container_id: beat.to_container_id,
            pct_from: beat.pct_from,
            pct_to: beat.pct_to,
            color: beat.color,
            notes: beat.notes,
            order_index: beats.length,
          });
        }
        let fresh = await BeatsAPI.getBeats(projectId);
        if (beatMagnetEnabled) {
          const { beats: packed } = packBeatsGapless(sortBeatsByStart(fresh));
          for (const b of packed) {
            await BeatsAPI.updateBeat(b.id, {
              pct_from: b.pct_from,
              pct_to: b.pct_to,
            });
          }
          fresh = await BeatsAPI.getBeats(projectId);
        }
        setBeats(fresh);
        toast.success(
          ids.length === 1
            ? "Beat duplicated"
            : `${ids.length} Beats dupliziert`,
        );
      } catch (error) {
        console.error(
          "[VideoEditorTimeline] batch duplicate beats failed:",
          error,
        );
        toast.error("Duplicate failed");
      }
    },
    [beatMagnetEnabled, beats, projectId],
  );

  const handleDeleteScenesBatch = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const label = structureCrud.labelFor("scene");
      const message =
        ids.length === 1
          ? `${label} wirklich löschen?`
          : `${ids.length} ${structureCrud.labelPluralFor("scene")} wirklich löschen?`;
      if (!confirm(message)) return;
      const token = await getAccessToken();
      if (!token) return;
      try {
        for (const id of ids) {
          await TimelineAPI.deleteScene(id, token);
        }
        toast.success(
          ids.length === 1
            ? `${label} gelöscht`
            : `${ids.length} ${structureCrud.labelPluralFor("scene")} gelöscht`,
        );
        await reloadTimelineDataFromSource();
      } catch (error) {
        console.error(
          "[VideoEditorTimeline] batch delete scenes failed:",
          error,
        );
        toast.error("Fehler beim Löschen");
        await reloadTimelineDataFromSource();
      }
    },
    [getAccessToken, reloadTimelineDataFromSource, structureCrud],
  );

  const handleDuplicateScenesBatch = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      for (const id of ids) {
        await structureCrud.handleDuplicateScene(id);
      }
    },
    [structureCrud],
  );

  const handleDeleteStructureSelectionBatch = useCallback(
    async (selection: {
      acts: Set<string>;
      sequences: Set<string>;
      scenes: Set<string>;
      shots: Set<string>;
    }) => {
      const actIds = [...selection.acts];
      const sequenceIds = [...selection.sequences];
      const sceneIds = [...selection.scenes];
      const shotIds = [...selection.shots];
      const total =
        actIds.length + sequenceIds.length + sceneIds.length + shotIds.length;
      if (total === 0) return;
      if (
        !confirm(
          total === 1
            ? "Ausgewähltes Strukturelement wirklich löschen?"
            : `${total} Strukturelemente wirklich löschen?`,
        )
      ) {
        return;
      }
      for (const id of actIds) await structureCrud.handleDeleteAct(id);
      for (const id of sequenceIds)
        await structureCrud.handleDeleteSequence(id);
      const token = await getAccessToken();
      if (sceneIds.length > 0 && token) {
        for (const id of sceneIds) {
          await TimelineAPI.deleteScene(id, token);
        }
        await reloadTimelineDataFromSource();
      }
      for (const id of shotIds) await handleDeleteShot(id);
    },
    [
      getAccessToken,
      handleDeleteShot,
      reloadTimelineDataFromSource,
      structureCrud,
    ],
  );

  const handleDuplicateStructureSelectionBatch = useCallback(
    async (selection: {
      acts: Set<string>;
      sequences: Set<string>;
      scenes: Set<string>;
      shots: Set<string>;
    }) => {
      for (const id of selection.acts)
        await structureCrud.handleDuplicateAct(id);
      for (const id of selection.sequences)
        await structureCrud.handleDuplicateSequence(id);
      if (selection.scenes.size > 0) {
        await handleDuplicateScenesBatch([...selection.scenes]);
      }
      for (const id of selection.shots) await handleDuplicateShot(id);
    },
    [handleDuplicateScenesBatch, handleDuplicateShot, structureCrud],
  );

  const isTimelineMarqueeBlocked = useCallback(
    () =>
      Boolean(
        clipTrimActiveRef.current ||
        beatTrimActiveRef.current ||
        beatMovePendingRef.current ||
        beatMoveActiveRef.current ||
        structureMovePendingRef.current ||
        structureMoveActiveRef.current ||
        structureMoveBridgeRef.current?.isActive() ||
        structureTrimBridgeRef.current?.isActive() ||
        beatMarqueeSelectionRef.current?.isMarqueeActive() ||
        structureMarqueeSelectionRef.current?.isMarqueeActive(),
      ),
    [],
  );

  const getBeatStackRef = useCallback(() => beatStackRef, []);
  const getStructureStackRef = useCallback(() => structureStackRef, []);

  const beatMarqueeSelection = useTimelineMarqueeSelection({
    kinds: BEAT_MARQUEE_KINDS,
    getStackRef: getBeatStackRef,
    interactionModeRef: timelineInteractionModeRef,
    isGestureBlocked: isTimelineMarqueeBlocked,
    onPeerClear: () => structureMarqueeSelectionRef.current?.clearSelection(),
    onEdit: (kind, id) => openNodeEditForKind(kind, id),
    onBatchDelete: async (selection) => {
      if (selection.beats.size > 0) {
        await handleDeleteBeatsBatch([...selection.beats]);
      }
    },
    onBatchDuplicate: async (selection) => {
      if (selection.beats.size > 0) {
        await handleDuplicateBeatsBatch([...selection.beats]);
      }
    },
  });
  beatMarqueeSelectionRef.current = beatMarqueeSelection;

  const structureMarqueeSelection = useTimelineMarqueeSelection({
    kinds: STRUCTURE_MARQUEE_KINDS,
    getStackRef: getStructureStackRef,
    interactionModeRef: timelineInteractionModeRef,
    isGestureBlocked: isTimelineMarqueeBlocked,
    onPeerClear: () => beatMarqueeSelectionRef.current?.clearSelection(),
    onEdit: (kind, id) => openNodeEditForKind(kind, id),
    onBatchDelete: handleDeleteStructureSelectionBatch,
    onBatchDuplicate: handleDuplicateStructureSelectionBatch,
  });
  structureMarqueeSelectionRef.current = structureMarqueeSelection;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (
        e.key.toLowerCase() === "v" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        setTimelineInteractionMode("select");
      }
      if (
        e.key.toLowerCase() === "m" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        setTimelineInteractionMode("move");
      }
      if (e.code === "Space" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target;
        if (
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            target.closest("input, textarea, select, [contenteditable='true']"))
        ) {
          return;
        }
        e.preventDefault();
        handleTransportToggleRef.current();
      }
      if (
        (e.code === "Home" || e.key === "0") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        handleTransportStopRef.current();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeNodeEdit = useCallback(() => {
    setNodeEditDialogOpen(false);
    setEditingNode(null);
    setFocusLinkSection(false);
    setRequestOpenLinkPicker(false);
  }, []);

  const commitNodeEdit = useCallback(async () => {
    if (!editingNode) return;
    const nextTitle = editingNode.title.trim();
    if (!nextTitle) {
      toast.error("Title cannot be empty");
      return;
    }
    const token = await getAccessToken();
    if (!token && editingNode.kind !== "beat") {
      toast.error("Not authenticated");
      return;
    }
    try {
      if (editingNode.kind === "beat") {
        if (dbBeatIds.has(editingNode.id)) {
          await BeatsAPI.updateBeat(editingNode.id, {
            label: nextTitle,
            description: editingNode.description,
          });
        }
        setBeats((prev) =>
          prev.map((b) =>
            b.id === editingNode.id
              ? {
                  ...b,
                  label: nextTitle,
                  description: editingNode.description,
                }
              : b,
          ),
        );
      } else if (editingNode.kind === "act") {
        await TimelineAPI.updateAct(
          editingNode.id,
          { title: nextTitle, description: editingNode.description },
          token!,
        );
      } else if (editingNode.kind === "sequence") {
        await TimelineAPI.updateSequence(
          editingNode.id,
          { title: nextTitle, description: editingNode.description },
          token!,
        );
      } else if (editingNode.kind === "scene") {
        await TimelineAPI.updateScene(
          editingNode.id,
          { title: nextTitle, description: editingNode.description },
          token!,
        );
      } else {
        await ShotsAPI.updateShot(
          editingNode.id,
          {
            shotNumber: nextTitle,
            description: editingNode.description,
          } as Partial<Shot>,
          token!,
        );
      }

      if (editingNode.kind !== "beat") {
        setTimelineData((prev) => {
          if (!prev) return prev;
          if (editingNode.kind === "act") {
            return {
              ...prev,
              acts: (prev.acts || []).map((a) =>
                a.id === editingNode.id
                  ? {
                      ...a,
                      title: nextTitle,
                      description: editingNode.description,
                    }
                  : a,
              ),
            };
          }
          if (editingNode.kind === "sequence") {
            return {
              ...prev,
              sequences: (prev.sequences || []).map((s) =>
                s.id === editingNode.id
                  ? {
                      ...s,
                      title: nextTitle,
                      description: editingNode.description,
                    }
                  : s,
              ),
            };
          }
          if (editingNode.kind === "scene") {
            return {
              ...prev,
              scenes: (prev.scenes || []).map((s) =>
                s.id === editingNode.id
                  ? {
                      ...s,
                      title: nextTitle,
                      description: editingNode.description,
                    }
                  : s,
              ),
            };
          }
          if ("shots" in prev) {
            return {
              ...prev,
              shots: ((prev as TimelineData).shots || []).map((s) =>
                s.id === editingNode.id
                  ? {
                      ...s,
                      shotNumber: nextTitle,
                      description: editingNode.description,
                    }
                  : s,
              ),
            };
          }
          return prev;
        });
      }

      toast.success("Saved");
      closeNodeEdit();
    } catch (error) {
      console.error("[VideoEditorTimeline] node edit failed:", error);
      toast.error("Save failed");
    }
  }, [closeNodeEdit, dbBeatIds, editingNode, getAccessToken]);

  const startInlineTitleEdit = useCallback(
    (kind: EditableTitleKind, id: string, currentTitle?: string) => {
      setEditingTitle({
        kind,
        id,
        value: currentTitle || "",
      });
    },
    [],
  );

  const handleStructureClipTitleClick = useCallback(
    (kind: EditableTitleKind, id: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      if (
        structureMarqueeSelection.handleClipShiftClick(
          kind as TimelineSelectableKind,
          id,
          e,
        )
      ) {
        return;
      }
      if (structureMarqueeSelection.shouldSuppressClipClick()) {
        return;
      }
      if (structureBodyDragMovedRef.current) {
        structureBodyDragMovedRef.current = false;
        return;
      }
      openNodeEditForKind(kind, id);
    },
    [openNodeEditForKind, structureMarqueeSelection],
  );

  const handleModalDuplicate = useCallback(() => {
    if (!editingNode) return;
    const { kind, id } = editingNode;
    closeNodeEdit();
    if (kind === "act") void structureCrud.handleDuplicateAct(id);
    else if (kind === "sequence")
      void structureCrud.handleDuplicateSequence(id);
    else if (kind === "scene") void structureCrud.handleDuplicateScene(id);
    else if (kind === "shot") void handleDuplicateShot(id);
    else if (kind === "beat") void handleDuplicateBeat(id);
  }, [
    closeNodeEdit,
    editingNode,
    handleDuplicateBeat,
    handleDuplicateShot,
    structureCrud,
  ]);

  const handleModalDelete = useCallback(() => {
    if (!editingNode) return;
    const { kind, id } = editingNode;
    closeNodeEdit();
    if (kind === "act") void structureCrud.handleDeleteAct(id);
    else if (kind === "sequence") void structureCrud.handleDeleteSequence(id);
    else if (kind === "scene") void structureCrud.handleDeleteScene(id);
    else if (kind === "shot") void handleDeleteShot(id);
    else if (kind === "beat") void handleDeleteBeatWithConfirm(id);
  }, [
    closeNodeEdit,
    editingNode,
    handleDeleteBeatWithConfirm,
    handleDeleteShot,
    structureCrud,
  ]);

  const handleModalInfo = useCallback(() => {
    if (!editingNode) return;
    const { kind, id } = editingNode;
    if (kind === "beat") return;
    closeNodeEdit();
    openStructureInfo(kind, id);
  }, [closeNodeEdit, editingNode, openStructureInfo]);

  const cancelInlineTitleEdit = useCallback(() => {
    setEditingTitle(null);
  }, []);

  const commitInlineTitleEdit = useCallback(async () => {
    if (!editingTitle) return;
    const nextTitle = editingTitle.value.trim();
    if (!nextTitle) {
      toast.error("Titel darf nicht leer sein");
      return;
    }
    const token = await getAccessToken();
    if (!token) {
      toast.error("Nicht authentifiziert");
      return;
    }
    try {
      if (editingTitle.kind === "beat") {
        if (dbBeatIds.has(editingTitle.id)) {
          await BeatsAPI.updateBeat(editingTitle.id, { label: nextTitle });
        }
        setBeats((prev) =>
          prev.map((b) =>
            b.id === editingTitle.id ? { ...b, label: nextTitle } : b,
          ),
        );
        toast.success("Beat-Name gespeichert");
        setEditingTitle(null);
        return;
      }
      if (editingTitle.kind === "act") {
        await TimelineAPI.updateAct(
          editingTitle.id,
          { title: nextTitle },
          token,
        );
      } else if (editingTitle.kind === "sequence") {
        await TimelineAPI.updateSequence(
          editingTitle.id,
          { title: nextTitle },
          token,
        );
      } else if (editingTitle.kind === "scene") {
        await TimelineAPI.updateScene(
          editingTitle.id,
          { title: nextTitle },
          token,
        );
      } else {
        await ShotsAPI.updateShot(
          editingTitle.id,
          { shotNumber: nextTitle } as any,
          token,
        );
      }
      setTimelineData((prev) => {
        if (!prev) return prev;
        if (editingTitle.kind === "act") {
          return {
            ...prev,
            acts: (prev.acts || []).map((a: any) =>
              a.id === editingTitle.id ? { ...a, title: nextTitle } : a,
            ),
          };
        }
        if (editingTitle.kind === "sequence") {
          return {
            ...prev,
            sequences: (prev.sequences || []).map((s: any) =>
              s.id === editingTitle.id ? { ...s, title: nextTitle } : s,
            ),
          };
        }
        if (editingTitle.kind === "scene") {
          return {
            ...prev,
            scenes: (prev.scenes || []).map((s: any) =>
              s.id === editingTitle.id ? { ...s, title: nextTitle } : s,
            ),
          };
        }
        if ("shots" in prev) {
          return {
            ...prev,
            shots: ((prev as any).shots || []).map((s: any) =>
              s.id === editingTitle.id
                ? { ...s, shotNumber: nextTitle, shot_number: nextTitle }
                : s,
            ),
          } as TimelineData;
        }
        return prev;
      });
      toast.success("Titel gespeichert");
      setEditingTitle(null);
    } catch (error) {
      console.error("[VideoEditorTimeline] Inline title update failed:", error);
      toast.error("Titel konnte nicht gespeichert werden");
    }
  }, [editingTitle, getAccessToken, dbBeatIds]);

  // 🎯 UPDATE REF: Store sceneBlocks for playback functions
  sceneBlocksRef.current = sceneBlocks;

  /** Delay single-click title open so double-click can open scene content without flashing the title modal first */
  const sceneTitleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  useEffect(() => {
    return () => {
      if (sceneTitleClickTimerRef.current)
        clearTimeout(sceneTitleClickTimerRef.current);
    };
  }, []);

  // 🚀 INITIAL TEXT LOAD: Load first scene text on mount
  useEffect(() => {
    if (isBookProject && sceneBlocks.length > 0 && wordsArray.length === 0) {
      const firstScene = sceneBlocks[0];
      playheadSeek(firstScene.startSec);
      syncBookAtTime(firstScene.startSec);
    }
  }, [
    isBookProject,
    playheadSeek,
    sceneBlocks.length,
    syncBookAtTime,
    wordsArray.length,
  ]);

  // 📖 PAGE MARKERS FOR BOOKS (adaptive intervals based on zoom!)
  const pageMarkers: { x: number; page: number }[] = [];

  if (isBookProject && wordsPerPage && readingSpeedWpm) {
    // Calculate page positions based on WORD COUNT
    // Page N = N × wordsPerPage words
    // Position = (words / readingSpeedWpm) × 60 seconds

    // Use adaptive page increment based on pxPerSec (intelligent spacing like time markers!)
    const pageIncrement = getPageMarkerInterval(
      pxPerSec,
      wordsPerPage,
      readingSpeedWpm,
    );

    const estimatedTotalPages = (totalWords || 0) / wordsPerPage;
    const maxPages = targetPages || estimatedTotalPages;
    const firstPage =
      Math.floor(
        ((viewStartSec / 60) * readingSpeedWpm) / wordsPerPage / pageIncrement,
      ) * pageIncrement;
    const lastPage =
      Math.ceil(
        ((viewEndSec / 60) * readingSpeedWpm) / wordsPerPage / pageIncrement,
      ) * pageIncrement;

    for (
      let page = firstPage;
      page <= lastPage && page <= maxPages;
      page += pageIncrement
    ) {
      // Position based on word count: page N is at (N × wordsPerPage) words
      const wordsAtPage = page * wordsPerPage;
      const pageSec = (wordsAtPage / readingSpeedWpm) * 60; // Convert to seconds
      const x = (pageSec - viewStartSec) * pxPerSec;
      pageMarkers.push({ x, page });
    }

    console.log("[VideoEditorTimeline] 📄 Page Markers (adaptive):", {
      pxPerSec: pxPerSec.toFixed(2),
      pageIncrement,
      wordsPerPage,
      readingSpeedWpm,
      totalWords,
      estimatedPages: estimatedTotalPages.toFixed(1),
      markerCount: pageMarkers.length,
      firstPage: firstPage.toFixed(1),
      lastPage: lastPage.toFixed(1),
      example:
        pageMarkers.length > 0
          ? `Page ${pageMarkers[0].page}: ${pageMarkers[0].page * wordsPerPage} words = ${(((pageMarkers[0].page * wordsPerPage) / readingSpeedWpm) * 60).toFixed(1)}s`
          : "none",
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col bg-background",
        isFullscreen ? "fixed inset-0 z-50" : "h-full",
      )}
    >
      <StructureTimelinePreviewPanel
        isBookProject={isBookProject}
        isAudioProject={isAudioProject}
        isFilmProject={isFilmProject}
        previewAreaTitle={strategy.previewAreaTitle}
        wordsArray={wordsArray}
        currentWordIndex={currentWordIndex}
        currentSceneTitle={
          sceneBlocks.find((s) => s.id === currentSceneId)?.title
        }
        activePreviewImageUrl={activePreviewImageUrl}
        activePreviewLabel={activePreviewLabel}
        activePreviewScene={activePreviewScene}
        activePreviewShot={activePreviewShot}
        activePreviewSceneId={activePreviewSceneId}
        activePreviewShotId={activePreviewShotId}
        playing={isPlaying}
        canPlay={transportGuard.canPlay}
        canPlayReason={transportGuard.reason}
        isFullscreen={isFullscreen}
        positionSec={currentTime}
        duration={duration}
        readingSpeedWpm={readingSpeedWpm}
        formatTimeLabel={formatTimeLabel}
        uploadingSceneId={uploadingSceneId}
        uploadingShotId={uploadingShotId}
        onToggle={handleTransportToggle}
        onStop={handleTransportStop}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onUploadSceneImage={(sceneId) => void pickAndUploadSceneImage(sceneId)}
        onUploadShotImage={(shotId) => void pickAndUploadShotImage(shotId)}
      />

      <StructureTimelineToolbar
        duration={duration}
        formatTimeLabel={formatTimeLabel}
        isBookProject={isBookProject}
        targetPages={targetPages}
        timelineInteractionMode={timelineInteractionMode}
        onInteractionModeChange={setTimelineInteractionMode}
        zoom={zoom}
        fitPxPerSec={fitPxPerSec}
        maxPxPerSec={maxPxPerSec}
        onZoomAroundCursor={setZoomAroundCursor}
        onZoomSlider={handleZoomSlider}
        playing={isPlaying}
        canPlay={transportGuard.canPlay}
        canPlayReason={transportGuard.reason}
        positionSec={currentTime}
        onToggle={handleTransportToggle}
        onStop={handleTransportStop}
      />

      {/* Timeline: labels + lanes share one vertical scroll (FL Studio / CapCut) */}
      <div
        ref={verticalScrollRef}
        className="flex flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-primary scrollbar-track-muted"
      >
        <div className="flex min-h-min w-full">
          {/* Track Labels */}
          <div
            className={cn(
              "flex-shrink-0 bg-card border-r border-border overflow-x-hidden",
              showAudioDawLanes
                ? "w-[248px] min-w-[248px] max-w-[248px]"
                : "w-24 min-w-[5.5rem]",
            )}
          >
            <div className="h-12 border-b border-border px-2 flex items-center bg-card">
              <span className="text-[9px] text-foreground font-medium">
                Zeit
              </span>
            </div>
            <div
              data-testid="timeline-label-beat"
              className="border-b border-border px-2 flex items-center justify-between bg-card relative"
              style={{ height: `${trackHeights.beat}px` }}
            >
              <span className="text-[9px] text-foreground font-medium">
                Beat
              </span>
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
            <div
              data-testid="timeline-label-act"
              className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-card relative"
              style={{ height: `${trackHeights.act}px` }}
            >
              <span className="text-[9px] text-foreground font-medium truncate min-w-0">
                {strategy.actTrackLabel}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <TimelineTrackAddButton
                  onClick={() => openAddDialogForKind("act")}
                  title={`${labelByKind.act} hinzufügen`}
                />
                {showFilmClipMagnets && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setTrackAutosnap((t) => ({ ...t, act: !t.act }))
                      }
                      className={cn(
                        "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                        trackAutosnap.act
                          ? "text-primary opacity-100"
                          : "text-muted-foreground opacity-40",
                      )}
                      title={
                        trackAutosnap.act
                          ? "Act: Autosnap an"
                          : "Act: Autosnap aus"
                      }
                    >
                      <Crosshair className="size-3.5" strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setClipMagnets((m) => ({ ...m, act: !m.act }))
                      }
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
                )}
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
            <div
              className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-card relative"
              style={{ height: `${trackHeights.sequence}px` }}
            >
              <span className="text-[9px] text-foreground font-medium truncate min-w-0">
                {strategy.sequenceTrackLabel}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <TimelineTrackAddButton
                  onClick={() => openAddDialogForKind("sequence")}
                  title={`${labelByKind.sequence} hinzufügen`}
                />
                {showFilmClipMagnets && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setTrackAutosnap((t) => ({
                          ...t,
                          sequence: !t.sequence,
                        }))
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
                )}
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
            <div
              className="border-b border-border px-1.5 flex items-center justify-between gap-1 bg-card relative"
              style={{ height: `${trackHeights.scene}px` }}
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
                {showFilmClipMagnets && (
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
                      onClick={() =>
                        setClipMagnets((m) => ({ ...m, scene: !m.scene }))
                      }
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
                )}
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
            {showFilmProductionTracks && (
              <ShotTrackLabel
                trackHeightPx={trackHeights.shot}
                shotAddLabel={labelByKind.shot}
                trackAutosnapShot={trackAutosnap.shot}
                clipMagnetShot={clipMagnets.shot}
                resizingTrack={resizingTrack}
                onToggleAutosnap={() =>
                  setTrackAutosnap((t) => ({ ...t, shot: !t.shot }))
                }
                onToggleMagnet={() =>
                  setClipMagnets((m) => ({ ...m, shot: !m.shot }))
                }
                onResizeStart={(e) => handleResizeStart("shot", e)}
                onAddShot={() => openAddDialogForKind("shot")}
                sidebarAudioLink={sidebarShotAudioLink ?? undefined}
                onSidebarAudioLinkClick={(shotId) =>
                  openNodeEditWithAudioLinkFocus("shot", shotId)
                }
              />
            )}
            {showAudioDawLaneRows && (
              <StructureTimelineAudioLaneLabels
                laneProps={timelineAudio.laneProps}
                addAudio={timelineAudio.addAudio}
                metronome={timelineAudio.metronome}
                isLoading={timelineAudio.lanes.isLoading}
              />
            )}
            {showFilmProductionTracks && (
              <>
                {showEditorialClipTrack && (
                  <div
                    data-testid="timeline-label-film-clip"
                    className="border-b border-border px-1 flex items-center justify-between gap-0.5 bg-muted/20 relative"
                    style={{ height: `${trackHeights.editorialClip}px` }}
                    title="Editorial-Clips (NLE): gleiche Spur wie Shot/Musik — nur im Tab „Timeline“"
                  >
                    <div className="flex items-center gap-1 min-w-0">
                      <Clapperboard
                        className="size-3 shrink-0 text-zinc-600 dark:text-zinc-300"
                        aria-hidden
                      />
                      <span className="text-[9px] text-foreground font-semibold leading-tight truncate">
                        Clip
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setTrackAutosnap((t) => ({
                            ...t,
                            editorialClip: !t.editorialClip,
                          }))
                        }
                        className={cn(
                          "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                          trackAutosnap.editorialClip
                            ? "text-primary opacity-100"
                            : "text-muted-foreground opacity-40",
                        )}
                        title={
                          trackAutosnap.editorialClip
                            ? "Clip: Autosnap an"
                            : "Clip: Autosnap aus"
                        }
                      >
                        <Crosshair className="size-3.5" strokeWidth={2.25} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setClipMagnets((m) => ({
                            ...m,
                            editorialClip: !m.editorialClip,
                          }))
                        }
                        className={cn(
                          "relative z-10 p-0.5 rounded transition-all hover:scale-110 hover:bg-muted/50",
                          clipMagnets.editorialClip
                            ? "text-primary opacity-100"
                            : "text-muted-foreground opacity-40",
                        )}
                        title={
                          clipMagnets.editorialClip
                            ? "Clip: Magnet (alle Kanten)"
                            : "Clip: nur Playhead"
                        }
                      >
                        <Magnet className="size-3.5" strokeWidth={2.25} />
                      </button>
                    </div>
                    <div
                      className={cn(
                        "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                        resizingTrack === "editorialClip"
                          ? "border-b-4 border-primary"
                          : "hover:border-b-4 hover:border-primary",
                      )}
                      onMouseDown={(e) => handleResizeStart("editorialClip", e)}
                    />
                  </div>
                )}
                <div
                  className="border-b border-border px-2 flex items-center bg-card relative"
                  style={{ height: `${trackHeights.music}px` }}
                >
                  <span className="text-[9px] text-foreground font-medium leading-tight">
                    Musik
                  </span>
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                      resizingTrack === "music"
                        ? "border-b-4 border-primary"
                        : "hover:border-b-4 hover:border-primary",
                    )}
                    onMouseDown={(e) => handleResizeStart("music", e)}
                  />
                </div>
                <div
                  className="border-b border-border px-2 flex items-center bg-card relative"
                  style={{ height: `${trackHeights.sfx}px` }}
                >
                  <span className="text-[9px] text-foreground font-medium leading-tight">
                    SFX
                  </span>
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize transition-all",
                      resizingTrack === "sfx"
                        ? "border-b-4 border-primary"
                        : "hover:border-b-4 hover:border-primary",
                    )}
                    onMouseDown={(e) => handleResizeStart("sfx", e)}
                  />
                </div>
              </>
            )}
          </div>

          {/* Timeline Content - horizontal scroll */}
          <div
            ref={scrollRef}
            className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-primary scrollbar-track-muted"
            onWheel={handleWheel}
          >
            <div className="relative" style={{ width: `${totalWidthPx}px` }}>
              <StructureTimelineRuler
                ticks={ticks}
                minorTicks={minorTicks}
                pageMarkers={pageMarkers}
                isBookProject={isBookProject}
                onRulerClick={playheadScrubHandlers.onRulerClick}
              />

              {/* Beat lane — solo marquee */}
              <TimelineStructureSelectionStack
                stackRef={beatStackRef}
                widthPx={totalWidthPx}
                interactionMode={timelineInteractionMode}
                selectionApi={beatMarqueeSelection}
              >
                <BeatTrack
                  containerRef={beatTrackContainerRef}
                  trackHeightPx={trackHeights.beat}
                  pxPerSec={pxPerSec}
                  viewStartSec={viewStartSec}
                  blocks={beatBlocks}
                  beatLayoutEpoch={beatLayoutEpoch}
                  interactionMode={timelineInteractionMode}
                  marqueeSelection={beatMarqueeSelection}
                  structureBodyDragMovedRef={structureBodyDragMovedRef}
                  onBeatMoveMouseDown={handleBeatMoveMouseDown}
                  onTrimStart={handleTrimStart}
                  onOpenBeatEdit={(beatId) =>
                    openNodeEditForKind("beat", beatId)
                  }
                />
              </TimelineStructureSelectionStack>

              {/* Act / Seq / Scene / Shot — cross-track marquee */}
              <TimelineStructureSelectionStack
                stackRef={structureStackRef}
                widthPx={totalWidthPx}
                interactionMode={timelineInteractionMode}
                selectionApi={structureMarqueeSelection}
              >
                <ActTrack
                  containerRef={actTrackContainerRef}
                  trackHeightPx={trackHeights.act}
                  pxPerSec={pxPerSec}
                  viewStartSec={viewStartSec}
                  blocks={filmActRowBlocks}
                  rowKey={structureRowKey}
                  useFilmTreeLayout={useFilmTreeLayout}
                  marqueeSelection={structureMarqueeSelection}
                  onClipTitleClick={handleStructureClipTitleClick}
                  onStructureMoveMouseDown={handleStructureMoveMouseDown}
                  onTrimClipMouseDown={handleTrimClipMouseDown}
                />

                <SequenceTrack
                  containerRef={sequenceTrackContainerRef}
                  trackHeightPx={trackHeights.sequence}
                  pxPerSec={pxPerSec}
                  viewStartSec={viewStartSec}
                  blocks={
                    isBookProject ? sequenceBlocks : filmSequenceRowBlocks
                  }
                  rowKey={structureRowKey}
                  useFilmTreeLayout={useFilmTreeLayout}
                  marqueeSelection={structureMarqueeSelection}
                  onClipTitleClick={handleStructureClipTitleClick}
                  onStructureMoveMouseDown={handleStructureMoveMouseDown}
                  onTrimClipMouseDown={handleTrimClipMouseDown}
                />

                <SceneTrack
                  containerRef={sceneTrackContainerRef}
                  trackHeightPx={trackHeights.scene}
                  pxPerSec={pxPerSec}
                  viewStartSec={viewStartSec}
                  blocks={isBookProject ? sceneBlocks : filmSceneRowBlocks}
                  rowKey={structureRowKey}
                  useFilmTreeLayout={useFilmTreeLayout}
                  isAudioProject={isAudioProject}
                  marqueeSelection={structureMarqueeSelection}
                  structureBodyDragMovedRef={structureBodyDragMovedRef}
                  sceneTitleClickTimerRef={sceneTitleClickTimerRef}
                  scenePreviewById={scenePreviewById}
                  onStructureMoveMouseDown={handleStructureMoveMouseDown}
                  onTrimClipMouseDown={handleTrimClipMouseDown}
                  onOpenSceneEdit={(sceneId) =>
                    openNodeEditForKind("scene", sceneId)
                  }
                  onOpenSceneContentModal={(scene) => {
                    setEditingSceneForModal(scene);
                    setShowContentModal(true);
                  }}
                  onPickAndUploadSceneImage={pickAndUploadSceneImage}
                  onSceneImageFileDrop={structureImageDrop.onSceneImageFileDrop}
                  onFilmSceneClipImageDrop={
                    structureImageDrop.onFilmSceneClipImageDrop
                  }
                  emptyLaneDropBindings={
                    structureImageDrop.emptySceneLaneDropBindings
                  }
                  getAudioLinkLabel={
                    !isBookProject ? getAudioLinkLabel : undefined
                  }
                  onAudioLinkClick={
                    !isBookProject && isAudioProject
                      ? (sceneId) =>
                          openNodeEditWithAudioLinkFocus("scene", sceneId)
                      : undefined
                  }
                  onOpenSceneEditDirect={(sceneId) =>
                    openNodeEditForKind("scene", sceneId)
                  }
                />

                {showFilmProductionTracks && (
                  <ShotTrack
                    containerRef={shotTrackContainerRef}
                    trackHeightPx={trackHeights.shot}
                    pxPerSec={pxPerSec}
                    viewStartSec={viewStartSec}
                    blocks={shotBlocks as StructureTimelineBlock[]}
                    rowKey={structureRowKey}
                    useFilmTreeLayout={useFilmTreeLayout}
                    marqueeSelection={structureMarqueeSelection}
                    structureBodyDragMovedRef={structureBodyDragMovedRef}
                    onTrimClipMouseDown={handleTrimClipMouseDown}
                    onOpenShotEdit={(shotId) =>
                      openNodeEditForKind("shot", shotId)
                    }
                    shotPreviewUrl={(shot) =>
                      shotBlockPreviewUrl(
                        shot as Parameters<typeof timelineClipPreviewUrl>[0],
                      )
                    }
                    onShotImageFileDrop={structureImageDrop.onShotImageFileDrop}
                    emptyLaneDropBindings={
                      structureImageDrop.emptyShotLaneDropBindings
                    }
                    getAudioLinkLabel={
                      !isBookProject ? getAudioLinkLabel : undefined
                    }
                    onAudioLinkClick={
                      !isBookProject
                        ? (shotId) =>
                            openNodeEditWithAudioLinkFocus("shot", shotId)
                        : undefined
                    }
                    onOpenShotEditDirect={(shotId) =>
                      openNodeEditForKind("shot", shotId)
                    }
                  />
                )}
              </TimelineStructureSelectionStack>

              {showAudioDawLaneRows && (
                <StructureTimelineAudioLaneScrollRows
                  laneProps={timelineAudio.laneProps}
                  metronome={timelineAudio.metronome}
                  isLoading={timelineAudio.lanes.isLoading}
                />
              )}

              {/* Shot-Musik/SFX (Film/Serie) — Shot-Spur liegt im Structure-Selection-Stack */}
              {showFilmProductionTracks && (
                <StructureTimelineFilmProductionTracks
                  showEditorialClipTrack={showEditorialClipTrack}
                  trackHeights={{
                    editorialClip: trackHeights.editorialClip,
                    music: trackHeights.music,
                    sfx: trackHeights.sfx,
                  }}
                  clipBlocks={clipBlocks}
                  shotBlocks={shotBlocks}
                  timelineData={timelineData}
                  useFilmTreeLayout={useFilmTreeLayout}
                  canOpenShot={canOpenShot}
                  blockUnderlyingLanePointerEvents={
                    blockUnderlyingLanePointerEvents
                  }
                  onOpenShot={openShot}
                  onNleClipPointerDown={handleNleClipPointerDown}
                />
              )}

              <StructureTimelinePlayheadOverlay
                onPlayheadPointerDown={
                  playheadScrubHandlers.onPlayheadPointerDown
                }
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex-shrink-0 bg-card border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-2 border-primary"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {addableKinds.map((kind) => (
              <DropdownMenuItem
                key={kind}
                onClick={() => openAddDialogForKind(kind)}
              >
                {labelByKind[kind]} hinzufügen
              </DropdownMenuItem>
            ))}
            {showAudioDawLanes && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={timelineAudio.addAudio.isBusy}
                  onClick={() => void timelineAudio.addAudio.addSfxLane()}
                >
                  SFX-Spur hinzufügen
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAddKind
                ? `${labelByKind[pendingAddKind]} hinzufügen`
                : "Element hinzufügen"}
            </DialogTitle>
          </DialogHeader>
          {pendingAddKind ? (
            <div className="space-y-2">
              <Label htmlFor="timeline-parent-select">
                {structureAddDialogParentLabel(
                  pendingAddKind as StructureAddKind,
                  structureAddLabels,
                )}
              </Label>
              <Select
                value={selectedParentId}
                onValueChange={setSelectedParentId}
              >
                <SelectTrigger id="timeline-parent-select">
                  <SelectValue placeholder="Parent auswählen" />
                </SelectTrigger>
                <SelectContent>
                  {getParentOptions(pendingAddKind).map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => void handleConfirmAddWithParent()}
              disabled={!selectedParentId}
            >
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingTitle}
        onOpenChange={(open) => {
          if (!open) cancelInlineTitleEdit();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Titel bearbeiten
              {editingTitle
                ? ` — ${editingTitle.kind === "beat" ? "Beat" : labelByKind[editingTitle.kind as AddNodeKind]}`
                : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="timeline-title-edit">Name</Label>
            <Input
              id="timeline-title-edit"
              value={editingTitle?.value ?? ""}
              onChange={(e) =>
                setEditingTitle((prev) =>
                  prev ? { ...prev, value: e.target.value } : prev,
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commitInlineTitleEdit();
                }
              }}
              placeholder="Titel eingeben..."
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => cancelInlineTitleEdit()}>
              Abbrechen
            </Button>
            <Button onClick={() => void commitInlineTitleEdit()}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TimelineNodeEditDialog
        open={nodeEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeNodeEdit();
          else setNodeEditDialogOpen(true);
        }}
        dialogTitle={
          editingNode
            ? `Edit ${editingNode.kind.charAt(0).toUpperCase()}${editingNode.kind.slice(1)}`
            : "Edit"
        }
        titleLabel={editingNode?.kind === "beat" ? "Label" : "Title"}
        title={editingNode?.title ?? ""}
        description={editingNode?.description ?? ""}
        onTitleChange={(value) =>
          setEditingNode((prev) => (prev ? { ...prev, title: value } : prev))
        }
        onDescriptionChange={(value) =>
          setEditingNode((prev) =>
            prev ? { ...prev, description: value } : prev,
          )
        }
        onSave={() => void commitNodeEdit()}
        onCancel={closeNodeEdit}
        showInfo={editingNode?.kind !== "beat"}
        onInfo={handleModalInfo}
        onDuplicate={handleModalDuplicate}
        onDelete={handleModalDelete}
        extraActionLabel={
          editingNode?.kind === "shot" && canOpenShot
            ? "Shot bearbeiten"
            : undefined
        }
        onExtraAction={
          editingNode?.kind === "shot" && canOpenShot
            ? () => {
                const shotId = editingNode.id;
                closeNodeEdit();
                openShot(shotId);
              }
            : undefined
        }
        showSceneImage={isAudioProject && editingNode?.kind === "scene"}
        sceneImageUrl={editingSceneImageUrl}
        sceneImageUploading={
          editingNode?.kind === "scene" && uploadingSceneId === editingNode.id
        }
        onSceneImageSelected={(file) => {
          if (editingNode?.kind === "scene") {
            void uploadSceneImageForPreview(editingNode.id, file);
          }
        }}
        showAudioLaneLinkButton={
          !isBookProject &&
          !!editingNode &&
          ((isAudioProject && editingNode.kind === "scene") ||
            (showFilmProductionTracks && editingNode.kind === "shot"))
        }
        audioLaneLinkDisabled={
          timelineAudio.laneProps.sortedLaneIndices.length === 0
        }
        audioLaneLinkDisabledHint="Zuerst Spur über Add Item anlegen"
        onLinkAudioLane={() => setRequestOpenLinkPicker(true)}
        audioLaneLinkSection={
          editingNode &&
          !isBookProject &&
          ((isAudioProject && editingNode.kind === "scene") ||
            (showFilmProductionTracks && editingNode.kind === "shot")) ? (
            <SceneAudioLaneLinkSection
              nodeId={editingNode.id}
              nodeTitle={editingNode.title || editingNode.id}
              links={sceneAudioLaneLinks.links}
              sortedLaneIndices={timelineAudio.laneProps.sortedLaneIndices}
              getCharacterForLane={
                timelineAudio.laneProps.characterLanes.getCharacterForLane
              }
              getOccupantLabel={getSceneAudioLinkOccupantLabel}
              focusLinkSection={focusLinkSection}
              onFocusHandled={() => setFocusLinkSection(false)}
              requestOpenLinkPicker={requestOpenLinkPicker}
              onLinkPickerRequestHandled={() => setRequestOpenLinkPicker(false)}
              isBusy={sceneAudioLaneLinks.isLinking}
              onLink={async (option, stealFromNodeId) => {
                await sceneAudioLaneLinks.linkLane({
                  nodeId: editingNode.id,
                  link: {
                    laneIndex: option.laneIndex,
                    kind: option.kind,
                    characterId: option.characterId,
                  },
                  stealFromNodeId,
                });
              }}
              onUnlink={async () => {
                await sceneAudioLaneLinks.unlinkLane(editingNode.id);
              }}
            />
          ) : null
        }
      />

      {infoDialogData ? (
        <TimelineNodeStatsDialog
          open={infoDialogOpen}
          onOpenChange={setInfoDialogOpen}
          nodeType={infoDialogData.type}
          node={infoDialogData.node}
          projectId={projectId}
          projectType={projectType}
        />
      ) : null}

      {/* 📝 Rich Text Content Editor Modal */}
      {editingSceneForModal && (
        <RichTextEditorModal
          isOpen={showContentModal}
          onClose={() => {
            setShowContentModal(false);
            setEditingSceneForModal(null);
          }}
          value={editingSceneForModal.content}
          onChange={async (jsonDoc) => {
            // Save as JSON object directly
            const now = new Date().toISOString();
            console.log(
              "[VideoEditorTimeline] 💾 Saving content as JSON object:",
              jsonDoc,
            );

            try {
              const token = await getAccessToken();
              if (!token) {
                console.error("[VideoEditorTimeline] No auth token available");
                return;
              }

              // Calculate word count from content
              const calculateWordCount = (content: any): number => {
                if (!content?.content || !Array.isArray(content.content))
                  return 0;

                let totalWords = 0;
                for (const node of content.content) {
                  if (node.type === "paragraph" && node.content) {
                    for (const child of node.content) {
                      if (child.type === "text" && child.text) {
                        const words = child.text
                          .trim()
                          .split(/\s+/)
                          .filter((w: string) => w.length > 0);
                        totalWords += words.length;
                      }
                    }
                  }
                }
                return totalWords;
              };

              const wordCount = calculateWordCount(jsonDoc);

              // Update scene via API
              const updatedScene = await TimelineAPI.updateScene(
                editingSceneForModal.id,
                {
                  content: jsonDoc, // Save as JSON object
                  metadata: {
                    ...editingSceneForModal.metadata,
                    wordCount, // Save word count to metadata
                    lastEditedAt: now,
                  },
                },
                token,
              );

              console.log(
                "[VideoEditorTimeline] ✅ Scene updated successfully:",
                updatedScene,
              );

              // Update local state
              if (timelineData) {
                const newScenes = (timelineData.scenes || []).map((s) =>
                  s.id === editingSceneForModal.id
                    ? {
                        ...s,
                        content: jsonDoc,
                        wordCount,
                        metadata: {
                          ...s.metadata,
                          wordCount,
                          lastEditedAt: now,
                        },
                      }
                    : s,
                );

                const newData = {
                  ...timelineData,
                  scenes: newScenes,
                };

                setTimelineData(newData);
                onDataChange?.(newData);

                // Update the editing scene to reflect changes immediately in the modal
                setEditingSceneForModal({
                  ...editingSceneForModal,
                  content: jsonDoc,
                  wordCount,
                  metadata: {
                    ...editingSceneForModal.metadata,
                    wordCount,
                    lastEditedAt: now,
                  },
                });
              }
            } catch (error) {
              console.error(
                "[VideoEditorTimeline] ❌ Error saving scene content:",
                error,
              );
            }
          }}
          title={editingSceneForModal.title ?? "Inhalt"}
          characters={[] as Character[]}
        />
      )}

      {/* 🎬 SHOT CARD MODAL (opens from timeline click instead of switching to dropdown) */}
      {timelineCtx && (
        <ShotCardModal
          open={!!selectedShotId}
          onOpenChange={(open) => {
            if (!open) setSelectedShotId(null);
          }}
          shotId={selectedShotId}
          projectId={projectId}
        />
      )}

      {structureImageDrop.dropDialogCopy ? (
        <StructureTimelineImageDropDialog
          open={Boolean(structureImageDrop.pendingDrop)}
          title={structureImageDrop.dropDialogCopy.title}
          description={structureImageDrop.dropDialogCopy.description}
          confirmLabel={structureImageDrop.dropDialogCopy.confirmLabel}
          isSubmitting={structureImageDrop.dropSubmitting}
          onConfirm={() => void structureImageDrop.confirmPendingDrop()}
          onCancel={structureImageDrop.cancelPendingDrop}
        />
      ) : null}
    </div>
  );
}
