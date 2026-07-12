import { describe, expect, it } from "vitest";
import {
  nextActCreatePayload,
  nextSceneCreatePayload,
  nextSequenceCreatePayload,
} from "../structure-create-fields";

describe("structure-create-fields", () => {
  it("nextActCreatePayload increments actNumber and orderIndex", () => {
    expect(
      nextActCreatePayload(
        [
          {
            id: "a1",
            projectId: "p",
            actNumber: 2,
            title: "A",
            orderIndex: 0,
            createdAt: "",
            updatedAt: "",
          },
        ],
        "Akt",
      ),
    ).toEqual({ actNumber: 3, title: "Akt 3", orderIndex: 1 });
  });

  it("nextSequenceCreatePayload scopes to actId", () => {
    expect(
      nextSequenceCreatePayload(
        [
          {
            id: "s1",
            projectId: "p",
            actId: "a1",
            sequenceNumber: 1,
            title: "S",
            orderIndex: 0,
            createdAt: "",
            updatedAt: "",
          },
          {
            id: "s2",
            projectId: "p",
            actId: "a2",
            sequenceNumber: 5,
            title: "X",
            orderIndex: 0,
            createdAt: "",
            updatedAt: "",
          },
        ],
        "a1",
        "Seq",
      ),
    ).toEqual({ sequenceNumber: 2, title: "Seq 2", orderIndex: 1 });
  });
});
