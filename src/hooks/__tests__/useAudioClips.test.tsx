/**
 * @vitest-environment jsdom
 */

/**
 * Tests for useAudioClips React Query hooks.
 * T28: AudioClip CRUD hooks (Ist-Ebene).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
	useAudioClips,
	useCreateAudioClip,
	useUpdateAudioClip,
	useDeleteAudioClip,
} from "../useAudioClips";
import * as ClipAPI from "../../lib/api/audio-clip-api";
import type { AudioClip } from "../../lib/types";

// ─── Mocks ───────────────────────────────────────────────────────

vi.mock("../../lib/api/audio-clip-api", () => ({
	getClipsByScene: vi.fn(),
	createClip: vi.fn(),
	updateClip: vi.fn(),
	deleteClip: vi.fn(),
}));

vi.mock("../useAuth", () => ({
	useAuth: () => ({
		getAccessToken: vi.fn().mockResolvedValue("test-token"),
		loading: false,
	}),
}));

// ─── Helpers ────────────────────────────────────────────────────

function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
}

function wrapper(client: QueryClient) {
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

// ─── Fixtures ─────────────────────────────────────────────────

const mockClip: AudioClip = {
	id: "clip-1",
	trackId: "track-1",
	sceneId: "scene-1",
	projectId: "proj-1",
	startSec: 0,
	endSec: 5,
	laneIndex: 0,
	orderIndex: 0,
	createdAt: "2026-01-01T00:00:00Z",
	updatedAt: "2026-01-01T00:00:00Z",
};

// ─── Tests: useAudioClips ───────────────────────────────────────

describe("useAudioClips", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should fetch clips by sceneId", async () => {
		vi.mocked(ClipAPI.getClipsByScene).mockResolvedValue([mockClip]);

		const client = createTestQueryClient();
		const { result } = renderHook(() => useAudioClips("scene-1"), {
			wrapper: wrapper(client),
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual([mockClip]);
		expect(ClipAPI.getClipsByScene).toHaveBeenCalledWith(
			"scene-1",
			"test-token",
		);
	});

	it("should be disabled when sceneId is undefined", () => {
		const client = createTestQueryClient();
		const { result } = renderHook(() => useAudioClips(undefined), {
			wrapper: wrapper(client),
		});

		expect(result.current.isPending).toBe(true);
		expect(result.current.fetchStatus).toBe("idle");
		expect(ClipAPI.getClipsByScene).not.toHaveBeenCalled();
	});
});

// ─── Tests: useCreateAudioClip ──────────────────────────────────

describe("useCreateAudioClip", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create a clip and invalidate queries", async () => {
		vi.mocked(ClipAPI.createClip).mockResolvedValue(mockClip);

		const client = createTestQueryClient();
		const { result } = renderHook(
			() => useCreateAudioClip("proj-1", "scene-1"),
			{ wrapper: wrapper(client) },
		);

		await act(async () => {
			await result.current.mutateAsync({
				trackId: "track-1",
				startSec: 0,
				endSec: 3,
			});
		});

		expect(ClipAPI.createClip).toHaveBeenCalledWith(
			"scene-1",
			"proj-1",
			expect.objectContaining({ trackId: "track-1" }),
			"test-token",
		);
	});
});

// ─── Tests: useUpdateAudioClip ──────────────────────────────────

describe("useUpdateAudioClip", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should update a clip", async () => {
		vi.mocked(ClipAPI.updateClip).mockResolvedValue({
			...mockClip,
			startSec: 10,
		});

		const client = createTestQueryClient();
		const { result } = renderHook(
			() => useUpdateAudioClip("clip-1", "scene-1"),
			{ wrapper: wrapper(client) },
		);

		await act(async () => {
			await result.current.mutateAsync({ startSec: 10 });
		});

		expect(ClipAPI.updateClip).toHaveBeenCalledWith(
			"clip-1",
			{ startSec: 10 },
			"test-token",
		);
	});
});

// ─── Tests: useDeleteAudioClip ──────────────────────────────────

describe("useDeleteAudioClip", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should delete a clip", async () => {
		vi.mocked(ClipAPI.deleteClip).mockResolvedValue(undefined);

		const client = createTestQueryClient();
		const { result } = renderHook(
			() => useDeleteAudioClip("clip-1", "scene-1"),
			{ wrapper: wrapper(client) },
		);

		await act(async () => {
			await result.current.mutateAsync();
		});

		expect(ClipAPI.deleteClip).toHaveBeenCalledWith("clip-1", "test-token");
	});
});
