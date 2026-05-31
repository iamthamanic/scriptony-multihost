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
    // Lokale Text-Generierung: Noch nicht implementiert (Phase 2)
    // Fallback: Fehlermeldung, da keine Cloud-Verbindung im Local Mode
    return {
      text: "[Lokale Text-Generierung ist noch nicht implementiert. Bitte Cloud-Modus verwenden.]",
      model: "local-stub",
    };
  }

  async streamText(
    payload: AiPromptPayload,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    // Stub: liefert die ganze Antwort als einen Chunk
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
