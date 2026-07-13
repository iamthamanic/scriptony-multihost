/**
 * Basic/Advanced voice description panel with tooltips for Voice Studio.
 * Location: src/components/characters/VoiceDesignDescriptionPanel.tsx
 */

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { compileVoiceDesignPromptFromSpec } from "@/lib/mve/casting/compile-voice-design-prompt";
import { VOICE_DESIGN_FIELD_HELP } from "@/lib/mve/casting/voice-design-field-help";
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
