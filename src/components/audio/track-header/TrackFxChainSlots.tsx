/**
 * TrackFxChainSlots — compact lane slot row with popover picker.
 */

import { ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  type FxSlotPresets,
  getStockFxPlugin,
  getStockFxSlotLabel,
  isFxChainEnabled,
} from "../../../lib/fx-chain";
import type { LaneState } from "../../../lib/audio-lane";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { FxEffectPicker } from "./FxEffectPicker";
import { fxChainSlotButtonClass } from "./fx-chain-rail-styles";

export interface TrackFxChainSlotsProps {
  laneIndex: number;
  state: LaneState;
  slots: FxSlotPresets;
  disabled?: boolean;
  onFxSlotChange: (
    laneIndex: number,
    slotIndex: number,
    effectId: string | null,
  ) => void;
}

export function TrackFxChainSlots({
  laneIndex,
  state,
  slots,
  disabled,
  onFxSlotChange,
}: TrackFxChainSlotsProps) {
  const chainDisabled = disabled || !isFxChainEnabled(state);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center",
        chainDisabled && "opacity-45 pointer-events-none",
      )}
    >
      {slots.flatMap((effectId, slotIndex) => {
        const filled = Boolean(effectId);
        const label = filled
          ? getStockFxSlotLabel(effectId)
          : String(slotIndex + 1);
        const plugin = getStockFxPlugin(effectId);
        const cell = (
          <span key={`fx-slot-${slotIndex}`} className="min-w-0 flex-1">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  title={
                    plugin
                      ? `${slotIndex + 1}: ${plugin.name}`
                      : `Slot ${slotIndex + 1}: Effekt hinzufügen`
                  }
                  className={fxChainSlotButtonClass(filled)}
                  aria-label={`FX Slot ${slotIndex + 1}`}
                >
                  <span className="block max-w-full truncate">{label}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-48 p-0" side="bottom">
                <FxEffectPicker
                  showClear={filled}
                  onClear={
                    filled
                      ? () => onFxSlotChange(laneIndex, slotIndex, null)
                      : undefined
                  }
                  onSelect={(id) => onFxSlotChange(laneIndex, slotIndex, id)}
                />
              </PopoverContent>
            </Popover>
          </span>
        );
        if (slotIndex === 0) return [cell];
        return [
          <span
            key={`fx-chevron-${slotIndex}`}
            className="flex h-7 w-3 shrink-0 items-center justify-center"
            aria-hidden
          >
            <ChevronRight className="size-2.5 text-muted-foreground/60" />
          </span>,
          cell,
        ];
      })}
    </div>
  );
}
