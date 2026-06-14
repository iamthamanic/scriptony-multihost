/**
 * useHierarchyCRUD — Shared CRUD handlers for hierarchy items (Act/Sequence/Scene).
 *
 * Used by AudioDropdown now; FilmDropdown & BookDropdown can migrate later (Phase 3).
 * Keeps CRUD logic DRY while the parent component owns the data and UI.
 *
 * SOLID: SRP — only CRUD operations + label resolution.
 *        OCP — new project types only need a new `hierarchyLabels` entry in the registry.
 * DRY:  One hook replaces three copies of identical handler logic.
 * KISS:  No speculative abstractions; plain async functions backed by TimelineAPI.
 */

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import * as TimelineAPI from "../lib/api-adapter/timeline-structure-adapter";
import { queryKeys } from "../lib/react-query";
import type { Act, Sequence, Scene, Shot } from "../lib/types";
import {
  duplicateActDeep,
  duplicateSceneDeep,
  duplicateSequenceDeep,
} from "../lib/structure/structure-deep-duplicate";

// ─── Types ───────────────────────────────────────────────────────

export interface HierarchyLabel {
  singular: string;
  plural: string;
}

export interface HierarchyLabels {
  act: HierarchyLabel;
  sequence: HierarchyLabel;
  scene: HierarchyLabel;
}

export interface UseHierarchyCRUDOptions {
  projectId: string;
  projectType: string;
  acts: Act[];
  sequences: Sequence[];
  scenes: Scene[];
  /** Film/series: shots duplicated with scenes. */
  shots?: Shot[];
  labels?: HierarchyLabels;
  /** Called after successful delete/duplicate (and create) — e.g. reload timeline view. */
  onMutated?: () => void | Promise<void>;
}

export interface UseHierarchyCRUDReturn {
  // Create
  handleAddAct: () => Promise<void>;
  handleAddSequence: (actId: string) => Promise<void>;
  handleAddScene: (sequenceId: string) => Promise<void>;
  // Update (rename)
  handleUpdateAct: (actId: string, updates: Partial<Act>) => Promise<void>;
  handleUpdateSequence: (
    sequenceId: string,
    updates: Partial<Sequence>,
  ) => Promise<void>;
  handleUpdateScene: (
    sceneId: string,
    updates: Partial<Scene>,
  ) => Promise<void>;
  // Delete
  handleDeleteAct: (actId: string) => Promise<void>;
  handleDeleteSequence: (sequenceId: string) => Promise<void>;
  handleDeleteScene: (sceneId: string) => Promise<void>;
  // Duplicate
  handleDuplicateAct: (actId: string) => Promise<void>;
  handleDuplicateSequence: (sequenceId: string) => Promise<void>;
  handleDuplicateScene: (sceneId: string) => Promise<void>;
  // Labels (from projectTypeRegistry)
  labelFor: (kind: "act" | "sequence" | "scene") => string;
  labelPluralFor: (kind: "act" | "sequence" | "scene") => string;
  // Mutation state
  creating: string | null;
  pendingIds: Set<string>;
}

// ─── Default labels fallback ──────────────────────────────────────

const DEFAULT_LABELS: HierarchyLabels = {
  act: { singular: "Akt", plural: "Akte" },
  sequence: { singular: "Sequenz", plural: "Sequenzen" },
  scene: { singular: "Szene", plural: "Szenen" },
};

// ─── Hook ─────────────────────────────────────────────────────────

