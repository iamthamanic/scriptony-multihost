/**
 * useFxPersist — persists FX chain changes to clips on a lane.
 * Extracted from useProjectClipLanes.ts to respect the 300-line file limit (KISS/SOLID).
 */

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getFxSlotsFromLaneState,
  setFxSlotAt,
} from "../lib/fx-chain";
import { queryKeys } from "../lib/react-query";
import * as ClipAPI from "../lib/api/audio-clip-api";
import type { AudioClip } from "../lib/types";
import type { LaneState } from "../lib/audio-lane";

export function useFxPersist(
  projectId: string | undefined,
  allClips: AudioClip[],
  laneState: ReturnType<typeof useAudioLaneState>,
) {
  const queryClient = useQueryClient();

  const persistLaneFx = useCallback(
    async (
      laneIndex: number,
      patch: {
        slots?: ReturnType<typeof getFxSlotsFromLaneState>;
        chainEnabled?: boolean;
      },
      rollback: () => void,
    ) => {
      const clipsOnLane = allClips.filter((c) => c.laneIndex === laneIndex);
      if (clipsOnLane.length === 0) return;

      const lane = laneState.getLaneState(laneIndex);
      const slots = patch.slots ?? getFxSlotsFromLaneState(lane);
      const chainEnabled = patch.chainEnabled ?? lane.fxChainEnabled !== false;

      try {
        for (const clip of clipsOnLane) {
          await ClipAPI.updateClip(clip.id, {
            fxPresetId: slots[0] ?? undefined,
            fxSlots: slots,
            fxChainEnabled: chainEnabled,
          });
        }
      } catch (err) {
        rollback();
        toast.error(
          err instanceof Error
            ? err.message
            : "FX-Kette konnte nicht gespeichert werden.",
        );
        const sceneIds = [
          ...new Set(clipsOnLane.map((c) => c.sceneId).filter(Boolean)),
        ];
        for (const sceneId of sceneIds) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.audio.clipsByScene(sceneId),
          });
        }
      }
    },
    [laneState, allClips, queryClient],
  );

  const handleFxSlotChange = useCallback(
    async (laneIndex: number, slotIndex: number, presetId: string | null) => {
      const prev = laneState.getLaneState(laneIndex);
      const prevSlots = getFxSlotsFromLaneState(prev);
      const nextSlots = setFxSlotAt(prevSlots, slotIndex, presetId);
      laneState.setFxSlot(laneIndex, slotIndex, presetId);
      await persistLaneFx(laneIndex, { slots: nextSlots }, () =>
        laneState.setFxSlots(laneIndex, prevSlots),
      );
    },
    [laneState, persistLaneFx],
  );

  const handleFxChainEnabledChange = useCallback(
    async (laneIndex: number, enabled: boolean) => {
      const prev = laneState.getLaneState(laneIndex);
      const prevEnabled = prev.fxChainEnabled !== false;
      laneState.setFxChainEnabled(laneIndex, enabled);
      await persistLaneFx(laneIndex, { chainEnabled: enabled }, () =>
        laneState.setFxChainEnabled(laneIndex, prevEnabled),
      );
    },
    [laneState, persistLaneFx],
  );

  return {
    persistLaneFx,
    handleFxSlotChange,
    handleFxChainEnabledChange,
  };
}
