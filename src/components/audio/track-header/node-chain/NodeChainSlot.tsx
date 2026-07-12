/**
 * NodeChainSlot — single FX node card (TheStuu NODE CHAIN mockup).
 */

import { cn } from "../../../../lib/utils";
import { getStockFxPlugin } from "../../../../lib/fx-chain";

export interface NodeChainSlotProps {
  slotIndex: number;
  effectId: string | null;
  isActive: boolean;
  disabled?: boolean;
  onActivate: (slotIndex: number) => void;
}

export function NodeChainSlot({
  slotIndex,
  effectId,
  isActive,
  disabled,
  onActivate,
}: NodeChainSlotProps) {
  const plugin = getStockFxPlugin(effectId);
  const filled = Boolean(effectId);

  return (
    <div className="flex min-w-[5.25rem] shrink-0 flex-col items-center gap-2">
      <span className="text-lg font-light leading-none text-foreground tabular-nums">
        {slotIndex + 1}
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onActivate(slotIndex)}
        className={cn(
          "flex h-28 w-full items-center justify-center rounded-lg border border-dashed px-2",
          "bg-muted text-[11px] font-medium text-muted-foreground transition-all",
          "hover:border-border hover:bg-accent/40",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "disabled:pointer-events-none disabled:opacity-45",
          filled && "border-green-500/60 bg-green-500/10 text-foreground",
          isActive && "border-2 border-primary border-solid bg-background",
        )}
        aria-label={`FX Slot ${slotIndex + 1}`}
        aria-pressed={isActive}
      >
        <span className="line-clamp-3 text-center leading-snug">
          {filled ? (plugin?.name ?? effectId) : "add Effect"}
        </span>
      </button>

      <div className="text-center leading-tight">
        <div className="text-[11px] text-foreground">Slot {slotIndex + 1}</div>
        <div className="text-[9px] text-muted-foreground">
          Klick zum Hinzufügen
        </div>
      </div>
    </div>
  );
}
