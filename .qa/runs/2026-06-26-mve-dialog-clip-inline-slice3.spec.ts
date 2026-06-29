/**
 * verify-ui — MVE dialog clip inline Slice 3 (audio-bound clips).
 * Evidence: .qa/evidence/mve-dialog-clip-inline-slice3/
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/mve-dialog-clip-inline-slice3",
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

test("Slice 3 — inline MveDialogClipCard for audio-bound clips", async ({
  page,
}) => {
  await page.goto("/#qa-mve-dialog-clip-inline-slice3");
  await page.waitForSelector(
    '[data-testid="mve-dialog-clip-inline-slice3-preview"]',
    { timeout: 60_000 },
  );

  await page.screenshot({
    path: path.join(evidenceDir, "00-overview.png"),
    fullPage: true,
  });

  const audioBound = page.getByTestId("mve-audio-bound-waveform");
  const segment = audioBound.getByTestId("audio-timeline-mve-dialog-segment");
  await expect(segment).toBeVisible();
  await expect(audioBound.getByTestId("mve-dialog-clip-card")).toBeVisible();
  await expect(audioBound.getByText("Szene 01")).toBeVisible();
  await expect(
    audioBound.getByLabel("Clip verlängern/verkürzen"),
  ).toBeVisible();
  await expect(audioBound.getByLabel("Takes verwalten")).toBeVisible();

  const waveformFooter = audioBound.getByTestId("mve-dialog-clip-waveform");
  await expect(waveformFooter.locator("svg")).toBeVisible();
  await expect(waveformFooter.locator("rect").first()).toBeVisible();

  await audioBound.screenshot({
    path: path.join(evidenceDir, "01-audio-bound-inline-card-waveform.png"),
  });

  const placeholder = page.getByTestId("mve-audio-bound-placeholder");
  await expect(placeholder.getByTestId("mve-dialog-clip-card")).toBeVisible();
  const placeholderFooter = placeholder.getByTestId("mve-dialog-clip-waveform");
  await expect(placeholderFooter.locator("svg")).toHaveCount(0);
  await expect(placeholderFooter.locator("> div")).not.toHaveCount(0);

  await placeholder.screenshot({
    path: path.join(evidenceDir, "02-placeholder-waveform-footer.png"),
  });

  const estimated = page.getByTestId("mve-estimated-generate-menu");
  await expect(estimated.getByTestId("mve-dialog-clip-card")).toBeVisible();
  await expect(estimated.getByTestId("mve-text-block-audio-add")).toBeVisible();

  await estimated.screenshot({
    path: path.join(evidenceDir, "03-estimated-generate-menu.png"),
  });

  const textOnly = page.getByTestId("mve-text-only-inline");
  await expect(
    textOnly.getByTestId("audio-timeline-mve-text-block"),
  ).toBeVisible();
  await expect(textOnly.getByTestId("mve-dialog-clip-card")).toBeVisible();

  await textOnly.screenshot({
    path: path.join(evidenceDir, "04-text-only-inline-card.png"),
  });

  const nonMve = page.getByTestId("non-mve-dialog-amber");
  await expect(nonMve.getByTestId("mve-dialog-clip-card")).toHaveCount(0);
  await expect(nonMve.locator(".bg-amber-500")).toBeVisible();

  await nonMve.screenshot({
    path: path.join(evidenceDir, "05-non-mve-amber-segment.png"),
  });

  const sfx = page.getByTestId("sfx-clip-unchanged");
  await expect(sfx.getByTestId("mve-dialog-clip-card")).toHaveCount(0);
  await expect(sfx.locator(".bg-slate-500")).toBeVisible();

  await sfx.screenshot({
    path: path.join(evidenceDir, "06-sfx-clip-unchanged.png"),
  });
});
