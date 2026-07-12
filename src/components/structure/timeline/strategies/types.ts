/**
 * Structure timeline strategy types (Epic T55g).
 * Location: src/components/structure/timeline/strategies/types.ts
 */

export type StructureAddNodeKind = "act" | "sequence" | "scene" | "shot";

export interface StructureTimelineStrategy {
  isBookProject: boolean;
  isAudioProject: boolean;
  /** Shot / editorial / shot-music-sfx rows — film & series only. */
  showFilmProductionTracks: boolean;
  /** Magnet toggles for act/seq/scene/shot — film & series only. */
  showFilmClipMagnets: boolean;
  /** Gray NLE clip row under shots — film & series only. */
  showEditorialClipTrack: boolean;
  /** Whether shot block geometry should be computed. */
  showShotBlocks: boolean;
  labelByKind: Record<StructureAddNodeKind, string>;
  addableKinds: StructureAddNodeKind[];
  previewAreaTitle: string;
  actTrackLabel: string;
  sequenceTrackLabel: string;
  sceneTrackLabel: string;
  /** Audio DAW rows below structure tracks (Hörspiel/Hörbuch). */
  resolveShowAudioDawLanes: (projectType?: string) => boolean;
}

/** Alias used by StructureTimelineEditor add-node dialogs. */
export type AddNodeKind = StructureAddNodeKind;
