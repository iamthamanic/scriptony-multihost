/**
 * Persists self-hosted server connections (T41) — namespaced localStorage.
 */

import type { SelfHostedConnection } from "./SelfHostedConnection";

const STORAGE_KEY = "scriptony_self_hosted_connections_v1";
const ACTIVE_KEY = "scriptony_self_hosted_active_id";

function readAll(): SelfHostedConnection[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SelfHostedConnection[]) : [];
  } catch {
    return [];
  }
}

function writeAll(connections: SelfHostedConnection[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

export class SelfHostedConnectionStore {
  async list(): Promise<SelfHostedConnection[]> {
    return readAll().sort((a, b) => {
      const ta = a.lastUsedAt ?? a.createdAt;
      const tb = b.lastUsedAt ?? b.createdAt;
      return tb.localeCompare(ta);
    });
  }

  async get(id: string): Promise<SelfHostedConnection | null> {
    return readAll().find((c) => c.id === id) ?? null;
  }

  async getActive(): Promise<SelfHostedConnection | null> {
    if (typeof window === "undefined") return null;
    const activeId = window.localStorage.getItem(ACTIVE_KEY);
    if (!activeId) return null;
    return this.get(activeId);
  }

  async save(connection: SelfHostedConnection): Promise<void> {
    const all = readAll();
    const idx = all.findIndex((c) => c.id === connection.id);
    if (idx >= 0) all[idx] = connection;
    else all.push(connection);
    writeAll(all);
  }

  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((c) => c.id !== id));
    if (typeof window !== "undefined") {
      const activeId = window.localStorage.getItem(ACTIVE_KEY);
      if (activeId === id) {
        window.localStorage.removeItem(ACTIVE_KEY);
      }
    }
  }

  async setActive(id: string | null): Promise<void> {
    if (typeof window === "undefined") return;
    if (!id) {
      window.localStorage.removeItem(ACTIVE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_KEY, id);
    const conn = await this.get(id);
    if (conn) {
      await this.save({ ...conn, lastUsedAt: new Date().toISOString() });
    }
  }
}
