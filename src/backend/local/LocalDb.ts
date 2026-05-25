/**
 * LocalDb — Async wrapper around sql.js for local persistence.
 *
 * T38: File-backed DB from T37 database.sqlite; in-memory only for tests.
 */

import type { Database as SqlJsDatabase, BindParams } from "sql.js";
import { SCHEMA_STATEMENTS, TABLE } from "@/local/project-schema";
import { loadSqlJs } from "./load-sqljs";
import { assertChangeLogTable } from "./mappers";
import { localId } from "./id";

export interface LocalDbRow {
	[column: string]: unknown;
}

export interface ChangeLogEntry {
	projectId: string;
	entityType: string;
	entityId: string;
	operation: "create" | "update" | "delete";
	payload: unknown;
}

export class LocalDb {
	private db: SqlJsDatabase | null = null;
	private readonly dbFilePath: string | null;
	private writeChain: Promise<void> = Promise.resolve();
	deviceId: string;

	private constructor(
		db: SqlJsDatabase,
		dbFilePath: string | null,
		deviceId?: string,
	) {
		this.db = db;
		this.dbFilePath = dbFilePath;
		this.deviceId = deviceId ?? localId("device");
	}

	/** Open an on-disk database.sqlite (desktop / Tauri). */
	static async openFromFile(dbFilePath: string): Promise<LocalDb> {
		const { readFile } = await import("@tauri-apps/plugin-fs");
		const bytes = await readFile(dbFilePath);
		const SQL = await loadSqlJs();
		const data =
			bytes instanceof Uint8Array
				? bytes
				: new Uint8Array(bytes as ArrayBuffer);
		const db = new SQL.Database(data);
		db.run("PRAGMA foreign_keys = ON");
		return new LocalDb(db, dbFilePath);
	}

	/** Create an empty in-memory DB with schema (tests only). */
	static async createInMemory(): Promise<LocalDb> {
		const initSqlJs = (await import("sql.js")).default;
		const SQL = await initSqlJs();
		const db = new SQL.Database();
		db.run("PRAGMA foreign_keys = ON");
		for (const stmt of SCHEMA_STATEMENTS) {
			db.run(stmt);
		}
		return new LocalDb(db, null);
	}

	private ensureDb(): SqlJsDatabase {
		if (!this.db) {
			throw new Error("LocalDb is closed");
		}
		return this.db;
	}

	async all(sql: string, params?: BindParams): Promise<LocalDbRow[]> {
		const stmt = this.ensureDb().prepare(sql);
		try {
			if (params) {
				stmt.bind(params);
			}
			const rows: LocalDbRow[] = [];
			while (stmt.step()) {
				rows.push(stmt.getAsObject() as LocalDbRow);
			}
			return rows;
		} finally {
			stmt.free();
		}
	}

	async get(sql: string, params?: BindParams): Promise<LocalDbRow | null> {
		const rows = await this.all(sql, params);
		return rows.length > 0 ? rows[0] : null;
	}

	private enqueueWrite(task: () => void): Promise<void> {
		const next = this.writeChain.then(() => task());
		this.writeChain = next;
		return next;
	}

	async run(sql: string, params?: BindParams): Promise<void> {
		await this.enqueueWrite(() => {
			this.ensureDb().run(sql, params);
		});
		await this.flushPersistIfFileBacked();
	}

	async insertChange(entry: ChangeLogEntry): Promise<void> {
		assertChangeLogTable(entry.entityType);
		await this.enqueueWrite(() => {
			this.ensureDb().run(
				`INSERT INTO ${TABLE.CHANGE_LOG}
          (id, project_id, entity_type, entity_id, operation, payload_json, device_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					localId("cl"),
					entry.projectId,
					entry.entityType,
					entry.entityId,
					entry.operation,
					JSON.stringify(entry.payload),
					this.deviceId,
					new Date().toISOString(),
				],
			);
		});
		await this.flushPersistIfFileBacked();
	}

	private async flushPersistIfFileBacked(): Promise<void> {
		if (!this.dbFilePath) return;
		await this.persist();
	}

	/** Write in-memory DB bytes back to database.sqlite. */
	async persist(): Promise<void> {
		if (!this.dbFilePath) {
			throw new Error("LocalDb.persist() requires a file-backed database");
		}
		const binary = this.ensureDb().export();
		const { writeFile } = await import("@tauri-apps/plugin-fs");
		await writeFile(this.dbFilePath, binary);
	}

	async close(): Promise<void> {
		await this.writeChain;
		await this.flushPersistIfFileBacked();
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}
}
