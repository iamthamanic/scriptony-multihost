/**
 * AudioDropdown — Hörbuch/Hörspiel Dropdown-Ansicht.
 * Identisches Styling wie FilmDropdown:
 * - Act: blau (bg-blue-50 / border-blue-200)
 * - Sequence: grün (bg-green-50 / border-green-200)
 * - Scene: pink (bg-pink-50 / border-pink-200)
 * Innerhalb Scene: Audio-Tracks statt Shots + Scene-Bild-Upload.
 *
 * T26: CRUD-Operationen (Add/Rename/Delete/Duplicate) für Akt/Sequenz/Szene
 * über useHierarchyCRUD-Hook. Labels über projectTypeRegistry.
 */

import { useState, useMemo, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Plus,
  Play,
  Pause,
  Camera,
  Loader2,
  User,
  Bot,
  Clock,
  MoreVertical,
  Trash2,
  Copy,
  Pencil,
} from "lucide-react";
import { useAudioTimeline } from "../../hooks/useAudioTimeline";
import { useHierarchyCRUD } from "../../hooks/useHierarchyCRUD";
import { type HierarchyLabels } from "../../hooks/useHierarchyCRUD";
import {
  createAudioTrack,
  getClipsByScene,
} from "@/lib/api-adapter/audio-story-adapter";
import { queryKeys } from "../../lib/react-query";
import type { AudioClip, Sequence, Scene, AudioTrack } from "../../lib/types";
import { assignLaneIndex } from "../../lib/audio-lane";
import { estimateDurationSec } from "../../lib/audio-utils";
import { FEATURE_FLAGS } from "../../lib/feature-flags";
import { cn } from "../../lib/utils";
import { TtsGenerateButton } from "./TtsGenerateButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface AudioDropdownProps {
  projectId: string;
  projectType?: string;
}

const TRACK_COLOR: Record<string, string> = {
  dialog: "bg-amber-500",
  narrator: "bg-amber-400",
  music: "bg-violet-500",
  sfx: "bg-slate-500",
  atmo: "bg-sky-500",
};

