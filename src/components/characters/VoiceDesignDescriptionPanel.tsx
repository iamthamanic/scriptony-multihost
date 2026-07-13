/**
 * Basic/Advanced voice description panel with tooltips for Voice Studio.
 * Location: src/components/characters/VoiceDesignDescriptionPanel.tsx
 */

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { compileVoiceDesignPromptFromSpec } from "@/lib/mve/casting/compile-voice-design-prompt";
import {
  clampVoiceDesignDescription,
  VOICE_DESIGN_DESCRIPTION_MAX_LENGTH,
  VOICE_DESIGN_FIELD_HELP,
} from "@/lib/mve/casting/voice-design-field-help";
import {
  emptyVoiceDesignSpec,
  type MveVoiceDesignSpec,
} from "@/lib/multi-voice-engine/schema/voice-design-spec";
import { VoiceDesignAdvancedForm } from "./VoiceDesignAdvancedForm";

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
  const charCount = description.length;
  const atLimit = charCount >= VOICE_DESIGN_DESCRIPTION_MAX_LENGTH;

  const patchSpec = (partial: Partial<MveVoiceDesignSpec>) => {
    onDesignSpecChange({ ...spec, ...partial });
  };

  const handleTabChange = (tab: string) => {
    if (tab === "basic") {
      const compiled = compileVoiceDesignPromptFromSpec(spec);
      if (compiled.trim()) {
        onDescriptionChange(clampVoiceDesignDescription(compiled));
      }
    }
  };

  const handleDescriptionChange = (value: string) => {
    onDescriptionChange(clampVoiceDesignDescription(value));
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
            <div className="relative">
              <Textarea
                id="mve-voice-desc"
                data-testid="mve-voice-desc"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                rows={3}
                maxLength={VOICE_DESIGN_DESCRIPTION_MAX_LENGTH}
                className="resize-none pb-8 text-sm"
                disabled={disabled}
                placeholder={VOICE_DESIGN_FIELD_HELP.voiceIdentity.placeholder}
                aria-describedby={
                  atLimit ? "mve-voice-desc-limit-hint" : undefined
                }
              />
              <div className="pointer-events-none absolute bottom-2 right-2 flex flex-col items-end gap-0.5">
                <span
                  className={`text-[10px] tabular-nums ${
                    atLimit
                      ? "font-medium text-destructive"
                      : "text-muted-foreground"
                  }`}
                  data-testid="mve-voice-desc-char-count"
                >
                  {charCount} / {VOICE_DESIGN_DESCRIPTION_MAX_LENGTH}
                </span>
                {atLimit ? (
                  <span
                    id="mve-voice-desc-limit-hint"
                    className="text-[10px] text-destructive"
                  >
                    Maximale Länge erreicht
                  </span>
                ) : null}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="advanced" className="mt-2">
            <VoiceDesignAdvancedForm
              spec={spec}
              disabled={disabled}
              onPatch={patchSpec}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
