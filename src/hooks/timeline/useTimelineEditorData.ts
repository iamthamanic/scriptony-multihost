/**
 * Timeline bundle + beats loading for Structure Timeline editor (Epic T55).
 */

import { useEffect, useRef, useState } from "react";
import * as BeatsAPI from "@/lib/api/beats-api";
import type { TimelineData } from "@/lib/timeline-data";
import type { BookTimelineData } from "@/components/book/BookDropdownView";

function fixOverlappingBeats(
  beatsToFix: BeatsAPI.StoryBeat[],
): BeatsAPI.StoryBeat[] {
  if (beatsToFix.length === 0) return beatsToFix;
  const sorted = [...beatsToFix].sort((a, b) => a.pct_from - b.pct_from);
  const fixed: BeatsAPI.StoryBeat[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const beat = { ...sorted[i] };
    if (i > 0) {
      const prevBeat = fixed[i - 1];
      if (beat.pct_from < prevBeat.pct_to) {
        const originalLength = beat.pct_to - beat.pct_from;
        beat.pct_from = prevBeat.pct_to;
        beat.pct_to = beat.pct_from + originalLength;
        if (beat.pct_to > 100) beat.pct_to = 100;
      }
    }
    fixed.push(beat);
  }
  return fixed;
}

export interface TimelineEditorBeat {
  id?: string;
  label?: string;
  templateAbbr?: string;
  description?: string;
  pctFrom?: number;
  pctTo?: number;
  color?: string;
  notes?: string;
}

export interface UseTimelineEditorDataOptions {
  projectId: string;
  parentBeats?: TimelineEditorBeat[];
}

export function useTimelineEditorData({
  projectId,
  parentBeats,
}: UseTimelineEditorDataOptions) {
  const [timelineData, setTimelineData] = useState<
    TimelineData | BookTimelineData | null
  >(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [beats, setBeats] = useState<BeatsAPI.StoryBeat[]>([]);
  const [beatsLoading, setBeatsLoading] = useState(false);
  const [dbBeatIds, setDbBeatIds] = useState<Set<string>>(new Set());

  const onDataChangeRef = useRef<
    ((data: TimelineData | BookTimelineData) => void) | undefined
  >(undefined);

  useEffect(() => {
    if (parentBeats && parentBeats.length > 0) {
      const convertedBeats: BeatsAPI.StoryBeat[] = parentBeats.map((beat) => ({
        id: beat.id || "",
        project_id: projectId,
        user_id: "",
        label: beat.label || "",
        template_abbr: beat.templateAbbr,
        description: beat.description,
        from_container_id: "",
        to_container_id: "",
        pct_from: beat.pctFrom || 0,
        pct_to: beat.pctTo || 0,
        color: beat.color,
        notes: beat.notes,
        order_index: 0,
        created_at: "",
        updated_at: "",
      }));

      const fixedBeats = fixOverlappingBeats(convertedBeats);
      setBeats(fixedBeats);
      setDbBeatIds(
        new Set(
          fixedBeats
            .map((b: BeatsAPI.StoryBeat) => b.id)
            .filter((id: string) => id.length > 0),
        ),
      );
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setBeatsLoading(true);
        const fetchedBeats = await BeatsAPI.getBeats(projectId);
        if (cancelled) return;
        const fixedBeats = fixOverlappingBeats(fetchedBeats);
        setBeats(fixedBeats);
        setDbBeatIds(new Set(fixedBeats.map((b: BeatsAPI.StoryBeat) => b.id)));
      } catch (error) {
        console.error("[useTimelineEditorData] Failed to load beats:", error);
      } finally {
        if (!cancelled) setBeatsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parentBeats, projectId]);

  return {
    timelineData,
    setTimelineData,
    isLoadingData,
    setIsLoadingData,
    beats,
    setBeats,
    beatsLoading,
    dbBeatIds,
    setDbBeatIds,
    onDataChangeRef,
  };
}
