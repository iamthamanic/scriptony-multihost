/**
 * AudioTimeline — FL-Studio-like Multi-Lane Audio-Arrange-View.
 * Zeigt alle Audio-Tracks des Projekts auf übereinanderliegenden Lanes.
 * Max 300 Zeilen (KISS). Desktop-first.
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { useQueries } from "@tanstack/react-query";
import { ZoomIn, ZoomOut, Play, Pause } from "lucide-react";
import { useAudioTimeline } from "../../hooks/useAudioTimeline";
import { FEATURE_FLAGS } from "../../lib/feature-flags";
import { queryKeys } from "../../lib/react-query";
import * as ClipAPI from "../../lib/api/audio-clip-api";
import { AudioTimelineSegment } from "./AudioTimelineSegment";
import { getAuthToken } from "../../lib/auth/getAuthToken";
import type { AudioTrack, AudioClip } from "../../lib/types";
import { AudioTimelineRuler } from "./AudioTimelineRuler";
import { AudioTimelineLane } from "./AudioTimelineLane";

interface AudioTimelineProps {
	projectId: string;
	projectType?: string;
}

const MIN_PX_PER_SEC = 2;
const MAX_PX_PER_SEC = 200;
const DEFAULT_PX_PER_SEC = 20;

export function AudioTimeline({ projectId, projectType }: AudioTimelineProps) {
	// T29: Feature-Flag aktiviert die Clip-basierte Timeline
	const useNewSystem = FEATURE_FLAGS.audioClipSystem.enabled;

	if (useNewSystem) {
		return (
			<ClipAudioTimeline projectId={projectId} projectType={projectType} />
		);
	}

	return (
		<LegacyAudioTimeline projectId={projectId} projectType={projectType} />
	);
}

// ── Clip-basierte Timeline (T29) ──────────────────────────────────────────

function ClipAudioTimeline({ projectId, projectType }: AudioTimelineProps) {
	const { data, isLoading } = useAudioTimeline(projectId, projectType);
	const [pxPerSec, setPxPerSec] = useState(DEFAULT_PX_PER_SEC);

	const sceneIds = data?.scenes.map((s) => s.id) ?? [];

	// T29: Lade Clips für alle Szenen parallel
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

	// Gruppiere Clips nach Lane-Index
	const laneGroups = useMemo(() => {
		const groups: Record<number, AudioClip[]> = {};
		for (const clip of allClips) {
			const lane = clip.laneIndex ?? 0;
			if (!groups[lane]) groups[lane] = [];
			groups[lane].push(clip);
		}
		return groups;
	}, [allClips]);

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

	// Erstelle eine flache Liste von Lane-Namen für das Rendering
	const sortedLaneIndices = Object.keys(laneGroups)
		.map(Number)
		.sort((a, b) => a - b);

	return (
		<div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden">
			{/* Toolbar */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
				<div className="flex items-center gap-1">
					<button
						onClick={handleZoomOut}
						className="p-1.5 rounded hover:bg-muted transition-colors"
						title="Herauszoomen"
					>
						<ZoomOut className="w-4 h-4" />
					</button>
					<span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
						{Math.round(pxPerSec)}px/s
					</span>
					<button
						onClick={handleZoomIn}
						className="p-1.5 rounded hover:bg-muted transition-colors"
						title="Hineinzoomen"
					>
						<ZoomIn className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Timeline Body */}
			<div className="flex-1 overflow-x-auto overflow-y-auto relative">
				<AudioTimelineRuler
					durationSec={durationSec}
					pxPerSec={pxPerSec}
					currentSec={0}
				/>

				{/* Lane Rows */}
				{sortedLaneIndices.map((laneIndex) => (
					<div
						key={laneIndex}
						className="relative h-12 border-b border-border"
						style={{
							width: `${durationSec * pxPerSec}px`,
						}}
					>
						{/* Lane Label */}
						<div className="absolute left-0 top-0 bottom-0 w-24 bg-muted/50 flex items-center px-2 text-xs font-medium text-muted-foreground border-r border-border z-10">
							Lane {laneIndex}
						</div>

						{/* Clips */}
						<div className="absolute left-24 right-0 top-0 bottom-0">
							{laneGroups[laneIndex].map((clip) => (
								<AudioTimelineSegment
									key={clip.id}
									item={clip}
									pxPerSec={pxPerSec}
								/>
							))}
						</div>
					</div>
				))}

				{/* Empty State */}
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

// ── Legacy Track-basierte Timeline ──────────────────────────────────────────

