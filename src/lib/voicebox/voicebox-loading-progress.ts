/**
 * Voicebox app boot progress polling (desktop).
 * Location: src/lib/voicebox/voicebox-loading-progress.ts
 */

import { invoke } from "@tauri-apps/api/core";
import { isVoiceboxHealthy } from "@/lib/api/voicebox-api";
import { isDesktopShell } from "@/runtime/detect-runtime";
import type { LoadingProgressReporter } from "@/lib/loading/global-loading-progress";

const VOICEBOX_BOOT_TIMEOUT_MS = 90_000;
const POLL_MS = 500;

const VOICEBOX_APP_NAME =
  import.meta.env.VITE_VOICEBOX_APP_NAME?.trim() || undefined;

const BOOT_PHASES: { afterMs: number; percent: number; message: string }[] = [
  { afterMs: 0, percent: 10, message: "Voicebox wird gestartet…" },
  { afterMs: 4_000, percent: 22, message: "Voicebox-App wird geöffnet…" },
  { afterMs: 10_000, percent: 35, message: "Voicebox-Server startet…" },
  { afterMs: 20_000, percent: 48, message: "Stimmen-API wird abgefragt…" },
  {
    afterMs: 35_000,
    percent: 58,
    message: "Voicebox antwortet noch nicht — bitte warten…",
  },
];

function bootProgress(elapsedMs: number) {
  let step = BOOT_PHASES[0];
  for (const phase of BOOT_PHASES) {
    if (elapsedMs >= phase.afterMs) step = phase;
  }
  return {
    percent: step.percent,
    message: step.message,
    phase: "boot" as const,
  };
}

/** @internal exported for unit tests */
export function voiceboxBootProgressForElapsed(elapsedMs: number) {
  return bootProgress(elapsedMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Wait until Voicebox `/profiles` is reachable; launch app on macOS when needed. */
export async function waitForVoiceboxReadyWithProgress(
  report?: LoadingProgressReporter,
): Promise<void> {
  if (!isDesktopShell()) return;

  if (await isVoiceboxHealthy()) {
    report?.({ percent: 100, message: "Voicebox bereit", phase: "ready" });
    return;
  }

  const bootStarted = Date.now();
  await invoke<string>("start_voicebox_app", { appName: VOICEBOX_APP_NAME });

  while (Date.now() - bootStarted < VOICEBOX_BOOT_TIMEOUT_MS) {
    const elapsed = Date.now() - bootStarted;
    report?.(bootProgress(elapsed));

    if (await isVoiceboxHealthy()) {
      report?.({ percent: 100, message: "Voicebox bereit", phase: "ready" });
      return;
    }
    await sleep(POLL_MS);
  }

  throw new Error(
    "Voicebox-Start hat zu lange gedauert. Bitte die Voicebox-App manuell starten.",
  );
}
