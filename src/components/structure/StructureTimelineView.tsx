/**
 * Structure tab timeline — StructureTimelineEditor for all project types.
 * Location: src/components/structure/StructureTimelineView.tsx
 */

import { StructureTimelineEditor } from "./timeline/StructureTimelineEditor";
import type { BeatCardData } from "../timeline/BeatCard";
import type { TimelineData } from "./DropdownView";
import type { BookTimelineData } from "../book/BookDropdownView";

export interface StructureTimelineViewProps {
  projectId: string;
  projectType?: string;
  initialData?: TimelineData | BookTimelineData | null;
  onDataChange?: (data: TimelineData | BookTimelineData) => void;
  duration?: number;
  beats?: BeatCardData[];
  totalWords?: number;
  wordsPerPage?: number;
  targetPages?: number;
  readingSpeedWpm?: number;
  onOpenShotInStructureTree?: (shotId: string) => void;
  onProjectDurationSecondsHint?: (minSeconds: number) => void;
}

export function StructureTimelineView(props: StructureTimelineViewProps) {
  return <StructureTimelineEditor {...props} />;
}
