/**
 * Grid list of style profiles with actions.
 * Location: src/components/projects/styles/ProjectStyleProfileList.tsx
 */

import {
  Copy,
  MoreHorizontal,
  Palette,
  Star,
  Trash2,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import type { StyleProfile } from "@/lib/api/style-profile-api";

interface ProjectStyleProfileListProps {
  profiles: StyleProfile[];
  activeId: string | null | undefined;
  onOpen: (profileId: string) => void;
  onSetActive: (profileId: string) => void;
  onDuplicate: (profileId: string) => void;
  onDelete: (profileId: string) => void;
  onCreateClick: () => void;
}

export function ProjectStyleProfileList({
  profiles,
  activeId,
  onOpen,
  onSetActive,
  onDuplicate,
  onDelete,
  onCreateClick,
}: ProjectStyleProfileListProps) {
  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed rounded-xl">
        <Palette className="size-12 text-primary mb-4" aria-hidden />
        <h3 className="text-lg font-medium mb-2">Noch keine Style Profiles</h3>
        <p className="text-muted-foreground max-w-md mb-6">
          Lege ein visuelles Stilprofil an — mit 18 Sektionen für DNA, Farbe,
          Charaktere und Tool-Einstellungen.
        </p>
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={onCreateClick}
        >
          Erstes Profile erstellen
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {profiles.map((profile) => {
        const isActive = profile.id === activeId || profile.isActiveForProject;
        return (
          <Card
            key={profile.id}
            className="group hover:border-primary/40 transition-colors"
          >
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">
                  {profile.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1 capitalize">
                  {profile.type.replace(/_/g, " ")} · {profile.status}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Aktionen</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpen(profile.id)}>
                    <Pencil className="size-4 mr-2" />
                    Bearbeiten
                  </DropdownMenuItem>
                  {!isActive && (
                    <DropdownMenuItem onClick={() => onSetActive(profile.id)}>
                      <Star className="size-4 mr-2" />
                      Als aktiv setzen
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onDuplicate(profile.id)}>
                    <Copy className="size-4 mr-2" />
                    Duplizieren
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => onDelete(profile.id)}
                  >
                    <Trash2 className="size-4 mr-2" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-3">
              {isActive && (
                <Badge className="bg-primary text-primary-foreground">
                  Aktiv
                </Badge>
              )}
              {profile.sync.status === "conflict" && (
                <Badge variant="destructive">Konflikt</Badge>
              )}
              {profile.sync.status === "pending" && (
                <Badge variant="outline" className="text-amber-600">
                  Sync ausstehend
                </Badge>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {profile.configSummary.styleSummary ||
                  profile.configSummary.compactPrompt ||
                  "Noch keine Zusammenfassung"}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => onOpen(profile.id)}
              >
                Öffnen
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
