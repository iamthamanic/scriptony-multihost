/**
 * Tests for DummyVoiceEngineAdapter.
 * Location: src/lib/multi-voice-engine/adapters/__tests__/dummy.adapter.test.ts
 */

import { describe, expect, it } from "vitest";
import { dummyVoiceEngineAdapter } from "../dummy.adapter";

const NOW = "2026-06-14T12:00:00.000Z";

describe("DummyVoiceEngineAdapter", () => {
  it("returns placeholder audio without projectDir", async () => {
    const result = await dummyVoiceEngineAdapter.renderLine({
      lineId: "mve_line_1",
      text: "Kurzer Test.",
      language: "de",
      voice: {
        id: "v1",
        userId: "local-user",
        name: "Dummy",
        language: "de",
        engine: "dummy",
        type: "default",
        status: "ready",
        consentStatus: "not_required",
        commercialUseAllowed: false,
        version: 1,
        createdAt: NOW,
        updatedAt: NOW,
      },
      takeIndex: 0,
    });
    expect(result.audioUrl).toMatch(/^dummy:\/\//);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.warnings).toContain("dummy-engine");
  });
});
