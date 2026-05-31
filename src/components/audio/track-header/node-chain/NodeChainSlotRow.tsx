/**
 * NodeChainSlotRow — horizontal node chain with signal-flow chevrons.
 */

import { ChevronRight } from "lucide-react";
import { cn } from "../../../../lib/utils";
import type { FxSlotPresets } from "../../../../lib/fx-chain";
import { NodeChainSlot } from "./NodeChainSlot";

export interface NodeChainSlotRowProps {
  slots: FxSlotPresets;
  activeSlot: number | null;
  disabled?: boolean;
  onSlotActivate: (slotIndex: number) => void;
}

export function NodeChainSlotRow({
  slots,
  activeSlot,
  disabled,
  onSlotActivate,
}: NodeChainSlotRowProps) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-x-auto bg-card px-6 py-8",
        disabled && "opacity-50 pointer-events-none",
      )}
    >
      <div
        className="mx-auto flex min-w-max items-start justify-center gap-2"
        role="list"
        aria-label="FX-Kette"
      >
        {slots.map((effectId, slotIndex) => (
          <div
            key={`node-slot-${slotIndex}`}
            className="flex items-start gap-2"
            role="listitem"
          >
            {slotIndex > 0 ? (
              <ChevronRight
                className="mt-10 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
            ) : null}
            <NodeChainSlot
              slotIndex={slotIndex}
              effectId={effectId}
              isActive={activeSlot === slotIndex}
              disabled={disabled}
              onActivate={onSlotActivate}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
