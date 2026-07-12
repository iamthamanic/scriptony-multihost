/**
 * Project collection routes (Scriptony HTTP API).
 */

import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/graphql-compat";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../_shared/http";
import {
  hydrateProjectRow,
  hydrateProjectRows,
  hydrateProjectsWithInspirations,
  hydrateProjectWithInspirations,
  normalizeProjectInput,
  setProjectInspirations,
} from "../../_shared/scriptony";

const PROJECTS_HYDRATION_TIMEOUT_MS = 3500;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

function isNonCriticalInspirationHydrationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    normalized.includes("etimedout") ||
    normalized.includes("econnreset")
  );
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method === "GET") {
      const data = await requestGraphql<{
        projects: Array<Record<string, any>>;
      }>(
        `
          query GetProjects($userId: uuid!, $organizationId: uuid!) {
            projects(
              where: {
                _and: [
                  {
                    _or: [
                      { organization_id: { _eq: $organizationId } }
                      { user_id: { _eq: $userId } }
                    ]
                  }
                  {
                    _or: [
                      { is_deleted: { _eq: false } }
                      { is_deleted: { _is_null: true } }
                    ]
                  }
                ]
              }
              order_by: { created_at: desc }
            ) {
              id
              title
              type
              logline
              genre
              duration
              world_id
              cover_image_url
              narrative_structure
              beat_template
              episode_layout
              season_engine
              concept_blocks
              target_pages
              words_per_page
              reading_speed_wpm
              inspirations
              organization_id
              user_id
              is_deleted
              created_at
              updated_at
            }
          }
        `,
        {
          userId: bootstrap.user.id,
          organizationId: bootstrap.organizationId,
        },
      );
      const hydratedProjects = hydrateProjectRows(data.projects);
      try {
        const projectsWithInspirations = await withTimeout(
          hydrateProjectsWithInspirations(hydratedProjects),
          PROJECTS_HYDRATION_TIMEOUT_MS,
          "hydrateProjectsWithInspirations",
        );
        sendJson(res, 200, { projects: projectsWithInspirations });
      } catch (hydrationError) {
        if (!isNonCriticalInspirationHydrationError(hydrationError)) {
          throw hydrationError;
        }
        const projectsWithEmptyInspirations = hydratedProjects.map(
          (project) => ({
            ...project,
            inspirations: Array.isArray(project.inspirations)
              ? project.inspirations
              : [],
          }),
        );
        console.warn(
          "[projects/index] inspirations hydration failed; returning base project list",
          {
            userId: bootstrap.user.id,
            organizationId: bootstrap.organizationId,
            projectCount: hydratedProjects.length,
            error:
              hydrationError instanceof Error
                ? hydrationError.message
                : String(hydrationError),
          },
        );
        sendJson(res, 200, { projects: projectsWithEmptyInspirations });
      }
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody<Record<string, any>>(req);
      const projectInput = normalizeProjectInput(body);
      if (!("type" in projectInput)) {
        projectInput.type = "film";
      }

      if (!projectInput.title) {
        sendBadRequest(res, "title is required");
        return;
      }

      // Extract inspirations separately - they go into a different collection
      const inspirations = body.inspirations ?? body.inspirations;

      // Remove inspirations from project input (not in projects collection schema)
      delete (projectInput as Record<string, any>).inspirations;

      const created = await requestGraphql<{
        insert_projects_one: Record<string, any>;
      }>(
        `
          mutation CreateProject($object: projects_insert_input!) {
            insert_projects_one(object: $object) {
              id
              title
              type
              logline
              genre
              duration
              world_id
              cover_image_url
              narrative_structure
              beat_template
              episode_layout
              season_engine
              concept_blocks
              target_pages
              words_per_page
              reading_speed_wpm
              organization_id
              user_id
              created_at
              updated_at
            }
          }
        `,
        {
          object: {
            ...projectInput,
            organization_id: bootstrap.organizationId,
            user_id: bootstrap.user.id,
          },
        },
      );

      // Save inspirations separately if provided
      if (created.insert_projects_one?.id && inspirations) {
        await setProjectInspirations(
          created.insert_projects_one.id,
          Array.isArray(inspirations) ? inspirations : [],
        );
      }

      // Fetch inspirations to include in response
      const projectWithInspirations = await hydrateProjectWithInspirations(
        created.insert_projects_one,
      );

      sendJson(res, 201, {
        project: hydrateProjectRow(projectWithInspirations),
      });
      return;
    }

    sendMethodNotAllowed(res, ["GET", "POST"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
