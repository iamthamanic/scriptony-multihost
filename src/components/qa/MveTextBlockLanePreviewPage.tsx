/**
 * DEV-only QA harness for T26 — dialog lane plus button becomes "Text hinzufügen".
 * Location: src/components/qa/MveTextBlockLanePreviewPage.tsx
 */

import { AudioClipLaneSidebar } from "@/components/timeline/audio/AudioClipLaneSidebar";
import type { Character } from "@/lib/types";

const MOCK_CHARACTER: Character = {
  id: "char_preview",
  projectId: "proj_preview",
  name: "Max Weber",
  createdAt: "2026-06-24T10:00:00.000Z",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

export function MveTextBlockLanePreviewPage() {
  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  return (
    <div
      className="mx-auto max-w-md space-y-8 p-8"
      data-testid="mve-text-block-lane-preview"
    >
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">T26 — Text-First Dialog Lane</h1>
        <p className="text-xs text-muted-foreground">
          Plus button on character lanes creates a text block instead of audio.
        </p>
      </header>

      <section data-testid="dialog-lane-with-link" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Dialog-Spur mit Lane-Link
        </h2>
        <div className="rounded-lg border border-border bg-card p-2">
          <AudioClipLaneSidebar
            fullWidth
            laneIndex={0}
            expanded={false}
            expandedLane={null}
            locked={false}
            character={MOCK_CHARACTER}
            scenes={[{ id: "scene-1" }, { id: "scene-2" }]}
            currentTimeSec={0}
            onAddMveTextBlock={async () => undefined}
            linkedSceneId="scene-2"
            onMuteChange={() => undefined}
            onSoloChange={() => undefined}
            onVolumeChange={() => undefined}
            onPanChange={() => undefined}
            onFxSlotChange={() => undefined}
            onFxChainEnabledChange={() => undefined}
          />
        </div>
      </section>

      <section data-testid="dialog-lane-no-link" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Dialog-Spur ohne Lane-Link (Fallback auf erste Szene)
        </h2>
        <div className="rounded-lg border border-border bg-card p-2">
          <AudioClipLaneSidebar
            fullWidth
            laneIndex={10}
            expanded={false}
            expandedLane={null}
            locked={false}
            character={MOCK_CHARACTER}
            scenes={[{ id: "scene-1" }, { id: "scene-2" }]}
            currentTimeSec={0}
            onAddMveTextBlock={async () => undefined}
            onMuteChange={() => undefined}
            onSoloChange={() => undefined}
            onVolumeChange={() => undefined}
            onPanChange={() => undefined}
            onFxSlotChange={() => undefined}
            onFxChainEnabledChange={() => undefined}
          />
        </div>
      </section>

      <section data-testid="sfx-lane-unchanged" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          SFX-Spur bleibt unverändert
        </h2>
        <div className="rounded-lg border border-border bg-card p-2">
          <AudioClipLaneSidebar
            fullWidth
            laneIndex={100}
            expanded={false}
            expandedLane={null}
            locked={false}
            addAudio={{
              isBusy: false,
              recordingLane: null,
              addGenerated: async () => undefined,
              triggerUpload: async () => undefined,
              toggleRecord: async () => undefined,
              addSfxLane: async () => undefined,
              generateBlockReasonForLane: () => undefined,
            }}
            scenes={[{ id: "scene-1" }]}
            currentTimeSec={0}
            onMuteChange={() => undefined}
            onSoloChange={() => undefined}
            onVolumeChange={() => undefined}
            onPanChange={() => undefined}
            onFxSlotChange={() => undefined}
            onFxChainEnabledChange={() => undefined}
          />
        </div>
      </section>
    </div>
  );
}
