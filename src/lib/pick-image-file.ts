/**
 * Open a native / WebView file picker for a single image.
 */

import { isDesktopShell } from "@/runtime/detect-runtime";

function mimeForExtension(ext: string | undefined): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

export function pickImageViaHiddenInput(
  accept = "image/png,image/jpeg,image/jpg,image/gif,image/webp",
): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    document.body.appendChild(input);

    const cleanup = () => {
      input.remove();
    };

    input.addEventListener(
      "change",
      () => {
        const file = input.files?.[0] ?? null;
        cleanup();
        resolve(file);
      },
      { once: true },
    );

    input.addEventListener(
      "cancel",
      () => {
        cleanup();
        resolve(null);
      },
      { once: true },
    );

    input.click();
  });
}

async function pickImageViaTauriDialog(): Promise<File | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: "Bilder",
        extensions: ["png", "jpg", "jpeg", "gif", "webp"],
      },
    ],
  });

  if (!selected || Array.isArray(selected)) {
    return null;
  }

  const path = selected;
  const fileName = path.split(/[/\\]/).pop() ?? "image.jpg";
  const ext = fileName.split(".").pop()?.toLowerCase();
  const { readFile } = await import("@tauri-apps/plugin-fs");
  const bytes = await readFile(path);
  return new File([bytes], fileName, { type: mimeForExtension(ext) });
}

/** Desktop: Tauri-Dialog zuerst, sonst verstecktes `<input type="file">`. */
export async function pickImageFile(): Promise<File | null> {
  if (isDesktopShell()) {
    try {
      return await pickImageViaTauriDialog();
    } catch (error) {
      console.warn("[pickImageFile] Tauri dialog failed, falling back:", error);
    }
  }
  return pickImageViaHiddenInput();
}
