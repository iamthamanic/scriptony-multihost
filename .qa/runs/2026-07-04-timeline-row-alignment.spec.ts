/**
 * verify-ui — Timeline row alignment (Slice 1: film order + audio chrome symmetry).
 * Evidence: .qa/evidence/timeline-row-alignment/
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/timeline-row-alignment",
);

function ensureEvidenceDir() {
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
}

async function rowTopY(
  page: import("@playwright/test").Page,
  testId: string,
): Promise<number> {
  const box = await page.getByTestId(testId).boundingBox();
  expect(box, `missing bounding box for ${testId}`).toBeTruthy();
  return box!.y;
}

async function expectAlignedRows(
  page: import("@playwright/test").Page,
  leftId: string,
  rightId: string,
  maxDelta = 2,
) {
  const leftY = await rowTopY(page, leftId);
  const rightY = await rowTopY(page, rightId);
  expect(Math.abs(leftY - rightY)).toBeLessThanOrEqual(maxDelta);
}

test.beforeEach(async ({ page }) => {
  ensureEvidenceDir();
  await page.addInitScript(() => {
    (window as unknown as { __TAURI__: unknown }).__TAURI__ = {
      core: { invoke: async () => null },
    };
  });
});

test.setTimeout(90_000);

test("Timeline row alignment — structure, audio chrome, dialog lane, film order", async ({
  page,
}) => {
  await page.goto("/#qa-timeline-row-alignment");
  await page.waitForSelector('[data-testid="timeline-row-alignment-preview"]', {
    timeout: 60_000,
  });

  await page.screenshot({
    path: path.join(evidenceDir, "00-alignment-overview.png"),
    fullPage: true,
  });

  await expectAlignedRows(page, "timeline-label-beat", "timeline-content-beat");
  await expectAlignedRows(page, "timeline-label-act", "timeline-content-act");

  await expectAlignedRows(
    page,
    "timeline-audio-section-header-labels",
    "timeline-audio-section-header-scroll",
  );

  await expectAlignedRows(
    page,
    "timeline-audio-section-footer-labels",
    "timeline-audio-section-footer-scroll",
  );

  await expectAlignedRows(page, "audio-lane-sidebar-0", "audio-lane-content-0");

  await expectAlignedRows(
    page,
    "timeline-label-film-clip",
    "timeline-content-film-clip",
  );

  const audioHeaderY = await rowTopY(
    page,
    "timeline-audio-section-header-labels",
  );
  const clipLabelY = await rowTopY(page, "timeline-label-film-clip");
  expect(clipLabelY).toBeGreaterThan(audioHeaderY);

  const sidebarY = await rowTopY(page, "audio-lane-sidebar-0");
  expect(sidebarY).toBeGreaterThan(audioHeaderY);
  expect(clipLabelY).toBeGreaterThan(sidebarY);

  await page.screenshot({
    path: path.join(evidenceDir, "01-lane-y-offset.png"),
    fullPage: true,
  });
});
