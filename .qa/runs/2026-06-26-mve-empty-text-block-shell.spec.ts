/**
 * verify-ui — empty MVE text block shell widths (QA harness).
 */

import { test, expect } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/mve-empty-text-block-shell",
);

const PX_PER_SEC = 20;
const SCENE_DURATION_SEC = 30;
const SHELL_SEC = 5;

test.setTimeout(90_000);

async function blockWidthPx(
  section: ReturnType<import("@playwright/test").Page["getByTestId"]>,
  index = 0,
): Promise<number> {
  const block = section
    .locator('[data-testid="audio-timeline-mve-text-block"]')
    .nth(index);
  const width = await block.evaluate((el) => el.style.width);
  return parseFloat(width);
}

test("empty text block shell widths on timeline", async ({ page }) => {
  await page.goto("/#qa-mve-empty-text-block-shell");
  await page.waitForSelector(
    '[data-testid="mve-empty-text-block-shell-preview"]',
    { timeout: 60_000 },
  );

  const firstEmpty = page.getByTestId("shell-first-empty");
  const firstWidth = await blockWidthPx(firstEmpty);
  expect(firstWidth).toBeCloseTo(SCENE_DURATION_SEC * PX_PER_SEC, 0);

  await firstEmpty.screenshot({
    path: path.join(evidenceDir, "01-empty-first-full-scene.png"),
  });

  const twoEmpty = page.getByTestId("shell-two-empty");
  const firstOfTwo = await blockWidthPx(twoEmpty, 0);
  const secondOfTwo = await blockWidthPx(twoEmpty, 1);
  expect(firstOfTwo).toBeCloseTo(SCENE_DURATION_SEC * PX_PER_SEC, 0);
  expect(secondOfTwo).toBeCloseTo(SHELL_SEC * PX_PER_SEC, 0);

  await twoEmpty.screenshot({
    path: path.join(evidenceDir, "02-second-empty-shell.png"),
  });

  const wpmSection = page.getByTestId("shell-with-wpm-text");
  const wpmWidth = await blockWidthPx(wpmSection);
  expect(wpmWidth).toBeCloseTo(4 * PX_PER_SEC, 0);
  expect(wpmWidth).toBeLessThan(SCENE_DURATION_SEC * PX_PER_SEC);

  await wpmSection.screenshot({
    path: path.join(evidenceDir, "03-wpm-text-width.png"),
  });
});
