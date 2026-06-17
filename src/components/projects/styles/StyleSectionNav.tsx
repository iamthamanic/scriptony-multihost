/**
 * Left navigation for 18 style sections (scroll-spy).
 * Location: src/components/projects/styles/StyleSectionNav.tsx
 */

import { cn } from "@/lib/utils";
import { STYLE_SECTION_REGISTRY } from "@/lib/api/style-profile-api";
import type { VisualSpecSectionKey } from "@/lib/types/style-profile";

interface StyleSectionNavProps {
  activeKey: VisualSpecSectionKey;
  onSelect: (key: VisualSpecSectionKey) => void;
  className?: string;
}

export function StyleSectionNav({
  activeKey,
  onSelect,
  className,
}: StyleSectionNavProps) {
  return (
    <nav
      className={cn("flex flex-col gap-0.5 text-sm", className)}
      aria-label="Style-Sektionen"
    >
      {STYLE_SECTION_REGISTRY.map((section) => (
        <button
          key={section.key}
          type="button"
          onClick={() => onSelect(section.key)}
          className={cn(
            "text-left px-3 py-2 rounded-md transition-colors",
            activeKey === section.key
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-foreground",
          )}
        >
          <span className="text-xs opacity-70 mr-1">{section.number}.</span>
          {section.titleDe}
        </button>
      ))}
    </nav>
  );
}
