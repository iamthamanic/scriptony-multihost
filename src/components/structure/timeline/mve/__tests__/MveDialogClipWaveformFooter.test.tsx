/**
 * @vitest-environment jsdom
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MveDialogClipWaveformFooter } from "../MveDialogClipWaveformFooter";

describe("MveDialogClipWaveformFooter", () => {
  it("renders placeholder bars without waveform data", () => {
    const { container } = render(
      <MveDialogClipWaveformFooter clipWidthPx={200} />,
    );
    expect(container.querySelector("svg")).toBeNull();
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
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
    expect(container.querySelectorAll("rect").length).toBe(3);
  });
});
