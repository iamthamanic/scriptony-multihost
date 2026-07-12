/**
 * VETILALORAPP — pack film shots inside scene hull (tree-native, no pct blocks).
 * Location: src/lib/timeline-tree/shot-pack.ts
 */

export const MIN_SHOT_DURATION_SEC = 1;

type ShotRow = {
  id: string;
  orderIndex?: number;
  order_index?: number;
  shotlengthMinutes?: number;
  shotlength_minutes?: number;
  shotlengthSeconds?: number;
  shotlength_seconds?: number;
  durationSeconds?: number;
  duration?: string;
  locked?: boolean;
};

export interface PackedShotFrames {
  shotId: string;
  sceneId: string;
  orderIndex: number;
  startFrame: number;
  endFrame: number;
  locked?: boolean;
}

/** Read stored shot duration in seconds (no manual overrides — tree build is authoritative). */
export function readShotDurationSec(shot: ShotRow): number | null {
  const mRaw = shot.shotlengthMinutes ?? shot.shotlength_minutes;
  const sRaw = shot.shotlengthSeconds ?? shot.shotlength_seconds;
  if (typeof sRaw === "number" && Number.isFinite(sRaw) && sRaw >= 0) {
    const m =
      typeof mRaw === "number" && Number.isFinite(mRaw)
        ? Math.max(0, Math.floor(mRaw))
        : 0;
    const total = m * 60 + Math.round(sRaw);
    if (total > 0) return total;
  }

  if (
    typeof shot.durationSeconds === "number" &&
    Number.isFinite(shot.durationSeconds) &&
    shot.durationSeconds > 0
  ) {
    return shot.durationSeconds;
  }

  if (typeof shot.duration === "string") {
    const s = shot.duration.trim();
    if (s.endsWith("s")) {
      const n = Number(s.slice(0, -1));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }

  return null;
}

/**
 * Pack ordered shots sequentially inside a scene frame span.
 * Scales stored durations to fill the scene hull (same rules as legacy film geometry).
 */
export function packShotsInSceneFrames(input: {
  sceneId: string;
  sceneStartFrame: number;
  sceneEndFrame: number;
  shots: ShotRow[];
  frameRate: number;
  minDurationFrames: number;
}): PackedShotFrames[] {
  const sceneDurationFrames = Math.max(
    0,
    input.sceneEndFrame - input.sceneStartFrame,
  );
  if (sceneDurationFrames <= 0 || input.shots.length === 0) return [];

  const ordered = [...input.shots].sort((a, b) => {
    const oa = a.orderIndex ?? a.order_index ?? 0;
    const ob = b.orderIndex ?? b.order_index ?? 0;
    return oa - ob;
  });

  const minDurFrames = Math.max(1, input.minDurationFrames);

  const storedSec = ordered.map((sh) => readShotDurationSec(sh));
  const allValid = storedSec.every((d) => typeof d === "number" && d > 0);

  let durationFrames: number[];

  if (allValid && sceneDurationFrames > 0) {
    const stored = storedSec as number[];
    const totalStored = stored.reduce((sum, d) => sum + d, 0);
    const scale = totalStored > 0 ? sceneDurationFrames / totalStored : 1;
    const raw = stored.map((d) =>
      Math.max(minDurFrames, Math.round(d * scale * input.frameRate)),
    );
    const sumAfterClamp = raw.reduce((sum, d) => sum + d, 0);
    const renorm = sumAfterClamp > 0 ? sceneDurationFrames / sumAfterClamp : 1;
    durationFrames = raw.map((d) =>
      Math.max(minDurFrames, Math.round(d * renorm)),
    );
    const drift =
      sceneDurationFrames - durationFrames.reduce((sum, d) => sum + d, 0);
    if (drift !== 0 && durationFrames.length > 0) {
      durationFrames[durationFrames.length - 1] = Math.max(
        minDurFrames,
        durationFrames[durationFrames.length - 1]! + drift,
      );
    }
  } else {
    const slotFrames = Math.max(
      minDurFrames,
      Math.floor(sceneDurationFrames / ordered.length),
    );
    durationFrames = ordered.map(() => slotFrames);
    const sum = durationFrames.reduce((s, d) => s + d, 0);
    const renorm = sum > 0 ? sceneDurationFrames / sum : 1;
    durationFrames = durationFrames.map((d) =>
      Math.max(minDurFrames, Math.round(d * renorm)),
    );
    const drift =
      sceneDurationFrames - durationFrames.reduce((sum, d) => sum + d, 0);
    if (drift !== 0 && durationFrames.length > 0) {
      durationFrames[durationFrames.length - 1] = Math.max(
        minDurFrames,
        durationFrames[durationFrames.length - 1]! + drift,
      );
    }
  }

  const out: PackedShotFrames[] = [];
  let cursor = input.sceneStartFrame;

  ordered.forEach((shot, index) => {
    const dur = durationFrames[index] ?? minDurFrames;
    const startFrame = cursor;
    const endFrame = Math.min(input.sceneEndFrame, startFrame + dur);
    cursor = endFrame;
    out.push({
      shotId: shot.id,
      sceneId: input.sceneId,
      orderIndex: shot.orderIndex ?? shot.order_index ?? index,
      startFrame,
      endFrame: Math.max(startFrame + minDurFrames, endFrame),
      locked: !!shot.locked,
    });
  });

  return out;
}
