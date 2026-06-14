/**
 * Scene cover upload — preview + picker (Dropdown, Edit Scene, Timeline lane).
 */

import { Camera, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";
import { pickImageFile } from "@/lib/pick-image-file";
import { useResolvedProjectAssetUrl } from "@/hooks/useResolvedProjectAssetUrl";

export interface SceneImageUploadFieldProps {
  imageUrl?: string;
  isUploading?: boolean;
  onFileSelected: (file: File) => void;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function SceneImageUploadField({
  imageUrl,
  isUploading = false,
  onFileSelected,
  label = "Szenenbild",
  compact = false,
  className,
}: SceneImageUploadFieldProps) {
  const displayUrl = useResolvedProjectAssetUrl(imageUrl);
  const hasPreview = Boolean(displayUrl);

  const handlePick = async () => {
    const file = await pickImageFile();
    if (file) onFileSelected(file);
  };

  if (compact) {
    return (
      <button
        type="button"
        className={cn(
          "relative shrink-0 rounded overflow-hidden border border-pink-300/70 dark:border-pink-700 bg-gradient-to-br from-primary/15 to-accent/15",
          className,
        )}
        disabled={isUploading}
        onClick={(e) => {
          e.stopPropagation();
          void handlePick();
        }}
        aria-label={`${label} hochladen`}
        title={`${label} hochladen`}
      >
        {hasPreview ? (
          <img
            src={displayUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {!hasPreview && !isUploading ? (
          <span className="absolute inset-0 flex items-center justify-center min-w-16 min-h-9">
            <Camera className="size-4 text-primary/50" />
          </span>
        ) : null}
        {isUploading ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60 min-w-16 min-h-9">
            <Loader2 className="size-4 animate-spin text-primary" />
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>{label}</Label>
      <button
        type="button"
        className="relative block w-full rounded-md aspect-[16/9] overflow-hidden border border-border bg-gradient-to-br from-muted/40 to-muted/20"
        disabled={isUploading}
        onClick={() => void handlePick()}
        aria-label={`${label} hochladen oder ändern`}
      >
        {hasPreview ? (
          <img
            src={displayUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {!hasPreview && !isUploading ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Camera className="size-8 opacity-50" />
            <span className="text-xs">Bild wählen…</span>
          </span>
        ) : null}
        {isUploading ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
            <Loader2 className="size-8 animate-spin text-primary" />
            <span className="mt-2 text-xs text-primary">Hochladen…</span>
          </span>
        ) : null}
      </button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => void handlePick()}
      >
        <Camera className="size-3.5 mr-2" />
        {hasPreview || imageUrl ? "Bild ersetzen" : "Bild hochladen"}
      </Button>
    </div>
  );
}
