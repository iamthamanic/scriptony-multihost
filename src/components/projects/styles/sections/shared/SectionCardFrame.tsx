/**
 * Shared card chrome for style section editors (T79).
 * Location: src/components/projects/styles/sections/shared/SectionCardFrame.tsx
 */

import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../ui/card";
import { Badge } from "../../../../ui/badge";
import type { StyleSectionState } from "@/lib/types/style-profile";
import type { StyleSectionDefinition } from "@/lib/style-profile/section-registry";

function statusBadge(status: StyleSectionState["status"]) {
  const map = {
    draft: "secondary",
    configured: "default",
    missing: "outline",
  } as const;
  const labels = {
    draft: "Entwurf",
    configured: "Konfiguriert",
    missing: "Offen",
  };
  return (
    <Badge variant={map[status]} className="text-xs">
      {labels[status]}
    </Badge>
  );
}

interface SectionCardFrameProps {
  section: StyleSectionDefinition;
  state: StyleSectionState;
  children: ReactNode;
}

export function SectionCardFrame({
  section,
  state,
  children,
}: SectionCardFrameProps) {
  return (
    <Card id={`style-section-${section.key}`} className="scroll-mt-24">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {section.number}. {section.titleDe}
          </CardTitle>
          {statusBadge(state.status)}
        </div>
        <p className="text-sm text-muted-foreground">{section.descriptionDe}</p>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}
