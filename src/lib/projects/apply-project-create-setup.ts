/**
 * Post-create setup: narrative timeline + beat template (local desktop).
 * Location: src/lib/projects/apply-project-create-setup.ts
 */

import * as ShotsAPI from "@/lib/api/shots-api";
import {
  applyBeatTemplateToProject,
  isRegistryBeatTemplateKey,
} from "@/lib/beats/apply-beat-template";
import { narrativeStructureToInitializeProjectPayload } from "@/lib/narrative-structure-init";
import { withTransientLocalProjectSession } from "@/lib/local/transient-project-session";
import { resolveDirPathByProjectId } from "@/lib/api-adapter/local-project-resolve";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { isLocalProfile } from "@/lib/api-adapter/runtime-dispatch";

export type ProjectCreateSetupInput = {
  projectId: string;
  localDirPath?: string | null;
  projectType?: string;
  narrativeStructure?: string | null;
  beatTemplate?: string | null;
  authToken?: string | null;
  /** When true, narrative init was already done (e.g. script import). */
  skipNarrativeInit?: boolean;
};

export type ProjectCreateSetupResult = {
  narrativeInitialized: boolean;
  beatsCreated: number;
  errors: string[];
};

function isCustomBeatTemplate(value: string): boolean {
  const t = value.trim();
  return t === "custom" || t.startsWith("custom:");
}

export async function applyProjectCreateSetup(
  input: ProjectCreateSetupInput,
): Promise<ProjectCreateSetupResult> {
  const result: ProjectCreateSetupResult = {
    narrativeInitialized: false,
    beatsCreated: 0,
    errors: [],
  };

  if (!isDesktopShell() || !isLocalProfile()) {
    return result;
  }

  const dirPath =
    input.localDirPath?.trim() ||
    (await resolveDirPathByProjectId(input.projectId));
  if (!dirPath) {
    result.errors.push("Projektordner im Workspace nicht gefunden.");
    return result;
  }

  const narrativeKey =
    input.projectType !== "series" ? input.narrativeStructure?.trim() : "";
  const beatKey = input.beatTemplate?.trim() ?? "";
  const needsNarrative =
    !input.skipNarrativeInit &&
    Boolean(narrativeKey) &&
    narrativeStructureToInitializeProjectPayload(narrativeKey);
  const needsBeats =
    Boolean(beatKey) &&
    !isCustomBeatTemplate(beatKey) &&
    isRegistryBeatTemplateKey(beatKey);

  if (!needsNarrative && !needsBeats) {
    return result;
  }

  try {
    await withTransientLocalProjectSession(dirPath, async () => {
      if (needsNarrative && input.authToken) {
        try {
          await ShotsAPI.initializeTimelineStructureFromNarrative(
            input.projectId,
            input.authToken,
            narrativeKey,
          );
          result.narrativeInitialized = true;
        } catch (err) {
          const msg =
            err instanceof Error
              ? err.message
              : "Narrativ-Struktur konnte nicht angelegt werden.";
          if (msg !== "NARRATIVE_INIT_UNSUPPORTED") {
            result.errors.push(msg);
          }
        }
      } else if (needsNarrative && !input.authToken) {
        result.errors.push(
          "Narrativ-Struktur: keine Auth-Session — bitte Struktur manuell anlegen.",
        );
      }

      if (needsBeats) {
        try {
          const beatResult = await applyBeatTemplateToProject(
            input.projectId,
            beatKey,
          );
          if (beatResult.kind === "created") {
            result.beatsCreated = beatResult.count;
            if (beatResult.count === 0) {
              result.errors.push(
                "Beat-Template: keine Beats konnten angelegt werden.",
              );
            }
          }
        } catch (err) {
          result.errors.push(
            err instanceof Error
              ? err.message
              : "Beat-Template konnte nicht angewendet werden.",
          );
        }
      }
    });
  } catch (err) {
    result.errors.push(
      err instanceof Error
        ? err.message
        : "Projekt-Setup nach Anlage fehlgeschlagen.",
    );
  }

  return result;
}
