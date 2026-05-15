/**
 * AudioTimelineSegment — Einzelner Track/Clip-Block auf einer Lane.
 *
 * T28: Union-Typ vorbereitet (AudioTrack | AudioClip).
 * Wenn Feature-Flag aktiv (T29+), rendert die Timeline AudioClip[]
 * statt AudioTrack[].
 *
 * Accessibility (WCAG):
 * - aria-label für Screenreader (Typ + Content + Dauer).
 * - title-Attribut für Hover-Info.
 * - Kontrast: Weißer Text auf farbigem Hintergrund (ggf. anpassen).
 */

import { useState, useCallback, useRef } from "react";
import type { AudioTrack, AudioClip } from "../../lib/types";
import { formatDurationSec } from "../../lib/audio-utils";
import { cn } from "../../lib/utils";

const TYPE_COLORS: Record<string, string> = {
	dialog: "bg-amber-500 border-amber-600",
	narrator: "bg-amber-400 border-amber-500",
	music: "bg-violet-500 border-violet-600",
	sfx: "bg-slate-500 border-slate-600",
	atmo: "bg-sky-500 border-sky-600",
};

interface AudioTimelineSegmentProps {
	/** T28: Union-Typ für Transition Phase. */
	item: AudioTrack | AudioClip;
	pxPerSec: number;
	/** T30: Trim-Handler — wird bei Ende eines Resize-Drag aufgerufen. */
	onTrimEnd?: (clipId: string, newEndSec: number) => void;
	/** T30: Ob Trim erlaubt ist (nur im neuen Clip-System). */
	isEditable?: boolean;
}

