// Live smoke test against the real ArtLibrary manifest. GATED so the default test
// run stays network-free (no CI flakiness): it only runs when ART_LIVE=1 and a
// global fetch is available. Run it explicitly with:  ART_LIVE=1 npm test
//
// It asserts only on the four stable slugs known to exist, and that a
// not-yet-produced node degrades to a placeholder.

import { describe, expect, it } from "vitest";
import { loadArtCatalog } from "./catalog";
import { NodeType } from "./enums";

// Read the env without depending on @types/node (Vitest's node env exposes process).
const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const LIVE = env.ART_LIVE === "1" && typeof fetch === "function";

(LIVE ? describe : describe.skip)("ArtCatalog (live manifest)", () => {
  it("fetches, filters AssetReport, and resolves the overworld map + title screen", async () => {
    const catalog = await loadArtCatalog({ force: true });

    expect(catalog.has("map-overworld-v2")).toBe(true);
    const map = catalog.bySlug("map-overworld-v2");
    expect(map.isPlaceholder).toBe(false);
    expect(map.rawUrl).toContain("raw.githubusercontent.com");
    expect(map.rawUrl).toContain("map-overworld-v2.png");

    expect(catalog.bySlug("title-screen").isPlaceholder).toBe(false);

    // No node-* building art exists yet -> must be a placeholder, not an error.
    expect(catalog.byNode(NodeType.HomeKeep).isPlaceholder).toBe(true);
  });
});
