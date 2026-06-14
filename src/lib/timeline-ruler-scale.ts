/**
 * Shared ruler tick scale for Structure Timeline (T62).
 * Single source for major/minor tick steps and time labels.
 */

export const MIN_LABEL_SPACING_PX = 80;
export const MIN_MINOR_TICK_SPACING_PX = 12;

export const TIME_STEPS_SECONDS = [
  1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800,
] as const;

export interface RulerTick {
  x: number;
  sec: number;
  label?: string;
}

export function formatTimelineTimeLabel(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function resolveMajorStepSec(
  pxPerSec: number,
  minLabelSpacingPx = MIN_LABEL_SPACING_PX,
): number {
  if (pxPerSec <= 0) {
    return TIME_STEPS_SECONDS[TIME_STEPS_SECONDS.length - 1]!;
  }
  const minSecondsBetweenTicks = minLabelSpacingPx / pxPerSec;
  return (
    TIME_STEPS_SECONDS.find((step) => step >= minSecondsBetweenTicks) ??
    TIME_STEPS_SECONDS[TIME_STEPS_SECONDS.length - 1]!
  );
}

export function resolveMinorStepSec(
  majorStepSec: number,
  pxPerSec: number,
  minMinorSpacingPx = MIN_MINOR_TICK_SPACING_PX,
): number | null {
  if (pxPerSec <= 0 || majorStepSec <= 1) return null;

  for (let i = 0; i < TIME_STEPS_SECONDS.length; i++) {
    const step = TIME_STEPS_SECONDS[i]!;
    if (step >= majorStepSec) continue;
    if (majorStepSec % step !== 0) continue;
    if (step * pxPerSec >= minMinorSpacingPx) return step;
  }
  return null;
}

export interface ResolveRulerScaleInput {
  pxPerSec: number;
  viewStartSec: number;
  viewEndSec: number;
  minLabelSpacingPx?: number;
  minMinorSpacingPx?: number;
}

export interface RulerScaleResult {
  majorStepSec: number;
  minorStepSec: number | null;
  majorTicks: RulerTick[];
  minorTicks: RulerTick[];
}

export function resolveRulerScale(
  input: ResolveRulerScaleInput,
): RulerScaleResult {
  const {
    pxPerSec,
    viewStartSec,
    viewEndSec,
    minLabelSpacingPx = MIN_LABEL_SPACING_PX,
    minMinorSpacingPx = MIN_MINOR_TICK_SPACING_PX,
  } = input;

  const majorStepSec = resolveMajorStepSec(pxPerSec, minLabelSpacingPx);
  const minorStepSec = resolveMinorStepSec(
    majorStepSec,
    pxPerSec,
    minMinorSpacingPx,
  );

  const firstMajor = Math.floor(viewStartSec / majorStepSec) * majorStepSec;
  const lastMajor = Math.ceil(viewEndSec / majorStepSec) * majorStepSec;

  const majorTicks: RulerTick[] = [];
  for (let t = firstMajor; t <= lastMajor; t += majorStepSec) {
    majorTicks.push({
      x: (t - viewStartSec) * pxPerSec,
      sec: t,
      label: formatTimelineTimeLabel(t),
    });
  }

  const minorTicks: RulerTick[] = [];
  if (minorStepSec != null && minorStepSec > 0) {
    const firstMinor = Math.floor(viewStartSec / minorStepSec) * minorStepSec;
    const lastMinor = Math.ceil(viewEndSec / minorStepSec) * minorStepSec;
    for (let t = firstMinor; t <= lastMinor; t += minorStepSec) {
      if (t % majorStepSec === 0) continue;
      minorTicks.push({
        x: (t - viewStartSec) * pxPerSec,
        sec: t,
      });
    }
  }

  return { majorStepSec, minorStepSec, majorTicks, minorTicks };
}
