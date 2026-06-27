/**
 * MVE #6b / #16 — voice UI screenshots (verify-ui).
 * Requires: npm run dev:desktop (Vite :3000) already running.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/mve-characters-voice-panel",
);

const MOCK_VOICES = {
  voices: [
    {
      id: "af_bella",
      name: "Bella",
      lang: "de",
      gender: "female",
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __TAURI__: unknown }).__TAURI__ = {
      core: {
        invoke: async (cmd: string) => {
          if (cmd === "kokoro_health") return true;
          if (cmd === "start_kokoro_sidecar") return "ok";
          return null;
        },
      },
    };
  });

  await page.route("http://127.0.0.1:8080/voices", async (route) => {
    await route.fulfill({ contentType: "application/json", json: MOCK_VOICES });
  });
  await page.route("http://127.0.0.1:8080/health", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { status: "ok", kokoro_ready: true },
    });
  });
});

test("MVE voice row and editor modal with 0.4 sections", async ({ page }) => {
  await page.goto("/#qa-mve-voice");
  await page.waitForSelector('[data-testid="mve-voice-preview"]', {
    timeout: 60_000,
  });

  const unassigned = page.getByTestId("voice-row-unassigned");
  await expect(unassigned.getByText("Charakterstimme")).toBeVisible();

  await unassigned.screenshot({
    path: path.join(evidenceDir, "01-character-voice-row.png"),
  });

  const assigned = page.getByTestId("voice-row-assigned");
  await assigned
    .getByRole("button", { name: "Charakterstimme bearbeiten" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Charakterstimme — Max Weber")).toBeVisible();

  await expect(page.getByTestId("voice-studio-generate")).toBeVisible();
  await expect(page.getByTestId("voice-studio-clone")).toBeVisible();
  await expect(page.getByTestId("voice-studio-tune")).toBeVisible();
  await expect(page.getByText("Stimme vorschlagen")).toBeVisible();
  await expect(page.getByText("Stimme klonen")).toBeVisible();
  await expect(page.getByText("Stimme tunen")).toBeVisible();
  await expect(page.getByTestId("voice-studio-locked")).toContainText(
    "Performance Reference",
  );

  await dialog.screenshot({
    path: path.join(evidenceDir, "02-voice-editor-modal.png"),
  });

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await assigned.screenshot({
    path: path.join(evidenceDir, "03-preview-play-row.png"),
  });
});
