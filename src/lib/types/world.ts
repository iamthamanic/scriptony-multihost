/**
 * Worldbuilding types.
 */

export interface World {
  id: string;
  name: string;
  description: string;
  genre?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  organizationId: string;
  // Relations
  categoryCount?: number;
  itemCount?: number;
}

export type WorldCategoryType =
  | "geography"
  | "politics"
  | "culture"
  | "history"
  | "technology"
  | "magic"
  | "religion"
  | "economy"
  | "custom";

export interface WorldCategory {
  id: string;
  worldId: string;
  name: string;
  type: WorldCategoryType;
  icon?: string;
  color?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  itemCount?: number;
}

export interface WorldItem {
  id: string;
  worldId: string;
  categoryId: string;
  title: string;
  content: string;
  tags?: string[];
  imageUrl?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
