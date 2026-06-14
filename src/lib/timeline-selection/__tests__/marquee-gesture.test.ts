import { describe, expect, it } from "vitest";
import { shouldUseMarqueeInsteadOfBodyMove } from "../../../hooks/useTimelineMarqueeSelection";

describe("shouldUseMarqueeInsteadOfBodyMove", () => {
  it("always prefers marquee in select mode", () => {
    expect(
      shouldUseMarqueeInsteadOfBodyMove({
        dx: 20,
        dy: 0,
        thresholdPx: 5,
        shiftKey: false,
        altKey: false,
        interactionMode: "select",
      }),
    ).toBe(true);
  });

  it("prefers marquee when shift or alt is held in move mode", () => {
    expect(
      shouldUseMarqueeInsteadOfBodyMove({
        dx: 20,
        dy: 0,
        thresholdPx: 5,
        shiftKey: true,
        altKey: false,
        interactionMode: "move",
      }),
    ).toBe(true);
  });

  it("prefers marquee on diagonal box drag in move mode", () => {
    expect(
      shouldUseMarqueeInsteadOfBodyMove({
        dx: 12,
        dy: 10,
        thresholdPx: 5,
        shiftKey: false,
        altKey: false,
        interactionMode: "move",
      }),
    ).toBe(true);
  });

  it("keeps horizontal body move for pure horizontal drag in move mode", () => {
    expect(
      shouldUseMarqueeInsteadOfBodyMove({
        dx: 20,
        dy: 1,
        thresholdPx: 5,
        shiftKey: false,
        altKey: false,
        interactionMode: "move",
      }),
    ).toBe(false);
  });
});
