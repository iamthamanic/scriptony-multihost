/**
 * AudioTimeline — FL-Studio-like Multi-Lane Audio-Arrange-View.
 * Zeigt alle Audio-Tracks des Projekts auf übereinanderliegenden Lanes.
 * Shell: delegiert an Clip- oder Legacy-Timeline je nach Feature-Flag.
 */

import { isAudioClipSystemEnabled } from "../../lib/feature-flags";
import { ClipAudioTimeline } from "./ClipAudioTimeline";
import { LegacyAudioTimeline } from "./LegacyAudioTimeline";

export interface AudioTimelineProps {
  projectId: string;
  projectType?: string;
}

export function AudioTimeline({ projectId, projectType }: AudioTimelineProps) {
  const useNewSystem = isAudioClipSystemEnabled(projectType);

  if (useNewSystem) {
    return (
      <ClipAudioTimeline projectId={projectId} projectType={projectType} />
    );
  }

  return (
    <LegacyAudioTimeline projectId={projectId} projectType={projectType} />
  );
}

export default AudioTimeline;
