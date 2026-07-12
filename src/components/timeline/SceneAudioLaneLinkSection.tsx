/**
 * Scene/Shot audio lane link UI inside TimelineNodeEditDialog.
 * Location: src/components/timeline/SceneAudioLaneLinkSection.tsx
 */

import { useEffect, useRef, useState } from "react";
import { Link2, Unlink } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";
import { SCENE_AUDIO_LINK_CHIP_CLASS } from "@/lib/scene-audio-lane-link";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  formatSceneAudioLinkBadge,
  getLinkForNode,
  linkableLaneOptions,
  type LinkableAudioLaneOption,
  type SceneAudioLaneLinkMap,
} from "@/lib/scene-audio-lane-link";
import type { Character } from "@/lib/types";

export interface SceneAudioLaneLinkSectionProps {
  nodeId: string;
  nodeTitle: string;
  links: SceneAudioLaneLinkMap;
  sortedLaneIndices: number[];
  getCharacterForLane: (laneIndex: number) => Character | undefined;
  getOccupantLabel?: (nodeId: string) => string;
  focusLinkSection?: boolean;
  onFocusHandled?: () => void;
  requestOpenLinkPicker?: boolean;
  onLinkPickerRequestHandled?: () => void;
  onLink: (
    option: LinkableAudioLaneOption,
    stealFromNodeId?: string,
  ) => Promise<void>;
  onUnlink: () => Promise<void>;
  isBusy?: boolean;
}

export function SceneAudioLaneLinkSection({
  nodeId,
  nodeTitle,
  links,
  sortedLaneIndices,
  getCharacterForLane,
  getOccupantLabel,
  focusLinkSection,
  onFocusHandled,
  requestOpenLinkPicker,
  onLinkPickerRequestHandled,
  onLink,
  onUnlink,
  isBusy,
}: SceneAudioLaneLinkSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingSteal, setPendingSteal] = useState<{
    option: LinkableAudioLaneOption;
    fromNodeId: string;
    fromLabel: string;
  } | null>(null);

  const options = linkableLaneOptions(sortedLaneIndices, getCharacterForLane);
  const currentLink = getLinkForNode(links, nodeId);
  const hasLinkableLanes = options.length > 0;

  useEffect(() => {
    if (!focusLinkSection) return;
    sectionRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
    onFocusHandled?.();
  }, [focusLinkSection, onFocusHandled]);

  useEffect(() => {
    if (!requestOpenLinkPicker || currentLink) return;
    if (!hasLinkableLanes) return;
    setPickerOpen(true);
    onLinkPickerRequestHandled?.();
  }, [
    requestOpenLinkPicker,
    currentLink,
    hasLinkableLanes,
    onLinkPickerRequestHandled,
  ]);

  const handlePick = async (option: LinkableAudioLaneOption) => {
    const occupantId = Object.entries(links).find(
      ([id, link]) => id !== nodeId && link.laneIndex === option.laneIndex,
    );
    if (occupantId) {
      const [fromNodeId] = occupantId;
      setPendingSteal({
        option,
        fromNodeId,
        fromLabel: getOccupantLabel?.(fromNodeId) ?? fromNodeId,
      });
      setPickerOpen(false);
      return;
    }
    await onLink(option);
    setPickerOpen(false);
  };

  const badgeLabel = currentLink
    ? formatSceneAudioLinkBadge(
        currentLink.laneIndex,
        currentLink.characterId
          ? getCharacterForLane(currentLink.laneIndex)?.name
          : undefined,
      )
    : null;

  return (
    <div
      ref={sectionRef}
      className={cn(
        "space-y-2 rounded-md border border-border/80 bg-muted/20 p-3",
        focusLinkSection && "ring-2 ring-primary/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground">Audio-Spur</span>
        {badgeLabel ? (
          <span
            className={cn(
              "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium",
              SCENE_AUDIO_LINK_CHIP_CLASS,
            )}
          >
            {badgeLabel}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">
            Nicht verlinkt
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {currentLink ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            disabled={isBusy}
            onClick={() => void onUnlink()}
          >
            <Unlink className="size-3.5" />
            Unlink
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            disabled={isBusy || !hasLinkableLanes}
            title={
              hasLinkableLanes
                ? "Audio-Spur mit dieser Szene verlinken"
                : "Zuerst Spur über Add Item anlegen"
            }
            onClick={() => setPickerOpen(true)}
          >
            <Link2 className="size-3.5" />
            Link
          </Button>
        )}
      </div>

      {!hasLinkableLanes && !currentLink ? (
        <p className="text-[10px] text-muted-foreground">
          Zuerst eine Dialog- oder SFX-Spur über Add Item anlegen.
        </p>
      ) : null}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Audio-Spur verlinken</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Wähle eine Spur für „{nodeTitle}“. Pro Szene nur eine Verlinkung.
          </p>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {options.map((option) => (
              <Button
                key={`${option.kind}-${option.laneIndex}`}
                type="button"
                variant="ghost"
                className="justify-start h-9 text-xs"
                onClick={() => void handlePick(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pendingSteal !== null}
        onOpenChange={(open) => {
          if (!open) setPendingSteal(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Spur umhängen?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {pendingSteal
              ? `Diese Spur ist mit „${pendingSteal.fromLabel}“ verlinkt. Für „${nodeTitle}“ umhängen?`
              : null}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingSteal(null)}
            >
              Abbrechen
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!pendingSteal) return;
                void onLink(pendingSteal.option, pendingSteal.fromNodeId).then(
                  () => setPendingSteal(null),
                );
              }}
            >
              Umhängen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
