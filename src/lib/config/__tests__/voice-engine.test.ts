/**
 * Tests for local voice engine id resolution.
 * Location: src/lib/config/__tests__/voice-engine.test.ts
 */

import { describe, expect, it } from "vitest";
import {
  resolveVoiceboxBaseUrl,
  resolveVoiceboxDirectUrl,
  resolveVoiceEngineId,
  usesVoiceboxSidecar,
  VOICEBOX_DEV_PROXY_PATH,
} from "../voice-engine";

describe("voice-engine", () => {
  it("resolves legacy kokoro engine to kokoro provider", () => {
    expect(resolveVoiceEngineId("kokoro")).toBe("kokoro");
  });

  it("resolves elevenlabs and defaults voicebox", () => {
    expect(resolveVoiceEngineId("elevenlabs")).toBe("elevenlabs");
    expect(resolveVoiceEngineId(undefined)).toBe("voicebox");
    expect(resolveVoiceEngineId("voicebox")).toBe("voicebox");
  });

  it("detects Voicebox sidecar for voicebox and kokoro", () => {
    expect(usesVoiceboxSidecar("voicebox")).toBe(true);
    expect(usesVoiceboxSidecar("kokoro")).toBe(true);
    expect(usesVoiceboxSidecar("elevenlabs")).toBe(false);
  });

  it("uses Vite dev proxy path in development to avoid Voicebox CORS", () => {
    expect(
      resolveVoiceboxBaseUrl({ isDev: true, envUrl: "http://127.0.0.1:17493" }),
    ).toBe(VOICEBOX_DEV_PROXY_PATH);
    expect(
      resolveVoiceboxBaseUrl({
        isDev: false,
        envUrl: "http://127.0.0.1:17493",
      }),
    ).toBe("http://127.0.0.1:17493");
    expect(resolveVoiceboxDirectUrl()).toBe("http://127.0.0.1:17493");
  });
});