export function useHierarchyCRUD(
  options: UseHierarchyCRUDOptions,
): UseHierarchyCRUDReturn {
  const {
    projectId,
    projectType,
    acts,
    sequences,
    scenes,
    shots = [],
    onMutated,
  } = options;
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  // Track which level is currently being created (e.g. "act", "sequence:{actId}")
  const [creating, setCreating] = useState<string | null>(null);
  // Track which items have a pending mutation (for UI spinners/disabled state)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Labels from options or fallback defaults
  const labels = options.labels ?? DEFAULT_LABELS;

  const labelFor = useCallback(
    (kind: "act" | "sequence" | "scene") => labels[kind].singular,
    [labels],
  );
  const labelPluralFor = useCallback(
    (kind: "act" | "sequence" | "scene") => labels[kind].plural,
    [labels],
  );

  // Invalidate timeline + audio cache
  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.timeline.byProject(projectId),
    });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.timeline.audioByProject(projectId),
    });
    await onMutated?.();
  }, [queryClient, projectId, onMutated]);

  // Helper: add/remove from pendingIds
  const addPending = useCallback((id: string) => {
    setPendingIds((prev) => new Set(prev).add(id));
  }, []);
  const removePending = useCallback((id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // ─── CREATE ──────────────────────────────────────────────────

  const handleAddAct = useCallback(async () => {
    setCreating("act");
    try {
      const token = await getAccessToken();
      if (!token) return;

      const freshActs = await TimelineAPI.getActs(projectId, token);
      const maxNum =
        freshActs.length > 0
          ? Math.max(...freshActs.map((a) => a.actNumber || 0))
          : 0;
      const newNum = maxNum + 1;

      await TimelineAPI.createAct(
        projectId,
        {
          actNumber: newNum,
          title: `${labels.act.singular} ${newNum}`,
          orderIndex: freshActs.length,
        },
        token,
      );

      toast.success(`${labels.act.singular} erstellt`);
      await invalidate();
    } catch (error) {
      console.error("Error creating act:", error);
      toast.error("Fehler beim Erstellen");
    } finally {
      setCreating(null);
    }
  }, [getAccessToken, projectId, labels.act, invalidate]);

  const handleAddSequence = useCallback(
    async (actId: string) => {
      setCreating(`sequence:${actId}`);
      try {
        const token = await getAccessToken();
        if (!token) return;

        const freshSeqs = await TimelineAPI.getAllSequencesByProject(
          projectId,
          token,
        );
        const actSeqs = freshSeqs.filter((s) => s.actId === actId);
        const maxNum =
          actSeqs.length > 0
            ? Math.max(...actSeqs.map((s) => s.sequenceNumber || 0))
            : 0;
        const newNum = maxNum + 1;

        await TimelineAPI.createSequence(
          actId,
          {
            sequenceNumber: newNum,
            title: `${labels.sequence.singular} ${newNum}`,
            orderIndex: actSeqs.length,
          },
          token,
        );

        toast.success(`${labels.sequence.singular} erstellt`);
        await invalidate();
      } catch (error) {
        console.error("Error creating sequence:", error);
        toast.error("Fehler beim Erstellen");
      } finally {
        setCreating(null);
      }
    },
    [getAccessToken, projectId, labels.sequence, invalidate],
  );

  const handleAddScene = useCallback(
    async (sequenceId: string) => {
      setCreating(`scene:${sequenceId}`);
      try {
        const token = await getAccessToken();
        if (!token) return;

        const freshScenes = await TimelineAPI.getAllScenesByProject(
          projectId,
          token,
        );
        const seqScenes = freshScenes.filter(
          (s) => s.sequenceId === sequenceId,
        );
        const maxNum =
          seqScenes.length > 0
            ? Math.max(...seqScenes.map((s) => s.sceneNumber || 0))
            : 0;
        const newNum = maxNum + 1;

        await TimelineAPI.createScene(
          sequenceId,
          {
            sceneNumber: newNum,
            title: `${labels.scene.singular} ${newNum}`,
            orderIndex: seqScenes.length,
          },
          token,
        );

        toast.success(`${labels.scene.singular} erstellt`);
        await invalidate();
      } catch (error) {
        console.error("Error creating scene:", error);
        toast.error("Fehler beim Erstellen");
      } finally {
        setCreating(null);
      }
    },
    [getAccessToken, projectId, labels.scene, invalidate],
  );

  // ─── UPDATE (rename) ────────────────────────────────────────

  const handleUpdateAct = useCallback(
    async (actId: string, updates: Partial<Act>) => {
      addPending(actId);
      try {
        const token = await getAccessToken();
        if (!token) return;
        await TimelineAPI.updateAct(actId, updates, token);
        toast.success(`${labels.act.singular} aktualisiert`);
        await invalidate();
      } catch (error) {
        console.error("Error updating act:", error);
        toast.error("Fehler beim Aktualisieren");
      } finally {
        removePending(actId);
      }
    },
    [getAccessToken, labels.act, invalidate, addPending, removePending],
  );

  const handleUpdateSequence = useCallback(
    async (sequenceId: string, updates: Partial<Sequence>) => {
      addPending(sequenceId);
      try {
        const token = await getAccessToken();
        if (!token) return;
        await TimelineAPI.updateSequence(sequenceId, updates, token);
        toast.success(`${labels.sequence.singular} aktualisiert`);
        await invalidate();
      } catch (error) {
        console.error("Error updating sequence:", error);
        toast.error("Fehler beim Aktualisieren");
      } finally {
        removePending(sequenceId);
      }
    },
    [getAccessToken, labels.sequence, invalidate, addPending, removePending],
  );

  const handleUpdateScene = useCallback(
    async (sceneId: string, updates: Partial<Scene>) => {
      addPending(sceneId);
      try {
        const token = await getAccessToken();
        if (!token) return;
        await TimelineAPI.updateScene(sceneId, updates, token);
        toast.success(`${labels.scene.singular} aktualisiert`);
        await invalidate();
      } catch (error) {
        console.error("Error updating scene:", error);
        toast.error("Fehler beim Aktualisieren");
      } finally {
        removePending(sceneId);
      }
    },
    [getAccessToken, labels.scene, invalidate, addPending, removePending],
  );

  // ─── DELETE ─────────────────────────────────────────────────

  const handleDeleteAct = useCallback(
    async (actId: string) => {
      const label = labels.act.singular;
      if (
        !confirm(
          `${label} und alle enthaltenen ${labels.sequence.plural} und ${labels.scene.plural} wirklich löschen?`,
        )
      )
        return;

      addPending(actId);
      try {
        const token = await getAccessToken();
        if (!token) return;
        await TimelineAPI.deleteAct(actId, token);
        toast.success(`${label} gelöscht`);
        await invalidate();
      } catch (error) {
        console.error("Error deleting act:", error);
        toast.error("Fehler beim Löschen");
      } finally {
        removePending(actId);
      }
    },
    [getAccessToken, labels, invalidate, addPending, removePending],
  );

  const handleDeleteSequence = useCallback(
    async (sequenceId: string) => {
      const label = labels.sequence.singular;
      if (
        !confirm(
          `${label} und alle enthaltenen ${labels.scene.plural} wirklich löschen?`,
        )
      )
        return;

      addPending(sequenceId);
      try {
        const token = await getAccessToken();
        if (!token) return;
        await TimelineAPI.deleteSequence(sequenceId, token);
        toast.success(`${label} gelöscht`);
        await invalidate();
      } catch (error) {
        console.error("Error deleting sequence:", error);
        toast.error("Fehler beim Löschen");
      } finally {
        removePending(sequenceId);
      }
    },
    [getAccessToken, labels, invalidate, addPending, removePending],
  );

  const handleDeleteScene = useCallback(
    async (sceneId: string) => {
      const label = labels.scene.singular;
      if (!confirm(`${label} wirklich löschen?`)) return;

      addPending(sceneId);
      try {
        const token = await getAccessToken();
        if (!token) return;
        await TimelineAPI.deleteScene(sceneId, token);
        toast.success(`${label} gelöscht`);
        await invalidate();
      } catch (error) {
        console.error("Error deleting scene:", error);
        toast.error("Fehler beim Löschen");
      } finally {
        removePending(sceneId);
      }
    },
    [getAccessToken, labels.scene, invalidate, addPending, removePending],
  );

  // ─── DUPLICATE ───────────────────────────────────────────────

  const handleDuplicateAct = useCallback(
    async (actId: string) => {
      addPending(actId);
      const loadingId = toast.loading(
        `${labels.act.singular} wird dupliziert…`,
      );
      try {
        const token = await getAccessToken();
        if (!token) return;

        const result = await duplicateActDeep({
          actId,
          projectId,
          token,
          acts,
          sequences,
          scenes,
          shots,
        });

        toast.dismiss(loadingId);
        toast.success(
          `${labels.act.singular} dupliziert (${result.sequencesCreated} ${labels.sequence.plural}, ${result.scenesCreated} ${labels.scene.plural}, ${result.shotsCreated} Shots)`,
        );
        await invalidate();
      } catch (error) {
        console.error("Error duplicating act:", error);
        toast.dismiss(loadingId);
        toast.error("Fehler beim Duplizieren");
      } finally {
        removePending(actId);
      }
    },
    [
      getAccessToken,
      acts,
      sequences,
      scenes,
      shots,
      projectId,
      labels,
      invalidate,
      addPending,
      removePending,
    ],
  );

  const handleDuplicateSequence = useCallback(
    async (sequenceId: string) => {
      addPending(sequenceId);
      const loadingId = toast.loading(
        `${labels.sequence.singular} wird dupliziert…`,
      );
      try {
        const token = await getAccessToken();
        if (!token) return;

        const result = await duplicateSequenceDeep({
          sequenceId,
          sequences,
          scenes,
          shots,
          projectId,
          token,
        });

        toast.dismiss(loadingId);
        toast.success(
          `${labels.sequence.singular} dupliziert (${result.scenesCreated} ${labels.scene.plural}, ${result.shotsCreated} Shots)`,
        );
        await invalidate();
      } catch (error) {
        console.error("Error duplicating sequence:", error);
        toast.dismiss(loadingId);
        toast.error("Fehler beim Duplizieren");
      } finally {
        removePending(sequenceId);
      }
    },
    [
      getAccessToken,
      sequences,
      scenes,
      shots,
      projectId,
      labels,
      invalidate,
      addPending,
      removePending,
    ],
  );

  const handleDuplicateScene = useCallback(
    async (sceneId: string) => {
      addPending(sceneId);
      const loadingId = toast.loading(
        `${labels.scene.singular} wird dupliziert…`,
      );
      try {
        const token = await getAccessToken();
        if (!token) return;

        const result = await duplicateSceneDeep({
          sceneId,
          scenes,
          shots,
          projectId,
          token,
        });

        toast.dismiss(loadingId);
        toast.success(
          `${labels.scene.singular} dupliziert (${result.shotsCreated} Shots)`,
        );
        await invalidate();
      } catch (error) {
        console.error("Error duplicating scene:", error);
        toast.dismiss(loadingId);
        toast.error("Fehler beim Duplizieren");
      } finally {
        removePending(sceneId);
      }
    },
    [
      getAccessToken,
      scenes,
      shots,
      projectId,
      labels.scene,
      invalidate,
      addPending,
      removePending,
    ],
  );

  return {
    handleAddAct,
    handleAddSequence,
    handleAddScene,
    handleUpdateAct,
    handleUpdateSequence,
    handleUpdateScene,
    handleDeleteAct,
    handleDeleteSequence,
    handleDeleteScene,
    handleDuplicateAct,
    handleDuplicateSequence,
    handleDuplicateScene,
    labelFor,
    labelPluralFor,
    creating,
    pendingIds,
  };
}
