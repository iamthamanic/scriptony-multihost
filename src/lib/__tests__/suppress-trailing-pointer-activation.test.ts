/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  isTrailingPointerActivationSuppressed,
  suppressTrailingPointerActivation,
} from "../suppress-trailing-pointer-activation";

describe("suppressTrailingPointerActivation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("marks suppression window active", () => {
    expect(isTrailingPointerActivationSuppressed()).toBe(false);
    suppressTrailingPointerActivation(300);
    expect(isTrailingPointerActivationSuppressed()).toBe(true);
    vi.advanceTimersByTime(301);
    expect(isTrailingPointerActivationSuppressed()).toBe(false);
  });

  it("swallows click in capture phase", () => {
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    suppressTrailingPointerActivation(300);
    window.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });
});
