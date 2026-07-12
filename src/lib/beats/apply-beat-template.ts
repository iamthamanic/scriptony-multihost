/**
 * Apply a beat template to a project: delete existing story beats, then create from registry or clear only (custom).
 */

import {
  BEAT_TEMPLATES,
  generateBeatsFromTemplate,
  type BeatTemplate,
} from "@/lib/beat-templates";
import { createBeat, deleteBeat, getBeats } from "@/lib/api/beats-api";
import * as TimelineAPI from "@/lib/api/timeline-api";

export type ApplyBeatTemplateResult =
  | { kind: "skipped"; reason: "empty-key" }
  | { kind: "cleared-custom"; deletedCount: number }
  | { kind: "created"; count: number; templateId: string }
  | { kind: "unsupported"; key: string; deletedCount: number };

export function resolveRegistryBeatTemplate(
  beatTemplateKey: string,
): BeatTemplate | null {
  const key = beatTemplateKey.trim();
  if (!key || key.startsWith("custom:") || key === "custom") {
    return null;
  }
  return BEAT_TEMPLATES[key] ?? null;
}

export function isRegistryBeatTemplateKey(beatTemplateKey: string): boolean {
  return resolveRegistryBeatTemplate(beatTemplateKey) !== null;
}

async function resolveActContainerIds(projectId: string): Promise<{
  firstActId: string;
  lastActId: string;
}> {
  let firstActId = "placeholder-act-1";
  let lastActId = "placeholder-act-3";
  try {
    const acts = await TimelineAPI.getActs(projectId);
    if (acts.length > 0) {
      firstActId = acts[0].id;
      lastActId = acts[acts.length - 1].id;
    }
  } catch {
    /* keep placeholders */
  }
  return { firstActId, lastActId };
}

async function deleteAllProjectBeats(projectId: string): Promise<number> {
  const existing = await getBeats(projectId);
  if (existing.length === 0) return 0;
  await Promise.all(existing.map((beat) => deleteBeat(beat.id)));
  return existing.length;
}

function templateAbbrForKey(key: string, beatTemplate: BeatTemplate): string {
  return (
    beatTemplate.beats[0]?.templateAbbr ??
    beatTemplate.abbr ??
    key.toUpperCase().replace(/-/g, "")
  );
}

/**
 * Deletes all story beats for the project, then creates beats from a registry template.
 * Custom / unknown keys: delete all beats only (no recreation).
 */
export async function applyBeatTemplateToProject(
  projectId: string,
  beatTemplateKey: string,
): Promise<ApplyBeatTemplateResult> {
  const key = beatTemplateKey.trim();
  if (!key) {
    return { kind: "skipped", reason: "empty-key" };
  }

  const deletedCount = await deleteAllProjectBeats(projectId);
  const template = resolveRegistryBeatTemplate(key);

  if (!template) {
    if (key.startsWith("custom:") || key === "custom") {
      return { kind: "cleared-custom", deletedCount };
    }
    return { kind: "unsupported", key, deletedCount };
  }

  const { firstActId, lastActId } = await resolveActContainerIds(projectId);
  const generatedBeats = generateBeatsFromTemplate(template);
  const abbr = templateAbbrForKey(key, template);
  let successCount = 0;

  for (let i = 0; i < generatedBeats.length; i++) {
    const beat = generatedBeats[i];
    try {
      await createBeat({
        project_id: projectId,
        label: beat.label,
        template_abbr: beat.templateAbbr || abbr,
        description: beat.items?.join(", ") || "",
        from_container_id: firstActId,
        to_container_id: lastActId,
        pct_from: beat.pctFrom,
        pct_to: beat.pctTo === beat.pctFrom ? beat.pctFrom + 2 : beat.pctTo,
        color: beat.color,
        order_index: i,
      });
      successCount += 1;
    } catch (error) {
      console.error(
        `[applyBeatTemplateToProject] Failed to create beat "${beat.label}":`,
        error,
      );
    }
  }

  return { kind: "created", count: successCount, templateId: template.id };
}
