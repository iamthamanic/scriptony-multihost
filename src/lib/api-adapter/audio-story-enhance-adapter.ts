/**
 * Runtime-aware MVE Enhance Script API (cloud / hybrid desktop).
 * Location: src/lib/api-adapter/audio-story-enhance-adapter.ts
 */

import { enhanceMveScript } from "@/lib/api/audio-story-enhance-api";
import type {
  MveEnhanceScriptRequest,
  MveEnhanceScriptResult,
} from "@/lib/multi-voice-engine/schema/enhance-script";
import { canUseCloudSession } from "@/lib/auth/cloud-session";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";
import { isDesktopShell } from "@/runtime/detect-runtime";

const CLOUD_REQUIRED_MSG =
  "Enhance Script erfordert eine Cloud-Anmeldung und einen KI-Provider in den Einstellungen.";

export async function enhanceMveScriptWithRuntime(
  payload: MveEnhanceScriptRequest,
): Promise<MveEnhanceScriptResult & { promptVersion?: string }> {
  if (isLocalProfile() && isDesktopShell()) {
    const ok = await canUseCloudSession();
    if (!ok) {
      throw new Error(CLOUD_REQUIRED_MSG);
    }
  }
  const response = await enhanceMveScript(payload);
  const { success: _success, promptVersion, ...result } = response;
  return { ...result, promptVersion };
}

export { CLOUD_REQUIRED_MSG };
