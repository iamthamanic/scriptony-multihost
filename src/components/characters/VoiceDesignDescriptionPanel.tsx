/**
 * Basic/Advanced voice description panel with tooltips for Voice Studio.
 * Location: src/components/characters/VoiceDesignDescriptionPanel.tsx
 */

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { compileVoiceDesignPrompt } from "@/lib/mve/casting/compile-voice-design-prompt";
import {
  clampVoiceDesignBasePrompt,
  VOICE_DESIGN_BASE_PROMPT_MAX_LENGTH,
  VOICE_DESIGN_DESCRIPTION_MAX_LENGTH,
  VOICE_DESIGN_FIELD_HELP,
} from "@/lib/mve/casting/voice-design-field-help";
import {
  emptyVoiceDesignSpec,
  isVoiceDesignSpecEmpty,
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
  const usingAdvanced = !isVoiceDesignSpecEmpty(spec);
  const effectivePrompt = compileVoiceDesignPrompt({
    basicDescription: description,
    designSpec: spec,
  });
  const charCount = effectivePrompt.length;
  const atLimit = charCount >= VOICE_DESIGN_BASE_PROMPT_MAX_LENGTH;

  const patchSpec = (partial: Partial<MveVoiceDesignSpec>) => {
    onDesignSpecChange({ ...spec, ...partial });
  };

  const handleTabChange = (tab: string) => {
    if (tab === "basic") {
      if (usingAdvanced) return;
      if (effectivePrompt.trim()) {
        onDescriptionChange(clampVoiceDesignBasePrompt(effectivePrompt));
      }
    }
  };

  const handleDescriptionChange = (value: string) => {
    onDescriptionChange(clampVoiceDesignBasePrompt(value));
  };

  const promptCounter = (
    <div className="flex flex-col items-end gap-0.5">
      <span
        className={`text-[10px] tabular-nums ${
          atLimit ? "font-medium text-destructive" : "text-muted-foreground"
        }`}
        data-testid="mve-voice-desc-char-count"
      >
        {charCount} / {VOICE_DESIGN_BASE_PROMPT_MAX_LENGTH}
      </span>
      <span className="text-[10px] text-muted-foreground">
        Voicebox max. {VOICE_DESIGN_DESCRIPTION_MAX_LENGTH} inkl. Varianten
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
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-1.5" data-testid="voice-design-description-panel">
        <p className="text-xs font-bold">Stimmbeschreibung</p>
        <p className="text-[10px] text-muted-foreground leading-snug">
          {usingAdvanced
            ? "Advanced aktiv: Es wird nur der kompilierte Advanced-Prompt verwendet — Basic wird nicht addiert."
            : "Basic aktiv: Freitext wird als Design-Prompt verwendet."}
        </p>
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
                maxLength={VOICE_DESIGN_BASE_PROMPT_MAX_LENGTH}
                className="resize-none pb-12 text-sm"
                disabled={disabled || usingAdvanced}
                placeholder={VOICE_DESIGN_FIELD_HELP.voiceIdentity.placeholder}
                aria-describedby={
                  atLimit ? "mve-voice-desc-limit-hint" : undefined
                }
              />
              <div className="pointer-events-none absolute bottom-2 right-2">
                {promptCounter}
              </div>
            </div>
            {usingAdvanced ? (
              <p className="text-[10px] text-muted-foreground">
                Basic-Feld ist deaktiviert, solange Advanced-Felder befüllt
                sind.
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="advanced" className="mt-2 space-y-2">
            <VoiceDesignAdvancedForm
              spec={spec}
              disabled={disabled}
              onPatch={patchSpec}
            />
            <div className="flex justify-end border-t border-border/60 pt-2">
              {promptCounter}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
