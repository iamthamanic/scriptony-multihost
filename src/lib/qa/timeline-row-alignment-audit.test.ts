/** @vitest-environment jsdom */
/**
 * Unit tests for timeline row alignment audit helper.
 */

import { describe, expect, it } from "vitest";
import { runTimelineRowAlignmentAudit } from "./timeline-row-alignment-audit";

function mount(html: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

describe("runTimelineRowAlignmentAudit", () => {
  it("passes when paired rows share the same top Y", () => {
    const root = mount(`
      <div data-testid="timeline-label-beat" style="position:absolute;top:10px"></div>
      <div data-testid="timeline-content-beat" style="position:absolute;top:10px"></div>
    `);
    const report = runTimelineRowAlignmentAudit(root);
    expect(report.ok).toBe(true);
    expect(report.results.find((r) => r.pair === "Beat")?.delta).toBe(0);
    root.remove();
  });

  it("fails when delta exceeds max", () => {
    const root = mount(`
      <div data-testid="audio-lane-sidebar-0"></div>
      <div data-testid="audio-lane-content-0"></div>
    `);
    const sidebar = root.querySelector('[data-testid="audio-lane-sidebar-0"]')!;
    const content = root.querySelector('[data-testid="audio-lane-content-0"]')!;
    sidebar.getBoundingClientRect = () =>
      ({
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    content.getBoundingClientRect = () =>
      ({
        top: 24,
        left: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    const report = runTimelineRowAlignmentAudit(root);
    expect(report.ok).toBe(false);
    root.remove();
  });
});
