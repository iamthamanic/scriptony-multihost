/**
 * Book project timeline strategy — reading-duration timeline, no production tracks.
 * Features sourced from projectTypeRegistry.book.
 * Location: src/components/structure/timeline/strategies/bookStrategy.ts
 */

import { projectTypeRegistry } from "@/lib/projectTypeRegistry";
import type { StructureTimelineStrategy } from "./types";

const bookConfig = projectTypeRegistry.book;

export const bookStrategy: StructureTimelineStrategy = {
  isBookProject: true,
  isAudioProject: false,
  showFilmProductionTracks: bookConfig.features.shots === true,
  showFilmClipMagnets: false,
  showEditorialClipTrack: false,
  showShotBlocks: false,
  labelByKind: {
    act: "Kapitel",
    sequence: "Abschnitt",
    scene: "Szene",
    shot: "Shot",
  },
  addableKinds: ["act", "sequence", "scene"],
  previewAreaTitle: "Text-Ansicht",
  actTrackLabel: "Akt",
  sequenceTrackLabel: "Kapitel",
  sceneTrackLabel: bookConfig.hierarchyLabels.scene.singular,
  resolveShowAudioDawLanes: () => false,
};