export function AudioDropdown({ projectId, projectType }: AudioDropdownProps) {
  const { data, isLoading } = useAudioTimeline(projectId, projectType);

  // ── Inline-Editing State ──────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Expand/Collapse State ──────────────────────────────────────
  const [expandedActs, setExpandedActs] = useState<Set<string>>(new Set());
  const [expandedSeqs, setExpandedSeqs] = useState<Set<string>>(new Set());
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  // ── Audio State ────────────────────────────────────────────────
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [uploadingSceneId, setUploadingSceneId] = useState<string | null>(null);
  const [localSceneImages, setLocalSceneImages] = useState<
    Record<string, string>
  >({});

  const queryClient = useQueryClient();

  // ── Hierarchy CRUD ──────────────────────────────────────────
  const labels: HierarchyLabels =
    projectType === "book"
      ? {
          act: { singular: "Akt", plural: "Akte" },
          sequence: { singular: "Kapitel", plural: "Kapitel" },
          scene: { singular: "Abschnitt", plural: "Abschnitte" },
        }
      : {
          act: { singular: "Akt", plural: "Akte" },
          sequence: { singular: "Sequenz", plural: "Sequenzen" },
          scene: { singular: "Szene", plural: "Szenen" },
        };
  const crud = useHierarchyCRUD({
    projectId,
    projectType: projectType ?? "audio",
    acts: data?.acts ?? [],
    sequences: data?.sequences ?? [],
    scenes: data?.scenes ?? [],
    labels,
  });

  // ── Track Mutation (existing) ────────────────────────────────
  const createTrackMutation = useMutation({
    mutationFn: async ({
      sceneId,
      type,
    }: {
      sceneId: string;
      type: string;
    }) => {
      let laneIndex: number | undefined;
      if (FEATURE_FLAGS.audioClipSystem.enabled) {
        const existingClips = await getClipsByScene(sceneId);
        const clipStartSec =
          existingClips.length > 0
            ? Math.max(...existingClips.map((c) => c.endSec ?? 0))
            : 0;
        const wpmEstimate = estimateDurationSec("", {
          type: type as AudioTrack["type"],
        });
        const draft = {
          id: "pending",
          trackId: "pending",
          sceneId,
          projectId,
          startSec: clipStartSec,
          endSec: clipStartSec + wpmEstimate,
          laneIndex: 0,
          orderIndex: existingClips.length,
          trackType: type as AudioClip["trackType"],
          createdAt: "",
          updatedAt: "",
        } satisfies AudioClip;
        laneIndex = assignLaneIndex(existingClips, draft);
      }

      const result = await createAudioTrack(sceneId, projectId, {
        type: type as AudioTrack["type"],
        content: "",
        startTime: 0,
        duration: 0,
        ...(laneIndex !== undefined ? { laneIndex } : {}),
      });
      return result.track; // T29: unwrap track from dual-write response
    },
    onSuccess: (_data, variables) => {
      toast.success("Track hinzugefügt");
      queryClient.invalidateQueries({
        queryKey: queryKeys.timeline.audioByProject(projectId),
      });
      if (FEATURE_FLAGS.audioClipSystem.enabled) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.audio.clipsByScene(variables.sceneId),
        });
      }
    },
    onError: (err: Error) => {
      toast.error(`Fehler: ${err.message}`);
    },
  });

  const handleAddTrack = (sceneId: string, type: string) => {
    createTrackMutation.mutate({ sceneId, type });
  };

  const handleSceneImageUpload = async (_sceneId: string, file: File) => {
    setUploadingSceneId(_sceneId);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setLocalSceneImages((prev) => ({ ...prev, [_sceneId]: result }));
      }
      setUploadingSceneId(null);
    };
    reader.onerror = () => {
      console.warn("Bildvorschau konnte nicht geladen werden");
      setUploadingSceneId(null);
    };
    reader.readAsDataURL(file);
  };

  // ── Helpers ────────────────────────────────────────────────────

  const toggleSet = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /** Start inline editing a title. Copies current title into editValue. */
  const startEditing = useCallback((id: string, currentTitle: string) => {
    setEditingId(id);
    setEditValue(currentTitle || "");
    // Focus input after mount
    requestAnimationFrame(() => editInputRef.current?.focus());
  }, []);

  /** Commit inline edit: calls the appropriate update handler. */
  const commitEdit = useCallback(
    (kind: "act" | "sequence" | "scene", id: string) => {
      const trimmed = editValue.trim();
      if (!trimmed) {
        setEditingId(null);
        return;
      }
      switch (kind) {
        case "act":
          crud.handleUpdateAct(id, { title: trimmed });
          break;
        case "sequence":
          crud.handleUpdateSequence(id, { title: trimmed });
          break;
        case "scene":
          crud.handleUpdateScene(id, { title: trimmed });
          break;
      }
      setEditingId(null);
    },
    [editValue, crud],
  );

  const seqsByAct = useMemo(() => {
    if (!data) return new Map<string, Sequence[]>();
    const map = new Map<string, Sequence[]>();
    for (const s of data.sequences) {
      const k = s.actId ?? "";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [data]);

  const scenesBySeq = useMemo(() => {
    if (!data) return new Map<string, Scene[]>();
    const map = new Map<string, Scene[]>();
    for (const s of data.scenes) {
      const k = s.sequenceId ?? "";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return map;
  }, [data]);

  // ── Loading State ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Lade Audio-Hierarchie…
      </div>
    );
  }

  // ── Empty State with "+" Button ─────────────────────────────────
  if (!data || data.acts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-3">
        <p className="text-muted-foreground text-sm">
          Noch keine {crud.labelPluralFor("act")}.
        </p>
        <button
          type="button"
          onClick={() => void crud.handleAddAct()}
          disabled={crud.creating === "act"}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-700 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50"
        >
          {crud.creating === "act" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          {crud.labelFor("act")} hinzufügen
        </button>
      </div>
    );
  }

  // ── Main Render ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden gap-4 p-4">
      {/* Add Act Button */}
      <div className="flex justify-end shrink-0">
        <button
          type="button"
          onClick={() => void crud.handleAddAct()}
          disabled={crud.creating === "act"}
          className="inline-flex items-center gap-1.5 rounded-lg border-2 border-dashed border-blue-200 dark:border-blue-700 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors disabled:opacity-50"
        >
          {crud.creating === "act" ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Plus className="size-3" />
          )}
          {crud.labelFor("act")} hinzufügen
        </button>
      </div>

      {data.acts.map((act) => {
        const isExpanded = expandedActs.has(act.id);
        const actSeqs = seqsByAct.get(act.id) ?? [];
        const isEditingAct = editingId === act.id;
        const isPendingAct = crud.pendingIds.has(act.id);

        return (
          <div key={act.id}>
            <div
              className={cn(
                "border-2 rounded-lg bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-700 overflow-hidden",
                isPendingAct && "opacity-60 pointer-events-none",
              )}
            >
              {/* Act Header */}
              <div className="flex items-center gap-2 py-4 px-3">
                <GripVertical className="size-4 text-muted-foreground cursor-move flex-shrink-0" />
                <button
                  className="flex-shrink-0"
                  onClick={() => toggleSet(setExpandedActs, act.id)}
                  aria-label={isExpanded ? "Akt zuklappen" : "Akt aufklappen"}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>

                {/* Inline Editable Title */}
                {isEditingAct ? (
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit("act", act.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit("act", act.id);
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    className="flex-1 font-semibold text-[18px] text-[rgb(21,93,252)] bg-white dark:bg-black/30 border border-blue-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-blue-400"
                    aria-label="Akt-Titel bearbeiten"
                  />
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    className="flex-1 font-semibold text-[18px] text-[rgb(21,93,252)] cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleSet(setExpandedActs, act.id)}
                    onDoubleClick={() => startEditing(act.id, act.title || "")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") toggleSet(setExpandedActs, act.id);
                    }}
                  >
                    {act.actNumber}. {act.title || "Unbenannter Act"}
                  </span>
                )}

                <span className="text-xs text-muted-foreground">
                  {actSeqs.length} {crud.labelPluralFor("sequence")}
                </span>

                {/* Act Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="shrink-0 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors"
                      aria-label="Akt-Aktionen"
                    >
                      <MoreVertical className="size-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => startEditing(act.id, act.title || "")}
                    >
                      <Pencil className="size-3.5 mr-2" />
                      Umbenennen
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => void crud.handleDuplicateAct(act.id)}
                    >
                      <Copy className="size-3.5 mr-2" />
                      Duplizieren
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => void crud.handleDeleteAct(act.id)}
                    >
                      <Trash2 className="size-3.5 mr-2" />
                      Löschen
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Act Content */}
              {isExpanded && (
                <div className="px-2 pb-2 space-y-2">
                  {actSeqs.map((seq) => (
                    <SequenceCard
                      key={seq.id}
                      seq={seq}
                      isExpanded={expandedSeqs.has(seq.id)}
                      onToggle={() => toggleSet(setExpandedSeqs, seq.id)}
                      scenes={scenesBySeq.get(seq.id) ?? []}
                      expandedScenes={expandedScenes}
                      onToggleScene={(id) => toggleSet(setExpandedScenes, id)}
                      tracksByScene={data.tracksByScene}
                      clipsByScene={data.clipsByScene}
                      voiceAssignments={data.voiceAssignments}
                      playingTrackId={playingTrackId}
                      onPlayTrack={setPlayingTrackId}
                      localSceneImages={localSceneImages}
                      uploadingSceneId={uploadingSceneId}
                      onUploadSceneImage={handleSceneImageUpload}
                      onAddTrack={handleAddTrack}
                      labelSequence={crud.labelFor("sequence")}
                      labelScene={crud.labelFor("scene")}
                      labelScenePlural={crud.labelPluralFor("scene")}
                      onAddSequence={() => void crud.handleAddSequence(act.id)}
                      onUpdateSequence={(id, updates) =>
                        void crud.handleUpdateSequence(id, updates)
                      }
                      onDeleteSequence={(id) =>
                        void crud.handleDeleteSequence(id)
                      }
                      onDuplicateSequence={(id) =>
                        void crud.handleDuplicateSequence(id)
                      }
                      onAddScene={(seqId) => void crud.handleAddScene(seqId)}
                      onUpdateScene={(id, updates) =>
                        void crud.handleUpdateScene(id, updates)
                      }
                      onDeleteScene={(id) => void crud.handleDeleteScene(id)}
                      onDuplicateScene={(id) =>
                        void crud.handleDuplicateScene(id)
                      }
                      editingId={editingId}
                      editValue={editValue}
                      editInputRef={editInputRef}
                      onStartEditing={startEditing}
                      onEditValueChange={setEditValue}
                      onCommitEdit={commitEdit}
                      onCancelEdit={() => setEditingId(null)}
                      pendingIds={crud.pendingIds}
                      creatingSeqFor={crud.creating}
                    />
                  ))}

                  {/* Add Sequence Button */}
                  <button
                    type="button"
                    onClick={() => void crud.handleAddSequence(act.id)}
                    disabled={crud.creating === `sequence:${act.id}`}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30 rounded-lg border-2 border-dashed border-green-200 dark:border-green-700 transition-colors disabled:opacity-50"
                  >
                    {crud.creating === `sequence:${act.id}` ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    {crud.labelFor("sequence")} hinzufügen
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sequence Card (grün) ──────────────────────────────────────────

interface SequenceCardProps {
  seq: Sequence;
  isExpanded: boolean;
  onToggle: () => void;
  scenes: Scene[];
  expandedScenes: Set<string>;
  onToggleScene: (id: string) => void;
  tracksByScene: Record<string, AudioTrack[]>;
  voiceAssignments: Record<string, { voiceActorType?: string }>;
  playingTrackId: string | null;
  onPlayTrack: (id: string | null) => void;
  localSceneImages: Record<string, string>;
  uploadingSceneId: string | null;
  onUploadSceneImage: (sceneId: string, file: File) => void;
  onAddTrack: (sceneId: string, type: string) => void;
  clipsByScene?: Record<string, AudioClip[]>;
  // CRUD
  labelSequence: string;
  labelScene: string;
  labelScenePlural: string;
  onAddSequence: () => void;
  onUpdateSequence: (id: string, updates: Partial<Sequence>) => void;
  onDeleteSequence: (id: string) => void;
  onDuplicateSequence: (id: string) => void;
  onAddScene: (seqId: string) => void;
  onUpdateScene: (id: string, updates: Partial<Scene>) => void;
  onDeleteScene: (id: string) => void;
  onDuplicateScene: (id: string) => void;
  // Inline editing shared state (lifted from parent)
  editingId: string | null;
  editValue: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onStartEditing: (id: string, currentTitle: string) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: (kind: "act" | "sequence" | "scene", id: string) => void;
  onCancelEdit: () => void;
  pendingIds: Set<string>;
  creatingSeqFor: string | null;
}

function SequenceCard({
  seq,
  isExpanded,
  onToggle,
  scenes,
  expandedScenes,
  onToggleScene,
  tracksByScene,
  voiceAssignments,
  playingTrackId,
  onPlayTrack,
  localSceneImages,
  uploadingSceneId,
  onUploadSceneImage,
  onAddTrack,
  clipsByScene,
  labelSequence,
  labelScene,
  labelScenePlural,
  onAddSequence: _onAddSequence,
  onUpdateSequence,
  onDeleteSequence,
  onDuplicateSequence,
  onAddScene,
  onUpdateScene,
  onDeleteScene,
  onDuplicateScene,
  editingId,
  editValue,
  editInputRef,
  onStartEditing,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  pendingIds,
  creatingSeqFor,
}: SequenceCardProps) {
  const isEditingSeq = editingId === seq.id;
  const isPendingSeq = pendingIds.has(seq.id);

  return (
    <div
      className={cn(
        "border-2 rounded-lg bg-green-50 border-green-200 dark:bg-green-950/40 dark:border-green-700 overflow-hidden",
        isPendingSeq && "opacity-60 pointer-events-none",
      )}
    >
      {/* Sequence Header */}
      <div className="flex items-center gap-2 p-2">
        <GripVertical className="size-3 text-muted-foreground cursor-move flex-shrink-0" />
        <button
          className="flex-shrink-0"
          onClick={onToggle}
          aria-label={isExpanded ? "Sequenz zuklappen" : "Sequenz aufklappen"}
        >
          {isExpanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>

        {/* Inline Editable Title */}
        {isEditingSeq ? (
          <input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onBlur={() => onCommitEdit("sequence", seq.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitEdit("sequence", seq.id);
              if (e.key === "Escape") onCancelEdit();
            }}
            className="flex-1 text-sm font-semibold text-[14px] text-[rgb(0,166,62)] bg-white dark:bg-black/30 border border-green-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-green-400"
            aria-label="Sequenz-Titel bearbeiten"
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            className="flex-1 text-sm font-semibold text-[14px] text-[rgb(0,166,62)] cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onToggle}
            onDoubleClick={() => onStartEditing(seq.id, seq.title || "")}
            onKeyDown={(e) => {
              if (e.key === "Enter") onToggle();
            }}
          >
            {seq.sequenceNumber}. {seq.title || `Unbenannte ${labelSequence}`}
          </span>
        )}

        <span className="text-xs text-muted-foreground">
          {scenes.length} {labelScenePlural}
        </span>

        {/* Sequence Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="shrink-0 p-1 rounded hover:bg-green-100 dark:hover:bg-green-800/40 transition-colors"
              aria-label="Sequenz-Aktionen"
            >
              <MoreVertical className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onStartEditing(seq.id, seq.title || "")}
            >
              <Pencil className="size-3.5 mr-2" />
              Umbenennen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicateSequence(seq.id)}>
              <Copy className="size-3.5 mr-2" />
              Duplizieren
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteSequence(seq.id)}
            >
              <Trash2 className="size-3.5 mr-2" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Sequence Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              isExpanded={expandedScenes.has(scene.id)}
              onToggle={() => onToggleScene(scene.id)}
              tracks={tracksByScene[scene.id] ?? []}
              voiceAssignments={voiceAssignments}
              playingTrackId={playingTrackId}
              onPlayTrack={onPlayTrack}
              localImageUrl={localSceneImages[scene.id]}
              isUploading={uploadingSceneId === scene.id}
              onUploadImage={(file) => onUploadSceneImage(scene.id, file)}
              onAddTrack={(type) => onAddTrack(scene.id, type)}
              labelScene={labelScene}
              clips={clipsByScene?.[scene.id] ?? []}
              editingId={editingId}
              editValue={editValue}
              editInputRef={editInputRef}
              onStartEditing={onStartEditing}
              onEditValueChange={onEditValueChange}
              onCommitEdit={onCommitEdit}
              onCancelEdit={onCancelEdit}
              onUpdateScene={onUpdateScene}
              onDeleteScene={onDeleteScene}
              onDuplicateScene={onDuplicateScene}
              pendingIds={pendingIds}
            />
          ))}

          {/* Add Scene Button */}
          <button
            type="button"
            onClick={() => onAddScene(seq.id)}
            disabled={creatingSeqFor === `scene:${seq.id}`}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-950/30 rounded-lg border-2 border-dashed border-pink-200 dark:border-pink-700 transition-colors disabled:opacity-50"
          >
            {creatingSeqFor === `scene:${seq.id}` ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Plus className="size-3" />
            )}
            {labelScene} hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Scene Card (pink) ─────────────────────────────────────────────

interface SceneCardProps {
  scene: Scene;
  isExpanded: boolean;
  onToggle: () => void;
  tracks: AudioTrack[];
  voiceAssignments: Record<string, { voiceActorType?: string }>;
  playingTrackId: string | null;
  onPlayTrack: (id: string | null) => void;
  localImageUrl?: string;
  isUploading: boolean;
  onUploadImage: (file: File) => void;
  onAddTrack: (type: string) => void;
  labelScene: string;
  // Inline editing
  editingId: string | null;
  editValue: string;
  editInputRef: React.RefObject<HTMLInputElement | null>;
  onStartEditing: (id: string, currentTitle: string) => void;
  onEditValueChange: (value: string) => void;
  onCommitEdit: (kind: "act" | "sequence" | "scene", id: string) => void;
  onCancelEdit: () => void;
  // CRUD
  onUpdateScene: (id: string, updates: Partial<Scene>) => void;
  onDeleteScene: (id: string) => void;
  onDuplicateScene: (id: string) => void;
  pendingIds: Set<string>;
  // T32: Clips from project-wide batch (no per-scene N+1)
  clips: AudioClip[];
}

function SceneCard({
  scene,
  isExpanded,
  onToggle,
  tracks,
  voiceAssignments,
  playingTrackId,
  onPlayTrack,
  localImageUrl,
  isUploading,
  onUploadImage,
  onAddTrack,
  labelScene,
  editingId,
  editValue,
  editInputRef,
  onStartEditing,
  onEditValueChange,
  onCommitEdit,
  onCancelEdit,
  onUpdateScene,
  onDeleteScene,
  onDuplicateScene,
  pendingIds,
  clips,
}: SceneCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTrackType, setNewTrackType] = useState<
    "dialog" | "narrator" | "music" | "sfx" | "atmo"
  >("dialog");
  const imageUrl = localImageUrl || scene.imageUrl;
  const isEditingScene = editingId === scene.id;
  const isPendingScene = pendingIds.has(scene.id);

  const grouped = useMemo(() => {
    const g: Record<string, AudioTrack[]> = {
      dialog: [],
      narrator: [],
      music: [],
      sfx: [],
      atmo: [],
    };
    for (const t of tracks) g[t.type]?.push(t);
    return g;
  }, [tracks]);

  return (
    <div
      className={cn(
        "border-2 rounded-lg bg-pink-50 border-pink-200 dark:bg-pink-950/40 dark:border-pink-700 overflow-hidden",
        isPendingScene && "opacity-60 pointer-events-none",
      )}
    >
      {/* Scene Header */}
      <div className="flex items-center gap-2 p-2">
        <GripVertical className="size-3 text-muted-foreground cursor-move flex-shrink-0" />
        <button
          className="flex-shrink-0"
          onClick={onToggle}
          aria-label={isExpanded ? "Szene zuklappen" : "Szene aufklappen"}
        >
          {isExpanded ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronRight className="size-3.5" />
          )}
        </button>

        {/* Inline Editable Title */}
        {isEditingScene ? (
          <input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            onBlur={() => onCommitEdit("scene", scene.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitEdit("scene", scene.id);
              if (e.key === "Escape") onCancelEdit();
            }}
            className="flex-1 text-xs font-semibold text-[14px] text-[rgb(230,0,118)] bg-white dark:bg-black/30 border border-pink-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-pink-400"
            aria-label="Szene-Titel bearbeiten"
          />
        ) : (
          <span
            role="button"
            tabIndex={0}
            className="flex-1 text-xs font-semibold text-[14px] text-[rgb(230,0,118)] cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onToggle}
            onDoubleClick={() => onStartEditing(scene.id, scene.title || "")}
            onKeyDown={(e) => {
              if (e.key === "Enter") onToggle();
            }}
          >
            #{scene.sceneNumber} {scene.title || `Unbenannte ${labelScene}`}
          </span>
        )}

        <span className="text-xs text-muted-foreground">
          {tracks.length} Tracks
        </span>

        {/* Scene Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="shrink-0 p-1 rounded hover:bg-pink-100 dark:hover:bg-pink-800/40 transition-colors"
              aria-label="Szene-Aktionen"
            >
              <MoreVertical className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onStartEditing(scene.id, scene.title || "")}
            >
              <Pencil className="size-3.5 mr-2" />
              Umbenennen
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicateScene(scene.id)}>
              <Copy className="size-3.5 mr-2" />
              Duplizieren
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDeleteScene(scene.id)}
            >
              <Trash2 className="size-3.5 mr-2" />
              Löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scene Content */}
      {isExpanded && (
        <div className="px-2 pb-2 space-y-2">
          {/* Szene-Bild */}
          <label className="block">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadImage(file);
                e.target.value = "";
              }}
            />
            <div
              className="relative rounded-[5px] w-full max-w-md mx-auto flex items-center justify-center cursor-pointer aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20"
              style={
                imageUrl
                  ? {
                      backgroundImage: `url(${imageUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      backgroundBlendMode: "overlay",
                    }
                  : {}
              }
              onClick={() => fileInputRef.current?.click()}
            >
              {!imageUrl && !isUploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <Camera className="size-8 text-primary/40" />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-xs text-primary/60">
                      Bild hochladen
                    </span>
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm">
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <span className="mt-2 text-xs text-primary font-medium">
                    Hochladen…
                  </span>
                </div>
              )}

              {imageUrl && !isUploading && (
                <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/50 text-white text-[10px]">
                  Szene
                </div>
              )}
            </div>
          </label>

          {/* Audio Tracks */}
          {tracks.length === 0 ? (
            <div className="flex items-center justify-center p-3 text-xs text-muted-foreground border-2 border-dashed border-pink-200 dark:border-pink-700 rounded-lg">
              Keine Audio-Tracks vorhanden
            </div>
          ) : (
            <div className="space-y-1.5">
              <TrackGroup
                type="dialog"
                tracks={grouped.dialog}
                clips={clips}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
              <TrackGroup
                type="narrator"
                tracks={grouped.narrator}
                clips={clips}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
              <TrackGroup
                type="sfx"
                tracks={grouped.sfx}
                clips={clips}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
              <TrackGroup
                type="music"
                tracks={grouped.music}
                clips={clips}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
              <TrackGroup
                type="atmo"
                tracks={grouped.atmo}
                clips={clips}
                voiceAssignments={voiceAssignments}
                playingTrackId={playingTrackId}
                onPlayTrack={onPlayTrack}
              />
            </div>
          )}

          {/* Add Track Button */}
          <div className="flex items-center gap-2 mt-1">
            <select
              value={newTrackType}
              onChange={(e) =>
                setNewTrackType(e.target.value as typeof newTrackType)
              }
              aria-label="Track-Typ wählen"
              className="shrink-0 max-w-[10.5rem] cursor-pointer rounded-lg border border-dashed border-pink-200 bg-transparent py-1.5 pl-2 pr-1 text-xs text-muted-foreground transition-colors hover:bg-pink-100 hover:text-foreground dark:border-pink-700 dark:hover:bg-pink-900/30"
            >
              <option value="dialog">🎭 Dialog</option>
              <option value="narrator">📖 Erzähler</option>
              <option value="music">🎵 Musik</option>
              <option value="sfx">🔊 SFX</option>
              <option value="atmo">🌊 Atmo</option>
            </select>
            <button
              type="button"
              onClick={() => onAddTrack(newTrackType)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-pink-100 dark:hover:bg-pink-900/30 rounded-lg border border-dashed border-pink-200 dark:border-pink-700 transition-colors"
            >
              <Plus className="size-3.5" />
              Track hinzufügen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Track Group ─────────────────────────────────────────────────

function TrackGroup({
  type,
  tracks,
  voiceAssignments,
  playingTrackId,
  onPlayTrack,
  clips,
}: {
  type: string;
  tracks: AudioTrack[];
  voiceAssignments: Record<string, { voiceActorType?: string }>;
  playingTrackId: string | null;
  onPlayTrack: (id: string | null) => void;
  clips?: { id: string; trackId: string }[];
}) {
  const label =
    type === "dialog"
      ? "Dialog"
      : type === "narrator"
        ? "Erzähler"
        : type === "music"
          ? "Musik"
          : type === "sfx"
            ? "SFX"
            : "Atmo";

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        <span
          className={cn(
            "w-2 h-2 rounded-full",
            TRACK_COLOR[type] || "bg-gray-500",
          )}
        />
        <span>{label}</span>
        <span className="text-[9px] text-muted-foreground/60 normal-case ml-1">
          ({tracks.length})
        </span>
      </div>
      {tracks.length === 0 ? (
        <div className="text-[10px] text-muted-foreground/50 px-2 py-1 italic">
          Noch keine {label}-Tracks
        </div>
      ) : (
        tracks.map((track) => (
          <TrackItem
            key={track.id}
            track={track}
            voiceAssignments={voiceAssignments}
            isPlaying={playingTrackId === track.id}
            onPlay={() =>
              onPlayTrack(playingTrackId === track.id ? null : track.id)
            }
            clips={clips}
          />
        ))
      )}
    </div>
  );
}

// ─── Track Item ──────────────────────────────────────────────────

function TrackItem({
  track,
  voiceAssignments,
  isPlaying,
  onPlay,
  clips,
}: {
  track: AudioTrack;
  voiceAssignments: Record<string, { voiceActorType?: string }>;
  isPlaying: boolean;
  onPlay: () => void;
  clips?: { id: string; trackId: string }[];
}) {
  const va = track.characterId ? voiceAssignments[track.characterId] : null;
  const isTTS = va?.voiceActorType === "tts";
  const trackClips = clips?.filter((c) => c.trackId === track.id) ?? [];
  const clipId = trackClips.length === 1 ? trackClips[0].id : undefined;
  // TTS mutiert exakt einen Clip; bei 0 oder >1 Clips ist das Ziel unklar
  const isAmbiguous = trackClips.length !== 1;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/80 dark:bg-black/20 border border-pink-100 dark:border-pink-800/50 hover:border-pink-300 dark:hover:border-pink-600 transition-colors group">
      <button
        onClick={onPlay}
        className={cn(
          "shrink-0 p-1 rounded-full transition-colors",
          isPlaying
            ? "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400"
            : "bg-pink-100 text-pink-600 dark:bg-pink-900/40 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-800/40",
        )}
        aria-label={isPlaying ? "Pause" : "Abspielen"}
      >
        {isPlaying ? <Pause className="size-3" /> : <Play className="size-3" />}
      </button>

      <span
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          TRACK_COLOR[track.type] || "bg-gray-500",
        )}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">
            {track.content || "(leer)"}
          </span>
          {track.characterId && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-[9px] px-1 py-px rounded",
                isTTS
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
              )}
            >
              {isTTS ? (
                <Bot className="size-2.5" />
              ) : (
                <User className="size-2.5" />
              )}
              {isTTS ? "KI" : "Voice"}
            </span>
          )}
        </div>
        {(track.audioDuration ?? 0) > 0 &&
          !FEATURE_FLAGS.audioClipSystem.enabled && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="size-2.5" />
              {formatSec(track.audioDuration ?? 0)}
            </div>
          )}
        {FEATURE_FLAGS.audioClipSystem.enabled && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground italic">
            Zeit wird in Clip verwaltet
          </div>
        )}
      </div>

      {/* Overflow + TTS — sichtbar bei Hover und Focus-within (WCAG 2.2 AA Tastatur-/Touch-Zugaenglichkeit) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {isTTS && FEATURE_FLAGS.audioClipSystem.enabled && (
          <TtsGenerateButton
            trackId={track.id}
            sceneId={track.sceneId}
            clipId={clipId}
            text={track.content || ""}
            voiceId={track.ttsVoiceId}
            hasTTS={isTTS}
            isAmbiguous={isAmbiguous}
          />
        )}
        <button
          className="shrink-0 p-1 rounded hover:bg-muted/50 transition-colors"
          aria-label="Weitere Aktionen"
          title="Weitere Aktionen"
        >
          <MoreVertical
            className="size-3 text-muted-foreground"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default AudioDropdown;
