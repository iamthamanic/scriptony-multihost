/**
 * MVE Voice Design Preview — Playwright feature spec.
 * Acceptance: .qa/acceptance/mve-voice-design-preview.md
 */

import { test, expect, type Page } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/mve-voice-design-preview",
);

let profilePostCount = 0;

async function mockVoiceboxForPreview(page: Page) {
  profilePostCount = 0;

  await page.addInitScript(() => {
    (window as unknown as { __TAURI__: unknown }).__TAURI__ = {
      core: {
        invoke: async (cmd: string) => {
          if (cmd === "start_voicebox_app") return "launched";
          return null;
        },
      },
    };
  });

  await page.route(/\/__voicebox\/health$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        status: "healthy",
        model_loaded: true,
        gpu_available: true,
      },
    });
  });

  await page.route(/\/__voicebox\/profiles$/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ contentType: "application/json", json: [] });
      return;
    }
    if (route.request().method() === "POST") {
      profilePostCount += 1;
      const body = route.request().postDataJSON() as Record<string, string>;
      expect(body.voice_type).toBe("designed");
      expect(body.design_prompt).toContain("warme");
      await route.fulfill({
        contentType: "application/json",
        json: {
          id: `vb-preview-${profilePostCount}`,
          name: body.name,
          language: "de",
          voice_type: "designed",
        },
      });
      return;
    }
    await route.continue();
  });

  await page.route(/\/__voicebox\/generate$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        audio_path: "/tmp/mock-preview.wav",
        duration_ms: 1200,
      },
    });
  });

  await page.route(
    /\/__voicebox\/profiles\/presets\/qwen_custom_voice$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { voices: [] },
      });
    },
  );
}

async function openVoiceEditorModal(page: Page) {
  await page.goto("/#qa-mve-voice");
  await page.waitForSelector('[data-testid="mve-voice-preview"]', {
    timeout: 60_000,
  });

  await page
    .getByTestId("voice-row-assigned")
    .getByRole("button", { name: "Charakterstimme bearbeiten" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Charakterstimme — Max Weber")).toBeVisible();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await mockVoiceboxForPreview(page);
});

test("design creates three preview candidates", async ({ page }) => {
  test.setTimeout(120_000);
  const dialog = await openVoiceEditorModal(page);

  await dialog
    .getByTestId("mve-voice-desc")
    .fill("warme ruhige Erzählerstimme");

  const designBtn = page.getByTestId("voice-studio-design");
  await expect(designBtn).toBeEnabled();
  await designBtn.click();

  await expect(page.getByTestId("voice-design-candidates")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("voice-design-candidate-0")).toBeVisible();
  await expect(page.getByTestId("voice-design-candidate-1")).toBeVisible();
  await expect(page.getByTestId("voice-design-candidate-2")).toBeVisible();

  expect(profilePostCount).toBeGreaterThanOrEqual(3);

  await page.screenshot({
    path: path.join(evidenceDir, "01-three-candidates.png"),
    fullPage: true,
  });
});

test("advanced tab and basic description panel visible", async ({ page }) => {
  const dialog = await openVoiceEditorModal(page);

  await expect(page.getByTestId("voice-design-description-panel")).toBeVisible();
  await expect(page.getByTestId("voice-design-tab-advanced")).toBeVisible();

  await dialog.screenshot({
    path: path.join(evidenceDir, "02-description-panel.png"),
  });
});