export function AudioTimelineSegment({
	item,
	pxPerSec,
	onTrimEnd,
	isEditable = false,
}: AudioTimelineSegmentProps) {
	// T28: Union-Typ — unterscheide Track (Legacy) vs Clip (neu)
	const isClip = "startSec" in item;

	const startSec = isClip
		? (item as AudioClip).startSec
		: ((item as AudioTrack).startTime ?? 0);

	const endSec = isClip
		? (item as AudioClip).endSec
		: ((item as AudioTrack).startTime ?? 0) +
			((item as AudioTrack).duration ?? 3);

	const durationSec = Math.max(endSec - startSec, 0.1);

	const startPx = startSec * pxPerSec;
	const widthPx = Math.max(durationSec * pxPerSec, 4); // Min 4px

	const trackType = isClip
		? ((item as AudioClip).trackType ?? "dialog")
		: (item as AudioTrack).type;
	const content = isClip
		? ((item as AudioClip).content ?? "…")
		: ((item as AudioTrack).content ?? "…");

	const colorClass = TYPE_COLORS[trackType] || "bg-gray-500 border-gray-600";

	// T29: Geschätzt = kein audioFileId auf Clip
	const isEstimated = isClip && !(item as AudioClip).audioFileId;

	// ── T30: Trim-State ─────────────────────────────────────────────
	const [isDragging, setIsDragging] = useState(false);
	const dragStartX = useRef(0);
	const dragStartWidth = useRef(0);
	const clipIdRef = useRef(isClip ? (item as AudioClip).id : "");

	// T30: Conflict-Check vor Trim
	const handleResizeMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!isEditable || !isClip) return;
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(true);
			dragStartX.current = e.clientX;
			dragStartWidth.current = widthPx;
		},
		[isEditable, isClip, widthPx],
	);

	// T30: Keyboard-Trim (WCAG 2.2 AA — Tastatur-Bedienbarkeit)
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!isEditable || !isClip) return;
			if (e.key === "ArrowRight" && e.shiftKey) {
				e.preventDefault();
				const stepSec = e.altKey ? 0.1 : 1.0; // Alt = fein
				const newEndSec = endSec + stepSec;
				if (onTrimEnd) {
					onTrimEnd(clipIdRef.current, newEndSec);
				}
			} else if (e.key === "ArrowLeft" && e.shiftKey) {
				e.preventDefault();
				const stepSec = e.altKey ? 0.1 : 1.0;
				const newEndSec = Math.max(endSec - stepSec, startSec + 0.5);
				if (onTrimEnd) {
					onTrimEnd(clipIdRef.current, newEndSec);
				}
			}
		},
		[isEditable, isClip, endSec, startSec, onTrimEnd],
	);

	const handleMouseMove = useCallback(
		(_e: React.MouseEvent) => {
			if (!isDragging) return;
			// Visuelles Feedback während Drag (optional: könnte auch über CSS-Variable gehen)
			// Für KISS: wir zeigen kein Live-Resize, nur Cursor-Change
		},
		[isDragging],
	);

	const handleMouseUp = useCallback(
		(e: React.MouseEvent) => {
			if (!isDragging) return;
			setIsDragging(false);
			const deltaPx = e.clientX - dragStartX.current;
			const newDurationSec = Math.max(
				(dragStartWidth.current + deltaPx) / pxPerSec,
				0.5,
			);
			const newEndSec = startSec + newDurationSec;
			if (onTrimEnd && clipIdRef.current) {
				onTrimEnd(clipIdRef.current, newEndSec);
			}
		},
		[isDragging, pxPerSec, startSec, onTrimEnd],
	);

	const handleMouseLeave = useCallback(() => {
		if (isDragging) {
			setIsDragging(false);
		}
	}, [isDragging]);

	// ── Content ────────────────────────────────────────────────────
	const wordCount = content
		? content
				.trim()
				.split(/\s+/)
				.filter((w) => w.length > 0).length
		: 0;
	const durationMin = durationSec / 60;
	const roughWpm =
		wordCount > 0 && durationMin > 0 ? Math.round(wordCount / durationMin) : 0;
	const contentPreview =
		content && content.length > 40
			? `"${content.slice(0, 40)}…”`
			: content
				? `"${content}"`
				: "";

	const tooltipText = isEstimated
		? `⏳ Geschätzt: ${formatDurationSec(durationSec)} (${wordCount} Wörter${roughWpm > 0 ? `, ~${roughWpm} WPM` : ""}${contentPreview ? `, ${contentPreview}` : ""})`
		: `${trackType}: ${content || "(kein Text)"} (${formatDurationSec(durationSec)})`;

	const ariaText = isEstimated
		? `Geschätzt: ${trackType}: ${content || "(kein Text)"}, Dauer ${formatDurationSec(durationSec)}, ${wordCount} Wörter${roughWpm > 0 ? `, ~${roughWpm} WPM` : ""}`
		: `${trackType}: ${content}, Dauer ${formatDurationSec(durationSec)}`;

	return (
		<div
			className={cn(
				"absolute top-1.5 bottom-1.5 rounded-md border text-white text-[10px] overflow-hidden cursor-pointer",
				"hover:brightness-110 transition-all shadow-sm select-none",
				colorClass,
				isEstimated && "border-dotted opacity-70",
				isDragging && "ring-2 ring-white/50",
			)}
			style={{
				left: `${startPx}px`,
				width: `${widthPx}px`,
			}}
			title={tooltipText}
			aria-label={ariaText}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={handleMouseLeave}
		>
			<div className="px-1.5 py-0.5 flex items-center justify-between h-full relative">
				<span className="truncate font-medium">{content || "…"}</span>
				{isEstimated && (
					<span className="shrink-0 ml-1" aria-hidden="true">
						⏳
					</span>
				)}
				{/* T30: Resize-Handle (rechts) */}
				{isEditable && isClip && (
					<div
						className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-white/30 transition-colors focus:outline-none focus:ring-1 focus:ring-white/50"
						onMouseDown={handleResizeMouseDown}
						onKeyDown={handleKeyDown}
						tabIndex={0}
						role="slider"
						aria-label="Clip verlängern/verkürzen. Shift+Pfeiltaste = fein, Shift+Alt+Pfeiltaste = grob"
						aria-valuenow={endSec}
						aria-valuemin={startSec + 0.5}
						aria-valuemax={startSec + 600}
						title="Ziehen oder Shift+Pfeiltaste zum Trimmen"
					/>
				)}
			</div>
		</div>
	);
}

export default AudioTimelineSegment;
