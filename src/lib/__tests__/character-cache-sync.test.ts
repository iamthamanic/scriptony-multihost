/** @vitest-environment jsdom */
import { describe, expect, it, vi } from "vitest";
import {
  CHARACTER_DELETED_EVENT,
  emitCharacterDeleted,
  onCharacterDeleted,
} from "../character-cache-sync";

describe("character-cache-sync", () => {
  it("emits and receives character deleted events", () => {
    const handler = vi.fn();
    const cleanup = onCharacterDeleted(handler);
    emitCharacterDeleted("proj-1", "char-1");
    expect(handler).toHaveBeenCalledWith({
      projectId: "proj-1",
      characterId: "char-1",
    });
    cleanup();
  });

  it("exports stable event name", () => {
    expect(CHARACTER_DELETED_EVENT).toBe("scriptony:character-deleted");
  });
});
