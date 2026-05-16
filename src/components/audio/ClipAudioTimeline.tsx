/**
 * Clip-basierte Audio-Timeline (T29/T30): Multi-Lane, Ripple-Trim, Zoom.
 */

import { useState, useMemo, useCallback } from "react";
import { useQueries } from "@tanstack/react-query";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useAudioTimeline } from "../../hooks/useAudioTimeline";
import { useRippleUpdate } from "../../hooks/useRippleUpdate";
import { calculateRipple } from "../../lib/ripple-engine";
import { queryKeys } from "../../lib/react-query";
import * as ClipAPI from "../../lib/api/audio-clip-api";
import { AudioTimelineSegment } from "./AudioTimelineSegment";
import { getAuthToken } from "../../lib/auth/getAuthToken";
import type { AudioClip } from "../../lib/types";
import { AudioTimelineRuler } from "./AudioTimelineRuler";

export interface ClipAudioTimelineProps {
  projectId: string;
  projectType?: string;
}

const MIN_PX_PER_SEC = 2;
const MAX_PX_PER_SEC = 200;
const DEFAULT_PX_PER_SEC = 20;

export function ClipAudioTimeline({
  projectId,
  projectType,
}: ClipAudioTimelineProps) {
  const { data, isLoading } = useAudioTimeline(projectId, projectType);
  const [pxPerSec, setPxPerSec] = useState(DEFAULT_PX_PER_SEC);

  const sceneIds = data?.scenes.map((s) => s.id) ?? [];

  const clipQueries = useQueries({
    queries: sceneIds.map((sceneId) => ({
      queryKey: queryKeys.audio.clipsByScene(sceneId),
      queryFn: async () => {
        const token = await getAuthToken();
        if (!token) throw new Error("Not authenticated");
        return ClipAPI.getClipsByScene(sceneId, token);
      },
      enabled: !!sceneId,
    })),
  });

  const allClips = useMemo(() => {
    const clips: AudioClip[] = [];
    for (const q of clipQueries) {
      if (q.data) clips.push(...q.data);
    }
    return clips;
  }, [clipQueries]);

  const durationSec = useMemo(() => {
    if (allClips.length === 0) return 120;
    const maxEnd = Math.max(...allClips.map((c) => c.endSec ?? 0));
    return maxEnd > 0 ? Math.ceil(maxEnd + 30) : 120;
  }, [allClips]);

  const laneGroups = useMemo(() => {
    const groups: Record<number, AudioClip[]> = {};
    for (const clip of allClips) {
      const lane = clip.laneIndex ?? 0;
      if (!groups[lane]) groups[lane] = [];
      groups[lane].push(clip);
    }
    return groups;
  }, [allClips]);

  const rippleScenes = useMemo(() => {
    if (!data) return [];
    return data.scenes.map((scene) => {
      const sceneClips = allClips.filter((c) => c.sceneId === scene.id);
      const startSec =
        sceneClips.length > 0
          ? Math.min(...sceneClips.map((c) => c.startSec))
          : 0;
      const endSec =
        sceneClips.length > 0
          ? Math.max(...sceneClips.map((c) => c.endSec))
          : 0;
      return {
        id: scene.id,
        startSec,
        endSec,
        durationSec: Math.max(endSec - startSec, 0),
        orderIndex: scene.orderIndex ?? 0,
        sequenceId: scene.sequenceId ?? null,
      };
    });
  }, [data, allClips]);

  const rippleSequences = useMemo(() => {
    if (!data) return [];
    return data.sequences.map((seq) => {
      const seqScenes = rippleScenes.filter((s) => s.sequenceId === seq.id);
      const startSec =
        seqScenes.length > 0
          ? Math.min(...seqScenes.map((s) => s.startSec))
          : 0;
      const endSec =
        seqScenes.length > 0 ? Math.max(...seqScenes.map((s) => s.endSec)) : 0;
      return {
        id: seq.id,
        startSec,
        endSec,
        durationSec: Math.max(endSec - startSec, 0),
        orderIndex: seq.orderIndex ?? 0,
        actId: seq.actId ?? null,
      };
    });
  }, [data, rippleScenes]);

  const rippleActs = useMemo(() => {
    if (!data) return [];
    return data.acts.map((act) => {
      const actSeqs = rippleSequences.filter((sq) => sq.actId === act.id);
      const startSec =
        actSeqs.length > 0 ? Math.min(...actSeqs.map((sq) => sq.startSec)) : 0;
      const endSec =
        actSeqs.length > 0 ? Math.max(...actSeqs.map((sq) => sq.endSec)) : 0;
      return {
        id: act.id,
        startSec,
        endSec,
        durationSec: Math.max(endSec - startSec, 0),
        orderIndex: act.orderIndex ?? 0,
      };
    });
  }, [data, rippleSequences]);

  const { debouncedUpdate } = useRippleUpdate(projectId);

  const handleTrimEnd = useCallback(
    (clipId: string, newEndSec: number) => {
      const localResult = calculateRipple({
        changedClipId: clipId,
        newEndSec,
        allClips,
        allScenes: rippleScenes,
        allSequences: rippleSequences,
        allActs: rippleActs,
      });

      const affectedSceneIds = new Set<string>();
      for (const clip of localResult.updatedClips) {
        const orig = allClips.find((c) => c.id === clip.id);
        if (
          orig &&
          (orig.startSec !== clip.startSec || orig.endSec !== clip.endSec)
        ) {
          affectedSceneIds.add(clip.sceneId);
        }
      }
      for (const scene of localResult.updatedScenes) {
        const orig = rippleScenes.find((s) => s.id === scene.id);
        if (
          orig &&
          (orig.startSec !== scene.startSec || orig.endSec !== scene.endSec)
        ) {
          affectedSceneIds.add(scene.id);
        }
      }
      const changedClip = allClips.find((c) => c.id === clipId);
      if (changedClip) affectedSceneIds.add(changedClip.sceneId);

      debouncedUpdate({
        changedClipId: clipId,
        newEndSec,
        allClips,
        allScenes: rippleScenes,
        allSequences: rippleSequences,
        allActs: rippleActs,
        projectId: projectId || "",
        localResult,
        affectedSceneIds: Array.from(affectedSceneIds),
      });
    },
    [
      allClips,
      rippleScenes,
      rippleSequences,
      rippleActs,
      debouncedUpdate,
      projectId,
    ],
  );

  const handleZoomIn = () =>
    setPxPerSec((prev) => Math.min(prev * 1.25, MAX_PX_PER_SEC));
  const handleZoomOut = () =>
    setPxPerSec((prev) => Math.max(prev / 1.25, MIN_PX_PER_SEC));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        Lade Audio-Clips…
      </div>
    );
  }

  const sortedLaneIndices = Object.keys(laneGroups)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Herauszoomen"
            aria-label="Timeline herauszoomen"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
            {Math.round(pxPerSec)}px/s
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-muted transition-colors"
            title="Hineinzoomen"
            aria-label="Timeline hineinzoomen"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto relative">
        <AudioTimelineRuler
          durationSec={durationSec}
          pxPerSec={pxPerSec}
          currentSec={0}
        />

        {sortedLaneIndices.map((laneIndex) => (
          <div
            key={laneIndex}
            className="relative h-12 border-b border-border"
            style={{
              width: `${durationSec * pxPerSec}px`,
            }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-muted/50 flex items-center px-2 text-xs font-medium text-muted-foreground border-r border-border z-10">
              Lane {laneIndex}
            </div>

            <div className="absolute left-24 right-0 top-0 bottom-0">
              {laneGroups[laneIndex].map((clip) => (
                <AudioTimelineSegment
                  key={clip.id}
                  item={clip}
                  pxPerSec={pxPerSec}
                  onTrimEnd={handleTrimEnd}
                  isEditable={true}
                />
              ))}
            </div>
          </div>
        ))}

        {sortedLaneIndices.length === 0 && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Noch keine Audio-Clips vorhanden.
            <br />
            Füge einen Track hinzu, um eine WPM-Schätzung zu sehen.
          </div>
        )}
      </div>
    </div>
  );
}
