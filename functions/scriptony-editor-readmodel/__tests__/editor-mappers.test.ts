/**
 * Unit tests for editor-readmodel pure mappers.
 */

import { describe, expect, it } from "vitest";
import {
  mapScriptBlock,
  mapSceneAudioTrack,
  mapAsset,
  mapStyleSummary,
  stripContentFromNodes,
} from "../services/editor-mappers";

type JsonRecord = Record<string, unknown>;

describe("editor-mappers", () => {
  describe("mapScriptBlock", () => {
    it("maps a full script block", () => {
      const row: JsonRecord = {
        id: "sb1",
        script_id: "s1",
        type: "dialogue",
        content: "Hello",
        speaker_character_id: "c1",
        order_index: 5,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };
      const mapped = mapScriptBlock(row);
      expect(mapped).toEqual({
        id: "sb1",
        scriptId: "s1",
        type: "dialogue",
        content: "Hello",
        speakerCharacterId: "c1",
        orderIndex: 5,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      });
    });

    it("handles missing optional fields", () => {
      const row: JsonRecord = {
        id: "sb2",
        script_id: null,
        type: null,
        content: null,
        speaker_character_id: null,
        order_index: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      const mapped = mapScriptBlock(row);
      expect(mapped.scriptId).toBeNull();
      expect(mapped.type).toBeNull();
      expect(mapped.content).toBeNull();
      expect(mapped.speakerCharacterId).toBeNull();
      expect(mapped.orderIndex).toBe(0);
    });
  });

  describe("mapSceneAudioTrack", () => {
    it("maps a full audio track", () => {
      const row: JsonRecord = {
        id: "at1",
        scene_id: "sc1",
        project_id: "p1",
        type: "dialogue",
        content: "test",
        character_id: "c1",
        audio_file_id: "af1",
        order_index: 1,
        start_time: 0,
        end_time: 10,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      const mapped = mapSceneAudioTrack(row);
      expect(mapped.audioFileId).toBe("af1");
      expect(mapped.startTime).toBe(0);
      expect(mapped.endTime).toBe(10);
    });
  });

  describe("mapAsset", () => {
    it("maps a full asset", () => {
      const row: JsonRecord = {
        id: "a1",
        owner_type: "shot",
        owner_id: "s1",
        media_type: "image",
        purpose: "cover",
        file_id: "f1",
        filename: "test.jpg",
        mime_type: "image/jpeg",
        size: 1024,
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      const mapped = mapAsset(row);
      expect(mapped.ownerType).toBe("shot");
      expect(mapped.fileId).toBe("f1");
      expect(mapped.size).toBe(1024);
    });
  });

  describe("mapStyleSummary", () => {
    it("returns null when style is null", () => {
      expect(mapStyleSummary(null, [])).toBeNull();
    });

    it("maps style with items", () => {
      const style: JsonRecord = {
        id: "st1",
        project_id: "p1",
        name: "Dark",
        description: "Dark theme",
      };
      const items: JsonRecord[] = [
        {
          id: "i1",
          category: "color",
          label: "Primary",
          value: "#000",
          image_url: null,
          order_index: 0,
        },
      ];
      const mapped = mapStyleSummary(style, items);
      expect(mapped).toEqual({
        id: "st1",
        projectId: "p1",
        name: "Dark",
        description: "Dark theme",
        items: [
          {
            id: "i1",
            category: "color",
            label: "Primary",
            value: "#000",
            imageUrl: null,
            orderIndex: 0,
          },
        ],
      });
    });
  });

  describe("stripContentFromNodes", () => {
    it("removes content from metadata and top-level", () => {
      const nodes: JsonRecord[] = [
        {
          id: "n1",
          level: 3,
          metadata: { content: "secret", other: 1 },
          content: "also-secret",
        },
      ];
      const stripped = stripContentFromNodes(nodes);
      expect((stripped[0].metadata as JsonRecord).content).toBeUndefined();
      expect(stripped[0].content).toBeUndefined();
      expect((stripped[0].metadata as JsonRecord).other).toBe(1);
    });

    it("tolerates missing metadata", () => {
      const nodes: JsonRecord[] = [{ id: "n2", level: 1 }];
      const stripped = stripContentFromNodes(nodes);
      expect(stripped[0].metadata).toBeUndefined();
    });
  });
});
