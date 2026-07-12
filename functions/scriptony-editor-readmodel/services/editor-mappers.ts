/**
 * Editor-readmodel pure mapper functions (S from SOLID, DRY).
 *
 * No side effects, no I/O.
 */

type JsonRecord = Record<string, unknown>;

export {
  buildTimeline,
  stripContentFromNodes,
  type Timeline,
} from "../../_shared/timeline";

export function mapScriptBlock(b: JsonRecord): JsonRecord {
  return {
    id: b.id,
    scriptId: b.script_id ?? null,
    type: b.type ?? null,
    content: b.content ?? null,
    speakerCharacterId: b.speaker_character_id ?? null,
    orderIndex: b.order_index ?? 0,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

export function mapSceneAudioTrack(t: JsonRecord): JsonRecord {
  return {
    id: t.id,
    sceneId: t.scene_id ?? null,
    projectId: t.project_id ?? null,
    type: t.type ?? null,
    content: t.content ?? null,
    characterId: t.character_id ?? null,
    audioFileId: t.audio_file_id ?? null,
    orderIndex: t.order_index ?? 0,
    startTime: t.start_time ?? null,
    endTime: t.end_time ?? null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

export function mapAsset(a: JsonRecord): JsonRecord {
  return {
    id: a.id,
    ownerType: a.owner_type ?? null,
    ownerId: a.owner_id ?? null,
    mediaType: a.media_type ?? null,
    purpose: a.purpose ?? null,
    fileId: a.file_id ?? null,
    filename: a.filename ?? null,
    mimeType: a.mime_type ?? null,
    size: a.size ?? null,
    status: a.status ?? null,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

export function mapStyleSummary(
  style: JsonRecord | null,
  items: JsonRecord[],
): JsonRecord | null {
  if (!style) return null;
  return {
    id: style.id,
    projectId: style.project_id ?? null,
    name: style.name ?? null,
    description: style.description ?? null,
    items: items.map((item) => ({
      id: item.id,
      category: item.category ?? null,
      label: item.label ?? null,
      value: item.value ?? null,
      imageUrl: item.image_url ?? null,
      orderIndex: item.order_index ?? 0,
    })),
  };
}

export function buildProject(p: JsonRecord): JsonRecord {
  return {
    id: p.id,
    title: p.title,
    type: p.type,
    logline: p.logline ?? undefined,
    genre: p.genre ?? undefined,
    duration: p.duration ?? undefined,
    coverImageUrl: p.cover_image_url ?? undefined,
    narrativeStructure: p.narrative_structure ?? undefined,
    beatTemplate: p.beat_template ?? undefined,
    episodeLayout: p.episode_layout ?? undefined,
    seasonEngine: p.season_engine ?? undefined,
    worldId: p.world_id ?? undefined,
    isDeleted: p.is_deleted ?? false,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}
