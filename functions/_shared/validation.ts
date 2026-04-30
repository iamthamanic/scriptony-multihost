/**
 * Shared Zod validation schemas for Scriptony functions.
 *
 * DRY: Reusable schemas across function modules.
 */

import { z } from "zod";

/** Appwrite ID format: alphanumeric, hyphens, underscores. Konsistent mit T12. */
export const ProjectIdSchema = z
  .string()
  .min(1, "project_id required")
  .max(255, "project_id too long")
  .regex(/^[a-zA-Z0-9_-]+$/, "project_id contains invalid characters");
