/**
 * Default style mode when no project style is active — preview builder + adopt CTA.
 * Location: src/components/projects/styles/StyleProfileDefaultMode.tsx
 */

import { useMemo, useState } from "react";
import { Loader2, Palette, Sparkles, Star } from "lucide-react";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { Card, CardContent } from "../../ui/card";
import { Label } from "../../ui/label";
import { STYLE_SECTION_REGISTRY } from "@/lib/api/style-profile-api";
import type {
  StyleProfile,
  StyleProfileTemplateId,
} from "@/lib/types/style-profile";
import type { VisualSpecSectionKey } from "@/lib/types/style-profile";
import {
  DEFAULT_PREVIEW_TEMPLATE_ID,
  buildPreviewStyleProfile,
} from "@/lib/style-profile/default-preview";
import { STYLE_PROFILE_TEMPLATES } from "@/lib/style-profile/reference-presets";
import { StyleProfileBuilderLayout } from "./StyleProfileBuilderLayout";
import { StyleProfileEditorHeader } from "./StyleProfileEditorHeader";
import { StyleSectionNav } from "./StyleSectionNav";
import { StyleStrengthGauge } from "./StyleStrengthGauge";
import { analyzeStyleProfile } from "@/lib/style-profile/analyze-style";
import { StyleSectionCardRouter } from "./sections/StyleSectionCardRouter";
import { StyleProfileToolSettingsTab } from "./tabs/StyleProfileToolSettingsTab";

interface StyleProfileDefaultModeProps {
  projectId: string;
  existingProfiles: StyleProfile[];
  adopting?: boolean;
  onAdoptTemplate: (templateId: StyleProfileTemplateId) => void;
  onActivateProfile: (profileId: string) => void;
  onOpenProfile: (profileId: string) => void;
  onCreateCustom: () => void;
}

export function StyleProfileDefaultMode({
  projectId,
  existingProfiles,
  adopting,
  onAdoptTemplate,
  onActivateProfile,
  onOpenProfile,
  onCreateCustom,
}: StyleProfileDefaultModeProps) {
  const [templateId, setTemplateId] = useState<StyleProfileTemplateId>(
    DEFAULT_PREVIEW_TEMPLATE_ID,
  );
  const [activeSection, setActiveSection] =
    useState<VisualSpecSectionKey>("styleDna");

  const previewProfile = useMemo(
    () => buildPreviewStyleProfile(templateId, projectId),
    [templateId, projectId],
  );
  const previewScores = useMemo(
    () => analyzeStyleProfile(previewProfile.spec),
    [previewProfile.spec],
  );

  const scrollToSection = (key: VisualSpecSectionKey) => {
    setActiveSection(key);
    document
      .getElementById(`style-section-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-4 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <Palette className="size-5 text-primary shrink-0" aria-hidden />
            <h3 className="text-lg font-semibold">Noch kein Projekt-Style</h3>
            <Badge variant="secondary">Vorschau-Modus</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Wähle eine Vorlage unten, sieh alle 18 Sektionen mit Tags, Palette
            und Slidern — und übernimm das Style mit einem Klick als
            Projekt-Standard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            className="bg-primary hover:bg-primary/90"
            disabled={adopting}
            onClick={() => onAdoptTemplate(templateId)}
          >
            {adopting ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="size-4 mr-2" />
            )}
            Dieses Style übernehmen
          </Button>
          <Button variant="outline" onClick={onCreateCustom}>
            Eigenes Profil anlegen
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STYLE_PROFILE_TEMPLATES.map((template) => {
          const selected = template.id === templateId;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => setTemplateId(template.id)}
              className={`text-left rounded-lg border p-4 transition-colors ${
                selected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                  : "hover:border-primary/40 bg-card"
              }`}
            >
              <p className="font-medium">{template.labelDe}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {template.descriptionDe}
              </p>
            </button>
          );
        })}
      </div>

      <StyleProfileEditorHeader profile={previewProfile} previewMode />

      <StyleProfileBuilderLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        sidebar={
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Vorschau-Vorlage
              </Label>
              <p className="text-sm font-medium">
                {
                  STYLE_PROFILE_TEMPLATES.find((t) => t.id === templateId)
                    ?.labelDe
                }
              </p>
            </div>
            <StyleSectionNav
              activeKey={activeSection}
              onSelect={scrollToSection}
            />
            <StyleStrengthGauge score={previewScores.overall} analyzed />
          </div>
        }
        statusBar={
          <p className="text-xs text-muted-foreground border-t pt-2">
            Vorschau — Änderungen werden erst nach „Übernehmen“ gespeichert.
          </p>
        }
        inspector={
          <StyleProfileToolSettingsTab
            spec={previewProfile.spec}
            readOnly
            onChange={() => undefined}
          />
        }
        cards={
          <>
            {STYLE_SECTION_REGISTRY.map((section) => (
              <StyleSectionCardRouter
                key={section.key}
                section={section}
                state={previewProfile.spec.visualSpec[section.key]}
                profileType={previewProfile.type}
                readOnly
                onChange={() => undefined}
              />
            ))}
          </>
        }
      />

      {existingProfiles.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <h4 className="text-sm font-medium">
              Vorhandene Profile aktivieren
            </h4>
            <div className="flex flex-wrap gap-2">
              {existingProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <span className="text-sm">{profile.name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onActivateProfile(profile.id)}
                  >
                    <Star className="size-3.5 mr-1" />
                    Aktivieren
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenProfile(profile.id)}
                  >
                    Bearbeiten
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
