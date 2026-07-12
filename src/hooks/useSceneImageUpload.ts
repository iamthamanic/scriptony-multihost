/**
 * Persisted scene image upload — shared by Audio Dropdown + Timeline preview.
 */

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import { uploadSceneImage } from "@/lib/api/scenes-api";
import { validateImageFile } from "@/lib/api/image-upload-api";
import { queryKeys } from "@/lib/react-query";
import type { TimelineData } from "@/components/structure/DropdownView";

export function useSceneImageUpload(
  projectId: string,
  options?: {
    onUploaded?: (sceneId: string, imageUrl: string) => void | Promise<void>;
  },
) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingSceneId, setUploadingSceneId] = useState<string | null>(null);

  const onUploaded = options?.onUploaded;

  const uploadForScene = useCallback(
    async (sceneId: string, file: File): Promise<string | null> => {
      try {
        validateImageFile(file, 5);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ungültiges Bild");
        return null;
      }

      setUploadingSceneId(sceneId);
      const toastId = toast.loading("Bild wird hochgeladen…");

      try {
        const token = await getAccessToken();
        if (!token) {
          toast.error("Nicht authentifiziert", { id: toastId });
          return null;
        }

        const storedUrl = await uploadSceneImage(sceneId, file, token);

        queryClient.setQueryData<TimelineData | undefined>(
          queryKeys.timeline.byProject(projectId),
          (old) => {
            if (!old || !("scenes" in old)) return old;
            return {
              ...old,
              scenes: old.scenes.map((scene) =>
                scene.id === sceneId
                  ? { ...scene, imageUrl: storedUrl }
                  : scene,
              ),
            };
          },
        );

        await queryClient.refetchQueries({
          queryKey: queryKeys.timeline.byProject(projectId),
        });
        await queryClient.invalidateQueries({
          queryKey: queryKeys.timeline.audioByProject(projectId),
        });

        await onUploaded?.(sceneId, storedUrl);

        toast.success("Bild hochgeladen", { id: toastId });
        return storedUrl;
      } catch (error) {
        console.error("Scene image upload failed:", error);
        toast.error(
          error instanceof Error ? error.message : "Fehler beim Hochladen",
          { id: toastId },
        );
        return null;
      } finally {
        setUploadingSceneId(null);
      }
    },
    [getAccessToken, onUploaded, projectId, queryClient],
  );

  return { uploadForScene, uploadingSceneId };
}
