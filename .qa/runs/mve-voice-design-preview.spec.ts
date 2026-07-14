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

let voiceDesignGenerateCount = 0;

async function mockVoiceDesignSidecarForPreview(page: Page) {
  voiceDesignGenerateCount = 0;

  await page.addInitScript(() => {
    sessionStorage.setItem(
      "scriptony_voice_design_sidecar_token",
      "playwright-token",
    );
    (window as unknown as { __TAURI__: unknown }).__TAURI__ = {
      core: {
        invoke: async (cmd: string) => {
          if (cmd === "start_voicebox_app") return "launched";
          if (cmd === "spawn_voice_design_sidecar") return "playwright-token";
          if (cmd === "voice_design_sidecar_health") return true;
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
    await route.continue();
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

  await page.route(/127\.0\.0\.1:3767\/health$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { ok: true, model: "stub", ready: true, stub: true },
    });
  });

  await page.route(/127\.0\.0\.1:3767\/voice-design\/generate$/, async (route) => {
    voiceDesignGenerateCount += 1;
    const body = route.request().postDataJSON() as { description?: string };
    expect(body.description).toContain("warme");
    await route.fulfill({
      contentType: "application/json",
      json: {
        sessionId: "vd_sess_playwright",
        candidates: [0, 1, 2].map((index) => ({
          id: `candidate-${index + 1}`,
          label: ["A", "B", "C"][index],
          audioUrl: `local://voice-design/sessions/vd_sess_playwright/candidate-${index + 1}.wav`,
          description: body.description,
          durationMs: 1200,
          sampleRate: 24000,
        })),
      },
    });
  });

  await page.route(
    /127\.0\.0\.1:3767\/voice-design\/sessions\/vd_sess_playwright\/candidate-\d+\.wav$/,
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
  await mockVoiceDesignSidecarForPreview(page);
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

  expect(voiceDesignGenerateCount).toBe(1);

  await expect(page.getByTestId("voice-design-play-0")).toBeEnabled({
    timeout: 60_000,
  });
  await expect(
    page.getByText("Drei Kandidaten bereit — anhören und eine Stimme speichern."),
  ).toBeVisible();

  await page.screenshot({
    path: path.join(evidenceDir, "01-three-candidates.png"),
    fullPage: true,
  });
});

test("advanced tab and basic description panel visible", async ({ page }) => {
  const dialog = await openVoiceEditorModal(page);

  await expect(page.getByTestId("voice-design-description-panel")).toBeVisible();
  await expect(page.getByTestId("voice-design-tab-advanced")).toBeVisible();
  await page.getByTestId("voice-design-tab-advanced").click();
  await expect(page.getByTestId("voice-design-advanced-form")).toBeVisible();
  await expect(page.getByTestId("voice-design-pitch-picker")).toBeVisible();

  await dialog.screenshot({
    path: path.join(evidenceDir, "02-description-panel.png"),
  });
});
