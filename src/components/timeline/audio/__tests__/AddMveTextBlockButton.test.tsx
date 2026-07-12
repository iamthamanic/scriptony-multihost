/**
 * @vitest-environment jsdom
 */

/**
 * Tests for AddMveTextBlockButton (T26 + hierarchical scene picker).
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";

import { AddMveTextBlockButton } from "../AddMveTextBlockButton";
import type { Character } from "../../../../lib/types";
import type { MveStructurePickerRefs } from "../../../structure/timeline/mve/MveStructureScenePickerModal";

afterEach(() => cleanup());

const mockCharacter: Character = {
  id: "char-1",
  projectId: "proj-1",
  name: "Ada",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const structurePicker: MveStructurePickerRefs = {
  acts: [
    {
      id: "act-1",
      projectId: "proj-1",
      actNumber: 1,
      title: "Einführung",
      orderIndex: 0,
      createdAt: "",
      updatedAt: "",
    },
  ],
  sequences: [
    {
      id: "seq-1",
      projectId: "proj-1",
      actId: "act-1",
      sequenceNumber: 1,
      title: "Seq 1",
      orderIndex: 0,
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "seq-2",
      projectId: "proj-1",
      actId: "act-1",
      sequenceNumber: 2,
      title: "Seq 2",
      orderIndex: 1,
      createdAt: "",
      updatedAt: "",
    },
  ],
  scenes: [
    {
      id: "scene-1",
      projectId: "proj-1",
      sequenceId: "seq-1",
      sceneNumber: 1,
      title: "Erste Szene",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "scene-2",
      projectId: "proj-1",
      sequenceId: "seq-2",
      sceneNumber: 2,
      title: "Zweite Szene",
      createdAt: "",
      updatedAt: "",
    },
  ],
};

describe("AddMveTextBlockButton", () => {
  it("renders on character dialog lanes", () => {
    render(
      <AddMveTextBlockButton
        laneIndex={10}
        character={mockCharacter}
        structurePicker={structurePicker}
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
        structurePicker={structurePicker}
        onAddTextBlock={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("does not render without a character", () => {
    const { container } = render(
      <AddMveTextBlockButton
        laneIndex={10}
        structurePicker={structurePicker}
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
        structurePicker={structurePicker}
        linkedSceneId="scene-2"
        onAddTextBlock={onAdd}
      />,
    );
    fireEvent.click(screen.getByLabelText("Text hinzufügen"));
    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        characterId: "char-1",
        sceneId: "scene-2",
      });
    });
    expect(screen.queryByTestId("mve-structure-scene-picker-modal")).toBeNull();
  });

  it("opens hierarchical scene picker when no link is set", async () => {
    const onAdd = vi.fn();
    render(
      <AddMveTextBlockButton
        laneIndex={10}
        character={mockCharacter}
        structurePicker={structurePicker}
        onAddTextBlock={onAdd}
      />,
    );
    fireEvent.click(screen.getByLabelText("Text hinzufügen"));
    expect(
      await screen.findByTestId("mve-structure-scene-picker-modal"),
    ).toBeTruthy();
    expect(screen.getByText("Szene 2: Zweite Szene")).toBeTruthy();
    expect(onAdd).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("mve-structure-scene-scene-2"));
    fireEvent.click(screen.getByTestId("mve-structure-scene-picker-confirm"));

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith({
        characterId: "char-1",
        sceneId: "scene-2",
      });
    });
  });

  it("does not add a text block when scene picker is cancelled", async () => {
    const onAdd = vi.fn();
    render(
      <AddMveTextBlockButton
        laneIndex={10}
        character={mockCharacter}
        structurePicker={structurePicker}
        onAddTextBlock={onAdd}
      />,
    );
    fireEvent.click(screen.getByLabelText("Text hinzufügen"));
    expect(
      await screen.findByTestId("mve-structure-scene-picker-modal"),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Abbrechen" }));
    await waitFor(() => {
      expect(
        screen.queryByTestId("mve-structure-scene-picker-modal"),
      ).toBeNull();
    });
    expect(onAdd).not.toHaveBeenCalled();
  });
});
