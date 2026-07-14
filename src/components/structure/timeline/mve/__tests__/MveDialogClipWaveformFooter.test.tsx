/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MveDialogClipWaveformFooter } from "../MveDialogClipWaveformFooter";

describe("MveDialogClipWaveformFooter", () => {
  it("renders a 'Kein Audio' empty state when no clip is bound", () => {
    const { container } = render(
      <MveDialogClipWaveformFooter clipWidthPx={200} />,
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(
      container.querySelector("[data-testid='mve-dialog-clip-waveform-empty']"),
    ).toBeTruthy();
    expect(container.textContent).toContain("Kein Audio");
  });

  it("renders placeholder bars while a bound clip has no waveform data yet", () => {
    const { container } = render(
      <MveDialogClipWaveformFooter clipWidthPx={200} hasAudioClip />,
    );
    expect(container.querySelector("svg")).toBeNull();
    expect(
      container.querySelector("[data-testid='mve-dialog-clip-waveform-empty']"),
    ).toBeNull();
    expect(
      container.querySelectorAll("[data-testid='mve-dialog-clip-waveform'] div")
        .length,
    ).toBeGreaterThan(0);
  });

  it("renders svg rects for waveform peaks", () => {
    const { container } = render(
      <MveDialogClipWaveformFooter
        clipWidthPx={100}
        waveformData={[0.1, 0.5, 0.9]}
        hasAudioClip
        audioDurationSec={5}
        showDurationChip
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelectorAll("rect").length).toBe(3);
    expect(
      container.querySelector("[data-testid='mve-dialog-clip-audio-duration']"),
    ).toBeTruthy();
    expect(container.textContent).toContain("00:00:05");
  });

  it("hides footer duration chip when showDurationChip is false", () => {
    const { container } = render(
      <MveDialogClipWaveformFooter
        clipWidthPx={100}
        waveformData={[0.1, 0.5, 0.9]}
        hasAudioClip
        audioDurationSec={5}
        showDurationChip={false}
      />,
    );
    expect(
      container.querySelector("[data-testid='mve-dialog-clip-audio-duration']"),
    ).toBeNull();
  });

  it("shows audio duration chip when clip bound without peaks", () => {
    const { container } = render(
      <MveDialogClipWaveformFooter
        clipWidthPx={200}
        hasAudioClip
        audioDurationSec={90}
      />,
    );
    const chip = container.querySelector(
      "[data-testid='mve-dialog-clip-audio-duration']",
    );
    expect(chip).toBeTruthy();
    expect(chip?.textContent).toBe("00:01:30");
  });

  it("does not show audio duration chip without bound clip", () => {
    const { container } = render(
      <MveDialogClipWaveformFooter
        clipWidthPx={100}
        waveformData={[0.5]}
        audioDurationSec={5}
      />,
    );
    expect(
      container.querySelector("[data-testid='mve-dialog-clip-audio-duration']"),
    ).toBeNull();
  });
});
