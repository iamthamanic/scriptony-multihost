/**
 * Projects, scriptwriting hierarchy, and character/scene types.
 */

export interface Project {
  id: string;
  title: string;
  description: string;
  genre?: string;
  format?: "film" | "series" | "short" | "webseries" | "other";
  status?: "draft" | "in-progress" | "completed";
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  // Narrative Structure (Film/Book/Audio)
  narrative_structure?: string;
  // Episode/Season Structure (Series only)
  episode_layout?: string;
  season_engine?: string;
  // Story Beat Template (All types)
  beat_template?: string;
  // Relations
  episodeCount?: number;
  characterCount?: number;
  sceneCount?: number;
}

export interface Episode {
  id: string;
  projectId: string;
  number: number;
  title: string;
  description?: string;
  duration?: number;
  status?: "outline" | "draft" | "revision" | "final";
  createdAt: string;
  updatedAt: string;
  // Relations
  sceneCount?: number;
}

export interface Character {
  id: string;
  projectId: string;
  name: string;
  role?: "protagonist" | "antagonist" | "supporting" | "minor";
  description?: string;
  age?: number;
  imageUrl?: string;
  /** Zusätzliche Referenzbilder (URLs oder data URLs), aus `reference_images_json` */
  referenceImageUrls?: string[];
  traits?: string[];
  backstory?: string;
  /** Extended profile fields (UI / imports). */
  gender?: string;
  species?: string;
  skills?: string[];
  strengths?: string[];
  weaknesses?: string[];
  personality?: string;
  createdAt: string;
  updatedAt: string;
  // Legacy snake_case — mapped to imageUrl at API ingestion. Do NOT send to Appwrite.
  // image_url?: string;
  updated_at?: string;
}

export interface Scene {
  id: string;
  projectId: string;
  episodeId?: string;
  sequenceId?: string; // NEW: Zuordnung zu Sequence
  actId?: string; // Legacy/Optional
  /** Backend node metadata (e.g. manual trim pct values). */
  metadata?: Record<string, any>;
  sceneNumber: number; // Konsistent mit API (Timeline API verwendet sceneNumber)
  number?: number; // Legacy field for backwards compatibility
  title: string;
  description?: string;
  location?: string;
  /** Scene heading / slug line (INT/EXT, location) from screenplay views. */
  setting?: string;
  timeOfDay?: "day" | "night" | "dawn" | "dusk";
  /** Plain string or TipTap JSON (stringified or parsed in the client). */
  content?: unknown;
  /** Optional beat / structure summary (structure beats UI). */
  summary?: string;
  notes?: string;
  status?: "outline" | "draft" | "revision" | "final";
  duration?: number; // in minutes
  orderIndex?: number; // Sortierung innerhalb Sequence
  color?: string; // NEW: Farbe für Scene
  wordCount?: number; // 📖 For books (sections): Word count in this section
  /** Scene preview image (for audio/book projects). */
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  characterIds?: string[];
  characters?: Character[];
}

export interface Act {
  id: string;
  projectId: string;
  actNumber: number;
  title?: string;
  description?: string;
  /** Optional beat / structure summary (structure beats UI). */
  summary?: string;
  color?: string; // Hex color for UI
  orderIndex: number;
  wordCount?: number; // 📖 For books: Total word count in this act
  /** Backend node metadata (e.g. manual trim pct values). */
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Relations
  sequences?: Sequence[];
}

export interface Sequence {
  id: string;
  actId: string;
  /** Denormalized for client filters / optimistic rows (API may include). */
  projectId?: string;
  sequenceNumber: number;
  title?: string;
  description?: string;
  /** Optional beat / structure summary (structure beats UI). */
  summary?: string;
  color?: string; // Hex color for UI
  orderIndex: number;
  wordCount?: number; // 📖 For books (chapters): Total word count in this chapter
  /** Backend node metadata (e.g. manual trim pct values). */
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Relations
  scenes?: Scene[];
}
