/**
 * Voicebox preset catalog + provider dropdown — verify-ui feature spec.
 * Acceptance: .qa/acceptance/voicebox-preset-provider-catalog.md
 */

import { test, expect, type Page } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/voicebox-preset-provider-catalog",
);

const MOCK_PROFILES = [
  {
    id: "vb-p1",
    name: "Test Stimme",
    language: "de",
    default_engine: "qwen_custom_voice",
  },
];

const EMPTY_PRESET_ENGINES = [
  "luxtts",
  "chatterbox",
  "chatterbox_turbo",
  "tada",
] as const;

async function mockVoiceboxApi(
  page: Page,
  options: {
    healthy?: boolean;
    profiles?: typeof MOCK_PROFILES;
    qwenVoices?: Array<{ id: string; name: string }>;
    kokoroVoices?: Array<{ voice_id: string; name: string }>;
    emptyOtherPresets?: boolean;
  } = {},
) {
  const {
    healthy = true,
    profiles = MOCK_PROFILES,
    qwenVoices = [{ id: "qwen-1", name: "Custom Voice" }],
    kokoroVoices = [{ voice_id: "af_bella", name: "Bella" }],
    emptyOtherPresets = true,
  } = options;

  await page.route(/\/__voicebox\/health$/, async (route) => {
    if (!healthy) {
      await route.abort("connectionrefused");
      return;
    }
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
    if (!healthy) {
      await route.abort("connectionrefused");
      return;
    }
    if (route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        json: profiles,
      });
      return;
    }
    await route.continue();
  });

  await page.route(
    /\/__voicebox\/profiles\/presets\/qwen_custom_voice$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { voices: qwenVoices },
      });
    },
  );

  await page.route(/\/__voicebox\/profiles\/presets\/kokoro$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { voices: kokoroVoices },
    });
  });

  for (const engine of EMPTY_PRESET_ENGINES) {
    await page.route(
      new RegExp(`/__voicebox/profiles/presets/${engine}$`),
      async (route) => {
        await route.fulfill({
          contentType: "application/json",
          json: { voices: emptyOtherPresets ? [] : [{ id: "x", name: "X" }] },
        });
      },
    );
  }
}

async function mockTauri(page: Page) {
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

async function selectProvider(page: Page, label: string) {
  await page.getByTestId("character-voice-provider-select").click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await mockTauri(page);
});

test("provider dropdown + Voicebox/Kokoro/ElevenLabs catalog", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await mockVoiceboxApi(page);

  const dialog = await openVoiceEditorModal(page);

  // AC: Sub-providers (via Voicebox) + ElevenLabs
  await page.getByTestId("character-voice-provider-select").click();
  await expect(
    page.getByRole("option", { name: "Eigene Stimmen (via Voicebox)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("option", { name: "Kokoro (via Voicebox)" }),
  ).toBeVisible();
  await expect(page.getByRole("option", { name: "ElevenLabs" })).toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "01-provider-dropdown.png"),
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  // AC: Eigene Stimmen — user profiles only
  await expect(page.getByTestId("character-voice-select-trigger")).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByTestId("character-voice-select-trigger").click();
  await expect(
    page.getByRole("option", { name: "Test Stimme (de, profile)" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("option", { name: /Qwen — Custom Voice/ }),
  ).not.toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "02-voicebox-voices.png"),
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  // AC: Qwen (via Voicebox) — qwen presets only
  await selectProvider(page, "Qwen (via Voicebox)");
  await expect(page.getByTestId("character-voice-select-trigger")).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByTestId("character-voice-select-trigger").click();
  await expect(
    page.getByRole("option", { name: "Qwen — Custom Voice (de, preset)" }),
  ).toBeVisible({ timeout: 15_000 });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  // AC: Kokoro (via Voicebox) — kokoro presets only
  await selectProvider(page, "Kokoro (via Voicebox)");
  await expect(page.getByTestId("character-voice-select-trigger")).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByTestId("character-voice-select-trigger").click();
  await expect(
    page.getByRole("option", { name: "Kokoro — Bella (de, preset)" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    page.getByRole("option", { name: /Test Stimme/ }),
  ).not.toBeVisible();
  await page.screenshot({
    path: path.join(evidenceDir, "03-kokoro-voices.png"),
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  // AC: preset providers — no create-profile CTA
  await expect(
    page.getByTestId("character-voice-create-profile"),
  ).not.toBeVisible();

  // AC: ElevenLabs always visible, disabled without API key
  await selectProvider(page, "ElevenLabs");
  await expect(
    page.getByText("ElevenLabs API-Key in `.env.local` setzen"),
  ).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("character-voice-select-trigger")).toBeDisabled();
  await page.screenshot({
    path: path.join(evidenceDir, "04-elevenlabs-disabled.png"),
  });
});

test("character voice modal and preview button present", async ({ page }) => {
  await mockVoiceboxApi(page);
  await page.goto("/#qa-mve-voice");
  await page.waitForSelector('[data-testid="mve-voice-preview"]', {
    timeout: 60_000,
  });

  const assigned = page.getByTestId("voice-row-assigned");
  await expect(
    assigned.getByRole("button", { name: "Charakterstimme abspielen" }),
  ).toBeVisible();
  await assigned.screenshot({
    path: path.join(evidenceDir, "05-preview-button.png"),
  });

  await assigned
    .getByRole("button", { name: "Charakterstimme bearbeiten" })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("character-voice-provider-select")).toBeVisible();
});

test("edge: Voicebox offline shows connection error", async ({ page }) => {
  test.setTimeout(120_000);
  await mockVoiceboxApi(page, { healthy: false });

  const dialog = await openVoiceEditorModal(page);

  await expect(page.getByTestId("character-voice-select-trigger")).toBeDisabled({
    timeout: 100_000,
  });
  await expect(page.locator(".text-destructive").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({
    path: path.join(evidenceDir, "06-voicebox-offline.png"),
  });
  await expect(dialog).toBeVisible();
});

test("edge: empty preset catalog still shows profiles", async ({ page }) => {
  await mockVoiceboxApi(page, {
    qwenVoices: [],
    emptyOtherPresets: true,
  });

  await openVoiceEditorModal(page);

  await expect(page.getByTestId("character-voice-select-trigger")).toBeEnabled({
    timeout: 20_000,
  });
  await page.getByTestId("character-voice-select-trigger").click();
  await expect(
    page.getByRole("option", { name: "Test Stimme (de, profile)" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("option", { name: /Qwen —/ })).not.toBeVisible();
});
