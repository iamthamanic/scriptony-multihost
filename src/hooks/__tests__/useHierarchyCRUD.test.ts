/**
 * @vitest-environment jsdom
 */

/**
 * Tests for useHierarchyCRUD hook and projectTypeRegistry hierarchyLabels.
 *
 * Tests are pure/unit-level where possible, mocking only TimelineAPI and auth.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHierarchyCRUD } from "../useHierarchyCRUD";
import * as TimelineAPI from "../../lib/api/timeline-api";
import { getProjectTypeConfig } from "../../lib/projectTypeRegistry";

// ─── Mocks ───────────────────────────────────────────────────────

vi.mock("../../lib/api/timeline-api", () => ({
	getActs: vi.fn(),
	createAct: vi.fn(),
	updateAct: vi.fn(),
	deleteAct: vi.fn(),
	getAllSequencesByProject: vi.fn(),
	createSequence: vi.fn(),
	updateSequence: vi.fn(),
	deleteSequence: vi.fn(),
	getAllScenesByProject: vi.fn(),
	createScene: vi.fn(),
	updateScene: vi.fn(),
	deleteScene: vi.fn(),
}));

vi.mock("../../hooks/useAuth", () => ({
	useAuth: () => ({
		getAccessToken: vi.fn().mockResolvedValue("mock-token"),
	}),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@tanstack/react-query")>();
	return {
		...actual,
		useQueryClient: () => ({
			invalidateQueries: vi.fn().mockResolvedValue(undefined),
		}),
	};
});

vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// ─── Test Data ────────────────────────────────────────────────────

const mockActs: any[] = [
	{
		id: "act-1",
		projectId: "proj-1",
		actNumber: 1,
		title: "Akt 1",
		orderIndex: 0,
	},
	{
		id: "act-2",
		projectId: "proj-1",
		actNumber: 2,
		title: "Akt 2",
		orderIndex: 1,
	},
];

const mockSequences: any[] = [
	{
		id: "seq-1",
		actId: "act-1",
		sequenceNumber: 1,
		title: "Sequenz 1",
		orderIndex: 0,
	},
	{
		id: "seq-2",
		actId: "act-1",
		sequenceNumber: 2,
		title: "Sequenz 2",
		orderIndex: 1,
	},
];

const mockScenes: any[] = [
	{
		id: "scene-1",
		sequenceId: "seq-1",
		sceneNumber: 1,
		title: "Szene 1",
		orderIndex: 0,
	},
	{
		id: "scene-2",
		sequenceId: "seq-1",
		sceneNumber: 2,
		title: "Szene 2",
		orderIndex: 1,
	},
];

// ─── Tests: projectTypeRegistry hierarchyLabels ────────────────────

describe("projectTypeRegistry – hierarchyLabels", () => {
	it("audio has Akt/Sequenz/Szene labels", () => {
		const config = getProjectTypeConfig("audio");
		expect(config.hierarchyLabels).toBeDefined();
		expect(config.hierarchyLabels.act.singular).toBe("Akt");
		expect(config.hierarchyLabels.act.plural).toBe("Akte");
		expect(config.hierarchyLabels.sequence.singular).toBe("Sequenz");
		expect(config.hierarchyLabels.sequence.plural).toBe("Sequenzen");
		expect(config.hierarchyLabels.scene.singular).toBe("Szene");
		expect(config.hierarchyLabels.scene.plural).toBe("Szenen");
	});

	it("book has Akt/Kapitel/Abschnitt labels", () => {
		const config = getProjectTypeConfig("book");
		expect(config.hierarchyLabels.sequence.singular).toBe("Kapitel");
		expect(config.hierarchyLabels.sequence.plural).toBe("Kapitel");
		expect(config.hierarchyLabels.scene.singular).toBe("Abschnitt");
		expect(config.hierarchyLabels.scene.plural).toBe("Abschnitte");
	});

	it("film has Akt/Sequence/Szene labels", () => {
		const config = getProjectTypeConfig("film");
		expect(config.hierarchyLabels.sequence.singular).toBe("Sequence");
		expect(config.hierarchyLabels.sequence.plural).toBe("Sequenzen");
	});
});

// ─── Tests: useHierarchyCRUD ─────────────────────────────────────

describe("useHierarchyCRUD", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function setup(projectType = "audio") {
		return renderHook(() =>
			useHierarchyCRUD({
				projectId: "proj-1",
				projectType,
				acts: mockActs,
				sequences: mockSequences,
				scenes: mockScenes,
			}),
		);
	}

	// ─── Label Resolution ───────────────────────────────────────

	describe("label resolution", () => {
		it("returns audio labels for audio project", () => {
			const { result } = setup("audio");
			expect(result.current.labelFor("act")).toBe("Akt");
			expect(result.current.labelFor("sequence")).toBe("Sequenz");
			expect(result.current.labelFor("scene")).toBe("Szene");
			expect(result.current.labelPluralFor("act")).toBe("Akte");
		});

		it("returns book labels for book project", () => {
			const { result } = setup("book");
			expect(result.current.labelFor("sequence")).toBe("Kapitel");
			expect(result.current.labelFor("scene")).toBe("Abschnitt");
		});

		it("falls back to film labels for unknown type (inherits from film fallback)", () => {
			const { result } = setup("unknown-type");
			// getProjectTypeConfig falls back to film, which has "Sequence" not "Sequenz"
			expect(result.current.labelFor("act")).toBe("Akt");
			expect(result.current.labelFor("sequence")).toBe("Sequence");
			expect(result.current.labelFor("scene")).toBe("Szene");
		});
	});

	// ─── Create Act ──────────────────────────────────────────────

	describe("handleAddAct", () => {
		it("creates an act with the next act number", async () => {
			(TimelineAPI.getActs as any).mockResolvedValue(mockActs);
			(TimelineAPI.createAct as any).mockResolvedValue({
				id: "act-3",
				projectId: "proj-1",
				actNumber: 3,
				title: "Akt 3",
				orderIndex: 2,
			});

			const { result } = setup();

			await act(async () => {
				await result.current.handleAddAct();
			});

			expect(TimelineAPI.getActs).toHaveBeenCalledWith("proj-1", "mock-token");
			expect(TimelineAPI.createAct).toHaveBeenCalledWith(
				"proj-1",
				expect.objectContaining({
					actNumber: 3,
					title: "Akt 3",
				}),
				"mock-token",
			);
		});
	});

	// ─── Create Sequence ────────────────────────────────────────

	describe("handleAddSequence", () => {
		it("creates a sequence under the given act", async () => {
			(TimelineAPI.getAllSequencesByProject as any).mockResolvedValue(
				mockSequences,
			);
			(TimelineAPI.createSequence as any).mockResolvedValue({
				id: "seq-3",
				actId: "act-1",
				sequenceNumber: 3,
				title: "Sequenz 3",
			});

			const { result } = setup();

			await act(async () => {
				await result.current.handleAddSequence("act-1");
			});

			expect(TimelineAPI.createSequence).toHaveBeenCalledWith(
				"act-1",
				expect.objectContaining({
					sequenceNumber: 3,
					title: "Sequenz 3",
				}),
				"mock-token",
			);
		});
	});

	// ─── Create Scene ────────────────────────────────────────────

	describe("handleAddScene", () => {
		it("creates a scene under the given sequence", async () => {
			(TimelineAPI.getAllScenesByProject as any).mockResolvedValue(mockScenes);
			(TimelineAPI.createScene as any).mockResolvedValue({
				id: "scene-3",
				sequenceId: "seq-1",
				sceneNumber: 3,
				title: "Szene 3",
			});

			const { result } = setup();

			await act(async () => {
				await result.current.handleAddScene("seq-1");
			});

			expect(TimelineAPI.createScene).toHaveBeenCalledWith(
				"seq-1",
				expect.objectContaining({
					sceneNumber: 3,
					title: "Szene 3",
				}),
				"mock-token",
			);
		});
	});

	// ─── Update (rename) ────────────────────────────────────────

	describe("handleUpdateAct", () => {
		it("updates an act title", async () => {
			(TimelineAPI.updateAct as any).mockResolvedValue({});

			const { result } = setup();

			await act(async () => {
				await result.current.handleUpdateAct("act-1", { title: "Neuer Akt" });
			});

			expect(TimelineAPI.updateAct).toHaveBeenCalledWith(
				"act-1",
				{ title: "Neuer Akt" },
				"mock-token",
			);
		});
	});

	// ─── Delete ─────────────────────────────────────────────────

	describe("handleDeleteAct", () => {
		it("deletes an act after confirmation", async () => {
			vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
			(TimelineAPI.deleteAct as any).mockResolvedValue(undefined);

			const { result } = setup();

			await act(async () => {
				await result.current.handleDeleteAct("act-1");
			});

			expect(TimelineAPI.deleteAct).toHaveBeenCalledWith("act-1", "mock-token");
			vi.unstubAllGlobals();
		});

		it("does not delete if confirmation is cancelled", async () => {
			vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));

			const { result } = setup();

			await act(async () => {
				await result.current.handleDeleteAct("act-1");
			});

			expect(TimelineAPI.deleteAct).not.toHaveBeenCalled();
			vi.unstubAllGlobals();
		});
	});

	// ─── Duplicate ──────────────────────────────────────────────

	describe("handleDuplicateAct", () => {
		it("duplicates an act with (Kopie) suffix", async () => {
			(TimelineAPI.getActs as any).mockResolvedValue(mockActs);
			(TimelineAPI.createAct as any).mockResolvedValue({
				id: "act-3",
				projectId: "proj-1",
				actNumber: 3,
				title: "Akt 1 (Kopie)",
			});

			const { result } = setup();

			await act(async () => {
				await result.current.handleDuplicateAct("act-1");
			});

			expect(TimelineAPI.createAct).toHaveBeenCalledWith(
				"proj-1",
				expect.objectContaining({
					title: "Akt 1 (Kopie)",
				}),
				"mock-token",
			);
		});
	});

	// ─── pending state ─────────────────────────────────────────

	describe("pending state", () => {
		it("starts with empty pendingIds and null creating", () => {
			const { result } = setup();
			expect(result.current.creating).toBeNull();
			expect(result.current.pendingIds.size).toBe(0);
		});
	});
});
