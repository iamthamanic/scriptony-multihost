/**
 * MVE Scene Select Dialog — lets the user pick a scene when an audio action
 * (Generate / Upload / Record) is triggered for a text block without a linked
 * scene (T28).
 *
 * Location: src/components/structure/timeline/mve/MveSceneSelectDialog.tsx
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { cn } from "../../../../lib/utils";
import type { MveSceneOption } from "../../../../hooks/useMveTextBlockAudio";

export interface MveSceneSelectDialogProps {
  open: boolean;
  title: string;
  scenes: MveSceneOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MveSceneSelectDialog({
  open,
  title,
  scenes,
  selectedId,
  onSelect,
  onConfirm,
  onCancel,
}: MveSceneSelectDialogProps) {
  const selectedIndex = scenes.findIndex((s) => s.id === selectedId);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (scenes.length === 0) return;
    const move = (delta: number) => {
      e.preventDefault();
      const nextIndex = Math.min(
        Math.max(selectedIndex + delta, 0),
        scenes.length - 1,
      );
      if (nextIndex !== selectedIndex) {
        onSelect(scenes[nextIndex].id);
      }
    };
    switch (e.key) {
      case "ArrowDown":
        move(1);
        break;
      case "ArrowUp":
        move(-1);
        break;
      case "Home":
        move(-selectedIndex);
        break;
      case "End":
        move(scenes.length - 1 - selectedIndex);
        break;
      default:
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent data-testid="mve-scene-select-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div
          role="radiogroup"
          aria-label="Szene auswählen"
          className="py-2 max-h-60 overflow-y-auto space-y-1"
          onKeyDown={handleKeyDown}
        >
          {scenes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Szenen verfügbar.
            </p>
          ) : (
            scenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                role="radio"
                aria-checked={selectedId === scene.id}
                onClick={() => onSelect(scene.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded border text-sm transition-colors",
                  selectedId === scene.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted",
                )}
                data-testid={`mve-scene-option-${scene.id}`}
              >
                {scene.name}
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            type="button"
            disabled={!selectedId}
            onClick={onConfirm}
            data-testid="mve-scene-select-confirm"
          >
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
