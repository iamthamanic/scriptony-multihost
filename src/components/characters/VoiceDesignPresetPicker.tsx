/**
 * Compact searchable preset picker for Advanced voice design fields (next to label).
 * Location: src/components/characters/VoiceDesignPresetPicker.tsx
 */

import { useMemo, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/components/ui/utils";
import type { VoiceDesignPreset } from "@/lib/mve/casting/voice-design-field-presets";

export interface VoiceDesignPresetPickerProps {
  presets: VoiceDesignPreset[];
  value: string;
  disabled?: boolean;
  testId?: string;
  onSelect: (value: string) => void;
}

export function VoiceDesignPresetPicker({
  presets,
  value,
  disabled,
  testId,
  onSelect,
}: VoiceDesignPresetPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const matched = presets.find((p) => p.value === value.trim());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter(
      (p) =>
        p.label.toLowerCase().includes(q) || p.value.toLowerCase().includes(q),
    );
  }, [presets, query]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-6 shrink-0 gap-1 px-2 text-[10px] font-medium"
          aria-label="Preset auswählen"
          data-testid={testId}
        >
          <span className="max-w-[5.5rem] truncate">
            {matched?.label ?? "Preset"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-0"
        data-testid={testId ? `${testId}-content` : undefined}
      >
        <Command shouldFilter={false} label="Preset-Auswahl">
          <CommandInput
            placeholder="Volltextsuche…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>Kein Preset gefunden.</CommandEmpty>
            <CommandGroup>
              {filtered.map((preset) => (
                <CommandItem
                  key={preset.value}
                  value={preset.value}
                  onSelect={() => {
                    onSelect(preset.value);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5",
                      value === preset.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{preset.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
