import { describe, expect, it } from "vitest";
import { buildCatalog } from "./catalog";
import { pinRawUrl, ART_REF } from "./config";
import { NodeType, ResourceType } from "./enums";
import type { ArtManifest } from "./types";

// Fixture mirrors the live AssetReport entries plus a couple of off-collection
// rows, so the filter and lookups are exercised without touching the network.
const RAW_BASE = "https://raw.githubusercontent.com/Sluborg/ArtLibrary/main";
const manifest: ArtManifest = {
  assets: [
    {
      kind: "wallpaper",
      title: "Asset Report - Title Screen",
      description: "Title/key art.",
      tags: ["asset-report", "key-art", "title-screen", "splash"],
      collection: "AssetReport",
      path: "Wallpapers/AssetReport/title-screen.jpg",
      sha256: "7f962ce8",
      dimensions: [1080, 2115],
      github_url: `${RAW_BASE}/Wallpapers/AssetReport/title-screen.jpg`,
      raw_url: `${RAW_BASE}/Wallpapers/AssetReport/title-screen.jpg`,
      original_filename: "title-screen.jpg",
    },
    {
      kind: "illustration",
      title: "Asset Report - World Map v2",
      description: "Overworld backdrop.",
      tags: ["asset-report", "world-map", "overworld", "map", "v2"],
      collection: "AssetReport",
      path: "Illustrations/AssetReport/map-overworld-v2.png",
      sha256: "abc123",
      dimensions: [1536, 1024],
      github_url: `${RAW_BASE}/Illustrations/AssetReport/map-overworld-v2.png`,
      raw_url: `${RAW_BASE}/Illustrations/AssetReport/map-overworld-v2.png`,
      original_filename: "map-overworld-v2.png",
    },
    {
      kind: "illustration",
      title: "Asset Report - Node Design Sheet",
      description: "Moodboard.",
      tags: ["asset-report", "reference", "building-nodes"],
      collection: "AssetReport",
      path: "Illustrations/AssetReport/node-design-sheet.png",
      sha256: "def456",
      dimensions: [1536, 1024],
      github_url: `${RAW_BASE}/Illustrations/AssetReport/node-design-sheet.png`,
      raw_url: `${RAW_BASE}/Illustrations/AssetReport/node-design-sheet.png`,
      original_filename: "node-design-sheet.png",
    },
    {
      kind: "illustration",
      title: "Some other game's art",
      description: "Should be filtered out.",
      tags: ["other"],
      collection: "OtherGame",
      path: "Illustrations/OtherGame/thing.png",
      sha256: "999",
      dimensions: [10, 10],
      github_url: `${RAW_BASE}/Illustrations/OtherGame/thing.png`,
      raw_url: `${RAW_BASE}/Illustrations/OtherGame/thing.png`,
      original_filename: "thing.png",
    },
  ],
};

describe("buildCatalog", () => {
  const catalog = buildCatalog(manifest);

  it("filters to the AssetReport collection", () => {
    expect(catalog.all()).toHaveLength(3); // the OtherGame row is dropped
    expect(catalog.has("map-overworld-v2")).toBe(true);
    expect(catalog.has("thing")).toBe(false);
  });

  it("keeps a non-building node- visual addressable by its real slug", () => {
    expect(catalog.has("node-design-sheet")).toBe(true);
    expect(catalog.bySlug("node-design-sheet").isPlaceholder).toBe(false);
  });

  it("resolves a real visual by slug with dimensions, sha and raw_url", () => {
    const map = catalog.bySlug("map-overworld-v2");
    expect(map.isPlaceholder).toBe(false);
    expect(map.width).toBe(1536);
    expect(map.height).toBe(1024);
    expect(map.sha256).toBe("abc123");
    expect(map.rawUrl).toContain("map-overworld-v2.png");
  });

  it("resolves the title screen by slug", () => {
    expect(catalog.bySlug("title-screen").isPlaceholder).toBe(false);
  });

  it("returns a placeholder for a not-yet-produced slug, never throwing", () => {
    const v = catalog.bySlug("home-keep");
    expect(v.isPlaceholder).toBe(true);
    expect(v.rawUrl.startsWith("data:image/svg+xml")).toBe(true);
  });

  it("byNode returns a placeholder for nodes with no art yet", () => {
    expect(catalog.byNode(NodeType.HomeKeep).isPlaceholder).toBe(true);
    expect(catalog.byNode(NodeType.Market).isPlaceholder).toBe(true);
  });

  it("byResource returns a placeholder for resource icons with no art yet", () => {
    expect(catalog.byResource(ResourceType.WOOD).isPlaceholder).toBe(true);
  });

  it("filters by kind and tag", () => {
    expect(catalog.byKind("illustration")).toHaveLength(2);
    expect(catalog.byKind("wallpaper")).toHaveLength(1);
    expect(catalog.byTag("title-screen")).toHaveLength(1);
    expect(catalog.byTag("overworld")).toHaveLength(1);
  });
});

describe("pinRawUrl", () => {
  it("is a no-op while tracking main (the dev default)", () => {
    expect(ART_REF).toBe("main");
    const url = `${RAW_BASE}/Wallpapers/AssetReport/title-screen.jpg`;
    expect(pinRawUrl(url)).toBe(url);
  });
});
