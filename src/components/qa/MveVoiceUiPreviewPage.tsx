/**
 * DEV-only MVE voice UI harness for verify-ui screenshots.
 * Location: src/components/qa/MveVoiceUiPreviewPage.tsx
 */

import { CharacterVoiceRow } from "@/components/characters/CharacterVoiceRow";
import type { MveVoiceProfile } from "@/lib/multi-voice-engine/schema/voice-profile";

const MOCK_PROFILE: MveVoiceProfile = {
  id: "mve_voice_preview",
  userId: "local-user",
  name: "Max Weber — Stimme",
  language: "de",
  engine: "kokoro",
  type: "default",
  status: "ready",
  baseVoiceId: "af_bella",
  characterId: "char_preview",
  previewText: "Hallo, ich bin Max Weber.",
  consentStatus: "not_required",
  commercialUseAllowed: false,
  version: 1,
  createdAt: "2026-06-24T10:00:00.000Z",
  updatedAt: "2026-06-24T10:00:00.000Z",
};

export function MveVoiceUiPreviewPage() {
  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  return (
    <div
      className="mx-auto max-w-xl space-y-8 p-8"
      data-testid="mve-voice-preview"
    >
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">MVE Voice UI — QA Preview</h1>
        <p className="text-xs text-muted-foreground">
          Nur für verify-ui Screenshots (#6b). Kein Produktions-Flow.
        </p>
      </header>

      <section data-testid="voice-row-unassigned" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Charakter ohne Stimme
        </h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <CharacterVoiceRow
            projectId="proj_preview"
            projectDir="/tmp/scriptony-preview"
            characterId="char_preview"
            characterName="Max Weber"
            profile={null}
            onVoiceChange={() => undefined}
          />
        </div>
      </section>

      <section data-testid="voice-row-assigned" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Charakter mit Stimme
        </h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <CharacterVoiceRow
            projectId="proj_preview"
            projectDir="/tmp/scriptony-preview"
            characterId="char_preview"
            characterName="Max Weber"
            profile={MOCK_PROFILE}
            onVoiceChange={() => undefined}
          />
        </div>
      </section>
    </div>
  );
}
