/**
 * TrackFxChain — compact rail: slots + chevron (modal) + FX on/off (mockup / TheStuu).
 */

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import {
  getFxSlotsFromLaneState,
  isFxChainEnabled,
} from "../../../lib/fx-chain";
import type { LaneState } from "../../../lib/audio-lane";
import { getTimelineLaneLabel } from "../../../lib/audio-lane";
import {
  FX_CHAIN_ACTIONS_ROW,
  FX_CHAIN_OPEN_EDITOR_BTN,
  FX_CHAIN_RAIL_BASE,
  fxChainRailFrameClass,
  fxChainToggleButtonClass,
} from "./fx-chain-rail-styles";
import { TrackFxChainSlots } from "./TrackFxChainSlots";
import { TrackFxChainModal } from "./TrackFxChainModal";

export interface TrackFxChainProps {
  laneIndex: number;
  state: LaneState;
  onFxSlotChange: (
    laneIndex: number,
    slotIndex: number,
    effectId: string | null,
  ) => void;
  onFxChainEnabledChange: (laneIndex: number, enabled: boolean) => void;
}

export function TrackFxChain({
  laneIndex,
  state,
  onFxSlotChange,
  onFxChainEnabledChange,
}: TrackFxChainProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const slots = getFxSlotsFromLaneState(state);
  const chainOn = isFxChainEnabled(state);
  const label = getTimelineLaneLabel(laneIndex);

  return (
    <>
      <div
        className={cn(FX_CHAIN_RAIL_BASE, fxChainRailFrameClass(chainOn))}
        role="group"
        aria-label="FX-Kette"
      >
        <TrackFxChainSlots
          laneIndex={laneIndex}
          state={state}
          slots={slots}
          onFxSlotChange={onFxSlotChange}
        />

        <div className={FX_CHAIN_ACTIONS_ROW}>
          <button
            type="button"
            className={FX_CHAIN_OPEN_EDITOR_BTN}
            title="FX-Kette im Editor öffnen"
            aria-label="FX-Kette öffnen"
            onClick={() => setModalOpen(true)}
          >
            <ChevronRight className="size-3" aria-hidden />
          </button>
          <button
            type="button"
            className={fxChainToggleButtonClass(chainOn)}
            title={chainOn ? "Effektkette aus (Leistung)" : "Effektkette ein"}
            aria-label={chainOn ? "Effektkette aus" : "Effektkette ein"}
            aria-pressed={chainOn}
            onClick={() => onFxChainEnabledChange(laneIndex, !chainOn)}
          >
            FX
          </button>
        </div>
      </div>

      <TrackFxChainModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        laneLabel={label}
        laneIndex={laneIndex}
        state={state}
        onFxSlotChange={onFxSlotChange}
      />
    </>
  );
}
