/**
 * Persisted shot image upload — Structure timeline preview + shot lane (Film/Series).
 * Location: src/hooks/useShotImageUpload.ts
 */

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import { uploadShotImage } from "@/lib/api/timeline-domain-api";
import { validateImageFile } from "@/lib/api/image-upload-api";
import { queryKeys } from "@/lib/react-query";
import type { TimelineData } from "@/components/structure/DropdownView";

export function useShotImageUpload(
  projectId: string,
  options?: {
    onUploaded?: (shotId: string, imageUrl: string) => void | Promise<void>;
  },
) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingShotId, setUploadingShotId] = useState<string | null>(null);
  const onUploaded = options?.onUploaded;

  const uploadForShot = useCallback(
    async (shotId: string, file: File): Promise<string | null> => {
      try {
        validateImageFile(file, 5);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ungültiges Bild");
        return null;
      }

      setUploadingShotId(shotId);
      const toastId = toast.loading("Shot-Bild wird hochgeladen…");

      try {
        const token = await getAccessToken();
        if (!token) {
          toast.error("Nicht authentifiziert", { id: toastId });
          return null;
        }

        const storedUrl = await uploadShotImage(shotId, file, token);

        queryClient.setQueryData<TimelineData | undefined>(
          queryKeys.timeline.byProject(projectId),
          (old) => {
            if (!old || !("shots" in old) || !old.shots) return old;
            return {
              ...old,
              shots: old.shots.map((shot) =>
                shot.id === shotId ? { ...shot, imageUrl: storedUrl } : shot,
              ),
            };
          },
        );

        await queryClient.refetchQueries({
          queryKey: queryKeys.timeline.byProject(projectId),
        });

        await onUploaded?.(shotId, storedUrl);

        toast.success("Shot-Bild hochgeladen", { id: toastId });
        return storedUrl;
      } catch (error) {
        console.error("Shot image upload failed:", error);
        toast.error(
          error instanceof Error ? error.message : "Fehler beim Hochladen",
          { id: toastId },
        );
        return null;
      } finally {
        setUploadingShotId(null);
      }
    },
    [getAccessToken, onUploaded, projectId, queryClient],
  );

  return { uploadForShot, uploadingShotId };
}
