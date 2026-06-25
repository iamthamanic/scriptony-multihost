/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AddMveTextBlockButton (T26).
 * - renders only on dialog lanes with a character
 * - resolves target scene from lane link or fallback
 * - calls onAddTextBlock with the resolved scene
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { AddMveTextBlockButton } from "../AddMveTextBlockButton";
import type { Character } from "../../../../lib/types";

afterEach(() => cleanup());

const mockCharacter: Character = {
  id: "char-1",
  projectId: "proj-1",
  name: "Ada",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

describe("AddMveTextBlockButton", () => {
  it("renders on character dialog lanes", () => {
    render(
      <AddMveTextBlockButton
        laneIndex={10}
        character={mockCharacter}
        scenes={[{ id: "scene-1" }]}
        onAddTextBlock={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Text hinzufügen")).toBeTruthy();
  });

  it("does not render for non-dialog lanes", () => {
    const { container } = render(
      <AddMveTextBlockButton
        laneIndex={1000}
        character={mockCharacter}
        scenes={[{ id: "scene-1" }]}
        onAddTextBlock={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render without a character", () => {
    const { container } = render(
      <AddMveTextBlockButton
        laneIndex={10}
        scenes={[{ id: "scene-1" }]}
        onAddTextBlock={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("uses linkedSceneId when provided", async () => {
    const onAdd = vi.fn();
    render(
      <AddMveTextBlockButton
        laneIndex={10}
        character={mockCharacter}
        scenes={[{ id: "scene-1" }, { id: "scene-2" }]}
        linkedSceneId="scene-2"
        onAddTextBlock={onAdd}
      />,
    );
    fireEvent.click(screen.getByLabelText("Text hinzufügen"));
    await new Promise((r) => setTimeout(r, 0));
    expect(onAdd).toHaveBeenCalledWith({
      characterId: "char-1",
      sceneId: "scene-2",
    });
  });

  it("falls back to the first scene when no link is set", async () => {
    const onAdd = vi.fn();
    render(
      <AddMveTextBlockButton
        laneIndex={10}
        character={mockCharacter}
        scenes={[{ id: "scene-1" }, { id: "scene-2" }]}
        onAddTextBlock={onAdd}
      />,
    );
    fireEvent.click(screen.getByLabelText("Text hinzufügen"));
    await new Promise((r) => setTimeout(r, 0));
    expect(onAdd).toHaveBeenCalledWith({
      characterId: "char-1",
      sceneId: "scene-1",
    });
  });
});
