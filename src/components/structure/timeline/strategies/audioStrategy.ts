/**
 * Audio / Hörspiel timeline strategy — scene preview + DAW lanes, no shot rows.
 * Features sourced from projectTypeRegistry.audio.
 * Location: src/components/structure/timeline/strategies/audioStrategy.ts
 */

import { isAudioClipSystemEnabled } from "@/lib/feature-flags";
import { projectTypeRegistry } from "@/lib/projectTypeRegistry";
import type { StructureTimelineStrategy } from "./types";

const audioConfig = projectTypeRegistry.audio;

export const audioStrategy: StructureTimelineStrategy = {
  isBookProject: false,
  isAudioProject: true,
  showFilmProductionTracks: audioConfig.features.shots === true,
  showFilmClipMagnets: false,
  showEditorialClipTrack: false,
  showShotBlocks: false,
  labelByKind: {
    act: "Akt",
    sequence: "Seq",
    scene: "Scene",
    shot: "Shot",
  },
  addableKinds: ["act", "sequence", "scene"],
  previewAreaTitle: "Videoplayer Ansicht",
  actTrackLabel: "Act",
  sequenceTrackLabel: "Seq",
  sceneTrackLabel: "Scene",
  resolveShowAudioDawLanes: (projectType) =>
    audioConfig.features.audioTracks === "required" &&
    isAudioClipSystemEnabled(projectType),
};
