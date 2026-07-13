/**
 * Tests for Voicebox Scriptony integration settings.
 * Location: src/lib/voicebox/__tests__/voicebox-scriptony-integration.test.ts
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: vi.fn(() => true),
}));

import { isDesktopShell } from "@/runtime/detect-runtime";
import {
  ensureVoiceboxScriptonyIntegration,
  resetVoiceboxScriptonyIntegrationForTests,
} from "../voicebox-scriptony-integration";

describe("ensureVoiceboxScriptonyIntegration", () => {
  beforeEach(() => {
    resetVoiceboxScriptonyIntegrationForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ autoplay_on_generate: false }), {
            status: 200,
          }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("disables autoplay_on_generate once per session", async () => {
    await ensureVoiceboxScriptonyIntegration();
    await ensureVoiceboxScriptonyIntegration();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/settings/generation");
    expect(init.method).toBe("PUT");
    expect(init.headers).toEqual(
      expect.objectContaining({
        "X-Voicebox-Client-Id": "scriptony",
      }),
    );
    expect(JSON.parse(String(init.body))).toEqual({
      autoplay_on_generate: false,
    });
  });

  it("skips outside desktop shell", async () => {
    vi.mocked(isDesktopShell).mockReturnValue(false);
    await ensureVoiceboxScriptonyIntegration();
    expect(fetch).not.toHaveBeenCalled();
  });
});
