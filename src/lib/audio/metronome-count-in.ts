/**
 * Metronome count-in scheduling + Web Audio playback (T31).
 * Location: src/lib/audio/metronome-count-in.ts
 */

import type { MetronomeConfig } from "./metronome-config";

/** Milliseconds between beats at given BPM. BPM 0 → single immediate click. */
export function beatIntervalMs(bpm: number): number {
  if (bpm <= 0) return 0;
  return 60_000 / bpm;
}

/** Relative click times in ms from count-in start (0 = first click). */
export function scheduleCountInClicks(config: MetronomeConfig): number[] {
  const beats = config.bpm <= 0 ? 1 : config.countInBeats;
  const interval = beatIntervalMs(config.bpm);
  return Array.from({ length: beats }, (_, i) => i * interval);
}

export function totalCountInDurationMs(config: MetronomeConfig): number {
  const schedule = scheduleCountInClicks(config);
  if (schedule.length === 0) return 0;
  return schedule[schedule.length - 1] + 80;
}

export async function playMetronomeCountIn(
  config: MetronomeConfig,
  signal?: AbortSignal,
): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  if (!config.enabled) return;

  const schedule = scheduleCountInClicks(config);
  if (schedule.length === 0) return;

  const AudioCtx =
    typeof window !== "undefined"
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      : undefined;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const base = ctx.currentTime + 0.05;
  const oscillators: OscillatorNode[] = [];

  const stopAll = () => {
    for (const osc of oscillators) {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
    }
    void ctx.close();
  };

  const onAbort = () => {
    stopAll();
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  for (const ms of schedule) {
    const t = base + ms / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = ms === 0 ? 880 : 660;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
    oscillators.push(osc);
  }

  await new Promise<void>((resolve, reject) => {
    const doneMs = totalCountInDurationMs(config);
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      void ctx.close();
      resolve();
    }, doneMs);

    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
