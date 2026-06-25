/**
 * DEV-only MVE take UI harness for verify-ui screenshots (#23).
 * Location: src/components/qa/MveTakeUiPreviewPage.tsx
 */

import type { ReactNode } from "react";

import { MveLineTakePanel } from "@/components/structure/timeline/mve/MveLineTakePanel";
import type { MveLine } from "@/lib/multi-voice-engine/schema/line";
import type { MveTake } from "@/lib/multi-voice-engine/schema/take";

const NOW = "2026-06-24T12:00:00.000Z";

const BASE_LINE: MveLine = {
  id: "line_preview",
  sceneId: "scene_preview",
  orderIndex: 0,
  type: "dialogue",
  audioClipId: "clip_preview",
  characterId: "char_preview",
  text: "Guten Tag, willkommen in unserer Geschichte.",
  status: "rendered",
  selectedTakeId: "take_preview_1",
  createdAt: NOW,
  updatedAt: NOW,
};

const MOCK_TAKES: MveTake[] = [
  {
    id: "take_preview_0",
    lineId: BASE_LINE.id,
    jobId: "job_preview",
    takeIndex: 0,
    audioUrl: "dummy://take-0",
    durationMs: 1200,
    isSelected: false,
    status: "ready",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "take_preview_1",
    lineId: BASE_LINE.id,
    jobId: "job_preview",
    takeIndex: 1,
    audioUrl: "/tmp/scriptony-preview/take-1.wav",
    durationMs: 1180,
    isSelected: true,
    status: "ready",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "take_preview_2",
    lineId: BASE_LINE.id,
    jobId: "job_preview",
    takeIndex: 2,
    status: "failed",
    isSelected: false,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

function ClipBar({
  testId,
  children,
}: {
  testId: string;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      className="flex items-center gap-1 rounded border border-gray-600 bg-blue-600 px-1.5 py-0.5 text-[10px] text-white max-w-md"
    >
      {children}
    </div>
  );
}

export function MveTakeUiPreviewPage() {
  if (!import.meta.env.DEV) {
    return (
      <p className="p-8 text-sm text-muted-foreground">
        QA-Vorschau nur im Dev-Build verfügbar.
      </p>
    );
  }

  const lineNoText: MveLine = { ...BASE_LINE, id: "line_no_text", text: "" };
  const lineNoVoice: MveLine = {
    ...BASE_LINE,
    id: "line_no_voice",
    characterId: undefined,
  };

  return (
    <div
      className="mx-auto max-w-2xl space-y-8 p-8"
      data-testid="mve-take-preview"
    >
      <header className="space-y-1">
        <h1 className="text-lg font-semibold">MVE Take UI — QA Preview</h1>
        <p className="text-xs text-muted-foreground">
          Nur für verify-ui Screenshots (#23). Kein Produktions-Flow.
        </p>
      </header>

      <section data-testid="mve-take-empty" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Keine Takes (Empty state)
        </h2>
        <ClipBar testId="mve-take-empty-clip">
          <MveLineTakePanel
            line={BASE_LINE}
            projectId="proj_preview"
            qaPreview={{ takes: [] }}
            onRenderLine={async () => undefined}
          />
          <span className="truncate font-medium">{BASE_LINE.text}</span>
        </ClipBar>
      </section>

      <section data-testid="mve-take-list" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Takes mit Status, Play, Auswählen
        </h2>
        <ClipBar testId="mve-take-list-clip">
          <MveLineTakePanel
            line={BASE_LINE}
            projectId="proj_preview"
            qaPreview={{ takes: MOCK_TAKES }}
            onRenderLine={async () => undefined}
          />
          <span className="truncate font-medium">{BASE_LINE.text}</span>
        </ClipBar>
      </section>

      <section data-testid="mve-take-rendering" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Render läuft (Loading state)
        </h2>
        <ClipBar testId="mve-take-rendering-clip">
          <MveLineTakePanel
            line={BASE_LINE}
            projectId="proj_preview"
            qaPreview={{ takes: MOCK_TAKES }}
            isRendering
            onRenderLine={async () => undefined}
          />
          <span className="truncate font-medium">{BASE_LINE.text}</span>
        </ClipBar>
      </section>

      <section data-testid="mve-take-blocked-text" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Render blockiert — kein Text
        </h2>
        <ClipBar testId="mve-take-blocked-text-clip">
          <MveLineTakePanel
            line={lineNoText}
            projectId="proj_preview"
            qaPreview={{ takes: [] }}
            renderBlockReason="Bitte zuerst Dialogtext eingeben."
            onRenderLine={async () => undefined}
          />
          <span className="truncate font-medium italic opacity-80">
            Text hinzufügen…
          </span>
        </ClipBar>
      </section>

      <section data-testid="mve-take-blocked-voice" className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Render blockiert — keine Stimme
        </h2>
        <ClipBar testId="mve-take-blocked-voice-clip">
          <MveLineTakePanel
            line={lineNoVoice}
            projectId="proj_preview"
            qaPreview={{ takes: [] }}
            renderBlockReason="Charakter hat keine Stimme — im Characters-Panel zuweisen."
            onRenderLine={async () => undefined}
          />
          <span className="truncate font-medium">{BASE_LINE.text}</span>
        </ClipBar>
      </section>
    </div>
  );
}
