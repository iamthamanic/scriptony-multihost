/**
 * Tauri live project alignment — requires desktop shell + real .scriptony path.
 * Run manually in Tauri dev: npm run dev:desktop → navigate to hash below.
 * Evidence: .qa/evidence/timeline-row-alignment/tauri/
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/timeline-row-alignment/tauri",
);

test.beforeEach(() => {
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }
});

test.setTimeout(120_000);

test("Tauri live — test.scriptony alignment report PASS", async ({ page }) => {
  const hasTauri = await page.evaluate(() => {
    const w = window as Window & { __TAURI__?: unknown };
    return w.__TAURI__ !== undefined;
  });

  test.skip(
    !hasTauri,
    "Skipped: no Tauri shell in Playwright chromium — open #qa-timeline-row-alignment-tauri in dev:desktop manually",
  );

  await page.goto("/#qa-timeline-row-alignment-tauri");
  await page.waitForSelector('[data-testid="timeline-alignment-verdict"]', {
    timeout: 90_000,
  });

  await expect(page.getByTestId("timeline-alignment-verdict")).toHaveText(
    "PASS",
  );

  const reportText = await page.getByTestId("timeline-alignment-report").textContent();
  expect(reportText).toBeTruthy();
  fs.writeFileSync(
    path.join(evidenceDir, "alignment-report.json"),
    reportText ?? "{}",
  );

  await page.screenshot({
    path: path.join(evidenceDir, "00-tauri-timeline.png"),
    fullPage: true,
  });
});
