/**
 * Voicebox settings for Scriptony headless integration (no surprise audio).
 * Location: src/lib/voicebox/voicebox-scriptony-integration.ts
 */

import { VOICEBOX_BASE_URL } from "@/lib/config/voice-engine";
import { isDesktopShell } from "@/runtime/detect-runtime";

export const VOICEBOX_SCRIPTONY_CLIENT_ID = "scriptony";

let integrationApplied = false;

function settingsUrl(): string {
  return `${VOICEBOX_BASE_URL.replace(/\/+$/, "")}/settings/generation`;
}

/** Disable Voicebox UI autoplay — Scriptony plays audio only on explicit user action. */
export async function ensureVoiceboxScriptonyIntegration(): Promise<void> {
  if (!isDesktopShell() || integrationApplied) return;

  try {
    const resp = await fetch(settingsUrl(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Voicebox-Client-Id": VOICEBOX_SCRIPTONY_CLIENT_ID,
      },
      body: JSON.stringify({ autoplay_on_generate: false }),
    });
    if (resp.ok) {
      integrationApplied = true;
    }
  } catch {
    // Non-fatal — generation still works; user may hear Voicebox autoplay.
  }
}

/** @internal test helper */
export function resetVoiceboxScriptonyIntegrationForTests(): void {
  integrationApplied = false;
}
