/**
 * SelfHostedConnectionService — test/save/activate server connections (T41).
 */

import { Client } from "appwrite";
import type {
  SelfHostedConnection,
  TestConnectionResult,
  TestSelfHostedConnectionInput,
} from "./SelfHostedConnection";
import {
  normalizeConnectionError,
  trimEndpoint,
} from "./SelfHostedConnection";
import { SelfHostedConnectionStore } from "./SelfHostedConnectionStore";

function generateId(): string {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    throw new Error("crypto.randomUUID is required");
  }
  return `sh_${crypto.randomUUID()}`;
}

export class SelfHostedConnectionService {
  constructor(private readonly store = new SelfHostedConnectionStore()) {}

  async testConnection(
    input: TestSelfHostedConnectionInput,
  ): Promise<TestConnectionResult> {
    const endpoint = trimEndpoint(input.endpoint);
    const projectId = input.projectId.trim();
    if (!endpoint || !projectId) {
      return { ok: false, message: "Endpoint und Project ID sind erforderlich." };
    }

    try {
      const client = new Client().setEndpoint(endpoint).setProject(projectId);
      await client.ping();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: normalizeConnectionError(error) };
    }
  }

  async list(): Promise<SelfHostedConnection[]> {
    return this.store.list();
  }

  async save(input: {
    name: string;
    endpoint: string;
    projectId: string;
    id?: string;
  }): Promise<SelfHostedConnection> {
    const test = await this.testConnection({
      endpoint: input.endpoint,
      projectId: input.projectId,
    });
    if (!test.ok) {
      throw new Error(test.message ?? "Verbindungstest fehlgeschlagen");
    }

    const now = new Date().toISOString();
    const existing = input.id ? await this.store.get(input.id) : null;
    const connection: SelfHostedConnection = {
      id: existing?.id ?? generateId(),
      name: input.name.trim() || "Self-hosted Server",
      endpoint: trimEndpoint(input.endpoint),
      projectId: input.projectId.trim(),
      createdAt: existing?.createdAt ?? now,
      lastUsedAt: now,
    };
    await this.store.save(connection);
    return connection;
  }

  async remove(id: string): Promise<void> {
    await this.store.remove(id);
  }

  async activate(id: string): Promise<SelfHostedConnection> {
    const connection = await this.store.get(id);
    if (!connection) {
      throw new Error("Verbindung nicht gefunden");
    }
    const test = await this.testConnection({
      endpoint: connection.endpoint,
      projectId: connection.projectId,
    });
    if (!test.ok) {
      throw new Error(test.message ?? "Server nicht erreichbar");
    }
    await this.store.setActive(id);
    return { ...connection, lastUsedAt: new Date().toISOString() };
  }

  async getActive(): Promise<SelfHostedConnection | null> {
    return this.store.getActive();
  }

  async clearActive(): Promise<void> {
    await this.store.setActive(null);
  }
}
