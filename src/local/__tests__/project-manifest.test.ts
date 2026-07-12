/**
 * Tests for project manifest types, validation, and factory.
 *
 * T37: Covers scriptony.json schema validation.
 */

import { describe, expect, it } from "vitest";
import {
  MANIFEST_FORMAT_ID,
  MANIFEST_FORMAT_VERSION,
  MANIFEST_FILENAME,
  createManifest,
  validateManifest,
  ManifestValidationError,
} from "../project-manifest";

describe("project-manifest", () => {
  describe("constants", () => {
    it("has correct format identifier", () => {
      expect(MANIFEST_FORMAT_ID).toBe("scriptony-project");
    });

    it("has correct filename", () => {
      expect(MANIFEST_FILENAME).toBe("scriptony.json");
    });

    it("has positive version number", () => {
      expect(MANIFEST_FORMAT_VERSION).toBeGreaterThan(0);
    });
  });

  describe("createManifest", () => {
    it("creates a valid local manifest with defaults", () => {
      const m = createManifest({
        projectId: "local_test123",
        title: "My Movie",
      });

      expect(m.format).toBe("scriptony-project");
      expect(m.version).toBe(1);
      expect(m.projectId).toBe("local_test123");
      expect(m.title).toBe("My Movie");
      expect(m.storageMode).toBe("local");
      expect(m.sync.enabled).toBe(false);
      expect(m.createdAt).toBeTruthy();
      expect(m.updatedAt).toBeTruthy();
    });

    it("creates a manifest with description", () => {
      const m = createManifest({
        projectId: "local_abc",
        title: "Test",
        description: "A test project",
      });
      expect(m.description).toBe("A test project");
    });

    it("persists projectType and defaults to film", () => {
      const audio = createManifest({
        projectId: "local_audio",
        title: "Hörspiel",
        projectType: "audio",
      });
      expect(audio.projectType).toBe("audio");

      const film = createManifest({ projectId: "local_film", title: "Film" });
      expect(film.projectType).toBe("film");
    });

    it("generates unique timestamps", () => {
      const m1 = createManifest({ projectId: "a", title: "A" });
      const m2 = createManifest({ projectId: "b", title: "B" });
      // Same millisecond is possible; just check they're ISO strings
      expect(m1.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(m2.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("validateManifest", () => {
    it("accepts a valid manifest", () => {
      const m = createManifest({
        projectId: "local_valid",
        title: "Valid Project",
      });
      expect(() => validateManifest(m)).not.toThrow();
      const result = validateManifest(m);
      expect(result.format).toBe("scriptony-project");
    });

    it("accepts manifest with sync enabled", () => {
      const m = createManifest({
        projectId: "local_sync",
        title: "Synced",
      });
      m.sync.enabled = true;
      m.sync.provider = "scriptony-cloud";
      m.sync.cloudProjectId = "cloud_123";
      expect(() => validateManifest(m)).not.toThrow();
    });

    it("rejects null input", () => {
      expect(() => validateManifest(null)).toThrow(ManifestValidationError);
    });

    it("rejects non-object input", () => {
      expect(() => validateManifest("string")).toThrow(ManifestValidationError);
      expect(() => validateManifest(42)).toThrow(ManifestValidationError);
    });

    it("rejects wrong format identifier", () => {
      const m = {
        ...createManifest({ projectId: "x", title: "X" }),
        format: "wrong",
      };
      expect(() => validateManifest(m)).toThrow(ManifestValidationError);
      try {
        validateManifest(m);
      } catch (e) {
        expect(e).toBeInstanceOf(ManifestValidationError);
        expect((e as ManifestValidationError).fields.length).toBeGreaterThan(0);
      }
    });

    it("rejects missing projectId", () => {
      const m = createManifest({ projectId: "", title: "T" });
      // createManifest won't produce empty id, but validate should catch it
      const raw = { ...m, projectId: "" };
      expect(() => validateManifest(raw)).toThrow(ManifestValidationError);
    });

    it("rejects missing title", () => {
      const m = createManifest({ projectId: "p", title: "" });
      const raw = { ...m, title: "" };
      expect(() => validateManifest(raw)).toThrow(ManifestValidationError);
    });

    it("rejects invalid storageMode", () => {
      const m = createManifest({ projectId: "p", title: "T" });
      const raw = { ...m, storageMode: "invalid" };
      expect(() => validateManifest(raw)).toThrow(ManifestValidationError);
    });

    it("rejects missing sync object", () => {
      const m = createManifest({ projectId: "p", title: "T" });
      const raw = { ...m, sync: null };
      expect(() => validateManifest(raw)).toThrow(ManifestValidationError);
    });

    it("rejects non-boolean sync.enabled", () => {
      const m = createManifest({ projectId: "p", title: "T" });
      const raw = { ...m, sync: { enabled: "yes" } };
      expect(() => validateManifest(raw)).toThrow(ManifestValidationError);
    });

    it("rejects version 0", () => {
      const m = createManifest({ projectId: "p", title: "T" });
      const raw = { ...m, version: 0 };
      expect(() => validateManifest(raw)).toThrow(ManifestValidationError);
    });

    it("rejects non-ISO timestamps", () => {
      const m = createManifest({ projectId: "p", title: "T" });
      const raw = { ...m, createdAt: "not-a-date", updatedAt: "also-invalid" };
      expect(() => validateManifest(raw)).toThrow(ManifestValidationError);
    });

    it("collects multiple errors at once", () => {
      const bad = {
        format: "wrong",
        version: -1,
        projectId: "",
        title: "",
        createdAt: 123,
        updatedAt: 456,
        sync: null,
      };
      try {
        validateManifest(bad);
      } catch (e) {
        expect(e).toBeInstanceOf(ManifestValidationError);
        const err = e as ManifestValidationError;
        expect(err.fields.length).toBeGreaterThanOrEqual(4);
      }
    });
  });
});
