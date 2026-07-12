/**
 * fx-chain — lane FX slot helpers (metadata + stock effect catalog).
 */

export const FX_SLOT_COUNT = 7;

export type FxSlotPresets = (string | null)[];

export interface StockFxPlugin {
  id: string;
  name: string;
  type: string;
}

/** Stock effects for picker UI (v1: metadata only, no DSP). */
export const STOCK_FX_PLUGINS: readonly StockFxPlugin[] = [
  { id: "eq", name: "EQ", type: "effect" },
  { id: "compressor", name: "Compressor", type: "effect" },
  { id: "reverb", name: "Reverb", type: "effect" },
  { id: "delay", name: "Delay", type: "effect" },
  { id: "gate", name: "Gate", type: "effect" },
  { id: "deesser", name: "De-Esser", type: "effect" },
  { id: "limiter", name: "Limiter", type: "effect" },
  { id: "saturation", name: "Saturation", type: "effect" },
] as const;

const LEGACY_REVERB_TO_STOCK: Record<string, string> = {
  reverb_light: "reverb",
  reverb_medium: "reverb",
  reverb_large: "reverb",
  reverb_cathedral: "reverb",
};

export function emptyFxSlots(): FxSlotPresets {
  return Array.from({ length: FX_SLOT_COUNT }, () => null);
}

export function normalizeFxSlots(input: unknown): FxSlotPresets {
  const slots = emptyFxSlots();
  if (!Array.isArray(input)) return slots;
  for (let i = 0; i < FX_SLOT_COUNT; i++) {
    const v = input[i];
    slots[i] = typeof v === "string" && v.length > 0 ? v : null;
  }
  return slots;
}

export function getStockFxPlugin(
  effectId: string | null | undefined,
): StockFxPlugin | undefined {
  if (!effectId) return undefined;
  const mapped = LEGACY_REVERB_TO_STOCK[effectId] ?? effectId;
  return (
    STOCK_FX_PLUGINS.find((p) => p.id === mapped) ?? {
      id: effectId,
      name: effectId,
      type: "effect",
    }
  );
}

export function getStockFxSlotLabel(effectId: string | null): string {
  if (!effectId) return "";
  const plugin = getStockFxPlugin(effectId);
  const name = plugin?.name ?? effectId;
  return name.length > 7 ? `${name.slice(0, 6)}…` : name;
}

export interface FxLaneMetadata {
  fxChain?: FxSlotPresets;
  fxChainEnabled?: boolean;
}

export function parseFxLaneMetadata(metadata: unknown): FxLaneMetadata {
  if (!metadata || typeof metadata !== "object") return {};
  const m = metadata as FxLaneMetadata;
  return {
    fxChain: Array.isArray(m.fxChain) ? normalizeFxSlots(m.fxChain) : undefined,
    fxChainEnabled:
      typeof m.fxChainEnabled === "boolean" ? m.fxChainEnabled : undefined,
  };
}

/** Read chain from clip metadata; slot 0 falls back to fx_preset_id. */
export function fxSlotsFromMetadata(
  metadata: unknown,
  legacyPresetId?: string,
): FxSlotPresets {
  const parsed = parseFxLaneMetadata(metadata);
  if (parsed.fxChain) return parsed.fxChain;
  const slots = emptyFxSlots();
  if (legacyPresetId) {
    slots[0] = LEGACY_REVERB_TO_STOCK[legacyPresetId] ?? legacyPresetId;
  }
  return slots;
}

export function fxChainEnabledFromMetadata(
  metadata: unknown,
): boolean | undefined {
  return parseFxLaneMetadata(metadata).fxChainEnabled;
}

export function mergeMetadataWithFxLane(
  metadataJson: string | null | undefined,
  patch: { slots?: FxSlotPresets; chainEnabled?: boolean },
): string {
  let meta: Record<string, unknown> = {};
  if (metadataJson) {
    try {
      const parsed = JSON.parse(metadataJson) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        meta = { ...(parsed as Record<string, unknown>) };
      }
    } catch {
      meta = {};
    }
  }
  if (patch.slots) meta.fxChain = patch.slots;
  if (patch.chainEnabled !== undefined) {
    meta.fxChainEnabled = patch.chainEnabled;
  }
  return JSON.stringify(meta);
}

/** @deprecated Use mergeMetadataWithFxLane */
export function mergeMetadataWithFxChain(
  metadataJson: string | null | undefined,
  slots: FxSlotPresets,
): string {
  return mergeMetadataWithFxLane(metadataJson, { slots });
}

export function getFxSlotsFromLaneState(state: {
  fxSlots?: FxSlotPresets;
  fxPresetId?: string;
  fxChainEnabled?: boolean;
}): FxSlotPresets {
  if (state.fxSlots?.length === FX_SLOT_COUNT) return [...state.fxSlots];
  return fxSlotsFromMetadata(null, state.fxPresetId);
}

export function isFxChainEnabled(state: { fxChainEnabled?: boolean }): boolean {
  return state.fxChainEnabled !== false;
}

export function setFxSlotAt(
  slots: FxSlotPresets,
  slotIndex: number,
  effectId: string | null,
): FxSlotPresets {
  const next = [...slots];
  if (slotIndex >= 0 && slotIndex < FX_SLOT_COUNT) {
    next[slotIndex] = effectId;
  }
  return next;
}

export function firstEmptyFxSlotIndex(slots: FxSlotPresets): number {
  const idx = slots.findIndex((s) => !s);
  return idx >= 0 ? idx : FX_SLOT_COUNT - 1;
}

/** Filter stock catalog for node-chain plugin search (case-insensitive). */
export function filterStockFxPlugins(query: string): StockFxPlugin[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...STOCK_FX_PLUGINS];
  return STOCK_FX_PLUGINS.filter(
    (p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
  );
}
