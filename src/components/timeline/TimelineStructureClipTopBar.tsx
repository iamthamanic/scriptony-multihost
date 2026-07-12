/**
 * Scene/shot clip overlay: centered title (+ optional photo slot), link chip top-right.
 * Location: src/components/timeline/TimelineStructureClipTopBar.tsx
 */

import { Camera, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SCENE_AUDIO_LINK_CHIP_CLASS,
  SHOT_AUDIO_LINK_CHIP_CLASS,
  showSceneAudioLinkClipLabel,
} from "@/lib/scene-audio-lane-link";
import { TimelineStructureAudioLinkChip } from "./TimelineStructureAudioLinkChip";
import type { SceneAudioLinkLabel } from "@/lib/scene-audio-lane-link";
import type { TimelineStructureAudioLinkVariant } from "./TimelineStructureAudioLinkChip";

const TITLE_PILL_CLASS: Record<TimelineStructureAudioLinkVariant, string> = {
  scene: cn(SCENE_AUDIO_LINK_CHIP_CLASS, "scene-audio-title-pill"),
  shot: cn(SHOT_AUDIO_LINK_CHIP_CLASS, "shot-audio-title-pill"),
};

const LINK_INSET_STYLE = {
  top: "0.25rem",
  right: "max(0.375rem, calc(var(--trim-cap, 0px) + 0.125rem))",
} as const;

export interface TimelineStructureClipTopBarProps {
  title: string;
  variant: TimelineStructureAudioLinkVariant;
  clipWidthPx: number;
  /** Scene has thumbnail — title pill alone, geometric center. */
  hasSceneImage?: boolean;
  /** Opaque title pill for readability on thumbnails. */
  imageBackdrop?: boolean;
  audioLink?: SceneAudioLinkLabel;
  /** Empty scene: small upload target beside centered title pill. */
  showPhotoPlaceholder?: boolean;
  onPhotoPlaceholderClick?: () => void;
  onEditTitle: () => void;
  onEditAudioLink?: () => void;
}

export function TimelineStructureClipTopBar({
  title,
  variant,
  clipWidthPx,
  hasSceneImage = false,
  imageBackdrop = false,
  audioLink,
  showPhotoPlaceholder = false,
  onPhotoPlaceholderClick,
  onEditTitle,
  onEditAudioLink,
}: TimelineStructureClipTopBarProps) {
  const useOpaqueTitlePill = imageBackdrop;
  const hasLink = Boolean(audioLink && onEditAudioLink);
  const showPhoto = showPhotoPlaceholder && Boolean(onPhotoPlaceholderClick);
  const centerTitleWithPhoto = showPhoto && !hasSceneImage;
  const showLinkLabel = showSceneAudioLinkClipLabel(clipWidthPx);

  const titleButton = (
    <button
      type="button"
      className={cn(
        "pointer-events-auto inline-flex items-center gap-0.5 min-w-0 max-w-[7rem] shrink rounded px-1 py-px",
        useOpaqueTitlePill
          ? TITLE_PILL_CLASS[variant]
          : cn(
              variant === "scene"
                ? "text-pink-950 dark:text-pink-100"
                : "text-yellow-950 dark:text-yellow-100",
              "hover:bg-black/10 dark:hover:bg-white/10",
            ),
      )}
      title={`${title} bearbeiten`}
      onClick={(e) => {
        e.stopPropagation();
        onEditTitle();
      }}
    >
      <span className="truncate text-[8px] font-medium leading-tight text-inherit">
        {title}
      </span>
      <Pencil className="size-2 shrink-0 opacity-90 text-inherit" aria-hidden />
    </button>
  );

  const photoButton =
    showPhoto && onPhotoPlaceholderClick ? (
      <button
        type="button"
        className="scene-audio-photo-placeholder pointer-events-auto shrink-0"
        aria-label="Szenenbild hochladen"
        title="Szenenbild hochladen"
        onClick={(e) => {
          e.stopPropagation();
          onPhotoPlaceholderClick();
        }}
      >
        <Camera className="size-2.5 opacity-80" aria-hidden />
      </button>
    ) : null;

  const linkChip =
    hasLink && audioLink && onEditAudioLink ? (
      <TimelineStructureAudioLinkChip
        shortLabel={audioLink.short}
        fullLabel={audioLink.full}
        variant={variant}
        size="clip"
        iconOnly={!showLinkLabel}
        className="pointer-events-auto shrink-0"
        onClick={onEditAudioLink}
      />
    ) : null;

  return (
    <>
      {centerTitleWithPhoto ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center min-w-0">
          <div className="pointer-events-auto flex items-center gap-1 min-w-0">
            {titleButton}
            {photoButton}
          </div>
        </div>
      ) : (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 min-w-0">
          {titleButton}
        </div>
      )}

      {linkChip ? (
        <div
          className="pointer-events-none absolute z-30"
          style={LINK_INSET_STYLE}
        >
          {linkChip}
        </div>
      ) : null}
    </>
  );
}
