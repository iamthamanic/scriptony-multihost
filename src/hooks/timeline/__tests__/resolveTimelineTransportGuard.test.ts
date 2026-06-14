/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";
import { resolveTimelineTransportGuard } from "../resolveTimelineTransportGuard";

describe("resolveTimelineTransportGuard", () => {
  it("blocks book projects without scene text", () => {
    const result = resolveTimelineTransportGuard({
      projectType: "book",
      sceneBlocks: [
        {
          id: "s1",
          startSec: 0,
          endSec: 10,
          content: { content: [] },
        },
      ],
      audioClips: [],
    });
    expect(result.canPlay).toBe(false);
    expect(result.reason).toContain("Szenentext");
  });

  it("allows book projects with readable text", () => {
    const result = resolveTimelineTransportGuard({
      projectType: "book",
      sceneBlocks: [
        {
          id: "s1",
          startSec: 0,
          endSec: 10,
          content: {
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Hello world" }],
              },
            ],
          },
        },
      ],
      audioClips: [],
    });
    expect(result.canPlay).toBe(true);
    expect(result.reason).toBeNull();
  });

  it("allows film projects for scrub preview", () => {
    const result = resolveTimelineTransportGuard({
      projectType: "film",
      sceneBlocks: [],
      audioClips: [],
    });
    expect(result.canPlay).toBe(true);
  });

  it("allows audio projects without clips (scrub-only hint)", () => {
    const result = resolveTimelineTransportGuard({
      projectType: "audio",
      sceneBlocks: [],
      audioClips: [],
    });
    expect(result.canPlay).toBe(true);
    expect(result.reason).toContain("Playhead");
  });
});
