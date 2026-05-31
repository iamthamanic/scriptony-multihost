/**
 * useClipTrim — handles ripple calculation and debounced update when trimming clips.
 * Extracted from useProjectClipLanes.ts to respect the 300-line file limit (T26).
 */

import { useCallback } from "react";
import { calculateRipple } from "../lib/ripple-engine";
import type { AudioClip } from "../lib/types";
import type { RippleScene, RippleSequence, RippleAct } from "./useRippleDerivation";
import { useRippleUpdate } from "./useRippleUpdate";

export function useClipTrim(
  projectId: string | undefined,
  allClips: AudioClip[],
  rippleScenes: RippleScene[],
  rippleSequences: RippleSequence[],
  rippleActs: RippleAct[],
) {
  const { debouncedUpdate } = useRippleUpdate(projectId);

  const handleTrimEnd = useCallback(
    (clipId: string, newEndSec: number) => {
      const localResult = calculateRipple({
        changedClipId: clipId,
        newEndSec,
        allClips,
        allScenes: rippleScenes,
        allSequences: rippleSequences,
        allActs: rippleActs,
      });

      const affectedSceneIds = new Set<string>();
      for (const clip of localResult.updatedClips) {
        const orig = allClips.find((c) => c.id === clip.id);
        if (orig && (orig.startSec !== clip.startSec || orig.endSec !== clip.endSec)) {
          affectedSceneIds.add(clip.sceneId);
        }
      }
      for (const scene of localResult.updatedScenes) {
        const orig = rippleScenes.find((s) => s.id === scene.id);
        if (orig && (orig.startSec !== scene.startSec || orig.endSec !== scene.endSec)) {
          affectedSceneIds.add(scene.id);
        }
      }
      const changedClip = allClips.find((c) => c.id === clipId);
      if (changedClip) affectedSceneIds.add(changedClip.sceneId);

      debouncedUpdate({
        changedClipId: clipId,
        newEndSec,
        allClips,
        allScenes: rippleScenes,
        allSequences: rippleSequences,
        allActs: rippleActs,
        projectId: projectId || "",
        localResult,
        affectedSceneIds: Array.from(affectedSceneIds),
      });
    },
    [allClips, rippleScenes, rippleSequences, rippleActs, debouncedUpdate, projectId],
  );

  return { handleTrimEnd };
}
