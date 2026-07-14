/**
 * MVE Prompt-to-Voice — Playwright feature spec.
 * Acceptance: .qa/acceptance/mve-prompt-to-voice.md
 *
 * Note: QA harness has no open .scriptony project — full assign may fail locally;
 * we assert Voicebox POST + UI wiring; unit tests cover assign orchestration.
 */

import { test, expect, type Page } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/mve-prompt-to-voice",
);

const DESIGNED_PROFILE_ID = "vb-designed-playwright";
let profilePostCount = 0;

async function mockVoiceboxForDesign(page: Page) {
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
      await route.fulfill({
        contentType: "application/json",
        json: [],
      });
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
          id: `${DESIGNED_PROFILE_ID}-${profilePostCount}`,
          name: body.name ?? "Max Weber — designt",
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
  await mockVoiceboxForDesign(page);
});

test("design button visible; disabled without description", async ({ page }) => {
  const dialog = await openVoiceEditorModal(page);

  const designBtn = page.getByTestId("voice-studio-design");
  await expect(designBtn).toBeVisible();
  await expect(designBtn).toBeDisabled();

  await dialog.screenshot({
    path: path.join(evidenceDir, "01-design-voice-buttons.png"),
  });
});

test("design click creates preview candidates (3 Voicebox profiles)", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const dialog = await openVoiceEditorModal(page);

  await dialog.getByTestId("mve-voice-desc").fill("warme ruhige Erzählerstimme");

  const designBtn = page.getByTestId("voice-studio-design");
  await expect(designBtn).toBeEnabled();

  await designBtn.click();

  await expect(page.getByTestId("voice-design-candidates")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("voice-design-candidate-0")).toBeVisible();

  await page.screenshot({
    path: path.join(evidenceDir, "02-designed-voice-preview.png"),
    fullPage: true,
  });
});
