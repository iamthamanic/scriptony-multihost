/**
 * Avoid repeated macOS `open -a Voicebox` when launch already failed (not installed).
 * Location: src/lib/voicebox/voicebox-launch-guard.ts
 */

const LAUNCH_FAIL_COOLDOWN_MS = 5 * 60 * 1000;

let lastLaunchFailureAt = 0;
let lastLaunchFailureMessage: string | null = null;
let launchInFlight: Promise<void> | null = null;

export function voiceboxLaunchFailureMessage(): string | null {
  if (!lastLaunchFailureMessage) return null;
  if (Date.now() - lastLaunchFailureAt > LAUNCH_FAIL_COOLDOWN_MS) {
    lastLaunchFailureMessage = null;
    return null;
  }
  return lastLaunchFailureMessage;
}

export function recordVoiceboxLaunchFailure(message: string): void {
  lastLaunchFailureAt = Date.now();
  lastLaunchFailureMessage = message;
}

export function clearVoiceboxLaunchFailure(): void {
  lastLaunchFailureAt = 0;
  lastLaunchFailureMessage = null;
}

/** Single-flight wrapper so parallel hooks do not spam `open -a Voicebox`. */
export async function runVoiceboxLaunchOnce(
  launch: () => Promise<void>,
): Promise<void> {
  const cached = voiceboxLaunchFailureMessage();
  if (cached) {
    throw new Error(cached);
  }

  if (launchInFlight) {
    await launchInFlight;
    return;
  }

  launchInFlight = (async () => {
    try {
      await launch();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Voicebox konnte nicht gestartet werden.";
      recordVoiceboxLaunchFailure(message);
      throw err;
    } finally {
      launchInFlight = null;
    }
  })();

  await launchInFlight;
}
