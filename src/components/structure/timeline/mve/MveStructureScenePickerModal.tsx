/**
 * MVE Structure Scene Picker Modal — shared Act/Sequence/Scene tree picker
 * for lane links, text-block placement, and audio derivation (T30/T28).
 *
 * Location: src/components/structure/timeline/mve/MveStructureScenePickerModal.tsx
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
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

export interface MveStructurePickerRefs {
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
}

export interface MveStructureScenePickerModalProps extends MveStructurePickerRefs {
  open: boolean;
  title: string;
  description?: string;
  selectedSceneId: string | null;
  confirmLabel?: string;
  onConfirm: (sceneId: string) => void;
  onCancel: () => void;
  isBusy?: boolean;
  footerStart?: ReactNode;
  testId?: string;
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
          {act.sequences.length === 0 ? (
            <p className="text-[10px] text-muted-foreground px-2 py-1">
              Noch keine Sequenzen — zuerst in der Struktur-Timeline anlegen.
            </p>
          ) : (
            act.sequences.map((seq) => (
              <div key={seq.id} className="pl-2">
                <p className="text-[10px] font-medium text-muted-foreground px-1 py-0.5">
                  {seq.label}
                </p>
                {seq.scenes.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground px-2 py-0.5">
                    Noch keine Szene in dieser Sequenz.
                  </p>
                ) : (
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
                        data-testid={`mve-structure-scene-${scene.id}`}
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
                )}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function MveStructureScenePickerModal({
  open,
  title,
  description,
  acts,
  sequences,
  scenes,
  selectedSceneId,
  confirmLabel = "Bestätigen",
  onConfirm,
  onCancel,
  isBusy,
  footerStart,
  testId = "mve-structure-scene-picker-modal",
}: MveStructureScenePickerModalProps) {
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

  const firstSceneId = useMemo(() => {
    for (const act of tree) {
      for (const seq of act.sequences) {
        if (seq.scenes[0]) return seq.scenes[0].id;
      }
    }
    return null;
  }, [tree]);

  useEffect(() => {
    if (open && !localSceneId && firstSceneId) {
      setLocalSceneId(firstSceneId);
    }
  }, [open, localSceneId, firstSceneId]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent data-testid={testId}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
        <div className="max-h-72 overflow-y-auto space-y-2 py-1">
          {tree.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Struktur vorhanden — zuerst Akt, Sequenz und Szene anlegen.
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
          {footerStart}
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
            data-testid="mve-structure-scene-picker-confirm"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
