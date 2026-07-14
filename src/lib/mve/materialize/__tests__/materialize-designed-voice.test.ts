/**
 * Tests for materializeDesignedVoice orchestration.
 * Location: src/lib/mve/materialize/__tests__/materialize-designed-voice.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/runtime/detect-runtime", () => ({
  isDesktopShell: vi.fn(() => true),
}));

vi.mock("@/lib/api-adapter/runtime-dispatch", () => ({
  requireLocalBackend: vi.fn(() => ({
    localProject: { dirPath: "/tmp/project.scriptony" },
  })),
}));

vi.mock("@/lib/api-adapter/mve-adapter", () => ({
  createMveVoiceProfile: vi.fn(),
  getMveVoiceProfiles: vi.fn(),
  updateMveVoiceProfile: vi.fn(),
}));

vi.mock("@/lib/multi-voice-engine/adapters/qwen-voice-design.adapter", () => ({
  qwenVoiceDesignAdapter: {
    materialize: vi.fn(),
  },
}));

vi.mock("@/lib/api/voicebox-api", () => ({
  ensureVoiceboxAvailable: vi.fn(async () => undefined),
  createVoiceboxProfile: vi.fn(),
  uploadVoiceboxProfileSample: vi.fn(),
}));

vi.mock("@/lib/mve/safety/read-voice-ref-audio", () => ({
  readVoiceRefAudioFromProject: vi.fn(),
}));

import {
  createMveVoiceProfile,
  getMveVoiceProfiles,
  updateMveVoiceProfile,
} from "@/lib/api-adapter/mve-adapter";
import {
  createVoiceboxProfile,
  uploadVoiceboxProfileSample,
} from "@/lib/api/voicebox-api";
import { qwenVoiceDesignAdapter } from "@/lib/multi-voice-engine/adapters/qwen-voice-design.adapter";
import { readVoiceRefAudioFromProject } from "@/lib/mve/safety/read-voice-ref-audio";
import {
  assertUniqueVoiceNameInProject,
  materializeDesignedVoice,
  QWEN_VOICE_DESIGN_MODEL,
} from "../materialize-designed-voice";

const NOW = "2026-07-14T12:00:00.000Z";

const draftProfile = {
  id: "mve_voice_designed_1",
  userId: "local-user",
  name: "Pazuzu",
  language: "de",
  engine: "voicebox",
  type: "generated" as const,
  status: "processing" as const,
  creationMode: "designed" as const,
  provider: "qwen" as const,
  model: QWEN_VOICE_DESIGN_MODEL,
  identityPrompt: "Weibliche Stimme, jung, hell",
  referenceAudioAssetId: "asset_1",
  referenceAudioUrl: "assets/voice-refs/pazuzu.wav",
  referenceText: "Natürlich habe ich recht.",
  consentStatus: "not_required" as const,
  commercialUseAllowed: false,
  version: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

describe("assertUniqueVoiceNameInProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects duplicate names case-insensitively", async () => {
    vi.mocked(getMveVoiceProfiles).mockResolvedValueOnce([
      { ...draftProfile, name: "pazuzu" },
    ]);
    await expect(
      assertUniqueVoiceNameInProject("proj_1", "Pazuzu"),
    ).rejects.toThrow(/existiert bereits/);
  });
});

describe("materializeDesignedVoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMveVoiceProfiles).mockResolvedValue([]);
    vi.mocked(qwenVoiceDesignAdapter.materialize).mockResolvedValue({
      referenceAudioAssetId: "asset_1",
      referenceAudioUrl: "assets/voice-refs/pazuzu.wav",
      referenceText: "Natürlich habe ich recht.",
      identityPrompt: "Weibliche Stimme, jung, hell",
    });
    vi.mocked(createMveVoiceProfile).mockResolvedValue(draftProfile);
    vi.mocked(createVoiceboxProfile).mockResolvedValue({
      id: "vb_profile_1",
      name: "Pazuzu",
    });
    vi.mocked(readVoiceRefAudioFromProject).mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      fileName: "pazuzu.wav",
    });
    vi.mocked(uploadVoiceboxProfileSample).mockResolvedValue({
      sampleId: "sample_1",
    });
    vi.mocked(updateMveVoiceProfile).mockResolvedValue({
      ...draftProfile,
      status: "ready",
      baseVoiceId: "vb_profile_1",
    });
  });

  it("roundtrip: materialize sidecar, create profile, voicebox clone", async () => {
    const result = await materializeDesignedVoice({
      projectId: "proj_1",
      sessionId: "vd_sess_abc",
      candidateId: "candidate-1",
      name: "Pazuzu",
      previewText: "Natürlich habe ich recht.",
      characterId: "char_1",
    });

    expect(qwenVoiceDesignAdapter.materialize).toHaveBeenCalledWith({
      sessionId: "vd_sess_abc",
      candidateId: "candidate-1",
      name: "Pazuzu",
      previewText: "Natürlich habe ich recht.",
      projectId: "proj_1",
      projectDir: "/tmp/project.scriptony",
    });

    expect(createMveVoiceProfile).toHaveBeenCalledWith(
      "proj_1",
      expect.objectContaining({
        name: "Pazuzu",
        creationMode: "designed",
        provider: "qwen",
        model: QWEN_VOICE_DESIGN_MODEL,
        referenceAudioAssetId: "asset_1",
        consentStatus: "not_required",
      }),
    );

    expect(uploadVoiceboxProfileSample).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "vb_profile_1",
        referenceText: "Natürlich habe ich recht.",
      }),
    );

    expect(result.baseVoiceId).toBe("vb_profile_1");
    expect(result.profile.status).toBe("ready");
    expect(result.profile.creationMode).toBe("designed");
  });

  it("marks profile failed when voicebox clone fails", async () => {
    vi.mocked(createVoiceboxProfile).mockRejectedValueOnce(
      new Error("Voicebox offline"),
    );

    await expect(
      materializeDesignedVoice({
        projectId: "proj_1",
        sessionId: "vd_sess_abc",
        candidateId: "candidate-1",
        name: "Pazuzu",
        previewText: "Natürlich habe ich recht.",
      }),
    ).rejects.toThrow(/Voicebox offline/);

    expect(updateMveVoiceProfile).toHaveBeenCalledWith("mve_voice_designed_1", {
      status: "failed",
    });
  });
});
