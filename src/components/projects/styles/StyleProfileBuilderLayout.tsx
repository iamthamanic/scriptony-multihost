/**
 * Three-column builder: sidebar | cards | tool inspector (T79 chrome).
 * Location: src/components/projects/styles/StyleProfileBuilderLayout.tsx
 */

import { useState } from "react";
import type { ReactNode } from "react";
import { Menu } from "lucide-react";
import type { VisualSpecSectionKey } from "@/lib/types/style-profile";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../ui/sheet";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { STYLE_SECTION_REGISTRY } from "@/lib/api/style-profile-api";

interface StyleProfileBuilderLayoutProps {
  activeSection: VisualSpecSectionKey;
  onSectionChange: (key: VisualSpecSectionKey) => void;
  sidebar: ReactNode;
  cards: ReactNode;
  inspector: ReactNode;
  statusBar?: ReactNode;
}

export function StyleProfileBuilderLayout({
  activeSection,
  onSectionChange,
  sidebar,
  cards,
  inspector,
  statusBar,
}: StyleProfileBuilderLayoutProps) {
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const scrollToSection = (key: VisualSpecSectionKey) => {
    onSectionChange(key);
    document
      .getElementById(`style-section-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-4 min-h-[560px]">
        <aside className="hidden md:block w-48 lg:w-52 shrink-0 sticky top-4 self-start max-h-[calc(100vh-8rem)] overflow-y-auto">
          {sidebar}
        </aside>

        <div className="md:hidden flex gap-2">
          <Select
            value={activeSection}
            onValueChange={(v) => scrollToSection(v as VisualSpecSectionKey)}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Sektion" />
            </SelectTrigger>
            <SelectContent>
              {STYLE_SECTION_REGISTRY.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.number}. {s.titleDe}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Sheet open={inspectorOpen} onOpenChange={setInspectorOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Tool-Inspector">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full sm:max-w-md overflow-y-auto"
            >
              <SheetHeader>
                <SheetTitle>Tool-Einstellungen</SheetTitle>
              </SheetHeader>
              <div className="mt-4">{inspector}</div>
            </SheetContent>
          </Sheet>
        </div>

        <main className="flex-1 min-w-0">
          <div className="grid gap-4 xl:grid-cols-2">{cards}</div>
        </main>

        <aside className="hidden md:block w-64 lg:w-72 shrink-0 sticky top-4 self-start">
          <div className="rounded-lg border p-4 bg-muted/30">
            <h3 className="text-sm font-medium mb-3">Tool-Inspector</h3>
            {inspector}
          </div>
        </aside>
      </div>
      {statusBar}
    </div>
  );
}
