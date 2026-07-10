/**
 * verify-ui — MVE multi-textblock order + scene sync (QA harness).
 */

import { test, expect } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/mve-textblock-order-sync",
);

const PX_PER_SEC = 20;
const SCENE_START = 10;
const SCENE_END = 40;
const SHELL_SEC = 5;
/** Matches `MVE_TEXT_BLOCK_MIN_WIDTH_PX` — 5s shell is below min at 20px/s. */
const MIN_BLOCK_WIDTH_PX = 220;

test.beforeEach(async ({ page }) => {
  const evidence = path.join(process.cwd(), evidenceDir);
  await import("fs").then((fs) => {
    if (!fs.existsSync(evidence)) fs.mkdirSync(evidence, { recursive: true });
  });
  await page.addInitScript(() => {
    (window as unknown as { __TAURI__: unknown }).__TAURI__ = {
      core: { invoke: async () => null },
    };
  });
});

test.setTimeout(90_000);

async function blockBox(
  section: ReturnType<import("@playwright/test").Page["getByTestId"]>,
  index = 0,
) {
  const block = section
    .locator('[data-testid="audio-timeline-mve-text-block"]')
    .nth(index);
  const left = await block.evaluate((el) => parseFloat(el.style.left));
  const width = await block.evaluate((el) => parseFloat(el.style.width));
  return { left, width, right: left + width };
}

test("MVE text blocks stack without overlap (orderIndex 0, 1)", async ({
  page,
}) => {
  await page.goto("/#qa-mve-textblock-order-sync");
  await page.waitForSelector(
    '[data-testid="mve-textblock-order-sync-preview"]',
    { timeout: 60_000 },
  );

  const twoBlocks = page.getByTestId("stack-two-correct-order");
  const first = await blockBox(twoBlocks, 0);
  const second = await blockBox(twoBlocks, 1);

  expect(first.width).toBe(MIN_BLOCK_WIDTH_PX);
  expect(second.width).toBe(MIN_BLOCK_WIDTH_PX);
  expect(second.left).toBeGreaterThanOrEqual(first.right - 1);

  await twoBlocks.screenshot({
    path: path.join(evidenceDir, "01-two-blocks-stacked.png"),
  });

  const textThenEmpty = page.getByTestId("stack-text-then-empty");
  const textBlock = await blockBox(textThenEmpty, 0);
  const emptyBlock = await blockBox(textThenEmpty, 1);
  expect(emptyBlock.left).toBeGreaterThanOrEqual(textBlock.right - 1);

  const grown = page.getByTestId("scene-grown-shell");
  const shellBar = grown.locator('[data-testid="scene-shell-bar"]');
  const sceneEndSec = await shellBar.getAttribute("data-scene-end-sec");
  expect(Number(sceneEndSec)).toBe(SCENE_END + SHELL_SEC);

  const grownShellWidth = await shellBar.evaluate((el) =>
    parseFloat(el.style.width),
  );
  expect(grownShellWidth).toBeCloseTo(
    (SCENE_END + SHELL_SEC - SCENE_START) * PX_PER_SEC,
    0,
  );

  await grown.screenshot({
    path: path.join(evidenceDir, "02-scene-grew-after-second.png"),
  });
});
