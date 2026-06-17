import { Book, Film, Headphones, Tv, type LucideIcon } from "lucide-react";

/**
 * Projekt-Informationen card shell (ProjectsPage desktop + mobile expanded).
 * Fixed height aligned with cover art — scroll only inside `PROJECT_INFO_CARD_CONTENT_CLASS`.
 * Do not switch to min-h/max-h or the card grows with Cloud Sync / book metrics.
 */
export const PROJECT_INFO_CARD_HEIGHT_PX = 360;

export const PROJECT_INFO_CARD_CLASS =
  "h-[360px] flex flex-col overflow-hidden";

/** Scrollable body inside the fixed-height Projekt-Informationen card. */
export const PROJECT_INFO_CARD_CONTENT_CLASS =
  "p-4 pt-0 flex-1 min-h-0 overflow-y-auto";

/** Preset genres for new/edit project picker; custom labels are stored in the same comma-separated `genre` field. */
export const PROJECT_PRESET_GENRES = [
  "Action",
  "Abenteuer",
  "Komödie",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romantik",
  "Science Fiction",
  "Slice of Life",
  "Übernatürlich",
  "Thriller",
] as const;

export const PROJECT_PRESET_GENRE_SET = new Set<string>(
  PROJECT_PRESET_GENRES as unknown as string[],
);

export function parseProjectGenreField(genre: string | undefined): string[] {
  if (!genre?.trim()) return [];
  return genre
    .split(", ")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function customGenresFromSelection(genres: string[]): string[] {
  return [...new Set(genres.filter((g) => !PROJECT_PRESET_GENRE_SET.has(g)))];
}

type TimestampProject = {
  last_edited?: string;
  updated_at?: string;
  updatedAt?: string;
  modified_at?: string;
  modifiedAt?: string;
  created_at?: string;
  createdAt?: string;
};

export function getProjectLastEditedAt(
  project: TimestampProject | null | undefined,
): string | null {
  if (!project) return null;
  return (
    project.last_edited ||
    project.updated_at ||
    project.updatedAt ||
    project.modified_at ||
    project.modifiedAt ||
    project.created_at ||
    project.createdAt ||
    null
  );
}

/** Gesamtminuten aus gespeichertem `project.duration` (Zahl oder Text). */
export function parseStoredDurationMinutes(
  raw: string | number | undefined | null,
): number {
  if (raw == null || raw === "") return 0;
  const s = String(raw).trim();
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return 0;
  const n = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function splitTotalMinutesToHoursMinutesStrings(total: number): {
  h: string;
  m: string;
} {
  if (!Number.isFinite(total) || total <= 0) return { h: "", m: "" };
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return { h: String(hh), m: String(mm) };
}

/** Stunden + Minuten → Gesamtminuten (Minutenfeld darf z. B. 90 sein wenn Std. leer). */
export function totalMinutesFromHourMinuteParts(h: string, m: string): number {
  const hi = Math.max(
    0,
    Math.floor(parseFloat(String(h || "").replace(",", ".") || "0") || 0),
  );
  const mi = Math.max(
    0,
    Math.floor(parseFloat(String(m || "").replace(",", ".") || "0") || 0),
  );
  return hi * 60 + mi;
}

export function formatDurationHrMinDe(h: string, m: string): string {
  const t = totalMinutesFromHourMinuteParts(h, m);
  if (t <= 0) return "-";
  const hh = Math.floor(t / 60);
  const mm = t % 60;
  if (hh === 0) return `${mm} Min.`;
  if (mm === 0) return `${hh} Std.`;
  return `${hh} Std. ${mm} Min.`;
}

export function durationPartsToApiString(h: string, m: string): string {
  const t = totalMinutesFromHourMinuteParts(h, m);
  return t > 0 ? String(t) : "";
}

export const getProjectTypeInfo = (rawType: string) => {
  const normalized = (rawType || "").toLowerCase().trim();
  const aliases: Record<string, string> = {
    movie: "film",
    kino: "film",
    serie: "series",
    serial: "series",
    buch: "book",
    roman: "book",
    hoerspiel: "audio",
    hörspiel: "audio",
    audio_book: "audio",
    audiobook: "audio",
  };
  const key = aliases[normalized] || normalized;

  const typeMap: Record<string, { label: string; Icon: LucideIcon }> = {
    film: { label: "Film", Icon: Film },
    series: { label: "Serie", Icon: Tv },
    book: { label: "Buch", Icon: Book },
    audio: { label: "Hörspiel", Icon: Headphones },
  };
  return (
    typeMap[key] || {
      label: rawType
        ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
        : "Projekt",
      Icon: Film,
    }
  );
};

type ClientProject = Record<string, unknown> & {
  linkedWorldId?: string | null;
  world_id?: string | null;
  linked_world_id?: string | null;
};

/** API uses `world_id`; UI expects `linkedWorldId` (ProjectDetail, WB). */
export function normalizeProjectClient<T extends ClientProject>(
  p: T | null | undefined,
): T | null | undefined {
  if (!p) return p;
  return {
    ...p,
    linkedWorldId: p.linkedWorldId ?? p.world_id ?? p.linked_world_id ?? null,
  };
}
