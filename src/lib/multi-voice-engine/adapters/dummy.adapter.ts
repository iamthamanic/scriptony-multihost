/**
 * Dummy VoiceEngineAdapter — silent WAV for tests/offline without sidecar.
 * Location: src/lib/multi-voice-engine/adapters/dummy.adapter.ts
 */

import { isDesktopShell } from "@/runtime/detect-runtime";
import type { RenderLineInput, RenderLineOutput } from "../schema/render-line";
import type { VoiceEngineAdapter } from "./voice-engine-adapter";

const SAMPLE_RATE = 22_050;

function estimateDurationMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(15_000, Math.max(400, words * 280));
}

function buildSilentWav(durationMs: number): Uint8Array {
  const numSamples = Math.floor((SAMPLE_RATE * durationMs) / 1000);
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  return new Uint8Array(buffer);
}

async function writeDummyWav(
  projectDir: string,
  durationMs: number,
): Promise<string> {
  const { join } = await import("@tauri-apps/api/path");
  const { mkdir, writeFile } = await import("@tauri-apps/plugin-fs");
  const dir = await join(projectDir, ".scriptony", "assets", "takes");
  await mkdir(dir, { recursive: true });
  const fileName = `dummy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.wav`;
  const filePath = await join(dir, fileName);
  await writeFile(filePath, buildSilentWav(durationMs));
  return filePath;
}

export class DummyVoiceEngineAdapter implements VoiceEngineAdapter {
  readonly engineName = "dummy";

  readonly capabilities = {
    supportsTextToSpeech: true,
    supportsVoiceCloning: false,
    supportsVoiceGenerationFromPrompt: false,
    supportsVoiceTuning: false,
    supportsPerformanceReference: false,
    supportsEmotion: false,
    supportsSSML: false,
  } as const;

  async renderLine(input: RenderLineInput): Promise<RenderLineOutput> {
    const durationMs = estimateDurationMs(input.text);

    if (input.projectDir && isDesktopShell()) {
      const audioUrl = await writeDummyWav(input.projectDir, durationMs);
      return { audioUrl, durationMs, warnings: ["dummy-engine"] };
    }

    return {
      audioUrl: `dummy://silent/${durationMs}ms`,
      durationMs,
      warnings: ["dummy-engine", "no-local-file"],
    };
  }
}

export const dummyVoiceEngineAdapter = new DummyVoiceEngineAdapter();
