/**
 * Local Project Schema — SQLite DDL and version management.
 *
 * T37: Defines the local SQLite schema for Scriptony projects.
 * The DDL is stored as a constant so it can be applied when a
 * new .scriptony/database.sqlite is created (T38 will add actual
 * read/write). Schema version enables future migrations.
 *
 * Location: src/local/project-schema.ts
 */

// ── Schema version ───────────────────────────────────────────────────────────

/**
 * Current schema version. Bumped when tables or columns are added/changed.
 * Migrations run from the current version to SCHEMA_VERSION.
 */
export const SCHEMA_VERSION = 8;

/** Table holding schema version metadata inside each local database. */
export const SCHEMA_META_TABLE = "schema_meta";

// ── Table names ──────────────────────────────────────────────────────────────

export const TABLE = {
  PROJECTS: "projects",
  PROJECT_NODES: "project_nodes",
  SCRIPT_BLOCKS: "script_blocks",
  CHARACTERS: "characters",
  WORLD_ITEMS: "world_items",
  SCENE_AUDIO_TRACKS: "scene_audio_tracks",
  AUDIO_CLIPS: "audio_clips",
  ASSETS: "assets",
  JOBS: "jobs",
  CHANGE_LOG: "change_log",
  SCHEMA_META: SCHEMA_META_TABLE,
  STORY_BEATS: "story_beats",
  MVE_LINES: "mve_lines",
  MVE_VOICE_PROFILES: "mve_voice_profiles",
  MVE_AUDIO_JOBS: "mve_audio_jobs",
  MVE_TAKES: "mve_takes",
  MVE_LANE_LINKS: "mve_lane_links",
  MVE_VOICE_CONSENTS: "mve_voice_consents",
  MVE_VOICE_REQUESTS: "mve_voice_requests",
} as const;

export type TableName = (typeof TABLE)[keyof typeof TABLE];

// ── MVE tables (schema v4) ───────────────────────────────────────────────────

