/**
 * NodeChainPluginPanel — slot plugin picker footer (search + scrollable list).
 */

import { FxEffectPicker } from "../FxEffectPicker";

export interface NodeChainPluginPanelProps {
  slotIndex: number;
  query: string;
  filled: boolean;
  onQueryChange: (query: string) => void;
  onSelect: (effectId: string) => void;
  onClear: () => void;
}

export function NodeChainPluginPanel({
  slotIndex,
  query,
  filled,
  onQueryChange,
  onSelect,
  onClear,
}: NodeChainPluginPanelProps) {
  return (
    <section
      className="flex max-h-[280px] min-h-0 shrink-0 flex-col overflow-hidden border-t border-border bg-muted px-6 py-4"
      aria-label={`Plugin-Auswahl Slot ${slotIndex + 1}`}
    >
      <h3 className="mb-3 shrink-0 font-mono text-[10px] uppercase tracking-widest text-foreground">
        Slot {slotIndex + 1}: Plugin auswählen
      </h3>
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Scanne Effekt-Plugins…"
        className="mb-3 h-9 w-full shrink-0 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/40"
        aria-label="Effekt-Plugins durchsuchen"
      />
      <FxEffectPicker
        filterQuery={query}
        showClear={filled}
        onClear={onClear}
        onSelect={onSelect}
        className="min-h-0 flex-1 overflow-y-auto rounded-md border border-border bg-card"
      />
    </section>
  );
}
