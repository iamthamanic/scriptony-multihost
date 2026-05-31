/**
 * LocalAiService — vereinfachter AI-Service fuer lokale Provider.
 *
 * Ersetzt HybridAiService im Local Mode.
 * Kommuniziert direkt mit lokalen Sidecars (Kokoro, Piper etc.)
 * ohne Umweg ueber Cloud-Funktionen.
 *
 * SRP: Nur AI-Interaktion, keine Job-Verwaltung oder Asset-Speicherung.
 *
 * Location: src/backend/local/LocalAiService.ts
 */

import type { AiService, AiPromptPayload, AiPromptResult } from "../ScriptonyBackend";
import { synthesizeLocal, listLocalVoices } from "../../lib/api/local-tts-api";
import { ensureKokoroSidecar } from "../../lib/api/local-tts-api";
import { isDesktopShell } from "../../runtime/detect-runtime";

export class LocalAiService implements AiService {
  private projectDir: string | null = null;

  setProjectDir(dir: string) {
    this.projectDir = dir;
  }

  async generateText(payload: AiPromptPayload): Promise<AiPromptResult> {
    const { prompt, model } = payload;

    // 1. Versuche Ollama (lokales LLM)
    try {
      const ollamaResult = await this.callOllama(prompt, model ?? "llama3");
      return { text: ollamaResult, model: model ?? "llama3" };
    } catch {
      // Ollama nicht verfügbar — weiter zu API-Keys
    }

    // 2. Versuche gespeicherte API-Keys (OpenAI, Anthropic, Deepseek)
    const apiKey = this.getStoredApiKey();
    if (apiKey) {
      try {
        const provider = this.getStoredProvider() ?? "openai";
        const result = await this.callCloudApi(provider, apiKey, prompt, model);
        return { text: result, model: model ?? provider };
      } catch {
        // API-Call fehlgeschlagen — Fallback auf Stub
      }
    }

    // 3. Stub: Keine lokale KI verfügbar
    return {
      text: "[Lokale Text-Generierung ist nicht verfügbar. Installiere Ollama (ollama.com) oder hinterlege einen API-Key in den Einstellungen.]",
      model: "local-stub",
    };
  }

  private async callOllama(prompt: string, model: string): Promise<string> {
    const resp = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
    const data = (await resp.json()) as { response: string };
    return data.response;
  }

  private getStoredApiKey(): string | null {
    try {
      return localStorage.getItem("scriptony_local_api_key");
    } catch {
      return null;
    }
  }

  private getStoredProvider(): string | null {
    try {
      return localStorage.getItem("scriptony_local_api_provider");
    } catch {
      return null;
    }
  }

  private async callCloudApi(
    provider: string,
    apiKey: string,
    prompt: string,
    model?: string,
  ): Promise<string> {
    if (provider === "openai") {
      return this.callOpenAI(apiKey, prompt, model ?? "gpt-4o-mini");
    }
    if (provider === "anthropic") {
      return this.callAnthropic(apiKey, prompt, model ?? "claude-3-haiku-20240307");
    }
    if (provider === "deepseek") {
      return this.callDeepseek(apiKey, prompt, model ?? "deepseek-chat");
    }
    throw new Error(`Unknown provider: ${provider}`);
  }

  private async callOpenAI(apiKey: string, prompt: string, model: string): Promise<string> {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? "";
  }

  private async callAnthropic(apiKey: string, prompt: string, model: string): Promise<string> {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = (await resp.json()) as { content: Array<{ text: string }> };
    return data.content[0]?.text ?? "";
  }

  private async callDeepseek(apiKey: string, prompt: string, model: string): Promise<string> {
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = (await resp.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? "";
  }

  async streamText(
    payload: AiPromptPayload,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const result = await this.generateText(payload);
    onChunk(result.text);
  }

  // ── TTS-Spezifische Erweiterungen (nicht im AiService Interface) ──────────

  /**
   * Synthesize text to speech via local Kokoro server.
   */
  async synthesizeTts(
    text: string,
    voice: string,
    speed?: number,
  ): Promise<{ audioPath: string; duration: number }> {
    if (!this.projectDir) {
      throw new Error("Project directory required for local TTS");
    }

    await ensureKokoroSidecar(this.projectDir);

    const result = await synthesizeLocal({
      text,
      voice,
      speed: speed ?? 1.0,
      format: "wav",
    });

    return { audioPath: result.audioPath, duration: result.duration };
  }

  /**
   * List available voices from local Kokoro server.
   */
  async listVoices() {
    return listLocalVoices();
  }
}
