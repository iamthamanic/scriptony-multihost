/**
 * Settings card: installed app version + manual update check/install.
 * Location: src/components/settings/AppUpdateCard.tsx
 */
import { useState } from "react";
import { Download, ExternalLink, RefreshCw, RotateCw } from "lucide-react";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import { useAppUpdater } from "../../hooks/useAppUpdater";
import { DESKTOP_LATEST_RELEASE_URL } from "../../lib/desktop/desktop-release-constants";
import {
  isDesktopUpdateOnStartupEnabled,
  setDesktopUpdateOnStartupEnabled,
} from "../../lib/desktop/desktop-update-preferences";

function phaseLabel(phase: ReturnType<typeof useAppUpdater>["phase"]): string {
  switch (phase) {
    case "checking":
      return "Prüfe auf Updates…";
    case "available":
      return "Update verfügbar";
    case "up-to-date":
      return "Auf dem neuesten Stand";
    case "downloading":
      return "Download läuft…";
    case "installing":
      return "Installation…";
    case "ready":
      return "Update installiert — Neustart erforderlich";
    case "error":
      return "Fehler beim Update";
    default:
      return "Bereit";
  }
}

export function AppUpdateCard() {
  const [checkOnStartup, setCheckOnStartup] = useState(
    isDesktopUpdateOnStartupEnabled,
  );
  const {
    available,
    phase,
    installedVersion,
    remoteUpdate,
    downloadPercent,
    errorMessage,
    checkForUpdate,
    installUpdate,
    relaunchApp,
  } = useAppUpdater();

  if (!available) return null;

  const busy =
    phase === "checking" || phase === "downloading" || phase === "installing";

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="size-4" />
            App-Update
          </CardTitle>
          <Badge variant="secondary">{phaseLabel(phase)}</Badge>
        </div>
        <CardDescription>
          Erstinstallation und Updates über signierte GitHub Releases.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Installierte Version
          </span>
          <code className="text-xs bg-muted px-2 py-0.5 rounded">
            {installedVersion ?? "…"}
          </code>
        </div>

        {remoteUpdate ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Verfügbar</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">
              {remoteUpdate.version}
            </code>
          </div>
        ) : null}

        {remoteUpdate?.notes ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
            {remoteUpdate.notes}
          </p>
        ) : null}

        {downloadPercent != null ? (
          <div className="text-xs text-muted-foreground">
            Fortschritt: {downloadPercent}%
          </div>
        ) : null}

        {errorMessage ? (
          <p className="text-xs text-destructive">{errorMessage}</p>
        ) : null}

        <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
          <Label htmlFor="desktop-update-startup" className="text-sm">
            Beim Start auf Updates prüfen
          </Label>
          <Switch
            id="desktop-update-startup"
            checked={checkOnStartup}
            onCheckedChange={(checked) => {
              setCheckOnStartup(checked);
              setDesktopUpdateOnStartupEnabled(checked);
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-9"
            onClick={() => void checkForUpdate()}
            disabled={busy || phase === "ready"}
          >
            <RefreshCw
              className={`size-4 mr-2 ${phase === "checking" ? "animate-spin" : ""}`}
            />
            Nach Updates suchen
          </Button>

          {phase === "available" ? (
            <Button
              className="h-9"
              onClick={() => void installUpdate()}
              disabled={busy}
            >
              <Download className="size-4 mr-2" />
              Jetzt installieren
            </Button>
          ) : null}

          {phase === "ready" ? (
            <Button className="h-9" onClick={() => void relaunchApp()}>
              <RotateCw className="size-4 mr-2" />
              Neu starten
            </Button>
          ) : null}

          <Button variant="outline" className="h-9" asChild>
            <a
              href={DESKTOP_LATEST_RELEASE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4 mr-2" />
              Release-Seite
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
