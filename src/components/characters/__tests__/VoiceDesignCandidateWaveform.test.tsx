/**
 * Tests for voice design candidate waveform UI.
 * Location: src/components/characters/__tests__/VoiceDesignCandidateWaveform.test.tsx
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VoiceDesignCandidateWaveform } from "../VoiceDesignCandidateWaveform";

describe("VoiceDesignCandidateWaveform", () => {
  it("renders waveform and calls onSeek when clicked", () => {
    const onSeek = vi.fn();
    const { container } = render(
      <VoiceDesignCandidateWaveform
        candidateIndex={1}
        view={{
          peaks: [0.2, 0.8, 0.5],
          durationSec: 4,
          currentTimeSec: 0,
          isPlaying: false,
          isLoading: false,
        }}
        onSeek={onSeek}
      />,
    );

    expect(screen.getByTestId("voice-design-waveform-1")).toBeTruthy();
    expect(screen.getByTestId("voice-design-playhead-1")).toBeTruthy();

    const waveform = screen.getByTestId("voice-design-waveform-1");
    const rect = {
      left: 0,
      width: 200,
      top: 0,
      height: 40,
      right: 200,
      bottom: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;
    vi.spyOn(waveform, "getBoundingClientRect").mockReturnValue(rect);

    fireEvent.pointerDown(waveform, { clientX: 100, pointerId: 1 });
    expect(onSeek).toHaveBeenCalledWith(0.5);

    expect(container.querySelectorAll("rect").length).toBeGreaterThan(0);
  });
});
