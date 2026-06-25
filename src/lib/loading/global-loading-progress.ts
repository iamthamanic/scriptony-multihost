/**
 * Shared types for app-wide long-running load progress (5s+ detail panel).
 * Location: src/lib/loading/global-loading-progress.ts
 */

/** Delay before the global % + message panel appears (ms). */
export const GLOBAL_LOADING_DETAIL_DELAY_MS = 5_000;

export interface LoadingProgressUpdate {
  percent: number;
  message: string;
  phase?: string;
}

export interface ActiveLoadingTask extends LoadingProgressUpdate {
  id: string;
  title: string;
  startedAt: number;
  detailVisible: boolean;
}

export type LoadingProgressReporter = (update: LoadingProgressUpdate) => void;

export interface RunWithLoadingProgressOptions<T> {
  id: string;
  title: string;
  initialMessage?: string;
  initialPercent?: number;
  run: (report: LoadingProgressReporter) => Promise<T>;
}

/** Pick the task shown in the global overlay (newest detail-visible task). */
export function pickPrimaryLoadingTask(
  tasks: ActiveLoadingTask[],
): ActiveLoadingTask | null {
  const visible = tasks.filter((t) => t.detailVisible);
  if (visible.length === 0) return null;
  return visible.reduce((a, b) => (a.startedAt >= b.startedAt ? a : b));
}

export function clampLoadingPercent(percent: number): number {
  return Math.round(Math.max(0, Math.min(100, percent)));
}
