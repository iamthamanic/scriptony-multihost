/**
 * Statistics and analytics types.
 */

export interface Stats {
  totalUsers?: number;
  totalOrganizations?: number;
  totalProjects?: number;
  totalWorlds?: number;
  totalScenes?: number;
  totalCharacters?: number;
}

export interface Analytics {
  userGrowth?: Array<{ date: string; count: number }>;
  projectsByGenre?: Array<{ genre: string; count: number }>;
  activeUsers?: number;
  popularFeatures?: Array<{ feature: string; usage: number }>;
}
