/**
 * Beats API types (shared by cloud, local, and tests).
 */

export interface StoryBeat {
  id: string;
  project_id: string;
  user_id: string;
  label: string;
  template_abbr?: string;
  description?: string;
  from_container_id: string;
  to_container_id: string;
  pct_from: number;
  pct_to: number;
  color?: string;
  notes?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBeatPayload {
  project_id: string;
  label: string;
  template_abbr?: string;
  description?: string;
  from_container_id: string;
  to_container_id: string;
  pct_from?: number;
  pct_to?: number;
  color?: string;
  notes?: string;
  order_index?: number;
}

export interface UpdateBeatPayload {
  label?: string;
  template_abbr?: string;
  description?: string;
  from_container_id?: string;
  to_container_id?: string;
  pct_from?: number;
  pct_to?: number;
  color?: string;
  notes?: string;
  order_index?: number;
}
