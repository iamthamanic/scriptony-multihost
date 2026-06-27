/**
 * MVE Lane Link Modal — hierarchical Act/Sequence/Scene picker for default
 * text-block placement per character lane (T30).
 *
 * Location: src/components/structure/timeline/mve/MveLaneLinkModal.tsx
 */

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import { cn } from "../../../../lib/utils";
import type { Act, Scene, Sequence } from "../../../../lib/types";
import {
  buildStructurePickerTree,
  type StructurePickerActNode,
} from "../../../../lib/mve/structure-picker-tree";

export interface MveLaneLinkModalProps {
  open: boolean;
  characterName: string;
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  selectedSceneId: string | null;
  onConfirm: (sceneId: string) => void;
  onRemove?: () => void;
  onCancel: () => void;
  isBusy?: boolean;
}

function TreeActSection({
  act,
  selectedSceneId,
  onSelectScene,
}: {
  act: StructurePickerActNode;
  selectedSceneId: string | null;
  onSelectScene: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  if (act.sequences.every((s) => s.scenes.length === 0)) return null;

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center gap-1 px-2 py-1.5 text-left text-xs font-medium bg-muted/40 hover:bg-muted/70"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="size-3 shrink-0" aria-hidden />
        ) : (
          <ChevronRight className="size-3 shrink-0" aria-hidden />
        )}
        {act.label}
      </button>
      {expanded ? (
        <div className="px-1 py-1 space-y-1">
          {act.sequences.map((seq) =>
            seq.scenes.length === 0 ? null : (
              <div key={seq.id} className="pl-2">
                <p className="text-[10px] font-medium text-muted-foreground px-1 py-0.5">
                  {seq.label}
                </p>
                <div
                  role="radiogroup"
                  aria-label={seq.label}
                  className="space-y-0.5"
                >
                  {seq.scenes.map((scene) => (
                    <button
                      key={scene.id}
                      type="button"
                      role="radio"
                      aria-checked={selectedSceneId === scene.id}
                      data-testid={`mve-lane-link-scene-${scene.id}`}
                      onClick={() => onSelectScene(scene.id)}
                      className={cn(
                        "w-full text-left px-2 py-1 rounded text-xs transition-colors",
                        selectedSceneId === scene.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      {scene.label}
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      ) : null}
    </div>
  );
}

export function MveLaneLinkModal({
  open,
  characterName,
  acts,
  sequences,
  scenes,
  selectedSceneId,
  onConfirm,
  onRemove,
  onCancel,
  isBusy,
}: MveLaneLinkModalProps) {
  const [localSceneId, setLocalSceneId] = useState<string | null>(
    selectedSceneId,
  );

  useEffect(() => {
    if (open) setLocalSceneId(selectedSceneId);
  }, [open, selectedSceneId]);

  const tree = useMemo(
    () => buildStructurePickerTree(acts, sequences, scenes),
    [acts, sequences, scenes],
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent data-testid="mve-lane-link-modal">
        <DialogHeader>
          <DialogTitle>Szene verknüpfen — {characterName}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Neue Text-Blöcke dieser Spur werden standardmäßig in der gewählten
          Szene angelegt.
        </p>
        <div className="max-h-72 overflow-y-auto space-y-2 py-1">
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Szenen in der Struktur vorhanden.
            </p>
          ) : (
            tree.map((act) => (
              <TreeActSection
                key={act.id}
                act={act}
                selectedSceneId={localSceneId}
                onSelectScene={setLocalSceneId}
              />
            ))
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          {onRemove && selectedSceneId ? (
            <Button
              type="button"
              variant="outline"
              disabled={isBusy}
              onClick={onRemove}
              data-testid="mve-lane-link-remove"
            >
              Verknüpfung entfernen
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            disabled={isBusy}
            onClick={onCancel}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            disabled={!localSceneId || isBusy}
            onClick={() => localSceneId && onConfirm(localSceneId)}
            data-testid="mve-lane-link-confirm"
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
