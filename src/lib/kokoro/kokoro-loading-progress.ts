/**
 * Kokoro sidecar boot + model-load progress polling (desktop).
 * Location: src/lib/kokoro/kokoro-loading-progress.ts
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktopShell } from "@/runtime/detect-runtime";

import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";

export type KokoroLoadProgress =
  import("@/lib/loading/global-loading-progress").LoadingProgressUpdate;
export type KokoroProgressReporter = LoadingProgressReporter;

export { GLOBAL_LOADING_DETAIL_DELAY_MS as KOKORO_LOADING_DETAIL_DELAY_MS } from "@/lib/loading/global-loading-progress";

export interface KokoroServerStatus {
  status: string;
  kokoroReady: boolean;
  phase: string;
  progress: number;
  message: string;
}

const SIDECAR_BOOT_TIMEOUT_MS = 120_000;
const POLL_MS = 450;

/** Sidecar boot phases before HTTP responds (venv, pip, uvicorn). */
const BOOT_PHASES: { afterMs: number; percent: number; message: string }[] = [
  { afterMs: 0, percent: 8, message: "Kokoro Sidecar wird gestartet…" },
  {
    afterMs: 5_000,
    percent: 16,
    message: "Python virtualenv wird eingerichtet…",
  },
  {
    afterMs: 12_000,
    percent: 26,
    message: "Abhängigkeiten werden installiert (pip)…",
  },
  {
    afterMs: 22_000,
    percent: 36,
    message: "Kokoro HTTP-Server startet…",
  },
  {
    afterMs: 35_000,
    percent: 46,
    message: "Verbindung zum Sidecar wird aufgebaut…",
  },
  {
    afterMs: 50_000,
    percent: 52,
    message: "Sidecar antwortet noch nicht — bitte warten…",
  },
];

function bootProgress(elapsedMs: number): KokoroLoadProgress {
  let step = BOOT_PHASES[0];
  for (const phase of BOOT_PHASES) {
    if (elapsedMs >= phase.afterMs) step = phase;
  }
  return {
    percent: step.percent,
    message: step.message,
    phase: "boot",
  };
}

/** @internal exported for unit tests */
export function sidecarBootProgressForElapsed(
  elapsedMs: number,
): KokoroLoadProgress {
  return bootProgress(elapsedMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function kokoroServerHealth(): Promise<boolean> {
  if (!isDesktopShell()) return false;
  try {
    return await invoke<boolean>("kokoro_server_health");
  } catch {
    return false;
  }
}

async function fetchKokoroStatus(): Promise<KokoroServerStatus | null> {
  if (!isDesktopShell()) return null;
  try {
    return await invoke<KokoroServerStatus | null>("kokoro_server_status");
  } catch {
    return null;
  }
}

function statusToProgress(status: KokoroServerStatus): KokoroLoadProgress {
  return {
    percent: status.progress,
    message: status.message,
    phase: status.phase,
  };
}

async function pollUntilModelReady(
  report?: KokoroProgressReporter,
): Promise<void> {
  while (true) {
    const status = await fetchKokoroStatus();
    if (status) {
      report?.(statusToProgress(status));
      if (status.kokoroReady) return;
      if (status.phase === "error") {
        throw new Error(
          status.message || "Kokoro-Modell konnte nicht geladen werden.",
        );
      }
    }
    await sleep(POLL_MS);
  }
}

/** Wait until sidecar HTTP is up and Kokoro model is ready; report progress. */
export async function waitForKokoroReadyWithProgress(
  projectDir: string,
  report?: KokoroProgressReporter,
): Promise<void> {
  if (!isDesktopShell()) return;

  if (await kokoroServerHealth()) {
    const status = await fetchKokoroStatus();
    if (status?.kokoroReady) {
      report?.({ percent: 100, message: "Kokoro bereit", phase: "ready" });
      return;
    }
    await pollUntilModelReady(report);
    return;
  }

  const bootStarted = Date.now();
  await invoke<string>("start_kokoro_sidecar", { projectDir });

  while (Date.now() - bootStarted < SIDECAR_BOOT_TIMEOUT_MS) {
    const elapsed = Date.now() - bootStarted;
    report?.(bootProgress(elapsed));

    if (await kokoroServerHealth()) {
      report?.({
        percent: 54,
        message: "Sidecar verbunden — Modell wird geladen…",
        phase: "server_up",
      });
      await pollUntilModelReady(report);
      return;
    }
    await sleep(POLL_MS);
  }

  throw new Error(
    "Kokoro-Server-Start hat zu lange gedauert. Prüfe tools/kokoro-server (Python, pip).",
  );
}

export const SYNTHESIS_PROGRESS: KokoroLoadProgress = {
  percent: 94,
  message: "Vorschau-Audio wird erzeugt…",
  phase: "synthesizing",
};

export const PLAYBACK_PROGRESS: KokoroLoadProgress = {
  percent: 98,
  message: "Audio wird abgespielt…",
  phase: "playback",
};
