/**
 * FxEffectPicker — stock effect list (TheStuu plugin-picker style, v1 metadata).
 */

import { cn } from "../../../lib/utils";
import { filterStockFxPlugins } from "../../../lib/fx-chain";

export interface FxEffectPickerProps {
  onSelect: (effectId: string) => void;
  onClear?: () => void;
  showClear?: boolean;
  /** When set, filters the stock catalog (node-chain search). */
  filterQuery?: string;
  className?: string;
}

export function FxEffectPicker({
  onSelect,
  onClear,
  showClear,
  filterQuery = "",
  className,
}: FxEffectPickerProps) {
  const plugins = filterStockFxPlugins(filterQuery);

  return (
    <div
      className={cn(
        "flex max-h-[280px] flex-col overflow-y-auto py-1",
        className,
      )}
      role="menu"
    >
      {showClear && onClear ? (
        <button
          type="button"
          role="menuitem"
          className="px-3 py-1.5 text-left text-sm hover:bg-muted text-muted-foreground"
          onClick={onClear}
        >
          Slot leeren
        </button>
      ) : null}
      {plugins.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          Keine Plugins gefunden.
        </p>
      ) : null}
      {plugins.map((plugin) => (
        <button
          key={plugin.id}
          type="button"
          role="menuitem"
          className="px-3 py-1.5 text-left text-sm hover:bg-muted flex flex-col gap-0.5"
          onClick={() => onSelect(plugin.id)}
        >
          <span className="font-medium truncate">{plugin.name}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {plugin.type}
          </span>
        </button>
      ))}
    </div>
  );
}
