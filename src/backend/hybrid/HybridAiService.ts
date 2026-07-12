/**
 * Hybrid AI Service — KI über Cloud-Functions, Fallback auf Stub.
 *
 * SOLID: Einzige Verantwortung — Cloud-Call für AI mit Fallback.
 * DRY: Reuse existierende Appwrite-AI-Endpoints via apiClient.
 *
 * Location: src/backend/hybrid/HybridAiService.ts
 */

import type { AiService, AiPromptPayload, AiPromptResult } from "../ScriptonyBackend";
import { tryCloudCall } from "./cloud-proxy";
import { StubAiService } from "../appwrite/stubs";

export class HybridAiService implements AiService {
  constructor(private readonly fallback: StubAiService = new StubAiService()) {}

  async generateText(payload: AiPromptPayload): Promise<AiPromptResult> {
    const result = await tryCloudCall<AiPromptResult>({
      method: "POST",
      route: "/ai/chat",
      body: {
        messages: [{ role: "user", content: payload.prompt }],
        model: payload.model,
        max_tokens: payload.maxTokens,
      },
    });

    if (result.ok) {
      return result.data;
    }

    return this.fallback.generateText(payload);
  }

  async streamText(
    payload: AiPromptPayload,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const result = await tryCloudCall<{ text: string }>({
      method: "POST",
      route: "/ai/chat/stream",
      body: {
        messages: [{ role: "user", content: payload.prompt }],
        model: payload.model,
        max_tokens: payload.maxTokens,
      },
    });

    if (result.ok) {
      onChunk(result.data.text ?? "");
      return;
    }

    return this.fallback.streamText(payload, onChunk);
  }
}
