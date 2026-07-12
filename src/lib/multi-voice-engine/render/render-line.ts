/**
 * Render MVE line — job snapshot, adapter, takes persistence (PRD §12.6, #22).
 * Location: src/lib/multi-voice-engine/render/render-line.ts
 */

import type { MveAudioJob } from "../schema/audio-job";
import type { MveLine } from "../schema/line";
import type { MveTake } from "../schema/take";
import type { MveVoiceProfile } from "../schema/voice-profile";
import { resolveVoiceEngineAdapter } from "../adapters/registry";
import { createMveLineRenderSnapshot } from "./create-render-snapshot";

export class MveRenderLineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MveRenderLineError";
  }
}

export interface RenderMveLineInput {
  projectId: string;
  lineId: string;
  projectDir: string;
  /** MVP default 1, max 3 */
  takeCount?: number;
}

export interface RenderMveLineResult {
  job: MveAudioJob;
  takes: MveTake[];
  selectedTake: MveTake;
}

export interface RenderMveLineDeps {
  getLine(lineId: string): Promise<MveLine | null>;
  getVoiceForCharacter(
    projectId: string,
    characterId: string,
  ): Promise<MveVoiceProfile | null>;
  listJobsByLine(lineId: string): Promise<MveAudioJob[]>;
  createJob(
    projectId: string,
    payload: {
      lineId: string;
      engine: string;
      takeCount: number;
      scriptSnapshot: ReturnType<typeof createMveLineRenderSnapshot>;
      status: "processing";
    },
  ): Promise<MveAudioJob>;
  updateJob(
    jobId: string,
    patch: {
      status?: MveAudioJob["status"];
      errorMessage?: string | null;
    },
  ): Promise<MveAudioJob>;
  createTake(
    projectId: string,
    payload: {
      lineId: string;
      jobId: string;
      takeIndex: number;
      directionSnapshot?: MveLine["direction"];
      status: "processing";
    },
  ): Promise<MveTake>;
  updateTake(
    takeId: string,
    patch: {
      audioUrl?: string;
      durationMs?: number;
      status?: MveTake["status"];
    },
  ): Promise<MveTake>;
  selectTake(lineId: string, takeId: string): Promise<MveTake>;
  updateLine(
    lineId: string,
    patch: { status: MveLine["status"]; selectedTakeId?: string },
  ): Promise<MveLine>;
}

function clampTakeCount(count: number | undefined): number {
  const n = count ?? 1;
  return Math.min(3, Math.max(1, Math.floor(n)));
}

function hasActiveRenderJob(jobs: MveAudioJob[]): boolean {
  return jobs.some(
    (job) => job.status === "processing" || job.status === "pending",
  );
}

export async function renderMveLine(
  input: RenderMveLineInput,
  deps: RenderMveLineDeps,
): Promise<RenderMveLineResult> {
  const takeCount = clampTakeCount(input.takeCount);

  const line = await deps.getLine(input.lineId);
  if (!line) {
    throw new MveRenderLineError("Dialogzeile wurde nicht gefunden.");
  }

  const text = line.text?.trim();
  if (!text) {
    throw new MveRenderLineError(
      "Bitte zuerst Dialogtext für diese Zeile eingeben.",
    );
  }

  if (!line.characterId) {
    throw new MveRenderLineError(
      "Bitte zuerst einen Charakter für diese Zeile zuweisen.",
    );
  }

  const voice = await deps.getVoiceForCharacter(
    input.projectId,
    line.characterId,
  );
  if (!voice) {
    throw new MveRenderLineError(
      "Bitte zuerst eine Stimme für den Charakter zuweisen.",
    );
  }

  const existingJobs = await deps.listJobsByLine(input.lineId);
  if (hasActiveRenderJob(existingJobs)) {
    throw new MveRenderLineError(
      "Für diese Zeile läuft bereits ein Render-Job.",
    );
  }

  const snapshot = createMveLineRenderSnapshot(line, voice);
  const adapter = resolveVoiceEngineAdapter(voice.engine);

  const job = await deps.createJob(input.projectId, {
    lineId: line.id,
    engine: voice.engine,
    takeCount,
    scriptSnapshot: snapshot,
    status: "processing",
  });

  const takeRecords: MveTake[] = [];
  for (let index = 0; index < takeCount; index += 1) {
    takeRecords.push(
      await deps.createTake(input.projectId, {
        lineId: line.id,
        jobId: job.id,
        takeIndex: index,
        directionSnapshot: snapshot.direction,
        status: "processing",
      }),
    );
  }

  const readyTakes: MveTake[] = [];
  let lastError: Error | undefined;

  for (const take of takeRecords) {
    try {
      const output = await adapter.renderLine({
        lineId: line.id,
        text,
        language: voice.language,
        voice: snapshot.voice,
        direction: snapshot.direction,
        takeIndex: take.takeIndex,
        renderSettings: voice.defaultSettings,
        projectDir: input.projectDir,
      });

      const updated = await deps.updateTake(take.id, {
        audioUrl: output.audioUrl,
        durationMs: output.durationMs,
        status: "ready",
      });
      readyTakes.push(updated);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await deps.updateTake(take.id, { status: "failed" });
    }
  }

  if (readyTakes.length === 0) {
    const message =
      lastError?.message ?? "Alle Takes konnten nicht gerendert werden.";
    await deps.updateJob(job.id, {
      status: "failed",
      errorMessage: message,
    });
    await deps.updateLine(line.id, { status: "failed" });
    throw new MveRenderLineError(message);
  }

  await deps.updateJob(job.id, { status: "completed", errorMessage: null });
  const selectedTake = await deps.selectTake(line.id, readyTakes[0]!.id);
  await deps.updateLine(line.id, {
    status: "rendered",
    selectedTakeId: selectedTake.id,
  });

  const finalJob = await deps.updateJob(job.id, { status: "completed" });

  return {
    job: finalJob,
    takes: readyTakes,
    selectedTake,
  };
}
