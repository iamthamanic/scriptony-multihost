/**
 * Scriptony Project Type Registry
 * Zentrale, deklarative Registry für alle Projekttypen.
 * Keine if/else-Ketten in Komponenten — Features werden hier deklariert.
 *
 * SOLID: OCP — neue Typen = neuer Registry-Eintrag.
 * DRY: Ein Ort für Projekttyp-Logik.
 */

import React, { type ComponentType, type LazyExoticComponent } from "react";

// ─── Feature Flags ──────────────────────────────────────────────

export type FeatureAvailability = boolean | "required" | "optional" | "none";

export interface ProjectFeatures {
  shots: FeatureAvailability;
  clips: FeatureAvailability;
  audioTracks: FeatureAvailability;
  episodes: FeatureAvailability;
  recordingSessions: FeatureAvailability;
  voiceCasting: FeatureAvailability;
  beats: FeatureAvailability;
  timeline: FeatureAvailability;
  styleGuide: FeatureAvailability;
  characters: FeatureAvailability;
  projectInfo: FeatureAvailability;
  images: FeatureAvailability;
  videoUploads: FeatureAvailability;
}

// ─── Hierarchy ──────────────────────────────────────────────────

export type HierarchyNode = string;

export interface HierarchyLabel {
  singular: string;
  plural: string;
}

export interface HierarchyLabels {
  act: HierarchyLabel;
  sequence: HierarchyLabel;
  scene: HierarchyLabel;
}

// ─── Views (Lazy-Loaded) ──────────────────────────────────────
// Views are components with unknown props; the caller casts as needed.

export interface ProjectViews {
  dropdownview: LazyExoticComponent<ComponentType<unknown>>;
  timelineview: LazyExoticComponent<ComponentType<unknown>>;
  nativeview: LazyExoticComponent<ComponentType<unknown>>;
}

// ─── Config ─────────────────────────────────────────────────────

export interface ProjectTypeConfig {
  id: string;
  label: string;
  labelPlural: string;
  features: ProjectFeatures;
  /** Ordered list of hierarchy levels (top to bottom). */
  hierarchy: HierarchyNode[];
  /** Localised labels for the 3 hierarchy levels. */
  hierarchyLabels: HierarchyLabels;
  views: ProjectViews;
}

// ─── Lazy Imports ───────────────────────────────────────────────
// We use lazy() to avoid bundling all views for every project type.

const lazyDropdownView = () =>
  import("../components/structure/DropdownView").then((m) => ({
    default: m.DropdownView as ComponentType<unknown>,
  }));
const lazyBookDropdownView = () =>
  import("../components/book/BookDropdownView").then((m) => ({
    default: m.BookDropdownView as ComponentType<unknown>,
  }));
const lazyAudioDropdownView = () =>
  import("../components/audio/AudioDropdownView").then((m) => ({
    default: m.AudioDropdownView as ComponentType<unknown>,
  }));

const lazyStructureTimelineEditor = () =>
  import("../components/structure/timeline/StructureTimelineEditor").then(
    (m) => ({
      default: m.StructureTimelineEditor as ComponentType<unknown>,
    }),
  );

const lazyFilmNative = () =>
  import("../components/film/NativeScreenplayView").then((m) => ({
    default: m.NativeScreenplayView as ComponentType<unknown>,
  }));
const lazyBookNative = () =>
  import("../components/book/NativeBookView").then((m) => ({
    default: m.NativeBookView as ComponentType<unknown>,
  }));
const lazyAudioNative = () =>
  import("../components/audio/AudioSceneView").then((m) => ({
    default: m.AudioSceneView as ComponentType<unknown>,
  }));

// ─── Registry ───────────────────────────────────────────────────

