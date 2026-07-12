/**
 * Timeline strategy selector — reads projectTypeRegistry features (Epic T55g).
 * Location: src/components/structure/timeline/strategies/index.ts
 */

import { isAudioProjectType } from "@/lib/project-type-audio";
import { getProjectTypeConfig } from "@/lib/projectTypeRegistry";
import { audioStrategy } from "./audioStrategy";
import { bookStrategy } from "./bookStrategy";
import { filmStrategy } from "./filmStrategy";
import type { StructureTimelineStrategy } from "./types";

export type {
  AddNodeKind,
  StructureAddNodeKind,
  StructureTimelineStrategy,
} from "./types";
export { audioStrategy } from "./audioStrategy";
export { bookStrategy } from "./bookStrategy";
export { filmStrategy } from "./filmStrategy";

export function getTimelineStrategy(
  projectType?: string,
): StructureTimelineStrategy {
  const normalized = (projectType ?? "").toLowerCase();
  const config = getProjectTypeConfig(projectType);

  if (normalized === "book" || config.id === "book") {
    return bookStrategy;
  }
  if (isAudioProjectType(projectType)) {
    return audioStrategy;
  }
  return filmStrategy;
}
