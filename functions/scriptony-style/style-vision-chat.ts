/**
 * Vision review via ai-service providers (OpenAI-compatible multimodal).
 * Location: functions/scriptony-style/style-vision-chat.ts
 */

import { resolveFeatureRuntime } from "../_shared/ai-service/config/settings";
import { getProvider } from "../_shared/ai-service/providers";

const VISION_PROVIDERS = new Set([
  "openai",
  "openrouter",
  "ollama",
  "ollama_local",
  "ollama_cloud",
]);

export function parseVisionStatus(text: string): "ok" | "warn" | "fail" {
  const upper = text.toUpperCase();
  if (upper.includes("STATUS: FAIL") || /\bFAIL\b/.test(upper)) return "fail";
  if (upper.includes("STATUS: WARN") || /\bWARN\b/.test(upper)) return "warn";
  if (upper.includes("STATUS: OK") || /\bOK\b/.test(upper)) return "ok";
  return "warn";
}

export async function visionStyleSlotReview(
  userId: string,
  imageDataUrl: string,
  slotLabel: string,
  contextJson: string,
): Promise<{ status: "ok" | "warn" | "fail"; message: string }> {
  const runtime = await resolveFeatureRuntime(userId, "assistant_chat");
  const providerName = runtime.config.provider;
  if (!VISION_PROVIDERS.has(providerName)) {
    throw new Error(`Vision not supported for provider: ${providerName}`);
  }

  const provider = getProvider(providerName, {
    apiKey: runtime.apiKey || undefined,
    baseUrl: runtime.baseUrl,
  });

  if (!provider.capabilities.text) {
    throw new Error(`Provider ${providerName} does not support text`);
  }

  const baseUrl =
    runtime.baseUrl ||
    (providerName === "openai" ? "https://api.openai.com/v1" : "");
  if (!baseUrl) {
    throw new Error("Vision provider base URL missing");
  }
  if (!runtime.apiKey?.trim()) {
    throw new Error("Vision provider API key missing");
  }

  const response = await fetch(
    `${baseUrl.replace(/\/+$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${runtime.apiKey}`,
      },
      body: JSON.stringify({
        model: runtime.config.model,
        messages: [
          {
            role: "system",
            content:
              "You are a visual style consistency reviewer. Reply with STATUS: ok|warn|fail and a short reason.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Check if this reference image matches the style guide slot "${slotLabel}". Context: ${contextJson}. Reply: STATUS: ok|warn|fail — one line reason.`,
              },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 120,
        temperature: 0.2,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Vision API ${response.status}: ${errorText.slice(0, 200)}`,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = String(data.choices?.[0]?.message?.content ?? "");
  return {
    status: parseVisionStatus(text),
    message: text.slice(0, 240),
  };
}
