/**
 * Migration: Erstellt Shadow-AudioClips für bestehende AudioTracks.
 *
 * T28: One-Time-Migration. Idempotent (UNIQUE track_id verhindert Duplikate).
 * Sicherheit: Kein Output von secrets. Nur IDs werden geloggt.
 *
 * KISS: Ein Track = Ein Clip. Keine Multi-Clip-Logik.
 * DRY: Nutzt resolveLaneIndex aus timeline-position.
 */

/**
 * Einfache Lane-Zuweisung (ohne Import von Frontend-Code).
 * Dupliziert resolveLaneIndex — notwendig weil Node.js Script kein
 * Frontend-Modul direkt importiert.
 */
function resolveLaneIndex(type: string, _characterId?: string | null): number {
	switch (type) {
		case "dialog":
			return 0;
		case "narrator":
			return 40;
		case "sfx":
			return 10;
		case "music":
			return 20;
		case "atmo":
			return 30;
		default:
			return 0;
	}
}

/** Prüft ob ein Track bereits einen Clip hat. */
async function clipExistsForTrack(
	trackId: string,
	endpoint: string,
	projectId: string,
	apiKey: string,
): Promise<boolean> {
	try {
		const res = await fetch(
			`${endpoint}/databases/default/collections/audio_clips/documents?queries[]=equal("track_id","${trackId}")`,
			{
				headers: {
					"X-Appwrite-Project": projectId,
					"X-Appwrite-Key": apiKey,
				},
			},
		);
		if (!res.ok) return false;
		const data = await res.json();
		return (data.documents?.length || 0) > 0;
	} catch {
		return false;
	}
}

async function migrateTracksToClips() {
	const endpoint = process.env.APPWRITE_ENDPOINT;
	const projectId = process.env.APPWRITE_PROJECT_ID;
	const apiKey = process.env.APPWRITE_API_KEY;

	if (!endpoint || !projectId || !apiKey) {
		console.error(
			"Fehlende Env-Vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY",
		);
		process.exit(1);
	}

	console.log("🔊 T28 Migration: AudioTracks → AudioClips");
	console.log("============================================");

	// Schritt 1: Alle Projekt-Types laden
	const projectsRes = await fetch(
		`${endpoint}/databases/default/collections/projects/documents`,
		{
			headers: {
				"X-Appwrite-Project": projectId,
				"X-Appwrite-Key": apiKey,
			},
		},
	);

	if (!projectsRes.ok) {
		console.error("Fehler beim Laden der Projekte:", await projectsRes.text());
		process.exit(1);
	}

	const projectsData = await projectsRes.json();
	const audioProjects = (projectsData.documents || []).filter(
		(p: Record<string, unknown>) =>
			(p.type as string)?.toLowerCase() === "audio",
	);

	console.log(`📁 ${audioProjects.length} Audio-Projekte gefunden`);

	let migratedCount = 0;
	let skippedCount = 0;
	let errorCount = 0;

	for (const project of audioProjects) {
		console.log(`\n🎬 Projekt: ${project.title} (${project.$id})`);

		// Tracks für dieses Projekt
		const tracksRes = await fetch(
			`${endpoint}/databases/default/collections/scene_audio_tracks/documents?queries[]=equal("project_id","${project.$id}")`,
			{
				headers: {
					"X-Appwrite-Project": projectId,
					"X-Appwrite-Key": apiKey,
				},
			},
		);

		if (!tracksRes.ok) {
			console.error(`  ❌ Fehler beim Laden der Tracks`);
			errorCount++;
			continue;
		}

		const tracksData = await tracksRes.json();
		const tracks = tracksData.documents || [];

		console.log(`  🎵 ${tracks.length} Tracks gefunden`);

		for (const track of tracks) {
			const trackId = track.$id || track.id;

			// Idempotenz-Check
			if (await clipExistsForTrack(trackId, endpoint, projectId, apiKey)) {
				console.log(`  ⏭️  Track ${trackId} → bereits migriert`);
				skippedCount++;
				continue;
			}

			const startSec = track.start_time ?? 0;
			const duration = track.duration ?? 3;

			const clipPayload = {
				track_id: trackId,
				scene_id: track.scene_id,
				project_id: track.project_id || project.$id,
				start_sec: startSec,
				end_sec: startSec + duration,
				lane_index: resolveLaneIndex(track.type, track.character_id),
				order_index: track.order_index || 0,
				// Denormalisiert für schnelle Timeline-Queries
				track_type: track.type,
				content: track.content || "",
				character_id: track.character_id || null,
				audio_file_id: track.audio_file_id || null,
				waveform_data: track.waveform_data || null,
				cross_scene: false,
				fx_preset_id: null,
			};

			const createRes = await fetch(
				`${endpoint}/databases/default/collections/audio_clips/documents`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Appwrite-Project": projectId,
						"X-Appwrite-Key": apiKey,
					},
					body: JSON.stringify({
						documentId: "unique()",
						data: clipPayload,
					}),
				},
			);

			if (createRes.ok) {
				console.log(`  ✅ Track ${trackId} → Clip erstellt`);
				migratedCount++;
			} else {
				const err = await createRes.text().catch(() => "unknown");
				console.error(`  ❌ Track ${trackId} → Fehler: ${err}`);
				errorCount++;
			}
		}
	}

	console.log("\n============================================");
	console.log("📊 Migration abgeschlossen:");
	console.log(`   ✅ Migriert: ${migratedCount}`);
	console.log(`   ⏭️  Übersprungen: ${skippedCount}`);
	console.log(`   ❌ Fehler: ${errorCount}`);
	console.log("============================================");
	process.exit(errorCount > 0 ? 1 : 0);
}

migrateTracksToClips().catch((err) => {
	console.error("Fataler Fehler:", err);
	process.exit(1);
});
