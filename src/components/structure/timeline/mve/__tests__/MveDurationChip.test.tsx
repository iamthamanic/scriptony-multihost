/**
 * @vitest-environment jsdom
 */

/**
 * Tests for MveDurationChip on dialog clip cards.
 */

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MveDurationChip, MVE_DURATION_CHIP_TOOLTIP } from "../MveDurationChip";

afterEach(() => {
  cleanup();
});

describe("MveDurationChip", () => {
  it("renders label with chip surface classes and duration source", () => {
    render(
      <MveDurationChip
        label="00:00:04"
        variant="estimate"
        data-testid="duration-chip"
      />,
    );
    const chip = screen.getByTestId("duration-chip");
    expect(chip.textContent).toBe("00:00:04");
    expect(chip.getAttribute("data-duration-source")).toBe("estimate");
    expect(chip.getAttribute("aria-label")).toBe(
      `00:00:04, ${MVE_DURATION_CHIP_TOOLTIP.estimate}`,
    );
    expect(chip.className).toContain("rounded-full");
    expect(chip.className).toContain("tabular-nums");
  });

  it("has no remove button", () => {
    render(<MveDurationChip label="00:01:30" data-testid="duration-chip" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