export const projectTypeRegistry: Record<string, ProjectTypeConfig> = {
  film: {
    id: "film",
    label: "Film",
    labelPlural: "Filme",
    features: {
      shots: true,
      clips: true,
      audioTracks: "optional",
      episodes: false,
      recordingSessions: false,
      voiceCasting: false,
      beats: true,
      timeline: true,
      styleGuide: true,
      characters: true,
      projectInfo: true,
      images: true,
      videoUploads: true,
    },
    hierarchy: ["Act", "Sequence", "Scene", "Shot", "Clip"],
    hierarchyLabels: {
      act: { singular: "Akt", plural: "Akte" },
      sequence: { singular: "Sequence", plural: "Sequenzen" },
      scene: { singular: "Szene", plural: "Szenen" },
    },
    views: {
      dropdownview: lazy(lazyDropdownView),
      timelineview: lazy(lazyStructureTimelineEditor),
      nativeview: lazy(lazyFilmNative),
    },
  },

  series: {
    id: "series",
    label: "Serie",
    labelPlural: "Serien",
    features: {
      shots: true,
      clips: true,
      audioTracks: "optional",
      episodes: true,
      recordingSessions: false,
      voiceCasting: false,
      beats: true,
      timeline: true,
      styleGuide: true,
      characters: true,
      projectInfo: true,
      images: true,
      videoUploads: true,
    },
    hierarchy: [
      "Season",
      "Episode",
      "Act",
      "Sequence",
      "Scene",
      "Shot",
      "Clip",
    ],
    hierarchyLabels: {
      act: { singular: "Akt", plural: "Akte" },
      sequence: { singular: "Sequence", plural: "Sequenzen" },
      scene: { singular: "Szene", plural: "Szenen" },
    },
    views: {
      dropdownview: lazy(lazyDropdownView),
      timelineview: lazy(lazyStructureTimelineEditor),
      nativeview: lazy(lazyFilmNative),
    },
  },

  book: {
    id: "book",
    label: "Buch",
    labelPlural: "Bücher",
    features: {
      shots: false,
      clips: false,
      audioTracks: false,
      episodes: false,
      recordingSessions: false,
      voiceCasting: false,
      beats: true,
      timeline: true, // Reading-duration timeline
      styleGuide: true,
      characters: true,
      projectInfo: true,
      images: false,
      videoUploads: false,
    },
    hierarchy: ["Act", "Sequence", "Scene"],
    hierarchyLabels: {
      act: { singular: "Akt", plural: "Akte" },
      sequence: { singular: "Kapitel", plural: "Kapitel" },
      scene: { singular: "Abschnitt", plural: "Abschnitte" },
    },
    views: {
      dropdownview: lazy(lazyBookDropdownView),
      timelineview: lazy(lazyStructureTimelineEditor),
      nativeview: lazy(lazyBookNative),
    },
  },

  audio: {
    id: "audio",
    label: "Hörbuch",
    labelPlural: "Hörbücher",
    features: {
      shots: false,
      clips: false,
      audioTracks: "required",
      episodes: false,
      recordingSessions: true,
      voiceCasting: true,
      beats: true,
      timeline: true,
      styleGuide: true,
      characters: true,
      projectInfo: true,
      images: false,
      videoUploads: false,
    },
    hierarchy: ["Act", "Sequence", "Scene", "AudioTrack"],
    hierarchyLabels: {
      act: { singular: "Akt", plural: "Akte" },
      sequence: { singular: "Sequenz", plural: "Sequenzen" },
      scene: { singular: "Szene", plural: "Szenen" },
    },
    views: {
      dropdownview: lazy(lazyAudioDropdownView),
      timelineview: lazy(lazyStructureTimelineEditor),
      nativeview: lazy(lazyAudioNative),
    },
  },
};

// ─── Helpers ────────────────────────────────────────────────────

export function getProjectTypeConfig(type?: string): ProjectTypeConfig {
  const t = (type ?? "").toLowerCase();
  const config = projectTypeRegistry[t];
  if (!config) {
    // Graceful fallback: return film config with overridden id.
    return { ...projectTypeRegistry.film, id: t, label: t };
  }
  return config;
}

export function hasFeature(
  type: string,
  feature: keyof ProjectFeatures,
): boolean {
  const config = getProjectTypeConfig(type);
  const val = config.features[feature];
  return val === true || val === "required" || val === "optional";
}

export function isFeatureRequired(
  type: string,
  feature: keyof ProjectFeatures,
): boolean {
  const config = getProjectTypeConfig(type);
  return (
    config.features[feature] === true || config.features[feature] === "required"
  );
}

// Helper to avoid circular deps with lazy()
function lazy<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return React.lazy(factory);
}
