/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_STRUCTURE_VIEW,
  STRUCTURE_VIEW_IDS,
  persistStructureView,
  readPersistedStructureView,
  structureViewStorageKey,
} from "../structure/structure-view-id";

describe("structure-view-id persistence", () => {
  const projectId = "local_test-project";

  afterEach(() => {
    sessionStorage.removeItem(structureViewStorageKey(projectId));
  });

  it("defaults to dropdown when nothing stored", () => {
    expect(readPersistedStructureView(projectId)).toBe(
      DEFAULT_STRUCTURE_VIEW,
    );
  });

  it("round-trips timeline view via sessionStorage", () => {
    persistStructureView(projectId, STRUCTURE_VIEW_IDS.timelineview);
    expect(readPersistedStructureView(projectId)).toBe(
      STRUCTURE_VIEW_IDS.timelineview,
    );
  });

  it("normalizes legacy tab values", () => {
    sessionStorage.setItem(structureViewStorageKey(projectId), "timeline");
    expect(readPersistedStructureView(projectId)).toBe(
      STRUCTURE_VIEW_IDS.timelineview,
    );
  });
});
