/**
 * @vitest-environment jsdom
 */

/**
 * Tests für AudioTimelineSegment (T31).
 * - Waveform-Visualisierung (SVG-Rechtecke)
 * - TTS-Button auf geschätzten Clips
 * - Accessibility-Attribute
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("../AudioTimelineSegmentMveText", () => ({
  AudioTimelineSegmentMveText: () => null,
}));

import { AudioTimelineSegment } from "../AudioTimelineSegment";
import type { AudioClip, AudioTrack } from "../../../lib/types";

afterEach(() => cleanup());

// ─── Fixtures ─────────────────────────────────────────────────

const mockClip: AudioClip = {
  id: "clip-1",
  trackId: "track-1",
  sceneId: "scene-1",
  projectId: "proj-1",
  startSec: 0,
  endSec: 5,
  laneIndex: 0,
  orderIndex: 0,
  trackType: "dialog",
  content: "Hallo Welt",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockTrack: AudioTrack = {
  id: "track-1",
  sceneId: "scene-1",
  projectId: "proj-1",
  type: "dialog",
  content: "Hallo Welt",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

// ─── Waveform Tests ─────────────────────────────────────────────

describe("AudioTimelineSegment — Waveform", () => {
  it("rendert SVG-Waveform wenn waveformData vorhanden", () => {
    const clip: AudioClip = {
      ...mockClip,
      audioFileId: "file-123",
      waveformData: [0.1, 0.5, 0.9, 0.3, 0.2],
    };
    render(<AudioTimelineSegment item={clip} pxPerSec={20} />);

    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();

    const rects = svg!.querySelectorAll("rect");
    expect(rects.length).toBe(5);
  });

  it("rendert maximal 200 Waveform-Samples", () => {
    const manyPeaks = Array.from({ length: 300 }, (_, i) => i / 300);
    const clip: AudioClip = {
      ...mockClip,
      audioFileId: "file-123",
      waveformData: manyPeaks,
    };
    render(<AudioTimelineSegment item={clip} pxPerSec={20} />);

    const rects = document.querySelectorAll("svg rect");
    expect(rects.length).toBe(200);
  });

  it("rendert KEIN Waveform wenn waveformData fehlt", () => {
    const clip: AudioClip = {
      ...mockClip,
      audioFileId: "file-123",
    };
    render(<AudioTimelineSegment item={clip} pxPerSec={20} />);

    const svg = document.querySelector("svg");
    expect(svg).toBeFalsy();
  });

  it("rendert KEIN Waveform für Legacy-Tracks", () => {
    render(<AudioTimelineSegment item={mockTrack} pxPerSec={20} />);

    const svg = document.querySelector("svg");
    expect(svg).toBeFalsy();
  });

  it("Waveform-SVG ist dekorativ (aria-hidden)", () => {
    const clip: AudioClip = {
      ...mockClip,
      audioFileId: "file-123",
      waveformData: [0.5, 0.5],
    };
    render(<AudioTimelineSegment item={clip} pxPerSec={20} />);

    const svg = document.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("role")).toBeNull();
  });
});

// ─── TTS-Button Tests ──────────────────────────────────────────

describe("AudioTimelineSegment — TTS-Button", () => {
  it("zeigt TTS-Button auf geschätztem Clip mit handler", () => {
    const onGenerate = vi.fn();
    const clip: AudioClip = {
      ...mockClip,
      // kein audioFileId → geschätzt
    };
    render(
      <AudioTimelineSegment
        item={clip}
        pxPerSec={20}
        onGenerateTts={onGenerate}
      />,
    );

    const btn = screen.getByLabelText("TTS generieren");
    expect(btn).toBeTruthy();
  });

  it("ruft onGenerateTts bei Klick auf", () => {
    const onGenerate = vi.fn();
    const clip: AudioClip = { ...mockClip };
    render(
      <AudioTimelineSegment
        item={clip}
        pxPerSec={20}
        onGenerateTts={onGenerate}
      />,
    );

    const btn = screen.getByLabelText("TTS generieren");
    fireEvent.click(btn);
    expect(onGenerate).toHaveBeenCalledTimes(1);
  });

  it("zeigt KEINEN TTS-Button wenn Clip bereits generiert", () => {
    const onGenerate = vi.fn();
    const clip: AudioClip = {
      ...mockClip,
      audioFileId: "file-123",
    };
    render(
      <AudioTimelineSegment
        item={clip}
        pxPerSec={20}
        onGenerateTts={onGenerate}
      />,
    );

    expect(screen.queryByLabelText("TTS generieren")).toBeNull();
  });

  it("zeigt KEINEN TTS-Button wenn kein handler übergeben", () => {
    const clip: AudioClip = { ...mockClip };
    render(<AudioTimelineSegment item={clip} pxPerSec={20} />);

    expect(screen.queryByLabelText("TTS generieren")).toBeNull();
  });

  it("zeigt KEINEN TTS-Button für Legacy-Tracks", () => {
    const onGenerate = vi.fn();
    render(
      <AudioTimelineSegment
        item={mockTrack}
        pxPerSec={20}
        onGenerateTts={onGenerate}
      />,
    );

    expect(screen.queryByLabelText("TTS generieren")).toBeNull();
  });
});

// ─── Accessibility / Styling Tests ──────────────────────────────

describe("AudioTimelineSegment — Accessibility", () => {
  it("zeigt ⏳-Badge auf geschätzten Clips", () => {
    const clip: AudioClip = { ...mockClip };
    const { container } = render(
      <AudioTimelineSegment item={clip} pxPerSec={20} />,
    );
    expect(container.textContent).toContain("⏳");
  });

  it("zeigt border-dotted auf geschätzten Clips", () => {
    const clip: AudioClip = { ...mockClip };
    const { container } = render(
      <AudioTimelineSegment item={clip} pxPerSec={20} />,
    );
    const segment = container.firstElementChild;
    expect(segment?.className).toContain("border-dotted");
  });

  it("zeigt border-solid auf generierten Clips", () => {
    const clip: AudioClip = {
      ...mockClip,
      audioFileId: "file-123",
    };
    const { container } = render(
      <AudioTimelineSegment item={clip} pxPerSec={20} />,
    );
    const segment = container.firstElementChild;
    expect(segment?.className).toContain("border-solid");
  });

  it("hat aria-label für Screenreader", () => {
    const clip: AudioClip = { ...mockClip };
    render(<AudioTimelineSegment item={clip} pxPerSec={20} />);
    const segment = screen.getByLabelText(/Geschätzt/);
    expect(segment).toBeTruthy();
  });

  it("hat Tooltip-Title", () => {
    const clip: AudioClip = {
      ...mockClip,
      audioFileId: "file-123",
      waveformData: [0.5],
    };
    render(<AudioTimelineSegment item={clip} pxPerSec={20} />);
    const segment = screen.getByLabelText(/dialog/);
    expect(segment.getAttribute("title")).toContain("Generiert");
  });
});
