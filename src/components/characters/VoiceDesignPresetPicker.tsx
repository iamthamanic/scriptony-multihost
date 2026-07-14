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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const [hoveredValue, setHoveredValue] = useState<string | null>(null);

  const matched = presets.find((p) => p.value === value.trim());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.value.toLowerCase().includes(q) ||
        p.hint.toLowerCase().includes(q),
    );
  }, [presets, query]);

  const previewPreset =
    presets.find((p) => p.value === hoveredValue) ??
    presets.find((p) => p.value === value.trim()) ??
    filtered[0] ??
    null;

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled}
      className="h-6 shrink-0 gap-1 px-2 text-[10px] font-medium hover:bg-muted/80"
      aria-label="Preset auswählen"
      data-testid={testId}
    >
      <span className="max-w-[5.5rem] truncate">
        {matched?.label ?? "Preset"}
      </span>
      <ChevronDown className="h-3 w-3 opacity-60" />
    </Button>
  );

  return (
    <Popover
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setHoveredValue(null);
        }
      }}
    >
      {matched?.hint ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs text-left">
            {matched.hint}
          </TooltipContent>
        </Tooltip>
      ) : (
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      )}

      <PopoverContent
        align="end"
        className="w-[min(20rem,calc(100vw-2rem))] p-0"
        data-testid={testId ? `${testId}-content` : undefined}
      >
        <TooltipProvider delayDuration={250}>
          <Command shouldFilter={false} label="Preset-Auswahl">
            <CommandInput
              placeholder="Volltextsuche…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-52">
              <CommandEmpty>Kein Preset gefunden.</CommandEmpty>
              <CommandGroup>
                {filtered.map((preset) => {
                  const isActive = value === preset.value;
                  return (
                    <Tooltip key={preset.value}>
                      <TooltipTrigger asChild>
                        <CommandItem
                          value={`${preset.label} ${preset.value} ${preset.hint}`}
                          className={cn(
                            "cursor-pointer items-start gap-2 py-2 text-xs transition-colors",
                            "hover:bg-muted hover:text-foreground",
                            "data-[selected=true]:bg-muted data-[selected=true]:text-foreground",
                            "dark:hover:bg-muted/80 dark:data-[selected=true]:bg-muted/80",
                            isActive &&
                              "bg-primary/10 font-medium text-foreground",
                          )}
                          onMouseEnter={() => setHoveredValue(preset.value)}
                          onFocus={() => setHoveredValue(preset.value)}
                          onSelect={() => {
                            onSelect(preset.value);
                            setOpen(false);
                            setQuery("");
                            setHoveredValue(null);
                          }}
                        >
                          <Check
                            className={cn(
                              "mt-0.5 h-3.5 w-3.5 shrink-0 text-primary",
                              isActive ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium leading-tight">
                              {preset.label}
                            </span>
                            <span className="mt-0.5 block line-clamp-2 text-[10px] font-normal leading-snug text-muted-foreground">
                              {preset.hint}
                            </span>
                          </span>
                        </CommandItem>
                      </TooltipTrigger>
                      <TooltipContent
                        side="left"
                        className="max-w-[16rem] text-left leading-snug"
                      >
                        {preset.hint}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </CommandGroup>
            </CommandList>
            {previewPreset ? (
              <div
                className="border-t border-border bg-muted/25 px-3 py-2 text-[10px] leading-snug text-muted-foreground"
                data-testid={testId ? `${testId}-preview` : undefined}
              >
                <span className="font-semibold text-foreground">
                  {previewPreset.label}:
                </span>{" "}
                {previewPreset.hint}
              </div>
            ) : null}
          </Command>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}
