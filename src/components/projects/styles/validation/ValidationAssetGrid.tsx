/**
 * Validation asset slot grid with upload (Step 5).
 * Location: src/components/projects/styles/validation/ValidationAssetGrid.tsx
 */

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Label } from "../../../ui/label";
import { Badge } from "../../../ui/badge";
import { useResolvedProjectAssetUrl } from "@/hooks/useResolvedProjectAssetUrl";
import { resolveValidationAssetDisplayUrl } from "@/lib/style-profile/validation-assets";
import type { StyleAssetCheck } from "@/lib/style-profile/analyze-style-remote";
import { uploadStyleProfileValidationAsset } from "@/lib/style-profile/validation-asset-upload";
import { toast } from "sonner";

const DEFAULT_SLOTS = [
  "Character",
  "Creature",
  "Prop",
  "Environment",
  "Close-Up",
  "Wide Shot",
] as const;

function ValidationAssetThumb({ refUrl }: { refUrl: string }) {
  const displayRef = resolveValidationAssetDisplayUrl(refUrl);
  const resolved = useResolvedProjectAssetUrl(displayRef);
  const src = resolved || displayRef;
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className="size-full max-h-16 object-cover rounded-md"
    />
  );
}

interface ValidationAssetGridProps {
  profileId: string;
  slots?: string[];
  filledRefs?: string[];
  assetChecks?: StyleAssetCheck[];
  readOnly?: boolean;
  onUploaded?: (refs: string[]) => void;
}

function assetStatusClass(
  status: StyleAssetCheck["status"] | undefined,
): string {
  if (status === "ok") return "ring-2 ring-emerald-500/50";
  if (status === "warn") return "ring-2 ring-amber-500/50";
  if (status === "fail") return "ring-2 ring-destructive/50";
  return "";
}

export function ValidationAssetGrid({
  profileId,
  slots = [...DEFAULT_SLOTS],
  filledRefs = [],
  assetChecks,
  readOnly,
  onUploaded,
}: ValidationAssetGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  const filledCount = filledRefs.filter((r) => r?.trim()).length;

  const handlePick = (index: number) => {
    if (readOnly || uploadingSlot != null) return;
    setActiveSlot(index);
    inputRef.current?.click();
  };

  const handleFile = async (file: File | undefined) => {
    if (activeSlot == null || !file) return;
    const slot = activeSlot;
    setUploadingSlot(slot);
    try {
      const updated = await uploadStyleProfileValidationAsset(
        profileId,
        slot,
        file,
      );
      const refs =
        updated.spec.visualSpec.validationAssets.exampleRefs ??
        (updated.spec.visualSpec.validationAssets.machineParams?.assetRefs as
          | string[]
          | undefined) ??
        [];
      onUploaded?.(refs);
      toast.success(`Validation-Asset „${slots[slot]}“ hochgeladen`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Upload fehlgeschlagen",
      );
    } finally {
      setUploadingSlot(null);
      setActiveSlot(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">Validation Assets</Label>
        <Badge variant="outline" className="text-xs">
          {filledCount}/{slots.length}
        </Badge>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {slots.map((label, index) => {
          const ref = filledRefs[index];
          const check = assetChecks?.find((c) => c.slotIndex === index);
          const isUploading = uploadingSlot === index;
          return (
            <button
              key={label}
              type="button"
              disabled={readOnly || isUploading}
              onClick={() => handlePick(index)}
              className={`rounded-lg border border-dashed p-3 min-h-[88px] flex flex-col gap-2 bg-muted/10 text-left hover:bg-muted/20 disabled:opacity-60 ${assetStatusClass(check?.status)}`}
            >
              <span className="text-xs font-medium flex items-center justify-between gap-1">
                {label}
                {check && check.status !== "skipped" ? (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {check.status}
                  </Badge>
                ) : null}
              </span>
              <div className="flex-1 flex items-center justify-center rounded-md bg-muted/30 min-h-[48px]">
                {isUploading ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : ref ? (
                  <ValidationAssetThumb refUrl={ref} />
                ) : (
                  <ImagePlus
                    className="size-5 text-muted-foreground"
                    aria-hidden
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          Slot antippen, um ein Referenzbild hochzuladen (lokal + Cloud-Spiegel
          bei verknüpftem Profil).
        </p>
      )}
    </div>
  );
}
