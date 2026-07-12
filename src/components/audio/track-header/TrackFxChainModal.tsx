/**
 * TrackFxChainModal — NODE CHAIN editor (TheStuu-style layout).
 */

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import type { LaneState } from "../../../lib/audio-lane";
import {
  getFxSlotsFromLaneState,
  isFxChainEnabled,
} from "../../../lib/fx-chain";
import { NodeChainSlotRow } from "./node-chain/NodeChainSlotRow";
import { NodeChainPluginPanel } from "./node-chain/NodeChainPluginPanel";

export interface TrackFxChainModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  laneLabel: string;
  laneIndex: number;
  state: LaneState;
  onFxSlotChange: (
    laneIndex: number,
    slotIndex: number,
    effectId: string | null,
  ) => void;
}

export function TrackFxChainModal({
  open,
  onOpenChange,
  laneLabel,
  laneIndex,
  state,
  onFxSlotChange,
}: TrackFxChainModalProps) {
  const slots = getFxSlotsFromLaneState(state);
  const chainOn = isFxChainEnabled(state);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [pluginQuery, setPluginQuery] = useState("");

  useEffect(() => {
    if (!open) {
      setActiveSlot(null);
      setPluginQuery("");
    }
  }, [open]);

  const handleSelect = (effectId: string) => {
    if (activeSlot === null) return;
    onFxSlotChange(laneIndex, activeSlot, effectId);
  };

  const handleClear = () => {
    if (activeSlot === null) return;
    onFxSlotChange(laneIndex, activeSlot, null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden border-border !bg-card p-0 shadow-2xl sm:max-w-[min(920px,calc(100%-2rem))]">
        <DialogHeader className="shrink-0 border-b border-border bg-card px-6 py-4 text-left">
          <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-card-foreground">
            {laneLabel.toUpperCase()} · NODE CHAIN
          </DialogTitle>
          <DialogDescription className="sr-only">
            Effektkette bearbeiten, Signalfluss links nach rechts
          </DialogDescription>
        </DialogHeader>

        <NodeChainSlotRow
          slots={slots}
          activeSlot={activeSlot}
          disabled={!chainOn}
          onSlotActivate={(index) => {
            setActiveSlot(index);
            setPluginQuery("");
          }}
        />

        {activeSlot !== null ? (
          <NodeChainPluginPanel
            slotIndex={activeSlot}
            query={pluginQuery}
            filled={Boolean(slots[activeSlot])}
            onQueryChange={setPluginQuery}
            onSelect={handleSelect}
            onClear={handleClear}
          />
        ) : null}

        <p className="shrink-0 border-t border-border bg-card px-6 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Leeren Slot klicken, um ein Plugin hinzuzufügen. Audio-Verarbeitung
          folgt in einer späteren Version.
        </p>
      </DialogContent>
    </Dialog>
  );
}
