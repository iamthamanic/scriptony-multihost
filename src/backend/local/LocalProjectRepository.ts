/**
 * LocalProjectRepository
 *
 * T35: Stub — persistiert nicht. Wird in späteren Tickets vervollständigt.
 */

import type {
	Project,
	ProjectRepository,
	CreateProjectPayload,
	UpdateProjectPayload,
} from "../ScriptonyBackend";

const STUB_PROJECTS: Project[] = [
	{
		$id: "local-stub-1",
		name: "Lokales Demo-Projekt",
		description: "Stub für lokalen Modus",
		projectType: "book",
		userId: "local-user",
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

export class LocalProjectRepository implements ProjectRepository {
	async list(): Promise<Project[]> {
		return [...STUB_PROJECTS];
	}

	async get(id: string): Promise<Project | null> {
		return STUB_PROJECTS.find((p) => p.$id === id) ?? null;
	}

	async create(payload: CreateProjectPayload): Promise<Project> {
		const p: Project = {
			$id: `local-${Date.now()}`,
			name: payload.name,
			description: payload.description,
			projectType: payload.projectType,
			userId: "local-user",
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};
		STUB_PROJECTS.push(p);
		return p;
	}

	async update(id: string, payload: UpdateProjectPayload): Promise<Project> {
		const idx = STUB_PROJECTS.findIndex((p) => p.$id === id);
		if (idx === -1) throw new Error(`Project ${id} not found`);
		STUB_PROJECTS[idx] = { ...STUB_PROJECTS[idx], ...payload, updatedAt: new Date().toISOString() };
		return STUB_PROJECTS[idx];
	}

	async delete(id: string): Promise<void> {
		const idx = STUB_PROJECTS.findIndex((p) => p.$id === id);
		if (idx !== -1) STUB_PROJECTS.splice(idx, 1);
	}
}
