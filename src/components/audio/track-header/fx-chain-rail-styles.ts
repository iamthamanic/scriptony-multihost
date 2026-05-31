/**
 * fx-chain-rail-styles — shared Tailwind for compact FX rail (index.css-safe tokens).
 */

import { cn } from "../../../lib/utils";

/** Outer rail: padding keeps slots + FX controls off the border. */
export const FX_CHAIN_RAIL_BASE =
  "flex min-w-0 w-full max-w-full shrink-0 items-center gap-1 overflow-hidden rounded border p-1.5 transition-colors";

export function fxChainRailFrameClass(chainOn: boolean): string {
  return chainOn
    ? "border-green-500 bg-green-500/10 dark:bg-green-950/20"
    : "border-red-500 bg-red-500/10 dark:border-red-500 dark:bg-red-950/20";
}

export const FX_CHAIN_ACTIONS_ROW = "flex shrink-0 flex-row items-center gap-1";

/** Open NODE CHAIN editor — neutral secondary (not nav primary). */
export const FX_CHAIN_OPEN_EDITOR_BTN =
  "flex h-7 w-5 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

const FX_CHAIN_TOGGLE_BASE =
  "h-7 min-w-[1.35rem] rounded border px-1.5 text-[9px] font-bold leading-none transition-colors";

export function fxChainToggleButtonClass(chainOn: boolean): string {
  return cn(
    FX_CHAIN_TOGGLE_BASE,
    chainOn
      ? "border-green-500 bg-green-500/10 text-green-400 dark:text-green-400"
      : "border-red-500 bg-red-500/10 text-red-400 dark:border-red-500",
  );
}

const FX_CHAIN_SLOT_BTN_BASE =
  "h-7 w-full min-w-0 rounded border px-0 text-[9px] font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export function fxChainSlotButtonClass(filled: boolean): string {
  return cn(
    FX_CHAIN_SLOT_BTN_BASE,
    filled
      ? "border-green-500 bg-green-500/10 text-green-400 dark:text-green-400"
      : "border-border/80 bg-muted/40 text-muted-foreground hover:border-green-500",
  );
}
