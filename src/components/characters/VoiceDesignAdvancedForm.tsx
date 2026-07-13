/**
 * Advanced voice design form with per-field preset dropdowns.
 * Location: src/components/characters/VoiceDesignAdvancedForm.tsx
 */

import { HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VOICE_DESIGN_FIELD_HELP } from "@/lib/mve/casting/voice-design-field-help";
import {
  VOICE_DESIGN_FIELD_PRESETS,
  type VoiceDesignPresetFieldKey,
} from "@/lib/mve/casting/voice-design-field-presets";
import type { MveVoiceDesignSpec } from "@/lib/multi-voice-engine/schema/voice-design-spec";
import { VoiceDesignPresetPicker } from "./VoiceDesignPresetPicker";

function FieldHeader({
  htmlFor,
  helpKey,
  presetKey,
  value,
  disabled,
  onPresetSelect,
}: {
  htmlFor: string;
  helpKey: keyof typeof VOICE_DESIGN_FIELD_HELP;
  presetKey: VoiceDesignPresetFieldKey;
  value: string;
  disabled?: boolean;
  onPresetSelect: (value: string) => void;
}) {
  const help = VOICE_DESIGN_FIELD_HELP[helpKey];
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <Label htmlFor={htmlFor} className="text-xs font-bold truncate">
          {help.label}
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label={`Hilfe: ${help.label}`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs text-xs">
            <p>{help.tooltip}</p>
            <p className="mt-1 text-muted-foreground">
              Beispiel: {help.example}
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
      <VoiceDesignPresetPicker
        presets={VOICE_DESIGN_FIELD_PRESETS[presetKey]}
        value={value}
        disabled={disabled}
        testId={`voice-design-${presetKey}-picker`}
        onSelect={onPresetSelect}
      />
    </div>
  );
}

