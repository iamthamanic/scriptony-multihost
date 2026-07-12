/**
 * Cloud HTTP for style guide read (route: /style-guide/:projectId).
 */

import { apiClient } from "../api-client";
import type { StyleGuideData, StyleGuideResponse } from "./style-guide-api";

export async function cloudGetStyleGuide(
  projectId: string,
): Promise<StyleGuideData> {
  const res = await apiClient.get<StyleGuideResponse>(
    `/style-guide/${projectId}`,
  );
  return res.styleGuide;
}
