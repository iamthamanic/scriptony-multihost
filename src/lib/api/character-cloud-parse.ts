/**
 * Runtime parsing for timeline-character API payloads (cloud-http layer).
 * Location: src/lib/api/character-cloud-parse.ts
 */

import type { Character } from "../types";

const ROLES = new Set(["protagonist", "antagonist", "supporting", "minor"]);

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && !Number.isNaN(value) ? value : undefined;
}

function parseRole(value: unknown): Character["role"] | undefined {
  const role = asString(value);
  if (role && ROLES.has(role)) {
    return role as Character["role"];
  }
  return undefined;
}

/** Validates API shape before use in adapters (no `as unknown as Character`). */
export function parseCharacterFromApi(raw: unknown): Character {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid character payload from API");
  }
  const o = raw as Record<string, unknown>;
  const id = asString(o.id);
  const projectId = asString(o.projectId) ?? asString(o.project_id) ?? "";
  const name = asString(o.name);
  const createdAt =
    asString(o.createdAt) ?? asString(o.created_at) ?? new Date().toISOString();
  const updatedAt =
    asString(o.updatedAt) ?? asString(o.updated_at) ?? createdAt;

  if (!id || !name) {
    throw new Error("Invalid character payload: id and name are required");
  }

  const imageUrl = asString(o.imageUrl) ?? asString(o.image_url) ?? undefined;

  return {
    id,
    projectId,
    name,
    role: parseRole(o.role),
    description: asString(o.description),
    age: asNumber(o.age),
    imageUrl,
    createdAt,
    updatedAt,
  };
}
