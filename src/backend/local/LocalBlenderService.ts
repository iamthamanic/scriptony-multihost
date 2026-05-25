/**
 * Desktop Blender bridge via Tauri commands (T42).
 */

import { invoke } from "@tauri-apps/api/core";
import type {
  BlenderService,
  ConnectBlenderInput,
  ExportBlenderProjectInput,
  InstallBlenderAddonInput,
  SyncBlenderSceneInput,
  BlenderConnection,
  BlenderExportResult,
} from "../blender/types";

export class LocalBlenderService implements BlenderService {
  async isAvailable(): Promise<boolean> {
    return invoke<boolean>("blender_is_available");
  }

  async getInstalledVersion(): Promise<string | null> {
    return invoke<string | null>("blender_get_version");
  }

  async exportProject(
    input: ExportBlenderProjectInput,
  ): Promise<BlenderExportResult> {
    return invoke<BlenderExportResult>("blender_export_project", { input });
  }

  async installAddon(_input: InstallBlenderAddonInput): Promise<void> {
    await invoke("blender_install_addon");
  }

  async connectLive(input: ConnectBlenderInput): Promise<BlenderConnection> {
    return invoke<BlenderConnection>("blender_connect_live", { input });
  }

  async syncScene(_input: SyncBlenderSceneInput): Promise<void> {
    await invoke("blender_sync_scene");
  }
}