export const MVE_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${TABLE.MVE_LINES} (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  scene_id         TEXT NOT NULL,
  order_index      INTEGER NOT NULL DEFAULT 0,
  line_type        TEXT NOT NULL DEFAULT 'dialogue',
  character_id     TEXT,
  text             TEXT,
  direction_json   TEXT,
  selected_take_id TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',
  audio_clip_id    TEXT,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_lines_project ON ${TABLE.MVE_LINES}(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_lines_scene ON ${TABLE.MVE_LINES}(scene_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mve_lines_audio_clip ON ${TABLE.MVE_LINES}(audio_clip_id) WHERE audio_clip_id IS NOT NULL AND deleted_at IS NULL`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.MVE_VOICE_PROFILES} (
  id                    TEXT PRIMARY KEY,
  project_id            TEXT NOT NULL,
  user_id               TEXT NOT NULL DEFAULT 'local-user',
  character_id          TEXT,
  name                  TEXT NOT NULL,
  language              TEXT NOT NULL DEFAULT 'de',
  engine                TEXT NOT NULL DEFAULT 'elevenlabs',
  profile_type          TEXT NOT NULL DEFAULT 'default',
  status                TEXT NOT NULL DEFAULT 'draft',
  base_voice_id         TEXT,
  reference_audio_url   TEXT,
  description           TEXT,
  design_spec_json      TEXT,
  creation_mode         TEXT,
  provider              TEXT,
  model                 TEXT,
  identity_prompt       TEXT,
  reference_audio_asset_id TEXT,
  reference_text        TEXT,
  clone_prompt_asset_id TEXT,
  attributes_json       TEXT,
  default_settings_json TEXT,
  consent_status        TEXT NOT NULL DEFAULT 'not_required',
  commercial_use_allowed INTEGER NOT NULL DEFAULT 0,
  preview_text          TEXT,
  version               INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  deleted_at            TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_voice_profiles_project ON ${TABLE.MVE_VOICE_PROFILES}(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_voice_profiles_character ON ${TABLE.MVE_VOICE_PROFILES}(project_id, character_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.MVE_LANE_LINKS} (
  id                    TEXT PRIMARY KEY,
  project_id            TEXT NOT NULL,
  character_id          TEXT NOT NULL,
  target_container_id   TEXT NOT NULL,
  target_container_type TEXT NOT NULL DEFAULT 'scene',
  enabled               INTEGER NOT NULL DEFAULT 1,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  deleted_at            TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_lane_links_project ON ${TABLE.MVE_LANE_LINKS}(project_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_mve_lane_links_character ON ${TABLE.MVE_LANE_LINKS}(project_id, character_id) WHERE deleted_at IS NULL`,
];

/** Idempotent DDL for schema v6 (MVE voice studio: consent + requests). */
export const MVE_VOICE_STUDIO_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${TABLE.MVE_VOICE_CONSENTS} (
  id                      TEXT PRIMARY KEY,
  project_id              TEXT NOT NULL,
  voice_id                TEXT NOT NULL,
  user_id                 TEXT NOT NULL DEFAULT 'local-user',
  consent_text_version    TEXT NOT NULL,
  consent_confirmed_at    TEXT NOT NULL,
  source_audio_hash       TEXT,
  commercial_use_allowed  INTEGER NOT NULL DEFAULT 0,
  consent_status          TEXT NOT NULL DEFAULT 'verified',
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  deleted_at              TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_voice_consents_project ON ${TABLE.MVE_VOICE_CONSENTS}(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_voice_consents_voice ON ${TABLE.MVE_VOICE_CONSENTS}(voice_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.MVE_VOICE_REQUESTS} (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL,
  voice_profile_id  TEXT,
  operation_type    TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  input_json        TEXT NOT NULL,
  error_message     TEXT,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  deleted_at        TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_voice_requests_project ON ${TABLE.MVE_VOICE_REQUESTS}(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_voice_requests_voice ON ${TABLE.MVE_VOICE_REQUESTS}(voice_profile_id)`,
];

/** Schema v7 — structured voice design spec on MVE voice profiles. */
export const MIGRATION_V7_STATEMENTS: readonly string[] = [
  `ALTER TABLE ${TABLE.MVE_VOICE_PROFILES} ADD COLUMN design_spec_json TEXT`,
];

/** Schema v8 — voice identity fields (creationMode, provider, clone assets). */
export const MIGRATION_V8_STATEMENTS: readonly string[] = [
  `ALTER TABLE ${TABLE.MVE_VOICE_PROFILES} ADD COLUMN creation_mode TEXT`,
  `ALTER TABLE ${TABLE.MVE_VOICE_PROFILES} ADD COLUMN provider TEXT`,
  `ALTER TABLE ${TABLE.MVE_VOICE_PROFILES} ADD COLUMN model TEXT`,
  `ALTER TABLE ${TABLE.MVE_VOICE_PROFILES} ADD COLUMN identity_prompt TEXT`,
  `ALTER TABLE ${TABLE.MVE_VOICE_PROFILES} ADD COLUMN reference_audio_asset_id TEXT`,
  `ALTER TABLE ${TABLE.MVE_VOICE_PROFILES} ADD COLUMN reference_text TEXT`,
  `ALTER TABLE ${TABLE.MVE_VOICE_PROFILES} ADD COLUMN clone_prompt_asset_id TEXT`,
];

/** Idempotent DDL for schema v5 (MVE render jobs + takes). */
export const MVE_RENDER_SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${TABLE.MVE_AUDIO_JOBS} (
  id                    TEXT PRIMARY KEY,
  project_id            TEXT NOT NULL,
  line_id               TEXT NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pending',
  engine                TEXT NOT NULL,
  take_count            INTEGER NOT NULL DEFAULT 1,
  script_snapshot_json  TEXT NOT NULL,
  error_message         TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,
  deleted_at            TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_audio_jobs_project ON ${TABLE.MVE_AUDIO_JOBS}(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_audio_jobs_line ON ${TABLE.MVE_AUDIO_JOBS}(line_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.MVE_TAKES} (
  id                      TEXT PRIMARY KEY,
  project_id              TEXT NOT NULL,
  line_id                 TEXT NOT NULL,
  job_id                  TEXT NOT NULL,
  take_index              INTEGER NOT NULL DEFAULT 0,
  audio_path              TEXT,
  duration_ms             INTEGER,
  render_settings_json    TEXT,
  direction_snapshot_json TEXT,
  is_selected             INTEGER NOT NULL DEFAULT 0,
  status                  TEXT NOT NULL DEFAULT 'processing',
  created_at              TEXT NOT NULL,
  updated_at              TEXT NOT NULL,
  deleted_at              TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE,
  FOREIGN KEY (job_id) REFERENCES ${TABLE.MVE_AUDIO_JOBS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_takes_line ON ${TABLE.MVE_TAKES}(line_id)`,
  `CREATE INDEX IF NOT EXISTS idx_mve_takes_job ON ${TABLE.MVE_TAKES}(job_id)`,
];

// ── DDL (SCHEMA_STATEMENTS is the single source of truth) ─────────────────

/** Ordered SQL statements for initial schema setup. */
export const SCHEMA_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS ${SCHEMA_META_TABLE} (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
)`,
  `INSERT OR IGNORE INTO ${SCHEMA_META_TABLE} (key, value) VALUES ('version', '${SCHEMA_VERSION}')`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.PROJECTS} (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT      DEFAULT '',
  project_type TEXT     DEFAULT 'film',
  user_id     TEXT NOT NULL DEFAULT 'local-user',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  version     INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'local'
)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.PROJECT_NODES} (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  parent_id   TEXT,
  node_type   TEXT NOT NULL,
  label       TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  metadata    TEXT      DEFAULT '{}',
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_nodes_project ON ${TABLE.PROJECT_NODES}(project_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.SCRIPT_BLOCKS} (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  node_id     TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  format      TEXT NOT NULL DEFAULT 'fountain',
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  deleted_at  TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_scripts_project ON ${TABLE.SCRIPT_BLOCKS}(project_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.CHARACTERS} (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  name          TEXT NOT NULL,
  role           TEXT      DEFAULT 'supporting',
  description   TEXT      DEFAULT '',
  age            INTEGER,
  image_url      TEXT,
  traits_json    TEXT      DEFAULT '[]',
  backstory      TEXT      DEFAULT '',
  gender         TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_characters_project ON ${TABLE.CHARACTERS}(project_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.WORLD_ITEMS} (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  category      TEXT NOT NULL,
  title         TEXT NOT NULL,
  content       TEXT NOT NULL DEFAULT '',
  tags_json     TEXT      DEFAULT '[]',
  image_url     TEXT,
  metadata_json TEXT      DEFAULT '{}',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  deleted_at    TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_world_project ON ${TABLE.WORLD_ITEMS}(project_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.SCENE_AUDIO_TRACKS} (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL,
  scene_id       TEXT NOT NULL,
  track_type     TEXT NOT NULL,
  content        TEXT      DEFAULT '',
  character_id   TEXT,
  voice_id       TEXT,
  voice_settings TEXT      DEFAULT '{}',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  deleted_at     TEXT,
  version        INTEGER NOT NULL DEFAULT 1,
  sync_status    TEXT NOT NULL DEFAULT 'local',
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_audio_tracks_scene ON ${TABLE.SCENE_AUDIO_TRACKS}(scene_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.AUDIO_CLIPS} (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  track_id         TEXT,
  scene_id         TEXT NOT NULL,
  clip_type        TEXT NOT NULL DEFAULT 'clip',
  content          TEXT,
  local_audio_path TEXT,
  cloud_audio_file_id TEXT,
  start_sec        REAL NOT NULL,
  end_sec          REAL NOT NULL,
  duration_sec     REAL,
  waveform_json    TEXT,
  lane_index       INTEGER NOT NULL DEFAULT 0,
  order_index      INTEGER NOT NULL DEFAULT 0,
  fx_preset_id     TEXT,
  volume           REAL NOT NULL DEFAULT 1.0,
  pan              REAL NOT NULL DEFAULT 0.0,
  mute             INTEGER NOT NULL DEFAULT 0,
  solo             INTEGER NOT NULL DEFAULT 0,
  cross_scene      INTEGER NOT NULL DEFAULT 0,
  metadata_json    TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT,
  version          INTEGER NOT NULL DEFAULT 1,
  sync_status      TEXT NOT NULL DEFAULT 'local',
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_clips_project ON ${TABLE.AUDIO_CLIPS}(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_clips_scene ON ${TABLE.AUDIO_CLIPS}(scene_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.ASSETS} (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL,
  asset_type       TEXT NOT NULL,
  local_path       TEXT,
  cloud_file_id    TEXT,
  mime_type        TEXT,
  file_size_bytes  INTEGER,
  metadata_json    TEXT DEFAULT '{}',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL,
  deleted_at       TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_assets_project ON ${TABLE.ASSETS}(project_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.JOBS} (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  job_type     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',
  payload_json TEXT NOT NULL DEFAULT '{}',
  result_json  TEXT,
  error        TEXT,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_jobs_project ON ${TABLE.JOBS}(project_id)`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.CHANGE_LOG} (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL,
  entity_type   TEXT NOT NULL,
  entity_id     TEXT NOT NULL,
  operation     TEXT NOT NULL,
  payload_json  TEXT NOT NULL,
  device_id     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  synced_at     TEXT,
  FOREIGN KEY (project_id) REFERENCES ${TABLE.PROJECTS}(id) ON DELETE CASCADE
)`,
  `CREATE INDEX IF NOT EXISTS idx_changelog_project ON ${TABLE.CHANGE_LOG}(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_changelog_unsynced ON ${TABLE.CHANGE_LOG}(synced_at) WHERE synced_at IS NULL`,
  `CREATE TABLE IF NOT EXISTS ${TABLE.STORY_BEATS} (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL,
  user_id      TEXT NOT NULL,
  label        TEXT NOT NULL,
  template_abbr TEXT,
  description  TEXT,
  from_container_id TEXT,
  to_container_id   TEXT,
  pct_from     REAL,
  pct_to       REAL,
  color        TEXT,
  notes        TEXT,
  order_index  INTEGER DEFAULT 0,
  deleted_at   TEXT,
  created_at   TEXT,
  updated_at   TEXT
)`,
  ...MVE_SCHEMA_STATEMENTS,
  ...MVE_RENDER_SCHEMA_STATEMENTS,
  ...MVE_VOICE_STUDIO_SCHEMA_STATEMENTS,
];

/**
 * Full initial SQLite schema (derived from SCHEMA_STATEMENTS).
 */
export const INITIAL_SCHEMA_DDL = SCHEMA_STATEMENTS.map((s) => `${s};`).join(
  "\n\n",
);

// ── Schema version check ────────────────────────────────────────────────────

/**
 * Validate that the given DDL contains all expected tables.
 * Used in tests and startup checks.
 */
export const EXPECTED_TABLES = new Set(Object.values(TABLE));

/**
 * Check that all expected table names are present in the DDL.
 * Returns missing table names, or an empty set if all are present.
 */
export function missingTables(ddl: string): Set<string> {
  const missing = new Set<string>();
  for (const table of EXPECTED_TABLES) {
    if (
      !ddl.includes(`CREATE TABLE IF NOT EXISTS ${table}`) &&
      !ddl.includes(`CREATE TABLE IF NOT EXISTS "${table}"`)
    ) {
      missing.add(table);
    }
  }
  return missing;
}

/**
 * Ordered SQL statements for initial schema setup (no semicolon splitting).
 * Used by database-init.ts when creating database.sqlite.
 */
