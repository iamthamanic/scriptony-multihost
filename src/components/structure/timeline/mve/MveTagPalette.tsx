/**
 * MVE Tag Palette — compact draggable tag chips for drag-and-drop insertion
 * into the inline text editor (T27).
 *
 * Location: src/components/structure/timeline/mve/MveTagPalette.tsx
 */

import { MVE_TAGS, formatMveTag, type MveTag } from "../../../../lib/mve/tags";

export interface MveTagPaletteProps {
  disabled?: boolean;
}

export function MveTagPalette({ disabled }: MveTagPaletteProps) {
  const handleDragStart = (e: React.DragEvent, tag: MveTag) => {
    e.dataTransfer.setData("text/plain", formatMveTag(tag));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="flex flex-wrap gap-1" data-testid="mve-tag-palette">
      {MVE_TAGS.map((tag) => (
        <span
          key={tag}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, tag)}
          className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary cursor-grab active:cursor-grabbing"
          aria-label={`Tag ${formatMveTag(tag)} ziehen`}
        >
          {formatMveTag(tag)}
        </span>
      ))}
    </div>
  );
}
