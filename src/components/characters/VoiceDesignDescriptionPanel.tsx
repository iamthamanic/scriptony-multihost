/**
 * Basic/Advanced voice description panel with tooltips for Voice Studio.
 * Location: src/components/characters/VoiceDesignDescriptionPanel.tsx
 */

import { HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { compileVoiceDesignPromptFromSpec } from "@/lib/mve/casting/compile-voice-design-prompt";
import { VOICE_DESIGN_FIELD_HELP } from "@/lib/mve/casting/voice-design-field-help";
import {
  emptyVoiceDesignSpec,
  type MveVoiceDesignSpec,
} from "@/lib/multi-voice-engine/schema/voice-design-spec";

function FieldLabel({
  htmlFor,
  helpKey,
}: {
  htmlFor: string;
  helpKey: keyof typeof VOICE_DESIGN_FIELD_HELP;
}) {
  const help = VOICE_DESIGN_FIELD_HELP[helpKey];
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-bold">
        {help.label}
      </Label>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Hilfe: ${help.label}`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <p>{help.tooltip}</p>
          <p className="mt-1 text-muted-foreground">Beispiel: {help.example}</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

export interface VoiceDesignDescriptionPanelProps {
  description: string;
  designSpec: MveVoiceDesignSpec;
  disabled?: boolean;
  onDescriptionChange: (value: string) => void;
  onDesignSpecChange: (spec: MveVoiceDesignSpec) => void;
}

export function VoiceDesignDescriptionPanel({
  description,
  designSpec,
  disabled,
  onDescriptionChange,
  onDesignSpecChange,
}: VoiceDesignDescriptionPanelProps) {
  const spec = designSpec ?? emptyVoiceDesignSpec();

  const patchSpec = (partial: Partial<MveVoiceDesignSpec>) => {
    onDesignSpecChange({ ...spec, ...partial });
  };

  const handleTabChange = (tab: string) => {
    if (tab === "basic") {
      const compiled = compileVoiceDesignPromptFromSpec(spec);
      if (compiled.trim()) onDescriptionChange(compiled);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1.5" data-testid="voice-design-description-panel">
        <p className="text-xs font-bold">Stimmbeschreibung</p>
        <Tabs defaultValue="basic" onValueChange={handleTabChange}>
          <TabsList className="h-8 w-full">
            <TabsTrigger value="basic" className="flex-1 text-xs">
              Basic
            </TabsTrigger>
            <TabsTrigger
              value="advanced"
              className="flex-1 text-xs"
              data-testid="voice-design-tab-advanced"
            >
              Advanced
            </TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="mt-2 space-y-1.5">
            <Label
              htmlFor="mve-voice-desc"
              className="text-xs text-muted-foreground"
            >
              Kurzbeschreibung in Alltagssprache
            </Label>
            <Textarea
              id="mve-voice-desc"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={3}
              className="text-sm resize-none"
              disabled={disabled}
              placeholder={VOICE_DESIGN_FIELD_HELP.voiceIdentity.placeholder}
            />
          </TabsContent>
          <TabsContent value="advanced" className="mt-2 space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel
                  htmlFor="vds-native-lang"
                  helpKey="nativeLanguage"
                />
                <Input
                  id="vds-native-lang"
                  value={spec.native?.language ?? ""}
                  onChange={(e) =>
                    patchSpec({
                      native: { ...spec.native, language: e.target.value },
                    })
                  }
                  disabled={disabled}
                  placeholder={
                    VOICE_DESIGN_FIELD_HELP.nativeLanguage.placeholder
                  }
                />
              </div>
              <div className="space-y-1">
                <FieldLabel
                  htmlFor="vds-native-dialect"
                  helpKey="nativeDialect"
                />
                <Input
                  id="vds-native-dialect"
                  value={spec.native?.dialect ?? ""}
                  onChange={(e) =>
                    patchSpec({
                      native: { ...spec.native, dialect: e.target.value },
                    })
                  }
                  disabled={disabled}
                  placeholder={
                    VOICE_DESIGN_FIELD_HELP.nativeDialect.placeholder
                  }
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <FieldLabel htmlFor="vds-gender" helpKey="genderPresentation" />
                <Input
                  id="vds-gender"
                  value={spec.presentation?.genderPresentation ?? ""}
                  onChange={(e) =>
                    patchSpec({
                      presentation: {
                        ...spec.presentation,
                        genderPresentation: e.target.value,
                      },
                    })
                  }
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <FieldLabel htmlFor="vds-age" helpKey="ageRange" />
                <Input
                  id="vds-age"
                  value={spec.presentation?.ageRange ?? ""}
                  onChange={(e) =>
                    patchSpec({
                      presentation: {
                        ...spec.presentation,
                        ageRange: e.target.value,
                      },
                    })
                  }
                  disabled={disabled}
                />
              </div>
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="vds-recording" helpKey="recordingQuality" />
              <Input
                id="vds-recording"
                value={spec.presentation?.recordingQuality ?? ""}
                onChange={(e) =>
                  patchSpec({
                    presentation: {
                      ...spec.presentation,
                      recordingQuality: e.target.value,
                    },
                  })
                }
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="vds-persona" helpKey="personaRole" />
              <Input
                id="vds-persona"
                value={spec.persona?.role ?? ""}
                onChange={(e) =>
                  patchSpec({
                    persona: { ...spec.persona, role: e.target.value },
                  })
                }
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="vds-attitude" helpKey="personaAttitude" />
              <Input
                id="vds-attitude"
                value={(spec.persona?.attitude ?? []).join(", ")}
                onChange={(e) =>
                  patchSpec({
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
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="vds-identity" helpKey="voiceIdentity" />
              <Textarea
                id="vds-identity"
                rows={2}
                className="text-sm resize-none"
                disabled={disabled}
                value={[
                  spec.voiceIdentity?.pitch,
                  spec.voiceIdentity?.resonance,
                  spec.voiceIdentity?.weight,
                  spec.voiceIdentity?.timbre,
                  spec.voiceIdentity?.texture,
                  spec.voiceIdentity?.breath,
                  spec.voiceIdentity?.articulation,
                ]
                  .filter(Boolean)
                  .join(", ")}
                onChange={(e) =>
                  patchSpec({
                    voiceIdentity: {
                      ...spec.voiceIdentity,
                      timbre: e.target.value,
                    },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="vds-delivery" helpKey="delivery" />
              <Textarea
                id="vds-delivery"
                rows={2}
                className="text-sm resize-none"
                disabled={disabled}
                value={[
                  spec.delivery?.pace,
                  spec.delivery?.rhythm,
                  spec.delivery?.pauses,
                  spec.delivery?.intonation,
                  spec.delivery?.emphasis,
                  spec.delivery?.energy,
                  spec.delivery?.proximity,
                ]
                  .filter(Boolean)
                  .join(", ")}
                onChange={(e) =>
                  patchSpec({
                    delivery: { ...spec.delivery, pace: e.target.value },
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <FieldLabel htmlFor="vds-avoid" helpKey="avoid" />
              <Textarea
                id="vds-avoid"
                rows={2}
                className="text-sm resize-none"
                disabled={disabled}
                value={(spec.avoid ?? []).join(", ")}
                onChange={(e) =>
                  patchSpec({
                    avoid: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
