/**
 * Shared TypeScript Type Definitions
 *
 * Centralized type definitions used across the application.
 * Organized by domain — see individual modules under this folder.
 */

export type { UserRole, User, AuthSession } from "./auth";
export type { Organization } from "./organization";
export type {
  Project,
  Episode,
  Character,
  Scene,
  Act,
  Sequence,
} from "./project";
export type {
  AudioTrackType,
  AudioTrack,
  AudioClip,
  BaseClip,
  RecordingSession,
  RecordingParticipant,
  CharacterVoiceAssignment,
  ShotAudio,
} from "./audio";
export { LANE_SCHEMA, WPM_DEFAULTS } from "./audio";
export type { Clip, Shot } from "./film";
export type {
  RenderJobStatus,
  ReviewStatus,
  RenderJob,
  FreshnessStatus,
  ShotFreshnessResult,
} from "./render";
export type {
  World,
  WorldCategoryType,
  WorldCategory,
  WorldItem,
} from "./world";
export type {
  Challenge,
  ArtForm,
  Exercise,
  TrainingPlan,
  Achievement,
} from "./creative-gym";
export type { ScriptUpload, ScriptAnalysis } from "./script";
export type {
  ListResponse,
  SingleResponse,
  CreateResponse,
  UpdateResponse,
  DeleteResponse,
  ErrorResponse,
} from "./api-responses";
export type { Stats, Analytics } from "./stats";

export type { AudioTimelineData } from "./audio-timeline";
