import { describe, expect, it, vi } from "vitest";
import {
  formatSceneAudioLinkBadge,
  formatSceneAudioLinkShort,
  getLinkForLane,
  getLinkForNode,
  findNodeIdForLane,
  getSceneAudioLinkLabel,
  linkableLaneOptions,
  resolveLinkedAudioStartSec,
  resolveSidebarStructureAudioLink,
  showSceneAudioLinkClipLabel,
  SCENE_AUDIO_LINK_CLIP_LABEL_MIN_PX,
} from "../scene-audio-lane-link";
import { LANE_SCHEMA } from "../types";

import type { Character } from "../types";

describe("scene-audio-lane-link", () => {
  it("formats dialog and sfx badges", () => {
    expect(formatSceneAudioLinkBadge(0, "Max Weber")).toBe(
      "Audio Dialog Max Weber linked",
    );
    expect(formatSceneAudioLinkShort(0, "Max Weber")).toBe("Dialog Max Weber");
    const sfxLane = LANE_SCHEMA.sfx.base;
    expect(formatSceneAudioLinkBadge(sfxLane)).toBe("Audio SFX 1 linked");
    expect(formatSceneAudioLinkShort(sfxLane)).toBe("SFX 1");
    expect(getSceneAudioLinkLabel(0, "Anna").short).toBe("Dialog Anna");
  });

  it("lists only dialog lanes with characters and sfx lanes", () => {
    const options = linkableLaneOptions([0, LANE_SCHEMA.sfx.base, 1], (lane) =>
      lane === 0
        ? ({
            id: "c1",
            name: "Anna",
            projectId: "p1",
            createdAt: "",
            updatedAt: "",
          } satisfies Character)
        : undefined,
    );
    expect(options).toHaveLength(2);
    expect(options[0]?.kind).toBe("dialog");
    expect(options[1]?.kind).toBe("sfx");
  });

  it("resolves lane ↔ node lookups", () => {
    const links = {
      scene1: { laneIndex: 0, kind: "dialog" as const, characterId: "c1" },
    };
    expect(getLinkForNode(links, "scene1")?.laneIndex).toBe(0);
    expect(getLinkForLane(links, 0)?.nodeId).toBe("scene1");
    expect(findNodeIdForLane(links, 0)).toBe("scene1");
  });

  it("seeks playhead when outside linked block", () => {
    const seek = vi.fn();
    const start = resolveLinkedAudioStartSec({
      currentTimeSec: 50,
      block: { id: "s1", startSec: 10, endSec: 20 },
      seekPlayhead: seek,
    });
    expect(start).toBe(10);
    expect(seek).toHaveBeenCalledWith(10);

    const inside = resolveLinkedAudioStartSec({
      currentTimeSec: 15,
      block: { id: "s1", startSec: 10, endSec: 20 },
      seekPlayhead: vi.fn(),
    });
    expect(inside).toBe(15);
  });

  it("prefers editing scene link then first visible linked block", () => {
    const getLabel = (id: string) =>
      id === "scene-edit" || id === "scene-visible"
        ? { short: "Dialog X", full: "Audio Dialog X linked" }
        : undefined;

    const fromEdit = resolveSidebarStructureAudioLink({
      editingDialogOpen: true,
      editingNodeId: "scene-edit",
      editingNodeKind: "scene",
      blocks: [
        { id: "scene-visible", startSec: 0, endSec: 10 },
        { id: "scene-other", startSec: 20, endSec: 30 },
      ],
      viewStartSec: 0,
      viewEndSec: 15,
      getLabel,
    });
    expect(fromEdit?.nodeId).toBe("scene-edit");

    const fromVisible = resolveSidebarStructureAudioLink({
      editingDialogOpen: false,
      blocks: [
        { id: "scene-hidden", startSec: 100, endSec: 110 },
        { id: "scene-visible", startSec: 5, endSec: 15 },
      ],
      viewStartSec: 0,
      viewEndSec: 20,
      getLabel,
    });
    expect(fromVisible?.nodeId).toBe("scene-visible");
  });

  it("shows link label only from clip width threshold", () => {
    expect(SCENE_AUDIO_LINK_CLIP_LABEL_MIN_PX).toBe(72);
    expect(showSceneAudioLinkClipLabel(71)).toBe(false);
    expect(showSceneAudioLinkClipLabel(72)).toBe(true);
  });
});
