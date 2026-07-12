/**
 * E2E regression for #24 MVE Take Waveform/Duration Update.
 *
 * The actual waveform/duration sync requires a Tauri desktop shell with a real
 * local WAV file, so this browser spec verifies the QA harness still renders
 * correctly after prop drilling projectId into the take panel.
 *
 * Evidence: .qa/evidence/mve-take-waveform-update/
 */

import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const evidenceDir = path.join(
  ".qa",
  "evidence",
  "mve-take-waveform-update",
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

test("MVE #24 take panel renders after projectId prop drilling", async ({ page }) => {
  await page.goto("/#qa-mve-take-ui");
  await page.waitForSelector('[data-testid="mve-take-preview"]', {
    timeout: 60_000,
  });
  await page.screenshot({
    path: path.join(evidenceDir, "00-overview.png"),
    fullPage: true,
  });

  const listSection = page.getByTestId("mve-take-list");
  await listSection.getByRole("button", { name: "Takes verwalten" }).click();
  await expect(page.getByText("Bereit · ausgewählt")).toBeVisible();
  await expect(page.getByText("Fehlgeschlagen")).toBeVisible();
  await expect(page.getByRole("button", { name: "Take 1 abspielen" })).toBeEnabled();
  await page.locator("[data-radix-popper-content-wrapper]").last().screenshot({
    path: path.join(evidenceDir, "01-take-list-popover.png"),
  });
  await page.keyboard.press("Escape");

  const blockedSection = page.getByTestId("mve-take-blocked-voice");
  await blockedSection.getByRole("button", { name: "Takes verwalten" }).click();
  await expect(
    page.getByText("Charakter hat keine Stimme"),
  ).toBeVisible();
  await expect(
    page.getByTitle("Charakter hat keine Stimme"),
  ).toBeDisabled();
  await page.locator("[data-radix-popper-content-wrapper]").last().screenshot({
    path: path.join(evidenceDir, "02-blocked-reason.png"),
  });
});
