/**
 * snake_case / mixed → camelCase mappers for shared ripple-engine types.
 */

import type {
  RippleAct,
  RippleClip,
  RippleScene,
  RippleSequence,
} from "../../_shared/ripple-engine";

export function extractStartSec(item: Record<string, unknown>): number {
  return Number(item.startSec ?? item.start_sec ?? item.start ?? 0);
}

export function extractEndSec(item: Record<string, unknown>): number {
  return Number(item.endSec ?? item.end_sec ?? item.end ?? 0);
}

export function extractOrderIndex(item: Record<string, unknown>): number {
  return Number(item.orderIndex ?? item.order_index ?? 0);
}

export function mapToRippleClip(raw: unknown): RippleClip {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id),
    sceneId: String(item.sceneId ?? item.scene_id ?? ""),
    startSec: extractStartSec(item),
    endSec: extractEndSec(item),
    crossScene: Boolean(item.crossScene ?? item.cross_scene ?? false),
  };
}

export function mapToRippleScene(raw: unknown): RippleScene {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id),
    sequenceId: (item.sequenceId ?? item.sequence_id ?? null) as string | null,
    startSec: extractStartSec(item),
    endSec: extractEndSec(item),
    durationSec: Math.max(extractEndSec(item) - extractStartSec(item), 0),
    orderIndex: extractOrderIndex(item),
  };
}

export function mapToRippleSequence(raw: unknown): RippleSequence {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id),
    actId: (item.actId ?? item.act_id ?? null) as string | null,
    startSec: extractStartSec(item),
    endSec: extractEndSec(item),
    durationSec: Math.max(extractEndSec(item) - extractStartSec(item), 0),
    orderIndex: extractOrderIndex(item),
  };
}

export function mapToRippleAct(raw: unknown): RippleAct {
  const item = raw as Record<string, unknown>;
  return {
    id: String(item.id),
    startSec: extractStartSec(item),
    endSec: extractEndSec(item),
    durationSec: Math.max(extractEndSec(item) - extractStartSec(item), 0),
    orderIndex: extractOrderIndex(item),
  };
}
