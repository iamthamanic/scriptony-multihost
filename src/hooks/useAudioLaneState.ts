/**
 * useAudioLaneState — T32 DAW Feature.
 *
 * Manages per-lane mixer state (mute, solo, volume, pan, fxPresetId, meterPeak).
 * State is React-only (not persisted to backend in T32).
 */

import { useState, useCallback } from "react";
import {
  type LaneState,
  type LaneStates,
  createDefaultLaneState,
} from "../lib/audio-lane";

export function useAudioLaneState() {
  const [laneStates, setLaneStates] = useState<LaneStates>({});

  const updateLane = useCallback(
    (laneIndex: number, patch: Partial<LaneState>) => {
      setLaneStates((prev) => ({
        ...prev,
        [laneIndex]: {
          ...(prev[laneIndex] || createDefaultLaneState()),
          ...patch,
        },
      }));
    },
    [],
  );

  const setMute = useCallback(
    (laneIndex: number, mute: boolean) => updateLane(laneIndex, { mute }),
    [updateLane],
  );

  const setSolo = useCallback(
    (laneIndex: number, solo: boolean) => updateLane(laneIndex, { solo }),
    [updateLane],
  );

  const setVolume = useCallback(
    (laneIndex: number, volume: number) => updateLane(laneIndex, { volume }),
    [updateLane],
  );

  const setPan = useCallback(
    (laneIndex: number, pan: number) => updateLane(laneIndex, { pan }),
    [updateLane],
  );

  const setFxPreset = useCallback(
    (laneIndex: number, presetId: string | undefined) =>
      updateLane(laneIndex, { fxPresetId: presetId }),
    [updateLane],
  );

  const setMeterPeak = useCallback(
    (laneIndex: number, peak: number) =>
      updateLane(laneIndex, { meterPeak: peak }),
    [updateLane],
  );

  /** Get or create lane state for a given lane index. */
  const getLaneState = useCallback(
    (laneIndex: number): LaneState =>
      laneStates[laneIndex] || createDefaultLaneState(),
    [laneStates],
  );

  return {
    laneStates,
    getLaneState,
    setMute,
    setSolo,
    setVolume,
    setPan,
    setFxPreset,
    setMeterPeak,
  };
}
