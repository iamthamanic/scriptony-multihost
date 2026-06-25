/**
 * MVE #23 — take UI verify-ui screenshots.
 * Requires: Vite dev on :3000 with browser-local env (see playwright webServer).
 */

import { test, expect } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(process.cwd(), ".qa/evidence/mve-take-ui");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __TAURI__: unknown }).__TAURI__ = {
      core: { invoke: async () => null },
    };
  });
});

test("MVE #23 take panel empty, list, and blocked states", async ({ page }) => {
  await page.goto("/#qa-mve-take-ui");
  await page.waitForSelector('[data-testid="mve-take-preview"]', {
    timeout: 60_000,
  });

  await page.screenshot({
    path: path.join(evidenceDir, "00-overview.png"),
    fullPage: true,
  });

  const emptySection = page.getByTestId("mve-take-empty");
  await emptySection.getByRole("button", { name: "Takes verwalten" }).click();
  await expect(page.getByText(/Noch keine Takes/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Takes rendern" })).toBeEnabled();
  await page.locator('[data-radix-popper-content-wrapper]').last().screenshot({
    path: path.join(evidenceDir, "01-empty-takes-popover.png"),
  });
  await page.keyboard.press("Escape");

  const listSection = page.getByTestId("mve-take-list");
  await listSection.getByRole("button", { name: "Takes verwalten" }).click();
  await expect(page.getByText("Bereit · ausgewählt")).toBeVisible();
  await expect(page.getByText("Fehlgeschlagen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Take 1 abspielen" })).toBeEnabled();
  await page.locator('[data-radix-popper-content-wrapper]').last().screenshot({
    path: path.join(evidenceDir, "02-take-list-popover.png"),
  });

  await page.getByRole("button", { name: "Take 1 abspielen" }).click();
  await expect(page.getByText(/Dummy-Take/)).toBeVisible({ timeout: 5_000 });
  await page.screenshot({
    path: path.join(evidenceDir, "03-dummy-play-toast.png"),
    fullPage: true,
  });

  await page.keyboard.press("Escape");

  const renderingSection = page.getByTestId("mve-take-rendering");
  await renderingSection
    .getByRole("button", { name: "Takes verwalten" })
    .click();
  await expect(page.getByText("Render läuft…")).toBeVisible();
  await expect(page.getByRole("button", { name: /Render läuft/ })).toBeDisabled();
  await page.locator('[data-radix-popper-content-wrapper]').last().screenshot({
    path: path.join(evidenceDir, "06-rendering-state.png"),
  });
  await page.keyboard.press("Escape");

  const blockedText = page.getByTestId("mve-take-blocked-text");
  await blockedText.getByRole("button", { name: "Takes verwalten" }).click();
  await expect(
    page.getByText("Bitte zuerst Dialogtext eingeben."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Takes rendern" })).toBeDisabled();
  await page.locator('[data-radix-popper-content-wrapper]').last().screenshot({
    path: path.join(evidenceDir, "04-blocked-no-text.png"),
  });
  await page.keyboard.press("Escape");

  const blockedVoice = page.getByTestId("mve-take-blocked-voice");
  await blockedVoice.getByRole("button", { name: "Takes verwalten" }).click();
  await expect(page.getByText("Charakter hat keine Stimme")).toBeVisible();
  await expect(page.getByRole("button", { name: "Takes rendern" })).toBeDisabled();
  await page.locator('[data-radix-popper-content-wrapper]').last().screenshot({
    path: path.join(evidenceDir, "05-blocked-no-voice.png"),
  });
});
