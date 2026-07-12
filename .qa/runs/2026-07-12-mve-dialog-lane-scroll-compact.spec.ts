/**
 * verify-ui — MVE dialog lane scroll + compact height (Stufe 1).
 * Evidence: .qa/evidence/mve-dialog-lane-scroll-compact/
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import { LANE_UI } from "../../src/lib/audio-lane";

const featureSlug = "mve-dialog-lane-scroll-compact";
const evidenceDir = path.join(process.cwd(), ".qa/evidence", featureSlug);

function ensureEvidenceDir() {
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
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

test("Stufe 1 — compact lane height, scrollable text area, chrome intact", async ({
  page,
}) => {
  await page.goto("/#qa-mve-dialog-lane-scroll-compact");
  await page.waitForSelector(
    '[data-testid="mve-dialog-lane-scroll-compact-preview"]',
    { timeout: 60_000 },
  );

  await page.screenshot({
    path: path.join(evidenceDir, "00-overview.png"),
    fullPage: true,
  });

  // ── Compact lane height (210px) ──
  const shortShell = page.getByTestId("scroll-compact-short-shell");
  await expect(shortShell).toBeVisible();
  const shortHeight = await shortShell.evaluate((el) => el.offsetHeight);
  expect(shortHeight).toBe(LANE_UI.heightDialogCompact);
  expect(shortHeight).toBeLessThan(280);

  await page.getByTestId("scroll-compact-short").screenshot({
    path: path.join(evidenceDir, "01-compact-lane-height.png"),
  });

  // ── Empty lane (152px) ──
  const emptyShell = page.getByTestId("scroll-empty-lane-shell");
  const emptyHeight = await emptyShell.evaluate((el) => el.offsetHeight);
  expect(emptyHeight).toBe(LANE_UI.heightDialogEmpty);

  // ── Long text scrolls inside textarea shell ──
  const longSection = page.getByTestId("scroll-compact-long");
  const textareaShell = longSection.getByTestId("mve-dialog-clip-textarea-shell");
  await expect(textareaShell).toBeVisible();
  const shellClasses = await textareaShell.getAttribute("class");
  expect(shellClasses).toContain("overflow-y-auto");

  const scrollMetrics = await textareaShell.evaluate((el) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
  }));
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight,
  );

  await longSection.screenshot({
    path: path.join(evidenceDir, "02-long-text-scroll.png"),
  });

  // ── Header / toolbar / footer / duration chip ──
  const card = longSection.getByTestId("mve-dialog-clip-card");
  await expect(card.getByText("Audio: Dialog")).toBeVisible();
  await expect(card.getByTestId("mve-text-block-enhance")).toBeVisible();
  await expect(card.getByTestId("mve-dialog-clip-waveform-empty")).toBeVisible();
  await expect(card.getByText("Kein Audio")).toBeVisible();
  await expect(card.getByTestId("mve-dialog-clip-wpm-duration")).toBeVisible();

  // ── Inline edit still works ──
  const editor = longSection.getByTestId("mve-text-block-textarea");
  await editor.click();
  await expect(textareaShell).toHaveAttribute("data-focused", "true");
  const shellClassesFocused = await textareaShell.getAttribute("class");
  expect(shellClassesFocused).toContain("border-violet-400");

  await longSection.screenshot({
    path: path.join(evidenceDir, "03-focus-violet-border.png"),
  });
});
