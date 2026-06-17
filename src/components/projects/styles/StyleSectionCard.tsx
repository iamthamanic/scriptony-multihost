/**
 * Generic fallback section card (advanced JSON).
 * Location: src/components/projects/styles/StyleSectionCard.tsx
 */

import { useState } from "react";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Input } from "../../ui/input";
import type {
  StyleSectionState,
  VisualSpecSectionKey,
} from "@/lib/types/style-profile";
import type { StyleSectionDefinition } from "@/lib/style-profile/section-registry";
import { SectionCardFrame } from "./sections/shared/SectionCardFrame";

interface StyleSectionCardProps {
  section: StyleSectionDefinition;
  state: StyleSectionState;
  readOnly?: boolean;
  onChange: (key: VisualSpecSectionKey, next: StyleSectionState) => void;
}

export function StyleSectionCard({
  section,
  state,
  readOnly,
  onChange,
}: StyleSectionCardProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const patch = (partial: Partial<StyleSectionState>) => {
    onChange(section.key, { ...state, ...partial });
  };

  return (
    <SectionCardFrame section={section} state={state}>
      <div className="space-y-2">
        <Label htmlFor={`${section.key}-summary`}>Kurzbeschreibung</Label>
        <Textarea
          id={`${section.key}-summary`}
          value={state.summary ?? ""}
          disabled={readOnly}
          rows={3}
          onChange={(e) =>
            patch({
              summary: e.target.value,
              status: e.target.value.trim() ? "configured" : "draft",
            })
          }
          placeholder="Was definiert diese Sektion für dein Projekt?"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${section.key}-do`}>Do (kommagetrennt)</Label>
        <Input
          id={`${section.key}-do`}
          disabled={readOnly}
          value={(state.doItems ?? []).join(", ")}
          onChange={(e) =>
            patch({
              doItems: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${section.key}-avoid`}>Avoid (kommagetrennt)</Label>
        <Input
          id={`${section.key}-avoid`}
          disabled={readOnly}
          value={(state.avoidItems ?? []).join(", ")}
          onChange={(e) =>
            patch({
              avoidItems: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </div>
      <button
        type="button"
        className="text-xs text-primary hover:underline"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? "Advanced ausblenden" : "Advanced JSON"}
      </button>
      {showAdvanced && (
        <Textarea
          className="font-mono text-xs"
          disabled={readOnly}
          rows={6}
          value={JSON.stringify(state.machineParams ?? {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value) as Record<
                string,
                unknown
              >;
              patch({ machineParams: parsed });
            } catch {
              /* ignore invalid JSON while typing */
            }
          }}
        />
      )}
    </SectionCardFrame>
  );
}
