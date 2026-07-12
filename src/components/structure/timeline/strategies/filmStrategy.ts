/**
 * Film / series timeline strategy — full production tracks (shots, clips, music, SFX).
 * Features sourced from projectTypeRegistry.film (series shares the same flags).
 * Location: src/components/structure/timeline/strategies/filmStrategy.ts
 */

import { projectTypeRegistry } from "@/lib/projectTypeRegistry";
import type { StructureTimelineStrategy } from "./types";

const filmConfig = projectTypeRegistry.film;

export const filmStrategy: StructureTimelineStrategy = {
  isBookProject: false,
  isAudioProject: false,
  showFilmProductionTracks: filmConfig.features.shots === true,
  showFilmClipMagnets: filmConfig.features.shots === true,
  showEditorialClipTrack:
    filmConfig.features.shots === true && filmConfig.features.clips === true,
  showShotBlocks: filmConfig.features.shots === true,
  labelByKind: {
    act: "Akt",
    sequence: "Sequence",
    scene: "Scene",
    shot: "Shot",
  },
  addableKinds: ["act", "sequence", "scene", "shot"],
  previewAreaTitle: "Videoplayer Ansicht",
  actTrackLabel: "Act",
  sequenceTrackLabel: "Seq",
  sceneTrackLabel: "Scene",
  resolveShowAudioDawLanes: () => false,
};
