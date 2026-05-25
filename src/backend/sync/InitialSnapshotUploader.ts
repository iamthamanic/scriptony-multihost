/**
 * Uploads a best-effort initial snapshot from local SQLite to cloud APIs (T40).
 */

import type { LocalProjectContext } from "../local/LocalProjectContext";
import type { AppwriteBackend } from "../appwrite/AppwriteBackend";
import { isDesktopShell } from "@/runtime/detect-runtime";
import { resolveSafeProjectPath } from "../local/project-path";

function mapNodeTypeToLevel(nodeType: string): string {
  const t = nodeType.toLowerCase();
  if (t === "act" || t === "root") return "act";
  if (t === "sequence" || t === "chapter") return "sequence";
  if (t === "scene") return "scene";
  return "beat";
}

export interface SnapshotUploadResult {
  cloudProjectId: string;
  nodesUploaded: number;
  assetsUploaded: number;
  warnings: string[];
}

export async function uploadInitialSnapshot(
  local: LocalProjectContext,
  cloudBackend: AppwriteBackend,
  cloudProjectId: string,
): Promise<SnapshotUploadResult> {
  const warnings: string[] = [];
  let nodesUploaded = 0;
  let assetsUploaded = 0;

  const nodes = await local.db.all(
    "SELECT * FROM project_nodes WHERE project_id = ? AND deleted_at IS NULL ORDER BY order_index ASC",
    [local.projectId],
  );

  const idMap = new Map<string, string>();

  for (const row of nodes) {
    const localId = String(row.id);
    const parentLocal = row.parent_id ? String(row.parent_id) : null;
    const cloudParent = parentLocal ? idMap.get(parentLocal) : undefined;

    try {
      const orderIndex = Number(row.order_index ?? 0);
      const created = await cloudBackend.structure.create({
        projectId: cloudProjectId,
        parentId: cloudParent ?? null,
        type: mapNodeTypeToLevel(String(row.node_type ?? "scene")),
        label: String(row.label ?? "Node"),
        orderIndex,
      });
      const cloudNodeId = created.id;
      if (cloudNodeId) {
        idMap.set(localId, cloudNodeId);
        nodesUploaded += 1;
      }
    } catch (err) {
      warnings.push(
        `Node ${localId}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const assetRows = await local.db.all(
    "SELECT * FROM assets WHERE project_id = ? AND deleted_at IS NULL",
    [local.projectId],
  );

  if (isDesktopShell() && assetRows.length > 0) {
    const { readFile } = await import("@tauri-apps/plugin-fs");
    for (const row of assetRows) {
      if (row.asset_type !== "image" || !row.local_path) continue;
      const rel = String(row.local_path);
      const absPath = resolveSafeProjectPath(local.dirPath, rel);
      if (!absPath) {
        warnings.push(`Asset ${String(row.id)}: invalid local_path`);
        continue;
      }
      try {
        const bytes = await readFile(absPath);
        const blob = new Blob([bytes], {
          type: row.mime_type ? String(row.mime_type) : "application/octet-stream",
        });
        const name = rel.split("/").pop() ?? "asset.jpg";
        const file = new File([blob], name, { type: blob.type });
        await cloudBackend.assets.uploadProjectImage(cloudProjectId, file);
        assetsUploaded += 1;
      } catch (err) {
        warnings.push(
          `Asset ${String(row.id)}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  if (nodes.length > 0 && nodesUploaded === 0) {
    throw new Error(
      `Initial cloud snapshot failed: no structure nodes uploaded. ${warnings.join("; ")}`,
    );
  }

  const imageAssetCount = assetRows.filter(
    (r) => r.asset_type === "image" && r.local_path,
  ).length;
  if (imageAssetCount > 0 && assetsUploaded === 0) {
    throw new Error(
      `Initial cloud snapshot failed: no image assets uploaded. ${warnings.join("; ")}`,
    );
  }

  return { cloudProjectId, nodesUploaded, assetsUploaded, warnings };
}
