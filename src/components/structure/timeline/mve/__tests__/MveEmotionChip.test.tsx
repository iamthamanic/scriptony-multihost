/**
 * @vitest-environment jsdom
 */

/**
 * Tests for MveEmotionChip on dialog clip cards.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MveEmotionChip } from "../MveEmotionChip";

afterEach(() => {
  cleanup();
});

describe("MveEmotionChip", () => {
  it("renders label without remove button by default", () => {
    render(<MveEmotionChip label="Traurig" />);
    expect(screen.getByText("Traurig")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("calls onRemove when × is clicked", () => {
    const onRemove = vi.fn();
    render(
      <MveEmotionChip
        label="Traurig"
        onRemove={onRemove}
        removeAriaLabel="Emotion entfernen"
        data-testid="chip"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Emotion entfernen" }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("uses dark-mode chip colors and gray border", () => {
    render(<MveEmotionChip label="Traurig" data-testid="chip" />);
    const chip = screen.getByTestId("chip");
    expect(chip.className).toContain("dark:bg-white");
    expect(chip.className).toContain("dark:text-zinc-950");
    expect(chip.className).toContain("border-white/30");
    expect(chip.className).toContain("hover:bg-white/10");
    expect(chip.className).toContain("dark:hover:bg-white/90");
  });
});
