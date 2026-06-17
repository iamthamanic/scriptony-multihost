/**
 * Section-level diff helpers for style profile compare (T90).
 * Location: src/lib/style-profile/compare-style-profiles.ts
 */

import type {
  StyleProfileSpec,
  StyleSectionState,
  VisualSpecSectionKey,
} from "@/lib/types/style-profile";
import { STYLE_SECTION_REGISTRY } from "./section-registry";

export type SectionDiffStatus = "same" | "changed" | "only_a" | "only_b";

export interface SectionDiffRow {
  key: VisualSpecSectionKey;
  titleDe: string;
  status: SectionDiffStatus;
  summaryA?: string;
  summaryB?: string;
}

function hasSectionContent(state: StyleSectionState): boolean {
  return (
    state.status === "configured" ||
    Boolean(state.summary?.trim()) ||
    Object.keys(state.machineParams ?? {}).length > 0
  );
}

function sectionFingerprint(
  spec: StyleProfileSpec,
  key: VisualSpecSectionKey,
): string {
  const state = spec.visualSpec[key];
  return JSON.stringify({
    status: state.status,
    summary: state.summary?.trim() ?? "",
    machineParams: state.machineParams ?? {},
    doItems: state.doItems ?? [],
    avoidItems: state.avoidItems ?? [],
    exampleRefs: state.exampleRefs ?? [],
  });
}

export function diffStyleProfileSections(
  specA: StyleProfileSpec,
  specB: StyleProfileSpec,
): SectionDiffRow[] {
  return STYLE_SECTION_REGISTRY.map((section) => {
    const stateA = specA.visualSpec[section.key];
    const stateB = specB.visualSpec[section.key];
    const fpA = sectionFingerprint(specA, section.key);
    const fpB = sectionFingerprint(specB, section.key);
    const hasA = hasSectionContent(stateA);
    const hasB = hasSectionContent(stateB);

    let status: SectionDiffStatus = "same";
    if (fpA !== fpB) {
      if (hasA && !hasB) status = "only_a";
      else if (!hasA && hasB) status = "only_b";
      else status = "changed";
    }

    return {
      key: section.key,
      titleDe: section.titleDe,
      status,
      summaryA: stateA.summary,
      summaryB: stateB.summary,
    };
  });
}
