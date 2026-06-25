/**
 * Sync bound AudioClip waveform/duration from the selected MVE take.
 * Location: src/lib/mve/sync-clip-with-selected-take.ts
 */

import { getBackendInstance } from "@/backend/backend-instance";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { getMveLine } from "@/lib/api-adapter/mve-adapter";
import { getMveTakesByLine } from "@/lib/api-adapter/mve-render-adapter";
import type { MveTake } from "@/lib/multi-voice-engine/schema/take";
import { decodeLocalAudioToPeaks } from "./decode-local-audio-to-peaks";

export interface SyncClipFromTakeResult {
  clipId: string;
  endSec: number;
  durationMs: number;
}

export async function syncClipWithSelectedTake(
  projectId: string,
  lineId: string,
): Promise<SyncClipFromTakeResult | null> {
  if (!isLocalProfile()) {
    throw new Error("Take-Clip-Sync nur im lokalen Desktop-Modus.");
  }

  const line = await getMveLine(lineId);
  if (!line?.audioClipId || !line.selectedTakeId) {
    return null;
  }

  const takes = await getMveTakesByLine(lineId);
  const selected = takes.find(
    (t: MveTake) =>
      t.id === line.selectedTakeId && t.status === "ready" && t.audioUrl,
  );
  if (!selected?.audioUrl || selected.durationMs == null) {
    return null;
  }

  const durationSec = selected.durationMs / 1000;

  let waveformData: number[] | undefined;
  try {
    const decoded = await decodeLocalAudioToPeaks(selected.audioUrl, 64);
    waveformData = decoded.peaks;
  } catch (err) {
    console.warn("[MVE] Take WAV decode failed, updating duration only:", err);
  }

  const backend = getBackendInstance();
  if (!backend || !("audio" in backend)) {
    throw new Error("Backend AudioRepository nicht verfügbar.");
  }

  const existing = await backend.audio.getClip(line.audioClipId);
  if (!existing) {
    throw new Error(`AudioClip nicht gefunden: ${line.audioClipId}`);
  }

  const startSec = existing.startSec ?? 0;
  const endSec = startSec + durationSec;

  await backend.audio.updateClip(line.audioClipId, {
    endSec,
    ...(waveformData ? { waveformData } : {}),
  });

  return {
    clipId: line.audioClipId,
    endSec,
    durationMs: selected.durationMs,
  };
}
