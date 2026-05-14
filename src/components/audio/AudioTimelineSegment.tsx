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
	/** T28: Union-Typ für Transition Phase.
	 *  T28-T29: AudioTrack (Legacy, Feature-Flag = false)
	 *  T30+: AudioClip (neu, Feature-Flag = true)
	 */
	item: AudioTrack | AudioClip;
	pxPerSec: number;
}

export function AudioTimelineSegment({
	item,
	pxPerSec,
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

	// T29: Berechne Wortanzahl und grobe WPM für Tooltip
	const wordCount = content
		? content.trim().split(/\s+/).filter((w) => w.length > 0).length
		: 0;
	const durationMin = durationSec / 60;
	const roughWpm =
		wordCount > 0 && durationMin > 0
			? Math.round(wordCount / durationMin)
			: 0;
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
			)}
			style={{
				left: `${startPx}px`,
				width: `${widthPx}px`,
			}}
			title={tooltipText}
			aria-label={ariaText}
		>
			<div className="px-1.5 py-0.5 flex items-center justify-between h-full">
				<span className="truncate font-medium">{content || "…"}</span>
				{isEstimated && (
					<span className="shrink-0 ml-1" aria-hidden="true">
						⏳
					</span>
				)}
			</div>
		</div>
	);
}

export default AudioTimelineSegment;
