/**
 * Blender bridge types (T42).
 */

export type BlenderProjectSource = "local" | "cloud";

export interface ExportBlenderProjectInput {
  projectDir?: string;
  projectId?: string;
  source: BlenderProjectSource;
  exportDir: string;
}

export interface BlenderExportResult {
  exportDir: string;
  manifestPath: string;
  schemaVersion: number;
}

export interface InstallBlenderAddonInput {
  blenderVersion?: string;
}

export interface ConnectBlenderInput {
  host?: string;
  port?: number;
}

export interface BlenderConnection {
  connected: boolean;
  message?: string;
}

export interface SyncBlenderSceneInput {
  projectId?: string;
  projectDir?: string;
}

export interface BlenderService {
  isAvailable(): Promise<boolean>;
  getInstalledVersion(): Promise<string | null>;
  exportProject(input: ExportBlenderProjectInput): Promise<BlenderExportResult>;
  installAddon(input: InstallBlenderAddonInput): Promise<void>;
  connectLive(input: ConnectBlenderInput): Promise<BlenderConnection>;
  syncScene(input: SyncBlenderSceneInput): Promise<void>;
}
