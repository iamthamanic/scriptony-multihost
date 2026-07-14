/**
 * Voicebox dev CORS proxy — verify-ui feature spec.
 * Acceptance: .qa/acceptance/voicebox-dev-cors-proxy.md
 */

import { test, expect, type Page } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/voicebox-dev-cors-proxy",
);

const MOCK_PROFILES = [
  {
    id: "vb-p1",
    name: "Proxy Test Stimme",
    language: "de",
    default_engine: "kokoro",
  },
];

async function mockVoiceboxDevProxy(
  page: Page,
  options: { healthy?: boolean } = {},
) {
  const { healthy = true } = options;

  const fulfillHealth = async (
    route: import("@playwright/test").Route,
  ) => {
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
  };

  await page.route(/\/__voicebox\/health$/, fulfillHealth);
  await page.route(/\/__voicebox\/profiles$/, async (route) => {
    if (!healthy) {
      await route.abort("connectionrefused");
      return;
    }
    if (route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        json: MOCK_PROFILES,
      });
      return;
    }
    await route.continue();
  });
  await page.route(
    /\/__voicebox\/profiles\/presets\/kokoro$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { voices: [{ voice_id: "af_bella", name: "Bella" }] },
      });
    },
  );
  await page.route(
    /\/__voicebox\/profiles\/presets\/qwen_custom_voice$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { voices: [{ id: "qwen-1", name: "Custom Voice" }] },
      });
    },
  );

  // Direct 127.0.0.1 calls must not happen in dev (CORS regression)
  await page.route("http://127.0.0.1:17493/**", async (route) => {
    await route.fulfill({
      status: 599,
      contentType: "text/plain",
      body: "unexpected direct voicebox URL in dev",
    });
  });
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

test.beforeEach(async ({ page }) => {
  await mockTauri(page);
});

test("dev proxy loads voices without CORS errors", async ({ page }) => {
  test.setTimeout(120_000);
  const corsErrors: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (
      text.includes("Access-Control-Allow-Origin") ||
      text.includes("access control checks")
    ) {
      corsErrors.push(text);
    }
  });

  const proxyRequests: string[] = [];
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("/__voicebox/")) {
      proxyRequests.push(url);
    }
  });

  await mockVoiceboxDevProxy(page);

  await page.goto("/#qa-mve-voice");
  await page.waitForSelector('[data-testid="mve-voice-preview"]', {
    timeout: 60_000,
  });

  await page
    .getByTestId("voice-row-assigned")
    .getByRole("button", { name: "Charakterstimme bearbeiten" })
    .click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByTestId("character-voice-select-trigger")).toBeEnabled({
    timeout: 30_000,
  });

  await page.getByTestId("character-voice-select-trigger").click();
  await expect(
    page.getByRole("option", { name: "Proxy Test Stimme (de, profile)" }),
  ).toBeVisible({ timeout: 15_000 });

  await page.screenshot({
    path: path.join(evidenceDir, "01-voice-catalog-loaded.png"),
    fullPage: true,
  });

  expect(corsErrors).toEqual([]);
  expect(proxyRequests.some((u) => u.includes("/__voicebox/health"))).toBe(
    true,
  );
  expect(proxyRequests.some((u) => u.includes("/__voicebox/profiles"))).toBe(
    true,
  );

  await page.screenshot({
    path: path.join(evidenceDir, "02-no-cors-console.png"),
    fullPage: true,
  });
});

test("preset provider uses dev proxy path", async ({ page }) => {
  test.setTimeout(120_000);
  await mockVoiceboxDevProxy(page);

  await page.goto("/#qa-mve-voice");
  await page.waitForSelector('[data-testid="mve-voice-preview"]', {
    timeout: 60_000,
  });
  await page
    .getByTestId("voice-row-assigned")
    .getByRole("button", { name: "Charakterstimme bearbeiten" })
    .click();

  await page.getByTestId("character-voice-provider-select").click();
  await page
    .getByRole("option", { name: "Kokoro (via Voicebox)", exact: true })
    .click();

  await expect(page.getByTestId("character-voice-select-trigger")).toBeEnabled({
    timeout: 30_000,
  });
  await page.getByTestId("character-voice-select-trigger").click();
  await expect(
    page.getByRole("option", { name: "Kokoro — Bella (de, preset)" }),
  ).toBeVisible({ timeout: 15_000 });
});

test("edge: voicebox offline shows error via proxy", async ({ page }) => {
  test.setTimeout(120_000);
  await mockVoiceboxDevProxy(page, { healthy: false });

  await page.goto("/#qa-mve-voice");
  await page.waitForSelector('[data-testid="mve-voice-preview"]', {
    timeout: 60_000,
  });
  await page
    .getByTestId("voice-row-assigned")
    .getByRole("button", { name: "Charakterstimme bearbeiten" })
    .click();

  await expect(page.getByTestId("character-voice-select-trigger")).toBeDisabled({
    timeout: 100_000,
  });
  await expect(page.locator(".text-destructive").first()).toBeVisible({
    timeout: 15_000,
  });
  await page.screenshot({
    path: path.join(evidenceDir, "03-voicebox-offline.png"),
    fullPage: true,
  });
});
