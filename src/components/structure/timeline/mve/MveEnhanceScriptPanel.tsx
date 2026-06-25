/**
 * MVE Enhance Script panel — raw text input, preview, apply (T64).
 * Location: src/components/structure/timeline/mve/MveEnhanceScriptPanel.tsx
 */

import { Loader2, Sparkles, Check } from "lucide-react";
import { Button } from "../../../ui/button";
import { Textarea } from "../../../ui/textarea";
import { cn } from "../../../ui/utils";
import { useMveEnhanceScript } from "@/hooks/useMveEnhanceScript";

export interface MveEnhanceScriptPanelProps {
  projectId: string;
  sceneId: string | undefined;
  sceneTitle?: string;
  className?: string;
}

export function MveEnhanceScriptPanel({
  projectId,
  sceneId,
  sceneTitle,
  className,
}: MveEnhanceScriptPanelProps) {
  const mve = useMveEnhanceScript(projectId);
  const hasScene = Boolean(sceneId);
  const canApply = hasScene && Boolean(mve.preview) && !mve.isApplying;

  return (
    <section
      className={cn(
        "flex-shrink-0 border-b border-border bg-muted/20 px-4 py-3 space-y-3",
        className,
      )}
      data-testid="mve-enhance-script-panel"
      aria-label="Enhance Script"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Enhance Script</p>
          <p className="text-xs text-muted-foreground truncate">
            {hasScene
              ? `Szene: ${sceneTitle ?? sceneId}`
              : "Bitte eine Szene in der Timeline auswählen."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mve.preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={mve.reset}
              disabled={mve.isEnhancing || mve.isApplying}
            >
              Verwerfen
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!mve.canEnhance || mve.isEnhancing || !hasScene}
            title={
              !hasScene
                ? "Szene auswählen"
                : !mve.canEnhance
                  ? "Rohtext eingeben"
                  : "Rohtext strukturieren"
            }
            data-testid="mve-enhance-script-button"
            onClick={() => void mve.enhance()}
          >
            {mve.isEnhancing ? (
              <Loader2 className="size-4 animate-spin mr-1.5" />
            ) : (
              <Sparkles className="size-4 mr-1.5" />
            )}
            Enhance
          </Button>
          {mve.preview ? (
            <Button
              type="button"
              size="sm"
              disabled={!canApply}
              data-testid="mve-enhance-script-apply"
              onClick={() => sceneId && void mve.apply(sceneId)}
            >
              {mve.isApplying ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Check className="size-4 mr-1.5" />
              )}
              Übernehmen
            </Button>
          ) : null}
        </div>
      </div>

      {!mve.preview ? (
        <>
          <Textarea
            value={mve.rawText}
            onChange={(e) => mve.setRawText(e.target.value)}
            placeholder={
              "MAX: Hast du das gehört?\nMARA: Nein — was war das?\nERZÄHLER: In der Ferne donnerte es."
            }
            rows={4}
            className="text-sm resize-y min-h-[5rem]"
            aria-label="Rohtext für Enhance Script"
            data-testid="mve-enhance-script-raw-text"
            disabled={mve.isEnhancing}
          />
          {hasScene && !mve.canEnhance ? (
            <p className="text-xs text-muted-foreground">
              Rohtext mit Sprecherlabels eingeben (z. B. MAX: …).
            </p>
          ) : null}
        </>
      ) : (
        <div
          className="max-h-48 overflow-y-auto rounded-md border border-border bg-background p-3 space-y-2 text-sm"
          data-testid="mve-enhance-script-preview"
        >
          <p className="text-xs font-medium text-muted-foreground">
            {mve.preview.characters.length} Figur(en) ·{" "}
            {mve.preview.lines.length} Zeile(n)
          </p>
          {mve.preview.warnings?.map((w) => (
            <p key={w} className="text-xs text-amber-600 dark:text-amber-400">
              {w}
            </p>
          ))}
          <ul className="space-y-1.5">
            {mve.preview.lines.map((line) => {
              const char = mve.preview!.characters.find(
                (c) => c.tempId === line.characterTempId,
              );
              return (
                <li key={`${line.orderIndex}-${line.text.slice(0, 24)}`}>
                  <span className="font-medium text-foreground">
                    {char?.name ?? "—"}:
                  </span>{" "}
                  <span className="text-muted-foreground">{line.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