function SpecTextField({
  id,
  helpKey,
  presetKey,
  value,
  disabled,
  onChange,
}: {
  id: string;
  helpKey: keyof typeof VOICE_DESIGN_FIELD_HELP;
  presetKey: VoiceDesignPresetFieldKey;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const help = VOICE_DESIGN_FIELD_HELP[helpKey];
  return (
    <div className="space-y-1">
      <FieldHeader
        htmlFor={id}
        helpKey={helpKey}
        presetKey={presetKey}
        value={value}
        disabled={disabled}
        onPresetSelect={onChange}
      />
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={help.placeholder}
        className="h-8 w-full text-sm"
        data-testid={`voice-design-${presetKey}`}
      />
    </div>
  );
}

export interface VoiceDesignAdvancedFormProps {
  spec: MveVoiceDesignSpec;
  disabled?: boolean;
  onPatch: (partial: Partial<MveVoiceDesignSpec>) => void;
}

export function VoiceDesignAdvancedForm({
  spec,
  disabled,
  onPatch,
}: VoiceDesignAdvancedFormProps) {
  const attitudeText = (spec.persona?.attitude ?? []).join(", ");
  const avoidText = (spec.avoid ?? []).join(", ");

  return (
    <div className="space-y-3" data-testid="voice-design-advanced-form">
      <div className="grid gap-2 sm:grid-cols-2">
        <SpecTextField
          id="vds-native-lang"
          helpKey="nativeLanguage"
          presetKey="nativeLanguage"
          value={spec.native?.language ?? ""}
          disabled={disabled}
          onChange={(language) =>
            onPatch({ native: { ...spec.native, language } })
          }
        />
        <SpecTextField
          id="vds-native-dialect"
          helpKey="nativeDialect"
          presetKey="nativeDialect"
          value={spec.native?.dialect ?? ""}
          disabled={disabled}
          onChange={(dialect) =>
            onPatch({ native: { ...spec.native, dialect } })
          }
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <SpecTextField
          id="vds-gender"
          helpKey="genderPresentation"
          presetKey="genderPresentation"
          value={spec.presentation?.genderPresentation ?? ""}
          disabled={disabled}
          onChange={(genderPresentation) =>
            onPatch({
              presentation: { ...spec.presentation, genderPresentation },
            })
          }
        />
        <SpecTextField
          id="vds-age"
          helpKey="ageRange"
          presetKey="ageRange"
          value={spec.presentation?.ageRange ?? ""}
          disabled={disabled}
          onChange={(ageRange) =>
            onPatch({ presentation: { ...spec.presentation, ageRange } })
          }
        />
      </div>

      <SpecTextField
        id="vds-recording"
        helpKey="recordingQuality"
        presetKey="recordingQuality"
        value={spec.presentation?.recordingQuality ?? ""}
        disabled={disabled}
        onChange={(recordingQuality) =>
          onPatch({ presentation: { ...spec.presentation, recordingQuality } })
        }
      />

      <SpecTextField
        id="vds-persona"
        helpKey="personaRole"
        presetKey="personaRole"
        value={spec.persona?.role ?? ""}
        disabled={disabled}
        onChange={(role) => onPatch({ persona: { ...spec.persona, role } })}
      />

      <div className="space-y-1">
        <FieldHeader
          htmlFor="vds-attitude"
          helpKey="personaAttitude"
          presetKey="personaAttitude"
          value={attitudeText}
          disabled={disabled}
          onPresetSelect={(next) =>
            onPatch({
              persona: {
                ...spec.persona,
                attitude: next
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
            })
          }
        />
        <Input
          id="vds-attitude"
          value={attitudeText}
          onChange={(e) =>
            onPatch({
              persona: {
                ...spec.persona,
                attitude: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
            })
          }
          disabled={disabled}
          placeholder={VOICE_DESIGN_FIELD_HELP.personaAttitude.placeholder}
          className="h-8 w-full text-sm"
          data-testid="voice-design-personaAttitude"
        />
      </div>

      <p className="text-[11px] font-semibold text-muted-foreground pt-1">
        Voice identity
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["pitch", "pitch"],
            ["resonance", "resonance"],
            ["weight", "weight"],
            ["timbre", "timbre"],
            ["texture", "texture"],
            ["breath", "breath"],
            ["articulation", "articulation"],
          ] as const
        ).map(([field, helpKey]) => (
          <SpecTextField
            key={field}
            id={`vds-${field}`}
            helpKey={helpKey}
            presetKey={field}
            value={spec.voiceIdentity?.[field] ?? ""}
            disabled={disabled}
            onChange={(value) =>
              onPatch({
                voiceIdentity: { ...spec.voiceIdentity, [field]: value },
              })
            }
          />
        ))}
      </div>

      <p className="text-[11px] font-semibold text-muted-foreground pt-1">
        Delivery
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["pace", "pace"],
            ["rhythm", "rhythm"],
            ["pauses", "pauses"],
            ["intonation", "intonation"],
            ["emphasis", "emphasis"],
            ["energy", "energy"],
            ["proximity", "proximity"],
          ] as const
        ).map(([field, helpKey]) => (
          <SpecTextField
            key={field}
            id={`vds-${field}`}
            helpKey={helpKey}
            presetKey={field}
            value={spec.delivery?.[field] ?? ""}
            disabled={disabled}
            onChange={(value) =>
              onPatch({
                delivery: { ...spec.delivery, [field]: value },
              })
            }
          />
        ))}
      </div>

      <div className="space-y-1">
        <FieldHeader
          htmlFor="vds-avoid"
          helpKey="avoid"
          presetKey="avoid"
          value={avoidText}
          disabled={disabled}
          onPresetSelect={(next) =>
            onPatch({
              avoid: next
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
        <Input
          id="vds-avoid"
          value={avoidText}
          onChange={(e) =>
            onPatch({
              avoid: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          disabled={disabled}
          placeholder={VOICE_DESIGN_FIELD_HELP.avoid.placeholder}
          className="h-8 w-full text-sm"
          data-testid="voice-design-avoid"
        />
      </div>
    </div>
  );
}
