/**
 * T26 — Lane Header: Plus Button → Text hinzufügen (verify-ui).
 * Requires: npm run dev:desktop (Vite :3000) already running.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/mve-text-block-lane",
);

test("T26 dialog lane plus button shows Text hinzufügen", async ({ page }) => {
  await page.goto("/#qa-mve-text-block-lane");
  await page.waitForSelector('[data-testid="mve-text-block-lane-preview"]', {
    timeout: 60_000,
  });

  const withLink = page.getByTestId("dialog-lane-with-link");
  await expect(withLink.getByLabelText("Text hinzufügen")).toBeVisible();

  await withLink.screenshot({
    path: path.join(evidenceDir, "01-dialog-lane-plus-text.png"),
  });

  const noLink = page.getByTestId("dialog-lane-no-link");
  await expect(noLink.getByLabelText("Text hinzufügen")).toBeVisible();

  await noLink.screenshot({
    path: path.join(evidenceDir, "02-dialog-lane-fallback.png"),
  });

  const sfx = page.getByTestId("sfx-lane-unchanged");
  await expect(sfx.getByLabelText("Audio hinzufügen")).toBeVisible();
  await expect(sfx.getByText("Record Audio")).toBeVisible();

  await sfx.screenshot({
    path: path.join(evidenceDir, "03-sfx-lane-unchanged.png"),
  });
});