function LegacyAudioTimeline({ projectId, projectType }: AudioTimelineProps) {
	const { data, isLoading } = useAudioTimeline(projectId, projectType);

	const [pxPerSec, setPxPerSec] = useState(DEFAULT_PX_PER_SEC);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentSec, setCurrentSec] = useState(0);
	const scrollRef = useRef<HTMLDivElement>(null);
	const rafRef = useRef<number | null>(null);

	// Calculate total project duration from all tracks.
	const durationSec = useMemo(() => {
		if (!data) return 120; // Default 2 min empty canvas.
		let maxEnd = 0;
		Object.values(data.tracksByScene).forEach((tracks) => {
			tracks.forEach((t) => {
				const end = (t.startTime || 0) + (t.duration || 0);
				if (end > maxEnd) maxEnd = end;
			});
		});
		return maxEnd > 0 ? Math.ceil(maxEnd + 30) : 120; // +30s padding.
	}, [data]);

	// Group tracks into lanes.
	const lanes = useMemo(() => {
		if (!data) return [];

		const allTracks: AudioTrack[] = [];
		Object.values(data.tracksByScene).forEach((tracks) => {
			allTracks.push(...tracks);
		});

		// 1. Dialog lanes: one per character
		const charTracks: Record<string, AudioTrack[]> = {};
		const otherTracks: Record<string, AudioTrack[]> = {
			sfx: [],
			music: [],
			atmo: [],
			narrator: [],
		};

		for (const t of allTracks) {
			if (t.type === "dialog" && t.characterId) {
				if (!charTracks[t.characterId]) charTracks[t.characterId] = [];
				charTracks[t.characterId].push(t);
			} else if (otherTracks[t.type]) {
				otherTracks[t.type].push(t);
			}
		}

		const result: { label: string; color: string; tracks: AudioTrack[] }[] = [];

		// Dialog lanes first.
		for (const [charId, tracks] of Object.entries(charTracks)) {
			const char = data.scenes
				.flatMap((s) => s.characters || [])
				.find((c) => c.id === charId);
			result.push({
				label: char?.name || `Charakter ${charId.slice(0, 6)}`,
				color: "#f59e0b",
				tracks,
			});
		}

		// Then SFX, Atmo, Music, Narrator.
		if (otherTracks.narrator.length)
			result.push({
				label: "Erzähler",
				color: "#f59e0b",
				tracks: otherTracks.narrator,
			});
		if (otherTracks.music.length)
			result.push({
				label: "Musik",
				color: "#8b5cf6",
				tracks: otherTracks.music,
			});
		if (otherTracks.sfx.length)
			result.push({ label: "SFX", color: "#64748b", tracks: otherTracks.sfx });
		if (otherTracks.atmo.length)
			result.push({
				label: "Atmo",
				color: "#0ea5e9",
				tracks: otherTracks.atmo,
			});

		// Empty placeholder lanes if no tracks yet.
		if (result.length === 0) {
			result.push({ label: "Sprecher 1", color: "#f59e0b", tracks: [] });
			result.push({ label: "SFX", color: "#64748b", tracks: [] });
		}

		return result;
	}, [data]);

	// Playback loop.
	const startPlayback = useCallback(() => {
		setIsPlaying(true);
		const startTime = performance.now();
		const startSec = currentSec;

		const tick = () => {
			const elapsed = (performance.now() - startTime) / 1000;
			const nextSec = startSec + elapsed;
			setCurrentSec(nextSec);

			// Auto-scroll playhead into view.
			const container = scrollRef.current;
			if (container) {
				const playheadPx = nextSec * pxPerSec;
				const viewStart = container.scrollLeft;
				const viewEnd = viewStart + container.clientWidth;
				if (playheadPx > viewEnd - 100) {
					container.scrollLeft = playheadPx - container.clientWidth / 2;
				}
			}

			if (nextSec < durationSec) {
				rafRef.current = requestAnimationFrame(tick);
			} else {
				setIsPlaying(false);
			}
		};

		rafRef.current = requestAnimationFrame(tick);
	}, [currentSec, durationSec, pxPerSec]);

	const stopPlayback = useCallback(() => {
		setIsPlaying(false);
		if (rafRef.current) cancelAnimationFrame(rafRef.current);
	}, []);

	const togglePlayback = useCallback(() => {
		if (isPlaying) stopPlayback();
		else startPlayback();
	}, [isPlaying, startPlayback, stopPlayback]);

	const handleZoomIn = () =>
		setPxPerSec((prev) => Math.min(prev * 1.25, MAX_PX_PER_SEC));
	const handleZoomOut = () =>
		setPxPerSec((prev) => Math.max(prev / 1.25, MIN_PX_PER_SEC));

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-96 text-muted-foreground">
				Lade Audio-Timeline…
			</div>
		);
	}

	const contentWidth = Math.max(durationSec * pxPerSec, 800);

	return (
		<div className="flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden">
			{/* Toolbar */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30 shrink-0">
				<div className="flex items-center gap-3">
					<button
						onClick={togglePlayback}
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
					>
						{isPlaying ? (
							<>
								<Pause className="w-4 h-4" /> Pause
							</>
						) : (
							<>
								<Play className="w-4 h-4" /> Abspielen
							</>
						)}
					</button>
					<span className="text-sm text-muted-foreground tabular-nums w-20">
						{formatTime(currentSec)}
					</span>
				</div>

				<div className="flex items-center gap-1">
					<button
						onClick={handleZoomOut}
						className="p-1.5 rounded hover:bg-muted transition-colors"
						title="Herauszoomen"
					>
						<ZoomOut className="w-4 h-4" />
					</button>
					<span className="text-xs text-muted-foreground w-12 text-center tabular-nums">
						{Math.round(pxPerSec)}px/s
					</span>
					<button
						onClick={handleZoomIn}
						className="p-1.5 rounded hover:bg-muted transition-colors"
						title="Hineinzoomen"
					>
						<ZoomIn className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Timeline Body */}
			<div className="flex-1 flex overflow-hidden">
				<div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-auto">
					<div style={{ width: `${contentWidth + 128}px` }}>
						<AudioTimelineRuler
							durationSec={durationSec}
							pxPerSec={pxPerSec}
							currentSec={currentSec}
						/>

						{lanes.map((lane) => (
							<AudioTimelineLane
								key={lane.label}
								label={lane.label}
								color={lane.color}
								tracks={lane.tracks}
								pxPerSec={pxPerSec}
								durationSec={durationSec}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

function formatTime(totalSec: number): string {
	const m = Math.floor(totalSec / 60);
	const s = Math.floor(totalSec % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}

export default AudioTimeline;
