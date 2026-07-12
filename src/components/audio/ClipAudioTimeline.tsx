/**
 * Standalone clip-based audio timeline (outside Structure tab).
 * Location: src/components/audio/ClipAudioTimeline.tsx
 */

import { useState } from "react";
import { AudioDawTimelineToolbar } from "./AudioDawTimelineToolbar";
import { StructureTimelineAudioLanesStack } from "../structure/timeline/tracks/StructureTimelineAudioLanes";

export interface ClipAudioTimelineProps {
  projectId: string;
  projectType?: string;
}

export function ClipAudioTimeline({
  projectId,
  projectType,
}: ClipAudioTimelineProps) {
  const [pxPerSec, setPxPerSec] = useState(20);
  const durationSec = 300;

  return (
    <div className="flex flex-col h-full min-h-[24rem] bg-background border border-border rounded-lg overflow-hidden">
      <AudioDawTimelineToolbar
        pxPerSec={pxPerSec}
        onPxPerSecChange={setPxPerSec}
      />
      <StructureTimelineAudioLanesStack
        projectId={projectId}
        projectType={projectType}
        pxPerSec={pxPerSec}
        viewStartSec={0}
        totalWidthPx={durationSec * pxPerSec}
        currentTimeSec={0}
      />
    </div>
  );
}
