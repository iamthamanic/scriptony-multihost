/**
 * timeline-batch.ts — batch load operations for timeline data.
 * Extracted from timeline-local.ts to respect the 300-line file limit (T26).
 */

import { requireLocalBackend } from "./runtime-dispatch";
import {
  localGetNodes,
  localGetShots,
  structureToTimelineNode,
} from "./timeline-local";
import type { TimelineNode } from "@/lib/api/timeline-api-v2";

export async function localBatchLoadTimeline(projectId: string): Promise<{
  acts: TimelineNode[];
  sequences: TimelineNode[];
  scenes: TimelineNode[];
  stats: {
    totalNodes: number;
    acts: number;
    sequences: number;
    scenes: number;
  };
}> {
  const nodes = await localGetNodes({ projectId });
  const acts = nodes.filter((n) => n.level === 1);
  const sequences = nodes.filter((n) => n.level === 2);
  const scenes = nodes.filter((n) => n.level === 3);
  return {
    acts,
    sequences,
    scenes,
    stats: {
      totalNodes: nodes.length,
      acts: acts.length,
      sequences: sequences.length,
      scenes: scenes.length,
    },
  };
}

export async function localUltraBatchLoadProject(
  projectId: string,
  options?: { includeShots?: boolean; excludeContent?: boolean },
): Promise<{
  timeline: {
    acts: TimelineNode[];
    sequences: TimelineNode[];
    scenes: TimelineNode[];
  };
  characters: unknown[];
  shots: TimelineNode[];
  clips: unknown[];
  stats: {
    totalNodes: number;
    acts: number;
    sequences: number;
    scenes: number;
    characters: number;
    shots: number;
    clips: number;
  };
}> {
  const batch = await localBatchLoadTimeline(projectId);
  const backend = requireLocalBackend();
  const characters = await backend.characters.list(projectId);
  const clips = await backend.audio.getClips(projectId);
  const shots =
    options?.includeShots === false ? [] : await localGetShots(projectId);
  return {
    timeline: {
      acts: batch.acts,
      sequences: batch.sequences,
      scenes: batch.scenes,
    },
    characters,
    shots,
    clips,
    stats: {
      totalNodes: batch.stats.totalNodes,
      acts: batch.stats.acts,
      sequences: batch.stats.sequences,
      scenes: batch.stats.scenes,
      characters: characters.length,
      shots: shots.length,
      clips: clips.length,
    },
  };
}
