/**
 * Cloud/web Blender stub — desktop required for live bridge (T42).
 */

import type {
  BlenderService,
  ConnectBlenderInput,
  ExportBlenderProjectInput,
  InstallBlenderAddonInput,
  SyncBlenderSceneInput,
  BlenderConnection,
  BlenderExportResult,
} from "../blender/types";

const DESKTOP_MSG =
  "Blender live bridge requires the Scriptony desktop app.";

export class AppwriteBlenderService implements BlenderService {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async getInstalledVersion(): Promise<string | null> {
    return null;
  }

  async exportProject(
    _input: ExportBlenderProjectInput,
  ): Promise<BlenderExportResult> {
    throw new Error(DESKTOP_MSG);
  }

  async installAddon(_input: InstallBlenderAddonInput): Promise<void> {
    throw new Error(DESKTOP_MSG);
  }

  async connectLive(_input: ConnectBlenderInput): Promise<BlenderConnection> {
    throw new Error(DESKTOP_MSG);
  }

  async syncScene(_input: SyncBlenderSceneInput): Promise<void> {
    throw new Error(DESKTOP_MSG);
  }
}
