/**
 * verify-ui — Timeline row alignment (#49 row pairs: sticky labels, content
 * origin anchor, playhead scrub) + Slice-1 order/symmetry checks.
 * Evidence: .qa/evidence/timeline-row-alignment/
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/timeline-row-alignment",
);

const PX_PER_SEC = 20;

function ensureEvidenceDir() {
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
}

async function box(
  page: import("@playwright/test").Page,
  testId: string,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const b = await page.getByTestId(testId).boundingBox();
  expect(b, `missing bounding box for ${testId}`).toBeTruthy();
  return b!;
}

async function expectAlignedRows(
  page: import("@playwright/test").Page,
  leftId: string,
  rightId: string,
  maxDelta = 2,
) {
  const leftY = (await box(page, leftId)).y;
  const rightY = (await box(page, rightId)).y;
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

  const audioHeaderY = (await box(page, "timeline-audio-section-header-labels"))
    .y;
  const clipLabelY = (await box(page, "timeline-label-film-clip")).y;
  expect(clipLabelY).toBeGreaterThan(audioHeaderY);

  const sidebarY = (await box(page, "audio-lane-sidebar-0")).y;
  expect(sidebarY).toBeGreaterThan(audioHeaderY);
  expect(clipLabelY).toBeGreaterThan(sidebarY);

  await page.screenshot({
    path: path.join(evidenceDir, "01-lane-y-offset.png"),
    fullPage: true,
  });
});

test("Row pairs — sticky labels pin left while lanes scroll (#49)", async ({
  page,
}) => {
  await page.goto("/#qa-timeline-row-alignment");
  await page.waitForSelector('[data-testid="timeline-row-alignment-preview"]', {
    timeout: 60_000,
  });

  const scrollerBox = await box(page, "qa-timeline-scroller");
  const beatLabelBefore = await box(page, "timeline-label-beat");
  const beatContentBefore = await box(page, "timeline-content-beat");

  // Label starts pinned at the scroller's left edge.
  expect(Math.abs(beatLabelBefore.x - scrollerBox.x)).toBeLessThanOrEqual(2);

  await page
    .getByTestId("qa-timeline-scroller")
    .evaluate((el) => (el.scrollLeft = 400));
  await page.waitForTimeout(100);

  const beatLabelAfter = await box(page, "timeline-label-beat");
  const beatContentAfter = await box(page, "timeline-content-beat");

  // Sticky label stays pinned; lane content moved left by the scroll delta.
  expect(Math.abs(beatLabelAfter.x - beatLabelBefore.x)).toBeLessThanOrEqual(1);
  expect(beatContentBefore.x - beatContentAfter.x).toBeGreaterThanOrEqual(398);
  expect(beatContentBefore.x - beatContentAfter.x).toBeLessThanOrEqual(402);

  // Rows stay glued vertically after horizontal scroll.
  await expectAlignedRows(page, "timeline-label-beat", "timeline-content-beat");
  await expectAlignedRows(page, "audio-lane-sidebar-0", "audio-lane-content-0");

  await page.screenshot({
    path: path.join(evidenceDir, "02-sticky-labels-scrolled.png"),
    fullPage: true,
  });
});

test("Playhead scrub — ruler click maps clientX to time at content origin (#49)", async ({
  page,
}) => {
  await page.goto("/#qa-timeline-row-alignment");
  await page.waitForSelector('[data-testid="timeline-row-alignment-preview"]', {
    timeout: 60_000,
  });

  // Unscrolled: click 200px right of the content origin → 10s at 20 px/s.
  const origin = await box(page, "timeline-content-origin");
  const ruler = await box(page, "timeline-content-ruler");
  const clickX = origin.x + 200;
  await page.mouse.click(clickX, ruler.y + ruler.height / 2);

  const playheadSec = page.getByTestId("qa-playhead-sec");
  await expect(playheadSec).toHaveText("10.00");

  // Playhead line renders exactly under the click.
  const lineBox = await box(page, "qa-playhead-line");
  expect(Math.abs(lineBox.x - clickX)).toBeLessThanOrEqual(2);

  // Scrolled: mapping must stay anchored to the (scrolled) content origin.
  await page
    .getByTestId("qa-timeline-scroller")
    .evaluate((el) => (el.scrollLeft = 400));
  await page.waitForTimeout(100);

  const originScrolled = await box(page, "timeline-content-origin");
  const rulerScrolled = await box(page, "timeline-content-ruler");
  // Window-relative convention: time = scrollLeft/px + offsetFromOrigin/px
  // → (400 + 700) / 20 = 55s. A block at 55s renders exactly at this point.
  const clickXScrolled = originScrolled.x + 700;
  await page.mouse.click(
    clickXScrolled,
    rulerScrolled.y + rulerScrolled.height / 2,
  );

  await expect(playheadSec).toHaveText("55.00");
  // The playhead line must land exactly under the mouse while scrolled.
  const lineScrolled = await box(page, "qa-playhead-line");
  expect(Math.abs(lineScrolled.x - clickXScrolled)).toBeLessThanOrEqual(2);

  expect((400 + 700) / PX_PER_SEC).toBe(55);

  await page.screenshot({
    path: path.join(evidenceDir, "03-playhead-scrub.png"),
    fullPage: true,
  });
});
