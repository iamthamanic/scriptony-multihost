/**
 * Button to generate a spec-only guide bundle (T96).
 * Location: src/components/timeline/GuideFromStyleButton.tsx
 */

import { Loader2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import {
  canUseGuideBundleCloudApi,
  createGuideBundleFromStyleProfile,
} from "@/lib/api/style-guide-bundle-api";
import { Button } from "../ui/button";
import { toast } from "sonner";

interface GuideFromStyleButtonProps {
  projectId: string;
  shotId: string;
  styleProfileId?: string | null;
  sceneOverrideId?: string | null;
  onCreated?: () => void;
}

export function GuideFromStyleButton({
  projectId,
  shotId,
  styleProfileId,
  sceneOverrideId,
  onCreated,
}: GuideFromStyleButtonProps) {
  const [loading, setLoading] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);

  useEffect(() => {
    void canUseGuideBundleCloudApi().then(setCloudReady);
  }, []);

  const handleClick = async () => {
    if (!cloudReady) {
      toast.message("Guide aus Style benötigt eine Cloud-Session");
      return;
    }
    setLoading(true);
    try {
      const result = await createGuideBundleFromStyleProfile({
        projectId,
        shotId,
        styleProfileId,
        sceneOverrideId,
      });
      toast.success(
        `GuideBundle rev ${result.guideBundle.revision} aus Style erzeugt`,
      );
      onCreated?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Guide-Erzeugung fehlgeschlagen",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      disabled={loading || !cloudReady}
      onClick={() => void handleClick()}
    >
      {loading ? (
        <Loader2 className="size-3.5 mr-1 animate-spin" />
      ) : (
        <Sparkles className="size-3.5 mr-1" />
      )}
      Guide aus Style
    </Button>
  );
}
