/**
 * Kokoro Local TTS Provider
 *
 * SRP: Text-to-Speech via lokalem Kokoro ONNX-Server (Sidecar).
 * Nur die TTS-Methode ist implementiert; alle anderen Capabilities
 * werden als false deklariert.
 *
 * Synthesizerouten verwenden ein einheitliches HTTP-Client-Muster,
 * das mit anderen lokalen Sidecars (Piper, OpenVoice) wiederverwendet wird.
 */

import type {
  AIProvider,
  ChatMessage,
  ChatOptions,
  ChatResponse,
  TTSOptions,
  TTSResponse,
  STTOptions,
  STTResponse,
  ImageOptions,
  ImageResponse,
  VideoOptions,
  VideoResponse,
  EmbeddingOptions,
  EmbeddingResponse,
} from "./base";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";

const KOKORO_DEFAULT_PORT = 8080;

export interface KokoroConfig {
  port?: number;
}

export class KokoroProvider implements AIProvider {
  readonly name = "kokoro";

  readonly capabilities = {
    text: false,
    audio_stt: false,
    audio_tts: true,
    image: false,
    video: false,
    embeddings: false,
  };

  private baseUrl: string;

  constructor(config?: KokoroConfig) {
    const port = config?.port ?? KOKORO_DEFAULT_PORT;
    this.baseUrl = `http://127.0.0.1:${port}`;
  }

  // ── Text/Chat (nicht unterstuetzt) ──────────────────────────────────────────

  async chat(
    _messages: ChatMessage[],
    _options: ChatOptions,
  ): Promise<ChatResponse> {
    throw new Error("Kokoro does not support text/chat");
  }

  // ── Audio - STT (nicht unterstuetzt) ───────────────────────────────────────

  async transcribe(
    _audioUrl: string,
    _options: STTOptions,
  ): Promise<STTResponse> {
    throw new Error("Kokoro does not support STT");
  }

  // ── Audio - TTS (implementiert) ─────────────────────────────────────────

  async synthesize(text: string, options: TTSOptions): Promise<TTSResponse> {
    const url = `${this.baseUrl}/synthesize`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        voice: options.voice ?? "af_bella",
        speed: options.speed ?? 1.0,
        format: options.format ?? "wav",
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "Unknown");
      throw new Error(`Kokoro TTS failed: ${resp.status} — ${errText}`);
    }

    const data = (await resp.json()) as {
      audioPath: string;
      duration: number;
      format: string;
    };

    // Lese generierte WAV-Datei vom lokalen Dateisystem
    const audioBuffer = await readFile(data.audioPath);

    return {
      audioBuffer: Buffer.from(audioBuffer),
      duration: data.duration,
      format: data.format,
    };
  }

  /**
   * Liste verfuegbarer Kokoro-Stimmen vom Sidecar.
   */
  async getVoices(): Promise<Array<{ id: string; name: string }>> {
    const resp = await fetch(`${this.baseUrl}/voices`, { method: "GET" });
    if (!resp.ok) return [];
    const data = (await resp.json()) as {
      voices: Array<{ id: string; name: string }>;
    };
    return data.voices ?? [];
  }

  // ── Image (nicht unterstuetzt) ────────────────────────────────────────────

  async generateImage(
    _prompt: string,
    _options: ImageOptions,
  ): Promise<ImageResponse> {
    throw new Error("Kokoro does not support image generation");
  }

  // ── Video (nicht unterstuetzt) ────────────────────────────────────────────

  async generateVideo(
    _prompt: string,
    _options: VideoOptions,
  ): Promise<VideoResponse> {
    throw new Error("Kokoro does not support video generation");
  }

  async getVideoStatus(_videoId: string): Promise<VideoResponse> {
    throw new Error("Kokoro does not support video generation");
  }

  // ── Embeddings (nicht unterstuetzt) ──────────────────────────────────────

  async createEmbedding(
    _text: string,
    _options: EmbeddingOptions,
  ): Promise<EmbeddingResponse> {
    throw new Error("Kokoro does not support embeddings");
  }

  // ── Health Check ──────────────────────────────────────────────────────────

  async healthCheck(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (!resp.ok) return false;
      const data = (await resp.json()) as { kokoro_ready?: boolean };
      return data.kokoro_ready ?? false;
    } catch {
      return false;
    }
  }
}
