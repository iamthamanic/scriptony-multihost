/**
 * Scene/Shot ↔ audio DAW lane link model and labels.
 * Location: src/lib/scene-audio-lane-link.ts
 */

import { getLaneType } from "./audio-lane";
import { isCharacterDialogLane } from "./character-lane-map";
import { LANE_SCHEMA } from "./types";
import type { Character } from "./types";

export type SceneAudioLaneLinkKind = "dialog" | "sfx";

export interface SceneAudioLaneLink {
  laneIndex: number;
  kind: SceneAudioLaneLinkKind;
  characterId?: string;
}

export type SceneAudioLaneLinkMap = Record<string, SceneAudioLaneLink>;

export interface LinkableAudioLaneOption {
  laneIndex: number;
  kind: SceneAudioLaneLinkKind;
  label: string;
  characterId?: string;
}

/** Badge text e.g. "Audio Dialog Max Weber linked" / "Audio SFX 1 linked". */
export function formatSceneAudioLinkBadge(
  laneIndex: number,
  characterName?: string,
): string {
  if (getLaneType(laneIndex) === "sfx") {
    const num = laneIndex - LANE_SCHEMA.sfx.base + 1;
    return `Audio SFX ${num} linked`;
  }
  if (isCharacterDialogLane(laneIndex)) {
    const name = characterName?.trim() || "Dialog";
    return `Audio Dialog ${name} linked`;
  }
  return `Audio ${laneIndex} linked`;
}

/** Short chip label e.g. "Dialog Max Weber" / "SFX 1". */
export function formatSceneAudioLinkShort(
  laneIndex: number,
  characterName?: string,
): string {
  if (getLaneType(laneIndex) === "sfx") {
    const num = laneIndex - LANE_SCHEMA.sfx.base + 1;
    return `SFX ${num}`;
  }
  if (isCharacterDialogLane(laneIndex)) {
    const name = characterName?.trim() || "Dialog";
    return `Dialog ${name}`;
  }
  return `Audio ${laneIndex}`;
}

export interface SceneAudioLinkLabel {
  short: string;
  full: string;
}

export function getSceneAudioLinkLabel(
  laneIndex: number,
  characterName?: string,
): SceneAudioLinkLabel {
  return {
    short: formatSceneAudioLinkShort(laneIndex, characterName),
    full: formatSceneAudioLinkBadge(laneIndex, characterName),
  };
}

/** Opaque chip — see src/styles/scene-audio-link-chip.css (Tailwind bundle lacks bg-pink-300/400). */
export const SCENE_AUDIO_LINK_CHIP_CLASS = "scene-audio-link-chip";

export const SHOT_AUDIO_LINK_CHIP_CLASS = "shot-audio-link-chip";

/**
 * Min clip width (px) before link chip shows label + icon.
 * Matches getTimelineClipImageLayout full-bleed threshold (72px).
 */
export const SCENE_AUDIO_LINK_CLIP_LABEL_MIN_PX = 72;

export function showSceneAudioLinkClipLabel(clipWidthPx: number): boolean {
  return (
    Number.isFinite(clipWidthPx) &&
    clipWidthPx >= SCENE_AUDIO_LINK_CLIP_LABEL_MIN_PX
  );
}

export interface SidebarStructureAudioLink {
  nodeId: string;
  short: string;
  full: string;
}

export interface ResolveSidebarStructureAudioLinkInput {
  editingDialogOpen: boolean;
  editingNodeId?: string;
  editingNodeKind?: "scene" | "shot";
  blocks: StructureTimeBlock[];
  viewStartSec: number;
  viewEndSec: number;
  getLabel: (nodeId: string) => SceneAudioLinkLabel | undefined;
}

/**
 * Sidebar link chip: (1) scene/shot open in edit dialog if linked,
 * else (2) first viewport-visible block that has a link.
 */
export function resolveSidebarStructureAudioLink(
  input: ResolveSidebarStructureAudioLinkInput,
): SidebarStructureAudioLink | null {
  const {
    editingDialogOpen,
    editingNodeId,
    editingNodeKind,
    blocks,
    viewStartSec,
    viewEndSec,
    getLabel,
  } = input;

  if (
    editingDialogOpen &&
    editingNodeId &&
    editingNodeKind &&
    (editingNodeKind === "scene" || editingNodeKind === "shot")
  ) {
    const editingLabel = getLabel(editingNodeId);
    if (editingLabel) {
      return { nodeId: editingNodeId, ...editingLabel };
    }
  }

  for (const block of blocks) {
    const visible =
      block.endSec >= viewStartSec && block.startSec <= viewEndSec;
    if (!visible) continue;
    const label = getLabel(block.id);
    if (label) {
      return { nodeId: block.id, ...label };
    }
  }

  return null;
}

export function linkableLaneOptions(
  sortedLaneIndices: number[],
  getCharacterForLane: (laneIndex: number) => Character | undefined,
): LinkableAudioLaneOption[] {
  const options: LinkableAudioLaneOption[] = [];
  for (const laneIndex of sortedLaneIndices) {
    if (getLaneType(laneIndex) === "sfx") {
      const num = laneIndex - LANE_SCHEMA.sfx.base + 1;
      options.push({
        laneIndex,
        kind: "sfx",
        label: `Audio SFX ${num}`,
      });
      continue;
    }
    if (isCharacterDialogLane(laneIndex)) {
      const character = getCharacterForLane(laneIndex);
      if (!character) continue;
      options.push({
        laneIndex,
        kind: "dialog",
        characterId: character.id,
        label: `Audio Dialog ${character.name}`,
      });
    }
  }
  return options;
}

export function findNodeIdForLane(
  links: SceneAudioLaneLinkMap,
  laneIndex: number,
): string | undefined {
  for (const [nodeId, link] of Object.entries(links)) {
    if (link.laneIndex === laneIndex) return nodeId;
  }
  return undefined;
}

export function getLinkForNode(
  links: SceneAudioLaneLinkMap,
  nodeId: string,
): SceneAudioLaneLink | undefined {
  return links[nodeId];
}

export function getLinkForLane(
  links: SceneAudioLaneLinkMap,
  laneIndex: number,
): { nodeId: string; link: SceneAudioLaneLink } | undefined {
  const nodeId = findNodeIdForLane(links, laneIndex);
  if (!nodeId) return undefined;
  const link = links[nodeId];
  if (!link) return undefined;
  return { nodeId, link };
}

export interface StructureTimeBlock {
  id: string;
  startSec: number;
  endSec: number;
}

/** Playhead-based insert with optional jump to block start when outside. */
export function resolveLinkedAudioStartSec(args: {
  currentTimeSec: number;
  block: StructureTimeBlock;
  seekPlayhead: (sec: number) => void;
}): number {
  const { currentTimeSec, block, seekPlayhead } = args;
  const inside =
    currentTimeSec >= block.startSec && currentTimeSec <= block.endSec;
  if (inside) return currentTimeSec;
  seekPlayhead(block.startSec);
  return block.startSec;
}

/** Clamp clip end to block end; returns adjusted end (may equal requested if extend handles overflow). */
export function clampClipEndToBlockEnd(
  startSec: number,
  endSec: number,
  blockEndSec: number,
): number {
  return Math.min(endSec, Math.max(blockEndSec, startSec));
}
