/**
 * Voicebox provider + async generate — Playwright repro/regression.
 * Requires: dev server (playwright webServer) or PLAYWRIGHT_SKIP_WEBSERVER + running vite.
 */

import { test, expect } from "@playwright/test";

const MOCK_PROFILES = [
  {
    id: "vb-p1",
    name: "Test Stimme",
    language: "de",
    default_engine: "qwen_custom_voice",
  },
];

const GENERATION_ID = "gen-playwright-1";

test.beforeEach(async ({ page }) => {
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
        json: MOCK_PROFILES,
      });
      return;
    }
    await route.continue();
  });

  const emptyPreset = { voices: [] as unknown[] };
  for (const engine of [
    "qwen_custom_voice",
    "kokoro",
    "luxtts",
    "chatterbox",
    "chatterbox_turbo",
    "tada",
  ]) {
    await page.route(
      new RegExp(`/__voicebox/profiles/presets/${engine}$`),
      async (route) => {
        await route.fulfill({
          contentType: "application/json",
          json: emptyPreset,
        });
      },
    );
  }

  await page.route(/\/__voicebox\/generate$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        id: GENERATION_ID,
        status: "generating",
        profile_id: "vb-p1",
        engine: "qwen_custom_voice",
      },
    });
  });

  await page.route(
    new RegExp(`/__voicebox/history/${GENERATION_ID}$`),
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: {
          id: GENERATION_ID,
          status: "completed",
          audio_path: "generations/gen.wav",
          duration: 0.5,
        },
      });
    },
  );

  await page.route(
    new RegExp(`/__voicebox/audio/${GENERATION_ID}$`),
    async (route) => {
      const wavHeader = new Uint8Array(44);
      const view = new DataView(wavHeader.buffer);
      view.setUint32(24, 24000, true);
      view.setUint32(40, 1000, true);
      await route.fulfill({
        status: 200,
        contentType: "audio/wav",
        body: Buffer.from(wavHeader),
      });
    },
  );
});

test("character voice provider select loads Voicebox profiles", async ({
  page,
}) => {
  await page.goto("/#qa-mve-voice");
  await page.waitForSelector('[data-testid="mve-voice-preview"]', {
    timeout: 60_000,
  });

  const assigned = page.getByTestId("voice-row-assigned");
  await assigned
    .getByRole("button", { name: "Charakterstimme bearbeiten" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Charakterstimme — Max Weber")).toBeVisible();

  await expect(page.getByTestId("character-voice-provider-select")).toBeVisible();
  await expect(page.getByTestId("character-voice-select-trigger")).toBeVisible();

  await expect(page.getByTestId("character-voice-select-trigger")).toBeEnabled({
    timeout: 20_000,
  });

  await page.getByTestId("character-voice-select-trigger").click();
  await expect(
    page.getByRole("option", { name: "Test Stimme (de, profile)" }),
  ).toBeVisible({
    timeout: 15_000,
  });
});
