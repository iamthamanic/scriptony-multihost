/**
 * Transactional-ish ripple persistence: Appwrite updates with rollback on failure.
 * Used by GraphQL-compat PersistRipple (single round-trip from HTTP routes).
 */

import { z } from "zod";
import { C, getDocument, updateDocument } from "./appwrite-db";
import type {
	RippleAct,
	RippleClip,
	RippleOutput,
	RippleScene,
	RippleSequence,
} from "./ripple-engine";

export interface ClipPersistPatch {
	id: string;
	start_sec: number;
	end_sec: number;
}

export interface TimelineNodePersistPatch {
	id: string;
	start_sec: number;
	end_sec: number;
	duration_sec: number;
	order_index: number;
}

const ClipPersistPatchSchema = z.object({
	id: z.string().min(1),
	start_sec: z.number().min(0),
	end_sec: z.number().min(0),
});

const TimelineNodePersistPatchSchema = z.object({
	id: z.string().min(1),
	start_sec: z.number().min(0),
	end_sec: z.number().min(0),
	duration_sec: z.number().min(0),
	order_index: z.number().int().min(0),
});

/** Validates PersistRipple GraphQL variables before touching Appwrite. */
export function parseRipplePersistPatches(variables: Record<string, unknown>): {
	clip_patches: ClipPersistPatch[];
	timeline_node_patches: TimelineNodePersistPatch[];
} {
	return {
		clip_patches: z.array(ClipPersistPatchSchema).parse(variables.clip_patches),
		timeline_node_patches: z
			.array(TimelineNodePersistPatchSchema)
			.parse(variables.timeline_node_patches),
	};
}

type AppliedOp = {
	collection: string;
	id: string;
	rollback: Record<string, unknown>;
};

export function buildRipplePersistDelta(
	mappedClips: RippleClip[],
	mappedScenes: RippleScene[],
	mappedSequences: RippleSequence[],
	mappedActs: RippleAct[],
	result: RippleOutput,
): {
	clip_patches: ClipPersistPatch[];
	timeline_node_patches: TimelineNodePersistPatch[];
} {
	const clip_patches: ClipPersistPatch[] = [];
	for (const c of result.updatedClips) {
		const orig = mappedClips.find((o) => o.id === c.id);
		if (!orig) continue;
		if (orig.startSec !== c.startSec || orig.endSec !== c.endSec) {
			clip_patches.push({
				id: c.id,
				start_sec: c.startSec,
				end_sec: c.endSec,
			});
		}
	}

	const timeline_node_patches: TimelineNodePersistPatch[] = [];

	for (const scene of result.updatedScenes) {
		const orig = mappedScenes.find((s) => s.id === scene.id);
		if (!orig) continue;
		if (
			orig.endSec !== scene.endSec ||
			orig.startSec !== scene.startSec ||
			orig.orderIndex !== scene.orderIndex
		) {
			timeline_node_patches.push({
				id: scene.id,
				start_sec: scene.startSec,
				end_sec: scene.endSec,
				duration_sec: scene.durationSec,
				order_index: scene.orderIndex,
			});
		}
	}
	for (const seq of result.updatedSequences) {
		const orig = mappedSequences.find((sq) => sq.id === seq.id);
		if (!orig) continue;
		if (
			orig.endSec !== seq.endSec ||
			orig.startSec !== seq.startSec ||
			orig.orderIndex !== seq.orderIndex
		) {
			timeline_node_patches.push({
				id: seq.id,
				start_sec: seq.startSec,
				end_sec: seq.endSec,
				duration_sec: seq.durationSec,
				order_index: seq.orderIndex,
			});
		}
	}
	for (const act of result.updatedActs) {
		const orig = mappedActs.find((a) => a.id === act.id);
		if (!orig) continue;
		if (
			orig.endSec !== act.endSec ||
			orig.startSec !== act.startSec ||
			orig.orderIndex !== act.orderIndex
		) {
			timeline_node_patches.push({
				id: act.id,
				start_sec: act.startSec,
				end_sec: act.endSec,
				duration_sec: act.durationSec,
				order_index: act.orderIndex,
			});
		}
	}

	return { clip_patches, timeline_node_patches };
}

/** Ensures every patch target belongs to the given project (defense in depth). */
export async function assertRipplePatchesInProject(
	projectId: string,
	clip_patches: ClipPersistPatch[],
	timeline_node_patches: TimelineNodePersistPatch[],
): Promise<void> {
	for (const p of clip_patches) {
		const doc = await getDocument(C.audio_clips, p.id);
		if (!doc) {
			throw new Error(`audio_clip not found: ${p.id}`);
		}
		if (String(doc.project_id) !== projectId) {
			throw new Error(`audio_clip ${p.id} is outside project scope`);
		}
	}
	for (const p of timeline_node_patches) {
		const doc = await getDocument(C.timeline_nodes, p.id);
		if (!doc) {
			throw new Error(`timeline_node not found: ${p.id}`);
		}
		if (String(doc.project_id) !== projectId) {
			throw new Error(`timeline_node ${p.id} is outside project scope`);
		}
	}
}

export async function persistRippleTransactional(
	projectId: string,
	clip_patches: ClipPersistPatch[],
	timeline_node_patches: TimelineNodePersistPatch[],
): Promise<{ ok: true }> {
	await assertRipplePatchesInProject(
		projectId,
		clip_patches,
		timeline_node_patches,
	);

	const applied: AppliedOp[] = [];
	try {
		for (const p of clip_patches) {
			const before = await getDocument(C.audio_clips, p.id);
			if (!before) {
				throw new Error(`audio_clip not found: ${p.id}`);
			}
			if (String(before.project_id) !== projectId) {
				throw new Error(`audio_clip ${p.id} is outside project scope`);
			}
			await updateDocument(C.audio_clips, p.id, {
				start_sec: p.start_sec,
				end_sec: p.end_sec,
			});
			applied.push({
				collection: C.audio_clips,
				id: p.id,
				rollback: {
					start_sec: before.start_sec,
					end_sec: before.end_sec,
				},
			});
		}
		for (const p of timeline_node_patches) {
			const before = await getDocument(C.timeline_nodes, p.id);
			if (!before) {
				throw new Error(`timeline_node not found: ${p.id}`);
			}
			if (String(before.project_id) !== projectId) {
				throw new Error(`timeline_node ${p.id} is outside project scope`);
			}
			await updateDocument(C.timeline_nodes, p.id, {
				start_sec: p.start_sec,
				end_sec: p.end_sec,
				duration_sec: p.duration_sec,
				order_index: p.order_index,
			});
			applied.push({
				collection: C.timeline_nodes,
				id: p.id,
				rollback: {
					start_sec: before.start_sec,
					end_sec: before.end_sec,
					duration_sec: before.duration_sec,
					order_index: before.order_index,
				},
			});
		}
	} catch (err) {
		for (const op of [...applied].reverse()) {
			try {
				await updateDocument(op.collection, op.id, op.rollback);
			} catch (rollbackErr) {
				console.error("[ripple-persist] rollback failed", op.id, rollbackErr);
			}
		}
		throw err;
	}
	return { ok: true };
}
