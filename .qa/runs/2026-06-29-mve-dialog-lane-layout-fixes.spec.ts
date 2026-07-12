/**
 * verify-ui — MVE dialog lane layout fixes (scroll, width, toolbar, delete, scene label).
 * Evidence: .qa/evidence/mve-dialog-lane-layout-fixes/
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/mve-dialog-lane-layout-fixes",
);

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

test("Layout fixes — scene-capped width, icon-only toolbar, delete, scene label", async ({
  page,
}) => {
  await page.goto("/#qa-mve-dialog-lane-layout-fixes");
  await page.waitForSelector(
    '[data-testid="mve-dialog-lane-layout-fixes-preview"]',
    { timeout: 60_000 },
  );

  await page.screenshot({
    path: path.join(evidenceDir, "00-overview.png"),
    fullPage: true,
  });

  // ── Scene-capped width ──
  const cappedSection = page.getByTestId("layout-width-capped");
  const cappedBlock = cappedSection.getByTestId("audio-timeline-mve-text-block");
  await expect(cappedBlock).toBeVisible();
  const cappedWidthStr = await cappedBlock.evaluate(
    (el) => getComputedStyle(el).width,
  );
  const cappedWidth = parseFloat(cappedWidthStr);
  // Scene is 0–6s = 120px at pxPerSec=20. Width must not exceed 120px.
  expect(cappedWidth).toBeLessThanOrEqual(121); // allow 1px rounding
  await cappedSection.screenshot({
    path: path.join(evidenceDir, "01-width-capped.png"),
  });

  // ── Uncapped width (wide scene, min kicks in since duration < MIN_WIDTH) ──
  const uncappedSection = page.getByTestId("layout-width-uncapped");
  const uncappedBlock = uncappedSection.getByTestId(
    "audio-timeline-mve-text-block",
  );
  await expect(uncappedBlock).toBeVisible();
  const uncappedWidthStr = await uncappedBlock.evaluate(
    (el) => getComputedStyle(el).width,
  );
  const uncappedWidth = parseFloat(uncappedWidthStr);
  // Text 0–8s = 160px, scene 0–20s = 400px. Min width (220) kicks in since 160 < 220.
  // Width should be 220px (min), well within scene (400px).
  expect(uncappedWidth).toBeGreaterThanOrEqual(219);
  expect(uncappedWidth).toBeLessThanOrEqual(221);
  await uncappedSection.screenshot({
    path: path.join(evidenceDir, "02-width-uncapped.png"),
  });

  // ── Very narrow scene: min width must not exceed scene ──
  const tinySection = page.getByTestId("layout-width-tiny");
  const tinyBlock = tinySection.getByTestId("audio-timeline-mve-text-block");
  await expect(tinyBlock).toBeVisible();
  const tinyWidthStr = await tinyBlock.evaluate(
    (el) => getComputedStyle(el).width,
  );
  const tinyWidth = parseFloat(tinyWidthStr);
  // Scene 0–2s = 40px. Min width (220) must be capped to 40px.
  expect(tinyWidth).toBeLessThanOrEqual(41);
  await tinySection.screenshot({
    path: path.join(evidenceDir, "03-width-tiny.png"),
  });

  // ── Toolbar: icon-only Tags/Enhance, delete button ──
  const toolbarSection = page.getByTestId("layout-toolbar");
  const card = toolbarSection.getByTestId("mve-dialog-clip-card");
  await expect(card).toBeVisible();

  // Tags button should be icon-only (no "Tags" text label)
  const tagsButton = card.getByRole("button", { name: "Tags einfügen" });
  await expect(tagsButton).toBeVisible();
  const tagsText = await tagsButton.textContent();
  expect(tagsText?.trim()).toBe(""); // icon-only — no text label

  // Enhance button should be icon-only
  const enhanceButton = card.getByTestId("mve-text-block-enhance");
  await expect(enhanceButton).toBeVisible();
  const enhanceText = await enhanceButton.textContent();
  expect(enhanceText?.trim()).toBe("");

  // Delete button should be visible
  const deleteButton = card.getByTestId("mve-text-block-delete");
  await expect(deleteButton).toBeVisible();

  await toolbarSection.screenshot({
    path: path.join(evidenceDir, "04-toolbar-icon-only.png"),
  });

  // ── Delete button click ──
  await deleteButton.click();
  const deleteState = page.getByTestId("layout-delete-state");
  await expect(deleteState).toHaveText("deleted");
  await page.screenshot({
    path: path.join(evidenceDir, "05-delete-clicked.png"),
    fullPage: true,
  });

  // ── Scene label shows title, not node ID ──
  const sceneLabel = page.getByTestId("scene-label-text");
  await expect(sceneLabel).toHaveText("Szene 01");
  // Verify the card header also shows the scene label (not a raw node ID)
  const cardHeader = card.locator(".text-rose-400").first();
  await expect(cardHeader).toContainText("Szene 01");
  await page.screenshot({
    path: path.join(evidenceDir, "06-scene-label.png"),
    fullPage: true,
  });

  // ── No duplicate character row inside card ──
  // The card should NOT contain a TrackCharacterRow (character name "Pazulu" in card body)
  // Character is only in the sidebar, not in the card itself
  const cardCharacterRows = card.locator('[data-testid="track-character-row"]');
  await expect(cardCharacterRows).toHaveCount(0);
  // The card should not render the character name as a separate row
  const pazuluInCard = card.locator("text=Pazulu");
  await expect(pazuluInCard).toHaveCount(0);
  await page.screenshot({
    path: path.join(evidenceDir, "07-no-duplicate-character.png"),
    fullPage: true,
  });
});