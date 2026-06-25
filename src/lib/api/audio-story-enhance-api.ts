/**
 * MVE Enhance Script — cloud API (scriptony-audio-story).
 * Location: src/lib/api/audio-story-enhance-api.ts
 */

import { apiPost, unwrapApiResult } from "../api-client";
import type {
  MveEnhanceScriptRequest,
  MveEnhanceScriptResult,
} from "@/lib/multi-voice-engine/schema/enhance-script";

export interface MveEnhanceScriptResponse extends MveEnhanceScriptResult {
  success: boolean;
  promptVersion?: string;
}

export async function enhanceMveScript(
  payload: MveEnhanceScriptRequest,
): Promise<MveEnhanceScriptResponse> {
  const result = await apiPost<MveEnhanceScriptResponse>(
    "/script/enhance",
    payload,
  );
  const data = unwrapApiResult(result);
  if (!data?.characters || !data?.lines) {
    throw new Error("Enhance Script: Ungültige Server-Antwort.");
  }
  return data;
}
