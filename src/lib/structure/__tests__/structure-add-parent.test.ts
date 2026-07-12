import { describe, expect, it } from "vitest";
import {
  buildStructureParentOptions,
  structureAddDialogParentLabel,
  structureAddRequiresParentPicker,
} from "../structure-add-parent";

describe("structure-add-parent", () => {
  it("act does not require parent picker", () => {
    expect(structureAddRequiresParentPicker("act")).toBe(false);
    expect(structureAddRequiresParentPicker("sequence")).toBe(true);
    expect(structureAddRequiresParentPicker("scene")).toBe(true);
  });

  it("scene options include act context", () => {
    const options = buildStructureParentOptions(
      "scene",
      {
        acts: [
          {
            id: "a1",
            projectId: "p",
            actNumber: 1,
            title: "Akt I",
            orderIndex: 0,
            createdAt: "",
            updatedAt: "",
          },
        ],
        sequences: [
          {
            id: "s1",
            projectId: "p",
            actId: "a1",
            sequenceNumber: 1,
            title: "Seq 01",
            orderIndex: 0,
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      { act: "Akt", sequence: "Sequenz", scene: "Szene" },
    );
    expect(options).toEqual([{ id: "s1", label: "Akt I › Seq 01" }]);
  });

  it("dialog label for scene mentions act and sequence", () => {
    expect(
      structureAddDialogParentLabel("scene", {
        act: "Akt",
        sequence: "Sequenz",
        scene: "Szene",
      }),
    ).toBe("Akt und Sequenz auswählen");
  });

  it("shot options include act, sequence, and scene context", () => {
    const options = buildStructureParentOptions(
      "shot",
      {
        acts: [
          {
            id: "a1",
            projectId: "p",
            actNumber: 1,
            title: "Akt I",
            orderIndex: 0,
            createdAt: "",
            updatedAt: "",
          },
        ],
        sequences: [
          {
            id: "s1",
            projectId: "p",
            actId: "a1",
            sequenceNumber: 1,
            title: "Seq 1",
            orderIndex: 0,
            createdAt: "",
            updatedAt: "",
          },
        ],
        scenes: [
          {
            id: "sc1",
            projectId: "p",
            sequenceId: "s1",
            sceneNumber: 1,
            title: "Szene 001",
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
      { act: "Akt", sequence: "Sequenz", scene: "Szene" },
    );
    expect(options).toEqual([
      { id: "sc1", label: "Akt I › Seq 1 › Szene 001" },
    ]);
  });
});
