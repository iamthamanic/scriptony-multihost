/**
 * Color palette swatch editor for colorSystem section (T79).
 * Location: src/components/projects/styles/sections/shared/PaletteSwatchEditor.tsx
 */

import { Plus, X } from "lucide-react";
import { Input } from "../../../../ui/input";
import { Button } from "../../../../ui/button";
import { Label } from "../../../../ui/label";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

interface PaletteSwatchEditorProps {
  palette: string[];
  readOnly?: boolean;
  onChange: (palette: string[]) => void;
}

export function PaletteSwatchEditor({
  palette,
  readOnly,
  onChange,
}: PaletteSwatchEditorProps) {
  const updateAt = (index: number, hex: string) => {
    const next = [...palette];
    next[index] = hex;
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(palette.filter((_, i) => i !== index));
  };

  const addSwatch = () => {
    onChange([...palette, "#6E59A5"]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm">Palette</Label>
      <div className="flex flex-wrap gap-2">
        {palette.map((hex, index) => (
          <div key={`${hex}-${index}`} className="flex items-center gap-1">
            <div
              className="size-8 rounded-md border shrink-0"
              style={{
                backgroundColor: HEX_RE.test(hex) ? hex : "transparent",
              }}
              title={hex}
            />
            <Input
              className="w-24 h-8 font-mono text-xs"
              value={hex}
              disabled={readOnly}
              onChange={(e) => updateAt(index, e.target.value)}
            />
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Farbe entfernen"
                onClick={() => removeAt(index)}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-8"
            aria-label="Farbe hinzufügen"
            onClick={addSwatch}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
