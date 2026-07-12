/**
 * Project Access Helper for scriptony-audio-production.
 * KISS: Single-user MVP — prueft project.created_by.
 * T21 Collaboration erweitert auf project_members/organization_members.
 */

import { Databases } from "node-appwrite";
import { getDatabases, dbId } from "../../_shared/appwrite-db";

function getString(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) return value;
  return undefined;
}

function isNonEmptyId(id: string): boolean {
  return typeof id === "string" && id.trim().length > 0;
}

async function getDb(): Promise<Databases> {
  return getDatabases();
}

async function getCreatorId(projectId: string): Promise<string | undefined> {
  const database = await getDb();
  const doc = await database.getDocument(dbId(), "projects", projectId);
  return getString(doc.user_id) ?? getString(doc.created_by);
}

/** Single-user MVP: nur Ersteller/in. Keine Delegation Lesen→Manage (RBAC). */
async function isProjectCreator(
  userId: string,
  projectId: string,
): Promise<boolean> {
  if (!isNonEmptyId(userId) || !isNonEmptyId(projectId)) return false;
  const creator = await getCreatorId(projectId);
  return userId === creator;
}

export async function canReadProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  return isProjectCreator(userId, projectId);
}

export async function canEditProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  return isProjectCreator(userId, projectId);
}

export async function canManageProject(
  userId: string,
  projectId: string,
): Promise<boolean> {
  return isProjectCreator(userId, projectId);
}
