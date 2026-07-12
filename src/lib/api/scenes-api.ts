/**
 * Scene image upload — persists scene.imageUrl for Dropdown + Timeline.
 *
 * Local: import asset under project + metadata.imageUrl (relative assets/ path).
 * Cloud: project cover upload + updateScene metadata.
 */

import type { ImageUploadGifMode } from "../image-upload-prep";
import { prepareImageFileForUpload } from "../image-upload-prep";
import {
  assertPreparedImageWithinUploadLimit,
  uploadProjectImage,
} from "./image-upload-api";
import { getNode, updateScene } from "./timeline-api";
import {
  hasOpenLocalProject,
  usesCloudHttpForDomain,
} from "@/lib/api-adapter/domain-access";
import { requireLocalBackend } from "@/lib/api-adapter/runtime-dispatch";

import { restoreWorkspaceScope } from "@/local/workspace";

export async function uploadSceneImage(
  sceneId: string,
  file: File,
  accessToken: string,
  prepOptions?: { gifMode?: ImageUploadGifMode },
): Promise<string> {
  if (!usesCloudHttpForDomain()) {
    if (!hasOpenLocalProject()) {
      throw new Error(
        "Bitte zuerst ein lokales .scriptony-Projekt im Workspace öffnen.",
      );
    }
    return localUploadSceneImage(sceneId, file, prepOptions);
  }
  return cloudUploadSceneImage(sceneId, file, accessToken, prepOptions);
}

async function localUploadSceneImage(
  sceneId: string,
  file: File,
  prepOptions?: { gifMode?: ImageUploadGifMode },
): Promise<string> {
  const backend = requireLocalBackend();
  const scene = await backend.structure.getNode(sceneId);
  if (!scene) {
    throw new Error(`Szene ${sceneId} nicht gefunden`);
  }

  if (backend.localProject.projectId !== scene.projectId) {
    throw new Error(
      "Geöffnetes lokales Projekt stimmt nicht mit der Szene überein.",
    );
  }

  await restoreWorkspaceScope();

  const ready = await prepareImageFileForUpload(file, prepOptions);
  assertPreparedImageWithinUploadLimit(ready, 5);

  const asset = await backend.assets.importAsset({
    projectId: scene.projectId,
    file: ready,
    type: "image",
    originalFilename: ready.name,
  });

  const storedPath =
    asset.storage.mode === "local" ? asset.storage.relativePath : "";
  if (!storedPath) {
    throw new Error("Bild konnte nicht im Projekt gespeichert werden");
  }

  await updateScene(sceneId, { imageUrl: storedPath }, "local");
  return storedPath;
}

async function cloudUploadSceneImage(
  sceneId: string,
  file: File,
  accessToken: string,
  prepOptions?: { gifMode?: ImageUploadGifMode },
): Promise<string> {
  const node = await getNode(sceneId);
  const ready = await prepareImageFileForUpload(file, prepOptions);
  assertPreparedImageWithinUploadLimit(ready, 5);

  const imageUrl = await uploadProjectImage(node.projectId, ready, prepOptions);
  await updateScene(sceneId, { imageUrl }, accessToken);
  return imageUrl;
}
