/**
 * Tests for MVE render line orchestration (#22).
 * Location: src/lib/multi-voice-engine/render/__tests__/render-line.test.ts
 */

import { describe, expect, it, vi } from "vitest";
import { dummyVoiceEngineAdapter } from "../../adapters/dummy.adapter";
import { createMveLineRenderSnapshot } from "../create-render-snapshot";
import {
  MveRenderLineError,
  renderMveLine,
  type RenderMveLineDeps,
} from "../render-line";

vi.mock("../../adapters/registry", () => ({
  resolveVoiceEngineAdapter: vi.fn(() => dummyVoiceEngineAdapter),
}));

const NOW = "2026-06-14T12:00:00.000Z";

const sampleVoice = {
  id: "mve_voice_1",
  userId: "local-user",
  name: "Test",
  language: "de",
  engine: "dummy",
  type: "default" as const,
  status: "ready" as const,
  baseVoiceId: "af_bella",
  consentStatus: "not_required" as const,
  commercialUseAllowed: false,
  version: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

const sampleLine = {
  id: "mve_line_1",
  sceneId: "scene_1",
  orderIndex: 0,
  type: "dialogue" as const,
  characterId: "char_1",
  text: "Hallo Welt.",
  status: "dirty" as const,
  createdAt: NOW,
  updatedAt: NOW,
};

function createDeps(
  overrides: Partial<RenderMveLineDeps> = {},
): RenderMveLineDeps {
  const jobStore: {
    id: string;
    status: string;
    snapshot?: unknown;
  } = { id: "job_1", status: "processing" };

  return {
    getLine: vi.fn(async () => sampleLine),
    getVoiceForCharacter: vi.fn(async () => sampleVoice),
    listJobsByLine: vi.fn(async () => []),
    createJob: vi.fn(async (_projectId, payload) => {
      jobStore.snapshot = payload.scriptSnapshot;
      return {
        id: jobStore.id,
        projectId: "proj_1",
        lineId: payload.lineId,
        status: "processing" as const,
        engine: payload.engine,
        takeCount: payload.takeCount,
        scriptSnapshot: payload.scriptSnapshot,
        createdAt: NOW,
        updatedAt: NOW,
      };
    }),
    updateJob: vi.fn(async (_id, patch) => ({
      id: jobStore.id,
      projectId: "proj_1",
      lineId: sampleLine.id,
      status: (patch.status ?? "completed") as "completed",
      engine: "dummy",
      takeCount: 1,
      scriptSnapshot: jobStore.snapshot as never,
      errorMessage: patch.errorMessage ?? undefined,
      createdAt: NOW,
      updatedAt: NOW,
    })),
    createTake: vi.fn(async (_projectId, payload) => ({
      id: `take_${payload.takeIndex}`,
      lineId: payload.lineId,
      jobId: payload.jobId,
      takeIndex: payload.takeIndex,
      status: "processing" as const,
      isSelected: false,
      createdAt: NOW,
      updatedAt: NOW,
    })),
    updateTake: vi.fn(async (takeId, patch) => ({
      id: takeId,
      lineId: sampleLine.id,
      jobId: "job_1",
      takeIndex: 0,
      audioUrl: patch.audioUrl ?? "dummy://silent/400ms",
      durationMs: patch.durationMs ?? 400,
      status: (patch.status ?? "ready") as "ready" | "failed" | "processing",
      isSelected: false,
      createdAt: NOW,
      updatedAt: NOW,
    })),
    selectTake: vi.fn(async (_lineId, takeId) => ({
      id: takeId,
      lineId: sampleLine.id,
      jobId: "job_1",
      takeIndex: 0,
      audioUrl: "dummy://silent/400ms",
      durationMs: 400,
      status: "ready" as const,
      isSelected: true,
      createdAt: NOW,
      updatedAt: NOW,
    })),
    updateLine: vi.fn(async (lineId, patch) => ({
      ...sampleLine,
      id: lineId,
      status: patch.status,
      selectedTakeId: patch.selectedTakeId,
    })),
    ...overrides,
  };
}

describe("createMveLineRenderSnapshot", () => {
  it("copies line and voice", () => {
    const snap = createMveLineRenderSnapshot(sampleLine, sampleVoice);
    expect(snap.line.text).toBe("Hallo Welt.");
    expect(snap.voice.engine).toBe("dummy");
  });

  it("includes line direction on snapshot", () => {
    const direction = { emotion: "tense" as const, pace: "slow" as const };
    const snap = createMveLineRenderSnapshot(
      { ...sampleLine, direction },
      sampleVoice,
    );
    expect(snap.direction).toEqual(direction);
    expect(snap.line.direction).toEqual(direction);
  });
});

describe("renderMveLine", () => {
  it("creates job with snapshot and ready take", async () => {
    const deps = createDeps();
    const result = await renderMveLine(
      {
        projectId: "proj_1",
        lineId: sampleLine.id,
        projectDir: "/tmp/proj",
        takeCount: 1,
      },
      deps,
    );

    expect(deps.createJob).toHaveBeenCalledOnce();
    expect(result.job.status).toBe("completed");
    expect(result.takes).toHaveLength(1);
    expect(result.selectedTake.status).toBe("ready");
    expect(deps.updateLine).toHaveBeenCalledWith(sampleLine.id, {
      status: "rendered",
      selectedTakeId: "take_0",
    });
  });

  it("rejects line without text", async () => {
    const deps = createDeps({
      getLine: vi.fn(async () => ({ ...sampleLine, text: "" })),
    });
    await expect(
      renderMveLine(
        {
          projectId: "proj_1",
          lineId: sampleLine.id,
          projectDir: "/tmp/proj",
        },
        deps,
      ),
    ).rejects.toBeInstanceOf(MveRenderLineError);
  });

  it("rejects parallel processing job", async () => {
    const deps = createDeps({
      listJobsByLine: vi.fn(async () => [
        {
          id: "job_busy",
          projectId: "proj_1",
          lineId: sampleLine.id,
          status: "processing" as const,
          engine: "dummy",
          takeCount: 1,
          scriptSnapshot: { line: sampleLine, voice: sampleVoice },
          createdAt: NOW,
          updatedAt: NOW,
        },
      ]),
    });
    await expect(
      renderMveLine(
        {
          projectId: "proj_1",
          lineId: sampleLine.id,
          projectDir: "/tmp/proj",
        },
        deps,
      ),
    ).rejects.toThrow(/bereits ein Render-Job/);
  });
});
